import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  entity: string;
  entityId?: string;
  userId?: Types.ObjectId;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    details: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
