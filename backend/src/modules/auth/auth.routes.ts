import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/register", (req, res, next) => authController.register(req, res, next));
router.post("/login", (req, res, next) => authController.login(req, res, next));
router.post("/logout", authenticate, (req, res) => authController.logout(req, res));
router.get("/me", authenticate, (req, res, next) => authController.getMe(req, res, next));
router.put("/profile", authenticate, (req, res, next) => authController.updateProfile(req, res, next));

export default router;
