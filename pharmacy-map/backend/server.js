// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import adminPharmacies from "./routes/adminPharmacies.js";
import pharmaciesRoute from "./routes/pharmacies.js";
import authRoutes from "./routes/auth.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import surveyAreasRoutes from "./routes/surveyAreas.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API ROUTES
app.use("/api", pharmaciesRoute);
app.use("/api/auth", authRoutes); 
app.use("/api/admin/pharmacies", adminPharmacies);
app.use("/api/survey-areas", surveyAreasRoutes);
app.use("/api/admin/users", adminUsersRoutes);
// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server đang chạy ở cổng ${PORT}`)
);