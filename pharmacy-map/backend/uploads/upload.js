import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = "uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `pharmacy_${Date.now()}_${Math.round(
      Math.random() * 1e9
    )}${ext}`;

    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/upload-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Không có file ảnh",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.json({
      message: "Upload ảnh thành công",
      image_url: `${baseUrl}/uploads/${req.file.filename}`,
    });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi upload ảnh",
      error: err.message,
    });
  }
});

export default router;