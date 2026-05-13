import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const fullname = req.body.fullname?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    if (!fullname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin!",
      });
    }

    const check = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (check.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại!",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users(fullname, email, password, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, fullname, email, role, is_active
      `,
      [fullname, email, hashed, "user", true]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng ký",
      error: err.message,
    });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu!",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Email không tồn tại!",
      });
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị khóa!",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Sai mật khẩu!",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Thiếu JWT_SECRET trên server",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng nhập",
      error: err.message,
    });
  }
};