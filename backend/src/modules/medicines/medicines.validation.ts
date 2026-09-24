import { z } from "zod";

export const createMedicineSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required"),
  genericName: z.string().trim().min(1, "Generic name is required"),
  categoryId: z.string().trim().min(1, "Category ID is required"),
  therapeuticCategoryId: z.string().trim().optional(),
  manufacturerId: z.string().trim().optional(),
  dosageFormId: z.string().trim().optional(),
  strength: z.string().trim().optional(),
  unit: z.string().trim().default("TAB"),
  mrp: z.coerce.number().min(0, "MRP price cannot be negative"),
  purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative").default(0),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative").optional(),
  minStockLevel: z.coerce.number().min(0, "Min stock level cannot be negative").default(10),
  maxStockLevel: z.coerce.number().min(0, "Max stock level cannot be negative").default(100),
  reorderPoint: z.coerce.number().min(0, "Reorder point cannot be negative").default(15),
  prescriptionRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
});

export const updateMedicineSchema = createMedicineSchema.partial();
