import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAlert extends Document {
  type: "LOW_STOCK" | "EXPIRING_SOON" | "EXPIRED" | "RECALL";
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  medicineId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  isResolved: boolean;
  emailSent?: boolean;
  createdAt: Date;
}

const AlertSchema: Schema = new Schema(
  {
    type: { type: String, enum: ["LOW_STOCK", "EXPIRING_SOON", "EXPIRED", "RECALL"], required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ["INFO", "WARNING", "CRITICAL"], default: "WARNING" },
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine" },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    isResolved: { type: Boolean, default: false, index: true },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AlertModel = mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);
