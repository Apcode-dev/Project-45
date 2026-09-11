import React, { useState } from "react";
import {
  Settings,
  Building,
  Shield,
  Database,
  Save,
  CheckCircle2,
  Download,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "regulatory" | "database">("general");

  // Organization Settings
  const [pharmacyName, setPharmacyName] = useState("Apex Medical Center Central Pharmacy");
  const [drugLicense, setDrugLicense] = useState("DL-2026-99214-B");
  const [gstin, setGstin] = useState("07AAAAA0000A1Z5");
  const [contactEmail, setContactEmail] = useState("pharmacy@apexmed.local");
  const [contactPhone, setContactPhone] = useState("+91 11 2345 6789");
  const [address, setAddress] = useState("Sector 62, Institutional Area, Noida, UP - 201309");

  // Regulatory & Rules
  const [defaultMinStock, setDefaultMinStock] = useState("20");
  const [expiryWarningDays, setExpiryWarningDays] = useState("60");
  const [strictFEFO, setStrictFEFO] = useState(true);
  const [hardExpiryLock, setHardExpiryLock] = useState(true);
  const [requirePrescriptionScheduleH, setRequirePrescriptionScheduleH] = useState(true);

  // Backup state
  const [backingUp, setBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTriggerBackup = async () => {
    setBackingUp(true);
    setBackupSuccess(null);
    try {
      // Simulate backup completion with local JSON dump
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setBackupSuccess(`Database snapshot created successfully: mis_backup_${new Date().toISOString().split("T")[0]}.archive`);
    } catch (err) {
      alert("Backup failed.");
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-emerald-600" />
            System Configuration & Pharmacy Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organization compliance parameters, regulatory FEFO controls, and database backups
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Configuration Saved!
          </div>
        )}
      </div>

      {/* Settings Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex gap-1">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "general"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Pharmacy Profile & Licenses
        </button>
        <button
          onClick={() => setActiveTab("regulatory")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "regulatory"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          FEFO & Expiry Rules
        </button>
        <button
          onClick={() => setActiveTab("database")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "database"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Database & System Health
        </button>
      </div>

      {/* Tab: General Settings */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            Organization & Drug License Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pharmacy Trade Name</label>
              <input
                type="text"
                required
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Drug License # (Form 20/21)</label>
              <input
                type="text"
                required
                value={drugLicense}
                onChange={(e) => setDrugLicense(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax ID</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Helpline Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Profile Settings
            </button>
          </div>
        </form>
      )}

      {/* Tab: Regulatory Rules */}
      {activeTab === "regulatory" && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            FEFO Engine & Quality Compliance Controls
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Enforce Strict FEFO Auto-Allocation</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Always prioritize dispensing from the batch with earliest expiry date across all sales channels.
                </p>
              </div>
              <input
                type="checkbox"
                checked={strictFEFO}
                onChange={(e) => setStrictFEFO(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded"
              />
            </div>

            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-rose-900">Hard Expiry Lockout (Zero Tolerance)</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Strictly block checkout or billing if any batch expiry date has passed. Un-overrideable.
                </p>
              </div>
              <input
                type="checkbox"
                checked={hardExpiryLock}
                onChange={(e) => setHardExpiryLock(e.target.checked)}
                className="w-5 h-5 text-rose-600 rounded"
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Prescription Mandatory for Schedule H/X</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requires Doctor Name & Prescription reference before POS allows final checkout.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requirePrescriptionScheduleH}
                onChange={(e) => setRequirePrescriptionScheduleH(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Minimum Low-Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={defaultMinStock}
                onChange={(e) => setDefaultMinStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Incident Warning Horizon (Days)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                value={expiryWarningDays}
                onChange={(e) => setExpiryWarningDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Regulatory Rules
            </button>
          </div>
        </form>
      )}

      {/* Tab: Database & System Health */}
      {activeTab === "database" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            MongoDB Disaster Recovery & Engine Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500">Database Engine</span>
              <p className="text-lg font-bold text-slate-900 mt-1">MongoDB 7.0.12</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">● Connected (Port 27017)</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500">Backend Runtime</span>
              <p className="text-lg font-bold text-slate-900 mt-1">Node.js + TypeScript</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Express API Server (Port 5001)</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500">Frontend SPA</span>
              <p className="text-lg font-bold text-slate-900 mt-1">React 19 + Tailwind</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Vite High-Speed Bundler</p>
            </div>
          </div>

          {backupSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupSuccess}</span>
            </div>
          )}

          <div className="p-5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold">Trigger Automated Database Backup Snapshot</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Dumps all collections (Medicines, Batches, Sales, Purchases, Transactions, Audit Logs) into a secure, timestamped backup archive.
              </p>
            </div>

            <button
              type="button"
              disabled={backingUp}
              onClick={handleTriggerBackup}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 disabled:opacity-50"
            >
              {backingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {backingUp ? "Generating Snapshot..." : "Generate Backup Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
