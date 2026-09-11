import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Boxes,
  Trash2,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";

interface PurchaseItemInput {
  medicineId: string;
  medicineName?: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  total: number;
}

export const PurchasesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"orders" | "create">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create PO form state
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [directInward, setDirectInward] = useState(true);
  const [items, setItems] = useState<PurchaseItemInput[]>([]);
  const [tax, setTax] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // View Details Modal
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get(`/purchases?${params.toString()}`);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load purchase orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [supRes, medRes] = await Promise.all([
        api.get("/suppliers?status=ACTIVE"),
        api.get("/medicines?limit=100"),
      ]);
      if (supRes.data.success) setSuppliers(supRes.data.data);
      if (medRes.data.success) setMedicines(medRes.data.data);
    } catch (err) {
      console.error("Failed to load dependencies:", err);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleAddItem = () => {
    if (medicines.length === 0) return;
    const defaultMed = medicines[0];
    const defaultBuy = defaultMed.unitPrice ? Math.round(defaultMed.unitPrice * 0.7) : 10;
    const defaultSell = defaultMed.unitPrice || 15;

    const futureExpiry = new Date();
    futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);

    const newItem: PurchaseItemInput = {
      medicineId: defaultMed._id,
      medicineName: defaultMed.name,
      batchNumber: `B-${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: futureExpiry.toISOString().split("T")[0],
      quantity: 50,
      purchasePrice: defaultBuy,
      sellingPrice: defaultSell,
      total: 50 * defaultBuy,
    };
    setItems([...items, newItem]);
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemInput, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === "medicineId") {
      item.medicineId = value;
      const found = medicines.find((m) => m._id === value);
      if (found) {
        item.medicineName = found.name;
        if (found.unitPrice) {
          item.sellingPrice = found.unitPrice;
          item.purchasePrice = Math.round(found.unitPrice * 0.7);
        }
      }
    } else if (field === "quantity" || field === "purchasePrice") {
      (item as any)[field] = Number(value);
      item.total = Number((item.quantity * item.purchasePrice).toFixed(2));
    } else {
      (item as any)[field] = value;
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const grandTotal = subtotal + Number(tax || 0) + Number(shipping || 0) - Number(discount || 0);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSupplierId) {
      setFormError("Please select a registered supplier.");
      return;
    }

    if (items.length === 0) {
      setFormError("Please add at least one line item to this purchase order.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId: selectedSupplierId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        orderDate,
        status: directInward ? "RECEIVED" : "ORDERED",
        items: items.map((it) => ({
          medicineId: it.medicineId,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          quantity: it.quantity,
          purchasePrice: it.purchasePrice,
          sellingPrice: it.sellingPrice,
        })),
        tax: Number(tax || 0),
        shipping: Number(shipping || 0),
        discount: Number(discount || 0),
        notes: notes.trim() || undefined,
      };

      const res = await api.post("/purchases", payload);
      if (res.data.success) {
        setSuccessToast(
          directInward
            ? `Purchase ${res.data.data.poNumber} received & stock added into shelves!`
            : `Purchase Order ${res.data.data.poNumber} created successfully!`
        );
        setTimeout(() => setSuccessToast(null), 5000);

        setItems([]);
        setInvoiceNumber("");
        setNotes("");
        setActiveTab("orders");
        fetchOrders();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create purchase order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveStock = async (orderId: string) => {
    setReceivingId(orderId);
    try {
      const res = await api.put(`/purchases/${orderId}/receive`);
      if (res.data.success) {
        setSuccessToast("Stock inwarded and batches updated successfully!");
        setTimeout(() => setSuccessToast(null), 4000);
        if (viewOrder && viewOrder._id === orderId) {
          setViewOrder(res.data.data);
        }
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to receive order.");
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {successToast && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-600" />
            Purchases & Goods Inward Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create purchase orders, receive supplier shipments, and automatically inward batch stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("orders");
              fetchOrders();
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "orders"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Orders History
          </button>
          <button
            onClick={() => {
              setActiveTab("create");
              if (items.length === 0) handleAddItem();
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${
              activeTab === "create"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            <Plus className="w-4 h-4" />
            New Purchase / Inward
          </button>
        </div>
      </div>

      {activeTab === "orders" ? (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search PO number or Invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="RECEIVED">Received (In Stock)</option>
                <option value="ORDERED">Ordered (Pending Inward)</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                onClick={() => fetchOrders()}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                title="Refresh orders"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4 text-center">Items Count</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No purchase orders found. Click "New Purchase / Inward" to record your first order.
                      </td>
                    </tr>
                  ) : (
                    orders.map((po) => (
                      <tr key={po._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {po.poNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{po.supplierId?.name || "—"}</div>
                          <div className="text-xs text-slate-500">{po.supplierId?.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                          {po.invoiceNumber ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {po.invoiceNumber}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {new Date(po.orderDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                          {po.items?.length || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ₹{po.grandTotal?.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              po.status === "RECEIVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : po.status === "ORDERED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {po.status === "RECEIVED" && <CheckCircle2 className="w-3 h-3" />}
                            {po.status === "ORDERED" && <Clock className="w-3 h-3" />}
                            {po.status === "CANCELLED" && <XCircle className="w-3 h-3" />}
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewOrder(po)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                              title="View Order Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {po.status === "ORDERED" && (
                              <button
                                onClick={() => handleReceiveStock(po._id)}
                                disabled={receivingId === po._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                              >
                                {receivingId === po._id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Boxes className="w-3 h-3" />
                                )}
                                Inward Stock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitPurchase} className="space-y-6">
          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium">
              {formError}
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              1. Supplier & Invoice Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.contactPerson || "Vendor"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Invoice / Challan #
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-99021"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order / Invoice Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-900">Direct Inward to Inventory Shelves</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  When enabled, stock will immediately be credited into batches and total stock upon saving.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={directInward}
                  onChange={(e) => setDirectInward(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                2. Medicine Batches & Inward Items ({items.length})
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Medicine Row
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No items added yet. Click "+ Add Medicine Row" above to add medicines.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                      <th className="py-2.5 px-3 w-64">Medicine</th>
                      <th className="py-2.5 px-3 w-32">Batch #</th>
                      <th className="py-2.5 px-3 w-36">Expiry Date</th>
                      <th className="py-2.5 px-3 w-24">Qty</th>
                      <th className="py-2.5 px-3 w-28">Buy Price (₹)</th>
                      <th className="py-2.5 px-3 w-28">MRP Price (₹)</th>
                      <th className="py-2.5 px-3 w-28 text-right">Row Total</th>
                      <th className="py-2.5 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.medicineId}
                            onChange={(e) => handleItemChange(idx, "medicineId", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                          >
                            {medicines.map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.name} ({m.dosageFormId?.name || "Unit"})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            required
                            value={item.batchNumber}
                            onChange={(e) =>
                              handleItemChange(idx, "batchNumber", e.target.value.toUpperCase())
                            }
                            placeholder="BATCH-01"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="date"
                            required
                            value={item.expiryDate}
                            onChange={(e) => handleItemChange(idx, "expiryDate", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={item.purchasePrice}
                            onChange={(e) => handleItemChange(idx, "purchasePrice", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={item.sellingPrice}
                            onChange={(e) => handleItemChange(idx, "sellingPrice", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                          ₹{item.total.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Internal Order Notes & Instructions</h2>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add delivery terms, batch verification sign-off notes, temperature checklist..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Order Financial Breakdown
              </h2>

              <div className="flex justify-between text-sm text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-semibold font-mono">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Applicable GST / Tax (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Freight / Shipping (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Trade Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-sm text-emerald-700 font-semibold"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                <span>Net Grand Total</span>
                <span className="text-xl text-emerald-600 font-mono">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("orders")}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {directInward ? "Inward Stock Immediately" : "Save Purchase Order"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Purchase Order: {viewOrder.poNumber}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered on {new Date(viewOrder.orderDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500">Supplier:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewOrder.supplierId?.name}</p>
                  <p className="text-slate-600">{viewOrder.supplierId?.phone}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewOrder.status}</p>
                  <span className="text-slate-500">Invoice: {viewOrder.invoiceNumber || "—"}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase mb-2">Order Line Items</h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2">Medicine</th>
                      <th className="p-2">Batch</th>
                      <th className="p-2">Expiry</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Unit Buy</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewOrder.items?.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.medicineId?.name || "Medicine"}</td>
                        <td className="p-2 font-mono">{it.batchNumber}</td>
                        <td className="p-2">{new Date(it.expiryDate).toLocaleDateString()}</td>
                        <td className="p-2 text-center font-bold">{it.quantity}</td>
                        <td className="p-2 text-right font-mono">₹{it.purchasePrice}</td>
                        <td className="p-2 text-right font-mono font-bold">₹{it.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{viewOrder.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span className="font-mono">₹{viewOrder.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700">₹{viewOrder.grandTotal?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                {viewOrder.status === "ORDERED" && (
                  <button
                    onClick={() => handleReceiveStock(viewOrder._id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    Receive Stock Now
                  </button>
                )}
                <button
                  onClick={() => setViewOrder(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
