import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  receivePurchase,
  cancelPurchase,
} from "./purchases.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllPurchases);
router.get("/:id", getPurchaseById);
router.post("/", createPurchase);
router.put("/:id/receive", receivePurchase);
router.put("/:id/cancel", cancelPurchase);

export default router;
