import express from "express";

import {
  getPharmaciesGeoJSON,
  getPharmaciesList,
  getHeatmap,
  updatePharmacy,
} from "../controllers/pharmacyGeoController.js";

import { getProvinces } from "../controllers/pharmacyDropdownController.js";

import {
  getProvinceStats,
  getDistrictStats,
} from "../controllers/pharmacyStatsController.js";

import { exportPharmaciesCSV } from "../controllers/exportController.js";
import { getRoute } from "../controllers/routeController.js";

import {
  verifyToken,
  verifyExportRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/pharmacies", getPharmaciesList);
router.get("/pharmacies.geojson", getPharmaciesGeoJSON);

router.get("/provinces", getProvinces);

router.get("/heat", getHeatmap);
router.get("/heatmap", getHeatmap);

router.get("/stats/province", getProvinceStats);
router.get("/stats/district", getDistrictStats);

router.get("/route", getRoute);

// Tạm thời mở để Flutter test cập nhật.
// Sau khi ổn và Flutter đã gửi token thì đổi thành:
// router.put("/pharmacies/:id", verifyToken, updatePharmacy);
router.put("/pharmacies/:id", updatePharmacy);

router.get("/export-csv", verifyToken, verifyExportRole, exportPharmaciesCSV);

export default router;