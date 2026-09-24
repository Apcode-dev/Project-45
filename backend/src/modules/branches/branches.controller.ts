import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { BranchModel } from "../../database/models/Branch.js";
import { StockTransferModel, ITransferItem } from "../../database/models/StockTransfer.js";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";

import { executeInTransaction } from "../../utils/transaction.js";
import { syncMedicineStockFromBatches } from "../inventory/inventory.service.js";

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

    const transferNumber = `TRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const populated = await executeInTransaction(async (session) => {
      const formattedItems: ITransferItem[] = [];

      // Verify and deduct stock atomically from source batches (Point 14 & 15)
      for (const it of items) {
        const batch = await BatchModel.findById(it.batchId).session(session || null);
        if (!batch) {
          throw new Error(`Batch not found for item ${it.batchId}`);
        }

        const q = Number(it.quantity);
        if (q <= 0) {
          throw new Error(`Invalid transfer quantity for batch ${batch.batchNumber}`);
        }

        // ATOMIC CONDITIONAL STOCK DEDUCTION
        const updatedBatch = await BatchModel.findOneAndUpdate(
          {
            _id: batch._id,
            status: "ACTIVE",
            quantity: { $gte: q },
          },
          {
            $inc: { quantity: -q },
          },
          { session: session || null, new: true }
        );

        if (!updatedBatch) {
          throw new Error(`Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${q}`);
        }

        if (updatedBatch.quantity === 0) {
          updatedBatch.status = "DEPLETED";
          await updatedBatch.save({ session });
        }

        formattedItems.push({
          medicineId: updatedBatch.medicineId,
          batchId: updatedBatch._id,
          batchNumber: updatedBatch.batchNumber,
          expiryDate: updatedBatch.expiryDate,
          quantity: q,
        });

        // Synchronize source Medicine.totalStock in same transaction (Point 16)
        const newTotalStock = await syncMedicineStockFromBatches(updatedBatch.medicineId.toString(), session);

        await InventoryTransactionModel.create(
          [
            {
              medicineId: updatedBatch.medicineId,
              batchId: updatedBatch._id,
              type: "TRANSFER",
              quantityDelta: -q,
              beforeQuantity: newTotalStock + q,
              afterQuantity: newTotalStock,
              reason: `Stock Transfer Out to branch ${toBranchId}`,
              userId: (req as any).user?._id,
            },
          ],
          { session }
        );
      }

      const [transfer] = await StockTransferModel.create(
        [
          {
            transferNumber,
            fromBranchId: new Types.ObjectId(fromBranchId),
            toBranchId: new Types.ObjectId(toBranchId),
            items: formattedItems,
            status: "DISPATCHED",
            notes: notes?.trim(),
            dispatchedBy: (req as any).user?._id,
            dispatchedAt: new Date(),
          },
        ],
        { session }
      );

      return await StockTransferModel.findById(transfer._id)
        .populate("fromBranchId", "name code")
        .populate("toBranchId", "name code")
        .populate("items.medicineId", "name genericName unit")
        .session(session || null);
    });

    res.status(201).json({
      success: true,
      message: `Transfer ${transferNumber} dispatched successfully. Stock in transit.`,
      data: populated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Stock transfer failed" });
  }
};

export const receiveTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const populated = await executeInTransaction(async (session) => {
      const transfer = await StockTransferModel.findById(id).session(session || null);

      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "DISPATCHED") {
        throw new Error(`Cannot receive transfer with status: ${transfer.status}`);
      }

      // Process receiving items into destination inventory inside session
      for (const it of transfer.items) {
        let batch = await BatchModel.findOne(
          {
            medicineId: it.medicineId,
            batchNumber: it.batchNumber,
          },
          null,
          { session }
        );

        if (batch) {
          batch.quantity += it.quantity;
          if (batch.status === "DEPLETED") batch.status = "ACTIVE";
          await batch.save({ session });
        } else {
          const [newBatch] = await BatchModel.create(
            [
              {
                medicineId: it.medicineId,
                batchNumber: it.batchNumber,
                expiryDate: it.expiryDate,
                quantity: it.quantity,
                initialQuantity: it.quantity,
                status: "ACTIVE",
              },
            ],
            { session }
          );
          batch = newBatch;
        }

        const newTotalStock = await syncMedicineStockFromBatches(it.medicineId.toString(), session);

        await InventoryTransactionModel.create(
          [
            {
              medicineId: it.medicineId,
              batchId: batch._id,
              type: "TRANSFER",
              quantityDelta: it.quantity,
              beforeQuantity: newTotalStock - it.quantity,
              afterQuantity: newTotalStock,
              reason: `Stock Transfer Inward from branch ${transfer.fromBranchId}`,
              userId: (req as any).user?._id,
            },
          ],
          { session }
        );
      }

      transfer.status = "RECEIVED";
      transfer.receivedAt = new Date();
      transfer.receivedBy = (req as any).user?._id;
      await transfer.save({ session });

      return await StockTransferModel.findById(transfer._id)
        .populate("fromBranchId", "name code")
        .populate("toBranchId", "name code")
        .populate("items.medicineId", "name genericName unit")
        .session(session || null);
    });

    res.status(200).json({
      success: true,
      message: `Transfer ${populated.transferNumber} received and credited into inventory`,
      data: populated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Failed to receive stock transfer" });
  }
};
