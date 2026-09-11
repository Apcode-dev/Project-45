import { MedicineModel } from "../../database/models/Medicine.js";
import { BatchModel } from "../../database/models/Batch.js";
import { SaleModel } from "../../database/models/Sale.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";

export class DashboardService {
  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Medicines & Batches
    const medicines = await MedicineModel.find({ isActive: true })
      .populate("dosageFormId")
      .populate("categoryId")
      .lean();

    const batches = await BatchModel.find().lean();

    const totalMedicines = medicines.length;

    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let stockValue = 0;

    // Map batches to medicines
    const medicineBatchMap: Record<string, typeof batches> = {};
    batches.forEach((b) => {
      const medId = b.medicineId.toString();
      if (!medicineBatchMap[medId]) medicineBatchMap[medId] = [];
      medicineBatchMap[medId].push(b);
    });

    medicines.forEach((med: any) => {
      const medBatches = medicineBatchMap[med._id.toString()] || [];
      const activeBatches = medBatches.filter(
        (b) => b.status === "ACTIVE" && new Date(b.expiryDate) > now
      );

      const medicineStock = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      totalStock += medicineStock;

      if (medicineStock === 0) {
        outOfStockCount++;
      } else if (medicineStock <= med.minStockLevel) {
        lowStockCount++;
      }

      activeBatches.forEach((b) => {
        stockValue += b.quantity * b.purchasePrice;
      });
    });

    // 2. Batches expiry counts
    let expiringSoonCount = 0;
    let expiredBatchesCount = 0;
    let safeCount = 0;

    batches.forEach((batch) => {
      const exp = new Date(batch.expiryDate);
      if (exp <= now) {
        if (batch.quantity > 0) expiredBatchesCount++;
      } else if (exp <= thirtyDaysFromNow) {
        if (batch.quantity > 0) expiringSoonCount++;
      } else {
        if (batch.quantity > 0) safeCount++;
      }
    });

    // 3. Today's sales
    const todaySales = await SaleModel.find({
      createdAt: { $gte: startOfToday },
      status: "COMPLETED",
    }).lean();

    const todaysSalesTotal = todaySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    // 4. Recent Stock Movements
    const recentTransactions = await InventoryTransactionModel.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("medicineId", "name genericName")
      .populate("batchId", "batchNumber expiryDate")
      .populate("userId", "name")
      .lean();

    // 5. Category breakdown
    const categoryMap: Record<string, number> = {};
    medicines.forEach((m: any) => {
      const catName = m.dosageFormId?.name || m.categoryId?.name || "Other";
      const medBatches = medicineBatchMap[m._id.toString()] || [];
      const totalMedQty = medBatches.reduce((sum, b) => sum + b.quantity, 0);
      categoryMap[catName] = (categoryMap[catName] || 0) + totalMedQty;
    });

    const categoryData = Object.entries(categoryMap)
      .map(([name, stock]) => ({ name, stock }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 6);

    return {
      kpis: {
        totalMedicines,
        totalStock,
        lowStock: lowStockCount,
        expiringSoon: expiringSoonCount,
        expiredBatches: expiredBatchesCount,
        outOfStock: outOfStockCount,
        todaysSales: todaysSalesTotal,
        salesCount: todaySales.length,
        stockValue: Math.round(stockValue * 100) / 100,
      },
      charts: {
        expiryBreakdown: [
          { name: "Safe (>90 Days)", value: safeCount, color: "#10B981" },
          { name: "Expiring Soon (<30 Days)", value: expiringSoonCount, color: "#F59E0B" },
          { name: "Expired", value: expiredBatchesCount, color: "#EF4444" },
        ],
        categoryBreakdown: categoryData,
      },
      recentMovements: recentTransactions.map((tx: any) => ({
        id: tx._id.toString(),
        medicineName: tx.medicineId?.name || "Unknown Medicine",
        genericName: tx.medicineId?.genericName || "",
        batchNumber: tx.batchId?.batchNumber || "N/A",
        type: tx.type,
        quantityDelta: tx.quantityDelta,
        afterQuantity: tx.afterQuantity,
        reason: tx.reason,
        userName: tx.userId?.name || "System",
        createdAt: tx.createdAt,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
