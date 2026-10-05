import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { useAuth } from "../../store/authStore.js";
import {
  Pill,
  Boxes,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  QrCode,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  kpis: {
    totalMedicines: number;
    totalStock: number;
    lowStock: number;
    expiringSoon: number;
    expiredBatches: number;
    outOfStock: number;
    todaysSales: number;
    salesCount: number;
    stockValue: number;
  };
  charts: {
    expiryBreakdown: Array<{ name: string; value: number; color: string }>;
    categoryBreakdown: Array<{ name: string; stock: number }>;
  };
  recentMovements: Array<{
    id: string;
    medicineName: string;
    genericName: string;
    batchNumber: string;
    type: string;
    quantityDelta: number;
    afterQuantity: number;
    reason: string | null;
    userName: string;
    createdAt: string;
  }>;
}

interface DashboardPageProps {
  onNavigate: (module: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/dashboard/stats");
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case "PURCHASE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "SALE":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "ADJUSTMENT_IN":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "ADJUSTMENT_OUT":
      case "DAMAGE":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading Medical Stock Dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center max-w-md mx-auto mt-8">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Dashboard Metrics Unavailable</h3>
          <p className="text-xs text-slate-500 mt-1">
            {error || "Unable to retrieve real-time inventory metrics from the backend server."}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Loading Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Pharmacy Control Center
            </span>
            <span className="text-xs text-slate-400">
              FEFO Priority Enabled
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1.5">
            Welcome, {user?.name || "Doctor"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time inventory valuation, batch tracking, and intelligent reorder alerts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate("scanner")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Medicine</span>
          </button>

          <button
            onClick={() => onNavigate("sales")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale</span>
          </button>

          <button
            onClick={() => onNavigate("inventory")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Inward Stock</span>
          </button>

          <button
            onClick={fetchStats}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Refresh Real-time KPIs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchStats}
            className="underline font-semibold text-rose-800 hover:text-rose-900 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary KPI Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Medicines */}
        <div 
          onClick={() => onNavigate("medicines")}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Medicines
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Pill className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats?.kpis?.totalMedicines ?? "--"}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              <span className="text-teal-600 font-bold">Catalog items</span>
              <span>active & monitored</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Stock Units */}
        <div 
          onClick={() => onNavigate("inventory")}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total In Stock
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats?.kpis?.totalStock?.toLocaleString("en-IN") ?? "--"}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              <span className="text-emerald-600 font-bold">Units / Strips</span>
              <span>across all batches</span>
            </div>
          </div>
        </div>

        {/* Card 3: Low Stock Warning */}
        <div 
          onClick={() => onNavigate("alerts")}
          className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-b from-amber-50/40 to-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Low Stock Items
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-700 tracking-tight flex items-center space-x-2">
              <span>{stats?.kpis?.lowStock ?? "--"}</span>
              {(stats?.kpis?.lowStock || 0) > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Reorder!
                </span>
              )}
            </div>
            <div className="text-xs text-amber-600/80 mt-1">
              Below minimum safety threshold
            </div>
          </div>
        </div>

        {/* Card 4: Expiring Soon (<30 Days) */}
        <div 
          onClick={() => onNavigate("alerts")}
          className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-b from-rose-50/40 to-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Expiring &lt;30 Days
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-rose-700 tracking-tight flex items-center space-x-2">
              <span>{stats?.kpis?.expiringSoon ?? "--"}</span>
              {(stats?.kpis?.expiringSoon || 0) > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 animate-pulse">
                  Sell First
                </span>
              )}
            </div>
            <div className="text-xs text-rose-600/80 mt-1">
              Priority dispensing recommended
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Status & Financial Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Expired Batches</span>
            <div className="text-xl font-bold text-rose-600 mt-0.5">
              {stats?.kpis?.expiredBatches ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">Locked from sales</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Out of Stock</span>
            <div className="text-xl font-bold text-slate-800 mt-0.5">
              {stats?.kpis?.outOfStock ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">Zero inventory</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Today's Sales</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">
              {formatCurrency(stats?.kpis?.todaysSales || 0)}
            </div>
            <span className="text-[10px] text-slate-400">{stats?.kpis?.salesCount || 0} invoices today</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Stock Valuation</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(stats?.kpis?.stockValue || 0)}
            </div>
            <span className="text-[10px] text-slate-400">At purchase cost</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Expiry Health Overview */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Expiry Health Breakdown</h3>
              <p className="text-xs text-slate-500">Batches grouped by shelf-life security</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              FEFO Monitored
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.charts?.expiryBreakdown || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {(stats?.charts?.expiryBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Volume Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Stock Volume by Category</h3>
              <p className="text-xs text-slate-500">Units distribution across top dosage forms</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              Top 6
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.charts?.categoryBreakdown || []}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="stock" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Stock Movements Live Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Recent Stock Movements</h3>
            <p className="text-xs text-slate-500">Real-time ledger of inbound, dispensed, and adjusted stock</p>
          </div>
          <button
            onClick={() => onNavigate("inventory")}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            View Full Ledger &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Medicine</th>
                <th className="px-5 py-3">Batch</th>
                <th className="px-5 py-3">Action Type</th>
                <th className="px-5 py-3">Change (Qty)</th>
                <th className="px-5 py-3">Remaining</th>
                <th className="px-5 py-3">Reason / Context</th>
                <th className="px-5 py-3">Authorized By</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {stats?.recentMovements?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900">{m.medicineName}</div>
                    <div className="text-[11px] text-slate-500">{m.genericName}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {m.batchNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadge(m.type)}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`font-bold inline-flex items-center space-x-0.5 ${
                        m.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {m.quantityDelta > 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-700">
                    {m.afterQuantity}
                  </td>
                  <td className="px-5 py-3 text-slate-600 max-w-xs truncate">
                    {m.reason || "Standard system adjustment"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {m.userName}
                  </td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
