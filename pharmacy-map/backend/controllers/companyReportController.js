import { Parser } from "json2csv";
import { pool } from "../db.js";

const TABLE_NAME = "pharmacy_stores_cleaned";

const getCompanyId = (req) => {
  if (req.user.role === "company") return req.user.id;
  return null;
};

const ensureCompany = (req, res) => {
  if (req.user.role !== "company") {
    res.status(403).json({
      success: false,
      message: "Chỉ company mới được xem báo cáo!",
    });
    return false;
  }

  return true;
};

/* =========================
   1. VÙNG NÀO GIAO CHO NHÂN VIÊN NÀO
========================= */
export const getAssignmentReport = async (req, res) => {
  try {
    if (!ensureCompany(req, res)) return;

    const companyId = getCompanyId(req);

    const { rows } = await pool.query(
      `
      SELECT
        saa.id AS assignment_id,
        saa.assigned_at,

        sa.id AS area_id,
        sa.name AS area_name,
        sa.polygon,

        u.id AS staff_id,
        u.fullname AS staff_name,
        u.email AS staff_email,
        u.is_active AS staff_is_active,

        COUNT(DISTINCT p.id)::int AS surveyed_count,

        COUNT(DISTINCT area_pharmacy.id)::int AS total_pharmacies_in_area,

        (
          COUNT(DISTINCT area_pharmacy.id)
          -
          COUNT(DISTINCT p.id)
        )::int AS remaining_count

      FROM survey_area_assignments saa

      JOIN survey_areas sa
        ON sa.id = saa.survey_area_id

      JOIN users u
        ON u.id = saa.staff_id

      LEFT JOIN ${TABLE_NAME} p
        ON p.surveyed_by = u.id
        AND p.surveyed_company_id = saa.company_id
        AND p.is_surveyed = true

      LEFT JOIN ${TABLE_NAME} area_pharmacy
        ON area_pharmacy.latitude IS NOT NULL
        AND area_pharmacy.longitude IS NOT NULL
        AND area_pharmacy.latitude != 0
        AND area_pharmacy.longitude != 0
        AND ST_Contains(
          ST_SetSRID(
            ST_GeomFromGeoJSON(sa.polygon::text),
            4326
          ),
          ST_SetSRID(
            ST_MakePoint(
              area_pharmacy.longitude,
              area_pharmacy.latitude
            ),
            4326
          )
        )

      WHERE saa.company_id = $1

      GROUP BY
        saa.id,
        saa.assigned_at,
        sa.id,
        sa.name,
        sa.polygon,
        u.id,
        u.fullname,
        u.email,
        u.is_active

      ORDER BY saa.assigned_at DESC;
      `,
      [companyId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("GET ASSIGNMENT REPORT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi lấy báo cáo vùng giao",
      error: err.message,
    });
  }
};

/* =========================
   2. THỐNG KÊ NHÂN VIÊN
========================= */
export const getStaffSummaryReport = async (req, res) => {
  try {
    if (!ensureCompany(req, res)) return;

    const companyId = getCompanyId(req);

    const { rows } = await pool.query(
      `
      SELECT
        u.id AS staff_id,
        u.fullname AS staff_name,
        u.email AS staff_email,
        u.is_active,

        COUNT(DISTINCT saa.survey_area_id)::int AS assigned_area_count,

        COUNT(DISTINCT p.id)::int AS surveyed_total,

        COUNT(
          DISTINCT CASE 
            WHEN p.surveyed_at::date = CURRENT_DATE 
            THEN p.id 
          END
        )::int AS surveyed_today,

        COUNT(
          DISTINCT CASE 
            WHEN date_trunc('month', p.surveyed_at) = date_trunc('month', NOW()) 
            THEN p.id 
          END
        )::int AS surveyed_this_month,

        MAX(p.surveyed_at) AS last_surveyed_at

      FROM users u

      LEFT JOIN survey_area_assignments saa
        ON saa.staff_id = u.id
        AND saa.company_id = $1

      LEFT JOIN ${TABLE_NAME} p
        ON p.surveyed_by = u.id
        AND p.surveyed_company_id = $1
        AND p.is_surveyed = true

      WHERE u.role = 'company_staff'
        AND u.company_id = $1

      GROUP BY
        u.id,
        u.fullname,
        u.email,
        u.is_active

      ORDER BY surveyed_total DESC, u.created_at DESC;
      `,
      [companyId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("GET STAFF SUMMARY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi lấy thống kê nhân viên",
      error: err.message,
    });
  }
};

/* =========================
   3. CHI TIẾT NHÀ THUỐC ĐÃ KHẢO SÁT CỦA NHÂN VIÊN
========================= */
export const getStaffSurveyedPharmacies = async (req, res) => {
  try {
    if (!ensureCompany(req, res)) return;

    const companyId = getCompanyId(req);
    const staffId = Number(req.params.staffId);

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "staffId không hợp lệ",
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
      [staffId, companyId]
    );

    if (staffCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên thuộc công ty này",
      });
    }

    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.address,
        p.province,
        p.district,
        p.phone,
        p.status,
        p.rating,
        COALESCE(p.image_url, p.image) AS image_url,
        p.product_groups,
        p.owner_name,
        p.is_surveyed,
        p.surveyed_at,
        p.surveyed_by,
        p.surveyed_company_id,
        p.latitude AS lat,
        p.longitude AS lng,

        u.fullname AS surveyed_by_name,
        c.fullname AS surveyed_company_name

      FROM ${TABLE_NAME} p

      LEFT JOIN users u
        ON u.id = p.surveyed_by

      LEFT JOIN users c
        ON c.id = p.surveyed_company_id

      WHERE p.is_surveyed = true
        AND p.surveyed_by = $1
        AND p.surveyed_company_id = $2

      ORDER BY p.surveyed_at DESC;
      `,
      [staffId, companyId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("GET STAFF PHARMACIES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi lấy chi tiết nhà thuốc nhân viên khảo sát",
      error: err.message,
    });
  }
};

/* =========================
   4. TẤT CẢ NHÀ THUỐC ĐÃ KHẢO SÁT CỦA COMPANY
========================= */
export const getAllCompanySurveyedPharmacies = async (req, res) => {
  try {
    if (!ensureCompany(req, res)) return;

    const companyId = getCompanyId(req);
    const { staffId } = req.query;

    const values = [companyId];
    let staffFilter = "";

    if (staffId && staffId !== "all") {
      values.push(Number(staffId));
      staffFilter = `AND p.surveyed_by = $2`;
    }

    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.address,
        p.province,
        p.district,
        p.phone,
        p.status,
        p.rating,
        COALESCE(p.image_url, p.image) AS image_url,
        p.product_groups,
        p.owner_name,
        p.is_surveyed,
        p.surveyed_at,
        p.surveyed_by,
        p.surveyed_company_id,
        p.latitude AS lat,
        p.longitude AS lng,

        u.fullname AS surveyed_by_name,
        u.email AS surveyed_by_email,
        c.fullname AS surveyed_company_name

      FROM ${TABLE_NAME} p

      LEFT JOIN users u
        ON u.id = p.surveyed_by

      LEFT JOIN users c
        ON c.id = p.surveyed_company_id

      WHERE p.is_surveyed = true
        AND p.surveyed_company_id = $1
        ${staffFilter}

      ORDER BY p.surveyed_at DESC;
      `,
      values
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("GET COMPANY SURVEYED PHARMACIES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách nhà thuốc đã khảo sát",
      error: err.message,
    });
  }
};

