import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../database/models/User.js";
import { getRolePermissions } from "../auth/auth.types.js";

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, status, search } = req.query;
    const filter: any = {};

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const users = await UserModel.find(filter).select("-passwordHash").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, role = "STAFF", status = "ACTIVE" } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: "Name, email, and password are required" });
      return;
    }

    const existing = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: "A user with this email already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await UserModel.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      phone: phone?.trim(),
      role,
      permissions: getRolePermissions(role),
      status,
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    res.status(201).json({ success: true, data: userObj, message: "User account created successfully" });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, role, status } = req.body;

    const user = await UserModel.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    res.status(200).json({ success: true, data: userObj, message: "User updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const resetUserPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
      return;
    }

    const user = await UserModel.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};
