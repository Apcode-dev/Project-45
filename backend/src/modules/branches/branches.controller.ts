import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { BranchModel } from "../../database/models/Branch.js";
import { StockTransferModel, ITransferItem } from "../../database/models/StockTransfer.js";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";

// --- Branch Management ---
export const getAllBranches = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let branches = await BranchModel.find().sort({ isMain: -1, name: 1 });

    // Ensure default main branch exists if collection is empty
    if (branches.length === 0) {
      const defaultMain = await BranchModel.create({
        name: "Central Pharmacy (Main Hospital)",
        code: "MAIN-01",
        address: "Ground Floor, Central Block, Apex Medical Center",
        phone: "+91 11 2345 6789",
        isMain: true,
      });
      branches = [defaultMain];
    }

    res.status(200).json({ success: true, count: branches.length, data: branches });
  } catch (err) {
    next(err);
  }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, code, address, phone, isMain = false } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, message: "Branch name and unique code are required" });
      return;
    }

    const existing = await BranchModel.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      res.status(409).json({ success: false, message: "Branch code already exists" });
      return;
    }

    const branch = await BranchModel.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address?.trim(),
      phone: phone?.trim(),
      isMain,
    });

    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;

    const branch = await BranchModel.findById(id);
    if (!branch) {
      res.status(404).json({ success: false, message: "Branch not found" });
      return;
    }

    if (name) branch.name = name.trim();
    if (address !== undefined) branch.address = address.trim();
    if (phone !== undefined) branch.phone = phone.trim();

    await branch.save();
    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

// --- Stock Transfers ---
export const getAllTransfers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const transfers = await StockTransferModel.find(filter)
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .populate("items.medicineId", "name genericName unit")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: transfers.length, data: transfers });
  } catch (err) {
    next(err);
  }
};

export const createTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;

    if (!fromBranchId || !toBranchId) {
      res.status(400).json({ success: false, message: "Source and destination branches are required" });
      return;
    }

    if (fromBranchId === toBranchId) {
      res.status(400).json({ success: false, message: "Source and destination branch cannot be identical" });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "At least one item required for transfer" });
      return;
    }

    const formattedItems: ITransferItem[] = [];

    // Verify stock availability in source batches
    for (const it of items) {
      const batch = await BatchModel.findById(it.batchId);
      if (!batch) {
        res.status(404).json({ success: false, message: `Batch not found for item ${it.batchId}` });
        return;
      }

      const q = Number(it.quantity);
      if (q <= 0 || batch.quantity < q) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${q}`,
        });
        return;
      }

      formattedItems.push({
        medicineId: batch.medicineId,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: q,
      });

      // Deduct from source batch immediately (put in transit)
      batch.quantity -= q;
      if (batch.quantity === 0) batch.status = "DEPLETED";
      await batch.save();

      // Deduct from medicine stock
      const med = await MedicineModel.findById(batch.medicineId);
      if (med) {
        const beforeStock = Number(med.totalStock) || 0;
        med.totalStock = Math.max(0, beforeStock - q);
        await med.save();

        await InventoryTransactionModel.create({
          medicineId: batch.medicineId,
          batchId: batch._id,
          type: "TRANSFER",
          quantityDelta: -q,
          beforeQuantity: beforeStock,
          afterQuantity: med.totalStock,
          reason: `Stock Transfer Out to branch ${toBranchId}`,
          userId: (req as any).user?._id,
        });
      }
    }

    const transferNumber = `TRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const transfer = await StockTransferModel.create({
      transferNumber,
      fromBranchId: new Types.ObjectId(fromBranchId),
      toBranchId: new Types.ObjectId(toBranchId),
      items: formattedItems,
      status: "DISPATCHED",
      notes: notes?.trim(),
      dispatchedBy: (req as any).user?._id,
      dispatchedAt: new Date(),
    });

    const populated = await StockTransferModel.findById(transfer._id)
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .populate("items.medicineId", "name genericName unit");

    res.status(201).json({
      success: true,
      message: `Transfer ${transferNumber} dispatched successfully. Stock in transit.`,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const receiveTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const transfer = await StockTransferModel.findById(id);

    if (!transfer) {
      res.status(404).json({ success: false, message: "Transfer not found" });
      return;
    }

    if (transfer.status !== "DISPATCHED") {
      res.status(400).json({
        success: false,
        message: `Cannot receive transfer with status: ${transfer.status}`,
      });
      return;
    }

    // Process receiving items into destination inventory
    for (const it of transfer.items) {
      let batch = await BatchModel.findOne({
        medicineId: it.medicineId,
        batchNumber: it.batchNumber,
      });

      if (batch) {
        batch.quantity += it.quantity;
        if (batch.status === "DEPLETED") batch.status = "ACTIVE";
        await batch.save();
      } else {
        batch = await BatchModel.create({
          medicineId: it.medicineId,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          quantity: it.quantity,
          initialQuantity: it.quantity,
          status: "ACTIVE",
        });
      }

      const med = await MedicineModel.findById(it.medicineId);
      if (med) {
        const beforeStock = Number(med.totalStock) || 0;
        med.totalStock = beforeStock + it.quantity;
        await med.save();

        await InventoryTransactionModel.create({
          medicineId: it.medicineId,
          batchId: batch._id,
          type: "TRANSFER",
          quantityDelta: it.quantity,
          beforeQuantity: beforeStock,
          afterQuantity: med.totalStock,
          reason: `Stock Transfer Inward from branch ${transfer.fromBranchId}`,
          userId: (req as any).user?._id,
        });
      }
    }

    transfer.status = "RECEIVED";
    transfer.receivedAt = new Date();
    transfer.receivedBy = (req as any).user?._id;
    await transfer.save();

    const populated = await StockTransferModel.findById(transfer._id)
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .populate("items.medicineId", "name genericName unit");

    res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transferNumber} received and credited into inventory`,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};
