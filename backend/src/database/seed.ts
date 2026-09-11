import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ENV } from "../config/environment.js";
import {
  UserModel,
  CategoryModel,
  DosageFormModel,
  ManufacturerModel,
  MedicineModel,
  MedicineCodeModel,
  BatchModel,
  SupplierModel,
  BranchModel,
  InventoryTransactionModel,
  SaleModel,
} from "./models/index.js";

async function seed() {
  console.log("[Seeder] Connecting to MongoDB at", ENV.MONGODB_URI);
  await mongoose.connect(ENV.MONGODB_URI);

  console.log("[Seeder] Clearing previous collections...");
  await Promise.all([
    UserModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    DosageFormModel.deleteMany({}),
    ManufacturerModel.deleteMany({}),
    MedicineModel.deleteMany({}),
    MedicineCodeModel.deleteMany({}),
    BatchModel.deleteMany({}),
    SupplierModel.deleteMany({}),
    BranchModel.deleteMany({}),
    InventoryTransactionModel.deleteMany({}),
    SaleModel.deleteMany({}),
  ]);

  // 1. Users
  console.log("[Seeder] Creating Users with hashed passwords...");
  const adminHash = await bcrypt.hash("Admin@12345", 10);
  const pharmaHash = await bcrypt.hash("Pharma@12345", 10);
  const stockHash = await bcrypt.hash("Stock@12345", 10);
  const staffHash = await bcrypt.hash("Staff@12345", 10);

  const admin = await UserModel.create({
    email: "admin@mis.local",
    passwordHash: adminHash,
    name: "Dr. Rajesh Sharma (Admin)",
    phone: "+91 9876543210",
    role: "ADMIN",
    permissions: ["*"],
    status: "ACTIVE",
  });

  const pharmacist = await UserModel.create({
    email: "pharmacist@mis.local",
    passwordHash: pharmaHash,
    name: "Anjali Patel (Pharmacist)",
    phone: "+91 9876543211",
    role: "PHARMACIST",
    permissions: ["medicines:read", "medicines:write", "sales:write", "batches:read"],
    status: "ACTIVE",
  });

  const inventoryMgr = await UserModel.create({
    email: "inventory@mis.local",
    passwordHash: stockHash,
    name: "Vikram Malhotra (Inventory Mgr)",
    phone: "+91 9876543212",
    role: "INVENTORY_MANAGER",
    permissions: ["medicines:read", "inventory:write", "batches:write", "purchases:write"],
    status: "ACTIVE",
  });

  const staff = await UserModel.create({
    email: "staff@mis.local",
    passwordHash: staffHash,
    name: "Rahul Verma (Counter Staff)",
    phone: "+91 9876543213",
    role: "STAFF",
    permissions: ["medicines:read", "sales:write", "scanner:read"],
    status: "ACTIVE",
  });

  // 2. Dosage Forms
  console.log("[Seeder] Creating Dosage Forms...");
  const dosageFormsList = [
    "Tablets", "Capsules", "Syrups", "Suspensions", "Injections",
    "IV Fluids", "Creams", "Ointments", "Gels", "Lotions",
    "Eye Drops", "Ear Drops", "Nasal Drops", "Inhalers", "Powders",
    "Sachets", "Sprays", "Suppositories", "Patches", "Solutions",
    "Surgical / Medical Supplies", "Other"
  ];

  const formMap: Record<string, any> = {};
  for (const name of dosageFormsList) {
    const doc = await DosageFormModel.create({ name });
    formMap[name] = doc._id;
  }

  // 3. Therapeutic Categories
  console.log("[Seeder] Creating Therapeutic Categories...");
  const therapeuticList = [
    "Analgesic / Pain Relief", "Antibiotic", "Antiviral", "Antifungal",
    "Antacid", "Antihistamine", "Antidiabetic", "Antihypertensive",
    "Cardiovascular", "Respiratory", "Gastrointestinal", "Neurological",
    "Dermatological", "Vitamins & Minerals", "Ophthalmic", "ENT", "Other"
  ];

  const catMap: Record<string, any> = {};
  for (const name of therapeuticList) {
    const doc = await CategoryModel.create({ name, type: "THERAPEUTIC" });
    catMap[name] = doc._id;
  }

  // 4. Manufacturers
  console.log("[Seeder] Creating Manufacturers...");
  const manufacturersList = [
    { name: "Micro Labs Ltd.", country: "India" },
    { name: "Cipla Ltd.", country: "India" },
    { name: "Dr. Reddy's Laboratories", country: "India" },
    { name: "Sun Pharmaceutical Industries", country: "India" },
    { name: "Abbott India Ltd.", country: "USA / India" },
  ];

  const mfgMap: Record<string, any> = {};
  for (const m of manufacturersList) {
    const doc = await ManufacturerModel.create(m);
    mfgMap[m.name] = doc._id;
  }

  // 5. Suppliers
  console.log("[Seeder] Creating Suppliers...");
  const suppliersList = [
    { name: "Apex Healthcare Distributors", contactPerson: "Suresh Gupta", phone: "9820012345", email: "orders@apexhealth.com" },
    { name: "MedSupply Logistics Hub", contactPerson: "Rohan Kapoor", phone: "9820054321", email: "supply@medsupply.com" },
  ];

  const suppMap: Record<string, any> = {};
  for (const s of suppliersList) {
    const doc = await SupplierModel.create(s);
    suppMap[s.name] = doc._id;
  }

  // 6. Branch
  console.log("[Seeder] Creating Main Branch...");
  await BranchModel.create({
    name: "Central Hospital Pharmacy - Main Branch",
    code: "MAIN-01",
    address: "Ground Floor, Med Tower, Sector 14",
    phone: "011-2983746",
    isMain: true,
  });

  // 7. Seed Sample Medicines with Multi-Batches & Barcodes
  console.log("[Seeder] Creating Sample Medicines, Batches & Codes...");
  const now = new Date();

  // Medicine 1: Dolo 650 (Analgesic)
  const dolo = await MedicineModel.create({
    name: "Dolo 650",
    brandName: "Dolo",
    genericName: "Paracetamol",
    strength: "650 mg",
    dosageFormId: formMap["Tablets"],
    therapeuticCategoryId: catMap["Analgesic / Pain Relief"],
    manufacturerId: mfgMap["Micro Labs Ltd."],
    composition: "Paracetamol IP 650mg",
    prescriptionRequired: false,
    minStockLevel: 50,
    maxStockLevel: 1000,
    unit: "Strip (15 tabs)",
    isActive: true,
  });

  await MedicineCodeModel.create([
    { medicineId: dolo._id, codeType: "BARCODE", codeValue: "8901234567890", isPrimary: true },
    { medicineId: dolo._id, codeType: "QR", codeValue: "QR-DOLO-650", isPrimary: false },
  ]);

  const batchDoloA = await BatchModel.create({
    medicineId: dolo._id,
    batchNumber: "DL-24A",
    manufacturingDate: new Date("2024-01-10"),
    expiryDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // Expiring in 20 days!
    quantity: 35,
    initialQuantity: 100,
    purchasePrice: 18.5,
    mrp: 32.0,
    supplierId: suppMap["Apex Healthcare Distributors"],
    status: "ACTIVE",
  });

  const batchDoloB = await BatchModel.create({
    medicineId: dolo._id,
    batchNumber: "DL-24B",
    manufacturingDate: new Date("2024-05-15"),
    expiryDate: new Date(now.getTime() + 450 * 24 * 60 * 60 * 1000), // Safe
    quantity: 400,
    initialQuantity: 500,
    purchasePrice: 18.5,
    mrp: 32.0,
    supplierId: suppMap["Apex Healthcare Distributors"],
    status: "ACTIVE",
  });

  // Medicine 2: Novamox 500 (Antibiotic)
  const amox = await MedicineModel.create({
    name: "Novamox 500",
    brandName: "Novamox",
    genericName: "Amoxicillin",
    strength: "500 mg",
    dosageFormId: formMap["Capsules"],
    therapeuticCategoryId: catMap["Antibiotic"],
    manufacturerId: mfgMap["Cipla Ltd."],
    composition: "Amoxicillin Trihydrate IP eq to Amoxicillin 500mg",
    prescriptionRequired: true,
    minStockLevel: 30,
    maxStockLevel: 500,
    unit: "Strip (10 caps)",
    isActive: true,
  });

  await MedicineCodeModel.create({
    medicineId: amox._id,
    codeType: "BARCODE",
    codeValue: "8902345678901",
    isPrimary: true,
  });

  const batchAmox = await BatchModel.create({
    medicineId: amox._id,
    batchNumber: "NM-901",
    manufacturingDate: new Date("2024-03-01"),
    expiryDate: new Date(now.getTime() + 380 * 24 * 60 * 60 * 1000),
    quantity: 120,
    initialQuantity: 200,
    purchasePrice: 52.0,
    mrp: 85.0,
    supplierId: suppMap["MedSupply Logistics Hub"],
    status: "ACTIVE",
  });

  // Medicine 3: Azithral 500 (Expired Batch Sample)
  const azith = await MedicineModel.create({
    name: "Azithral 500",
    brandName: "Azithral",
    genericName: "Azithromycin",
    strength: "500 mg",
    dosageFormId: formMap["Tablets"],
    therapeuticCategoryId: catMap["Antibiotic"],
    manufacturerId: mfgMap["Sun Pharmaceutical Industries"],
    composition: "Azithromycin 500mg",
    prescriptionRequired: true,
    minStockLevel: 25,
    maxStockLevel: 400,
    unit: "Strip (5 tabs)",
    isActive: true,
  });

  await MedicineCodeModel.create({
    medicineId: azith._id,
    codeType: "BARCODE",
    codeValue: "8903456789012",
    isPrimary: true,
  });

  await BatchModel.create({
    medicineId: azith._id,
    batchNumber: "AZ-EXP-11",
    manufacturingDate: new Date("2022-06-01"),
    expiryDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // EXPIRED 15 days ago!
    quantity: 20,
    initialQuantity: 100,
    purchasePrice: 70.0,
    mrp: 125.0,
    status: "EXPIRED",
  });

  // Medicine 4: Glycomet 500 (Low Stock Sample)
  const met = await MedicineModel.create({
    name: "Glycomet 500",
    brandName: "Glycomet",
    genericName: "Metformin Hydrochloride",
    strength: "500 mg",
    dosageFormId: formMap["Tablets"],
    therapeuticCategoryId: catMap["Antidiabetic"],
    manufacturerId: mfgMap["Dr. Reddy's Laboratories"],
    composition: "Metformin 500mg Extended Release",
    prescriptionRequired: true,
    minStockLevel: 60, // Min is 60, but only 12 in stock
    maxStockLevel: 800,
    unit: "Strip (20 tabs)",
    isActive: true,
  });

  await MedicineCodeModel.create({
    medicineId: met._id,
    codeType: "BARCODE",
    codeValue: "8904567890123",
    isPrimary: true,
  });

  const batchMet = await BatchModel.create({
    medicineId: met._id,
    batchNumber: "GL-104",
    manufacturingDate: new Date("2024-02-01"),
    expiryDate: new Date(now.getTime() + 600 * 24 * 60 * 60 * 1000),
    quantity: 12,
    initialQuantity: 150,
    purchasePrice: 22.0,
    mrp: 42.0,
    status: "ACTIVE",
  });

  // Medicine 5: Ascoril D Plus (Expiring in 18 days)
  const cough = await MedicineModel.create({
    name: "Ascoril D Plus",
    brandName: "Ascoril",
    genericName: "Dextromethorphan + Chlorpheniramine",
    strength: "100 ml",
    dosageFormId: formMap["Syrups"],
    therapeuticCategoryId: catMap["Respiratory"],
    manufacturerId: mfgMap["Dr. Reddy's Laboratories"],
    composition: "Dextromethorphan HBr 10mg, CPM 2mg per 5ml",
    prescriptionRequired: false,
    minStockLevel: 20,
    maxStockLevel: 200,
    unit: "Bottle (100ml)",
    isActive: true,
  });

  await MedicineCodeModel.create({
    medicineId: cough._id,
    codeType: "BARCODE",
    codeValue: "8907890123456",
    isPrimary: true,
  });

  await BatchModel.create({
    medicineId: cough._id,
    batchNumber: "AS-33",
    manufacturingDate: new Date("2023-11-01"),
    expiryDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000), // 18 days left!
    quantity: 28,
    initialQuantity: 60,
    purchasePrice: 65.0,
    mrp: 120.0,
    status: "ACTIVE",
  });

  // Medicine 6: Normal Saline 0.9%
  const saline = await MedicineModel.create({
    name: "Normal Saline 0.9%",
    brandName: "NS Bottle",
    genericName: "Sodium Chloride IV Infusion",
    strength: "500 ml",
    dosageFormId: formMap["IV Fluids"],
    therapeuticCategoryId: catMap["Other"],
    manufacturerId: mfgMap["Cipla Ltd."],
    composition: "Sodium Chloride IP 0.9% w/v",
    prescriptionRequired: true,
    minStockLevel: 40,
    maxStockLevel: 500,
    unit: "Infusion Bottle (500ml)",
    isActive: true,
  });

  await MedicineCodeModel.create({
    medicineId: saline._id,
    codeType: "BARCODE",
    codeValue: "8908901234567",
    isPrimary: true,
  });

  await BatchModel.create({
    medicineId: saline._id,
    batchNumber: "NS-708",
    manufacturingDate: new Date("2024-04-01"),
    expiryDate: new Date(now.getTime() + 720 * 24 * 60 * 60 * 1000),
    quantity: 85,
    initialQuantity: 150,
    purchasePrice: 30.0,
    mrp: 55.0,
    status: "ACTIVE",
  });

  // 8. Inventory Transactions
  console.log("[Seeder] Creating Inventory Movement records...");
  await InventoryTransactionModel.create([
    {
      medicineId: dolo._id,
      batchId: batchDoloB._id,
      type: "PURCHASE",
      quantityDelta: 400,
      beforeQuantity: 35,
      afterQuantity: 435,
      reason: "PO-2026-081 Inward Stock Received from Apex Healthcare Distributors",
      userId: admin._id,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      medicineId: amox._id,
      batchId: batchAmox._id,
      type: "SALE",
      quantityDelta: -2,
      beforeQuantity: 122,
      afterQuantity: 120,
      reason: "Dispensed on Prescription Rx #98231",
      userId: staff._id,
      createdAt: new Date(now.getTime() - 45 * 60 * 1000),
    },
    {
      medicineId: met._id,
      batchId: batchMet._id,
      type: "ADJUSTMENT_OUT",
      quantityDelta: -3,
      beforeQuantity: 15,
      afterQuantity: 12,
      reason: "Strip packaging damaged during shelf relocation",
      userId: inventoryMgr._id,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
  ]);

  // 9. Sample Today Sale
  console.log("[Seeder] Creating Sample Today Sale...");
  await SaleModel.create({
    invoiceNumber: "INV-2026-00101",
    customerName: "Ramesh Sharma",
    customerPhone: "+91 9988776655",
    doctorName: "Dr. A. K. Banerjee",
    prescriptionNumber: "RX-2026-89",
    items: [
      {
        medicineId: amox._id,
        batchId: batchAmox._id,
        quantity: 2,
        unitPrice: 85.0,
        total: 170.0,
      },
    ],
    totalAmount: 170.0,
    discount: 10.0,
    tax: 8.0,
    grandTotal: 168.0,
    paymentMethod: "UPI",
    status: "COMPLETED",
    createdBy: staff.name,
    createdAt: new Date(),
  });

  console.log("[Seeder] MongoDB Database seeded successfully with production MERN models!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[Seeder] Error during seed:", err);
  process.exit(1);
});
