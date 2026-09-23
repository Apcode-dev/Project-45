import { Request, Response, NextFunction } from "express";
import { categoriesService } from "./categories.service.js";

export class CategoriesController {
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, isActive } = req.query;
      const activeFilter = isActive === undefined ? undefined : isActive === "true";
      const data = await categoriesService.listCategories(type as string, activeFilter);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, parentId, description } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: "Category name is required" });
        return;
      }
      const data = await categoriesService.createCategory({ name, type, parentId, description });
      res.status(201).json({ success: true, data, message: "Category created successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await categoriesService.updateCategory(id as string, req.body);
      res.status(200).json({ success: true, data, message: "Category updated successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await categoriesService.deleteCategory(id as string);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Dosage Forms
  async getDosageForms(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await categoriesService.listDosageForms();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createDosageForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, shortName } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: "Dosage form name is required" });
        return;
      }
      const data = await categoriesService.createDosageForm(name, shortName);
      res.status(201).json({ success: true, data, message: "Dosage form created successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateDosageForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await categoriesService.updateDosageForm(id as string, req.body);
      res.status(200).json({ success: true, data, message: "Dosage form updated successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteDosageForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await categoriesService.deleteDosageForm(id as string);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const categoriesController = new CategoriesController();
