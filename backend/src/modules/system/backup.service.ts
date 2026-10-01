import fs from "fs";
import path from "path";
import { MedicineModel } from "../../database/models/Medicine.js";
import { BatchModel } from "../../database/models/Batch.js";
import { SaleModel } from "../../database/models/Sale.js";
import { PurchaseOrderModel } from "../../database/models/PurchaseOrder.js";
import { SupplierModel } from "../../database/models/Supplier.js";
import { UserModel } from "../../database/models/User.js";
import { SettingModel } from "../../database/models/Setting.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { CategoryModel } from "../../database/models/Category.js";

const BACKUP_DIR = path.join(process.cwd(), "backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export class BackupService {
  // Batch export method with unlimited cursor iteration (Item 32)
  private async exportCollection(model: any): Promise<any[]> {
    const records: any[] = [];
    const cursor = model.find({}).cursor();
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      records.push(doc.toObject());
    }
    return records;
  }

  async createBackup(): Promise<{ backupId: string; filePath: string; recordCounts: Record<string, number> }> {
    const backupId = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const filename = `${backupId}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Stream and batch read all collections without 1000 limit (Item 32)
    const medicines = await this.exportCollection(MedicineModel);
    const batches = await this.exportCollection(BatchModel);
    const sales = await this.exportCollection(SaleModel);
    const purchases = await this.exportCollection(PurchaseOrderModel);
    const suppliers = await this.exportCollection(SupplierModel);
    const users = await this.exportCollection(UserModel);
    const settings = await this.exportCollection(SettingModel);
    const transactions = await this.exportCollection(InventoryTransactionModel);
    const categories = await this.exportCollection(CategoryModel);

    const backupData = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      backupId,
      collections: {
        medicines,
        batches,
        sales,
        purchases,
        suppliers,
        users,
        settings,
        transactions,
        categories,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

    return {
      backupId,
      filePath: filename,
      recordCounts: {
        medicines: medicines.length,
        batches: batches.length,
        sales: sales.length,
        purchases: purchases.length,
        suppliers: suppliers.length,
        users: users.length,
        settings: settings.length,
        transactions: transactions.length,
        categories: categories.length,
      },
    };
  }

  async listBackups(): Promise<Array<{ backupId: string; filename: string; sizeBytes: number; createdAt: Date }>> {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    const files = fs.readdirSync(BACKUP_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const fullPath = path.join(BACKUP_DIR, f);
        const stat = fs.statSync(fullPath);
        return {
          backupId: f.replace(".json", ""),
          filename: f,
          sizeBytes: stat.size,
          createdAt: stat.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async restoreBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    const filename = backupId.endsWith(".json") ? backupId : `${backupId}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file '${filename}' not found`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    if (!data.collections) {
      throw new Error("Invalid backup file format");
    }

    // ADMIN-ONLY restore logic
    const { medicines, batches, sales, purchases, suppliers, settings, categories } = data.collections;

    if (Array.isArray(medicines) && medicines.length > 0) {
      await MedicineModel.deleteMany({});
      await MedicineModel.insertMany(medicines);
    }

    if (Array.isArray(batches) && batches.length > 0) {
      await BatchModel.deleteMany({});
      await BatchModel.insertMany(batches);
    }

    if (Array.isArray(sales) && sales.length > 0) {
      await SaleModel.deleteMany({});
      await SaleModel.insertMany(sales);
    }

    if (Array.isArray(purchases) && purchases.length > 0) {
      await PurchaseOrderModel.deleteMany({});
      await PurchaseOrderModel.insertMany(purchases);
    }

    if (Array.isArray(suppliers) && suppliers.length > 0) {
      await SupplierModel.deleteMany({});
      await SupplierModel.insertMany(suppliers);
    }

    if (Array.isArray(settings) && settings.length > 0) {
      await SettingModel.deleteMany({});
      await SettingModel.insertMany(settings);
    }

    if (Array.isArray(categories) && categories.length > 0) {
      await CategoryModel.deleteMany({});
      await CategoryModel.insertMany(categories);
    }

    return {
      success: true,
      message: `Data successfully restored from backup '${backupId}'`,
    };
  }

  getBackupFilePath(backupId: string): string {
    const filename = backupId.endsWith(".json") ? backupId : `${backupId}.json`;
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup document '${safeFilename}' not found`);
    }
    return filePath;
  }
}

export const backupService = new BackupService();
