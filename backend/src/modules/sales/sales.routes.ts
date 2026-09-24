import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createSaleSchema } from "./sales.validation.js";
import {
  getAllSales,
  getSaleById,
  createSale,
  returnSale,
} from "./sales.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllSales);
router.get("/:id", getSaleById);
router.post("/", validateBody(createSaleSchema), createSale);
router.post("/:id/return", returnSale);

export default router;
