import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  createdAt: Date;
}

const BranchSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    isMain: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const BranchModel = mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);
