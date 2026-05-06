// // import express from "express";
// // import {
// //   getPharmaciesGeoJSON,
// //   getHeatmap,
// // } from "../controllers/pharmacyGeoController.js";
// // import { getProvinces } from "../controllers/pharmacyDropdownController.js";
// // import {
// //   getProvinceStats,
// //   getDistrictStats,
// // } from "../controllers/pharmacyStatsController.js";
// // import { exportPharmaciesCSV } from "../controllers/exportController.js";
// // import {
// //   verifyToken,
// //   verifyAdmin,
// //   verifyExportRole,
// // } from "../middleware/authMiddleware.js";

// // const router = express.Router();

// // router.get("/pharmacies.geojson", getPharmaciesGeoJSON);
// // router.get("/provinces", getProvinces);
// // router.get("/heat", getHeatmap);
// // router.get("/stats/province", getProvinceStats);
// // router.get("/stats/district", getDistrictStats);

// // // admin + company đều export được
// // router.get("/export-csv", verifyToken, verifyExportRole, exportPharmaciesCSV);

// // export default router;

// // import express from "express";
// // import {
// //   getPharmaciesGeoJSON,
// //   getPharmaciesList,
// //   getHeatmap,
// // } from "../controllers/pharmacyGeoController.js";
// // import { getProvinces } from "../controllers/pharmacyDropdownController.js";
// // import {
// //   getProvinceStats,
// //   getDistrictStats,
// // } from "../controllers/pharmacyStatsController.js";
// // import { exportPharmaciesCSV } from "../controllers/exportController.js";
// // import {
// //   verifyToken,
// //   verifyExportRole,
// // } from "../middleware/authMiddleware.js";

// // const router = express.Router();

// // router.get("/pharmacies", getPharmaciesList);
// // router.get("/pharmacies.geojson", getPharmaciesGeoJSON);
// // router.get("/provinces", getProvinces);
// // router.get("/heat", getHeatmap);
// // router.get("/stats/province", getProvinceStats);
// // router.get("/stats/district", getDistrictStats);

// // // admin + company đều export được
// // router.get("/export-csv", verifyToken, verifyExportRole, exportPharmaciesCSV);

// // export default router;

// import express from "express";
// import {
//   getPharmaciesGeoJSON,
//   getPharmaciesList,
//   getHeatmap,
// } from "../controllers/pharmacyGeoController.js";
// import { getProvinces } from "../controllers/pharmacyDropdownController.js";
// import {
//   getProvinceStats,
//   getDistrictStats,
// } from "../controllers/pharmacyStatsController.js";
// import { exportPharmaciesCSV } from "../controllers/exportController.js";
// import { getRoute } from "../controllers/routeController.js";
// import {
//   verifyToken,
//   verifyExportRole,
// } from "../middleware/authMiddleware.js";

// const router = express.Router();

// router.get("/pharmacies", getPharmaciesList);
// router.get("/pharmacies.geojson", getPharmaciesGeoJSON);
// router.get("/provinces", getProvinces);
// router.get("/heat", getHeatmap);
// router.get("/stats/province", getProvinceStats);
// router.get("/stats/district", getDistrictStats);
// router.get("/route", getRoute);

// // admin + company đều export được
// router.get("/export-csv", verifyToken, verifyExportRole, exportPharmaciesCSV);

// export default router;
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
router.get("/stats/province", getProvinceStats);
router.get("/stats/district", getDistrictStats);
router.get("/route", getRoute);

// Tạm thời không chặn token để Flutter test cập nhật trước
router.put("/pharmacies/:id", updatePharmacy);

// admin + company đều export được
router.get("/export-csv", verifyToken, verifyExportRole, exportPharmaciesCSV);

export default router;