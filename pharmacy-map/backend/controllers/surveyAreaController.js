import { pool } from "../db.js";

const canUseSurveyArea = (role) => ["admin", "company"].includes(role);
const isAdmin = (role) => role === "admin";

const parsePolygon = (polygon) => {
  if (!polygon) return null;
  if (typeof polygon === "string") return polygon;
  return JSON.stringify(polygon);
};

/* =========================
   COMPANY / ADMIN: CREATE
========================= */
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
      RETURNING id, user_id, name, polygon, created_at, updated_at;
    `;

    const { rows } = await pool.query(sql, [
      req.user.id,
      name.trim(),
      parsePolygon(polygon),
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ Lỗi lưu vùng:", err);
    res.status(500).json({ message: "server_error", error: err.message });
  }
};

/* =========================
   COMPANY / ADMIN: GET MY AREAS
========================= */
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
    res.status(500).json({ message: "server_error", error: err.message });
  }
};

/* =========================
   COMPANY / ADMIN: UPDATE OWN AREA
========================= */
export const updateSurveyArea = async (req, res) => {
  try {
    if (!canUseSurveyArea(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền sửa vùng!" });
    }

    const { id } = req.params;
    const { name, polygon } = req.body;

    if (!name && !polygon) {
      return res.status(400).json({ message: "Không có dữ liệu cần sửa!" });
    }

    const sql = `
      UPDATE survey_areas
      SET
        name = COALESCE($1, name),
        polygon = COALESCE($2, polygon),
        updated_at = NOW()
      WHERE id = $3
        AND user_id = $4
      RETURNING id, user_id, name, polygon, created_at, updated_at;
    `;

    const { rows } = await pool.query(sql, [
      name ? name.trim() : null,
      polygon ? parsePolygon(polygon) : null,
      id,
      req.user.id,
    ]);

    if (!rows.length) {
      return res.status(404).json({
        message: "Không tìm thấy vùng hoặc không có quyền sửa!",
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Lỗi sửa vùng:", err);
    res.status(500).json({ message: "server_error", error: err.message });
  }
};

/* =========================
   COMPANY / ADMIN: DELETE OWN AREA
========================= */
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
      return res.status(404).json({
        message: "Không tìm thấy vùng hoặc không có quyền xoá!",
      });
    }

    res.json({ message: "Đã xoá vùng!", id: rows[0].id });
  } catch (err) {
    console.error("❌ Lỗi xoá vùng:", err);
    res.status(500).json({ message: "server_error", error: err.message });
  }
};

/* =========================
   COMPANY: ASSIGN AREA TO STAFF
========================= */
export const assignSurveyAreaToStaff = async (req, res) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({
        success: false,
        message: "Chỉ company mới được giao vùng khảo sát!",
      });
    }

    const areaId = Number(req.params.id);
    const staffId = Number(req.body.staffId);

    if (!areaId || !staffId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu areaId hoặc staffId!",
      });
    }

    const areaCheck = await pool.query(
      `
      SELECT id
      FROM survey_areas
      WHERE id = $1
        AND user_id = $2
      `,
      [areaId, req.user.id]
    );

    if (areaCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Vùng không tồn tại hoặc không thuộc công ty này!",
      });
    }

    const staffCheck = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
        AND role = 'company_staff'
        AND company_id = $2
      `,
      [staffId, req.user.id]
    );

    if (staffCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Nhân viên không tồn tại hoặc không thuộc công ty này!",
      });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO survey_area_assignments (
        survey_area_id,
        staff_id,
        company_id
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (survey_area_id, staff_id)
      DO UPDATE SET assigned_at = NOW()
      RETURNING id, survey_area_id, staff_id, company_id, assigned_at;
      `,
      [areaId, staffId, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "Giao vùng thành công!",
      assignment: rows[0],
    });
  } catch (err) {
    console.error("❌ Lỗi giao vùng:", err);
    res.status(500).json({
      success: false,
      message: "server_error",
      error: err.message,
    });
  }
};

/* =========================
   COMPANY / STAFF: GET ASSIGNED AREAS
========================= */
export const getAssignedSurveyAreasForStaff = async (req, res) => {
  try {
    if (!["company", "company_staff"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem vùng được giao!",
      });
    }

    let sql;
    let params;

    if (req.user.role === "company_staff") {
  sql = `
    SELECT 
      saa.id AS assignment_id,
      saa.assigned_at,

      sa.id,
      sa.user_id,
      sa.name,
      sa.polygon,
      sa.created_at,
      sa.updated_at,

      c.id AS company_id,
      c.fullname AS company_name,
      c.email AS company_email

    FROM survey_area_assignments saa

    JOIN survey_areas sa
      ON sa.id = saa.survey_area_id

    JOIN users c
      ON c.id = saa.company_id

    WHERE saa.staff_id = $1

    ORDER BY saa.assigned_at DESC;
  `;

  params = [req.user.id];
} else {
  sql = `
    SELECT 
      saa.id AS assignment_id,
      saa.assigned_at,

      sa.id,
      sa.user_id,
      sa.name,
      sa.polygon,
      sa.created_at,
      sa.updated_at

    FROM survey_area_assignments saa

    JOIN survey_areas sa
      ON sa.id = saa.survey_area_id

    WHERE saa.company_id = $1

    ORDER BY saa.assigned_at DESC;
  `;

  params = [req.user.id];
}

    const { rows } = await pool.query(sql, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy vùng được giao:", err);
    res.status(500).json({
      success: false,
      message: "server_error",
      error: err.message,
    });
  }
};

/* =========================
   ADMIN: GET USERS HAVING ROLE COMPANY / ADMIN
========================= */
export const adminGetSurveyUsers = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        message: "Chỉ admin mới được xem danh sách user!",
      });
    }

    const sql = `
      SELECT 
        u.id,
        u.fullname,
        u.email,
        u.role,
        COUNT(sa.id) AS area_count
      FROM users u
      LEFT JOIN survey_areas sa ON sa.user_id = u.id
      WHERE u.role IN ('company', 'admin')
      GROUP BY u.id, u.fullname, u.email, u.role
      ORDER BY area_count DESC, u.id DESC;
    `;

    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi admin lấy user vùng khảo sát:", err);
    res.status(500).json({ message: "server_error", error: err.message });
  }
};

/* =========================
   ADMIN: GET AREAS BY USER
========================= */
export const adminGetSurveyAreasByUser = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        message: "Chỉ admin mới được xem vùng của user!",
      });
    }

    const { userId } = req.params;

    const sql = `
      SELECT 
        sa.id,
        sa.user_id,
        sa.name,
        sa.polygon,
        sa.created_at,
        sa.updated_at,
        u.fullname,
        u.email,
        u.role
      FROM survey_areas sa
      JOIN users u ON u.id = sa.user_id
      WHERE sa.user_id = $1
      ORDER BY sa.created_at DESC;
    `;

    const { rows } = await pool.query(sql, [userId]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi admin lấy vùng theo user:", err);
    res.status(500).json({ message: "server_error", error: err.message });
  }
};

/* =========================
   ADMIN: UPDATE ANY AREA
========================= */
export const adminUpdateSurveyArea = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        message: "Chỉ admin mới được sửa vùng này!",
      });
    }

    const { id } = req.params;
    const { name, polygon } = req.body;

    if (!name && !polygon) {
      return res.status(400).json({ message: "Không có dữ liệu cần sửa!" });
    }

    const sql = `
      UPDATE survey_areas
      SET
        name = COALESCE($1, name),
        polygon = COALESCE($2, polygon),
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, user_id, name, polygon, created_at, updated_at;
    `;

    const { rows } = await pool.query(sql, [
      name ? name.trim() : null,
      polygon ? parsePolygon(polygon) : null,
      id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy vùng!" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Lỗi admin sửa vùng:", err);
    res.status(500).json({ message: "server_error", error: err.message });
  }
};

/* =========================
   ADMIN: DELETE ANY AREA
========================= */
export const adminDeleteSurveyArea = async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        message: "Chỉ admin mới được xoá vùng này!",
      });
    }

    const { id } = req.params;

    const sql = `
      DELETE FROM survey_areas
      WHERE id = $1
      RETURNING id;
    `;

    const { rows } = await pool.query(sql, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy vùng!" });
    }

    res.json({ message: "Admin đã xoá vùng!", id: rows[0].id });
  } catch (err) {
    console.error("❌ Lỗi admin xoá vùng:", err);
    res.status(500).json({ message: "server_error", error: err.message });
  }
};