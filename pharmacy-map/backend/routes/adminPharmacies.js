import express from "express";
import { pool } from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ====================== GET LIST ======================
// GET + FILTER + SEARCH + PAGINATION
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  const search = req.query.search || "";
  const province = req.query.province || "";
  const district = req.query.district || "";

  let where = "WHERE 1=1";
  let params = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }

  if (province) {
    params.push(province);
    where += ` AND province = $${params.length}`;
  }

  if (district) {
    params.push(district);
    where += ` AND district = $${params.length}`;
  }

  // lấy dữ liệu
  const sql = `
    SELECT * FROM pharmacy_stores_cleaned
    ${where}
    ORDER BY id
    LIMIT ${limit} OFFSET ${offset};
  `;

  // tổng số bản ghi
  const countSql = `
    SELECT COUNT(*) FROM pharmacy_stores_cleaned
    ${where};
  `;

  const data = await pool.query(sql, params);
  const total = await pool.query(countSql, params);

  res.json({
    rows: data.rows,
    total: Number(total.rows[0].count),
    page,
    totalPages: Math.ceil(total.rows[0].count / limit)
  });
});



// ====================== ADD ======================
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      address,
      province,
      district,
      phone,
      status,
      rating,
      latitude,
      longitude,
    } = req.body;

    const sql = `
      INSERT INTO pharmacy_stores_cleaned 
      (name, address, province, district, phone, status, rating, geom, longitude, latitude)
      VALUES ($1,$2,$3,$4,$5,$6,$7, ST_SetSRID(ST_Point($8,$9),4326), $8, $9)
      RETURNING *;
    `;

    const result = await pool.query(sql, [
      name,
      address,
      province,
      district,
      phone,
      status,
      rating,
      longitude, // long trước
      latitude,  // lat sau
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "POST error" });
  }
});

// ====================== UPDATE ======================
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const {
      name,
      address,
      province,
      district,
      phone,
      status,
      rating,
      latitude,
      longitude,
    } = req.body;

    const sql = `
      UPDATE pharmacy_stores_cleaned SET
        name=$1,
        address=$2,
        province=$3,
        district=$4,
        phone=$5,
        status=$6,
        rating=$7,
        geom = ST_SetSRID(ST_Point($8, $9), 4326),
        longitude=$8,
        latitude=$9
      WHERE id=$10
      RETURNING *;
    `;

    const result = await pool.query(sql, [
      name,
      address,
      province,
      district,
      phone,
      status,
      rating,
      longitude,
      latitude,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PUT error" });
  }
});

// ====================== DELETE ======================
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("DELETE FROM pharmacy_stores_cleaned WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DELETE error" });
  }
});

export default router;
