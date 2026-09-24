import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { createBackup, listBackups, restoreBackup } from "./backup.controller.js";

const router = Router();

router.use(authenticate);

router.post("/backup", authorize("ADMIN"), createBackup);
router.get("/backups", authorize("ADMIN"), listBackups);
router.post("/restore", authorize("ADMIN"), restoreBackup);

export default router;
