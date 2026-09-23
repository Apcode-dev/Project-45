import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { showToast } from "../../utils/toast.js";
import {
  Building2,
  Plus,
  ArrowRightLeft,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  FileText,
  Boxes,
  X,
  ShieldCheck,
} from "lucide-react";

export const BranchesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"branches" | "transfers">("branches");
  const [branches, setBranches] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Branch Modal
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);

  // Initiate Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedMedId, setSelectedMedId] = useState("");
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [transferQty, setTransferQty] = useState("10");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Inward Receiving state
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      if (res.data.success) {
        setBranches(res.data.data);
        if (res.data.data.length > 0 && !fromBranchId) {
          setFromBranchId(res.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const fetchTransfers = async () => {
    try {
      const res = await api.get("/branches/transfers/list");
      if (res.data.success) setTransfers(res.data.data);
    } catch (err) {
      console.error("Failed to load transfers:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchBranches(), fetchTransfers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // When medicine changes in transfer modal, load its batches
  useEffect(() => {
    if (!selectedMedId) {
      setAvailableBatches([]);
      return;
    }

    const fetchBatches = async () => {
      try {
        const res = await api.get(`/batches?medicineId=${selectedMedId}&status=ACTIVE`);
        if (res.data.success) {
          const valid = res.data.data.filter((b: any) => b.quantity > 0);
          setAvailableBatches(valid);
          if (valid.length > 0) setSelectedBatchId(valid[0]._id);
        }
      } catch (err) {
        console.error("Failed to load batches for transfer:", err);
      }
    };

    fetchBatches();
  }, [selectedMedId]);

  const openTransferModal = async () => {
    setTransferError(null);
    try {
      const medRes = await api.get("/medicines?limit=100");
      if (medRes.data.success) {
        setMedicines(medRes.data.data);
        if (medRes.data.data.length > 0) setSelectedMedId(medRes.data.data[0]._id);
      }
      setShowTransferModal(true);
    } catch (err) {
      console.error("Failed to load medicines:", err);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranch(true);
    try {
      const res = await api.post("/branches", {
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        address: branchAddress.trim() || undefined,
        phone: branchPhone.trim() || undefined,
        isMain,
      });

      if (res.data.success) {
        showToast.success(`Branch "${branchName}" created successfully!`);
        setShowBranchModal(false);
        setBranchName("");
        setBranchCode("");
        setBranchAddress("");
        setBranchPhone("");
        fetchBranches();
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.message || "Failed to create branch.");
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDispatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!fromBranchId || !toBranchId) {
      setTransferError("Please select both source and destination branches.");
      return;
    }

    if (fromBranchId === toBranchId) {
      setTransferError("Source and Destination branches cannot be the same.");
      return;
    }

    if (!selectedBatchId) {
      setTransferError("Please select a batch to transfer.");
      return;
    }

    if (!transferQty || Number(transferQty) <= 0) {
      setTransferError("Transfer quantity must be greater than zero.");
      return;
    }

    setTransferring(true);
    try {
      const payload = {
        fromBranchId,
        toBranchId,
        notes: transferNotes.trim() || undefined,
        items: [
          {
            batchId: selectedBatchId,
            quantity: Number(transferQty),
          },
        ],
      };

      const res = await api.post("/branches/transfers", payload);
      if (res.data.success) {
        showToast.success("Transfer dispatched successfully!");
        setShowTransferModal(false);
        setTransferNotes("");
        setActiveTab("transfers");
        fetchTransfers();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Transfer dispatch failed.";
      setTransferError(errMsg);
      showToast.error(errMsg);
    } finally {
      setTransferring(false);
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    setReceivingId(transferId);
    try {
      const res = await api.put(`/branches/transfers/${transferId}/receive`);
      if (res.data.success) {
        showToast.success("Stock received into destination inventory successfully!");
        fetchTransfers();
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.message || "Failed to receive transfer.");
    } finally {
      setReceivingId(null);
    }
  };

  const inTransitCount = transfers.filter((t) => t.status === "DISPATCHED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-600" />
            Multi-Branch Network & Stock Transfers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage satellite pharmacies, ICU wards, and orchestrate inter-facility stock requisitions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowBranchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            Add Branch / Ward
          </button>
          <button
            onClick={openTransferModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Initiate Stock Transfer
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Branches</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{branches.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">In-Transit Shipments</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{inTransitCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Transfers</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {transfers.filter((t) => t.status === "RECEIVED").length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex gap-1">
        <button
          onClick={() => setActiveTab("branches")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "branches"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Branches & Hospital Satellite Units ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "transfers"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Inter-Branch Stock Movement Ledger ({transfers.length})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          Loading branch infrastructure...
        </div>
      ) : activeTab === "branches" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((b) => (
            <div
              key={b._id}
              className={`p-5 rounded-2xl bg-white border transition-all space-y-3 ${
                b.isMain
                  ? "border-emerald-300 shadow-sm ring-1 ring-emerald-200"
                  : "border-slate-200 shadow-xs hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {b.code}
                    </span>
                    {b.isMain && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Primary Facility
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{b.name}</h3>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    b.isMain ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {b.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{b.address}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Tab: Stock Transfers Ledger */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">From (Source)</th>
                  <th className="py-3 px-4">To (Destination)</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4">Dispatched Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No stock transfers recorded. Click "Initiate Stock Transfer" to move medicines between facilities.
                    </td>
                  </tr>
                ) : (
                  transfers.map((trf) => (
                    <tr key={trf._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {trf.transferNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900">{trf.fromBranchId?.name}</span>
                        <div className="text-xs text-slate-400 font-mono">{trf.fromBranchId?.code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900">{trf.toBranchId?.name}</span>
                        <div className="text-xs text-slate-400 font-mono">{trf.toBranchId?.code}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        {trf.items?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0)} units
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {new Date(trf.dispatchedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            trf.status === "RECEIVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {trf.status === "RECEIVED" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Truck className="w-3 h-3" />
                          )}
                          {trf.status === "DISPATCHED" ? "IN TRANSIT" : trf.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {trf.status === "DISPATCHED" && (
                          <button
                            onClick={() => handleReceiveTransfer(trf._id)}
                            disabled={receivingId === trf._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                          >
                            {receivingId === trf._id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Boxes className="w-3.5 h-3.5" />
                            )}
                            Receive Inward
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Register Branch / Satellite
              </h2>
              <button
                onClick={() => setShowBranchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Block Satellite Pharmacy"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unique Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMG-01"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="Wing / Floor / Room"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 Ext 402"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBranch}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {savingBranch && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Register Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Initiate Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                Initiate Inter-Branch Requisition
              </h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {transferError}
              </div>
            )}

            <form onSubmit={handleDispatchTransfer} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Facility (From)</label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => setFromBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Facility (To)</label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Destination --</option>
                    {branches
                      .filter((b) => b._id !== fromBranchId)
                      .map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Medicine to Transfer</label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.genericName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Batch</label>
                  {availableBatches.length === 0 ? (
                    <div className="p-2 text-xs text-rose-600 bg-rose-50 rounded-lg">No active batches</div>
                  ) : (
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableBatches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.batchNumber} (Avail: {b.quantity})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Requisition Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent top-up for overnight emergency supply"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || availableBatches.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {transferring && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Dispatch Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
