import { Request, Response, NextFunction } from "express";
import { inventoryService } from "./inventory.service.js";
import { AuthenticatedRequest } from "../../middleware/auth.js";

export class InventoryController {
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { medicineId, batchId, type, page, limit } = req.query;
      const data = await inventoryService.listTransactions({
        medicineId: medicineId as string,
        batchId: batchId as string,
        type: type as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;
      const data = await inventoryService.adjustStock(req.body, req.user?.id, ip);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const inventoryController = new InventoryController();
