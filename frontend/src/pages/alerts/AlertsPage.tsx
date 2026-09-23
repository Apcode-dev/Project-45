import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { showToast } from "../../utils/toast.js";
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface AlertsPageProps {
  onNavigate?: (module: string) => void;
  onAlertsUpdated?: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigate, onAlertsUpdated }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    unresolved: 0,
    critical: 0,
    warning: 0,
    lowStock: 0,
    expired: 0,
    expiringSoon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Filters
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("isResolved", tab === "resolved" ? "true" : "false");
      if (severityFilter) params.append("severity", severityFilter);
      if (typeFilter) params.append("type", typeFilter);

      const res = await api.get(`/alerts?${params.toString()}`);
      if (res.data.success) {
        setAlerts(res.data.data);
        if (res.data.counts) setCounts(res.data.counts);
        if (onAlertsUpdated) onAlertsUpdated();
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [tab, severityFilter, typeFilter]);

  // Trigger automated inventory scan
  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await api.post("/alerts/scan");
      if (res.data.success) {
        showToast.success(`Scan Complete: ${res.data.message}`);
        fetchAlerts();
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.message || "Failed to run scan.");
    } finally {
      setScanning(false);
    }
  };

  // Resolve single alert
  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      const res = await api.put(`/alerts/${alertId}/resolve`);
      if (res.data.success) {
        showToast.success("Alert resolved successfully.");
        fetchAlerts();
      }
    } catch (err: any) {
      showToast.error("Failed to resolve alert.");
      console.error("Failed to resolve alert:", err);
    } finally {
      setResolvingId(null);
    }
  };

  // Resolve all
  const handleResolveAll = async () => {
    if (!window.confirm("Are you sure you want to mark all active alerts as resolved?")) return;
    try {
      const res = await api.put("/alerts/resolve-all");
      if (res.data.success) {
        showToast.success(res.data.message || "All active alerts marked as resolved.");
        fetchAlerts();
      }
    } catch (err: any) {
      showToast.error("Failed to resolve all alerts.");
      console.error("Failed to resolve all alerts:", err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) ||
      a.message?.toLowerCase().includes(q) ||
      a.medicineId?.name?.toLowerCase().includes(q) ||
      a.batchId?.batchNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            Alerts & Expiry Incident Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated monitoring for expired medicines, 30/60-day expiry thresholds & stock replenishment
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Run Inventory Scan Now
          </button>
          {tab === "active" && counts.unresolved > 0 && (
            <button
              onClick={handleResolveAll}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all"
            >
              Resolve All
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Critical Incidents</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{counts.critical}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Expiring in &lt; 60 Days</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{counts.expiringSoon}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Low Stock Warnings</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{counts.lowStock}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired Batches</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{counts.expired}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "active"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Active Issues ({counts.unresolved})
          </button>
          <button
            onClick={() => setTab("resolved")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "resolved"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Resolved Archive
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Types</option>
            <option value="EXPIRED">Expired Batches</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="LOW_STOCK">Low / Out of Stock</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading incidents...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <p className="text-base font-bold text-slate-800">
              {tab === "active" ? "All Clear! No Active Incidents" : "No Resolved Alerts in History"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {tab === "active"
                ? "Your pharmacy stock levels and expiry dates are within safe regulatory limits."
                : "Resolved incidents will appear here for compliance audit history."}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === "CRITICAL";
            const isWarning = alert.severity === "WARNING";

            return (
              <div
                key={alert._id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white ${
                  isCritical
                    ? "border-rose-300 shadow-xs hover:border-rose-400"
                    : isWarning
                    ? "border-amber-200 hover:border-amber-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCritical
                        ? "bg-rose-100 text-rose-700"
                        : isWarning
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {alert.type === "EXPIRED" && <AlertTriangle className="w-5 h-5" />}
                    {alert.type === "EXPIRING_SOON" && <Clock className="w-5 h-5" />}
                    {alert.type === "LOW_STOCK" && <Package className="w-5 h-5" />}
                    {alert.type === "RECALL" && <ShieldAlert className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isCritical
                            ? "bg-rose-600 text-white animate-pulse"
                            : isWarning
                            ? "bg-amber-500 text-white"
                            : "bg-blue-500 text-white"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                      <span className="text-[11px] text-slate-400">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {alert.message}
                    </p>

                    {/* Associated Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      {alert.medicineId && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                          Medicine: {alert.medicineId.name}
                        </span>
                      )}
                      {alert.batchId && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                          Batch: {alert.batchId.batchNumber} (Qty: {alert.batchId.quantity})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  {onNavigate && alert.type === "LOW_STOCK" && (
                    <button
                      onClick={() => onNavigate("purchases")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all"
                    >
                      Reorder
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onNavigate && (alert.type === "EXPIRED" || alert.type === "EXPIRING_SOON") && (
                    <button
                      onClick={() => onNavigate("inventory")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all"
                    >
                      View Batch
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!alert.isResolved && (
                    <button
                      onClick={() => handleResolveAlert(alert._id)}
                      disabled={resolvingId === alert._id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-600 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      title="Mark resolved"
                    >
                      {resolvingId === alert._id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
