import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((issue) => issue.message);
        res.status(400).json({
          success: false,
          error: issues.join("; ") || "Validation Error",
          details: err.issues,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: err.message || "Invalid request body",
      });
    }
  };
};
