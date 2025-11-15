// controllers/pharmacyDropdownController.js
import { pool } from "../db.js";

export const getProvinces = async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT DISTINCT province
    FROM pharmacy_stores_cleaned
    WHERE province IS NOT NULL
    ORDER BY province;
  `);
  res.json(rows.map(r => r.province));
};
