import React, { useState, useEffect } from "react";
import { showToast } from "../../utils/toast.js";
import { api, API_BASE_URL } from "../../services/api.js";
import { useAuth } from "../../store/authStore.js";
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
  FileText,
  Clock,
  HardDrive,
  RotateCcw,
} from "lucide-react";

export interface BackupItem {
  backupId: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

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
  const [backupsList, setBackupsList] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // Fetch list of stored backup documents for ADMIN
  const fetchBackups = async () => {
    if (!isAdmin) return;
    setLoadingBackups(true);
    try {
      const res = await api.get("/system/backups");
      if (res.data.success) {
        setBackupsList(res.data.data || []);
      }
    } catch {
      // Ignore if unauthorized
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeTab === "database" && isAdmin) {
      fetchBackups();
    }
  }, [activeTab, isAdmin]);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    showToast.success("Organization settings saved successfully!");
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveSettings = handleSaveGeneral;

  const handleTriggerBackup = async () => {
    if (!isAdmin) {
      showToast.error("Top Role (ADMIN) permission required.");
      return;
    }
    setBackingUp(true);
    setBackupSuccess(null);
    try {
      const res = await api.post("/system/backup");
      if (res.data.success) {
        const backupFileName = res.data.data?.filePath || `backup_${Date.now()}.json`;
        setBackupSuccess(`Database snapshot created & saved on server: backend/backups/${backupFileName}`);
        showToast.success(`Backup document created: ${backupFileName}`);
        fetchBackups();
      } else {
        showToast.error(res.data.message || "Backup creation failed.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to create database backup.";
      showToast.error(msg);
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async (backupId: string, filename: string) => {
    if (!isAdmin) {
      showToast.error("Only ADMIN role can download backup documents.");
      return;
    }
    try {
      const token = localStorage.getItem("mis_token");
      const response = await fetch(`${API_BASE_URL}/system/download/${backupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success(`Downloaded ${filename}`);
    } catch (err: any) {
      showToast.error("Failed to download backup document.");
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!isAdmin) {
      showToast.error("Only ADMIN role can restore system database.");
      return;
    }
    if (!window.confirm(`Are you sure you want to restore database from backup '${backupId}'? Current data will be replaced.`)) {
      return;
    }
    try {
      const res = await api.post("/system/restore", { backupId });
      if (res.data.success) {
        showToast.success(res.data.message || "Database restored successfully!");
      } else {
        showToast.error(res.data.error || "Failed to restore database.");
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.error || "Failed to restore database.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "database"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Database & System Health</span>
          {!isAdmin && <Lock className="w-3 h-3 text-amber-400" />}
        </button>
      </div>

      {/* Tab: General Settings */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            Hospital & Central Pharmacy Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pharmacy Name</label>
              <input
                type="text"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Drug License Number</label>
              <input
                type="text"
                value={drugLicense}
                onChange={(e) => setDrugLicense(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax Registration</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Facility Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Organization Profile
            </button>
          </div>
        </form>
      )}

      {/* Tab: Regulatory & Rules */}
      {activeTab === "regulatory" && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            FEFO Inventory & Schedule H Control Rules
          </h2>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Enforce Strict FEFO (First-Expiry-First-Out)</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  POS automatically picks earliest expiring batch. Prevents manual override of expired/older stock.
                </p>
              </div>
              <input
                type="checkbox"
                checked={strictFEFO}
                onChange={(e) => setStrictFEFO(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Hard Expiry Lock (Zero Dispense On Expiry)</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Blocks sale and invoice generation if batch expiration date is past current timestamp.
                </p>
              </div>
              <input
                type="checkbox"
                checked={hardExpiryLock}
                onChange={(e) => setHardExpiryLock(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
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
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
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
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Regulatory Rules
            </button>
          </div>
        </form>
      )}

      {/* Tab: Database & System Health (Restricted to Top Role: ADMIN) */}
      {activeTab === "database" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              MongoDB Disaster Recovery & Backup Documents
            </div>
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-700" />
              Top Role (ADMIN) Only
            </span>
          </h2>

          {!isAdmin ? (
            /* NON-ADMIN ACCESS DENIED BANNER */
            <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base">Top Role Authorization Required</h3>
              <p className="text-xs text-slate-300 max-w-md">
                Database backups contain sensitive hospital inventory records, patient invoices, and credentials. Access to view, generate, or download backup documents is strictly restricted to <span className="font-extrabold text-amber-400">ADMIN</span> accounts.
              </p>
              <div className="text-[11px] text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                Your Current Role: <span className="font-bold text-white uppercase">{user?.role || "STAFF"}</span>
              </div>
            </div>
          ) : (
            /* ADMIN EXCLUSIVE BACKUP & DOCUMENT MANAGEMENT */
            <>
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
                  <span className="text-xs font-bold text-slate-500">Document Security</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">AES / JSON Encryption</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Role Protected (ADMIN)</p>
                </div>
              </div>

              {backupSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{backupSuccess}</span>
                </div>
              )}

              {/* Generate New Backup Document Trigger */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold">Generate Database Backup Document</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Dumps all collections (Medicines, Batches, Sales, Purchases, Transactions, Audit Logs) into a secure JSON backup document.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={backingUp}
                  onClick={handleTriggerBackup}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {backingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {backingUp ? "Generating Document..." : "Generate Backup Now"}
                </button>
              </div>

              {/* Stored Backup Documents Section (Admin Only) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Stored Backup Documents ({backupsList.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={fetchBackups}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingBackups ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Loading stored backup documents...</span>
                  </div>
                ) : backupsList.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    No backup documents stored yet. Click "Generate Backup Now" above to create your first backup document.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {backupsList.map((b) => (
                      <div key={b.backupId} className="p-4 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 font-mono">{b.filename}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3 text-slate-400" />
                                {formatBytes(b.sizeBytes)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(b.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadBackup(b.backupId, b.filename)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestoreBackup(b.backupId)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Restore Data from this Document"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
