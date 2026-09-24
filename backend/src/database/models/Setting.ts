import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  pharmacyName: string;
  license: string;
  GSTIN: string;
  phone: string;
  email: string;
  address: string;
  expiryWarningDays: number;
  FEFO: boolean;
  prescriptionRequired: boolean;
  hardExpiryLock: boolean;
  lowStockThreshold: number;
  updatedAt: Date;
}

const SettingSchema: Schema = new Schema(
  {
    pharmacyName: { type: String, default: "MIS Medical Store", trim: true },
    license: { type: String, default: "DL-12345/MIS", trim: true },
    GSTIN: { type: String, default: "22AAAAA0000A1Z5", trim: true },
    phone: { type: String, default: "+91 9876543210", trim: true },
    email: { type: String, default: "info@medicalstore.com", trim: true },
    address: { type: String, default: "Main Market, New Delhi", trim: true },
    expiryWarningDays: { type: Number, default: 60, min: 1 },
    FEFO: { type: Boolean, default: true },
    prescriptionRequired: { type: Boolean, default: false },
    hardExpiryLock: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true }
);

export const SettingModel =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
