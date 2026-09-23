import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { showToast } from "../../utils/toast.js";
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
  Layers,
  Bookmark,
  Factory,
} from "lucide-react";

export const MedicinesPage: React.FC = () => {
  // Top Active Tab: "medicines" (Drug Formulary) | "masters" (Forms, Categories, Manufacturers)
  const [activeMainTab, setActiveMainTab] = useState<"medicines" | "masters">("medicines");

  // Master subtab: "forms" | "categories" | "manufacturers"
  const [activeMasterSubtab, setActiveMasterSubtab] = useState<"forms" | "categories" | "manufacturers">("forms");

  // Medicine list state
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
  const [editingMedicine, setEditingMedicine] = useState<any | null>(null);

  // Quick Inline Modals (for creating master records on the fly)
  const [quickModal, setQuickModal] = useState<"form" | "category" | "manufacturer" | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickExtra, setQuickExtra] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  // Edit Master Record Modals
  const [editingMasterItem, setEditingMasterItem] = useState<{
    type: "form" | "category" | "manufacturer";
    id: string;
    name: string;
    extra: string;
    email?: string;
    phone?: string;
  } | null>(null);

  // Form State for Add Medicine
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

  const showNotification = (msg: string) => {
    showToast.success(msg);
  };

  // Add Medicine
  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      const res = await api.post("/medicines", formData);
      if (res.data.success) {
        setShowAddModal(false);
        showNotification(`Medicine "${formData.name}" added to master catalog.`);
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

  // Edit Medicine
  const handleUpdateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;
    setFormSaving(true);
    setFormError(null);

    try {
      const res = await api.put(`/medicines/${editingMedicine._id}`, editingMedicine);
      if (res.data.success) {
        setEditingMedicine(null);
        showNotification(`Medicine "${editingMedicine.name}" updated successfully.`);
        fetchMedicines();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to update medicine");
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Medicine (Permanently deletes from MongoDB Atlas if no sales)
  const handleDeleteMedicine = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?\n\nThis will remove it completely from the database to keep storage clean.`)) return;
    try {
      const res = await api.delete(`/medicines/${id}`);
      showNotification(res.data.message || `Medicine "${name}" deleted from database.`);
      fetchMedicines();
    } catch (err: any) {
      showToast.error(err.response?.data?.error || "Failed to delete medicine");
    }
  };

  // Quick Add Master Record
  const handleQuickAddMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    setQuickSaving(true);

    try {
      if (quickModal === "form") {
        const res = await api.post("/categories/dosage-forms", {
          name: quickName.trim(),
          shortName: quickExtra.trim() || undefined,
        });
        await fetchDropdowns();
        if (showAddModal) setFormData((prev) => ({ ...prev, dosageFormId: res.data.data?._id }));
        if (editingMedicine) setEditingMedicine((prev: any) => ({ ...prev, dosageFormId: res.data.data?._id }));
        showNotification(`Dosage Form "${quickName}" added successfully.`);
      } else if (quickModal === "category") {
        const res = await api.post("/categories", {
          name: quickName.trim(),
          type: "THERAPEUTIC",
          description: quickExtra.trim() || undefined,
        });
        await fetchDropdowns();
        if (showAddModal) setFormData((prev) => ({ ...prev, therapeuticCategoryId: res.data.data?._id }));
        if (editingMedicine) setEditingMedicine((prev: any) => ({ ...prev, therapeuticCategoryId: res.data.data?._id }));
        showNotification(`Therapeutic Category "${quickName}" added successfully.`);
      } else if (quickModal === "manufacturer") {
        const res = await api.post("/manufacturers", {
          name: quickName.trim(),
          country: quickExtra.trim() || "India",
          contactEmail: quickEmail.trim() || undefined,
          phone: quickPhone.trim() || undefined,
        });
        await fetchDropdowns();
        if (showAddModal) setFormData((prev) => ({ ...prev, manufacturerId: res.data.data?._id }));
        if (editingMedicine) setEditingMedicine((prev: any) => ({ ...prev, manufacturerId: res.data.data?._id }));
        showNotification(`Manufacturer "${quickName}" added successfully.`);
      }

      setQuickModal(null);
      setQuickName("");
      setQuickExtra("");
      setQuickEmail("");
      setQuickPhone("");
    } catch (err: any) {
      showToast.error(err.response?.data?.error || "Failed to add master record");
    } finally {
      setQuickSaving(false);
    }
  };

  // Update Existing Master Record
  const handleUpdateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMasterItem) return;
    setQuickSaving(true);

    try {
      if (editingMasterItem.type === "form") {
        await api.put(`/categories/dosage-forms/${editingMasterItem.id}`, {
          name: editingMasterItem.name.trim(),
          shortName: editingMasterItem.extra.trim() || undefined,
        });
        showNotification(`Dosage Form "${editingMasterItem.name}" updated.`);
      } else if (editingMasterItem.type === "category") {
        await api.put(`/categories/${editingMasterItem.id}`, {
          name: editingMasterItem.name.trim(),
          description: editingMasterItem.extra.trim() || undefined,
        });
        showNotification(`Therapeutic Category "${editingMasterItem.name}" updated.`);
      } else if (editingMasterItem.type === "manufacturer") {
        await api.put(`/manufacturers/${editingMasterItem.id}`, {
          name: editingMasterItem.name.trim(),
          country: editingMasterItem.extra.trim() || "India",
          contactEmail: editingMasterItem.email?.trim() || undefined,
          phone: editingMasterItem.phone?.trim() || undefined,
        });
        showNotification(`Manufacturer "${editingMasterItem.name}" updated.`);
      }

      setEditingMasterItem(null);
      await fetchDropdowns();
    } catch (err: any) {
      showToast.error(err.response?.data?.error || "Failed to update master record");
    } finally {
      setQuickSaving(false);
    }
  };

  // Delete Master Record
  const handleDeleteMaster = async (type: "form" | "category" | "manufacturer", id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?\n\nThis will remove it from the database.`)) return;

    try {
      if (type === "form") {
        await api.delete(`/categories/dosage-forms/${id}`);
        showNotification(`Dosage Form "${name}" deleted.`);
      } else if (type === "category") {
        await api.delete(`/categories/${id}`);
        showNotification(`Therapeutic Category "${name}" deleted.`);
      } else if (type === "manufacturer") {
        await api.delete(`/manufacturers/${id}`);
        showNotification(`Manufacturer "${name}" deleted.`);
      }
      await fetchDropdowns();
    } catch (err: any) {
      showToast.error(err.response?.data?.error || "Failed to delete item");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Module 04
            </span>
            <span className="text-xs text-slate-500">Master Drug Formulary &amp; Specifications</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Medicine &amp; Master Management</h1>
        </div>

        <div className="flex items-center space-x-2.5">
          {activeMainTab === "medicines" ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Medicine</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (activeMasterSubtab === "forms") setQuickModal("form");
                else if (activeMasterSubtab === "categories") setQuickModal("category");
                else setQuickModal("manufacturer");
              }}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                Add New {activeMasterSubtab === "forms" ? "Dosage Form" : activeMasterSubtab === "categories" ? "Category" : "Manufacturer"}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              fetchDropdowns();
              fetchMedicines();
            }}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Mode Navigation Switcher */}
      <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-2xl w-fit border border-slate-300/60 shadow-xs">
        <button
          onClick={() => setActiveMainTab("medicines")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === "medicines"
              ? "bg-white text-emerald-700 shadow-sm shadow-slate-300"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medicine Catalog ({medicines.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab("masters")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === "masters"
              ? "bg-white text-emerald-700 shadow-sm shadow-slate-300"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Master Specifications (Forms, Categories, Manufacturers)</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* TAB 1: MEDICINES CATALOG */}
      {activeMainTab === "medicines" && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by brand name, generic name, active drug composition..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
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

              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border ${
                  lowStockOnly
                    ? "bg-amber-500 text-white border-amber-600"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock</span>
              </button>
            </div>
          </div>

          {/* Medicines Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Medicine &amp; Formula</th>
                    <th className="px-5 py-3.5">Form &amp; Category</th>
                    <th className="px-5 py-3.5">Manufacturer</th>
                    <th className="px-5 py-3.5">Strength / Unit</th>
                    <th className="px-5 py-3.5">Stock Status</th>
                    <th className="px-5 py-3.5">Primary Code</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Loading medicine catalog...</span>
                      </td>
                    </tr>
                  ) : medicines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No medicines found</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Click "Add New Medicine" to add drugs with Dosage Forms, Categories and Manufacturers.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    medicines.map((med) => (
                      <tr key={med._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-sm">{med.name}</div>
                          <div className="text-slate-500 text-[11px]">{med.genericName}</div>
                          {med.prescriptionRequired && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700">
                              Rx Required
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">
                            {med.dosageFormId?.name || "Tablet"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {med.therapeuticCategoryId?.name || "General"}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800 flex items-center space-x-1">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{med.manufacturerId?.name || "Direct Supply"}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-800">{med.strength}</span>
                          <span className="text-slate-400 text-[11px]"> / {med.unit}</span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                med.isOutOfStock
                                  ? "bg-rose-500"
                                  : med.isLowStock
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                            <span className="font-bold text-slate-900">{med.totalStock}</span>
                            <span className="text-[10px] text-slate-400">units</span>
                          </div>
                          {med.isLowStock && !med.isOutOfStock && (
                            <span className="text-[10px] font-bold text-amber-600 block">Low Stock (&le; {med.minStockLevel})</span>
                          )}
                          {med.isOutOfStock && (
                            <span className="text-[10px] font-bold text-rose-600 block">Out of Stock</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {med.primaryCode ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 rounded-md font-mono text-[11px] text-slate-700">
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
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingMedicine({
                                  _id: med._id,
                                  name: med.name,
                                  brandName: med.brandName || "",
                                  genericName: med.genericName,
                                  strength: med.strength,
                                  dosageFormId: med.dosageFormId?._id || med.dosageFormId || "",
                                  therapeuticCategoryId: med.therapeuticCategoryId?._id || med.therapeuticCategoryId || "",
                                  manufacturerId: med.manufacturerId?._id || med.manufacturerId || "",
                                  composition: med.composition || "",
                                  prescriptionRequired: med.prescriptionRequired || false,
                                  minStockLevel: med.minStockLevel || 20,
                                  maxStockLevel: med.maxStockLevel || 500,
                                  unit: med.unit || "Strip",
                                });
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Medicine Specifications"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteMedicine(med._id, med.name)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Permanently Delete Medicine"
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
        </div>
      )}

      {/* TAB 2: MASTER SPECIFICATIONS */}
      {activeMainTab === "masters" && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 flex-wrap gap-y-2">
            <button
              onClick={() => setActiveMasterSubtab("forms")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMasterSubtab === "forms"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Dosage Forms ({dosageForms.length})</span>
            </button>

            <button
              onClick={() => setActiveMasterSubtab("categories")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMasterSubtab === "categories"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Therapeutic Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveMasterSubtab("manufacturers")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMasterSubtab === "manufacturers"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>Manufacturers / Companies ({manufacturers.length})</span>
            </button>
          </div>

          {/* 1. DOSAGE FORMS TABLE */}
          {activeMasterSubtab === "forms" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Dosage Forms Master (खुराक के रूप)</h3>
                  <p className="text-slate-500 text-[11px]">Define medicine formats like Tablet, Capsule, Syrup, Injection etc.</p>
                </div>
                <button
                  onClick={() => setQuickModal("form")}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Dosage Form</span>
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="px-5 py-3">Form Name</th>
                    <th className="px-5 py-3">Short Abbreviation</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dosageForms.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-400">No dosage forms added yet.</td>
                    </tr>
                  ) : (
                    dosageForms.map((df) => (
                      <tr key={df._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-900">{df.name}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                            {df.shortName || "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right space-x-2">
                          <button
                            onClick={() =>
                              setEditingMasterItem({
                                type: "form",
                                id: df._id,
                                name: df.name,
                                extra: df.shortName || "",
                              })
                            }
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaster("form", df._id, df.name)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. THERAPEUTIC CATEGORIES TABLE */}
          {activeMasterSubtab === "categories" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Therapeutic Categories (चिकित्सीय श्रेणियाँ)</h3>
                  <p className="text-slate-500 text-[11px]">Define drug classifications like Antibiotics, Analgesics, Antidiabetics etc.</p>
                </div>
                <button
                  onClick={() => setQuickModal("category")}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="px-5 py-3">Category Name</th>
                    <th className="px-5 py-3">Description &amp; Indication</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-400">No therapeutic categories added yet.</td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-900">{cat.name}</td>
                        <td className="px-5 py-3 text-slate-500">{cat.description || "-"}</td>
                        <td className="px-5 py-3 text-right space-x-2">
                          <button
                            onClick={() =>
                              setEditingMasterItem({
                                type: "category",
                                id: cat._id,
                                name: cat.name,
                                extra: cat.description || "",
                              })
                            }
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaster("category", cat._id, cat.name)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. MANUFACTURERS TABLE */}
          {activeMasterSubtab === "manufacturers" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Manufacturers &amp; Companies (दवा निर्माता)</h3>
                  <p className="text-slate-500 text-[11px]">Manage pharmaceutical brands, companies and supply contacts.</p>
                </div>
                <button
                  onClick={() => setQuickModal("manufacturer")}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Manufacturer</span>
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="px-5 py-3">Company Name</th>
                    <th className="px-5 py-3">Country</th>
                    <th className="px-5 py-3">Contact Email</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {manufacturers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">No manufacturers added yet.</td>
                    </tr>
                  ) : (
                    manufacturers.map((mfg) => (
                      <tr key={mfg._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-900">{mfg.name}</td>
                        <td className="px-5 py-3 text-slate-600">{mfg.country || "India"}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">{mfg.contactEmail || "-"}</td>
                        <td className="px-5 py-3 text-slate-500">{mfg.phone || "-"}</td>
                        <td className="px-5 py-3 text-right space-x-2">
                          <button
                            onClick={() =>
                              setEditingMasterItem({
                                type: "manufacturer",
                                id: mfg._id,
                                name: mfg.name,
                                extra: mfg.country || "India",
                                email: mfg.contactEmail || "",
                                phone: mfg.phone || "",
                              })
                            }
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaster("manufacturer", mfg._id, mfg.name)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD MEDICINE MODAL */}
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
                  <p className="text-xs text-slate-500">Register product specifications, forms, and barcodes</p>
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
                    placeholder="e.g. Dolo 650, Augmentin 625, Pan-D"
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

              {/* STRENGTH, DOSAGE FORM (WITH + NEW), THERAPEUTIC CATEGORY (WITH + NEW) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    required
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    placeholder="e.g. 650mg, 500mg, 10ml"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Dosage Form</label>
                    <button
                      type="button"
                      onClick={() => setQuickModal("form")}
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                      title="Add New Dosage Form"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <select
                    value={formData.dosageFormId}
                    onChange={(e) => setFormData({ ...formData, dosageFormId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Dosage Form</option>
                    {dosageForms.map((df) => (
                      <option key={df._id} value={df._id}>{df.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Therapeutic Category</label>
                    <button
                      type="button"
                      onClick={() => setQuickModal("category")}
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                      title="Add New Category"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
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

              {/* MANUFACTURER (WITH + NEW) & UNIT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Manufacturer / Company</label>
                    <button
                      type="button"
                      onClick={() => setQuickModal("manufacturer")}
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                      title="Add New Manufacturer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {formSaving ? "Saving..." : "Save Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEDICINE MODAL */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Medicine Specifications</h3>
                  <p className="text-xs text-slate-500">Update forms, categories, manufacturer, and parameters</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMedicine(null)}
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

            <form onSubmit={handleUpdateMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={editingMedicine.name}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic / Active Drug *</label>
                  <input
                    type="text"
                    required
                    value={editingMedicine.genericName}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    required
                    value={editingMedicine.strength}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, strength: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Dosage Form</label>
                    <button
                      type="button"
                      onClick={() => setQuickModal("form")}
                      className="text-blue-600 hover:text-blue-700 font-bold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <select
                    value={editingMedicine.dosageFormId}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, dosageFormId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Dosage Form</option>
                    {dosageForms.map((df) => (
                      <option key={df._id} value={df._id}>{df.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Therapeutic Category</label>
                    <button
                      type="button"
                      onClick={() => setQuickModal("category")}
                      className="text-blue-600 hover:text-blue-700 font-bold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <select
                    value={editingMedicine.therapeuticCategoryId}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, therapeuticCategoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Manufacturer / Company</label>
                    <button
                      type="button"
                      onClick={() => setQuickModal("manufacturer")}
                      className="text-blue-600 hover:text-blue-700 font-bold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <select
                    value={editingMedicine.manufacturerId}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, manufacturerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                    value={editingMedicine.unit}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Warning Level</label>
                  <input
                    type="number"
                    value={editingMedicine.minStockLevel}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, minStockLevel: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Stock Target</label>
                  <input
                    type="number"
                    value={editingMedicine.maxStockLevel}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, maxStockLevel: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingMedicine.prescriptionRequired}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, prescriptionRequired: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <span className="font-bold text-slate-800">Requires Rx</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {formSaving ? "Saving..." : "Update Specifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL */}
      {quickModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {quickModal === "form" && "Add New Dosage Form (खुराक का रूप)"}
                {quickModal === "category" && "Add New Therapeutic Category (चिकित्सीय श्रेणी)"}
                {quickModal === "manufacturer" && "Add New Manufacturer / Company (दवा निर्माता)"}
              </h3>
              <button
                onClick={() => setQuickModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddMaster} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {quickModal === "form" && "Dosage Form Name * (e.g. Tablet, Capsule, Syrup)"}
                  {quickModal === "category" && "Category Name * (e.g. Antibiotics, Painkiller)"}
                  {quickModal === "manufacturer" && "Company Name * (e.g. Cipla, Sun Pharma)"}
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {quickModal === "form" && "Short Code / Abbreviation (e.g. Tab, Cap, Syr)"}
                  {quickModal === "category" && "Description / Medical Indication (Optional)"}
                  {quickModal === "manufacturer" && "Country of Origin"}
                </label>
                <input
                  type="text"
                  value={quickExtra}
                  onChange={(e) => setQuickExtra(e.target.value)}
                  placeholder={
                    quickModal === "form"
                      ? "e.g. Tab"
                      : quickModal === "category"
                      ? "e.g. Bacterial infections and fever"
                      : "e.g. India"
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {quickModal === "manufacturer" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Email (Optional)</label>
                    <input
                      type="email"
                      value={quickEmail}
                      onChange={(e) => setQuickEmail(e.target.value)}
                      placeholder="e.g. info@company.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      value={quickPhone}
                      onChange={(e) => setQuickPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {quickSaving ? "Saving..." : "Save to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MASTER RECORD MODAL */}
      {editingMasterItem && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                Edit {editingMasterItem.type === "form" ? "Dosage Form" : editingMasterItem.type === "category" ? "Category" : "Manufacturer"}
              </h3>
              <button
                onClick={() => setEditingMasterItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaster} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={editingMasterItem.name}
                  onChange={(e) => setEditingMasterItem({ ...editingMasterItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingMasterItem.type === "form" && "Short Code / Abbreviation"}
                  {editingMasterItem.type === "category" && "Description / Indication"}
                  {editingMasterItem.type === "manufacturer" && "Country"}
                </label>
                <input
                  type="text"
                  value={editingMasterItem.extra}
                  onChange={(e) => setEditingMasterItem({ ...editingMasterItem, extra: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {editingMasterItem.type === "manufacturer" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={editingMasterItem.email || ""}
                      onChange={(e) => setEditingMasterItem({ ...editingMasterItem, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingMasterItem.phone || ""}
                      onChange={(e) => setEditingMasterItem({ ...editingMasterItem, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMasterItem(null)}
                  className="px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {quickSaving ? "Saving..." : "Update Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
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
