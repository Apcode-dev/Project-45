import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBatch extends Document {
  medicineId: Types.ObjectId;
  batchNumber: string;
  manufacturingDate: Date;
  expiryDate: Date;
  quantity: number;
  initialQuantity: number;
  purchasePrice: number;
  mrp: number;
  supplierId?: Types.ObjectId;
  status: "ACTIVE" | "EXPIRED" | "QUARANTINED" | "RECALLED" | "DEPLETED";
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema = new Schema(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true, index: true },
    batchNumber: { type: String, required: true, trim: true },
    manufacturingDate: { type: Date, default: () => new Date() },
    expiryDate: { type: Date, required: true, index: true }, // Crucial for FEFO sorting
    quantity: { type: Number, required: true, default: 0, min: 0 },
    initialQuantity: { type: Number, required: true, default: 0 },
    purchasePrice: { type: Number, required: true, default: 0 },
    mrp: { type: Number, required: true, default: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "QUARANTINED", "RECALLED", "DEPLETED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

BatchSchema.index({ medicineId: 1, batchNumber: 1 }, { unique: true });
BatchSchema.index({ expiryDate: 1, status: 1 }); // Compound FEFO index

export const BatchModel = mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema);
