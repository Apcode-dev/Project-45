import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  X,
  Layers,
  History,
  AlertCircle,
} from "lucide-react";

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"batches" | "ledger">("batches");
  const [batches, setBatches] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState<any | null>(null);
  const [adjustType, setAdjustType] = useState<"ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "DAMAGE" | "RETURN">("DAMAGE");
  const [adjustQty, setAdjustQty] = useState("5");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      params.append("fefoSort", "true");

      const res = await api.get(`/batches?${params.toString()}`);
      if (res.data.success) {
        setBatches(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/inventory/transactions?limit=30");
      if (res.data.success) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchTransactions();
  }, [search, statusFilter]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForAdjust) return;

    setAdjustSaving(true);
    setModalError(null);

    try {
      const payload = {
        medicineId: selectedBatchForAdjust.medicineId._id || selectedBatchForAdjust.medicineId,
        batchId: selectedBatchForAdjust._id,
        type: adjustType,
        quantity: parseInt(adjustQty, 10),
        reason: adjustReason.trim(),
        notes: adjustNotes.trim(),
      };

      const res = await api.post("/inventory/adjust", payload);
      if (res.data.success) {
        setShowAdjustModal(false);
        setToastMsg(res.data.message);
        setTimeout(() => setToastMsg(null), 4000);
        fetchBatches();
        fetchTransactions();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.error || "Failed to adjust stock");
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleQuarantine = async (batchId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "QUARANTINED" ? "ACTIVE" : "QUARANTINED";
    const promptMsg = nextStatus === "QUARANTINED"
      ? "Enter quarantine reason (e.g. suspect packaging or defect):"
      : "Enter reason for releasing from quarantine:";
    const reason = window.prompt(promptMsg, "Quality control review");
    if (reason === null) return;

    try {
      await api.put(`/batches/${batchId}/status`, { status: nextStatus, reason });
      setToastMsg(`Batch status changed to ${nextStatus}`);
      setTimeout(() => setToastMsg(null), 3000);
      fetchBatches();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  };
  const getStatusBadge = (batch: any) => {
    if (batch.status === "EXPIRED" || batch.isExpired) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1"><ShieldAlert className="w-3 h-3 text-rose-600" /><span>EXPIRED (Locked)</span></span>;
    }
    if (batch.status === "QUARANTINED") {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">QUARANTINED</span>;
    }
    if (batch.isExpiring30) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center space-x-1"><Clock className="w-3 h-3 text-amber-600" /><span>Expiring &lt;30d (Sell First)</span></span>;
    }
    if (batch.isExpiring90) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">Expiring &lt;90d</span>;
    }
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">ACTIVE (Safe)</span>;
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case "PURCHASE": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "SALE": return "bg-sky-100 text-sky-800 border-sky-300";
      case "ADJUSTMENT_IN": case "RETURN": return "bg-teal-100 text-teal-800 border-teal-300";
      case "ADJUSTMENT_OUT": case "DAMAGE": return "bg-rose-100 text-rose-800 border-rose-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Module 05
            </span>
            <span className="text-xs text-slate-500">FEFO Engine &bull; Batch Inventory &bull; Stock Adjustments</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Inventory &amp; Batch Management</h1>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("batches")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "batches" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>FEFO Batches</span>
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "ledger" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Stock Ledger</span>
            </button>
          </div>
          <button
            onClick={() => { fetchBatches(); fetchTransactions(); }}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      {activeTab === "batches" ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batch number..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active (Safe)</option>
              <option value="EXPIRED">Expired (Locked)</option>
              <option value="QUARANTINED">Quarantined</option>
            </select>
          </div>

          {/* Batches Table (FEFO Sorted) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wider uppercase text-xs">Active Batches Ledger</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FEFO Enforced (Earliest Expiry First)
                </span>
              </div>
              <span className="text-xs text-slate-400">{batches.length} batches tracked</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Medicine</th>
                    <th className="px-5 py-3.5">Batch No</th>
                    <th className="px-5 py-3.5">Expiry Date</th>
                    <th className="px-5 py-3.5">Status &amp; Safety</th>
                    <th className="px-5 py-3.5">Stock Units</th>
                    <th className="px-5 py-3.5">Purchase / MRP</th>
                    <th className="px-5 py-3.5">Supplier</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <tr key={b._id} className={`hover:bg-slate-50/80 transition-colors ${b.isExpired ? "bg-rose-50/20" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{b.medicineId?.name || "Unknown"}</div>
                        <div className="text-[11px] text-slate-500">{b.medicineId?.genericName} &bull; {b.medicineId?.strength}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 text-[11px]">
                          {b.batchNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800">
                          {new Date(b.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {getStatusBadge(b)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 text-sm">{b.quantity}</span>
                        <span className="text-slate-400 text-[10px] ml-1">{b.medicineId?.unit || "Units"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-slate-800 font-semibold">₹{b.mrp?.toFixed(2)} (MRP)</div>
                        <div className="text-slate-400 text-[11px]">Cost: ₹{b.purchasePrice?.toFixed(2)}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {b.supplierId?.name || "Direct Supplier"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedBatchForAdjust(b);
                              setShowAdjustModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors"
                          >
                            Adjust Stock
                          </button>
                          <button
                            onClick={() => handleQuarantine(b._id, b.status)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              b.status === "QUARANTINED"
                                ? "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
                                : "text-slate-400 hover:text-purple-600 hover:bg-purple-50 border-slate-200"
                            }`}
                            title={b.status === "QUARANTINED" ? "Release from Quarantine" : "Quarantine Batch"}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Full Stock Ledger */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <span className="font-extrabold tracking-wider uppercase text-xs">Immutable Stock Movement Audit Trail</span>
            <span className="text-xs text-slate-400">Chronological Transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Medicine</th>
                  <th className="px-5 py-3.5">Batch No</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Delta (Qty)</th>
                  <th className="px-5 py-3.5">Balance</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{tx.medicineId?.name || "Medicine"}</div>
                      <div className="text-[11px] text-slate-500">{tx.medicineId?.genericName}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">
                      {tx.batchId?.batchNumber || "N/A"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadge(tx.type)}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-bold inline-flex items-center space-x-0.5 ${
                        tx.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {tx.quantityDelta > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      {tx.afterQuantity}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {tx.reason || "Standard system transaction"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {tx.userId?.name || "System"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedBatchForAdjust && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Perform Stock Adjustment</h3>
                <p className="text-xs text-slate-500">Record physical stock audit corrections with reason</p>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono">
              <div><strong>Medicine:</strong> {selectedBatchForAdjust.medicineId?.name}</div>
              <div><strong>Batch:</strong> {selectedBatchForAdjust.batchNumber}</div>
              <div><strong>Current Stock:</strong> <span className="font-bold text-emerald-700">{selectedBatchForAdjust.quantity} units</span></div>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Type *</label>
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="DAMAGE">[-] Damage / Broken Packaging</option>
                  <option value="ADJUSTMENT_OUT">[-] Stock Audit Shortage / Lost</option>
                  <option value="ADJUSTMENT_IN">[+] Stock Audit Surplus / Found</option>
                  <option value="RETURN">[+] Returned to Inventory</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity Units *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Real-time Calculation Preview */}
              <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] flex items-center justify-between font-bold text-emerald-900">
                <span>Calculated Balance:</span>
                <span>
                  {selectedBatchForAdjust.quantity} {adjustType === "ADJUSTMENT_IN" || adjustType === "RETURN" ? "+" : "-"} {adjustQty || 0} ={" "}
                  {adjustType === "ADJUSTMENT_IN" || adjustType === "RETURN"
                    ? selectedBatchForAdjust.quantity + (parseInt(adjustQty, 10) || 0)
                    : selectedBatchForAdjust.quantity - (parseInt(adjustQty, 10) || 0)}{" "}
                  units
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mandatory Audit Reason *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Broken vial during ward transfer, Annual count mismatch"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {adjustSaving ? "Saving..." : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
