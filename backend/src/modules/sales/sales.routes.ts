import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
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
router.post("/", createSale);
router.post("/:id/return", returnSale);

export default router;
