import { Router } from "express";
import { batchesController } from "./batches.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.get("/", authenticate, (req, res, next) => batchesController.getBatches(req, res, next));
router.get("/:id", authenticate, (req, res, next) => batchesController.getBatchById(req, res, next));
router.post("/", authenticate, (req, res, next) => batchesController.createBatch(req, res, next));
router.put("/:id/status", authenticate, (req, res, next) => batchesController.setStatus(req, res, next));
router.post("/lock-expired", authenticate, (req, res, next) => batchesController.lockExpired(req, res, next));

export default router;
