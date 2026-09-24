import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { getSettings, updateSettings } from "./settings.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getSettings);
router.put("/", authorize("ADMIN"), updateSettings);

export default router;
