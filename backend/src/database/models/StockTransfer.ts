import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITransferItem {
  medicineId: Types.ObjectId;
  batchId: Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
}

export interface IStockTransfer extends Document {
  transferNumber: string;
  fromBranchId: Types.ObjectId;
  toBranchId: Types.ObjectId;
  items: ITransferItem[];
  status: "DISPATCHED" | "RECEIVED" | "CANCELLED";
  notes?: string;
  dispatchedAt: Date;
  receivedAt?: Date;
  dispatchedBy?: Types.ObjectId;
  receivedBy?: Types.ObjectId;
}

const TransferItemSchema: Schema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
  batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const StockTransferSchema: Schema = new Schema(
  {
    transferNumber: { type: String, required: true, unique: true, index: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    items: [TransferItemSchema],
    status: {
      type: String,
      enum: ["DISPATCHED", "RECEIVED", "CANCELLED"],
      default: "DISPATCHED",
      index: true,
    },
    notes: { type: String, trim: true },
    dispatchedAt: { type: Date, default: Date.now },
    receivedAt: { type: Date },
    dispatchedBy: { type: Schema.Types.ObjectId, ref: "User" },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const StockTransferModel =
  mongoose.models.StockTransfer ||
  mongoose.model<IStockTransfer>("StockTransfer", StockTransferSchema);
