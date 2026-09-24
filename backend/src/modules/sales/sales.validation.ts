import { z } from "zod";

export const saleItemSchema = z.object({
  medicineId: z.string().trim().min(1, "Medicine ID is required"),
  batchId: z.string().trim().optional(),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative").optional(),
  mrp: z.coerce.number().min(0, "MRP cannot be negative").optional(),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
});

export const createSaleSchema = z.object({
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  doctorName: z.string().trim().optional(),
  prescriptionNumber: z.string().trim().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NET_BANKING", "INSURANCE", "CREDIT"]).default("CASH"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  tax: z.coerce.number().min(0, "Tax cannot be negative").default(0),
  items: z.array(saleItemSchema).min(1, "At least one sale item is required"),
});
