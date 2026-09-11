import { Router } from "express";
import { scannerController } from "./scanner.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.get("/lookup/:code", authenticate, (req, res, next) => scannerController.lookup(req, res, next));
router.post("/quick-inward", authenticate, (req, res, next) => scannerController.quickInward(req, res, next));

export default router;
