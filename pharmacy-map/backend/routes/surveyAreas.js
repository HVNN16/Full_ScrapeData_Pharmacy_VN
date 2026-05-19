import express from "express";

import {
  createSurveyArea,
  getMySurveyAreas,
  updateSurveyArea,
  deleteSurveyArea,

  assignSurveyAreaToStaff,
  getAssignedSurveyAreasForStaff,

  adminGetSurveyUsers,
  adminGetSurveyAreasByUser,
  adminUpdateSurveyArea,
  adminDeleteSurveyArea,
} from "../controllers/surveyAreaController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   USER / COMPANY
========================= */
router.post("/", verifyToken, createSurveyArea);
router.get("/my", verifyToken, getMySurveyAreas);

/* =========================
   COMPANY ASSIGN STAFF
========================= */
router.post("/:id/assign-staff", verifyToken, assignSurveyAreaToStaff);

/* =========================
   STAFF MOBILE / WEB
========================= */
router.get("/staff/assigned", verifyToken, getAssignedSurveyAreasForStaff);

/* =========================
   USER / COMPANY UPDATE DELETE
========================= */
router.put("/:id", verifyToken, updateSurveyArea);
router.delete("/:id", verifyToken, deleteSurveyArea);

/* =========================
   ADMIN
========================= */
router.get("/admin/users", verifyToken, adminGetSurveyUsers);
router.get("/admin/user/:userId", verifyToken, adminGetSurveyAreasByUser);
router.put("/admin/:id", verifyToken, adminUpdateSurveyArea);
router.delete("/admin/:id", verifyToken, adminDeleteSurveyArea);

export default router;