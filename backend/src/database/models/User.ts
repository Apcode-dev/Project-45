import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: "ADMIN" | "DR" | "DOCTOR" | "PHARMACIST" | "MANAGER" | "INVENTORY_MANAGER" | "STAFF";
  permissions: string[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  mustChangePassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: ["ADMIN", "DR", "DOCTOR", "PHARMACIST", "MANAGER", "INVENTORY_MANAGER", "STAFF"],
      default: "STAFF",
      index: true,
    },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
