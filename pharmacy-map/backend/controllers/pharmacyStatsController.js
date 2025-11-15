// controllers/pharmacyStatsController.js
import { pool } from "../db.js";

export const getProvinceStats = async (_req, res) => {
  try {
    const sql = `
      SELECT 
        province,
        COUNT(*) AS total,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating,
        SUM(CASE WHEN LOWER(status) LIKE 'open%' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN LOWER(status) LIKE 'closed%' THEN 1 ELSE 0 END) AS closed_count
      FROM pharmacy_stores_cleaned
      WHERE province IS NOT NULL
      GROUP BY province
      ORDER BY total DESC;
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error /stats/province:", err);
    res.status(500).json({ error: "server_error" });
  }
};

export const getDistrictStats = async (req, res) => {
  try {
    const { province } = req.query;

    const sql = `
      SELECT 
        district,
        COUNT(*) AS total,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating,
        SUM(CASE WHEN LOWER(status) LIKE 'open%' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN LOWER(status) LIKE 'closed%' THEN 1 ELSE 0 END) AS closed_count
      FROM pharmacy_stores_cleaned
      WHERE province ILIKE $1
      GROUP BY district
      ORDER BY total DESC;
    `;

    const { rows } = await pool.query(sql, [`%${province}%`]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error /stats/district:", err);
    res.status(500).json({ error: "server_error" });
  }
};
