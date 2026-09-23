import { Request, Response, NextFunction } from "express";
import { scannerService } from "./scanner.service.js";
import { AuthenticatedRequest } from "../../middleware/auth.js";

export class ScannerController {
  async lookup(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const result = await scannerService.lookupCode(code as string);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async quickInward(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;
      const result = await scannerService.quickInward(req.body, req.user?.id, ip);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async visionScan(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageBase64 } = req.body;
      const result = await scannerService.visionScan(imageBase64);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const scannerController = new ScannerController();
