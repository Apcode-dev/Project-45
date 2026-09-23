import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { SaleModel, ISaleItem } from "../../database/models/Sale.js";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { syncInventoryAlerts } from "../alerts/alerts.controller.js";

export const getAllSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, status, paymentMethod, startDate, endDate, page = "1", limit = "20" } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { invoiceNumber: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { customerPhone: { $regex: q, $options: "i" } },
        { prescriptionNumber: { $regex: q, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      SaleModel.find(filter)
        .populate("items.medicineId", "name genericName unit")
        .populate("items.batchId", "batchNumber expiryDate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SaleModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getSaleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sale = await SaleModel.findById(req.params.id)
      .populate("items.medicineId")
      .populate("items.batchId");

    if (!sale) {
      res.status(404).json({ success: false, message: "Sale transaction not found" });
      return;
    }

    res.status(200).json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const createSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      customerName,
      customerPhone,
      doctorName,
      prescriptionNumber,
      paymentMethod = "CASH",
      discount = 0,
      tax = 0,
      items,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Cart cannot be empty. At least one item is required." });
      return;
    }

    const today = new Date();
    const processedItems: ISaleItem[] = [];
    let calculatedSubtotal = 0;

    // Check prescription requirement
    for (const it of items) {
      const med = await MedicineModel.findById(it.medicineId);
      if (!med) {
        res.status(404).json({ success: false, message: `Medicine not found for ID ${it.medicineId}` });
        return;
      }

      if (med.prescriptionRequired && !prescriptionNumber && !doctorName) {
        res.status(400).json({
          success: false,
          message: `Medicine '${med.name}' is Schedule H/X Rx and requires Doctor Name & Prescription Number.`,
        });
        return;
      }
    }

    // Process each item with FEFO allocation
    for (const it of items) {
      const reqQty = Number(it.quantity);
      if (reqQty <= 0) {
        res.status(400).json({ success: false, message: "Item quantity must be greater than 0" });
        return;
      }

      let batch: any = null;

      if (it.batchId) {
        batch = await BatchModel.findById(it.batchId);
        if (!batch) {
          res.status(404).json({ success: false, message: `Selected batch not found` });
          return;
        }

        // Hard-lock check: expired or quarantined batch
        if (new Date(batch.expiryDate) <= today) {
          batch.status = "EXPIRED";
          await batch.save();
          res.status(400).json({
            success: false,
            message: `CRITICAL FEFO SAFETY LOCK: Batch ${batch.batchNumber} has EXPIRED (${new Date(
              batch.expiryDate
            ).toLocaleDateString()}). Dispensing blocked!`,
          });
          return;
        }

        if (batch.status !== "ACTIVE") {
          res.status(400).json({
            success: false,
            message: `Batch ${batch.batchNumber} is not active (Status: ${batch.status})`,
          });
          return;
        }

        if (batch.quantity < reqQty) {
          res.status(400).json({
            success: false,
            message: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${reqQty}`,
          });
          return;
        }
      } else {
        // AUTO FEFO ENGINE: Find earliest expiring active batch
        const eligibleBatches = await BatchModel.find({
          medicineId: it.medicineId,
          status: "ACTIVE",
          quantity: { $gte: reqQty },
          expiryDate: { $gt: today },
        }).sort({ expiryDate: 1 });

        if (eligibleBatches.length === 0) {
          res.status(400).json({
            success: false,
            message: `No unexpired batch with sufficient stock (${reqQty} units) available for dispensing.`,
          });
          return;
        }

        batch = eligibleBatches[0];
      }

      const unitPrice = Number(it.unitPrice || batch.mrp || 10);
      const rowTotal = Number((unitPrice * reqQty).toFixed(2));
      calculatedSubtotal += rowTotal;

      processedItems.push({
        medicineId: new Types.ObjectId(it.medicineId),
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: reqQty,
        unitPrice,
        total: rowTotal,
      });

      // Deduct from batch
      batch.quantity -= reqQty;
      if (batch.quantity === 0) {
        batch.status = "DEPLETED";
      }
      await batch.save();

      // Deduct from Medicine totalStock
      const med = await MedicineModel.findById(it.medicineId);
      if (med) {
        const beforeStock = Number(med.totalStock) || 0;
        med.totalStock = Math.max(0, beforeStock - reqQty);
        await med.save();

        // Log immutable inventory transaction
        await InventoryTransactionModel.create({
          medicineId: it.medicineId,
          batchId: batch._id,
          type: "SALE",
          quantityDelta: -reqQty,
          beforeQuantity: beforeStock,
          afterQuantity: med.totalStock,
          reason: `Sale Dispensed to ${customerName || "Walk-in Customer"}`,
          userId: (req as any).user?._id,
          notes: `Batch ${batch.batchNumber}, Unit Price ₹${unitPrice}`,
        });
      }
    }

    const discountAmount = Number(discount) || 0;
    const taxAmount = Number(tax) || 0;
    const grandTotal = Math.max(0, Number((calculatedSubtotal + taxAmount - discountAmount).toFixed(2)));

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newSale = await SaleModel.create({
      invoiceNumber,
      customerName: customerName ? String(customerName).trim() : "Walk-in Customer",
      customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
      doctorName: doctorName ? String(doctorName).trim() : undefined,
      prescriptionNumber: prescriptionNumber ? String(prescriptionNumber).trim() : undefined,
      items: processedItems,
      totalAmount: calculatedSubtotal,
      discount: discountAmount,
      tax: taxAmount,
      grandTotal,
      paymentMethod,
      status: "COMPLETED",
      createdBy: (req as any).user?.name || "Pharmacist",
    });

    const populated = await SaleModel.findById(newSale._id)
      .populate("items.medicineId", "name genericName sku unit")
      .populate("items.batchId", "batchNumber expiryDate");

    // Automatically sync inventory alerts in real time
    await syncInventoryAlerts().catch(() => {});

    res.status(201).json({
      success: true,
      message: "Sale processed and stock dispensed successfully",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const returnSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, restock = true } = req.body;

    const sale = await SaleModel.findById(id);
    if (!sale) {
      res.status(404).json({ success: false, message: "Sale not found" });
      return;
    }

    if (sale.status === "REFUNDED") {
      res.status(400).json({ success: false, message: "This sale has already been refunded" });
      return;
    }

    // Process reversal for items
    for (const item of sale.items) {
      if (restock) {
        const batch = await BatchModel.findById(item.batchId);
        if (batch) {
          batch.quantity += item.quantity;
          if (batch.status === "DEPLETED") batch.status = "ACTIVE";
          await batch.save();
        }

        const med = await MedicineModel.findById(item.medicineId);
        if (med) {
          const beforeStock = Number(med.totalStock) || 0;
          med.totalStock = beforeStock + item.quantity;
          await med.save();

          await InventoryTransactionModel.create({
            medicineId: item.medicineId,
            batchId: item.batchId,
            type: "RETURN",
            quantityDelta: item.quantity,
            beforeQuantity: beforeStock,
            afterQuantity: med.totalStock,
            reason: `Sale Return [Invoice ${sale.invoiceNumber}]: ${reason || "Customer Return"}`,
            userId: (req as any).user?._id,
          });
        }
      } else {
        // If not restocked, mark as damaged
        await InventoryTransactionModel.create({
          medicineId: item.medicineId,
          batchId: item.batchId,
          type: "DAMAGE",
          quantityDelta: 0,
          beforeQuantity: 0,
          afterQuantity: 0,
          reason: `Returned Damaged [Invoice ${sale.invoiceNumber}]: ${reason || "Damaged/Spoiled"}`,
          userId: (req as any).user?._id,
        });
      }
    }

    sale.status = "REFUNDED";
    await sale.save();

    await syncInventoryAlerts().catch(() => {});

    res.status(200).json({
      success: true,
      message: `Sale ${sale.invoiceNumber} refunded and items ${restock ? "restocked into batch" : "discarded as damage"}.`,
      data: sale,
    });
  } catch (err) {
    next(err);
  }
};
