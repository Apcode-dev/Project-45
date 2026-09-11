import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  type: "DOSAGE" | "THERAPEUTIC";
  parentId?: Types.ObjectId;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["DOSAGE", "THERAPEUTIC"], default: "DOSAGE", index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CategorySchema.index({ name: 1, type: 1 }, { unique: true });

export const CategoryModel = mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
