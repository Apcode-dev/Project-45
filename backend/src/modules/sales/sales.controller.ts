import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { SaleModel, ISaleItem } from "../../database/models/Sale.js";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { SettingModel } from "../../database/models/Setting.js";
import { syncInventoryAlerts } from "../alerts/alerts.controller.js";
import { executeInTransaction } from "../../utils/transaction.js";
import { syncMedicineStockFromBatches } from "../inventory/inventory.service.js";
import { generateNextSequenceNumber } from "../../utils/counter.js";

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

    const populated = await executeInTransaction(async (session) => {
      // 1. Check prescription requirement for Rx medicines
      for (const it of items) {
        const med = await MedicineModel.findById(it.medicineId).session(session || null);
        if (!med) {
          throw new Error(`Medicine not found for ID ${it.medicineId}`);
        }

        if (med.prescriptionRequired && !prescriptionNumber && !doctorName) {
          throw new Error(`Medicine '${med.name}' is Schedule H/X Rx and requires Doctor Name & Prescription Number.`);
        }
      }

      const processedItems: ISaleItem[] = [];
      let calculatedSubtotal = 0;

      // Fetch system settings for FEFO & Hard Expiry Lock (Items 29 & 30)
      const sysSettings = await SettingModel.findOne().session(session || null);
      const isFefoEnabled = sysSettings ? sysSettings.FEFO : true;
      const isHardExpiryLock = sysSettings ? sysSettings.hardExpiryLock : true;

      // 2. Process each item with Atomic Concurrent Stock Deduction (Point 13 & 14)
      for (const it of items) {
        const reqQty = Number(it.quantity);
        if (reqQty <= 0) {
          throw new Error("Item quantity must be greater than 0");
        }

        let targetBatch: any = null;

        if (it.batchId) {
          targetBatch = await BatchModel.findById(it.batchId).session(session || null);
          if (!targetBatch) {
            throw new Error(`Selected batch not found`);
          }

          if (new Date(targetBatch.expiryDate) <= today) {
            targetBatch.status = "EXPIRED";
            await targetBatch.save({ session });
            if (isHardExpiryLock) {
              throw new Error(`HARD EXPIRY LOCK: Batch ${targetBatch.batchNumber} has EXPIRED. Dispensing blocked at backend level!`);
            }
          }

          if (targetBatch.status !== "ACTIVE") {
            throw new Error(`Batch ${targetBatch.batchNumber} is not active (Status: ${targetBatch.status})`);
          }

          if (targetBatch.quantity < reqQty) {
            throw new Error(`Insufficient stock in batch ${targetBatch.batchNumber}. Available: ${targetBatch.quantity}, Requested: ${reqQty}`);
          }
        } else {
          // FEFO vs Standard Stock Selection (Item 29)
          const sortCondition: any = isFefoEnabled ? { expiryDate: 1 } : { createdAt: 1 };
          const eligibleBatches = await BatchModel.find({
            medicineId: it.medicineId,
            status: "ACTIVE",
            quantity: { $gte: reqQty },
            expiryDate: { $gt: today },
          })
            .sort(sortCondition)
            .session(session || null);

          if (eligibleBatches.length === 0) {
            throw new Error(`No unexpired batch with sufficient stock (${reqQty} units) available for dispensing.`);
          }

          targetBatch = eligibleBatches[0];
        }

        // ATOMIC CONCURRENT STOCK DEDUCTION (Point 14)
        const updatedBatch = await BatchModel.findOneAndUpdate(
          {
            _id: targetBatch._id,
            status: "ACTIVE",
            quantity: { $gte: reqQty }, // Atomic stock check condition
          },
          {
            $inc: { quantity: -reqQty },
          },
          { session: session || null, new: true }
        );

        if (!updatedBatch) {
          throw new Error(`CRITICAL CONCURRENT STOCK LOCK: Insufficient stock in batch ${targetBatch.batchNumber}. Stock was claimed by a concurrent sale.`);
        }

        if (updatedBatch.quantity === 0) {
          updatedBatch.status = "DEPLETED";
          await updatedBatch.save({ session });
        }

        const unitPrice = Number(it.unitPrice || updatedBatch.mrp || 10);
        const rowTotal = Number((unitPrice * reqQty).toFixed(2));
        calculatedSubtotal += rowTotal;

        processedItems.push({
          medicineId: new Types.ObjectId(it.medicineId),
          batchId: updatedBatch._id,
          batchNumber: updatedBatch.batchNumber,
          expiryDate: updatedBatch.expiryDate,
          quantity: reqQty,
          unitPrice,
          total: rowTotal,
        });

        // Synchronize Medicine.totalStock from actual batch aggregation in same transaction (Point 16)
        const newTotalStock = await syncMedicineStockFromBatches(it.medicineId, session);

        // Log immutable inventory transaction inside session
        await InventoryTransactionModel.create(
          [
            {
              medicineId: it.medicineId,
              batchId: updatedBatch._id,
              type: "SALE",
              quantityDelta: -reqQty,
              beforeQuantity: newTotalStock + reqQty,
              afterQuantity: newTotalStock,
              reason: `Sale Dispensed to ${customerName || "Walk-in Customer"}`,
              userId: (req as any).user?._id,
              notes: `Batch ${updatedBatch.batchNumber}, Unit Price ₹${unitPrice}`,
            },
          ],
          { session }
        );
      }

      const discountAmount = Number(discount) || 0;
      const taxAmount = Number(tax) || 0;
      const grandTotal = Math.max(0, Number((calculatedSubtotal + taxAmount - discountAmount).toFixed(2)));
      const invoiceNumber = await generateNextSequenceNumber("INV", session);

      const [newSale] = await SaleModel.create(
        [
          {
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
          },
        ],
        { session }
      );

      return await SaleModel.findById(newSale._id)
        .populate("items.medicineId", "name genericName sku unit")
        .populate("items.batchId", "batchNumber expiryDate")
        .session(session || null);
    });

    // Automatically sync inventory alerts in real time
    await syncInventoryAlerts().catch(() => {});

    res.status(201).json({
      success: true,
      message: "Sale processed and stock dispensed successfully",
      data: populated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Sale transaction failed" });
  }
};

