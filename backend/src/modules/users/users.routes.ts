import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import {
  getAllUsers,
  createUser,
  updateUser,
  resetUserPassword,
} from "./users.controller.js";

const router = Router();

router.use(authenticate);

// Admin-only user management
router.get("/", authorize("ADMIN"), getAllUsers);
router.post("/", authorize("ADMIN"), createUser);
router.put("/:id", authorize("ADMIN"), updateUser);
router.put("/:id/reset-password", authorize("ADMIN"), resetUserPassword);

export default router;
