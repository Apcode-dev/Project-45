import { Types } from "mongoose";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { createAuditLog } from "../../middleware/audit.js";
import { syncInventoryAlerts } from "../alerts/alerts.controller.js";
import { executeInTransaction } from "../../utils/transaction.js";

export async function syncMedicineStockFromBatches(medicineId: string, session?: any): Promise<number> {
  const result = await BatchModel.aggregate([
    {
      $match: {
        medicineId: new Types.ObjectId(medicineId),
        status: { $nin: ["EXPIRED", "QUARANTINED"] },
        quantity: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: "$medicineId",
        totalStock: { $sum: "$quantity" },
      },
    },
  ]).session(session || null);

  const calculatedTotalStock = result.length > 0 ? Number(result[0].totalStock) || 0 : 0;

  await MedicineModel.findByIdAndUpdate(
    medicineId,
    { totalStock: calculatedTotalStock },
    { session: session || null }
  );

  return calculatedTotalStock;
}

export interface StockAdjustmentPayload {
  medicineId: string;
  batchId: string;
  type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "DAMAGE" | "RETURN";
  quantity: number; // Positive number representing quantity to change
  reason: string;
  notes?: string;
}

export class InventoryService {
  async listTransactions(options: {
    medicineId?: string;
    batchId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, options.limit || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (options.medicineId) filter.medicineId = options.medicineId;
    if (options.batchId) filter.batchId = options.batchId;
    if (options.type) filter.type = options.type;

    const total = await InventoryTransactionModel.countDocuments(filter);

    const transactions = await InventoryTransactionModel.find(filter)
      .populate("medicineId", "name genericName strength unit")
      .populate("batchId", "batchNumber expiryDate status")
      .populate("userId", "name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adjustStock(payload: StockAdjustmentPayload, userId?: string, ipAddress?: string) {
    const { medicineId, batchId, type, quantity, reason, notes } = payload;

    if (!medicineId || !batchId || !type || !quantity || quantity <= 0) {
      throw new Error("Medicine, Batch, Adjustment Type, and valid Quantity (>0) are required.");
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error("A clear audit reason (minimum 3 characters) is mandatory for any stock adjustment.");
    }

    return await executeInTransaction(async (session) => {
      const batch = await BatchModel.findById(batchId).session(session || null);
      if (!batch) throw new Error("Target batch not found.");

      if (batch.medicineId.toString() !== medicineId) {
        throw new Error("Batch does not belong to specified medicine.");
      }

      const beforeQty = batch.quantity;
      let delta = 0;

      if (type === "ADJUSTMENT_IN" || type === "RETURN") {
        delta = Number(quantity);
      } else if (type === "ADJUSTMENT_OUT" || type === "DAMAGE") {
        delta = -Number(quantity);
        if (beforeQty + delta < 0) {
          throw new Error(`Insufficient batch stock. Current quantity is ${beforeQty}, cannot deduct ${quantity}.`);
        }
      }

      const afterQty = beforeQty + delta;
      batch.quantity = afterQty;
      if (afterQty === 0) {
        batch.status = "DEPLETED";
      } else if (afterQty > 0 && (batch.status === "DEPLETED" || !batch.status)) {
        batch.status = "ACTIVE";
      }
      await batch.save({ session });

      const txDocs = await InventoryTransactionModel.create(
        [
          {
            medicineId,
            batchId,
            type,
            quantityDelta: delta,
            beforeQuantity: beforeQty,
            afterQuantity: afterQty,
            reason: reason.trim(),
            notes: notes?.trim(),
            userId,
            ipAddress,
          },
        ],
        { session }
      );

      // Synchronize Medicine.totalStock from actual batches in same transaction
      await syncMedicineStockFromBatches(medicineId, session);

      const medicine = await MedicineModel.findById(medicineId).select("name").session(session || null);

      await createAuditLog("STOCK_ADJUSTMENT", "BATCH", {
        entityId: batch._id.toString(),
        userId,
        ipAddress,
        details: {
          medicineName: medicine?.name,
          batchNumber: batch.batchNumber,
          type,
          delta,
          beforeQty,
          afterQty,
          reason,
        },
      });

      // Automatically sync inventory alerts
      await syncInventoryAlerts().catch((err) => {
        console.error("[InventoryService] Alert sync error:", err);
      });

      return {
        success: true,
        message: `Stock adjusted successfully. Batch ${batch.batchNumber} updated from ${beforeQty} to ${afterQty}.`,
        transaction: txDocs[0],
        currentBatchStock: afterQty,
      };
    });
  }
}

export const inventoryService = new InventoryService();
