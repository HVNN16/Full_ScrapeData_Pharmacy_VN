import express from "express";

import {
  register,
  login,
  createCompanyStaff,
  getCompanyStaff,
} from "../controllers/authController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

/* =========================
   COMPANY STAFF
========================= */
router.post("/company/create-staff", verifyToken, createCompanyStaff);
router.get("/company/staff", verifyToken, getCompanyStaff);

export default router;