export const returnSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, restock = true } = req.body;

    const updatedSale = await executeInTransaction(async (session) => {
      const sale = await SaleModel.findById(id).session(session || null);
      if (!sale) {
        throw new Error("Sale transaction not found");
      }

      if (sale.status === "REFUNDED") {
        throw new Error("This sale has already been refunded");
      }

      // Process reversal for items within transaction
      for (const item of sale.items) {
        if (restock) {
          const batch = await BatchModel.findById(item.batchId).session(session || null);
          if (batch) {
            batch.quantity += item.quantity;
            if (batch.status === "DEPLETED") batch.status = "ACTIVE";
            await batch.save({ session });
          }

          const newTotalStock = await syncMedicineStockFromBatches(item.medicineId.toString(), session);

          await InventoryTransactionModel.create(
            [
              {
                medicineId: item.medicineId,
                batchId: item.batchId,
                type: "RETURN",
                quantityDelta: item.quantity,
                beforeQuantity: newTotalStock - item.quantity,
                afterQuantity: newTotalStock,
                reason: `Sale Return [Invoice ${sale.invoiceNumber}]: ${reason || "Customer Return"}`,
                userId: (req as any).user?._id,
              },
            ],
            { session }
          );
        } else {
          // If not restocked, mark as damaged log
          await InventoryTransactionModel.create(
            [
              {
                medicineId: item.medicineId,
                batchId: item.batchId,
                type: "DAMAGE",
                quantityDelta: 0,
                beforeQuantity: 0,
                afterQuantity: 0,
                reason: `Returned Damaged [Invoice ${sale.invoiceNumber}]: ${reason || "Damaged/Spoiled"}`,
                userId: (req as any).user?._id,
              },
            ],
            { session }
          );
        }
      }

      sale.status = "REFUNDED";
      await sale.save({ session });
      return sale;
    });

    await syncInventoryAlerts().catch(() => {});

    res.status(200).json({
      success: true,
      message: `Sale ${updatedSale.invoiceNumber} refunded and items ${restock ? "restocked into batch" : "discarded as damage"}.`,
      data: updatedSale,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Refund transaction failed" });
  }
};
