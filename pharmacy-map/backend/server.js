import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

import adminPharmacies from "./routes/adminPharmacies.js";
import pharmaciesRoute from "./routes/pharmacies.js";
import authRoutes from "./routes/auth.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import surveyAreasRoutes from "./routes/surveyAreas.js";
import uploadRoutes from "./routes/upload.js";

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  })
);

// ==========================
// STATIC UPLOADS
// ==========================

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "7d",
    etag: true,
  })
);

// ==========================
// API ROUTES
// ==========================

app.use("/api", pharmaciesRoute);

app.use("/api/auth", authRoutes);

app.use("/api/admin/pharmacies", adminPharmacies);

app.use("/api/admin/users", adminUsersRoutes);

app.use("/api/survey-areas", surveyAreasRoutes);

app.use("/api", uploadRoutes);

// ==========================
// ROOT
// ==========================

app.get("/", (req, res) => {
  res.send("🚀 Pharmacy Backend Running...");
});

// ==========================
// 404
// ==========================

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
  });
});

// ==========================
// ERROR HANDLER
// ==========================

app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err);

  res.status(500).json({
    message: "Internal server error",
    error: err.message,
  });
});

// ==========================
// START SERVER
// ==========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy ở cổng ${PORT}`);
});