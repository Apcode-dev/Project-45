import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { getAllAuditLogs } from "./audit.controller.js";

const router = Router();

router.use(authenticate);

// Admin-only access to audit trails
router.get("/", authorize("ADMIN"), getAllAuditLogs);

export default router;
