import { MedicineModel } from "../../database/models/Medicine.js";
import { MedicineCodeModel } from "../../database/models/MedicineCode.js";
import { BatchModel } from "../../database/models/Batch.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { createAuditLog } from "../../middleware/audit.js";

export interface QuickInwardPayload {
  medicineId: string;
  batchNumber: string;
  manufacturingDate: string | Date;
  expiryDate: string | Date;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  supplierId?: string;
}

function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;
  const firstLine = dateStr.split(/[\r\n]/)[0];
  const clean = firstLine.trim().toUpperCase().replace(/\s*[\.\/-]\s*/g, "/").replace(/\./g, " ");

  const monthNames: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };

  const monthMatch = clean.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\s/]*(\d{2,4})/);
  if (monthMatch) {
    const m = monthNames[monthMatch[1]];
    let y = monthMatch[2];
    if (y.length === 2) y = "20" + y;
    return `${y}-${m}-01`;
  }

  const numMatch = clean.match(/(\d{1,2})[\/\-\s]+(\d{2,4})/);
  if (numMatch) {
    const m = numMatch[1].padStart(2, "0");
    let y = numMatch[2];
    if (y.length === 2) y = "20" + y;
    return `${y}-${m}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(firstLine.trim())) return firstLine.trim();

  return null;
}

export function parseMedicineLabelText(text: string) {
  const cleanText = text.trim();
  let batchNumber = "";
  let mfgDate: string | null = null;
  let expDate: string | null = null;
  let mrp: number | null = null;

  // Split into non-empty lines
  const lines = cleanText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  // 1. Batch Number Extraction
  const batchRegex = /(?:B\.?\s*No\.?|B\.?NO\.?|BATCH(?:\s*NO\.?)?|LOT(?:\s*NO\.?)?|GHAN\s*SANKHYA|घान\s*संख्या)\s*[:\.]*\s*([A-Z0-9\-\/]+)/i;
  const batchMatch = cleanText.match(batchRegex);

  if (batchMatch && batchMatch[1]) {
    batchNumber = batchMatch[1].trim();
  } else {
    // Check line by line
    for (const line of lines) {
      if (/(?:Lic|License|MNB|MB\/)/i.test(line)) continue;
      const lineMatch = line.match(/(?:B\.?\s*No\.?|B\.?NO\.?|BATCH(?:\s*NO\.?)?|LOT(?:\s*NO\.?)?)\s*[:\.]*\s*([A-Z0-9\-\/]+)/i);
      if (lineMatch && lineMatch[1]) {
        batchNumber = lineMatch[1].trim();
        break;
      }
    }
  }

  // Fallback: Standalone token search if no prefix match
  if (!batchNumber) {
    for (const line of lines) {
      if (/(?:Lic|License|MNB|MB\/|MFG|MFR|EXP|MRP|Rs|₹|उत्पादन|अवसान|खुदरा)/i.test(line)) continue;
      const tokens = line.split(/\s+/);
      for (const t of tokens) {
        const cleanT = t.replace(/[^A-Z0-9\-\/]/gi, "");
        if (cleanT.length >= 4 && cleanT.length <= 16 && /^[A-Z0-9\-\/]+$/i.test(cleanT) && /[0-9]/.test(cleanT)) {
          batchNumber = cleanT;
          break;
        }
      }
      if (batchNumber) break;
    }
  }

  // Clean any residual prefixes or punctuation
  batchNumber = batchNumber
    .replace(/^(?:B\.?\s*No\.?|B\.?NO\.?|BATCH:?|LOT:?)\s*/i, "")
    .replace(/^[:\.\s]+/, "")
    .replace(/[:\.\s]+$/, "")
    .trim();

  // 2. MFG Date Extraction
  const mfgRegex = /(?:MFG|MFR|MFD|MANUFACTURING)(?:\.?\s*DATE|\.?\s*DT\.?)?\s*[:\.]*\s*([0-9A-Z\.\/\-\s]+?)(?:[\r\n]|$)/i;
  const mfgMatch = cleanText.match(mfgRegex);
  if (mfgMatch && mfgMatch[1]) {
    mfgDate = parseDateString(mfgMatch[1]);
  }

  // 3. EXP Date Extraction
  const expRegex = /(?:EXP|EXPDT|EXPIRY)(?:\.?\s*DATE|\.?\s*DT\.?)?\s*[:\.]*\s*([0-9A-Z\.\/\-\s]+?)(?:[\r\n]|$)/i;
  const expMatch = cleanText.match(expRegex);
  if (expMatch && expMatch[1]) {
    expDate = parseDateString(expMatch[1]);
  }

  // 4. MRP Extraction
  const mrpRegex = /(?:M\.?R\.?P\.?|MRP)(?:\s*Rs\.?|\s*₹)?\s*[:\.]*\s*([0-9\s\.\,]+?)(?:[\r\n]|$)/i;
  const mrpMatch = cleanText.match(mrpRegex);
  if (mrpMatch && mrpMatch[1]) {
    const mrpStr = mrpMatch[1].replace(/\s+/g, "").replace(",", ".");
    const parsed = parseFloat(mrpStr);
    if (!isNaN(parsed)) mrp = parsed;
  }

  return {
    rawCode: text,
    batchNumber,
    mfgDate,
    expDate,
    mrp,
  };
}

export class ScannerService {
  async lookupCode(rawCode: string) {
    const raw = rawCode.trim();
    if (!raw) throw new Error("Scanned code cannot be empty");

    const extractedInfo = parseMedicineLabelText(raw);
    const displayCode = extractedInfo.batchNumber || raw.split(/[\r\n]+/)[0].trim();

    let medicineId: any = null;
    let matchedBatchId: any = null;

    // 1. Search MedicineCodeModel with exact raw or extracted batch number
    const codeQuery = [raw, displayCode, extractedInfo.batchNumber].filter(Boolean);
    const codeRecord = await MedicineCodeModel.findOne({ codeValue: { $in: codeQuery } }).lean();
    if (codeRecord) {
      medicineId = codeRecord.medicineId;
    }

    // 2. Search BatchModel directly by batch number
    if (!medicineId) {
      const candidateBatches = [extractedInfo.batchNumber, displayCode, raw].filter(
        (b) => b && b.length >= 2 && !b.includes("\n")
      );

      const cleanedRaw = raw.replace(/^(?:B\.?\s*No\.?|B\.?NO\.?|BATCH:?|LOT:?)\s*/i, "").trim();
      if (cleanedRaw && !candidateBatches.includes(cleanedRaw) && !cleanedRaw.includes("\n")) {
        candidateBatches.push(cleanedRaw);
      }

      // Try exact candidate matches first
      let batchRecord = await BatchModel.findOne({ batchNumber: { $in: candidateBatches } }).lean();

      // Fallback: Case-insensitive regex match on extracted batch number
      if (!batchRecord && extractedInfo.batchNumber && extractedInfo.batchNumber.length >= 2) {
        const escaped = extractedInfo.batchNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        batchRecord = await BatchModel.findOne({ batchNumber: new RegExp(`^${escaped}$`, "i") }).lean();
      }

      if (batchRecord) {
        medicineId = batchRecord.medicineId;
        matchedBatchId = batchRecord._id;
      }
    }

    // 3. Search MedicineModel by name, genericName, or SKU
    if (!medicineId) {
      const searchTerms = [extractedInfo.batchNumber, displayCode].filter((t) => t && t.length >= 2 && !t.includes("\n"));
      if (searchTerms.length > 0) {
        const medMatch = await MedicineModel.findOne({
          $or: searchTerms.flatMap((term) => [
            { name: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            { genericName: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            { sku: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          ]),
        }).lean();
        if (medMatch) medicineId = medMatch._id;
      }
    }

    if (!medicineId) {
      return {
        found: false,
        code: displayCode,
        extractedInfo,
        message: "Medicine not found in registry",
      };
    }

    // Fetch full medicine details
    const medicine = await MedicineModel.findById(medicineId)
      .populate("dosageFormId", "name shortName")
      .populate("categoryId", "name")
      .populate("therapeuticCategoryId", "name")
      .populate("manufacturerId", "name country")
      .lean();

    if (!medicine) {
      return { found: false, code: displayCode, extractedInfo, message: "Medicine profile inactive or deleted" };
    }

    const now = new Date();

    // Fetch all batches sorted by Expiry Date (FEFO priority)
    const batches = await BatchModel.find({ medicineId })
      .populate("supplierId", "name")
      .sort({ expiryDate: 1 })
      .lean();

    const activeBatches = batches.filter((b) => b.status === "ACTIVE" && new Date(b.expiryDate) > now);
    const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

    return {
      found: true,
      code: displayCode,
      extractedInfo,
      matchedBatchId: matchedBatchId ? matchedBatchId.toString() : null,
      medicine: {
        ...medicine,
        totalStock,
        isLowStock: totalStock <= medicine.minStockLevel,
      },
      batches: batches.map((b) => ({
        ...b,
        isExpired: new Date(b.expiryDate) <= now,
        isExpiringSoon: new Date(b.expiryDate) > now && new Date(b.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      })),
    };
  }

  async quickInward(payload: QuickInwardPayload, userId?: string, ipAddress?: string) {
    const { medicineId, batchNumber, manufacturingDate, expiryDate, quantity, purchasePrice, mrp, supplierId } = payload;

    if (!medicineId || !batchNumber || !expiryDate || !quantity || quantity <= 0) {
      throw new Error("Medicine, Batch Number, Expiry Date, and valid Quantity (> 0) are required.");
    }

    const medicine = await MedicineModel.findById(medicineId);
    if (!medicine) throw new Error("Medicine not found");

    const expDate = new Date(expiryDate);
    const mfgDate = manufacturingDate ? new Date(manufacturingDate) : new Date();
    const now = new Date();

    if (expDate <= now) {
      throw new Error("Cannot add stock with an already expired date!");
    }

    // Check if batch already exists for this medicine
    let batch = await BatchModel.findOne({ medicineId, batchNumber: batchNumber.trim() });
    let beforeBatchQty = 0;
    let afterBatchQty = 0;

    if (batch) {
      beforeBatchQty = batch.quantity;
      batch.quantity += Number(quantity);
      batch.purchasePrice = Number(purchasePrice) || batch.purchasePrice;
      batch.mrp = Number(mrp) || batch.mrp;
      if (supplierId) batch.supplierId = supplierId as any;
      batch.status = "ACTIVE";
      await batch.save();
      afterBatchQty = batch.quantity;
    } else {
      batch = await BatchModel.create({
        medicineId,
        batchNumber: batchNumber.trim(),
        manufacturingDate: mfgDate,
        expiryDate: expDate,
        quantity: Number(quantity),
        initialQuantity: Number(quantity),
        purchasePrice: Number(purchasePrice) || 0,
        mrp: Number(mrp) || 0,
        supplierId: supplierId || null,
        status: "ACTIVE",
      });
      beforeBatchQty = 0;
      afterBatchQty = Number(quantity);
    }

    // Log Inventory Transaction
    await InventoryTransactionModel.create({
      medicineId,
      batchId: batch._id,
      type: "PURCHASE",
      quantityDelta: Number(quantity),
      beforeQuantity: beforeBatchQty,
      afterQuantity: afterBatchQty,
      reason: `Quick Inward Scan for Batch ${batch.batchNumber}`,
      userId: userId || null,
      ipAddress,
    });

    // Audit Log
    await createAuditLog("QUICK_INWARD_SCAN", "BATCH", {
      entityId: batch._id.toString(),
      userId,
      ipAddress,
      details: {
        medicineName: medicine.name,
        batchNumber: batch.batchNumber,
        addedQty: quantity,
        newBatchStock: afterBatchQty,
      },
    });

    return {
      success: true,
      message: `Successfully added ${quantity} units to Batch ${batch.batchNumber}`,
      batch,
      totalMedicineStock: afterBatchQty,
    };
  }

  async visionScan(imageBase64: string) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return { aiEnabled: false };
    }

    let aiResult: any = null;

    if (geminiKey) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Extract medicine label details from this image.
Keys required in JSON output:
1. "batchNumber": string (e.g. ST25G9253 or JKFL260003)
2. "mfgDate": string in YYYY-MM-DD format (or null if not found)
3. "expDate": string in YYYY-MM-DD format (or null if not found)
4. "mrp": number (or null if not found)
Return ONLY raw JSON.`
                    },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: cleanBase64
                      }
                    }
                  ]
                }
              ]
            })
          }
        );
        const resJson = (await response.json()) as any;
        const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        aiResult = JSON.parse(cleanJson);
      } catch (e) {
        console.warn("[ScannerService] Gemini Vision API Error:", e);
      }
    } else if (openaiKey) {
      try {
        const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: 'Extract medicine label details. Return JSON with keys: "batchNumber", "mfgDate", "expDate", "mrp".' },
                  { type: "image_url", image_url: { url: imageUrl } }
                ]
              }
            ],
            response_format: { type: "json_object" }
          })
        });
        const resJson = (await response.json()) as any;
        const text = resJson?.choices?.[0]?.message?.content || "{}";
        aiResult = JSON.parse(text);
      } catch (e) {
        console.warn("[ScannerService] OpenAI Vision API Error:", e);
      }
    }

    if (!aiResult || (!aiResult.batchNumber && !aiResult.rawText)) {
      return { aiEnabled: false };
    }

    const searchCode = aiResult.batchNumber || aiResult.rawText || "";
    const lookup = await this.lookupCode(searchCode);

    return {
      ...lookup,
      aiEnabled: true,
      provider: geminiKey ? "Gemini 1.5 Flash Vision" : "ChatGPT GPT-4o-mini Vision",
      extractedInfo: {
        rawCode: searchCode,
        batchNumber: aiResult.batchNumber || lookup.extractedInfo?.batchNumber || "",
        mfgDate: aiResult.mfgDate || lookup.extractedInfo?.mfgDate || null,
        expDate: aiResult.expDate || lookup.extractedInfo?.expDate || null,
        mrp: aiResult.mrp || lookup.extractedInfo?.mrp || null,
      },
    };
  }
}

export const scannerService = new ScannerService();
