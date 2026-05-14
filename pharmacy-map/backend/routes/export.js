import express from "express";

import { exportPharmaciesCSV }
from "../controllers/exportController.js";

import { verifyToken }
from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/export-csv",
  verifyToken,
  exportPharmaciesCSV
);

export default router;