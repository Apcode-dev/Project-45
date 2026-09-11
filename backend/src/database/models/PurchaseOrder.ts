import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPurchaseItem {
  medicineId: Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  manufacturingDate?: Date;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  total: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplierId: Types.ObjectId;
  invoiceNumber?: string;
  orderDate: Date;
  receivedDate?: Date;
  items: IPurchaseItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  grandTotal: number;
  status: "ORDERED" | "RECEIVED" | "CANCELLED";
  paymentStatus: "PAID" | "PENDING" | "PARTIAL";
  notes?: string;
  createdById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema: Schema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
  batchNumber: { type: String, required: true, trim: true },
  expiryDate: { type: Date, required: true },
  manufacturingDate: { type: Date },
  quantity: { type: Number, required: true, min: 1 },
  purchasePrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
});

const PurchaseOrderSchema: Schema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true, index: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    invoiceNumber: { type: String, trim: true },
    orderDate: { type: Date, default: Date.now },
    receivedDate: { type: Date },
    items: [PurchaseItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ORDERED", "RECEIVED", "CANCELLED"],
      default: "ORDERED",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "PENDING", "PARTIAL"],
      default: "PENDING",
    },
    notes: { type: String, trim: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const PurchaseOrderModel =
  mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
