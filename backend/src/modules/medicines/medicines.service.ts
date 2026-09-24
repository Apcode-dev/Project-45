import { MedicineModel } from "../../database/models/Medicine.js";
import { MedicineCodeModel } from "../../database/models/MedicineCode.js";
import { BatchModel } from "../../database/models/Batch.js";
import { SaleModel } from "../../database/models/Sale.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { AlertModel } from "../../database/models/Alert.js";
import { createAuditLog } from "../../middleware/audit.js";
import { syncInventoryAlerts } from "../alerts/alerts.controller.js";
import { sanitizeSearchQuery } from "../../utils/sanitize.js";

export interface MedicineFilterOptions {
  search?: string;
  dosageFormId?: string;
  categoryId?: string;
  therapeuticCategoryId?: string;
  manufacturerId?: string;
  prescriptionRequired?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export class MedicinesService {
  async listMedicines(options: MedicineFilterOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, options.limit || 20);
    const skip = (page - 1) * limit;

    const filter: any = { isActive: true };

    if (options.search) {
      const cleanSearch = sanitizeSearchQuery(options.search);
      if (cleanSearch) {
        const regex = new RegExp(cleanSearch, "i");
        filter.$or = [
          { name: regex },
          { genericName: regex },
          { brandName: regex },
          { composition: regex },
        ];
      }
    }

    if (options.dosageFormId) filter.dosageFormId = options.dosageFormId;
    if (options.categoryId) filter.categoryId = options.categoryId;
    if (options.therapeuticCategoryId) filter.therapeuticCategoryId = options.therapeuticCategoryId;
    if (options.manufacturerId) filter.manufacturerId = options.manufacturerId;
    if (options.prescriptionRequired !== undefined) filter.prescriptionRequired = options.prescriptionRequired;

    // Total count for pagination
    const totalCount = await MedicineModel.countDocuments(filter);

    const medicines = await MedicineModel.find(filter)
      .populate("dosageFormId", "name shortName")
      .populate("categoryId", "name")
      .populate("therapeuticCategoryId", "name")
      .populate("manufacturerId", "name country")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const now = new Date();

    // Rollup batches and codes for each medicine
    const medicineIds = medicines.map((m) => m._id);
    const [allBatches, allCodes] = await Promise.all([
      BatchModel.find({ medicineId: { $in: medicineIds } }).lean(),
      MedicineCodeModel.find({ medicineId: { $in: medicineIds } }).lean(),
    ]);

    const batchMap: Record<string, any[]> = {};
    allBatches.forEach((b) => {
      const id = b.medicineId.toString();
      if (!batchMap[id]) batchMap[id] = [];
      batchMap[id].push(b);
    });

    const codeMap: Record<string, any[]> = {};
    allCodes.forEach((c) => {
      const id = c.medicineId.toString();
      if (!codeMap[id]) codeMap[id] = [];
      codeMap[id].push(c);
    });

    let enriched = medicines.map((med) => {
      const medBatches = batchMap[med._id.toString()] || [];
      const medCodes = codeMap[med._id.toString()] || [];

      // FEFO Active Stock (Valid, non-expired batches)
      const validBatches = medBatches.filter(
        (b) => b.status === "ACTIVE" && new Date(b.expiryDate) > now
      );

      const totalStock = validBatches.reduce((sum, b) => sum + b.quantity, 0);

      // Earliest valid expiry date for FEFO indication
      validBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      const nextExpiryDate = validBatches[0]?.expiryDate || null;

      const isLowStock = totalStock <= med.minStockLevel;
      const isOutOfStock = totalStock === 0;

      // Primary code
      const primaryCode = medCodes.find((c) => c.isPrimary)?.codeValue || medCodes[0]?.codeValue || null;

      return {
        ...med,
        totalStock,
        batchCount: medBatches.length,
        nextExpiryDate,
        isLowStock,
        isOutOfStock,
        primaryCode,
        codes: medCodes,
      };
    });

    // If lowStock filter requested
    if (options.lowStock) {
      enriched = enriched.filter((m) => m.isLowStock);
    }

    return {
      data: enriched,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getMedicineById(id: string) {
    const medicine = await MedicineModel.findById(id)
      .populate("dosageFormId")
      .populate("categoryId")
      .populate("therapeuticCategoryId")
      .populate("manufacturerId")
      .lean();

    if (!medicine) throw new Error("Medicine not found");

    const now = new Date();

    const [codes, batches] = await Promise.all([
      MedicineCodeModel.find({ medicineId: id }).lean(),
      BatchModel.find({ medicineId: id }).populate("supplierId", "name").sort({ expiryDate: 1 }).lean(),
    ]);

    const activeBatches = batches.filter((b) => b.status === "ACTIVE" && new Date(b.expiryDate) > now);
    const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

    return {
      ...medicine,
      codes,
      batches,
      totalStock,
      isLowStock: totalStock <= medicine.minStockLevel,
    };
  }

  async createMedicine(data: any, userId?: string) {
    if (!data.name || !data.genericName || !data.strength) {
      throw new Error("Medicine Name, Generic Name, and Strength are required.");
    }

    const medicine = await MedicineModel.create({
      name: data.name.trim(),
      brandName: data.brandName?.trim(),
      genericName: data.genericName.trim(),
      strength: data.strength.trim(),
      dosageFormId: data.dosageFormId || null,
      categoryId: data.categoryId || null,
      therapeuticCategoryId: data.therapeuticCategoryId || null,
      manufacturerId: data.manufacturerId || null,
      composition: data.composition?.trim(),
      prescriptionRequired: Boolean(data.prescriptionRequired),
      minStockLevel: Number(data.minStockLevel) || 20,
      maxStockLevel: Number(data.maxStockLevel) || 500,
      unit: data.unit?.trim() || "Strip",
      isActive: true,
    });

    // If barcode / QR is supplied at registration, register it
    if (data.initialCode) {
      await MedicineCodeModel.create({
        medicineId: medicine._id,
        codeType: data.initialCodeType || "BARCODE",
        codeValue: data.initialCode.trim(),
        isPrimary: true,
      });
    }

    await createAuditLog("CREATE_MEDICINE", "MEDICINE", {
      entityId: medicine._id.toString(),
      userId,
      details: { name: medicine.name, generic: medicine.genericName },
    });

    // Schedule a 10-minute post-registration check: If no stock added after 10 mins, trigger Out of Stock Alert & Email
    schedule10MinStockCheck(medicine._id.toString());

    return await this.getMedicineById(medicine._id.toString());
  }

  async updateMedicine(id: string, data: any, userId?: string) {
    const medicine = await MedicineModel.findById(id);
    if (!medicine) throw new Error("Medicine not found");

    if (data.name) medicine.name = data.name.trim();
    if (data.brandName !== undefined) medicine.brandName = data.brandName.trim();
    if (data.genericName) medicine.genericName = data.genericName.trim();
    if (data.strength) medicine.strength = data.strength.trim();
    if (data.dosageFormId !== undefined) medicine.dosageFormId = data.dosageFormId || null;
    if (data.categoryId !== undefined) medicine.categoryId = data.categoryId || null;
    if (data.therapeuticCategoryId !== undefined) medicine.therapeuticCategoryId = data.therapeuticCategoryId || null;
    if (data.manufacturerId !== undefined) medicine.manufacturerId = data.manufacturerId || null;
    if (data.composition !== undefined) medicine.composition = data.composition.trim();
    if (data.prescriptionRequired !== undefined) medicine.prescriptionRequired = Boolean(data.prescriptionRequired);
    if (data.minStockLevel !== undefined) medicine.minStockLevel = Number(data.minStockLevel);
    if (data.maxStockLevel !== undefined) medicine.maxStockLevel = Number(data.maxStockLevel);
    if (data.unit !== undefined) medicine.unit = data.unit.trim();
    if (data.isActive !== undefined) medicine.isActive = Boolean(data.isActive);

    await medicine.save();

    await createAuditLog("UPDATE_MEDICINE", "MEDICINE", {
      entityId: medicine._id.toString(),
      userId,
      details: { name: medicine.name },
    });

    await syncInventoryAlerts().catch(() => {});

    return await this.getMedicineById(medicine._id.toString());
  }

  async deleteMedicine(id: string, userId?: string) {
    const medicine = await MedicineModel.findById(id);
    if (!medicine) throw new Error("Medicine not found");

    // Soft delete: Always preserve historical purchase/sale/batch records by setting isActive = false
    medicine.isActive = false;
    await medicine.save();

    await createAuditLog("DEACTIVATE_MEDICINE", "MEDICINE", {
      entityId: medicine._id.toString(),
      userId,
      details: { name: medicine.name, note: "Deactivated to preserve historical records intact" },
    });

    return {
      success: true,
      message: `Medicine "${medicine.name}" has been deactivated. Historical records remain intact.`,
    };
  }

  async addMedicineCode(medicineId: string, codeValue: string, codeType: "BARCODE" | "QR" | "DATAMATRIX" = "BARCODE") {
    const existing = await MedicineCodeModel.findOne({ codeValue: codeValue.trim() });
    if (existing) {
      throw new Error(`Code "${codeValue}" is already associated with another medicine.`);
    }

    return await MedicineCodeModel.create({
      medicineId,
      codeType,
      codeValue: codeValue.trim(),
      isPrimary: false,
    });
  }
}

export const medicinesService = new MedicinesService();

function schedule10MinStockCheck(medicineId: string) {
  setTimeout(async () => {
    try {
      await syncInventoryAlerts();
    } catch (err) {
      console.error(`10-min stock check failed for medicine ${medicineId}:`, err);
    }
  }, 10 * 60 * 1000);
}
