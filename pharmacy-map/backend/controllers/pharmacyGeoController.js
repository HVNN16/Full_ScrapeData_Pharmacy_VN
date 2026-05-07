import { pool } from "../db.js";

const TABLE_NAME = "pharmacy_stores_cleaned";

const parseLimit = (value) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseBBox = (bbox) => {
  if (!bbox) return null;

  const parts = bbox.split(",").map(Number);

  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }

  const [minLng, minLat, maxLng, maxLat] = parts;

  return { minLng, minLat, maxLng, maxLat };
};

export const getPharmaciesGeoJSON = async (req, res) => {
  try {
    const {
      bbox,
      mode,
      search,
      province,
      district,
      rating_min,
    } = req.query;

    const limit = parseLimit(req.query.limit);
    const parsedBBox = parseBBox(bbox);

    const values = [];
    let index = 1;

    let whereSql = `
      WHERE lat IS NOT NULL
        AND lng IS NOT NULL
        AND lat != 0
        AND lng != 0
    `;

    if (parsedBBox) {
      whereSql += `
        AND lng BETWEEN $${index++} AND $${index++}
        AND lat BETWEEN $${index++} AND $${index++}
      `;

      values.push(
        parsedBBox.minLng,
        parsedBBox.maxLng,
        parsedBBox.minLat,
        parsedBBox.maxLat
      );
    }

    if (search) {
      whereSql += `
        AND (
          LOWER(name) LIKE LOWER($${index})
          OR LOWER(address) LIKE LOWER($${index})
          OR LOWER(province) LIKE LOWER($${index})
          OR LOWER(district) LIKE LOWER($${index})
        )
      `;
      values.push(`%${search}%`);
      index++;
    }

    if (province) {
      whereSql += ` AND province = $${index++}`;
      values.push(province);
    }

    if (district) {
      whereSql += ` AND district = $${index++}`;
      values.push(district);
    }

    if (rating_min) {
      whereSql += ` AND rating >= $${index++}`;
      values.push(Number(rating_min));
    }

    let sql;

    if (mode === "overview" && limit) {
      sql = `
        SELECT 
          id,
          name,
          address,
          province,
          district,
          phone,
          status,
          rating,
          image_url,
          product_groups,
          is_surveyed,
          surveyed_at,
          lat,
          lng
        FROM (
          SELECT
            id,
            name,
            address,
            province,
            district,
            phone,
            status,
            rating,
            image_url,
            product_groups,
            is_surveyed,
            surveyed_at,
            lat,
            lng,
            ROW_NUMBER() OVER (
              PARTITION BY FLOOR(lat * 5), FLOOR(lng * 5)
              ORDER BY id ASC
            ) AS rn
          FROM ${TABLE_NAME}
          ${whereSql}
        ) AS spread_data
        ORDER BY rn ASC, lat ASC, lng ASC
        LIMIT $${index++}
      `;

      values.push(limit);
    } else {
      sql = `
        SELECT 
          id,
          name,
          address,
          province,
          district,
          phone,
          status,
          rating,
          image_url,
          product_groups,
          is_surveyed,
          surveyed_at,
          lat,
          lng
        FROM ${TABLE_NAME}
        ${whereSql}
        ORDER BY id ASC
      `;

      if (limit) {
        sql += ` LIMIT $${index++}`;
        values.push(limit);
      }
    }

    const { rows } = await pool.query(sql, values);

    const features = rows
      .filter((row) => row.id && row.lat && row.lng)
      .map((row) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(row.lng), Number(row.lat)],
        },
        properties: {
          id: row.id,
          name: row.name || "",
          address: row.address || "",
          province: row.province || "",
          district: row.district || "",
          phone: row.phone || "",
          status: row.status || "",
          rating: row.rating === null ? null : Number(row.rating),
          image_url: row.image_url || "",
          product_groups: row.product_groups || [],
          is_surveyed: row.is_surveyed || false,
          surveyed_at: row.surveyed_at || null,
        },
      }));

    res.json({
      type: "FeatureCollection",
      features,
    });
  } catch (err) {
    console.error("❌ Lỗi getPharmaciesGeoJSON:", err);
    res.status(500).json({
      message: "Lỗi server khi lấy GeoJSON nhà thuốc",
      error: err.message,
    });
  }
};

