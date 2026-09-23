import React, { useState, useEffect, useRef } from "react";
import { api } from "../../services/api.js";
import { showToast } from "../../utils/toast.js";
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
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

export const ScannerPage: React.FC = () => {
  const [inputCode, setInputCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInputMode, setActiveInputMode] = useState<"camera" | "upload" | "manual">("camera");

  // Live Camera & Barcode Scanner State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zxingReaderRef = useRef<any>(null);
  const scanTimerRef = useRef<any>(null);
  const lastScanTimeRef = useRef<number>(0);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

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
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {
      // Audio context may be restricted by autoplay policy
    }
  };

  // Configure high-performance ZXing MultiFormat reader for medicine barcodes
  const createZxingReader = () => {
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

  const handleCodeFound = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Debounce repeated scans within 2.5 seconds
    if (cleanCode === lastScannedCode && Date.now() - lastScanTimeRef.current < 2500) {
      return;
    }

    lastScanTimeRef.current = Date.now();
    setLastScannedCode(cleanCode);
    playBeep();
    setScanSuccessFlash(true);
    setTimeout(() => setScanSuccessFlash(false), 1500);

    setInputCode(cleanCode);
    handleLookup(cleanCode);
  };

  // Ensure video element plays stream whenever camera becomes active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.play().catch((e) => console.warn("Video play error on state change:", e));
    }
  }, [isCameraActive]);

  const startScanningEngine = async () => {
    // Wait until video has received data and has dimensions
    const waitForVideoReady = (): Promise<void> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.readyState >= 2) {
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

    await waitForVideoReady();
    if (!videoRef.current || !streamRef.current) return;

    // 1. Start continuous ZXing decoding (Primary reliable engine for all 1D & 2D barcodes)
    try {
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.stopContinuousDecode();
        } catch {}
      }
      const reader = createZxingReader();
      zxingReaderRef.current = reader;
      reader.decodeContinuously(videoRef.current, (result: any) => {
        if (result) {
          const text = result.getText ? result.getText() : result.text;
          if (text) {
            handleCodeFound(text);
          }
        }
      });
    } catch (e) {
      console.warn("ZXing continuous reader init error:", e);
    }

    // 2. Parallel Native BarcodeDetector (hardware accelerated where supported)
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
            if (!videoRef.current || !streamRef.current) return;
            if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleCodeFound(barcodes[0].rawValue);
                }
              } catch {}
            }
            scanTimerRef.current = requestAnimationFrame(detectFrame);
          };
          scanTimerRef.current = requestAnimationFrame(detectFrame);
        }
      } catch (e) {
        console.warn("Native BarcodeDetector not available, ZXing is running:", e);
      }
    }
  };

  const startCamera = async (desiredFacing: "environment" | "user" = facingMode) => {
    setCameraLoading(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Aapka browser camera access support nahi karta. Please use Chrome, Edge or Safari.");
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
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: desiredFacing ? { ideal: desiredFacing } : "environment",
            },
            audio: false,
          });
        } catch (err2) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;

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

      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Initial play promise rejected:", playErr);
        }
      }

      setIsCameraActive(true);
      setCameraLoading(false);

      startScanningEngine();
    } catch (err: any) {
      console.error("Camera open error:", err);
      setIsCameraActive(false);
      setCameraLoading(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission blocked! Browser address bar me jaakar Camera permission allow karein.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("Device me camera nahi mila. Aap manual barcode enter kar sakte hain.");
      } else {
        setCameraError(`Camera open nahi ho paya: ${err.message || err.name}`);
      }
    }
  };

  const stopCamera = () => {
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
  };

  const switchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.error("Failed to toggle torch:", e);
    }
  };

  const preprocessImageForOCR = async (fileOrCanvas: File | Blob | HTMLCanvasElement): Promise<HTMLCanvasElement | File | Blob> => {
    if (fileOrCanvas instanceof HTMLCanvasElement) {
      return fileOrCanvas;
    }
    return new Promise((resolve) => {
      const url = URL.createObjectURL(fileOrCanvas);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        const maxDim = 1600;
        let w = image.width;
        let h = image.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(image, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
            const val = avg < 140 ? Math.max(0, avg - 35) : Math.min(255, avg + 35);
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
          }
          ctx.putImageData(imgData, 0, 0);
        }
        resolve(canvas);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(fileOrCanvas);
      };
      image.src = url;
    });
  };

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

  const recognizeImageText = async (imageSource: File | Blob | HTMLCanvasElement) => {
    setOcrLoading(true);
    setLoading(true);
    setError(null);

    try {
      // 1. Try Backend Vision AI first (Gemini 2.0 / 1.5 Flash Vision or ChatGPT Vision)
      try {
        const base64 = await imageToBase64(imageSource);
        const visionRes = await api.post("/scanner/vision-scan", { imageBase64: base64 });
        if (visionRes.data.success && visionRes.data.data?.aiEnabled) {
          const data = visionRes.data.data;
          playBeep();
          setLookupResult(data);

          const extracted = data.extractedInfo;
          if (extracted?.batchNumber) {
            setInputCode(extracted.batchNumber);
            setInwardBatchNo(extracted.batchNumber);
          }
          if (extracted?.mfgDate) setInwardMfgDate(extracted.mfgDate);
          if (extracted?.expDate) setInwardExpDate(extracted.expDate);
          if (extracted?.mrp) setInwardMrp(extracted.mrp.toString());

          if (data.found) {
            const batches = data.batches || [];
            let targetIdx = 0;
            if (data.matchedBatchId && batches.length > 0) {
              const foundIdx = batches.findIndex((b: any) => b._id === data.matchedBatchId);
              if (foundIdx !== -1) targetIdx = foundIdx;
            }
            if (batches.length > 0) {
              setSelectedBatchIndex(targetIdx);
              const b = batches[targetIdx];
              setInwardBatchNo(b.batchNumber);
              setInwardExpDate(b.expiryDate ? b.expiryDate.split("T")[0] : extracted?.expDate || "2027-12-31");
              if (b.manufacturingDate) setInwardMfgDate(b.manufacturingDate.split("T")[0]);
              setInwardPrice(b.purchasePrice?.toString() || "18.50");
              setInwardMrp(b.mrp?.toString() || extracted?.mrp?.toString() || "32.00");
            } else {
              setSelectedBatchIndex("new");
            }
          }
          return;
        }
      } catch (visionErr) {
        console.warn("Vision AI endpoint skipped/fallback to local OCR:", visionErr);
      }

      // 2. Fallback to Local High-Contrast Tesseract OCR
      let targetSource: any = imageSource;
      if (imageSource instanceof File || imageSource instanceof Blob) {
        targetSource = await preprocessImageForOCR(imageSource);
      }

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const ret = await worker.recognize(targetSource);
      await worker.terminate();

      const text = ret.data.text ? ret.data.text.trim() : "";
      if (text) {
        playBeep();
        setInputCode(text);
        await handleLookup(text);
      } else {
        setError("Label text read nahi ho paya. Kripya clear, well-lit photo snap/upload karein.");
      }
    } catch (err: any) {
      console.error("OCR recognition error:", err);
      setError("AI Text Recognition error. Kripya manual batch code enter karein.");
    } finally {
      setOcrLoading(false);
      setLoading(false);
    }
  };

  const captureCameraFrameAndRecognize = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    await recognizeImageText(canvas);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so user can re-capture the same image if needed
    e.target.value = "";

    try {
      // 1. Native BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        try {
          const imgBitmap = await createImageBitmap(file);
          let detector: any = null;
          try {
            detector = new (window as any).BarcodeDetector();
          } catch {
            detector = new (window as any).BarcodeDetector({
              formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "data_matrix"],
            });
          }
          if (detector) {
            const barcodes = await detector.detect(imgBitmap);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleCodeFound(barcodes[0].rawValue);
              return;
            }
          }
        } catch {}
      }

      // 2. Bundled ZXing image decoder
      const reader = createZxingReader();
      const imgUrl = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(imgUrl);
        URL.revokeObjectURL(imgUrl);
        if (result) {
          const text = result.getText ? result.getText() : (result as any).text;
          if (text) {
            handleCodeFound(text);
            return;
          }
        }
      } catch {
        URL.revokeObjectURL(imgUrl);
      }

      // 3. Fallback: No Barcode/QR Code detected -> Run Tesseract OCR to read text printed on box/strip
      await recognizeImageText(file);
    } catch (err: any) {
      setError("Barcode ya Label scan nahi ho paya. Kripya clear image upload karein ya manual code enter karein.");
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    api.get("/categories/dosage-forms/all").then((res) => setDosageForms(res.data.data || [])).catch(() => {});
    api.get("/manufacturers").then((res) => setSuppliers(res.data.data || [])).catch(() => {});
  }, []);

  const handleLookup = async (codeToSearch: string) => {
    const code = (codeToSearch || "").trim();
    if (!code) {
      setError("Kripya barcode scan karein ya code number enter karein.");
      return;
    }

    setLoading(true);
    setError(null);
    setInwardSuccessMsg(null);

    try {
      const res = await api.get(`/scanner/lookup/${encodeURIComponent(code)}`);
      if (res.data.success) {
        const data = res.data.data;
        setLookupResult(data);

        const extracted = data.extractedInfo;
        if (extracted?.batchNumber) {
          setInwardBatchNo(extracted.batchNumber);
        }
        if (extracted?.mfgDate) {
          setInwardMfgDate(extracted.mfgDate);
        }
        if (extracted?.expDate) {
          setInwardExpDate(extracted.expDate);
        }
        if (extracted?.mrp) {
          setInwardMrp(extracted.mrp.toString());
        }

        if (data.found) {
          const batches = data.batches || [];
          let targetIdx = 0;
          if (data.matchedBatchId && batches.length > 0) {
            const foundIdx = batches.findIndex((b: any) => b._id === data.matchedBatchId);
            if (foundIdx !== -1) targetIdx = foundIdx;
          }

          if (batches.length > 0) {
            setSelectedBatchIndex(targetIdx);
            const b = batches[targetIdx];
            setInwardBatchNo(b.batchNumber);
            setInwardExpDate(b.expiryDate ? b.expiryDate.split("T")[0] : extracted?.expDate || "2027-12-31");
            if (b.manufacturingDate) {
              setInwardMfgDate(b.manufacturingDate.split("T")[0]);
            }
            setInwardPrice(b.purchasePrice?.toString() || "18.50");
            setInwardMrp(b.mrp?.toString() || extracted?.mrp?.toString() || "32.00");
          } else {
            setSelectedBatchIndex("new");
            setInwardBatchNo(extracted?.batchNumber || `B-${Date.now().toString().slice(-4)}`);
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
        showToast.success(`Added ${inwardQty} units to Batch ${inwardBatchNo}! Stock updated.`);
        setInwardSuccessMsg(`Added ${inwardQty} units to Batch ${inwardBatchNo}! Stock updated.`);
        handleLookup(lookupResult.code);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Failed to add stock";
      setError(errMsg);
      showToast.error(errMsg);
    } finally {
      setInwardSaving(false);
    }
  };

  const handleRegisterMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const codeToLink = lookupResult?.extractedInfo?.batchNumber || lookupResult?.code;
      const res = await api.post("/medicines", {
        name: regBrand,
        genericName: regGeneric,
        strength: regStrength,
        dosageFormId: regForm || undefined,
        initialCode: codeToLink,
        initialCodeType: "BARCODE",
      });
      if (res.data.success) {
        showToast.success(`Medicine "${regBrand}" registered successfully!`);
        setShowRegisterModal(false);
        handleLookup(codeToLink);
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.error || "Failed to register medicine");
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
            {/* Viewfinder Container */}
            <div className="relative bg-slate-950 rounded-2xl text-white min-h-[320px] sm:min-h-[360px] h-[340px] sm:h-[380px] flex flex-col items-center justify-center overflow-hidden border border-slate-800 shadow-inner">
              {/* Hidden file input for capturing barcode/label image */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageUpload}
              />

              {/* High-Tech Instant OCR Processing Screen Overlay */}
              {ocrLoading && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
                  <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-teal-400 border-b-transparent border-l-transparent animate-spin" />
                    <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>AI Scanning Medicine Image...</span>
                  </div>
                  <p className="text-xs text-emerald-400 mt-2 font-mono bg-emerald-950/80 px-3.5 py-1.5 rounded-lg border border-emerald-500/40 animate-pulse">
                    Fetching Batch No, Mfg Date, Expiry &amp; MRP...
                  </p>
                </div>
              )}

              {/* Live Video Feed - PERMANENTLY MOUNTED in DOM so videoRef.current is never null */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-200 ${
                  isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              />

              {/* 1. When Camera is Active: Scanning Viewfinder Target & Controls */}
              {isCameraActive && (
                <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 pointer-events-none">
                  {/* Top Video Controls (Torch, Flip, Close) */}
                  <div className="flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950/85 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-800 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                      <span>LIVE CAMERA</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Torch Toggle (Mobile rear camera only) */}
                      {torchSupported && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                            torchOn
                              ? "bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/40"
                              : "bg-black/60 text-slate-200 border-white/20 hover:bg-black/80"
                          }`}
                          title="Flash / Torch"
                        >
                          <Flashlight className="w-4 h-4" />
                        </button>
                      )}

                      {/* Flip Camera (Front / Back) */}
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-slate-200 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                        title="Flip Camera (Front/Back)"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {/* Stop Camera Button */}
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500 backdrop-blur-md shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                        title="Close Camera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Overlaid Scanning Viewfinder Target */}
                  <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Moving Laser Beam */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
                    </div>

                    <p className="mt-3 text-[11px] font-semibold text-emerald-300 bg-black/70 px-3 py-1 rounded-full backdrop-blur-md border border-emerald-500/30 shadow-md">
                      Scanning live... Aim at Barcode / QR
                    </p>
                  </div>

                  {/* Bottom spacer for balance */}
                  <div className="h-6" />

                  {/* Scan Success Green Flash */}
                  {scanSuccessFlash && (
                    <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 z-20">
                      <div className="bg-slate-950/90 border border-emerald-400 px-4 py-2 rounded-xl text-emerald-400 text-xs font-bold shadow-2xl flex items-center space-x-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Code Scanned: {lastScannedCode}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. When Camera is Inactive: Show Ready Viewfinder & Prominent Buttons */}
              {!isCameraActive && (
                <div className="p-6 flex flex-col items-center text-center space-y-4 w-full z-10">
                  <div className="relative w-36 h-36 border-2 border-dashed border-emerald-400/60 rounded-2xl flex flex-col items-center justify-center p-3 bg-emerald-950/20">
                    <QrCode className="w-16 h-16 text-emerald-400/50" />
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-pulse" />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                      <span>Scanner Ready &bull; Multi-Format</span>
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Dawa box, strip ya QR code ko phone camera se scan ya snap karne ke liye niche button dabayein.
                    </p>
                  </div>

                  {/* Camera Error Message if any */}
                  {cameraError && (
                    <div className="w-full max-w-sm p-3 bg-rose-950/70 border border-rose-600/50 rounded-xl text-xs text-rose-300 text-left flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold text-rose-200">Camera Alert: </span>
                        <span>{cameraError}</span>
                      </div>
                    </div>
                  )}

                  {/* PROMINENT BUTTONS: OPEN CAMERA & CAPTURE IMAGE */}
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs pt-1">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      disabled={cameraLoading}
                      className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/40 flex items-center justify-center space-x-2 transition-all cursor-pointer border border-emerald-400/30"
                    >
                      {cameraLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Starting Camera...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Open Camera Scanner</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* If camera is active, provide a prominent Stop Camera button below the viewfinder */}
            {isCameraActive && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <X className="w-4 h-4" />
                  <span>Stop Camera / Band Karein</span>
                </button>
              </div>
            )}

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

              {lookupResult.extractedInfo && lookupResult.extractedInfo.batchNumber && (
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-left text-xs font-mono space-y-1 max-w-md mx-auto">
                  <div className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">Scanned Label Details Extracted:</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-800 pt-1 text-[11px]">
                    <div>Batch: <strong className="text-emerald-700">{lookupResult.extractedInfo.batchNumber}</strong></div>
                    {lookupResult.extractedInfo.mrp && <div>MRP: <strong>₹{lookupResult.extractedInfo.mrp}</strong></div>}
                    {lookupResult.extractedInfo.mfgDate && <div>Mfg: <strong>{lookupResult.extractedInfo.mfgDate}</strong></div>}
                    {lookupResult.extractedInfo.expDate && <div>Exp: <strong>{lookupResult.extractedInfo.expDate}</strong></div>}
                  </div>
                </div>
              )}

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
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-xs text-center space-y-4 flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-inner">
                <QrCode className="w-8 h-8 text-emerald-600/80" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Ready to Scan or Lookup
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Camera se barcode scan karein, photo upload karein ya left side me code enter karke Lookup karein. Scanned dawa ki batch details aur quick inward yahan show hogi.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-600">EAN-13 / UPC</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-600">QR Code</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-600">Code 128</span>
              </div>
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
