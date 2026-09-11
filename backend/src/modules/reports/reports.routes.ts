import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  getInventoryValuation,
  getSalesSummary,
  getExpiryTimeline,
  getSlowMovingStock,
  exportReportCSV,
} from "./reports.controller.js";

const router = Router();

router.use(authenticate);

router.get("/valuation", getInventoryValuation);
router.get("/sales-summary", getSalesSummary);
router.get("/expiry-timeline", getExpiryTimeline);
router.get("/slow-moving", getSlowMovingStock);
router.get("/export/csv", exportReportCSV);

export default router;
