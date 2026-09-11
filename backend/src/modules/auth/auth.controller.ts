import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service.js";
import { loginSchema } from "./auth.validation.js";
import { AuthenticatedRequest } from "../../middleware/auth.js";
import { createAuditLog } from "../../middleware/audit.js";

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;
      const result = await authService.login(validated, ip);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err.errors) {
        res.status(400).json({
          success: false,
          error: err.errors[0]?.message || "Validation error",
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: err.message || "Login failed",
      });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.user) {
      await createAuditLog("LOGOUT", "USER", {
        entityId: req.user.id,
        userId: req.user.id,
        details: { email: req.user.email },
      });
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const user = await authService.getMe(req.user.id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
