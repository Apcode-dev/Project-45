import { Request, Response, NextFunction } from "express";
import { SupplierModel } from "../../database/models/Supplier.js";
import { PurchaseOrderModel } from "../../database/models/PurchaseOrder.js";

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, status } = req.query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { contactPerson: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { gstin: { $regex: q, $options: "i" } },
      ];
    }

    const suppliers = await SupplierModel.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (err) {
    next(err);
  }
};

export const getSupplierById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplier = await SupplierModel.findById(req.params.id);
    if (!supplier) {
      res.status(404).json({ success: false, message: "Supplier not found" });
      return;
    }

    const orderStats = await PurchaseOrderModel.aggregate([
      { $match: { supplierId: supplier._id } },
      {
        $group: {
          _id: "$supplierId",
          totalOrders: { $sum: 1 },
          totalPurchasedAmount: { $sum: "$grandTotal" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...supplier.toObject(),
        stats: orderStats[0] || { totalOrders: 0, totalPurchasedAmount: 0 },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, contactPerson, email, phone, address, gstin, status } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Supplier name is required" });
      return;
    }

    const existing = await SupplierModel.findOne({ name: name.trim() });
    if (existing) {
      res.status(409).json({ success: false, message: "A supplier with this name already exists" });
      return;
    }

    const supplier = await SupplierModel.create({
      name: name.trim(),
      contactPerson: contactPerson?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      gstin: gstin?.trim(),
      status: status || "ACTIVE",
    });

    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, contactPerson, email, phone, address, gstin, status } = req.body;

    const supplier = await SupplierModel.findById(id);
    if (!supplier) {
      res.status(404).json({ success: false, message: "Supplier not found" });
      return;
    }

    if (name && name.trim() !== supplier.name) {
      const duplicate = await SupplierModel.findOne({ name: name.trim() });
      if (duplicate) {
        res.status(409).json({ success: false, message: "Supplier with this name already exists" });
        return;
      }
      supplier.name = name.trim();
    }

    if (contactPerson !== undefined) supplier.contactPerson = contactPerson?.trim();
    if (email !== undefined) supplier.email = email?.trim();
    if (phone !== undefined) supplier.phone = phone?.trim();
    if (address !== undefined) supplier.address = address?.trim();
    if (gstin !== undefined) supplier.gstin = gstin?.trim();
    if (status !== undefined) supplier.status = status;

    await supplier.save();
    res.status(200).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await SupplierModel.findById(id);
    if (!supplier) {
      res.status(404).json({ success: false, message: "Supplier not found" });
      return;
    }

    supplier.status = "INACTIVE";
    await supplier.save();

    res.status(200).json({ success: true, message: "Supplier deactivated successfully", data: supplier });
  } catch (err) {
    next(err);
  }
};
