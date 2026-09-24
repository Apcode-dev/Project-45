import { Request, Response, NextFunction } from "express";
import { SettingModel } from "../../database/models/Setting.js";
import { createAuditLog } from "../../middleware/audit.js";

export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let settings = await SettingModel.findOne();
    if (!settings) {
      settings = await SettingModel.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let settings = await SettingModel.findOne();
    if (!settings) {
      settings = new SettingModel(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();

    await createAuditLog("SETTINGS_UPDATE", "SYSTEM", {
      userId: (req as any).user?.id || (req as any).user?._id,
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      details: req.body,
    });

    res.status(200).json({
      success: true,
      data: settings,
      message: "System settings saved successfully to database",
    });
  } catch (err) {
    next(err);
  }
};
