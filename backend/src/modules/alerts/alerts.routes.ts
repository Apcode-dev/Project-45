import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  getAllAlerts,
  scanInventoryForAlerts,
  resolveAlert,
  resolveAllAlerts,
} from "./alerts.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllAlerts);
router.post("/scan", scanInventoryForAlerts);
router.put("/resolve-all", resolveAllAlerts);
router.put("/:id/resolve", resolveAlert);

export default router;
