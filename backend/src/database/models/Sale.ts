import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISaleItem {
  medicineId: Types.ObjectId;
  batchId: Types.ObjectId;
  batchNumber?: string;
  expiryDate?: Date;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  doctorName?: string;
  prescriptionNumber?: string;
  items: ISaleItem[];
  totalAmount: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: "CASH" | "CARD" | "UPI" | "CREDIT";
  status: "COMPLETED" | "REFUNDED" | "CANCELLED";
  createdBy?: string;
  createdAt: Date;
}

const SaleItemSchema: Schema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
  batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
});

const SaleSchema: Schema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    doctorName: { type: String, trim: true },
    prescriptionNumber: { type: String, trim: true },
    items: [SaleItemSchema],
    totalAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["CASH", "CARD", "UPI", "CREDIT"], default: "CASH" },
    status: { type: String, enum: ["COMPLETED", "REFUNDED", "CANCELLED"], default: "COMPLETED", index: true },
    createdBy: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SaleModel = mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);
