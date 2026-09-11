import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMedicineCode extends Document {
  medicineId: Types.ObjectId;
  codeType: "BARCODE" | "QR" | "DATAMATRIX";
  codeValue: string;
  isPrimary: boolean;
  createdAt: Date;
}

const MedicineCodeSchema: Schema = new Schema(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true, index: true },
    codeType: { type: String, enum: ["BARCODE", "QR", "DATAMATRIX"], default: "BARCODE" },
    codeValue: { type: String, required: true, unique: true, trim: true, index: true },
    isPrimary: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MedicineCodeModel = mongoose.models.MedicineCode || mongoose.model<IMedicineCode>("MedicineCode", MedicineCodeSchema);
