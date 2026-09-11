import { CategoryModel } from "../../database/models/Category.js";
import { DosageFormModel } from "../../database/models/DosageForm.js";
import { MedicineModel } from "../../database/models/Medicine.js";

export class CategoriesService {
  // Categories (Dosage & Therapeutic)
  async listCategories(type?: string, isActive?: boolean) {
    const filter: any = {};
    if (type) filter.type = type.toUpperCase();
    if (isActive !== undefined) filter.isActive = isActive;

    return await CategoryModel.find(filter)
      .populate("parentId", "name")
      .sort({ name: 1 })
      .lean();
  }

  async createCategory(data: { name: string; type?: "DOSAGE" | "THERAPEUTIC"; parentId?: string; description?: string }) {
    const existing = await CategoryModel.findOne({ name: data.name.trim(), type: data.type || "DOSAGE" });
    if (existing) {
      throw new Error(`Category "${data.name}" already exists in ${data.type || "DOSAGE"} classifications.`);
    }

    return await CategoryModel.create({
      name: data.name.trim(),
      type: data.type || "DOSAGE",
      parentId: data.parentId || null,
      description: data.description?.trim(),
      isActive: true,
    });
  }

  async updateCategory(id: string, data: { name?: string; description?: string; isActive?: boolean; parentId?: string | null }) {
    const category = await CategoryModel.findById(id);
    if (!category) throw new Error("Category not found");

    if (data.name) category.name = data.name.trim();
    if (data.description !== undefined) category.description = data.description.trim();
    if (data.isActive !== undefined) category.isActive = data.isActive;
    if (data.parentId !== undefined) category.parentId = data.parentId;

    await category.save();
    return category;
  }

  async deleteCategory(id: string) {
    // Delete protection: Check if any active medicine references this category
    const usedInMedicine = await MedicineModel.findOne({
      $or: [{ categoryId: id }, { therapeuticCategoryId: id }],
    });

    if (usedInMedicine) {
      throw new Error("Cannot delete category because it is linked to active medicines. Consider deactivating it instead.");
    }

    const res = await CategoryModel.findByIdAndDelete(id);
    if (!res) throw new Error("Category not found");
    return { success: true, message: "Category deleted successfully" };
  }

  // Dosage Forms
  async listDosageForms() {
    return await DosageFormModel.find().sort({ name: 1 }).lean();
  }

  async createDosageForm(name: string, shortName?: string) {
    const existing = await DosageFormModel.findOne({ name: name.trim() });
    if (existing) throw new Error(`Dosage Form "${name}" already exists`);

    return await DosageFormModel.create({
      name: name.trim(),
      shortName: shortName?.trim(),
    });
  }
}

export const categoriesService = new CategoriesService();
