import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMedicine extends Document {
  name: string;
  brandName?: string;
  genericName: string;
  strength: string;
  dosageFormId?: Types.ObjectId;
  categoryId?: Types.ObjectId;
  therapeuticCategoryId?: Types.ObjectId;
  manufacturerId?: Types.ObjectId;
  composition?: string;
  prescriptionRequired: boolean;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  totalStock: number;
  unitPrice?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    brandName: { type: String, trim: true },
    genericName: { type: String, required: true, trim: true, index: true },
    strength: { type: String, required: true, trim: true },
    dosageFormId: { type: Schema.Types.ObjectId, ref: "DosageForm" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    therapeuticCategoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    manufacturerId: { type: Schema.Types.ObjectId, ref: "Manufacturer" },
    composition: { type: String, trim: true },
    prescriptionRequired: { type: Boolean, default: false },
    minStockLevel: { type: Number, default: 20 },
    maxStockLevel: { type: Number, default: 500 },
    unit: { type: String, default: "Strip" },
    totalStock: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

MedicineSchema.index({ name: "text", genericName: "text", brandName: "text" });

export const MedicineModel = mongoose.models.Medicine || mongoose.model<IMedicine>("Medicine", MedicineSchema);
