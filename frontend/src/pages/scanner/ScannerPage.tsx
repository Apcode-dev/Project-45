import React, { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import {
  QrCode,
  Camera,
  Upload,
  Keyboard,
  Flashlight,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  X,
  Pill,
} from "lucide-react";

export const ScannerPage: React.FC = () => {
  const [inputCode, setInputCode] = useState("8901234567890");
  const [scanning, setScanning] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [activeInputMode, setActiveInputMode] = useState<"camera" | "upload" | "manual">("camera");

  // Inward Form State
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | "new">(0);
  const [inwardBatchNo, setInwardBatchNo] = useState("");
  const [inwardMfgDate, setInwardMfgDate] = useState("2024-05-01");
  const [inwardExpDate, setInwardExpDate] = useState("2027-12-31");
  const [inwardQty, setInwardQty] = useState("100");
  const [inwardPrice, setInwardPrice] = useState("18.50");
  const [inwardMrp, setInwardMrp] = useState("32.00");
  const [inwardSupplier, setInwardSupplier] = useState("");

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inwardSaving, setInwardSaving] = useState(false);
  const [inwardSuccessMsg, setInwardSuccessMsg] = useState<string | null>(null);

  // Quick Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regBrand, setRegBrand] = useState("");
  const [regGeneric, setRegGeneric] = useState("");
  const [regStrength, setRegStrength] = useState("");
  const [regForm, setRegForm] = useState("");
  const [dosageForms, setDosageForms] = useState<any[]>([]);

  useEffect(() => {
    api.get("/categories/dosage-forms/all").then((res) => setDosageForms(res.data.data || [])).catch(() => {});
    api.get("/manufacturers").then((res) => setSuppliers(res.data.data || [])).catch(() => {});
    handleLookup("8901234567890");
  }, []);

  const handleLookup = async (codeToSearch: string) => {
    const code = codeToSearch.trim();
    if (!code) return;

    setLoading(true);
    setError(null);
    setInwardSuccessMsg(null);

    try {
      const res = await api.get(`/scanner/lookup/${encodeURIComponent(code)}`);
      if (res.data.success) {
        setLookupResult(res.data.data);
        if (res.data.data.found) {
          const batches = res.data.data.batches || [];
          if (batches.length > 0) {
            setSelectedBatchIndex(0);
            setInwardBatchNo(batches[0].batchNumber);
            setInwardExpDate(batches[0].expiryDate ? batches[0].expiryDate.split("T")[0] : "2027-12-31");
            setInwardPrice(batches[0].purchasePrice?.toString() || "18.50");
            setInwardMrp(batches[0].mrp?.toString() || "32.00");
          } else {
            setSelectedBatchIndex("new");
            setInwardBatchNo(`B-${Date.now().toString().slice(-4)}`);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error scanning barcode");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupResult?.medicine?._id) return;

    setInwardSaving(true);
    setError(null);

    try {
      const payload = {
        medicineId: lookupResult.medicine._id,
        batchNumber: inwardBatchNo.trim(),
        manufacturingDate: inwardMfgDate,
        expiryDate: inwardExpDate,
        quantity: parseInt(inwardQty, 10),
        purchasePrice: parseFloat(inwardPrice) || 0,
        mrp: parseFloat(inwardMrp) || 0,
      };

      const res = await api.post("/scanner/quick-inward", payload);
      if (res.data.success) {
        setInwardSuccessMsg(`Added ${inwardQty} units to Batch ${inwardBatchNo}! Stock updated.`);
        handleLookup(lookupResult.code);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add stock");
    } finally {
      setInwardSaving(false);
    }
  };

  const handleRegisterMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/medicines", {
        name: regBrand,
        genericName: regGeneric,
        strength: regStrength,
        dosageFormId: regForm || undefined,
        initialCode: lookupResult?.code,
        initialCodeType: "BARCODE",
      });
      if (res.data.success) {
        setShowRegisterModal(false);
        handleLookup(lookupResult?.code);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to register medicine");
    }
  };
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Module 03
            </span>
            <span className="text-xs text-slate-500">Universal QR, 1D Barcode &amp; GS1 DataMatrix Decoder</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Smart Scanner &amp; Quick Inward</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => { setInputCode("8901234567890"); handleLookup("8901234567890"); }}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-mono text-[11px] text-slate-700 font-bold"
          >
            Dolo 650
          </button>
          <button
            onClick={() => { setInputCode("8902345678901"); handleLookup("8902345678901"); }}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-mono text-[11px] text-slate-700 font-bold"
          >
            Novamox
          </button>
          <button
            onClick={() => { setInputCode("8904567890123"); handleLookup("8904567890123"); }}
            className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 font-mono text-[11px] text-amber-800 font-bold"
          >
            Glycomet [Low]
          </button>
          <button
            onClick={() => { setInputCode("8909999999999"); handleLookup("8909999999999"); }}
            className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 font-mono text-[11px] text-rose-800 font-bold"
          >
            Unregistered
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Viewfinder & Code Input */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="relative bg-slate-950 rounded-2xl p-6 text-white min-h-[280px] flex flex-col items-center justify-center overflow-hidden border border-slate-800">
              <div className="w-48 h-48 border-2 border-dashed border-emerald-400/70 rounded-2xl flex flex-col items-center justify-center relative p-3">
                <div className="w-full h-full border border-emerald-500/20 rounded-xl flex items-center justify-center relative">
                  <QrCode className="w-20 h-20 text-emerald-400/40" />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-pulse" />
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                  <span>Scanner Ready &bull; Multi-Format</span>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleLookup(inputCode); }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Scan or Enter Code..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Lookup"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Exact Scanned Medicine Details & Batch Inward Form */}
        <div className="lg:col-span-7">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {inwardSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{inwardSuccessMsg}</span>
            </div>
          )}

          {lookupResult?.found === false ? (
            <div className="bg-white rounded-2xl p-8 border border-amber-200 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Unregistered Code
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">Medicine Not Found in Registry</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Code <span className="font-mono font-bold text-slate-800">{lookupResult.code}</span> is not linked to any medicine. Register it now to immediately begin stock inward.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>[ Register Medicine ]</span>
                </button>
              </div>
            </div>
          ) : lookupResult?.found === true ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-extrabold text-xs tracking-wider uppercase">
                  MEDICINE DETAILS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Found ✓
                </span>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Medicine</span>
                    <span className="font-bold text-slate-900 text-sm">{lookupResult.medicine.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Brand / Generic</span>
                    <span className="font-semibold text-slate-800">{lookupResult.medicine.brandName || "Generic"} / {lookupResult.medicine.genericName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Strength &amp; Form</span>
                    <span className="font-medium text-slate-800">{lookupResult.medicine.strength} &bull; {lookupResult.medicine.dosageFormId?.name || "Tablet"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Manufacturer</span>
                    <span className="text-slate-800 font-medium">{lookupResult.medicine.manufacturerId?.name || "Direct Supply"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Scanned Code</span>
                    <span className="font-mono text-[11px] text-slate-700">{lookupResult.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Stock</span>
                    <span className="font-bold text-emerald-700 text-sm">{lookupResult.medicine.totalStock} units</span>
                  </div>
                </div>

                {/* BATCH SECTION */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                    <span className="font-extrabold uppercase tracking-wider text-emerald-900 text-[11px]">
                      BATCH SPECIFICATIONS
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchIndex("new");
                        setInwardBatchNo(`B-${Date.now().toString().slice(-4)}`);
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                        selectedBatchIndex === "new"
                          ? "bg-emerald-600 text-white border-emerald-700"
                          : "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                      }`}
                    >
                      + New Batch
                    </button>
                  </div>

                  {lookupResult.batches?.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {lookupResult.batches.map((b: any, idx: number) => (
                        <button
                          key={b._id}
                          type="button"
                          onClick={() => {
                            setSelectedBatchIndex(idx);
                            setInwardBatchNo(b.batchNumber);
                            setInwardExpDate(b.expiryDate ? b.expiryDate.split("T")[0] : "2027-12-31");
                            setInwardPrice(b.purchasePrice?.toString() || "18.50");
                            setInwardMrp(b.mrp?.toString() || "32.00");
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-left flex-shrink-0 transition-all font-mono ${
                            selectedBatchIndex === idx
                              ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                          }`}
                        >
                          <div className="font-bold text-[11px]">{b.batchNumber}</div>
                          <div className="text-[9px] opacity-80">
                            Exp: {new Date(b.expiryDate).toLocaleDateString("en-IN", { month: "2-digit", year: "2-digit" })} &bull; Qty: {b.quantity}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Batch No *</label>
                      <input
                        type="text"
                        required
                        value={inwardBatchNo}
                        onChange={(e) => setInwardBatchNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Mfg Date</label>
                      <input
                        type="date"
                        value={inwardMfgDate}
                        onChange={(e) => setInwardMfgDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Expiry Date *</label>
                      <input
                        type="date"
                        required
                        value={inwardExpDate}
                        onChange={(e) => setInwardExpDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">MRP (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={inwardMrp}
                        onChange={(e) => setInwardMrp(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* INWARD ACTION FORM */}
                <form onSubmit={handleQuickInward} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Quantity to Add *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={inwardQty}
                        onChange={(e) => setInwardQty(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Purchase Price (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={inwardPrice}
                        onChange={(e) => setInwardPrice(e.target.value)}
                        placeholder="18.50"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Supplier
                      </label>
                      <select
                        value={inwardSupplier}
                        onChange={(e) => setInwardSupplier(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="">Select Supplier ▼</option>
                        {suppliers.map((s) => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={inwardSaving}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    <span>{inwardSaving ? "Updating Inventory..." : "[ ADD STOCK ]"}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm text-center text-slate-400">
              Point scanner or enter a barcode code to begin.
            </div>
          )}
        </div>
      </div>

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Quick Register Medicine</h3>
                <p className="text-xs text-slate-500">Associate scanned code with a new medicine profile</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900">
              Scanned Code: <strong>{lookupResult?.code}</strong>
            </div>

            <form onSubmit={handleRegisterMedicine} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={regBrand}
                  onChange={(e) => setRegBrand(e.target.value)}
                  placeholder="e.g. Paracetamol 500"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Generic / Active Drug *</label>
                <input
                  type="text"
                  required
                  value={regGeneric}
                  onChange={(e) => setRegGeneric(e.target.value)}
                  placeholder="e.g. Paracetamol"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    required
                    value={regStrength}
                    onChange={(e) => setRegStrength(e.target.value)}
                    placeholder="e.g. 500 mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Form</label>
                  <select
                    value={regForm}
                    onChange={(e) => setRegForm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Form</option>
                    {dosageForms.map((df) => (
                      <option key={df._id} value={df._id}>{df.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  Register &amp; Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
