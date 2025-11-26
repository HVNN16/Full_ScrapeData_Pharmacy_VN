import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

// ================= REGISTER =================
export const register = async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    const check = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (check.rowCount > 0) {
      return res.status(400).json({ message: "Email đã tồn tại!" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users(fullname, email, password) VALUES ($1,$2,$3) RETURNING id, fullname, email, role",
      [fullname, email, hashed]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rowCount === 0)
    return res.status(400).json({ message: "Email không tồn tại!" });

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(400).json({ message: "Sai mật khẩu!" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    role: user.role,
    fullname: user.fullname,
  });
};
