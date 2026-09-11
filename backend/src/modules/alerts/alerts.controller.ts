import { Request, Response, NextFunction } from "express";
import { AlertModel } from "../../database/models/Alert.js";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";

export const getAllAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, severity, isResolved } = req.query;
    const filter: any = {};

    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isResolved !== undefined) {
      filter.isResolved = isResolved === "true";
    }

    const alerts = await AlertModel.find(filter)
      .populate("medicineId", "name genericName sku totalStock minStockLevel")
      .populate("batchId", "batchNumber expiryDate quantity status")
      .sort({ isResolved: 1, createdAt: -1 });

    const counts = {
      total: alerts.length,
      unresolved: alerts.filter((a) => !a.isResolved).length,
      critical: alerts.filter((a) => !a.isResolved && a.severity === "CRITICAL").length,
      warning: alerts.filter((a) => !a.isResolved && a.severity === "WARNING").length,
      lowStock: alerts.filter((a) => !a.isResolved && a.type === "LOW_STOCK").length,
      expired: alerts.filter((a) => !a.isResolved && a.type === "EXPIRED").length,
      expiringSoon: alerts.filter((a) => !a.isResolved && a.type === "EXPIRING_SOON").length,
    };

    res.status(200).json({ success: true, counts, data: alerts });
  } catch (err) {
    next(err);
  }
};

export const scanInventoryForAlerts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = new Date();
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(today.getDate() + 60);

    let createdCount = 0;

    // 1. Scan Expired Batches
    const expiredBatches = await BatchModel.find({
      expiryDate: { $lte: today },
      quantity: { $gt: 0 },
    }).populate("medicineId");

    for (const b of expiredBatches) {
      // Auto hard-lock batch status
      if (b.status !== "EXPIRED") {
        b.status = "EXPIRED";
        await b.save();
      }

      const existing = await AlertModel.findOne({
        batchId: b._id,
        type: "EXPIRED",
        isResolved: false,
      });

      if (!existing) {
        const medName = (b.medicineId as any)?.name || "Medicine";
        await AlertModel.create({
          type: "EXPIRED",
          title: `EXPIRED BATCH: ${medName} (Batch: ${b.batchNumber})`,
          message: `Batch ${b.batchNumber} expired on ${new Date(
            b.expiryDate
          ).toLocaleDateString()}. Stock: ${b.quantity} units. FEFO hard-lock applied. Quarantine batch immediately!`,
          severity: "CRITICAL",
          medicineId: b.medicineId?._id || b.medicineId,
          batchId: b._id,
          isResolved: false,
        });
        createdCount++;
      }
    }

    // 2. Scan Expiring Soon (Next 60 days)
    const expiringBatches = await BatchModel.find({
      expiryDate: { $gt: today, $lte: sixtyDaysLater },
      quantity: { $gt: 0 },
      status: "ACTIVE",
    }).populate("medicineId");

    for (const b of expiringBatches) {
      const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const existing = await AlertModel.findOne({
        batchId: b._id,
        type: "EXPIRING_SOON",
        isResolved: false,
      });

      if (!existing) {
        const medName = (b.medicineId as any)?.name || "Medicine";
        const severity = daysLeft <= 30 ? "CRITICAL" : "WARNING";

        await AlertModel.create({
          type: "EXPIRING_SOON",
          title: `EXPIRING SOON: ${medName} (${daysLeft} Days Left)`,
          message: `Batch ${b.batchNumber} has ${b.quantity} units expiring on ${new Date(
            b.expiryDate
          ).toLocaleDateString()} (${daysLeft} days remaining). Expedite dispensing via FEFO.`,
          severity,
          medicineId: b.medicineId?._id || b.medicineId,
          batchId: b._id,
          isResolved: false,
        });
        createdCount++;
      }
    }

    // 3. Scan Low Stock & Out of Stock Medicines
    const medicines = await MedicineModel.find({ isActive: true });

    for (const med of medicines) {
      const stock = Number(med.totalStock) || 0;
      const minLevel = Number(med.minStockLevel) || 20;

      if (stock <= minLevel) {
        const existing = await AlertModel.findOne({
          medicineId: med._id,
          type: "LOW_STOCK",
          isResolved: false,
        });

        if (!existing) {
          const isZero = stock === 0;
          await AlertModel.create({
            type: "LOW_STOCK",
            title: isZero ? `OUT OF STOCK: ${med.name}` : `LOW STOCK ALERT: ${med.name}`,
            message: isZero
              ? `${med.name} is completely depleted (0 units). Immediate purchase order required.`
              : `${med.name} current stock (${stock} units) is at or below minimum threshold (${minLevel} units). Place reorder with supplier.`,
            severity: isZero ? "CRITICAL" : "WARNING",
            medicineId: med._id,
            isResolved: false,
          });
          createdCount++;
        }
      }
    }

    // Return scan results
    const totalActiveAlerts = await AlertModel.countDocuments({ isResolved: false });

    res.status(200).json({
      success: true,
      message: `Inventory health scan complete. Generated ${createdCount} new alerts.`,
      newAlertsCount: createdCount,
      totalActiveAlerts,
    });
  } catch (err) {
    next(err);
  }
};

export const resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const alert = await AlertModel.findById(req.params.id);
    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    alert.isResolved = true;
    await alert.save();

    res.status(200).json({ success: true, message: "Alert resolved successfully", data: alert });
  } catch (err) {
    next(err);
  }
};

export const resolveAllAlerts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AlertModel.updateMany({ isResolved: false }, { $set: { isResolved: true } });
    res.status(200).json({ success: true, message: "All active alerts marked as resolved" });
  } catch (err) {
    next(err);
  }
};
