import { AuditLogModel } from "../database/models/AuditLog.js";

export const createAuditLog = async (
  action: string,
  entity: string,
  options?: {
    entityId?: string;
    userId?: any;
    details?: any;
    ipAddress?: string;
  }
) => {
  try {
    await AuditLogModel.create({
      action,
      entity,
      entityId: options?.entityId || null,
      userId: options?.userId || null,
      details: options?.details ? JSON.stringify(options.details) : null,
      ipAddress: options?.ipAddress || null,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};
