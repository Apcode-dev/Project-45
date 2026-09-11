import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  getAllBranches,
  createBranch,
  updateBranch,
  getAllTransfers,
  createTransfer,
  receiveTransfer,
} from "./branches.controller.js";

const router = Router();

router.use(authenticate);

// Branch endpoints
router.get("/", getAllBranches);
router.post("/", createBranch);
router.put("/:id", updateBranch);

// Transfer endpoints
router.get("/transfers/list", getAllTransfers);
router.post("/transfers", createTransfer);
router.put("/transfers/:id/receive", receiveTransfer);

export default router;
