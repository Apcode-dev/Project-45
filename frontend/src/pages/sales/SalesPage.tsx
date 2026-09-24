import React, { useEffect, useState, useRef } from "react";
import { api } from "../../services/api.js";
import { showToast } from "../../utils/toast.js";
import {
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  RotateCcw,
  User,
  Phone,
  FileText,
  CreditCard,
  QrCode,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  Sparkles,
  Camera,
  Upload,
  Flashlight,
} from "lucide-react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

interface CartItem {
  medicineId: string;
  name: string;
  genericName: string;
  dosageForm?: string;
  prescriptionRequired?: boolean;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  availableStock: number;
  quantity: number;
  unitPrice: number;
  total: number;
  batches: any[];
}

export const SalesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // Search & Medicines for POS
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "CREDIT">("CASH");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [submittingSale, setSubmittingSale] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

  // Sales History State
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Invoice / Receipt Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Refund Modal
  const [refundSale, setRefundSale] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundRestock, setRefundRestock] = useState(true);
  const [refunding, setRefunding] = useState(false);

  // POS Camera Scanner Modal State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [itemNotFoundModal, setItemNotFoundModal] = useState<{ show: boolean; code: string } | null>(null);
  const [scanSuccessToast, setScanSuccessToast] = useState<string | null>(null);

  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanTimerRef = useRef<any>(null);
  const zxingReaderRef = useRef<any>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const [ocrLoading, setOcrLoading] = useState(false);

  const imageToBase64 = (source: File | Blob | HTMLCanvasElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (source instanceof HTMLCanvasElement) {
        resolve(source.toDataURL("image/jpeg", 0.85));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  };

  const recognizePosImageText = async (imageSource: File | Blob | HTMLCanvasElement) => {
    setOcrLoading(true);
    try {
      const base64 = await imageToBase64(imageSource);
      const visionRes = await api.post("/scanner/vision-scan", { imageBase64: base64 });
      if (visionRes.data.success && visionRes.data.data) {
        const data = visionRes.data.data;
        const code = data.extractedInfo?.batchNumber || data.code || "";
        if (code) {
          handleScannedCode(code);
        } else {
          showToast.error("Label text se batch code extract nahi ho paya.");
        }
      }
    } catch (err) {
      console.error("POS Vision Scan Error:", err);
      showToast.error("Gemini AI Vision label read nahi kar paya.");
    } finally {
      setOcrLoading(false);
    }
  };

  const capturePosCameraFrame = async () => {
    if (!scannerVideoRef.current) return;
    const video = scannerVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    await recognizePosImageText(canvas);
  };

  const handlePosImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await recognizePosImageText(file);
  };

  // Web Audio API Beep on successful scan
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {}
  };

  // Configure high-performance ZXing MultiFormat reader for POS barcode scanning
  const createPosZxingReader = () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, 200);
    reader.timeBetweenDecodingAttempts = 60;
    return reader;
  };

  const stopPosCamera = () => {
    if (scanTimerRef.current) {
      cancelAnimationFrame(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.stopContinuousDecode();
      } catch {}
      zxingReaderRef.current = null;
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((t) => t.stop());
      scannerStreamRef.current = null;
    }
    if (scannerVideoRef.current) {
      scannerVideoRef.current.srcObject = null;
    }
    setTorchOn(false);
  };

  const openPosScanner = () => {
    setItemNotFoundModal(null);
    setShowScannerModal(true);
  };

  const closePosScanner = () => {
    stopPosCamera();
    setShowScannerModal(false);
  };

  const startPosCamera = async (desiredFacing: "environment" | "user" = facingMode) => {
    setScannerLoading(true);
    setScannerError(null);
    stopPosCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Aapka browser camera access support nahi karta. Please use Chrome, Safari or Edge.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: desiredFacing ? { ideal: desiredFacing } : "environment",
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: desiredFacing ? { ideal: desiredFacing } : "environment" },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      scannerStreamRef.current = stream;

      // Enable continuous autofocus if supported on device
      try {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
        if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
          track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] }).catch(() => {});
        }
        setTorchSupported(!!capabilities.torch);
      } catch {
        setTorchSupported(false);
      }

      const applyStream = () => {
        const vid = scannerVideoRef.current;
        if (vid && stream) {
          vid.muted = true;
          vid.setAttribute("playsinline", "true");
          vid.setAttribute("webkit-playsinline", "true");
          if (vid.srcObject !== stream) {
            vid.srcObject = stream;
          }
          vid.play().catch((e) => console.warn("Video play exception:", e));
          return true;
        }
        return false;
      };

      if (!applyStream()) {
        setTimeout(applyStream, 50);
        setTimeout(applyStream, 150);
        setTimeout(applyStream, 300);
      }

      setScannerLoading(false);
      startScanningEngine();
    } catch (err: any) {
      setScannerLoading(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setScannerError("Camera permission blocked! Browser address bar me Camera icon par click karke 'Allow' karein.");
      } else {
        setScannerError(`Camera open nahi ho paya: ${err.message || err.name}`);
      }
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startPosCamera(nextMode);
  };

  const toggleTorch = async () => {
    if (!scannerStreamRef.current) return;
    const track = scannerStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: nextTorch } as any] });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch error:", e);
    }
  };

  const handleScannedCode = async (rawCode: string) => {
    const code = (rawCode || "").trim();
    if (!code) return;

    // Prevent duplicate triggers
    if (Date.now() - lastScannedTimeRef.current < 2500) return;
    lastScannedTimeRef.current = Date.now();

    playBeep();
    // Stop camera and immediately close the scanner popup
    closePosScanner();

    try {
      const res = await api.get(`/scanner/lookup/${encodeURIComponent(code)}`);
      if (res.data.success && res.data.data?.found && res.data.data?.medicine) {
        // Product found in inventory -> Automatically add to bill cart
        const med = res.data.data.medicine;
        await handleAddToCart(med);
        setScanSuccessToast(`Scanned & Added: "${med.name}"`);
        setTimeout(() => setScanSuccessToast(null), 3500);
      } else {
        // Product NOT found in inventory -> Popup "Item Not Available" message
        setItemNotFoundModal({ show: true, code });
      }
    } catch {
      setItemNotFoundModal({ show: true, code });
    }
  };

  const startScanningEngine = async () => {
    const waitForVideo = (): Promise<void> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
          if (scannerVideoRef.current && scannerVideoRef.current.videoWidth > 0 && scannerVideoRef.current.readyState >= 2) {
            resolve();
          } else if (attempts < 40) {
            attempts++;
            setTimeout(check, 100);
          } else {
            resolve();
          }
        };
        check();
      });
    };

    await waitForVideo();
    if (!scannerVideoRef.current || !scannerStreamRef.current) return;

    // 1. ZXing continuous scanner (all 1D & 2D formats with TRY_HARDER)
    try {
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.stopContinuousDecode();
        } catch {}
      }
      const reader = createPosZxingReader();
      zxingReaderRef.current = reader;
      reader.decodeContinuously(scannerVideoRef.current, (result: any) => {
        if (result) {
          const text = result.getText ? result.getText() : result.text;
          if (text) {
            handleScannedCode(text);
          }
        }
      });
    } catch (e) {
      console.warn("ZXing scanner continuous init error:", e);
    }

    // 2. Parallel Native BarcodeDetector (instant hardware decoding where supported)
    if ("BarcodeDetector" in window) {
      try {
        let detector: any = null;
        try {
          detector = new (window as any).BarcodeDetector();
        } catch {
          detector = new (window as any).BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a"],
          });
        }

        if (detector) {
          const detectFrame = async () => {
            if (!scannerVideoRef.current || !scannerStreamRef.current) return;
            if (scannerVideoRef.current.readyState >= 2 && scannerVideoRef.current.videoWidth > 0) {
              try {
                const barcodes = await detector.detect(scannerVideoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleScannedCode(barcodes[0].rawValue);
                  return;
                }
              } catch {}
            }
            scanTimerRef.current = requestAnimationFrame(detectFrame);
          };
          scanTimerRef.current = requestAnimationFrame(detectFrame);
        }
      } catch (e) {
        console.warn("BarcodeDetector error, ZXing running:", e);
      }
    }
  };

  // Camera lifecycle tied to modal state
  useEffect(() => {
    if (showScannerModal) {
      startPosCamera(facingMode);
    } else {
      stopPosCamera();
    }
  }, [showScannerModal]);

  // Keep video element connected and playing if stream is active
  useEffect(() => {
    if (showScannerModal && scannerVideoRef.current && scannerStreamRef.current) {
      const vid = scannerVideoRef.current;
      if (vid.srcObject !== scannerStreamRef.current) {
        vid.srcObject = scannerStreamRef.current;
      }
      vid.muted = true;
      vid.setAttribute("playsinline", "true");
      vid.setAttribute("webkit-playsinline", "true");
      vid.play().catch(() => {});
    }
  }, [showScannerModal, scannerLoading]);

  useEffect(() => {
    return () => {
      stopPosCamera();
    };
  }, []);

  // Search medicines for POS live dropdown
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/medicines?search=${encodeURIComponent(searchQuery)}&limit=8`);
        if (res.data.success) {
          setSearchResults(res.data.data);
        }
      } catch (err) {
        console.error("Error searching medicines:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Fetch sales history
  const fetchSalesHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historySearch) params.append("search", historySearch);
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get(`/sales?${params.toString()}`);
      if (res.data.success) {
        setSalesHistory(res.data.data);
      }
    } catch (err) {
      console.error("Error loading sales history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      const timer = setTimeout(() => {
        fetchSalesHistory();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, historySearch, statusFilter]);

  // Add Medicine to Cart with FEFO auto-allocation
  const handleAddToCart = async (medicine: any) => {
    setPosError(null);

    // Check if already in cart
    const existingIndex = cart.findIndex((it) => it.medicineId === medicine._id);
    if (existingIndex > -1) {
      const updated = [...cart];
      if (updated[existingIndex].quantity < updated[existingIndex].availableStock) {
        updated[existingIndex].quantity += 1;
        updated[existingIndex].total = Number(
          (updated[existingIndex].quantity * updated[existingIndex].unitPrice).toFixed(2)
        );
        setCart(updated);
      } else {
        setPosError(`Cannot add more than available batch stock (${updated[existingIndex].availableStock}).`);
      }
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    // Fetch active batches for this medicine
    try {
      const batchRes = await api.get(`/batches?medicineId=${medicine._id}&status=ACTIVE&fefoSort=true`);
      const batches = batchRes.data?.data || [];
      const validBatches = batches.filter(
        (b: any) => new Date(b.expiryDate) > new Date() && b.quantity > 0
      );

      if (validBatches.length === 0) {
        setPosError(`No active, unexpired batches available for '${medicine.name}'. Cannot dispense.`);
        return;
      }

      // Auto-FEFO: First batch is the earliest expiry
      const fefoBatch = validBatches[0];
      const price = Number(fefoBatch.mrp || medicine.unitPrice || 15);

      const newItem: CartItem = {
        medicineId: medicine._id,
        name: medicine.name,
        genericName: medicine.genericName,
        dosageForm: medicine.dosageFormId?.name || "Unit",
        prescriptionRequired: medicine.prescriptionRequired,
        batchId: fefoBatch._id,
        batchNumber: fefoBatch.batchNumber,
        expiryDate: fefoBatch.expiryDate,
        availableStock: fefoBatch.quantity,
        quantity: 1,
        unitPrice: price,
        total: price,
        batches: validBatches,
      };

      setCart([...cart, newItem]);
      showToast.info(`Added "${medicine.name}" to cart.`);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: any) {
      setPosError(err.response?.data?.message || "Failed to load batch data for medicine.");
    }
  };

  // Change batch selection manually
  const handleBatchSelect = (itemIndex: number, batchId: string) => {
    const updated = [...cart];
    const item = updated[itemIndex];
    const selected = item.batches.find((b) => b._id === batchId);
    if (selected) {
      item.batchId = selected._id;
      item.batchNumber = selected.batchNumber;
      item.expiryDate = selected.expiryDate;
      item.availableStock = selected.quantity;
      item.unitPrice = Number(selected.mrp || item.unitPrice);
      item.quantity = Math.min(item.quantity, selected.quantity);
      item.total = Number((item.quantity * item.unitPrice).toFixed(2));
      setCart(updated);
    }
  };

  // Update quantity in cart
  const handleQuantityChange = (itemIndex: number, newQty: number) => {
    const updated = [...cart];
    const item = updated[itemIndex];
    if (newQty <= 0) return;
    if (newQty > item.availableStock) {
      setPosError(`Maximum available in batch ${item.batchNumber} is ${item.availableStock}.`);
      return;
    }
    item.quantity = newQty;
    item.total = Number((item.quantity * item.unitPrice).toFixed(2));
    setCart(updated);
  };

  const handleRemoveFromCart = (itemIndex: number) => {
    setCart(cart.filter((_, idx) => idx !== itemIndex));
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, it) => sum + it.total, 0);
  const grandTotal = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0));

  const hasRxItem = cart.some((it) => it.prescriptionRequired);

  // Submit Sale
  const handleCheckout = async () => {
    setPosError(null);

    if (cart.length === 0) {
      setPosError("Cart is empty. Add medicines to proceed.");
      return;
    }

    if (hasRxItem && !doctorName.trim() && !prescriptionNumber.trim()) {
      setPosError(
        "Cart contains Schedule H/X Rx medicines. Doctor Name and Prescription Number are mandatory."
      );
      return;
    }

    setSubmittingSale(true);
    try {
      const payload = {
        customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: customerPhone.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        prescriptionNumber: prescriptionNumber.trim() || undefined,
        paymentMethod,
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        items: cart.map((it) => ({
          medicineId: it.medicineId,
          batchId: it.batchId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      };

      const res = await api.post("/sales", payload);
      if (res.data.success) {
        showToast.success(`Sale completed! Invoice #${res.data.data?.invoiceNumber || ""}`);
        setSelectedInvoice(res.data.data);
        setShowReceiptModal(true);

        // Reset POS Terminal
        setCart([]);
        setCustomerName("Walk-in Customer");
        setCustomerPhone("");
        setDoctorName("");
        setPrescriptionNumber("");
        setDiscount("0");
        setTax("0");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to complete transaction.";
      setPosError(errMsg);
      showToast.error(errMsg);
    } finally {
      setSubmittingSale(false);
    }
  };

  // Handle Refund
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundSale) return;

    setRefunding(true);
    try {
      const res = await api.post(`/sales/${refundSale._id}/return`, {
        reason: refundReason.trim() || "Customer Return",
        restock: refundRestock,
      });

      if (res.data.success) {
        showToast.success("Refund processed successfully!");
        setRefundSale(null);
        setRefundReason("");
        fetchSalesHistory();
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-emerald-600" />
            Sales & Dispensing POS Counter
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rapid barcode billing, FEFO auto-allocation, patient prescription validation & invoice receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${
              activeTab === "pos"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            POS Terminal
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-4 h-4" />
            Sales History & Invoices
          </button>
        </div>
      </div>

      {activeTab === "pos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Cart & Search Section (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Input with Auto-complete Dropdown & Scanner Button */}
            <div className="relative">
              <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 sm:gap-3">
                <Search className="w-5 h-5 text-slate-400 ml-1 shrink-0" />
                <input
                  type="text"
                  placeholder="Scan Barcode or Search Medicine by Brand / Generic Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none placeholder:text-slate-400 font-medium"
                  autoFocus
                />
                {searching && <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />}

                {/* Quick Camera Scanner Button in Search Bar */}
                <button
                  type="button"
                  onClick={openPosScanner}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/30 cursor-pointer shrink-0 border border-emerald-500/20"
                  title="Open Camera Scanner"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="font-semibold text-[11px] sm:text-xs">Scan</span>
                </button>
              </div>

              {/* Toast when medicine is scanned & auto-added */}
              {scanSuccessToast && (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{scanSuccessToast}</span>
                </div>
              )}

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((med) => (
                    <div
                      key={med._id}
                      onClick={() => handleAddToCart(med)}
                      className="p-3.5 hover:bg-emerald-50/60 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                          {med.name}
                          {med.prescriptionRequired && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">
                              Rx Required
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {med.genericName} • {med.dosageFormId?.name || "Tablet"} • Available:{" "}
                          <span className="font-semibold text-slate-700">{med.totalStock || 0}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-600 font-mono">
                          ₹{med.unitPrice?.toFixed(2) || "15.00"}
                        </div>
                        <span className="text-[11px] font-medium text-emerald-700 group-hover:underline">
                          + Add to Cart
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Error Banner */}
            {posError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{posError}</span>
              </div>
            )}

            {/* Cart Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Current Dispensing Cart ({cart.length} items)
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                  <p className="text-sm font-medium">Cart is currently empty</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Scan a medicine barcode or use search above to add medicines
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                        <th className="py-2.5 px-4">Medicine</th>
                        <th className="py-2.5 px-4">Allocated Batch</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Price (₹)</th>
                        <th className="py-2.5 px-4 text-right">Total (₹)</th>
                        <th className="py-2.5 px-4 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {cart.map((item, idx) => (
                        <tr key={item.medicineId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {item.name}
                              {item.prescriptionRequired && (
                                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-bold rounded">
                                  Rx
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{item.genericName}</div>
                          </td>

                          <td className="py-3 px-4">
                            {item.batches.length > 1 ? (
                              <select
                                value={item.batchId}
                                onChange={(e) => handleBatchSelect(idx, e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-emerald-500"
                              >
                                {item.batches.map((b) => (
                                  <option key={b._id} value={b._id}>
                                    {b.batchNumber} (Exp:{" "}
                                    {new Date(b.expiryDate).toLocaleDateString("en-IN", {
                                      month: "short",
                                      year: "2-digit",
                                    })}
                                    , Qty: {b.quantity})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  {item.batchNumber}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Exp: {new Date(item.expiryDate!).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                              <button
                                onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                                className="px-2 py-1 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.availableStock}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)
                                }
                                className="w-10 text-center font-bold text-xs bg-white border-x border-slate-200 py-1 focus:outline-none"
                              />
                              <button
                                onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                className="px-2 py-1 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                            ₹{item.unitPrice.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{item.total.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRemoveFromCart(idx)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
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
          </div>

          {/* Right: Billing & Checkout Section (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Customer & Doctor Information */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                Customer & Prescription Details
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Patient Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {hasRxItem && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Prescription Required for Schedule H items
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-900 mb-1">
                        Doctor / Prescriber Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="Dr. R. K. Saxena"
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-900 mb-1">
                        Prescription Number / Ref
                      </label>
                      <input
                        type="text"
                        value={prescriptionNumber}
                        onChange={(e) => setPrescriptionNumber(e.target.value)}
                        placeholder="RX-2026-901"
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Payment Method & Invoice Summary
              </h2>

              {/* Payment Methods Grid */}
              <div className="grid grid-cols-4 gap-2">
                {(["CASH", "UPI", "CARD", "CREDIT"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                      paymentMethod === method
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Discounts & Tax */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Applicable GST / Tax (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Financial Totals */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono font-semibold">-₹{Number(discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(tax) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (GST):</span>
                    <span className="font-mono font-semibold">+₹{Number(tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Due:</span>
                  <span className="text-2xl font-mono text-emerald-600">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                disabled={cart.length === 0 || submittingSale}
                onClick={handleCheckout}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingSale ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Printer className="w-5 h-5" />
                )}
                Dispense & Print Receipt
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Sales History */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by invoice #, customer name, phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
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
                <option value="COMPLETED">Completed</option>
                <option value="REFUNDED">Refunded / Returned</option>
              </select>

              <button
                onClick={() => fetchSalesHistory()}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                title="Refresh sales history"
              >
                <RefreshCw className={`w-4 h-4 ${historyLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        Loading sales transactions...
                      </td>
                    </tr>
                  ) : salesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No sales transactions found matching query.
                      </td>
                    </tr>
                  ) : (
                    salesHistory.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {s.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{s.customerName}</div>
                          {s.customerPhone && (
                            <div className="text-xs text-slate-500">{s.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {new Date(s.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium">
                          {s.items?.length || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{s.grandTotal?.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              s.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedInvoice(s);
                                setShowReceiptModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                              title="View & Print Receipt"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {s.status === "COMPLETED" && (
                              <button
                                onClick={() => setRefundSale(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 transition-all"
                                title="Process Refund / Return"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Return
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
      )}

      {/* Printable Invoice / Receipt Modal */}
      {showReceiptModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Pharmacy Receipt
              </span>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Content */}
            <div id="receipt-print-area" className="py-4 space-y-4 font-sans text-slate-800">
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  APEX MED-SYSTEM PHARMACY
                </h2>
                <p className="text-xs text-slate-500">Retail & Hospital Dispensing Unit</p>
                <p className="text-xs text-slate-500">GSTIN: 07AAAAA0000A1Z5 | DL: DL-99214-B</p>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-400 block">Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span>
                  <span className="text-slate-400 block mt-1">Date:</span>
                  <span>{new Date(selectedInvoice.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Patient / Customer:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.customerName}</span>
                  {selectedInvoice.doctorName && (
                    <div className="mt-1">
                      <span className="text-slate-400 block">Prescriber:</span>
                      <span>{selectedInvoice.doctorName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600">
                      <th className="py-1.5">Item</th>
                      <th className="py-1.5 text-center">Qty</th>
                      <th className="py-1.5 text-right">Price</th>
                      <th className="py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1.5">
                          <div className="font-bold text-slate-900">
                            {it.medicineId?.name || "Medicine"}
                          </div>
                        </td>
                        <td className="py-1.5 text-center font-bold">{it.quantity}</td>
                        <td className="py-1.5 text-right font-mono">₹{it.unitPrice?.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono font-bold">₹{it.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedInvoice.totalAmount?.toFixed(2)}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{selectedInvoice.discount?.toFixed(2)}</span>
                  </div>
                )}
                {selectedInvoice.tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (GST):</span>
                    <span className="font-mono">+₹{selectedInvoice.tax?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-base">₹{selectedInvoice.grandTotal?.toFixed(2)}</span>
                </div>
                <div className="text-right text-[11px] text-slate-500 pt-1">
                  Paid via: <span className="font-bold">{selectedInvoice.paymentMethod}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[11px] text-slate-400">
                <p>Thank you for choosing Apex Med-System!</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return / Refund Modal */}
      {refundSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                Process Return / Refund
              </h2>
              <button
                onClick={() => setRefundSale(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">{refundSale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount to Refund:</span>
                  <span className="font-bold text-rose-600">₹{refundSale.grandTotal?.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Return / Refund
                </label>
                <textarea
                  required
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Wrong dosage form requested by patient / cancelled by doctor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="font-semibold text-slate-900 block">Restock items back into Batch</span>
                  <span className="text-slate-500 text-[11px]">
                    If unchecked, items will be marked as DAMAGE / spoiled.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={refundRestock}
                  onChange={(e) => setRefundRestock(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundSale(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {refunding && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS Camera Scanner Popup Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
            {/* Hidden File Input for Image Upload / Photo Capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePosImageUpload}
            />

            {/* Modal Header */}
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">POS Quick Barcode &amp; AI Label Scanner</h3>
                  <p className="text-[10px] text-emerald-400">Aim camera or upload medicine label photo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePosScanner}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Camera Error Alert if any */}
            {scannerError && (
              <div className="p-3 bg-rose-950 border-b border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}

            {/* Video Viewport */}
            <div className="relative w-full h-[320px] sm:h-[360px] bg-black flex items-center justify-center overflow-hidden">
              {/* Gemini Vision AI OCR Processing Screen Overlay */}
              {ocrLoading && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
                  <div className="relative w-16 h-16 mb-3 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-teal-400 border-b-transparent border-l-transparent animate-spin" />
                    <Sparkles className="w-7 h-7 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-xs font-bold text-white flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Gemini AI Reading Medicine Label...</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-2 font-mono bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/40 animate-pulse">
                    Extracting Batch Code &amp; Auto-Adding to Bill...
                  </p>
                </div>
              )}

              <video
                ref={scannerVideoRef}
                playsInline
                autoPlay
                muted
                onLoadedMetadata={() => {
                  if (scannerVideoRef.current) {
                    scannerVideoRef.current.play().catch(() => {});
                  }
                }}
                className="w-full h-full object-cover"
              />

              {/* Loading Overlay */}
              {scannerLoading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-2 text-slate-300 z-10">
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                  <span className="text-xs font-medium">Starting Camera...</span>
                </div>
              )}

              {/* Camera Error or Inactive Overlay with Retry button */}
              {!scannerLoading && (!scannerStreamRef.current || scannerError) && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/30">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Camera Stream Inactive</h4>
                  <p className="text-xs text-slate-300 mb-4 max-w-xs leading-relaxed">
                    {scannerError || "Camera permission prompt accept karein ya photo upload karein."}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startPosCamera(facingMode)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Viewfinder Target Overlaid */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="w-56 h-56 sm:w-60 sm:h-60 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
                </div>

                <p className="mt-3 text-[11px] font-semibold text-emerald-300 bg-black/70 px-3 py-1 rounded-full backdrop-blur-md border border-emerald-500/30">
                  Scanning live... Barcode or AI Label Read
                </p>
              </div>

              {/* Top Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center space-x-2 z-10 pointer-events-auto">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                      torchOn
                        ? "bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/40"
                        : "bg-black/60 text-slate-200 border-white/20 hover:bg-black/80"
                    }`}
                    title="Flashlight"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={switchCamera}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-slate-200 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                  title="Switch Camera (Front/Back)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Footer with Action Buttons */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={capturePosCameraFrame}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Snap Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  <Upload className="w-3.5 h-3.5 text-teal-400" />
                  <span>Upload Label</span>
                </button>
              </div>

              <button
                type="button"
                onClick={closePosScanner}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white rounded-xl font-semibold transition-all cursor-pointer border border-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Not Available Popup Modal */}
      {itemNotFoundModal?.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl text-center relative space-y-4">
            <button
              type="button"
              onClick={() => setItemNotFoundModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-sm ring-8 ring-rose-50">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                Item Not Available
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                Medicine Not in Inventory
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Scanned Code: <span className="font-mono font-bold text-slate-800">{itemNotFoundModal.code}</span>
                <br />
                Yeh item hospital inventory me available ya registered nahi hai.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setItemNotFoundModal(null);
                  openPosScanner();
                }}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                Scan Again
              </button>
              <button
                type="button"
                onClick={() => setItemNotFoundModal(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
