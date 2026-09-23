import { Request, Response, NextFunction } from "express";
import { AlertModel } from "../../database/models/Alert.js";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { sendStockAlertToAllUsers } from "../../services/email.service.js";

// Core inventory alert auto-synchronization
export const syncInventoryAlerts = async (): Promise<{ created: number; resolved: number }> => {
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  let createdCount = 0;
  let resolvedCount = 0;

  // 1. Scan Expired Batches (expiryDate <= today && quantity > 0)
  const expiredBatches = await BatchModel.find({
    expiryDate: { $lte: today },
    quantity: { $gt: 0 },
  }).populate("medicineId");

  for (const b of expiredBatches) {
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
        title: `MEDICINE EXPIRED: ${medName} (Batch: ${b.batchNumber})`,
        message: `Batch ${b.batchNumber} expired on ${new Date(
          b.expiryDate
        ).toLocaleDateString()}. Stock: ${b.quantity} units. FEFO hard-lock applied. Quarantine batch immediately!`,
        severity: "CRITICAL",
        medicineId: b.medicineId?._id || b.medicineId,
        batchId: b._id,
        isResolved: false,
        emailSent: false,
      });
      createdCount++;
    }
  }

  // 2. Scan Expiring Soon (Expiry in <= 30 Days)
  const expiringBatches = await BatchModel.find({
    expiryDate: { $gt: today, $lte: thirtyDaysLater },
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
      await AlertModel.create({
        type: "EXPIRING_SOON",
        title: `EXPIRING SOON: ${medName} (${daysLeft} Days Left)`,
        message: `Batch ${b.batchNumber} has ${b.quantity} units expiring on ${new Date(
          b.expiryDate
        ).toLocaleDateString()} (${daysLeft} days remaining). Expedite dispensing via FEFO.`,
        severity: "WARNING",
        medicineId: b.medicineId?._id || b.medicineId,
        batchId: b._id,
        isResolved: false,
        emailSent: false,
      });
      createdCount++;
    }
  }

  // 3. Batches with quantity === 0 -> auto-clear any batch-specific alert
  const zeroBatches = await BatchModel.find({ quantity: 0 });
  const zeroBatchIds = zeroBatches.map((b) => b._id);
  if (zeroBatchIds.length > 0) {
    const res = await AlertModel.deleteMany({
      batchId: { $in: zeroBatchIds },
      type: { $in: ["EXPIRED", "EXPIRING_SOON"] },
    });
    resolvedCount += res.deletedCount || 0;
  }

  // 4. Real-time Medicine Stock Audit & Refill Auto-Resolution
  const medicines = await MedicineModel.find({ isActive: true });

  for (const med of medicines) {
    // Real-time stock from valid active non-expired batches
    const activeBatches = await BatchModel.find({
      medicineId: med._id,
      status: "ACTIVE",
      expiryDate: { $gt: today },
    });

    const actualStock = activeBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    // Sync medicine totalStock if different
    if (med.totalStock !== actualStock) {
      med.totalStock = actualStock;
      await med.save();
    }

    const minLevel = Number(med.minStockLevel) || 20;

    // Remove duplicate active LOW_STOCK alerts for the same medicine to prevent stale alert state
    const allMedAlerts = await AlertModel.find({
      medicineId: med._id,
      type: "LOW_STOCK",
      isResolved: false,
    }).sort({ createdAt: -1 });

    if (allMedAlerts.length > 1) {
      // Keep only the newest alert and delete older duplicates
      const idsToDelete = allMedAlerts.slice(1).map((a) => a._id);
      await AlertModel.deleteMany({ _id: { $in: idsToDelete } });
    }

    // CASE 1: Stock is refilled and healthy (> minStockLevel)
    if (actualStock > minLevel) {
      // Auto-remove any OUT_OF_STOCK and LOW_STOCK alert for this medicine
      const del = await AlertModel.deleteMany({
        medicineId: med._id,
        type: "LOW_STOCK",
      });
      if (del.deletedCount > 0) {
        resolvedCount += del.deletedCount;
      }
    }
    // CASE 2: Low Stock (0 < actualStock <= minLevel)
    else if (actualStock > 0 && actualStock <= minLevel) {
      const existingAlert = allMedAlerts[0] || (await AlertModel.findOne({
        medicineId: med._id,
        type: "LOW_STOCK",
        isResolved: false,
      }));

      const newTitle = `LOW STOCK ALERT: ${med.name}`;
      const newMessage = `${med.name} current stock (${actualStock} units) is at or below minimum threshold (${minLevel} units). Place reorder with supplier.`;

      if (existingAlert) {
        if (
          existingAlert.title !== newTitle ||
          existingAlert.message !== newMessage ||
          existingAlert.severity !== "WARNING"
        ) {
          existingAlert.title = newTitle;
          existingAlert.message = newMessage;
          existingAlert.severity = "WARNING";
          existingAlert.emailSent = false;
          await existingAlert.save();
        }
      } else {
        await AlertModel.create({
          type: "LOW_STOCK",
          title: newTitle,
          message: newMessage,
          severity: "WARNING",
          medicineId: med._id,
          isResolved: false,
          emailSent: false,
        });
        createdCount++;
      }
    }
    // CASE 3: Completely Depleted (actualStock === 0)
    else if (actualStock === 0) {
      const existingAlert = allMedAlerts[0] || (await AlertModel.findOne({
        medicineId: med._id,
        type: "LOW_STOCK",
        isResolved: false,
      }));

      const newTitle = `OUT OF STOCK: ${med.name}`;
      const newMessage = `${med.name} is completely depleted (0 units). Immediate purchase order required.`;

      if (existingAlert) {
        if (
          existingAlert.title !== newTitle ||
          existingAlert.message !== newMessage ||
          existingAlert.severity !== "CRITICAL"
        ) {
          existingAlert.title = newTitle;
          existingAlert.message = newMessage;
          existingAlert.severity = "CRITICAL";
          existingAlert.emailSent = false;
          await existingAlert.save();
        }
      } else {
        await AlertModel.create({
          type: "LOW_STOCK",
          title: newTitle,
          message: newMessage,
          severity: "CRITICAL",
          medicineId: med._id,
          isResolved: false,
          emailSent: false,
        });
        createdCount++;
      }
    }
  }

  // 5. Send Brevo email notifications for unsent active alerts
  try {
    const unsentAlerts = await AlertModel.find({ emailSent: { $ne: true }, isResolved: false });
    for (const alert of unsentAlerts) {
      const sent = await sendStockAlertToAllUsers({
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        type: alert.type,
      });
      if (sent) {
        alert.emailSent = true;
        await alert.save();
      }
    }
  } catch (err) {
    console.error("[AlertsController] Failed during email notification step:", err);
  }

  return { created: createdCount, resolved: resolvedCount };
};

export const getAllAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Automatically run live sync so refilled items clear their alerts in real-time
    await syncInventoryAlerts();

    const { type, severity, isResolved } = req.query;
    const filter: any = {};

    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isResolved !== undefined) {
      filter.isResolved = isResolved === "true";
    }

    const alerts = await AlertModel.find(filter)
      .populate("medicineId", "name genericName strength unit totalStock minStockLevel")
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
    const result = await syncInventoryAlerts();
    const totalActiveAlerts = await AlertModel.countDocuments({ isResolved: false });

    res.status(200).json({
      success: true,
      message: `Inventory health scan complete. Generated ${result.created} new alert(s), auto-resolved/cleared ${result.resolved} refilled alert(s).`,
      newAlertsCount: result.created,
      resolvedCount: result.resolved,
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
