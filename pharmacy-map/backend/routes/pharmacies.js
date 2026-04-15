import express from "express";
import {
  getPharmaciesGeoJSON,
  getHeatmap,
} from "../controllers/pharmacyGeoController.js";
import { getProvinces } from "../controllers/pharmacyDropdownController.js";
import {
  getProvinceStats,
  getDistrictStats,
} from "../controllers/pharmacyStatsController.js";
import { exportPharmaciesCSV } from "../controllers/exportController.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.get("/pharmacies.geojson", getPharmaciesGeoJSON);
router.get("/provinces", getProvinces);
router.get("/heat", getHeatmap);
router.get("/stats/province", getProvinceStats);
router.get("/stats/district", getDistrictStats);
router.get("/export-csv", verifyToken, verifyAdmin, exportPharmaciesCSV);

export default router;