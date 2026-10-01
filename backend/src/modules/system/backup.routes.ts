import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { createBackup, listBackups, restoreBackup, downloadBackup } from "./backup.controller.js";

const router = Router();

router.use(authenticate);

// Top Role (ADMIN) Exclusive Operations
router.post("/backup", authorize("ADMIN"), createBackup);
router.get("/backups", authorize("ADMIN"), listBackups);
router.get("/download/:backupId", authorize("ADMIN"), downloadBackup);
router.post("/restore", authorize("ADMIN"), restoreBackup);

export default router;
