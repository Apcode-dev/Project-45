import { Request, Response, NextFunction } from "express";
import { batchesService } from "./batches.service.js";
import { AuthenticatedRequest } from "../../middleware/auth.js";

export class BatchesController {
  async getBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { medicineId, status, expiringDays, search, fefoSort } = req.query;
      const data = await batchesService.listBatches({
        medicineId: medicineId as string,
        status: status as string,
        expiringDays: expiringDays ? parseInt(expiringDays as string, 10) : undefined,
        search: search as string,
        fefoSort: fefoSort !== "false",
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getBatchById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await batchesService.getBatchById(req.params.id as string);
      if (!data) {
        res.status(404).json({ success: false, message: "Batch not found" });
        return;
      }
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await batchesService.createBatch(req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: "Batch registered successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async setStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const data = await batchesService.setBatchStatus(id as string, status, reason, req.user?.id);
      res.status(200).json({ success: true, data, message: `Batch status changed to ${status}` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async lockExpired(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await batchesService.lockExpiredBatches();
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export const batchesController = new BatchesController();
