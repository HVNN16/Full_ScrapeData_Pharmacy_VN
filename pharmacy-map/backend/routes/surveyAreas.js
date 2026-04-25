import express from "express";
import {
  createSurveyArea,
  getMySurveyAreas,
  updateSurveyArea,
  deleteSurveyArea,
} from "../controllers/surveyAreaController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createSurveyArea);
router.get("/my", verifyToken, getMySurveyAreas);
router.put("/:id", verifyToken, updateSurveyArea);
router.delete("/:id", verifyToken, deleteSurveyArea);

export default router;