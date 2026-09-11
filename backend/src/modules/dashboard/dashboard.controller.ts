import { Request, Response, NextFunction } from "express";
import { dashboardService } from "./dashboard.service.js";

export class DashboardController {
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
