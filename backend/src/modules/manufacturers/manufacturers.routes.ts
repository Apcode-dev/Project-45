import { Router } from "express";
import { manufacturersController } from "./manufacturers.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.get("/", authenticate, (req, res, next) => manufacturersController.getManufacturers(req, res, next));
router.post("/", authenticate, (req, res, next) => manufacturersController.createManufacturer(req, res, next));
router.put("/:id", authenticate, (req, res, next) => manufacturersController.updateManufacturer(req, res, next));
router.delete("/:id", authenticate, (req, res, next) => manufacturersController.deleteManufacturer(req, res, next));

export default router;
