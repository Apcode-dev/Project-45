import { MedicineModel } from "../../database/models/Medicine.js";
import { MedicineCodeModel } from "../../database/models/MedicineCode.js";
import { BatchModel } from "../../database/models/Batch.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { createAuditLog } from "../../middleware/audit.js";

export interface QuickInwardPayload {
  medicineId: string;
  batchNumber: string;
  manufacturingDate: string | Date;
  expiryDate: string | Date;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  supplierId?: string;
}

export class ScannerService {
  async lookupCode(rawCode: string) {
    const code = rawCode.trim();
    if (!code) throw new Error("Scanned code cannot be empty");

    // 1. Search MedicineCodeModel
    const codeRecord = await MedicineCodeModel.findOne({ codeValue: code }).lean();

    let medicineId = codeRecord ? codeRecord.medicineId : null;

    // 2. Fallback: Check if the scanned string matches a batch number directly
    if (!medicineId) {
      const batchRecord = await BatchModel.findOne({ batchNumber: code }).lean();
      if (batchRecord) {
        medicineId = batchRecord.medicineId;
      }
    }

    // 3. Fallback: Check if medicine name or generic name matches exactly
    if (!medicineId) {
      const medMatch = await MedicineModel.findOne({
        $or: [{ name: new RegExp(`^${code}$`, "i") }, { genericName: new RegExp(`^${code}$`, "i") }],
      }).lean();
      if (medMatch) medicineId = medMatch._id;
    }

    if (!medicineId) {
      return {
        found: false,
        code,
        message: "Medicine not found in registry",
      };
    }

    // Fetch full medicine details
    const medicine = await MedicineModel.findById(medicineId)
      .populate("dosageFormId", "name shortName")
      .populate("categoryId", "name")
      .populate("therapeuticCategoryId", "name")
      .populate("manufacturerId", "name country")
      .lean();

    if (!medicine) {
      return { found: false, code, message: "Medicine profile inactive or deleted" };
    }

    const now = new Date();

    // Fetch all batches sorted by Expiry Date (FEFO priority)
    const batches = await BatchModel.find({ medicineId })
      .populate("supplierId", "name")
      .sort({ expiryDate: 1 })
      .lean();

    const activeBatches = batches.filter((b) => b.status === "ACTIVE" && new Date(b.expiryDate) > now);
    const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

    return {
      found: true,
      code,
      medicine: {
        ...medicine,
        totalStock,
        isLowStock: totalStock <= medicine.minStockLevel,
      },
      batches: batches.map((b) => ({
        ...b,
        isExpired: new Date(b.expiryDate) <= now,
        isExpiringSoon: new Date(b.expiryDate) > now && new Date(b.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      })),
    };
  }

  async quickInward(payload: QuickInwardPayload, userId?: string, ipAddress?: string) {
    const { medicineId, batchNumber, manufacturingDate, expiryDate, quantity, purchasePrice, mrp, supplierId } = payload;

    if (!medicineId || !batchNumber || !expiryDate || !quantity || quantity <= 0) {
      throw new Error("Medicine, Batch Number, Expiry Date, and valid Quantity (> 0) are required.");
    }

    const medicine = await MedicineModel.findById(medicineId);
    if (!medicine) throw new Error("Medicine not found");

    const expDate = new Date(expiryDate);
    const mfgDate = manufacturingDate ? new Date(manufacturingDate) : new Date();
    const now = new Date();

    if (expDate <= now) {
      throw new Error("Cannot add stock with an already expired date!");
    }

    // Check if batch already exists for this medicine
    let batch = await BatchModel.findOne({ medicineId, batchNumber: batchNumber.trim() });
    let beforeBatchQty = 0;
    let afterBatchQty = 0;

    if (batch) {
      beforeBatchQty = batch.quantity;
      batch.quantity += Number(quantity);
      batch.purchasePrice = Number(purchasePrice) || batch.purchasePrice;
      batch.mrp = Number(mrp) || batch.mrp;
      if (supplierId) batch.supplierId = supplierId as any;
      batch.status = "ACTIVE";
      await batch.save();
      afterBatchQty = batch.quantity;
    } else {
      batch = await BatchModel.create({
        medicineId,
        batchNumber: batchNumber.trim(),
        manufacturingDate: mfgDate,
        expiryDate: expDate,
        quantity: Number(quantity),
        initialQuantity: Number(quantity),
        purchasePrice: Number(purchasePrice) || 0,
        mrp: Number(mrp) || 0,
        supplierId: supplierId || null,
        status: "ACTIVE",
      });
      beforeBatchQty = 0;
      afterBatchQty = Number(quantity);
    }

    // Log Inventory Transaction
    await InventoryTransactionModel.create({
      medicineId,
      batchId: batch._id,
      type: "PURCHASE",
      quantityDelta: Number(quantity),
      beforeQuantity: beforeBatchQty,
      afterQuantity: afterBatchQty,
      reason: `Quick Inward Scan for Batch ${batch.batchNumber}`,
      userId: userId || null,
      ipAddress,
    });

    // Audit Log
    await createAuditLog("QUICK_INWARD_SCAN", "BATCH", {
      entityId: batch._id.toString(),
      userId,
      ipAddress,
      details: {
        medicineName: medicine.name,
        batchNumber: batch.batchNumber,
        addedQty: quantity,
        newBatchStock: afterBatchQty,
      },
    });

    return {
      success: true,
      message: `Successfully added ${quantity} units to Batch ${batch.batchNumber}`,
      batch,
      totalMedicineStock: afterBatchQty,
    };
  }
}

export const scannerService = new ScannerService();
