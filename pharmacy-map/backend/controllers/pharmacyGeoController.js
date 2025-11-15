// controllers/pharmacyGeoController.js
import { pool } from "../db.js";

// ===============================
// 🟦 1. API lấy GeoJSON nhà thuốc
// ===============================
export const getPharmaciesGeoJSON = async (req, res) => {
  try {
    const { province, status, rating_min, bbox, limit = 2000 } = req.query;

    const where = [];
    const params = [];

    if (province) {
      params.push(`%${province}%`);
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

    if (bbox) {
      const [minx, miny, maxx, maxy] = bbox.split(",").map(Number);
      params.push(minx, miny, maxx, maxy);
      where.push(
        `geom && ST_MakeEnvelope($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length}, 4326)`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    params.push(+limit);

    const sql = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
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
        FROM pharmacy_stores_cleaned
        ${whereSql}
        ORDER BY rating DESC NULLS LAST
        LIMIT $${params.length}
      ) AS row;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.fc || { type: "FeatureCollection", features: [] });
  } catch (err) {
    console.error("❌ Lỗi /pharmacies.geojson:", err);
    res.status(500).json({ error: "server_error" });
  }
};

// ===============================
// 🟧 2. API Heatmap
// ===============================
export const getHeatmap = async (req, res) => {
  try {
    const { province, status, rating_min } = req.query;

    const where = [];
    const params = [];

    if (province) {
      const normalized = province.replace(/^Tỉnh |^Thành phố /i, "").trim();
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

    where.push(`geom IS NOT NULL`);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT ST_Y(geom) AS lat, ST_X(geom) AS lon,
             COALESCE(NULLIF(rating,0), 1) AS w
      FROM pharmacy_stores_cleaned
      ${whereSql}
      LIMIT 20000;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi /heat:", err);
    res.status(500).json({ error: "server_error" });
  }
};
