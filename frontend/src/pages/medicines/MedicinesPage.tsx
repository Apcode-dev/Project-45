import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import {
  Pill,
  Search,
  Plus,
  Filter,
  AlertTriangle,
  QrCode,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  RefreshCw,
  Building,
} from "lucide-react";

export const MedicinesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Metadata dropdowns
  const [dosageForms, setDosageForms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMedDetail, setSelectedMedDetail] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    brandName: "",
    genericName: "",
    strength: "",
    dosageFormId: "",
    therapeuticCategoryId: "",
    manufacturerId: "",
    composition: "",
    prescriptionRequired: false,
    minStockLevel: 20,
    maxStockLevel: 500,
    unit: "Strip",
    initialCode: "",
    initialCodeType: "BARCODE",
  });

  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchDropdowns = async () => {
    try {
      const [dfRes, catRes, mfgRes] = await Promise.all([
        api.get("/categories/dosage-forms/all"),
        api.get("/categories?type=THERAPEUTIC"),
        api.get("/manufacturers"),
      ]);
      setDosageForms(dfRes.data.data || []);
      setCategories(catRes.data.data || []);
      setManufacturers(mfgRes.data.data || []);
    } catch (err) {
      console.error("Failed to load metadata dropdowns:", err);
    }
  };

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedForm) params.append("dosageFormId", selectedForm);
      if (selectedCategory) params.append("therapeuticCategoryId", selectedCategory);
      if (lowStockOnly) params.append("lowStock", "true");

      const res = await api.get(`/medicines?${params.toString()}`);
      if (res.data.success) {
        setMedicines(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load medicines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedicines();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedForm, lowStockOnly]);

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      const res = await api.post("/medicines", formData);
      if (res.data.success) {
        setShowAddModal(false);
        setSuccessToast(`Medicine "${formData.name}" added to master catalog.`);
        setTimeout(() => setSuccessToast(null), 3500);
        // Reset form
        setFormData({
          name: "",
          brandName: "",
          genericName: "",
          strength: "",
          dosageFormId: "",
          therapeuticCategoryId: "",
          manufacturerId: "",
          composition: "",
          prescriptionRequired: false,
          minStockLevel: 20,
          maxStockLevel: 500,
          unit: "Strip",
          initialCode: "",
          initialCodeType: "BARCODE",
        });
        fetchMedicines();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to create medicine");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"?`)) return;
    try {
      await api.delete(`/medicines/${id}`);
      setSuccessToast(`Medicine "${name}" deactivated.`);
      setTimeout(() => setSuccessToast(null), 3000);
      fetchMedicines();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to deactivate");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Module 04
            </span>
            <span className="text-xs text-slate-500">Master Drug Formulary &amp; Stock Rollup</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Medicine Management</h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Medicine</span>
          </button>
          <button
            onClick={fetchMedicines}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand, generic, active composition..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Form Filter */}
          <select
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Dosage Forms</option>
            {dosageForms.map((df) => (
              <option key={df._id} value={df._id}>{df.name}</option>
            ))}
          </select>

          {/* Therapeutic Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 ${
              lowStockOnly
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Low Stock</span>
          </button>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Medicine &amp; Generic</th>
                <th className="px-5 py-3.5">Strength / Form</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Manufacturer</th>
                <th className="px-5 py-3.5">Total In-Stock</th>
                <th className="px-5 py-3.5">Batches</th>
                <th className="px-5 py-3.5">Registered Code</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {medicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    {loading ? "Loading medicines catalog..." : "No medicines found matching criteria."}
                  </td>
                </tr>
              ) : (
                medicines.map((med) => (
                  <tr key={med._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{med.name}</span>
                            {med.prescriptionRequired && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-300">
                                Rx
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{med.genericName}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800">{med.strength}</span>
                      <span className="text-slate-400 block text-[11px]">
                        {med.dosageFormId?.name || "Tablet"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {med.therapeuticCategoryId?.name || "General"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      {med.manufacturerId?.name || "Direct Supply"}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-sm ${
                          med.isOutOfStock ? "text-rose-600" : med.isLowStock ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {med.totalStock}
                        </span>
                        <span className="text-slate-400 text-[10px]">{med.unit || "Units"}</span>
                      </div>
                      {med.isLowStock && !med.isOutOfStock && (
                        <span className="text-[9px] text-amber-700 font-bold block">Low Stock (Min: {med.minStockLevel})</span>
                      )}
                      {med.isOutOfStock && (
                        <span className="text-[9px] text-rose-700 font-bold block">Out of Stock!</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {med.batchCount || 0} batches
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      {med.primaryCode ? (
                        <span className="font-mono text-[11px] text-slate-700 flex items-center space-x-1">
                          <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{med.primaryCode}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Not registered</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedMedDetail(med)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(med._id, med.name)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Deactivate Medicine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add New Medicine to Catalog</h3>
                  <p className="text-xs text-slate-500">Register product specifications and initial barcode</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dolo 650, Augmentin 625"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic / Active Drug *</label>
                  <input
                    type="text"
                    required
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g. Paracetamol, Amoxicillin"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    required
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    placeholder="e.g. 500mg, 10ml"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Form</label>
                  <select
                    value={formData.dosageFormId}
                    onChange={(e) => setFormData({ ...formData, dosageFormId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Form</option>
                    {dosageForms.map((df) => (
                      <option key={df._id} value={df._id}>{df.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Therapeutic Category</label>
                  <select
                    value={formData.therapeuticCategoryId}
                    onChange={(e) => setFormData({ ...formData, therapeuticCategoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
                  <select
                    value={formData.manufacturerId}
                    onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturers.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. Strip (10 tabs), Bottle, Vial"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Initial Barcode Registration */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                <div className="font-bold text-emerald-900 flex items-center space-x-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Register Initial Code / Barcode (Optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={formData.initialCode}
                      onChange={(e) => setFormData({ ...formData, initialCode: e.target.value })}
                      placeholder="e.g. 8901234567890 (Scan or Type)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <select
                      value={formData.initialCodeType}
                      onChange={(e) => setFormData({ ...formData, initialCodeType: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="BARCODE">1D Barcode</option>
                      <option value="QR">2D QR Code</option>
                      <option value="DATAMATRIX">GS1 DataMatrix</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Stock Thresholds & Prescription Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Warning Level</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Stock Target</label>
                  <input
                    type="number"
                    value={formData.maxStockLevel}
                    onChange={(e) => setFormData({ ...formData, maxStockLevel: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.prescriptionRequired}
                      onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-slate-800">Requires Prescription (Rx)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {formSaving ? "Saving..." : "Save Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Medicine Details Modal */}
      {selectedMedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{selectedMedDetail.name}</h3>
                <span className="text-xs text-slate-500">{selectedMedDetail.genericName}</span>
              </div>
              <button
                onClick={() => setSelectedMedDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2.5 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Strength &amp; Unit:</span>
                <span className="font-semibold text-slate-900">{selectedMedDetail.strength} &bull; {selectedMedDetail.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Dosage Form:</span>
                <span className="font-semibold text-slate-900">{selectedMedDetail.dosageFormId?.name || "Tablet"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Therapeutic Category:</span>
                <span className="font-semibold text-slate-900">{selectedMedDetail.therapeuticCategoryId?.name || "General"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Manufacturer:</span>
                <span className="font-semibold text-slate-900">{selectedMedDetail.manufacturerId?.name || "Direct Supply"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Current In-Stock:</span>
                <span className="font-bold text-emerald-600 text-sm">{selectedMedDetail.totalStock} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Min Stock Safety Threshold:</span>
                <span className="font-semibold text-slate-900">{selectedMedDetail.minStockLevel} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Prescription Status:</span>
                <span className="font-bold text-slate-900">{selectedMedDetail.prescriptionRequired ? "Rx Required" : "OTC Available"}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedMedDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
