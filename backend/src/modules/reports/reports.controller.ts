import { Request, Response, NextFunction } from "express";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { SaleModel } from "../../database/models/Sale.js";
import { CategoryModel } from "../../database/models/Category.js";

// 1. Inventory Valuation Report
export const getInventoryValuation = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const valuationAggregation = await BatchModel.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$quantity" },
          totalPurchaseValue: { $sum: { $multiply: ["$quantity", "$purchasePrice"] } },
          totalRetailValue: { $sum: { $multiply: ["$quantity", "$mrp"] } },
          totalBatches: { $sum: 1 },
        },
      },
    ]);

    const summary = valuationAggregation[0] || {
      totalUnits: 0,
      totalPurchaseValue: 0,
      totalRetailValue: 0,
      totalBatches: 0,
    };

    const potentialProfit = Math.max(0, summary.totalRetailValue - summary.totalPurchaseValue);
    const profitMargin =
      summary.totalPurchaseValue > 0
        ? Number(((potentialProfit / summary.totalPurchaseValue) * 100).toFixed(1))
        : 0;

    // Category-wise breakdown
    const categoryBreakdown = await BatchModel.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      {
        $lookup: {
          from: "medicines",
          localField: "medicineId",
          foreignField: "_id",
          as: "medicine",
        },
      },
      { $unwind: "$medicine" },
      {
        $lookup: {
          from: "categories",
          localField: "medicine.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: ["$category.name", 0] }, "Uncategorized"] },
          units: { $sum: "$quantity" },
          purchaseValue: { $sum: { $multiply: ["$quantity", "$purchasePrice"] } },
          retailValue: { $sum: { $multiply: ["$quantity", "$mrp"] } },
          batchCount: { $sum: 1 },
        },
      },
      { $sort: { retailValue: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          ...summary,
          potentialProfit: Number(potentialProfit.toFixed(2)),
          profitMargin,
        },
        categoryBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 2. Sales & Revenue Summary
export const getSalesSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days = "30" } = req.query;
    const daysNum = parseInt(String(days), 10) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const sales = await SaleModel.find({
      createdAt: { $gte: startDate },
      status: "COMPLETED",
    });

    const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
    const totalTax = sales.reduce((sum, s) => sum + (s.tax || 0), 0);
    const totalInvoices = sales.length;
    const avgInvoiceValue = totalInvoices > 0 ? Number((totalRevenue / totalInvoices).toFixed(2)) : 0;

    // Payment methods breakdown
    const paymentMethods: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };
    sales.forEach((s) => {
      const m = s.paymentMethod || "CASH";
      paymentMethods[m] = (paymentMethods[m] || 0) + (s.grandTotal || 0);
    });

    // Top selling medicines
    const topMedicinesAgg = await SaleModel.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.medicineId",
          totalQuantity: { $sum: "$items.quantity" },
          totalSalesAmount: { $sum: "$items.total" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "medicines",
          localField: "_id",
          foreignField: "_id",
          as: "medicine",
        },
      },
      { $unwind: "$medicine" },
      {
        $project: {
          medicineName: "$medicine.name",
          genericName: "$medicine.genericName",
          totalQuantity: 1,
          totalSalesAmount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalDiscount: Number(totalDiscount.toFixed(2)),
          totalTax: Number(totalTax.toFixed(2)),
          totalInvoices,
          avgInvoiceValue,
          daysAnalyzed: daysNum,
        },
        paymentMethods,
        topMedicines: topMedicinesAgg,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 3. Expiry Risk Timeline Analysis
export const getExpiryTimeline = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = new Date();
    const day30 = new Date();
    day30.setDate(today.getDate() + 30);
    const day60 = new Date();
    day60.setDate(today.getDate() + 60);
    const day90 = new Date();
    day90.setDate(today.getDate() + 90);
    const day180 = new Date();
    day180.setDate(today.getDate() + 180);

    const activeBatches = await BatchModel.find({ quantity: { $gt: 0 } }).populate(
      "medicineId",
      "name genericName"
    );

    const buckets = {
      expired: { count: 0, units: 0, lossValue: 0, batches: [] as any[] },
      within30Days: { count: 0, units: 0, valueAtRisk: 0, batches: [] as any[] },
      within60Days: { count: 0, units: 0, valueAtRisk: 0, batches: [] as any[] },
      within90Days: { count: 0, units: 0, valueAtRisk: 0, batches: [] as any[] },
      safeStock: { count: 0, units: 0, totalValue: 0, batches: [] as any[] },
    };

    activeBatches.forEach((b) => {
      const exp = new Date(b.expiryDate);
      const val = b.quantity * b.purchasePrice;
      const bObj = {
        _id: b._id,
        medicineName: (b.medicineId as any)?.name || "Medicine",
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
        value: Number(val.toFixed(2)),
      };

      if (exp <= today) {
        buckets.expired.count += 1;
        buckets.expired.units += b.quantity;
        buckets.expired.lossValue += val;
        buckets.expired.batches.push(bObj);
      } else if (exp <= day30) {
        buckets.within30Days.count += 1;
        buckets.within30Days.units += b.quantity;
        buckets.within30Days.valueAtRisk += val;
        buckets.within30Days.batches.push(bObj);
      } else if (exp <= day60) {
        buckets.within60Days.count += 1;
        buckets.within60Days.units += b.quantity;
        buckets.within60Days.valueAtRisk += val;
        buckets.within60Days.batches.push(bObj);
      } else if (exp <= day90) {
        buckets.within90Days.count += 1;
        buckets.within90Days.units += b.quantity;
        buckets.within90Days.valueAtRisk += val;
        buckets.within90Days.batches.push(bObj);
      } else {
        buckets.safeStock.count += 1;
        buckets.safeStock.units += b.quantity;
        buckets.safeStock.totalValue += val;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        expired: { ...buckets.expired, lossValue: Number(buckets.expired.lossValue.toFixed(2)) },
        within30Days: {
          ...buckets.within30Days,
          valueAtRisk: Number(buckets.within30Days.valueAtRisk.toFixed(2)),
        },
        within60Days: {
          ...buckets.within60Days,
          valueAtRisk: Number(buckets.within60Days.valueAtRisk.toFixed(2)),
        },
        within90Days: {
          ...buckets.within90Days,
          valueAtRisk: Number(buckets.within90Days.valueAtRisk.toFixed(2)),
        },
        safeStock: {
          ...buckets.safeStock,
          totalValue: Number(buckets.safeStock.totalValue.toFixed(2)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// 4. Slow-Moving & Dead Stock Watchlist
export const getSlowMovingStock = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Medicines with stock > 0
    const medicinesWithStock = await MedicineModel.find({
      totalStock: { $gt: 0 },
      isActive: true,
    }).populate("dosageFormId", "name");

    // Medicines sold in last 30 days
    const soldMedicineIds = await SaleModel.distinct("items.medicineId", {
      createdAt: { $gte: thirtyDaysAgo },
      status: "COMPLETED",
    });

    const soldIdSet = new Set(soldMedicineIds.map((id) => id.toString()));

    const slowMoving = medicinesWithStock
      .filter((m) => !soldIdSet.has(m._id.toString()))
      .map((m) => ({
        _id: m._id,
        name: m.name,
        genericName: m.genericName,
        dosageForm: (m.dosageFormId as any)?.name || "Unit",
        currentStock: m.totalStock,
        unitPrice: m.unitPrice || 0,
        estimatedIdleCapital: Number(((m.totalStock || 0) * (m.unitPrice || 0) * 0.7).toFixed(2)),
      }))
      .sort((a, b) => b.estimatedIdleCapital - a.estimatedIdleCapital);

    res.status(200).json({
      success: true,
      count: slowMoving.length,
      data: slowMoving,
    });
  } catch (err) {
    next(err);
  }
};

// 5. CSV Export Endpoint
export const exportReportCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type = "valuation" } = req.query;

    if (type === "valuation") {
      const batches = await BatchModel.find({ quantity: { $gt: 0 } }).populate(
        "medicineId",
        "name genericName"
      );

      let csv = "Medicine Name,Batch Number,Expiry Date,Quantity,Buy Price,MRP,Total Buy Value,Total MRP Value\n";
      batches.forEach((b) => {
        const medName = (b.medicineId as any)?.name || "Medicine";
        const totalBuy = (b.quantity * b.purchasePrice).toFixed(2);
        const totalMRP = (b.quantity * b.mrp).toFixed(2);
        csv += `"${medName}","${b.batchNumber}","${new Date(b.expiryDate).toLocaleDateString()}",${b.quantity},${b.purchasePrice},${b.mrp},${totalBuy},${totalMRP}\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=mis_inventory_valuation.csv");
      res.status(200).send(csv);
      return;
    }

    if (type === "sales") {
      const sales = await SaleModel.find({ status: "COMPLETED" }).sort({ createdAt: -1 });

      let csv = "Invoice Number,Date,Customer,Payment Method,Items Count,Subtotal,Discount,Tax,Grand Total\n";
      sales.forEach((s) => {
        csv += `"${s.invoiceNumber}","${new Date(s.createdAt).toISOString()}","${s.customerName || "Walk-in"}","${s.paymentMethod}",${s.items.length},${s.totalAmount},${s.discount},${s.tax},${s.grandTotal}\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=mis_sales_history.csv");
      res.status(200).send(csv);
      return;
    }

    res.status(400).json({ success: false, message: "Invalid report type specified" });
  } catch (err) {
    next(err);
  }
};
