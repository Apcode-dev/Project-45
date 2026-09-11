import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInventoryTransaction extends Document {
  medicineId: Types.ObjectId;
  batchId?: Types.ObjectId;
  type: "PURCHASE" | "SALE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "DAMAGE" | "RETURN" | "TRANSFER";
  quantityDelta: number;
  beforeQuantity: number;
  afterQuantity: number;
  reason?: string;
  userId?: Types.ObjectId;
  ipAddress?: string;
  notes?: string;
  createdAt: Date;
}

const InventoryTransactionSchema: Schema = new Schema(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", index: true },
    type: {
      type: String,
      enum: ["PURCHASE", "SALE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE", "RETURN", "TRANSFER"],
      required: true,
      index: true,
    },
    quantityDelta: { type: Number, required: true },
    beforeQuantity: { type: Number, required: true },
    afterQuantity: { type: Number, required: true },
    reason: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    ipAddress: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InventoryTransactionSchema.index({ createdAt: -1 });

export const InventoryTransactionModel = mongoose.models.InventoryTransaction || mongoose.model<IInventoryTransaction>("InventoryTransaction", InventoryTransactionSchema);
