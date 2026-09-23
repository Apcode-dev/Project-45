import mongoose from "mongoose";
import { ENV } from "../config/environment.js";
import { DosageFormModel } from "./models/DosageForm.js";
import { CategoryModel } from "./models/Category.js";
import { ManufacturerModel } from "./models/Manufacturer.js";

const DEFAULT_DOSAGE_FORMS = [
  { name: "Tablet", shortName: "Tab" },
  { name: "Capsule", shortName: "Cap" },
  { name: "Syrup / Oral Liquid", shortName: "Syr" },
  { name: "Injection / Infusion", shortName: "Inj" },
  { name: "Ointment / Cream", shortName: "Oint" },
  { name: "Eye / Ear Drops", shortName: "Drops" },
  { name: "Inhaler / Respule", shortName: "Inh" },
  { name: "Suspension", shortName: "Susp" },
  { name: "Gel / Topical", shortName: "Gel" },
  { name: "Powder / Sachet", shortName: "Pow" },
];

const DEFAULT_THERAPEUTIC_CATEGORIES = [
  { name: "Analgesics & Antipyretics", description: "Pain relief and fever reducers (e.g. Paracetamol, Ibuprofen)" },
  { name: "Antibiotics & Antimicrobials", description: "Bacterial and microbial infection treatments (e.g. Amoxicillin, Azithromycin)" },
  { name: "Antihistamines & Antiallergics", description: "Allergy, cold and sneeze relief (e.g. Cetirizine, Levocetirizine)" },
  { name: "Antidiabetics", description: "Blood glucose management for Diabetes (e.g. Metformin, Glimepiride)" },
  { name: "Antihypertensives & Cardiac", description: "Blood pressure and heart health medications (e.g. Telmisartan, Amlodipine)" },
  { name: "Gastrointestinal & Antacids", description: "Acidity, GERD, nausea and digestion (e.g. Pantoprazole, Omeprazole)" },
  { name: "Vitamins, Minerals & Supplements", description: "Nutritional supplements, Calcium, Vitamin D3, B-Complex" },
  { name: "Respiratory & Cough Preparations", description: "Cough syrups, bronchodilators and chest decongestants" },
  { name: "Dermatology & Skin Care", description: "Antifungal, antibacterial and soothing skin treatments" },
  { name: "Neuro & CNS Agents", description: "Nervous system, anxiety and psychiatric medications" },
];

const DEFAULT_MANUFACTURERS = [
  { name: "Sun Pharmaceutical Industries Ltd", country: "India", contactEmail: "contact@sunpharma.com", phone: "+91 22 4324 4324" },
  { name: "Cipla Limited", country: "India", contactEmail: "contact@cipla.com", phone: "+91 22 2482 6000" },
  { name: "Dr. Reddy's Laboratories", country: "India", contactEmail: "contact@drreddys.com", phone: "+91 40 4900 2900" },
  { name: "Mankind Pharma Ltd", country: "India", contactEmail: "contact@mankindpharma.com", phone: "+91 11 4684 6700" },
  { name: "Torrent Pharmaceuticals", country: "India", contactEmail: "contact@torrentpharma.com", phone: "+91 79 2659 9000" },
  { name: "Abbott India Limited", country: "India", contactEmail: "contact@abbott.co.in", phone: "+91 22 3816 2000" },
  { name: "Lupin Limited", country: "India", contactEmail: "contact@lupin.com", phone: "+91 22 6640 2222" },
  { name: "Alkem Laboratories Ltd", country: "India", contactEmail: "contact@alkem.com", phone: "+91 22 3982 9999" },
  { name: "Glenmark Pharmaceuticals", country: "India", contactEmail: "contact@glenmarkpharma.com", phone: "+91 22 4018 9999" },
  { name: "Zydus Lifesciences", country: "India", contactEmail: "contact@zyduslife.com", phone: "+91 79 7180 0000" },
];

export async function seedPharmaMetadata() {
  console.log("[Metadata Seed] Connecting to MongoDB Atlas...");
  await mongoose.connect(ENV.MONGODB_URI);

  let formsAdded = 0;
  for (const form of DEFAULT_DOSAGE_FORMS) {
    const exists = await DosageFormModel.findOne({ name: form.name });
    if (!exists) {
      await DosageFormModel.create(form);
      formsAdded++;
    }
  }
  console.log(`[Metadata Seed] Dosage Forms: ${formsAdded} added.`);

  let categoriesAdded = 0;
  for (const cat of DEFAULT_THERAPEUTIC_CATEGORIES) {
    const exists = await CategoryModel.findOne({ name: cat.name, type: "THERAPEUTIC" });
    if (!exists) {
      await CategoryModel.create({
        name: cat.name,
        type: "THERAPEUTIC",
        description: cat.description,
        isActive: true,
      });
      categoriesAdded++;
    }
  }
  console.log(`[Metadata Seed] Therapeutic Categories: ${categoriesAdded} added.`);

  let mfgAdded = 0;
  for (const mfg of DEFAULT_MANUFACTURERS) {
    const exists = await ManufacturerModel.findOne({ name: mfg.name });
    if (!exists) {
      await ManufacturerModel.create(mfg);
      mfgAdded++;
    }
  }
  console.log(`[Metadata Seed] Manufacturers: ${mfgAdded} added.`);

  console.log("[Metadata Seed] NOTE: User profiles were NOT touched. Existing accounts remain 100% intact.");
  await mongoose.disconnect();
}

seedPharmaMetadata()
  .then(() => {
    console.log("[Metadata Seed] Completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Metadata Seed] Error:", err);
    process.exit(1);
  });
