import { pool } from "../db.js";

const canUseSurveyArea = (role) => ["admin", "company"].includes(role);

export const createSurveyArea = async (req, res) => {
  try {
    if (!canUseSurveyArea(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền lưu vùng!" });
    }

    const { name, polygon } = req.body;

    if (!name || !polygon) {
      return res.status(400).json({ message: "Thiếu tên vùng hoặc polygon!" });
    }

    const sql = `
      INSERT INTO survey_areas (user_id, name, polygon)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, [
      req.user.id,
      name,
      JSON.stringify(polygon),
    ]);

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Lỗi lưu vùng:", err);
    res.status(500).json({ message: "server_error" });
  }
};

export const getMySurveyAreas = async (req, res) => {
  try {
    if (!canUseSurveyArea(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền xem vùng!" });
    }

    const sql = `
      SELECT id, user_id, name, polygon, created_at, updated_at
      FROM survey_areas
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;

    const { rows } = await pool.query(sql, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi lấy vùng:", err);
    res.status(500).json({ message: "server_error" });
  }
};

export const updateSurveyArea = async (req, res) => {
  try {
    if (!canUseSurveyArea(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền sửa vùng!" });
    }

    const { id } = req.params;
    const { name, polygon } = req.body;

    const sql = `
      UPDATE survey_areas
      SET
        name = COALESCE($1, name),
        polygon = COALESCE($2, polygon),
        updated_at = NOW()
      WHERE id = $3
      AND user_id = $4
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, [
      name || null,
      polygon ? JSON.stringify(polygon) : null,
      id,
      req.user.id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy vùng!" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Lỗi sửa vùng:", err);
    res.status(500).json({ message: "server_error" });
  }
};

export const deleteSurveyArea = async (req, res) => {
  try {
    if (!canUseSurveyArea(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền xoá vùng!" });
    }

    const { id } = req.params;

    const sql = `
      DELETE FROM survey_areas
      WHERE id = $1
      AND user_id = $2
      RETURNING id;
    `;

    const { rows } = await pool.query(sql, [id, req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy vùng!" });
    }

    res.json({ message: "Đã xoá vùng!", id });
  } catch (err) {
    console.error("❌ Lỗi xoá vùng:", err);
    res.status(500).json({ message: "server_error" });
  }
};