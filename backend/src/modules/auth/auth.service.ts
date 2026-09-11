import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../../database/models/User.js";
import { ENV } from "../../config/environment.js";
import { LoginPayload, AuthResponse } from "./auth.types.js";
import { createAuditLog } from "../../middleware/audit.js";

export class AuthService {
  async login(payload: LoginPayload, ipAddress?: string): Promise<AuthResponse> {
    const user = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("Your account has been deactivated. Contact the Administrator.");
    }

    const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid email or password");
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
      role: user.role,
      permissions: user.permissions || [],
    };
  }
}

export const authService = new AuthService();
