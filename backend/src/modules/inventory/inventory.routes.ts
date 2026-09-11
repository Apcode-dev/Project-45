import { Router } from "express";
import { inventoryController } from "./inventory.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.get("/transactions", authenticate, (req, res, next) => inventoryController.getTransactions(req, res, next));
router.post("/adjust", authenticate, (req, res, next) => inventoryController.adjustStock(req, res, next));

export default router;
