import { pool } from "../db.js";

function buildCommonFilters(query) {
  const { province, district, status, rating_min } = query;

  const where = [];
  const params = [];

  if (province) {
    params.push(`%${province}%`);
    where.push(`province ILIKE $${params.length}`);
  }

  if (district) {
    params.push(`%${district}%`);
    where.push(`district ILIKE $${params.length}`);
  }

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  if (rating_min) {
    params.push(Number(rating_min));
    where.push(`rating >= $${params.length}`);
  }

  where.push(`geom IS NOT NULL`);

  return { where, params };
}

function parsePolygon(polygon) {
  if (!polygon) return null;

  try {
    const data = JSON.parse(polygon);

    // Nhận GeoJSON từ frontend
    if (
      data?.type === "Polygon" &&
      Array.isArray(data.coordinates) &&
      Array.isArray(data.coordinates[0]) &&
      data.coordinates[0].length >= 4
    ) {
      return data;
    }

    // Nhận dạng mảng [[lng, lat], [lng, lat], ...]
    if (Array.isArray(data) && data.length >= 3) {
      const validCoords = data
        .map((p) => {
          if (!Array.isArray(p) || p.length < 2) return null;

          const lng = Number(p[0]);
          const lat = Number(p[1]);

          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

          return [lng, lat];
        })
        .filter(Boolean);

      if (validCoords.length < 3) return null;

      const first = validCoords[0];
      const last = validCoords[validCoords.length - 1];

      const closedCoords =
        first[0] === last[0] && first[1] === last[1]
          ? validCoords
          : [...validCoords, first];

      return {
        type: "Polygon",
        coordinates: [closedCoords],
      };
    }

    return null;
  } catch (err) {
    console.error("❌ Lỗi parse polygon:", err);
    return null;
  }
}

function addBboxFilter({ bbox, where, params }) {
  if (!bbox) return false;

  const [minx, miny, maxx, maxy] = bbox.split(",").map(Number);

  const isValidBbox =
    [minx, miny, maxx, maxy].every((n) => Number.isFinite(n)) &&
    minx < maxx &&
    miny < maxy;

  if (!isValidBbox) return false;

  params.push(minx, miny, maxx, maxy);
  where.push(
    `geom && ST_MakeEnvelope($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length}, 4326)`
  );

  return true;
}

export const getPharmaciesGeoJSON = async (req, res) => {
  try {
    const { bbox, polygon } = req.query;

    const { where, params } = buildCommonFilters(req.query);
    const polygonGeoJson = parsePolygon(polygon);

    if (polygonGeoJson) {
      params.push(JSON.stringify(polygonGeoJson));

      where.push(`
        ST_Covers(
          ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326),
          geom
        )
      `);
    } else if (bbox) {
      addBboxFilter({ bbox, where, params });
    } else {
      return res.json({
        type: "FeatureCollection",
        features: [],
      });
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(geom)::jsonb,
              'properties', to_jsonb(row) - 'geom'
            )
          ),
          '[]'::jsonb
        )
      ) AS fc
      FROM (
        SELECT
          name,
          address,
          province,
          district,
          phone,
          status,
          rating,
          image,
          geom
        FROM pharmacy_stores_cleaned
        ${whereSql}
        ORDER BY rating DESC NULLS LAST
        LIMIT 25000
      ) AS row;
    `;

    const { rows } = await pool.query(sql, params);

    res.json(rows[0]?.fc || { type: "FeatureCollection", features: [] });
  } catch (err) {
    console.error("❌ Lỗi /pharmacies.geojson:", err);
    res.status(500).json({ error: "server_error" });
  }
};

export const getPharmaciesList = async (req, res) => {
  try {
    const { limit = 10000 } = req.query;

    const { where, params } = buildCommonFilters(req.query);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    params.push(Number(limit));

    const sql = `
      SELECT
        name,
        address,
        province,
        district,
        phone,
        status,
        rating,
        image,
        ST_X(geom) AS lon,
        ST_Y(geom) AS lat
      FROM pharmacy_stores_cleaned
      ${whereSql}
      ORDER BY rating DESC NULLS LAST
      LIMIT $${params.length};
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi /pharmacies:", err);
    res.status(500).json({ error: "server_error" });
  }
};

export const getHeatmap = async (req, res) => {
  try {
    const { bbox } = req.query;

    const { where, params } = buildCommonFilters(req.query);

    addBboxFilter({ bbox, where, params });

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        ST_Y(geom) AS lat,
        ST_X(geom) AS lon,
        COALESCE(NULLIF(rating, 0), 1) AS w
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