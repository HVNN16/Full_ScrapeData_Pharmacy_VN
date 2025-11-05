import express from 'express';
import { pool } from '../db.js';
const router = express.Router();

/**
 * ✅ API: Lấy danh sách nhà thuốc dạng GeoJSON (hiển thị marker)
 */
router.get('/pharmacies.geojson', async (req, res) => {
  try {
    const { province, status, rating_min, bbox, limit = 2000 } = req.query;
    // const { province, status, rating_min, bbox, limit } = req.query;
    // const MAX_LIMIT = 50000; // tối đa 50k
    const where = [];
    const params = [];

    if (province) { params.push(`%${province}%`); where.push(`province ILIKE $${params.length}`); }
    if (status)   { params.push(status); where.push(`status = $${params.length}`); }
    if (rating_min){params.push(+rating_min); where.push(`rating >= $${params.length}`); }
    if (bbox) {
      const [minx, miny, maxx, maxy] = bbox.split(',').map(Number);
      params.push(minx, miny, maxx, maxy);
      where.push(`geom && ST_MakeEnvelope($${params.length-3}, $${params.length-2}, $${params.length-1}, $${params.length}, 4326)`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(+limit);
    // params.push(Math.min(+limit || MAX_LIMIT, MAX_LIMIT));

    const sql = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(row) - 'geom'
          )
        )
      ) AS fc
      FROM (
        SELECT name, address, province, district, phone, status, rating, image, geom
        FROM public.pharmacy_stores_cleaned
        ${whereSql}
        ORDER BY rating DESC NULLS LAST
        LIMIT $${params.length}
      ) AS row;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.fc ?? { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error('❌ Lỗi /pharmacies.geojson:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * ✅ API: Danh sách tỉnh cho dropdown
 */
router.get('/provinces', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT DISTINCT province
    FROM public.pharmacy_stores_cleaned
    WHERE province IS NOT NULL
    ORDER BY province;
  `);
  res.json(rows.map(r => r.province));
});

/**
 * ✅ API: Heatmap (lọc theo tỉnh / status / rating)
 */
router.get('/heat', async (req, res) => {
  const { province, status, rating_min } = req.query;
  const where = [];
  const params = [];

  if (province) {
    const normalized = province.replace(/^Tỉnh\s+|^Thành phố\s+/i, '').trim();
    params.push(`%${normalized}%`);
    where.push(`province ILIKE $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (rating_min) {
    params.push(+rating_min);
    where.push(`rating >= $${params.length}`);
  }

  // ✅ thêm điều kiện geom IS NOT NULL đúng cách
  where.push(`geom IS NOT NULL`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT ST_Y(geom) AS lat, ST_X(geom) AS lon,
           COALESCE(NULLIF(rating,0),1) AS w
    FROM public.pharmacy_stores_cleaned
    ${whereSql}
    LIMIT 20000;
  `;

  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Lỗi truy vấn /heat:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * 📊 API: Thống kê theo tỉnh (ổn định hơn, tương thích mọi kiểu dữ liệu)
 */
router.get("/stats/province", async (_req, res) => {
  try {
    const sql = `
      SELECT 
        province,
        COUNT(*) AS total,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating,
        SUM(CASE WHEN LOWER(status) IN ('open', 'hoạt động', 'active') THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN LOWER(status) IN ('closed', 'ngừng hoạt động', 'inactive') THEN 1 ELSE 0 END) AS closed_count
      FROM public.pharmacy_stores_cleaned
      WHERE province IS NOT NULL
      GROUP BY province
      ORDER BY total DESC
      LIMIT 30;
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi /stats/province:", err);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * 📊 API: Thống kê theo huyện trong 1 tỉnh
 */
router.get("/stats/district", async (req, res) => {
  try {
    const { province } = req.query;
    if (!province) return res.status(400).json({ error: "missing_province" });

    const sql = `
      SELECT 
        district,
        COUNT(*) AS total,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating,
        SUM(CASE WHEN LOWER(status) IN ('open', 'hoạt động', 'active') THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN LOWER(status) IN ('closed', 'ngừng hoạt động', 'inactive') THEN 1 ELSE 0 END) AS closed_count
      FROM public.pharmacy_stores_cleaned
      WHERE province ILIKE $1
      GROUP BY district
      ORDER BY total DESC
      LIMIT 30;
    `;
    const { rows } = await pool.query(sql, [`%${province}%`]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi /stats/district:", err);
    res.status(500).json({ error: "server_error" });
  }
});


export default router;
