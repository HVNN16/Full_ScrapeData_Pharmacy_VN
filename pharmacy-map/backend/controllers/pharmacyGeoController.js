export const getPharmaciesGeoJSON = async (req, res) => {
  try {
    const { province, district, status, rating_min, bbox } = req.query;

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

    // Map chỉ load theo vùng đang nhìn để tránh lag
    if (bbox) {
      const [minx, miny, maxx, maxy] = bbox.split(",").map(Number);

      const isValidBbox =
        [minx, miny, maxx, maxy].every((n) => Number.isFinite(n)) &&
        minx < maxx &&
        miny < maxy;

      if (isValidBbox) {
        params.push(minx, miny, maxx, maxy);
        where.push(
          `geom && ST_MakeEnvelope($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length}, 4326)`
        );
      }
    } else {
      // Không có bbox thì không trả full cả nước cho map
      return res.json({ type: "FeatureCollection", features: [] });
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

// ===============================
// 🟩 2. API lấy DANH SÁCH cho sidebar/list
// ===============================
export const getPharmaciesList = async (req, res) => {
  try {
    const { province, district, status, rating_min, limit = 10000 } = req.query;

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

// ===============================
// 🟧 3. API Heatmap
// ===============================
export const getHeatmap = async (req, res) => {
  try {
    const { province, district, status, rating_min, bbox } = req.query;

    const where = [];
    const params = [];

    if (province) {
      const normalized = province.replace(/^Tỉnh |^Thành phố /i, "").trim();
      params.push(`%${normalized}%`);
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

    if (bbox) {
      const [minx, miny, maxx, maxy] = bbox.split(",").map(Number);

      const isValidBbox =
        [minx, miny, maxx, maxy].every((n) => Number.isFinite(n)) &&
        minx < maxx &&
        miny < maxy;

      if (isValidBbox) {
        params.push(minx, miny, maxx, maxy);
        where.push(
          `geom && ST_MakeEnvelope($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length}, 4326)`
        );
      }
    }

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

