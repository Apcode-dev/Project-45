import React, { useState } from "react";
import { 
  QrCode, 
  Camera, 
  Upload, 
  Keyboard, 
  Flashlight, 
  CheckCircle2, 
  Search, 
  Plus, 
  Building, 
  Pill, 
  Boxes, 
  ShoppingCart, 
  Truck, 
  AlertTriangle, 
  FileBarChart, 
  Users, 
  ShieldAlert, 
  Settings 
} from "lucide-react";

interface ModulePlaceholderProps {
  moduleId: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ moduleId }) => {
  // Interactive Scanner Wireframe Showcase for Phase 3 preview
  const [scannerCode, setScannerCode] = useState("8901234567890");
  const [detectedMedicine, setDetectedMedicine] = useState<any>({
    name: "Dolo 650",
    brand: "Dolo",
    generic: "Paracetamol",
    strength: "650 mg",
    form: "Tablet",
    manufacturer: "Micro Labs Ltd.",
    productCode: "8901234567890",
    batchNo: "DL-24B",
    mfgDate: "05/2024",
    expiryDate: "11/2027",
    mrp: 32,
    currentStock: 400,
  });

  const [qtyToAdd, setQtyToAdd] = useState("100");
  const [purchasePrice, setPurchasePrice] = useState("18.50");
  const [supplier, setSupplier] = useState("Apex Healthcare Distributors");
  const [stockAddedSuccess, setStockAddedSuccess] = useState(false);

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    setStockAddedSuccess(true);
    setTimeout(() => setStockAddedSuccess(false), 3000);
  };

  if (moduleId === "scanner") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Smart Scanner Hub
                </span>
                <span className="text-xs text-slate-500">QR &bull; Barcode &bull; GS1 DataMatrix</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Multi-Format Scanner &amp; Quick Inward</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700">
                <Flashlight className="w-3.5 h-3.5 text-amber-500" />
                <span>Flash</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700">
                <Upload className="w-3.5 h-3.5 text-sky-500" />
                <span>Upload</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700">
                <Keyboard className="w-3.5 h-3.5 text-slate-500" />
                <span>Manual</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Viewfinder simulation */}
            <div className="bg-slate-950 rounded-2xl p-6 text-white flex flex-col items-center justify-center relative min-h-[300px] border border-slate-800">
              <div className="w-48 h-48 border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-center relative">
                <div className="w-36 h-36 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-emerald-400/60 animate-pulse" />
                </div>
                <div className="absolute top-2 right-2 flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Scanning...</span>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Code Detected: {scannerCode}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Point camera at medicine barcode or pharma QR</p>
              </div>
            </div>

            {/* Scanned Medicine Details Card (Wireframe requested by user) */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  MEDICINE DETAILS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Found in Database ✓
                </span>
              </div>

              {stockAddedSuccess && (
                <div className="mb-4 p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>+100 units added to Batch DL-24B successfully! Real-time stock updated.</span>
                </div>
              )}

              <div className="text-xs space-y-1 text-slate-700 mb-4 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Medicine:</span>
                  <span className="font-bold text-slate-900">{detectedMedicine.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Generic / Active:</span>
                  <span className="font-semibold text-slate-800">{detectedMedicine.generic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Strength &amp; Form:</span>
                  <span>{detectedMedicine.strength} &bull; {detectedMedicine.form}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Manufacturer:</span>
                  <span>{detectedMedicine.manufacturer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Product Code:</span>
                  <span className="font-mono text-[11px] text-slate-600">{detectedMedicine.productCode}</span>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-xs space-y-1 mb-4">
                <div className="font-bold text-emerald-900 mb-1 flex items-center justify-between">
                  <span>BATCH: {detectedMedicine.batchNo}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Active &bull; Safe</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-500">Mfg:</span> {detectedMedicine.mfgDate}</div>
                  <div><span className="text-slate-500">Expiry:</span> <span className="font-bold text-emerald-700">{detectedMedicine.expiryDate}</span></div>
                  <div><span className="text-slate-500">MRP:</span> ₹{detectedMedicine.mrp}</div>
                  <div><span className="text-slate-500">Current Stock:</span> <span className="font-bold text-slate-900">{detectedMedicine.currentStock} units</span></div>
                </div>
              </div>

              <form onSubmit={handleAddStock} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Quantity to Add
                    </label>
                    <input
                      type="number"
                      required
                      value={qtyToAdd}
                      onChange={(e) => setQtyToAdd(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Purchase Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Supplier
                  </label>
                  <select
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Apex Healthcare Distributors">Apex Healthcare Distributors</option>
                    <option value="MedSupply Logistics Hub">MedSupply Logistics Hub</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>[ ADD STOCK ]</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const moduleMeta: Record<string, { title: string; icon: any; phase: string; desc: string }> = {
    medicines: { title: "Medicines Master", icon: Pill, phase: "PHASE 2", desc: "Catalog of Brand, Generic, Dosage Forms, Therapeutic Categories, and Barcode registrations." },
    inventory: { title: "Inventory & Batch Tracking", icon: Boxes, phase: "PHASE 4", desc: "Batch-wise stock with FEFO priority engine, expiry locking, and stock adjustments ledger." },
    purchases: { title: "Purchases & Inward Orders", icon: Truck, phase: "PHASE 5", desc: "Purchase orders, batch receiving, supplier invoices, and automated stock increment." },
    sales: { title: "Sales & Dispensing (POS)", icon: ShoppingCart, phase: "PHASE 6", desc: "Point of sale dispensing with FEFO batch allocation, Rx validation, and invoice generation." },
    suppliers: { title: "Suppliers Relationship Hub", icon: Building, phase: "PHASE 5", desc: "Supplier directory, purchase history, outstanding payment tracking, and ledger records." },
    alerts: { title: "Proactive Alerts & Notifications", icon: AlertTriangle, phase: "PHASE 7", desc: "Low stock notifications, 30/60 days expiry warnings, and expired batch quarantine." },
    reports: { title: "Reports & Business Intelligence", icon: FileBarChart, phase: "PHASE 8", desc: "Inventory valuation, expiry forecast, dead stock, fast moving items, and PDF/Excel export." },
    users: { title: "User & Role Management", icon: Users, phase: "PHASE 1 (API Ready)", desc: "RBAC management for Admin, Pharmacist, Inventory Manager, and Counter Staff." },
    audit: { title: "Audit & Security Logs", icon: ShieldAlert, phase: "PHASE 10 (Logging Active)", desc: "Complete audit trail of logins, stock changes, deletions, and user actions." },
    settings: { title: "System Settings", icon: Settings, phase: "PHASE 1 (Configured)", desc: "Dynamic categories, dosage forms, branch management, and alert threshold preferences." },
  };

  const meta = moduleMeta[moduleId] || {
    title: moduleId.toUpperCase(),
    icon: Pill,
    phase: "ACTIVE",
    desc: "Medical Inventory Management System module",
  };

  const Icon = meta.icon;

  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {meta.phase}
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-2">{meta.title}</h2>
        <p className="text-xs text-slate-500 mt-1">{meta.desc}</p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
        <div className="font-bold text-slate-800">Module Status:</div>
        <div className="flex items-center space-x-2 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Backend Prisma Schema &amp; Database tables created and seeded.</span>
        </div>
        <p className="text-slate-600 text-[11px]">
          The core architecture is wired with FEFO enforcement, RBAC protection, and live database connectivity.
        </p>
      </div>
    </div>
  );
};
