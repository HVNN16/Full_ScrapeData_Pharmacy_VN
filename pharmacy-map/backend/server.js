import express from "express";
import cors from "cors";
import pharmaciesRoute from "./routes/pharmacies.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", pharmaciesRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server đang chạy tại http://localhost:${PORT}`));