export const getPharmaciesList = async (req, res) => {
  try {
    const {
      search,
      province,
      district,
      rating_min,
    } = req.query;

    const limit = parseLimit(req.query.limit);

    const values = [];
    let index = 1;

    let sql = `
      SELECT 
        id,
        name,
        address,
        province,
        district,
        phone,
        status,
        rating,
        image_url,
        product_groups,
        is_surveyed,
        surveyed_at,
        lat,
        lng
      FROM ${TABLE_NAME}
      WHERE lat IS NOT NULL
        AND lng IS NOT NULL
        AND lat != 0
        AND lng != 0
    `;

    if (search) {
      sql += `
        AND (
          LOWER(name) LIKE LOWER($${index})
          OR LOWER(address) LIKE LOWER($${index})
          OR LOWER(province) LIKE LOWER($${index})
          OR LOWER(district) LIKE LOWER($${index})
        )
      `;
      values.push(`%${search}%`);
      index++;
    }

    if (province) {
      sql += ` AND province = $${index++}`;
      values.push(province);
    }

    if (district) {
      sql += ` AND district = $${index++}`;
      values.push(district);
    }

    if (rating_min) {
      sql += ` AND rating >= $${index++}`;
      values.push(Number(rating_min));
    }

    sql += ` ORDER BY id ASC`;

    if (limit) {
      sql += ` LIMIT $${index++}`;
      values.push(limit);
    }

    const { rows } = await pool.query(sql, values);

    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi getPharmaciesList:", err);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách nhà thuốc",
      error: err.message,
    });
  }
};

export const getHeatmap = async (req, res) => {
  try {
    const { bbox } = req.query;
    const parsedBBox = parseBBox(bbox);

    const values = [];
    let index = 1;

    let sql = `
      SELECT lat, lng
      FROM ${TABLE_NAME}
      WHERE lat IS NOT NULL
        AND lng IS NOT NULL
        AND lat != 0
        AND lng != 0
    `;

    if (parsedBBox) {
      sql += `
        AND lng BETWEEN $${index++} AND $${index++}
        AND lat BETWEEN $${index++} AND $${index++}
      `;

      values.push(
        parsedBBox.minLng,
        parsedBBox.maxLng,
        parsedBBox.minLat,
        parsedBBox.maxLat
      );
    }

    const { rows } = await pool.query(sql, values);

    res.json(
      rows.map((row) => ({
        lat: Number(row.lat),
        lng: Number(row.lng),
        intensity: 1,
      }))
    );
  } catch (err) {
    console.error("❌ Lỗi getHeatmap:", err);
    res.status(500).json({
      message: "Lỗi server khi lấy heatmap",
      error: err.message,
    });
  }
};

export const updatePharmacy = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      address,
      phone,
      status,
      rating,
      image_url,
      product_groups,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Thiếu id nhà thuốc",
      });
    }

    const sql = `
      UPDATE ${TABLE_NAME}
      SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        phone = COALESCE($3, phone),
        status = COALESCE($4, status),
        rating = COALESCE($5, rating),
        image_url = COALESCE($6, image_url),
        product_groups = COALESCE($7::jsonb, product_groups),
        is_surveyed = TRUE,
        surveyed_at = NOW()
      WHERE id = $8
      RETURNING 
        id,
        name,
        address,
        province,
        district,
        phone,
        status,
        rating,
        image_url,
        product_groups,
        is_surveyed,
        surveyed_at,
        lat,
        lng;
    `;

    const values = [
      name === undefined || name === "" ? null : name,
      address === undefined || address === "" ? null : address,
      phone === undefined || phone === "" ? null : phone,
      status === undefined || status === "" ? null : status,
      rating === undefined || rating === null || rating === ""
        ? null
        : Number(rating),
      image_url === undefined || image_url === "" ? null : image_url,
      Array.isArray(product_groups)
        ? JSON.stringify(product_groups)
        : null,
      id,
    ];

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy nhà thuốc",
      });
    }

    res.json({
      message: "Cập nhật nhà thuốc thành công",
      pharmacy: rows[0],
    });
  } catch (err) {
    console.error("❌ Lỗi updatePharmacy:", err);
    res.status(500).json({
      message: "Lỗi server khi cập nhật nhà thuốc",
      error: err.message,
    });
  }
};