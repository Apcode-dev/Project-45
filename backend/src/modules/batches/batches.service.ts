import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { AlertModel } from "../../database/models/Alert.js";
import { createAuditLog } from "../../middleware/audit.js";
import { syncInventoryAlerts } from "../alerts/alerts.controller.js";

export interface BatchFilterOptions {
  medicineId?: string;
  status?: string;
  expiringDays?: number;
  search?: string;
  fefoSort?: boolean;
}

export class BatchesService {
  async getBatchById(id: string) {
    return BatchModel.findById(id).populate("medicineId").populate("supplierId");
  }

  async listBatches(options: BatchFilterOptions) {
    const filter: any = {};

    if (options.medicineId) filter.medicineId = options.medicineId;
    if (options.status) filter.status = options.status;

    if (options.expiringDays) {
      const now = new Date();
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + options.expiringDays);
      filter.expiryDate = { $gte: now, $lte: targetDate };
      filter.quantity = { $gt: 0 };
    }

    if (options.search) {
      const regex = new RegExp(options.search.trim(), "i");
      const matchedMeds = await MedicineModel.find({
        $or: [
          { name: regex },
          { genericName: regex },
          { brandName: regex },
          { initialCode: regex },
        ],
      }).select("_id").lean();
      const medIds = matchedMeds.map((m) => m._id);

      const searchOr: any[] = [
        { batchNumber: regex },
        { medicineId: { $in: medIds } },
      ];

      if (filter.medicineId) {
        const existingMedId = filter.medicineId;
        delete filter.medicineId;
        filter.$and = [
          { medicineId: existingMedId },
          { $or: searchOr }
        ];
      } else {
        filter.$or = searchOr;
      }
    }

    const sortOrder: any = options.fefoSort !== false ? { expiryDate: 1 } : { createdAt: -1 };

    const batches = await BatchModel.find(filter)
      .populate("medicineId", "name genericName strength unit minStockLevel")
      .populate("supplierId", "name contactPerson")
      .sort(sortOrder)
      .lean();

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    return batches.map((b) => {
      const exp = new Date(b.expiryDate);
      const isExpired = exp <= now;
      const isExpiring30 = !isExpired && exp <= thirtyDays;
      const isExpiring90 = !isExpired && !isExpiring30 && exp <= ninetyDays;

      return {
        ...b,
        isExpired,
        isExpiring30,
        isExpiring90,
        canDispense: b.status === "ACTIVE" && !isExpired && b.quantity > 0,
        shelfLifeStatus: isExpired
          ? "EXPIRED"
          : isExpiring30
          ? "CRITICAL_EXPIRY"
          : isExpiring90
          ? "EXPIRING_SOON"
          : "SAFE",
      };
    });
  }

  async createBatch(data: any, userId?: string) {
    if (!data.medicineId || !data.batchNumber || !data.expiryDate || data.quantity === undefined) {
      throw new Error("Medicine, Batch Number, Expiry Date, and Quantity are required.");
    }

    const expDate = new Date(data.expiryDate);
    const now = new Date();

    if (expDate <= now) {
      throw new Error("Cannot register batch with an expiry date in the past.");
    }

    const existing = await BatchModel.findOne({
      medicineId: data.medicineId,
      batchNumber: data.batchNumber.trim(),
    });

    if (existing) {
      throw new Error(`Batch "${data.batchNumber}" already exists for this medicine.`);
    }

    const batch = await BatchModel.create({
      medicineId: data.medicineId,
      batchNumber: data.batchNumber.trim(),
      manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : new Date(),
      expiryDate: expDate,
      quantity: Number(data.quantity) || 0,
      initialQuantity: Number(data.quantity) || 0,
      purchasePrice: Number(data.purchasePrice) || 0,
      mrp: Number(data.mrp) || 0,
      supplierId: data.supplierId || null,
      status: "ACTIVE",
    });

    // Log Inventory Transaction
    if (Number(data.quantity) > 0) {
      await InventoryTransactionModel.create({
        medicineId: data.medicineId,
        batchId: batch._id,
        type: "PURCHASE",
        quantityDelta: Number(data.quantity),
        beforeQuantity: 0,
        afterQuantity: Number(data.quantity),
        reason: `Initial Stock Entry for Batch ${batch.batchNumber}`,
        userId,
      });
    }

    await createAuditLog("CREATE_BATCH", "BATCH", {
      entityId: batch._id.toString(),
      userId,
      details: { batchNumber: batch.batchNumber, quantity: batch.quantity, expiryDate: batch.expiryDate },
    });

    // Automatically sync and clear any OUT OF STOCK or LOW STOCK alerts
    await syncInventoryAlerts().catch(() => {});

    return batch;
  }

  async setBatchStatus(id: string, status: "ACTIVE" | "EXPIRED" | "QUARANTINED" | "RECALLED", reason?: string, userId?: string) {
    const batch = await BatchModel.findById(id).populate("medicineId", "name");
    if (!batch) throw new Error("Batch not found");

    const oldStatus = batch.status;
    batch.status = status;
    await batch.save();

    await createAuditLog("BATCH_STATUS_CHANGE", "BATCH", {
      entityId: batch._id.toString(),
      userId,
      details: { from: oldStatus, to: status, reason },
    });

    // Create system alert if quarantined or recalled
    if (status === "QUARANTINED" || status === "RECALLED") {
      await AlertModel.create({
        type: "RECALL",
        title: `Batch ${batch.batchNumber} ${status}`,
        message: `${(batch.medicineId as any)?.name || "Medicine"} Batch ${batch.batchNumber} has been marked as ${status}. Reason: ${reason || "Quality inspection"}`,
        severity: "CRITICAL",
        medicineId: (batch.medicineId as any)?._id || batch.medicineId,
        batchId: batch._id,
      });
    }

    await syncInventoryAlerts().catch(() => {});

    return batch;
  }

  async lockExpiredBatches() {
    const now = new Date();
    const expiredBatches = await BatchModel.find({
      status: "ACTIVE",
      expiryDate: { $lte: now },
    }).populate("medicineId", "name");

    let lockedCount = 0;
    for (const batch of expiredBatches) {
      batch.status = "EXPIRED";
      await batch.save();
      lockedCount++;

      // Create Expiry Alert
      await AlertModel.create({
        type: "EXPIRED",
        title: `Batch Expired: ${batch.batchNumber}`,
        message: `${(batch.medicineId as any)?.name} Batch ${batch.batchNumber} expired on ${new Date(batch.expiryDate).toLocaleDateString()}. Stock locked from dispensing.`,
        severity: "CRITICAL",
        medicineId: (batch.medicineId as any)?._id || batch.medicineId,
        batchId: batch._id,
      });
    }

    return { lockedCount, message: `Locked ${lockedCount} expired batches.` };
  }
}

export const batchesService = new BatchesService();
