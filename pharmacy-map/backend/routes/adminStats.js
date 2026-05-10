import express from "express";
import { pool } from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const pharmacySql = `
      SELECT
        COUNT(*)::int AS total_pharmacies,
        COUNT(*) FILTER (WHERE COALESCE(is_surveyed, false) = true)::int AS surveyed_pharmacies,
        COUNT(*) FILTER (WHERE COALESCE(is_surveyed, false) = false)::int AS unsurveyed_pharmacies,
        COUNT(*) FILTER (
          WHERE NULLIF(BTRIM(COALESCE(image,'')), '') IS NOT NULL
        )::int AS pharmacies_with_image
      FROM pharmacy_stores_cleaned;
    `;

    const userSql = `
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE role = 'user')::int AS normal_users,
        COUNT(*) FILTER (WHERE role = 'company')::int AS company_users,
        COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_users
      FROM users;
    `;

    const [pharmacyRes, userRes] = await Promise.all([
      pool.query(pharmacySql),
      pool.query(userSql),
    ]);

    res.json({
      ...(pharmacyRes.rows[0] || {}),
      ...(userRes.rows[0] || {}),
    });
  } catch (err) {
    console.error("GET /admin/stats error:", err);
    res.status(500).json({
      message: "Không tải được thống kê admin",
      error: err.message,
    });
  }
});

export default router;
