import { Request, Response, NextFunction } from "express";
import { medicinesService } from "./medicines.service.js";
import { AuthenticatedRequest } from "../../middleware/auth.js";

export class MedicinesController {
  async getMedicines(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        dosageFormId,
        categoryId,
        therapeuticCategoryId,
        manufacturerId,
        prescriptionRequired,
        lowStock,
        page,
        limit,
      } = req.query;

      const result = await medicinesService.listMedicines({
        search: search as string,
        dosageFormId: dosageFormId as string,
        categoryId: categoryId as string,
        therapeuticCategoryId: therapeuticCategoryId as string,
        manufacturerId: manufacturerId as string,
        prescriptionRequired: prescriptionRequired === undefined ? undefined : prescriptionRequired === "true",
        lowStock: lowStock === "true",
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getMedicineById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await medicinesService.getMedicineById(id);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  async createMedicine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await medicinesService.createMedicine(req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: "Medicine created successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateMedicine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await medicinesService.updateMedicine(id, req.body, req.user?.id);
      res.status(200).json({ success: true, data, message: "Medicine updated successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteMedicine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await medicinesService.deleteMedicine(id, req.user?.id);
      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async addCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { codeValue, codeType } = req.body;
      if (!codeValue) {
        res.status(400).json({ success: false, error: "Code value is required" });
        return;
      }
      const data = await medicinesService.addMedicineCode(id, codeValue, codeType);
      res.status(201).json({ success: true, data, message: "Code registered successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const medicinesController = new MedicinesController();
