// // backend/server.js
// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// dotenv.config();
// import adminPharmacies from "./routes/adminPharmacies.js";
// import pharmaciesRoute from "./routes/pharmacies.js";
// import authRoutes from "./routes/auth.js";
// import adminUsersRoutes from "./routes/adminUsers.js";


// const app = express();

// // Middlewares
// app.use(cors());
// app.use(express.json());

// // API ROUTES
// app.use("/api", pharmaciesRoute);
// app.use("/api/auth", authRoutes); 
// app.use("/api/admin/pharmacies", adminPharmacies);

// app.use("/api/admin/users", adminUsersRoutes);
// // Server Start
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () =>
//   console.log(`✅ Server đang chạy ở cổng ${PORT}`)
// );
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import adminPharmacies from "./routes/adminPharmacies.js";
import pharmaciesRoute from "./routes/pharmacies.js";
import authRoutes from "./routes/auth.js";
import adminUsersRoutes from "./routes/adminUsers.js";

const app = express();

app.use(cors());
app.use(express.json());

// Cho phép truy cập ảnh đã upload
app.use("/uploads", express.static("uploads"));

// API ROUTES
app.use("/api", pharmaciesRoute);
app.use("/api/auth", authRoutes);
app.use("/api/admin/pharmacies", adminPharmacies);
app.use("/api/admin/users", adminUsersRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`✅ Server đang chạy ở cổng ${PORT}`)
);