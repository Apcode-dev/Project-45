import { ManufacturerModel } from "../../database/models/Manufacturer.js";
import { MedicineModel } from "../../database/models/Medicine.js";

export class ManufacturersService {
  async listManufacturers() {
    return await ManufacturerModel.find().sort({ name: 1 }).lean();
  }

  async createManufacturer(data: { name: string; country?: string; contactEmail?: string; phone?: string }) {
    const existing = await ManufacturerModel.findOne({ name: data.name.trim() });
    if (existing) throw new Error(`Manufacturer "${data.name}" already exists.`);

    return await ManufacturerModel.create({
      name: data.name.trim(),
      country: data.country?.trim() || "India",
      contactEmail: data.contactEmail?.trim(),
      phone: data.phone?.trim(),
    });
  }

  async updateManufacturer(id: string, data: any) {
    const mfg = await ManufacturerModel.findById(id);
    if (!mfg) throw new Error("Manufacturer not found");

    if (data.name) mfg.name = data.name.trim();
    if (data.country) mfg.country = data.country.trim();
    if (data.contactEmail !== undefined) mfg.contactEmail = data.contactEmail.trim();
    if (data.phone !== undefined) mfg.phone = data.phone.trim();

    await mfg.save();
    return mfg;
  }

  async deleteManufacturer(id: string) {
    const used = await MedicineModel.findOne({ manufacturerId: id });
    if (used) {
      throw new Error("Cannot delete manufacturer because active medicines are linked to it.");
    }

    const res = await ManufacturerModel.findByIdAndDelete(id);
    if (!res) throw new Error("Manufacturer not found");
    return { success: true, message: "Manufacturer deleted successfully" };
  }
}

export const manufacturersService = new ManufacturersService();
