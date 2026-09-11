import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.js";

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized access" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Role '${req.user.role}' is not authorized to perform this action.`,
      });
      return;
    }

    next();
  };
};
