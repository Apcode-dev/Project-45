import { Router } from "express";
import { medicinesController } from "./medicines.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.get("/", authenticate, (req, res, next) => medicinesController.getMedicines(req, res, next));
router.get("/:id", authenticate, (req, res, next) => medicinesController.getMedicineById(req, res, next));
router.post("/", authenticate, (req, res, next) => medicinesController.createMedicine(req, res, next));
router.put("/:id", authenticate, (req, res, next) => medicinesController.updateMedicine(req, res, next));
router.delete("/:id", authenticate, (req, res, next) => medicinesController.deleteMedicine(req, res, next));
router.post("/:id/codes", authenticate, (req, res, next) => medicinesController.addCode(req, res, next));

export default router;
