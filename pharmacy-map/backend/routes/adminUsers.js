import express from "express";
import { pool } from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Lấy danh sách user
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
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
});

// Đổi role
router.put("/:id/role", verifyToken, verifyAdmin, async (req, res) => {
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
});

export default router;