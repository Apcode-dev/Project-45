import { Router } from "express";
import { categoriesController } from "./categories.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

// Categories
router.get("/", authenticate, (req, res, next) => categoriesController.getCategories(req, res, next));
router.post("/", authenticate, (req, res, next) => categoriesController.createCategory(req, res, next));
router.put("/:id", authenticate, (req, res, next) => categoriesController.updateCategory(req, res, next));
router.delete("/:id", authenticate, (req, res, next) => categoriesController.deleteCategory(req, res, next));

// Dosage Forms
router.get("/dosage-forms/all", authenticate, (req, res, next) => categoriesController.getDosageForms(req, res, next));
router.post("/dosage-forms", authenticate, (req, res, next) => categoriesController.createDosageForm(req, res, next));

export default router;
