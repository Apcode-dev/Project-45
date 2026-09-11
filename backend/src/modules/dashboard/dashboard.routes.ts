import { Router } from "express";
import { dashboardController } from "./dashboard.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.get("/stats", authenticate, (req, res, next) =>
  dashboardController.getStats(req, res, next)
);

export default router;
