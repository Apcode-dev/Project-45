import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { UserModel } from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://apcodein_db_user:CEicoMcycbMNsdDW@akash.vcpecwa.mongodb.net/mis?retryWrites=true&w=majority&appName=Akash";

async function updateAdminCredentials() {
  try {
    console.log("[UpdateAdmin] Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGODB_URI);
    console.log("[UpdateAdmin] Connected to MongoDB Atlas.");

    const newEmail = "ap.code.in@gmail.com";
    const newPassword = "apcodein";
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Find any existing admin
    let admin = await UserModel.findOne({
      $or: [
        { role: "ADMIN" },
        { email: "mis.dr.skumar@gmail.com" },
        { email: "admin@mis.local" },
        { email: "ap.code.in@gmail.com" }
      ]
    });

    if (admin) {
      admin.email = newEmail;
      admin.passwordHash = newPasswordHash;
      admin.name = "AP Code (Admin)";
      admin.status = "ACTIVE";
      admin.role = "ADMIN";
      admin.permissions = ["*"];
      await admin.save();
      console.log(`[UpdateAdmin] SUCCESS: Updated Admin credentials!`);
    } else {
      admin = await UserModel.create({
        email: newEmail,
        passwordHash: newPasswordHash,
        name: "AP Code (Admin)",
        phone: "+91 9876543210",
        role: "ADMIN",
        permissions: ["*"],
        status: "ACTIVE",
      });
      console.log(`[UpdateAdmin] SUCCESS: Created new Admin user!`);
    }

    console.log(`----------------------------------------`);
    console.log(`Email ID : ${admin.email}`);
    console.log(`Password : ${newPassword}`);
    console.log(`Role     : ${admin.role}`);
    console.log(`Name     : ${admin.name}`);
    console.log(`Status   : ${admin.status}`);
    console.log(`----------------------------------------`);

    await mongoose.disconnect();
    console.log("[UpdateAdmin] Disconnected cleanly.");
    process.exit(0);
  } catch (err) {
    console.error("[UpdateAdmin] Error updating admin credentials:", err);
    process.exit(1);
  }
}

updateAdminCredentials();
