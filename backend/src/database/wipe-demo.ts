import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ENV } from "../config/environment.js";
import {
  UserModel,
  MedicineModel,
  MedicineCodeModel,
  BatchModel,
  InventoryTransactionModel,
  SaleModel,
  AlertModel,
  PurchaseOrderModel,
  StockTransferModel,
  AuditLogModel,
} from "./models/index.js";

export async function wipeDemoData() {
  console.log("[Cleanup] Connecting to MongoDB at", ENV.MONGODB_URI);
  await mongoose.connect(ENV.MONGODB_URI);

  console.log("[Cleanup] Deleting ALL demo stocks and inventory records...");
  const delMedicines = await MedicineModel.deleteMany({});
  const delCodes = await MedicineCodeModel.deleteMany({});
  const delBatches = await BatchModel.deleteMany({});
  const delTransactions = await InventoryTransactionModel.deleteMany({});
  const delSales = await SaleModel.deleteMany({});
  const delAlerts = await AlertModel.deleteMany({});
  const delPurchases = await PurchaseOrderModel.deleteMany({});
  const delTransfers = await StockTransferModel.deleteMany({});
  const delAuditLogs = await AuditLogModel.deleteMany({});

  console.log(`[Cleanup] Deleted:
  - Medicines: ${delMedicines.deletedCount}
  - Barcodes/Codes: ${delCodes.deletedCount}
  - Batches: ${delBatches.deletedCount}
  - Transactions: ${delTransactions.deletedCount}
  - Sales: ${delSales.deletedCount}
  - Alerts: ${delAlerts.deletedCount}
  - Purchases: ${delPurchases.deletedCount}
  - Transfers: ${delTransfers.deletedCount}
  - Audit Logs: ${delAuditLogs.deletedCount}
  `);

  console.log("[Cleanup] Removing ALL non-admin users/roles...");
  const delUsers = await UserModel.deleteMany({ email: { $ne: "ap.code.in@gmail.com" } });
  console.log(`[Cleanup] Deleted non-admin users: ${delUsers.deletedCount}`);

  console.log("[Cleanup] Ensuring clean Admin account...");
  const adminPasswordHash = await bcrypt.hash("apcodein", 10);

  const existingAdmin = await UserModel.findOne({
    $or: [{ email: "ap.code.in@gmail.com" }, { email: "mis.dr.skumar@gmail.com" }, { email: "admin@mis.local" }, { role: "ADMIN" }]
  });
  if (existingAdmin) {
    existingAdmin.email = "ap.code.in@gmail.com";
    existingAdmin.name = "AP Code (Admin)";
    existingAdmin.role = "ADMIN";
    existingAdmin.passwordHash = adminPasswordHash;
    existingAdmin.permissions = ["*"];
    existingAdmin.status = "ACTIVE";
    await existingAdmin.save();
    console.log("[Cleanup] Admin account verified & updated: ap.code.in@gmail.com (Password: apcodein)");
  } else {
    await UserModel.create({
      email: "ap.code.in@gmail.com",
      passwordHash: adminPasswordHash,
      name: "AP Code (Admin)",
      phone: "+91 9876543210",
      role: "ADMIN",
      permissions: ["*"],
      status: "ACTIVE",
    });
    console.log("[Cleanup] New Admin account created: ap.code.in@gmail.com (Password: apcodein)");
  }

  const remainingUsers = await UserModel.find({});
  console.log("[Cleanup] Remaining Active Users in System:");
  remainingUsers.forEach((u) => console.log(` - ${u.email} | Role: ${u.role} | Name: ${u.name}`));

  console.log("[Cleanup] All demo stocks and extra roles wiped successfully! Only Admin remains.");
}

wipeDemoData()
  .then(async () => {
    console.log("[Cleanup] Script completed successfully.");
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Cleanup] Script error:", err);
    process.exit(1);
  });