/* =========================
   5. XUẤT CSV THEO STAFF / TẤT CẢ
========================= */
export const exportCompanySurveyReportCSV = async (req, res) => {
  try {
    if (!ensureCompany(req, res)) return;

    const companyId = getCompanyId(req);
    const { staffId = "all" } = req.query;

    const values = [companyId];
    let staffFilter = "";

    if (staffId && staffId !== "all") {
      values.push(Number(staffId));
      staffFilter = `AND p.surveyed_by = $2`;
    }

    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.address,
        p.province,
        p.district,
        p.phone,
        p.status,
        p.rating,
        p.owner_name,
        p.product_groups,
        COALESCE(p.image_url, p.image) AS image_url,
        p.is_surveyed,
        p.surveyed_at,
        u.fullname AS surveyed_by_name,
        u.email AS surveyed_by_email,
        c.fullname AS surveyed_company_name,
        p.latitude,
        p.longitude
      FROM ${TABLE_NAME} p
      LEFT JOIN users u ON u.id = p.surveyed_by
      LEFT JOIN users c ON c.id = p.surveyed_company_id
      WHERE p.is_surveyed = true
        AND p.surveyed_company_id = $1
        ${staffFilter}
      ORDER BY p.surveyed_at DESC;
      `,
      values
    );

    const parser = new Parser({
      fields: [
        "id",
        "name",
        "address",
        "province",
        "district",
        "phone",
        "status",
        "rating",
        "owner_name",
        "product_groups",
        "image_url",
        "is_surveyed",
        "surveyed_at",
        "surveyed_by_name",
        "surveyed_by_email",
        "surveyed_company_name",
        "latitude",
        "longitude",
      ],
    });

    const csv = parser.parse(rows);

    const filename =
      staffId && staffId !== "all"
        ? `staff_${staffId}_survey_report.csv`
        : `company_survey_report.csv`;

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.attachment(filename);
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error("EXPORT COMPANY REPORT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi export báo cáo",
      error: err.message,
    });
  }
};