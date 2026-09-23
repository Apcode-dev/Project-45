import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../../database/models/User.js";
import { ENV } from "../../config/environment.js";
import { LoginPayload, RegisterPayload, AuthResponse, getRolePermissions } from "./auth.types.js";
import { createAuditLog } from "../../middleware/audit.js";

export class AuthService {
  async register(payload: RegisterPayload, ipAddress?: string): Promise<AuthResponse> {
    const existing = await UserModel.findOne({ email: payload.email.toLowerCase().trim() });
    if (existing) {
      throw new Error("A user with this email address already exists.");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password, salt);
    const permissions = getRolePermissions(payload.role);

    const user = await UserModel.create({
      name: payload.name.trim(),
      email: payload.email.toLowerCase().trim(),
      passwordHash,
      role: payload.role,
      permissions,
      status: "ACTIVE",
    });

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
    };

    const token = jwt.sign(tokenPayload, ENV.JWT_SECRET, {
      expiresIn: "7d",
    });

    await createAuditLog("REGISTER", "USER", {
      entityId: user._id.toString(),
      userId: user._id,
      ipAddress,
      details: { role: user.role, email: user.email },
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || [],
      },
    };
  }

  async login(payload: LoginPayload, ipAddress?: string): Promise<AuthResponse> {
    const user = await UserModel.findOne({ email: payload.email.toLowerCase().trim() });

    if (!user) {
      throw new Error("Account nahi mila! Kripya Admin se apni login ID create karwaye and verify karaye.");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("Aapka account inactive ya suspended hai. Kripya Admin se verify karaye.");
    }

    const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isMatch) {
      throw new Error("Password galat hai! Kripya sahi credentials dalein ya Admin se ID verify karaye.");
    }

    const normalizeRole = (r: string) => {
      const upper = (r || "").toUpperCase().trim();
      if (upper === "DR" || upper === "DOCTOR") return "DR";
      if (upper === "MANAGER" || upper === "INVENTORY_MANAGER") return "MANAGER";
      return upper;
    };

    if (payload.role && normalizeRole(user.role) !== normalizeRole(payload.role)) {
      throw new Error(`Role match nahi hua! Aapka account "${user.role}" ke liye authorized hai, lekin aapne "${payload.role}" select kiya hai. Kripya Admin se ID create karwaye and verify karaye.`);
    }

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
    };

    const token = jwt.sign(tokenPayload, ENV.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Audit log
    await createAuditLog("LOGIN", "USER", {
      entityId: user._id.toString(),
      userId: user._id,
      ipAddress,
      details: { role: user.role },
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: (user as any).avatar || "",
        role: user.role,
        permissions: user.permissions || [],
      },
    };
  }

  async getMe(userId: string) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: (user as any).avatar || "",
      role: user.role,
      permissions: user.permissions || [],
    };
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string; avatar?: string; password?: string; currentPassword?: string }) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (data.name && data.name.trim()) {
      user.name = data.name.trim();
    }

    if (data.phone !== undefined) {
      user.phone = data.phone?.trim() || "";
    }

    if (data.avatar !== undefined) {
      user.avatar = data.avatar;
    }

    if (data.password && data.password.trim()) {
      if (data.currentPassword) {
        const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
        if (!isMatch) {
          throw new Error("Current password sahi nahi hai. Kripya apna sahi password dalein.");
        }
      }
      user.passwordHash = await bcrypt.hash(data.password.trim(), 10);
    }

    await user.save();

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: (user as any).avatar || "",
      role: user.role,
      permissions: user.permissions || [],
    };
  }
}

export const authService = new AuthService();
