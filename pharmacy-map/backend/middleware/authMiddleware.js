import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ!" });
  }
};

export const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ admin mới truy cập!" });
  }
  next();
};

export const verifyExportRole = (req, res, next) => {
  if (!["admin", "company"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Chỉ company hoặc admin mới được export!",
    });
  }
  next();
};