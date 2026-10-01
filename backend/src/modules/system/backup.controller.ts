import { Request, Response, NextFunction } from "express";
import path from "path";
import { backupService } from "./backup.service.js";
import { createAuditLog } from "../../middleware/audit.js";

export const createBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await backupService.createBackup();

    await createAuditLog("SYSTEM_BACKUP", "SYSTEM", {
      userId: (req as any).user?.id || (req as any).user?._id,
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      details: { backupId: result.backupId, counts: result.recordCounts },
    });

    res.status(201).json({
      success: true,
      message: "Database backup created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const listBackups = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backups = await backupService.listBackups();
    res.status(200).json({ success: true, count: backups.length, data: backups });
  } catch (err) {
    next(err);
  }
};

export const restoreBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { backupId } = req.body;
    if (!backupId) {
      res.status(400).json({ success: false, message: "Backup ID or filename is required" });
      return;
    }

    const result = await backupService.restoreBackup(backupId);

    await createAuditLog("SYSTEM_RESTORE", "SYSTEM", {
      userId: (req as any).user?.id || (req as any).user?._id,
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      details: { backupId },
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Failed to restore backup" });
  }
};

export const downloadBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { backupId } = req.params;
    if (!backupId) {
      res.status(400).json({ success: false, message: "Backup ID is required" });
      return;
    }

    const backupIdStr = Array.isArray(backupId) ? backupId[0] : backupId;
    const filePath = backupService.getBackupFilePath(backupIdStr);
    const fileName = path.basename(filePath);

    res.download(filePath, fileName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, error: "Failed to download backup document." });
      }
    });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message || "Backup document not found." });
  }
};
