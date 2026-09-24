import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createPurchaseSchema } from "./purchases.validation.js";
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
router.post("/", validateBody(createPurchaseSchema), createPurchase);
router.put("/:id/receive", receivePurchase);
router.put("/:id/cancel", cancelPurchase);

export default router;
