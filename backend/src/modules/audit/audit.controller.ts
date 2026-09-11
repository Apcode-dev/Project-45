import { Request, Response, NextFunction } from "express";
import { AuditLogModel } from "../../database/models/AuditLog.js";

export const getAllAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { action, entity, search, page = "1", limit = "30" } = req.query;
    const filter: any = {};

    if (action) filter.action = action;
    if (entity) filter.entity = entity;

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { action: { $regex: q, $options: "i" } },
        { entity: { $regex: q, $options: "i" } },
        { details: { $regex: q, $options: "i" } },
      ];
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLogModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};
