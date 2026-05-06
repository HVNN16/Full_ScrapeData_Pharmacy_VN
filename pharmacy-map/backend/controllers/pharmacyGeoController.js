import { pool } from "../db.js";

const buildPharmacyProperties = `
  jsonb_build_object(
    'id', id,
    'name', name,
    'address', address,
    'province', province,
    'district', district,
    'phone', phone,
    'status', status,
    'rating', rating,
    'image', image,
    'product_groups', product_groups
  )
`;

export const getPharmaciesGeoJSON = async (req, res) => {
  try {
    const {
      province,
      district,
      status,
      rating_min,
      bbox,
      limit = 3000,
      mode = "",
    } = req.query;

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

    if (!bbox) {
      return res.json({
        type: "FeatureCollection",
        features: [],
      });
    }

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

    const safeLimit = Math.min(Number(limit) || 3000, 5000);
    params.push(safeLimit);
    const limitIndex = params.length;

    params.push(mode);
    const modeIndex = params.length;

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      WITH base AS (
        SELECT
          id,
          name,
          address,
          province,
          district,
          phone,
          status,
          rating,
          image,
          product_groups,
          geom
        FROM pharmacy_stores_cleaned
        ${whereSql}
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(province, 'unknown')
            ORDER BY rating DESC NULLS LAST, id ASC
          ) AS rn
        FROM base
      ),
      limited AS (
        SELECT *
        FROM ranked
        ORDER BY
          CASE WHEN $${modeIndex} = 'overview' THEN rn ELSE 1 END ASC,
          province ASC NULLS LAST,
          rating DESC NULLS LAST,
          id ASC
        LIMIT $${limitIndex}
      )
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(geom)::jsonb,
              'properties', ${buildPharmacyProperties}
            )
          ),
          '[]'::jsonb
        )
      ) AS fc
      FROM limited;
    `;

    const { rows } = await pool.query(sql, params);

    res.json(
      rows[0]?.fc || {
        type: "FeatureCollection",
        features: [],
      }
    );
  } catch (err) {
    console.error("❌ Lỗi /pharmacies.geojson:", err);
    res.status(500).json({
      error: "server_error",
      message: err.message,
    });
  }
};

export const getPharmaciesList = async (req, res) => {
  try {
    const {
      province,
      district,
      status,
      rating_min,
      search,
      limit = 10000,
    } = req.query;

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

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        name ILIKE $${params.length}
        OR address ILIKE $${params.length}
        OR province ILIKE $${params.length}
        OR district ILIKE $${params.length}
      )`);
    }

    where.push(`geom IS NOT NULL`);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const safeLimit = Math.min(Number(limit) || 10000, 10000);
    params.push(safeLimit);

    const sql = `
      SELECT
        id,
        name,
        address,
        province,
        district,
        phone,
        status,
        rating,
        image,
        product_groups,
        ST_X(geom) AS lon,
        ST_Y(geom) AS lat
      FROM pharmacy_stores_cleaned
      ${whereSql}
      ORDER BY rating DESC NULLS LAST, id ASC
      LIMIT $${params.length};
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi /pharmacies:", err);
    res.status(500).json({
      error: "server_error",
      message: err.message,
    });
  }
};

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
    res.status(500).json({
      error: "server_error",
      message: err.message,
    });
  }
};

export const updatePharmacy = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      address,
      province,
      district,
      phone,
      status,
      rating,
      image,
      product_groups,
    } = req.body;

    if (!id || Number.isNaN(Number(id))) {
      return res.status(400).json({
        message: "ID nhà thuốc không hợp lệ",
      });
    }

    const ratingValue =
      rating === undefined || rating === null || rating === ""
        ? null
        : Number(rating);

    const productGroupsJson =
      product_groups === undefined || product_groups === null
        ? null
        : JSON.stringify(Array.isArray(product_groups) ? product_groups : []);

    const imageValue =
      image === undefined || image === null || image === "" || image === "N/A"
        ? null
        : image;

    const sql = `
      UPDATE pharmacy_stores_cleaned
      SET
        name = COALESCE(NULLIF($1, ''), name),
        address = COALESCE(NULLIF($2, ''), address),
        province = COALESCE(NULLIF($3, ''), province),
        district = COALESCE(NULLIF($4, ''), district),
        phone = COALESCE(NULLIF($5, ''), phone),
        status = COALESCE(NULLIF($6, ''), status),
        rating = COALESCE($7, rating),
        image = COALESCE($8, image),
        product_groups = COALESCE($9::jsonb, product_groups),
        is_surveyed = TRUE,
        surveyed_at = COALESCE(surveyed_at, NOW()),
        updated_at = NOW()
      WHERE id = $10
      RETURNING
        id,
        name,
        address,
        province,
        district,
        phone,
        status,
        rating,
        image,
        product_groups,
        is_surveyed,
        surveyed_at,
        updated_at,
        ST_X(geom) AS lon,
        ST_Y(geom) AS lat;
    `;

    const { rows } = await pool.query(sql, [
      name ?? null,
      address ?? null,
      province ?? null,
      district ?? null,
      phone ?? null,
      status ?? null,
      Number.isFinite(ratingValue) ? ratingValue : null,
      imageValue,
      productGroupsJson,
      Number(id),
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy nhà thuốc",
      });
    }

    res.json({
      message: "Cập nhật thành công",
      pharmacy: rows[0],
    });
  } catch (err) {
    console.error("❌ Lỗi update pharmacy:", err);
    res.status(500).json({
      message: "Lỗi server khi cập nhật nhà thuốc",
      error: err.message,
    });
  }
};