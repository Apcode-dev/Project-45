import { z } from "zod";

export const purchaseItemSchema = z
  .object({
    medicineId: z.string().trim().min(1, "Medicine ID is required"),
    batchNumber: z.string().trim().min(1, "Batch number is required"),
    expiryDate: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
      message: "Valid expiry date is required",
    }),
    manufacturingDate: z.string().or(z.date()).optional(),
    quantity: z.coerce.number().gt(0, "Quantity must be greater than 0"),
    purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative"),
    sellingPrice: z.coerce.number().min(0, "Selling price/MRP cannot be negative").optional(),
  })
  .refine(
    (data) => {
      if (data.manufacturingDate && data.expiryDate) {
        const mfg = new Date(data.manufacturingDate).getTime();
        const exp = new Date(data.expiryDate).getTime();
        return mfg < exp;
      }
      return true;
    },
    {
      message: "Manufacturing date (MFG) must be before Expiry date (EXP)",
      path: ["manufacturingDate"],
    }
  );

export const createPurchaseSchema = z.object({
  supplierId: z.string().trim().min(1, "Supplier is required"),
  invoiceNumber: z.string().trim().optional(),
  orderDate: z.string().or(z.date()).optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one purchase item is required"),
  subtotal: z.coerce.number().min(0, "Subtotal cannot be negative").optional(),
  tax: z.coerce.number().min(0, "Tax cannot be negative").default(0),
  shipping: z.coerce.number().min(0, "Shipping cost cannot be negative").default(0),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]).default("ORDERED"),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID"]).default("PENDING"),
  notes: z.string().trim().optional(),
});
