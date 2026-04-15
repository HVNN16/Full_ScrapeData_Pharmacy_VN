import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

// ================= REGISTER =================
export const register = async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }

    const check = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (check.rowCount > 0) {
      return res.status(400).json({ message: "Email đã tồn tại!" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users(fullname, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, fullname, email, role
      `,
      [fullname, email, hashed, "user"]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu!" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Email không tồn tại!" });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Sai mật khẩu!" });
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
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};