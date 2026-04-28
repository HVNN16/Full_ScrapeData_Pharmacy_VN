// import express from "express";
// import {
//   createSurveyArea,
//   getMySurveyAreas,
//   updateSurveyArea,
//   deleteSurveyArea,
// } from "../controllers/surveyAreaController.js";
// import { verifyToken } from "../middleware/authMiddleware.js";

// const router = express.Router();

// router.post("/", verifyToken, createSurveyArea);
// router.get("/my", verifyToken, getMySurveyAreas);
// router.put("/:id", verifyToken, updateSurveyArea);
// router.delete("/:id", verifyToken, deleteSurveyArea);

// export default router;

import express from "express";
import {
  createSurveyArea,
  getMySurveyAreas,
  updateSurveyArea,
  deleteSurveyArea,

  // 👇 ADMIN
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
router.put("/:id", verifyToken, updateSurveyArea);
router.delete("/:id", verifyToken, deleteSurveyArea);

/* =========================
   ADMIN
========================= */

// 📌 Lấy danh sách user có vùng khảo sát
router.get("/admin/users", verifyToken, adminGetSurveyUsers);

// 📌 Lấy vùng theo user
router.get("/admin/user/:userId", verifyToken, adminGetSurveyAreasByUser);

// 📌 Admin sửa vùng bất kỳ
router.put("/admin/:id", verifyToken, adminUpdateSurveyArea);

// 📌 Admin xoá vùng bất kỳ
router.delete("/admin/:id", verifyToken, adminDeleteSurveyArea);

export default router;