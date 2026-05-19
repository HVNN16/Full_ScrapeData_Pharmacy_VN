import express from "express";

import {
  getAssignmentReport,
  getStaffSummaryReport,
  getStaffSurveyedPharmacies,
  getAllCompanySurveyedPharmacies,
  exportCompanySurveyReportCSV,
} from "../controllers/companyReportController.js";

import {
  verifyToken,
  verifyCompany,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.use(verifyCompany);

router.get("/assignments", getAssignmentReport);
router.get("/staff-summary", getStaffSummaryReport);
router.get("/staff/:staffId/pharmacies", getStaffSurveyedPharmacies);
router.get("/pharmacies", getAllCompanySurveyedPharmacies);
router.get("/export", exportCompanySurveyReportCSV);

export default router;