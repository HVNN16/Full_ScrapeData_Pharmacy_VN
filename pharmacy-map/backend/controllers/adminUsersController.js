import bcrypt from "bcryptjs";
import { pool } from "../db.js";

// GET /api/admin/users
export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, fullname, email, role
      FROM users
      ORDER BY id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /admin/users error:", err);
    res.status(500).json({ message: "Không tải được danh sách user" });
  }
};

// POST /api/admin/users
export const createUser = async (req, res) => {
  try {
    const { fullname, email, password, role } = req.body;

    if (!fullname || !email || !password || !role) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ fullname, email, password, role",
      });
    }

    if (!["user", "company", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const checkEmail = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (checkEmail.rowCount > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (fullname, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, fullname, email, role
      `,
      [fullname, email, hashedPassword, role]
    );

    res.status(201).json({
      success: true,
      message: "Thêm user thành công",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("POST /admin/users error:", err);
    res.status(500).json({ message: "Không thêm được user" });
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { fullname, email, password, role } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    if (!fullname || !email || !role) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ fullname, email, role",
      });
    }

    if (!["user", "company", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const checkUser = await pool.query(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (checkUser.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const checkEmail = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1`,
      [email, id]
    );

    if (checkEmail.rowCount > 0) {
      return res.status(400).json({ message: "Email đã tồn tại ở user khác" });
    }

    let result;

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);

      result = await pool.query(
        `
        UPDATE users
        SET fullname = $1,
            email = $2,
            password = $3,
            role = $4
        WHERE id = $5
        RETURNING id, fullname, email, role
        `,
        [fullname, email, hashedPassword, role, id]
      );
    } else {
      result = await pool.query(
        `
        UPDATE users
        SET fullname = $1,
            email = $2,
            role = $3
        WHERE id = $4
        RETURNING id, fullname, email, role
        `,
        [fullname, email, role, id]
      );
    }

    res.json({
      success: true,
      message: "Cập nhật user thành công",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("PUT /admin/users/:id error:", err);
    res.status(500).json({ message: "Không cập nhật được user" });
  }
};

// PUT /api/admin/users/:id/role
export const updateUserRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    if (!["user", "company", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, fullname, email, role
      `,
      [role, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("PUT /admin/users/:id/role error:", err);
    res.status(500).json({ message: "Không cập nhật được role" });
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const result = await pool.query(
      `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, fullname, email, role
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.json({
      success: true,
      message: "Xóa user thành công",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("DELETE /admin/users/:id error:", err);
    res.status(500).json({ message: "Không xóa được user" });
  }
};