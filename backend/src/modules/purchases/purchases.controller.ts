import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { PurchaseOrderModel, IPurchaseItem } from "../../database/models/PurchaseOrder.js";
import { BatchModel } from "../../database/models/Batch.js";
import { MedicineModel } from "../../database/models/Medicine.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { SupplierModel } from "../../database/models/Supplier.js";

// Helper function to process stock inward for items
async function processStockInward(items: IPurchaseItem[], poNumber: string, userId?: string) {
  for (const item of items) {
    const med = await MedicineModel.findById(item.medicineId);
    if (!med) continue;

    const beforeStock = med.totalStock || 0;
    const addedQty = Number(item.quantity);

    // Find or create batch
    let batch = await BatchModel.findOne({
      medicineId: item.medicineId,
      batchNumber: item.batchNumber.trim(),
    });

    if (batch) {
      batch.quantity += addedQty;
      batch.purchasePrice = item.purchasePrice;
      batch.mrp = item.sellingPrice;
      batch.expiryDate = new Date(item.expiryDate);
      if (item.manufacturingDate) batch.manufacturingDate = new Date(item.manufacturingDate);
      batch.status = "ACTIVE";
      await batch.save();
    } else {
      batch = await BatchModel.create({
        medicineId: item.medicineId,
        batchNumber: item.batchNumber.trim(),
        expiryDate: new Date(item.expiryDate),
        manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : new Date(),
        quantity: addedQty,
        initialQuantity: addedQty,
        purchasePrice: item.purchasePrice,
        mrp: item.sellingPrice,
        status: "ACTIVE",
      });
    }

    // Update medicine total stock
    med.totalStock = beforeStock + addedQty;
    await med.save();

    // Log immutable InventoryTransaction
    await InventoryTransactionModel.create({
      medicineId: item.medicineId,
      batchId: batch._id,
      type: "PURCHASE",
      quantityDelta: addedQty,
      beforeQuantity: beforeStock,
      afterQuantity: med.totalStock,
      reason: `Purchase Inward [PO: ${poNumber}]`,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      notes: `Batch ${item.batchNumber}, Buy: ₹${item.purchasePrice}, MRP: ₹${item.sellingPrice}`,
    });
  }
}

export const getAllPurchases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, search, supplierId } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { poNumber: { $regex: q, $options: "i" } },
        { invoiceNumber: { $regex: q, $options: "i" } },
      ];
    }

    const orders = await PurchaseOrderModel.find(filter)
      .populate("supplierId", "name contactPerson phone email")
      .populate("items.medicineId", "name genericName sku unit")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

export const getPurchaseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await PurchaseOrderModel.findById(req.params.id)
      .populate("supplierId")
      .populate("items.medicineId")
      .populate("createdById", "name email");

    if (!order) {
      res.status(404).json({ success: false, message: "Purchase order not found" });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const createPurchase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      supplierId,
      invoiceNumber,
      orderDate,
      items,
      tax = 0,
      shipping = 0,
      discount = 0,
      notes,
      status = "ORDERED",
      paymentStatus = "PENDING",
    } = req.body;

    if (!supplierId) {
      res.status(400).json({ success: false, message: "Supplier is required" });
      return;
    }

    const supplier = await SupplierModel.findById(supplierId);
    if (!supplier) {
      res.status(404).json({ success: false, message: "Supplier not found" });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "At least one purchase item is required" });
      return;
    }

    // Validate and calculate item totals
    let subtotal = 0;
    const formattedItems: IPurchaseItem[] = [];

    for (const it of items) {
      if (!it.medicineId || !it.batchNumber || !it.expiryDate || !it.quantity || it.quantity <= 0) {
        res.status(400).json({
          success: false,
          message: "Each item must have medicineId, batchNumber, expiryDate, and positive quantity",
        });
        return;
      }

      const q = Number(it.quantity);
      const buyPrice = Number(it.purchasePrice || 0);
      const sellPrice = Number(it.sellingPrice || buyPrice * 1.3);
      const itemTotal = Number((q * buyPrice).toFixed(2));

      subtotal += itemTotal;

      formattedItems.push({
        medicineId: new Types.ObjectId(it.medicineId),
        batchNumber: String(it.batchNumber).trim().toUpperCase(),
        expiryDate: new Date(it.expiryDate),
        manufacturingDate: it.manufacturingDate ? new Date(it.manufacturingDate) : undefined,
        quantity: q,
        purchasePrice: buyPrice,
        sellingPrice: sellPrice,
        total: itemTotal,
      });
    }

    const taxAmount = Number(tax) || 0;
    const shippingAmount = Number(shipping) || 0;
    const discountAmount = Number(discount) || 0;
    const grandTotal = Number((subtotal + taxAmount + shippingAmount - discountAmount).toFixed(2));

    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPO = await PurchaseOrderModel.create({
      poNumber,
      supplierId: new Types.ObjectId(supplierId),
      invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : undefined,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      items: formattedItems,
      subtotal,
      tax: taxAmount,
      shipping: shippingAmount,
      discount: discountAmount,
      grandTotal,
      status,
      paymentStatus,
      notes: notes ? String(notes).trim() : undefined,
      createdById: (req as any).user?._id,
      receivedDate: status === "RECEIVED" ? new Date() : undefined,
    });

    // If created directly in RECEIVED status, process stock inward
    if (status === "RECEIVED") {
      await processStockInward(formattedItems, poNumber, (req as any).user?._id?.toString());
    }

    const populated = await PurchaseOrderModel.findById(newPO._id)
      .populate("supplierId", "name contactPerson phone email")
      .populate("items.medicineId", "name genericName sku unit");

    res.status(201).json({
      success: true,
      message: status === "RECEIVED" ? "Purchase received and stock inwarded successfully" : "Purchase order created",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const receivePurchase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await PurchaseOrderModel.findById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Purchase order not found" });
      return;
    }

    if (order.status === "RECEIVED") {
      res.status(400).json({ success: false, message: "This purchase order has already been received" });
      return;
    }

    if (order.status === "CANCELLED") {
      res.status(400).json({ success: false, message: "Cannot receive a cancelled purchase order" });
      return;
    }

    // Inward stock for all items
    await processStockInward(order.items, order.poNumber, (req as any).user?._id?.toString());

    order.status = "RECEIVED";
    order.receivedDate = new Date();
    await order.save();

    const populated = await PurchaseOrderModel.findById(order._id)
      .populate("supplierId", "name contactPerson phone email")
      .populate("items.medicineId", "name genericName sku unit");

    res.status(200).json({
      success: true,
      message: "Purchase order received and inventory stock updated",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelPurchase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await PurchaseOrderModel.findById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Purchase order not found" });
      return;
    }

    if (order.status === "RECEIVED") {
      res.status(400).json({
        success: false,
        message: "Cannot cancel an order that has already been received into stock",
      });
      return;
    }

    order.status = "CANCELLED";
    await order.save();

    res.status(200).json({ success: true, message: "Purchase order cancelled", data: order });
  } catch (err) {
    next(err);
  }
};
