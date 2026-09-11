import mongoose, { Schema, Document } from "mongoose";

export interface IManufacturer extends Document {
  name: string;
  country?: string;
  contactEmail?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ManufacturerSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    country: { type: String, default: "India" },
    contactEmail: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

export const ManufacturerModel = mongoose.models.Manufacturer || mongoose.model<IManufacturer>("Manufacturer", ManufacturerSchema);
