import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

import {
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserActive,
  deleteUser,
} from "../controllers/adminUsersController.js";

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, getUsers);
router.post("/", verifyToken, verifyAdmin, createUser);
router.put("/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.put("/:id/toggle-active", verifyToken, verifyAdmin, toggleUserActive);
router.put("/:id", verifyToken, verifyAdmin, updateUser);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

export default router;