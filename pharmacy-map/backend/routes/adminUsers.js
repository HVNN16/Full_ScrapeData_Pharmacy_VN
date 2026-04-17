import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import {
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
} from "../controllers/adminUsersController.js";

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, getUsers);
router.post("/", verifyToken, verifyAdmin, createUser);
router.put("/:id", verifyToken, verifyAdmin, updateUser);
router.put("/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

export default router;