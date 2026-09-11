import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import {
  FileBarChart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Download,
  Calendar,
  Layers,
  ShoppingBag,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  Percent,
} from "lucide-react";

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"valuation" | "sales" | "expiry" | "slow">("valuation");
  const [loading, setLoading] = useState(true);

  // Report States
  const [valuationData, setValuationData] = useState<any | null>(null);
  const [salesData, setSalesData] = useState<any | null>(null);
  const [salesDays, setSalesDays] = useState("30");
  const [expiryData, setExpiryData] = useState<any | null>(null);
  const [slowData, setSlowData] = useState<any[]>([]);

  const fetchValuation = async () => {
    try {
      const res = await api.get("/reports/valuation");
      if (res.data.success) setValuationData(res.data.data);
    } catch (err) {
      console.error("Failed to load valuation report:", err);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await api.get(`/reports/sales-summary?days=${salesDays}`);
      if (res.data.success) setSalesData(res.data.data);
    } catch (err) {
      console.error("Failed to load sales report:", err);
    }
  };

  const fetchExpiry = async () => {
    try {
      const res = await api.get("/reports/expiry-timeline");
      if (res.data.success) setExpiryData(res.data.data);
    } catch (err) {
      console.error("Failed to load expiry report:", err);
    }
  };

  const fetchSlowMoving = async () => {
    try {
      const res = await api.get("/reports/slow-moving");
      if (res.data.success) setSlowData(res.data.data);
    } catch (err) {
      console.error("Failed to load slow moving report:", err);
    }
  };

  const loadActiveReport = async () => {
    setLoading(true);
    if (activeTab === "valuation") await fetchValuation();
    else if (activeTab === "sales") await fetchSales();
    else if (activeTab === "expiry") await fetchExpiry();
    else if (activeTab === "slow") await fetchSlowMoving();
    setLoading(false);
  };

  useEffect(() => {
    loadActiveReport();
  }, [activeTab, salesDays]);

  // CSV Export Download Trigger
  const handleExportCSV = (type: "valuation" | "sales") => {
    const token = localStorage.getItem("token");
    const downloadUrl = `http://localhost:5001/api/reports/export/csv?type=${type}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `mis_${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-emerald-600" />
            Reports & Business Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial valuation, sales velocity analytics, expiry risk exposure & dead-stock audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "valuation" && (
            <button
              onClick={() => handleExportCSV("valuation")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-xs transition-all"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export Valuation CSV
            </button>
          )}
          {activeTab === "sales" && (
            <button
              onClick={() => handleExportCSV("sales")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-xs transition-all"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export Sales CSV
            </button>
          )}
          <button
            onClick={loadActiveReport}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab("valuation")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "valuation"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Valuation & Margin Breakdown
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "sales"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Sales & Revenue Velocity
        </button>
        <button
          onClick={() => setActiveTab("expiry")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "expiry"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Expiry Schedule & Value at Risk
        </button>
        <button
          onClick={() => setActiveTab("slow")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "slow"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Slow-Moving & Dead Stock
        </button>
      </div>

      {/* Content Panels */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
          Aggregating real-time database metrics...
        </div>
      ) : activeTab === "valuation" && valuationData ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Inventory Capital</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1.5">
                ₹{valuationData.summary.totalPurchaseValue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Cost value of batches on shelves</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Retail / MRP Valuation</p>
              <p className="text-2xl font-bold font-mono text-emerald-600 mt-1.5">
                ₹{valuationData.summary.totalRetailValue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Expected gross revenue at full sale</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Projected Gross Profit</p>
              <p className="text-2xl font-bold font-mono text-blue-600 mt-1.5">
                ₹{valuationData.summary.potentialProfit.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                +{valuationData.summary.profitMargin}% Markup Margin
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Physical Stock Units</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5">
                {valuationData.summary.totalUnits.toLocaleString()} units
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Across {valuationData.summary.totalBatches} unique batches
              </p>
            </div>
          </div>

          {/* Category-Wise Valuation Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Category-Wise Stock & Valuation Distribution
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Dosage / Medicine Category</th>
                    <th className="py-3 px-4 text-center">Batch Count</th>
                    <th className="py-3 px-4 text-center">Stock Units</th>
                    <th className="py-3 px-4 text-right">Investment Cost (₹)</th>
                    <th className="py-3 px-4 text-right">Retail MRP Value (₹)</th>
                    <th className="py-3 px-4 text-right">Profit Potential (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {valuationData.categoryBreakdown.map((cat: any, idx: number) => {
                    const profit = Math.max(0, cat.retailValue - cat.purchaseValue);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{cat._id}</td>
                        <td className="py-3 px-4 text-center font-mono">{cat.batchCount}</td>
                        <td className="py-3 px-4 text-center font-semibold">{cat.units.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono">₹{cat.purchaseValue.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{cat.retailValue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                          ₹{profit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "sales" && salesData ? (
        <div className="space-y-6">
          {/* Days Filter */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sales Horizon:
            </span>
            <div className="flex items-center gap-2">
              {["7", "30", "90", "365"].map((d) => (
                <button
                  key={d}
                  onClick={() => setSalesDays(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    salesDays === d
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Last {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Sales KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Gross Sales Revenue</p>
              <p className="text-2xl font-bold font-mono text-emerald-600 mt-1.5">
                ₹{salesData.summary.totalRevenue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Invoices: {salesData.summary.totalInvoices}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Average Order Value</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1.5">
                ₹{salesData.summary.avgInvoiceValue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Per dispensing checkout</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Discounts Given</p>
              <p className="text-2xl font-bold font-mono text-amber-600 mt-1.5">
                ₹{salesData.summary.totalDiscount.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Customer concessions</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">GST / Tax Collected</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1.5">
                ₹{salesData.summary.totalTax.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Government tax obligations</p>
            </div>
          </div>

          {/* Payment Methods Breakdown & Top Medicines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Payment Channel Distribution
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(salesData.paymentMethods).map(([method, amt]: [string, any]) => (
                  <div key={method} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500">{method}</span>
                    <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                      ₹{amt.toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Top Selling Medicines
              </h3>
              {salesData.topMedicines.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No sales recorded in this period.</p>
              ) : (
                <div className="space-y-2">
                  {salesData.topMedicines.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{m.medicineName}</span>
                        <p className="text-slate-400 text-[11px]">{m.genericName}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-emerald-700">
                          ₹{m.totalSalesAmount.toFixed(2)}
                        </span>
                        <p className="text-slate-500 font-semibold">{m.totalQuantity} units sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "expiry" && expiryData ? (
        <div className="space-y-6">
          {/* Risk Horizon Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-rose-300 shadow-xs">
              <span className="text-xs font-bold text-rose-600 uppercase">Already Expired</span>
              <p className="text-2xl font-bold font-mono text-rose-700 mt-1">
                ₹{expiryData.expired.lossValue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                {expiryData.expired.units} units in {expiryData.expired.count} batches (Hard-locked)
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs">
              <span className="text-xs font-bold text-amber-700 uppercase">Expiring in &lt; 30 Days</span>
              <p className="text-2xl font-bold font-mono text-amber-800 mt-1">
                ₹{expiryData.within30Days.valueAtRisk.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                {expiryData.within30Days.units} units at critical risk
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-yellow-200 shadow-xs">
              <span className="text-xs font-bold text-yellow-700 uppercase">Expiring in 31-60 Days</span>
              <p className="text-2xl font-bold font-mono text-yellow-800 mt-1">
                ₹{expiryData.within60Days.valueAtRisk.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-yellow-700 mt-1">
                {expiryData.within60Days.units} units (Priority FEFO)
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-xs font-bold text-emerald-700 uppercase">Safe Stock (&gt; 180 Days)</span>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                ₹{expiryData.safeStock.totalValue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">
                {expiryData.safeStock.units} units secure
              </p>
            </div>
          </div>

          {/* Batches Requiring Immediate Action */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Batches Requiring Immediate Quarantine / FEFO Expedited Dispensing
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Medicine</th>
                    <th className="py-3 px-4 font-mono">Batch #</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-center">Remaining Units</th>
                    <th className="py-3 px-4 text-right">Value at Risk (₹)</th>
                    <th className="py-3 px-4 text-center">Risk Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {[...expiryData.expired.batches, ...expiryData.within30Days.batches].map((b: any) => {
                    const isExp = new Date(b.expiryDate) <= new Date();
                    return (
                      <tr key={b._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{b.medicineName}</td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{b.batchNumber}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {new Date(b.expiryDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{b.quantity}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          ₹{b.value.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isExp
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isExp ? "HARD-LOCKED (EXPIRED)" : "HIGH RISK (< 30 DAYS)"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "slow" ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Dead Stock & Slow-Moving Inventory Watchlist ({slowData.length} items)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Medicines with zero dispensing in the last 30 days holding significant idle working capital
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Generic Formula</th>
                    <th className="py-3 px-4">Form</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-right">Unit Price (₹)</th>
                    <th className="py-3 px-4 text-right">Idle Working Capital (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {slowData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Excellent! All inventory medicines have active sales movement in the last 30 days.
                      </td>
                    </tr>
                  ) : (
                    slowData.map((m: any) => (
                      <tr key={m._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{m.genericName}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{m.dosageForm}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {m.currentStock}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">₹{m.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                          ₹{m.estimatedIdleCapital.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
