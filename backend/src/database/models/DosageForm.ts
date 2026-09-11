import mongoose, { Schema, Document } from "mongoose";

export interface IDosageForm extends Document {
  name: string;
  shortName?: string;
  createdAt: Date;
}

const DosageFormSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    shortName: { type: String, trim: true },
  },
  { timestamps: true }
);

export const DosageFormModel = mongoose.models.DosageForm || mongoose.model<IDosageForm>("DosageForm", DosageFormSchema);
