import { pool } from "../db.js";

const TABLE_NAME = "pharmacy_stores_cleaned";

const LAT_COL = "latitude";
const LNG_COL = "longitude";

const DEFAULT_LIMIT = 10000;
const MAX_LIMIT = 20000;

const parseLimit = (value) => {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return Math.min(n, MAX_LIMIT);
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

const parsePolygon = (polygon) => {
  if (!polygon) return null;

  try {
    const parsed = JSON.parse(polygon);
    const coords = parsed?.coordinates?.[0];

    if (!Array.isArray(coords) || coords.length < 4) return null;

    const cleanCoords = coords
      .map((p) => [Number(p[0]), Number(p[1])])
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

    if (cleanCoords.length < 4) return null;

    return cleanCoords;
  } catch (err) {
    console.error("❌ Polygon parse error:", err.message);
    return null;
  }
};

const getPolygonBBox = (polygonCoords) => {
  if (!Array.isArray(polygonCoords) || polygonCoords.length < 3) return null;

  const lngs = polygonCoords.map((p) => p[0]);
  const lats = polygonCoords.map((p) => p[1]);

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
};

const isPointInPolygon = (point, polygon) => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.000000001) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
};

const normalizeProductGroups = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch (_) {}

    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

const rowsToGeoJSON = (rows) => {
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
        owner_name: row.owner_name || "",
        is_surveyed: row.is_surveyed || false,
        surveyed_at: row.surveyed_at || null,
        surveyed_by: row.surveyed_by || null,
      },
    }));

  return {
    type: "FeatureCollection",
    features,
  };
};

export const getPharmacyCount = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM ${TABLE_NAME}
      WHERE ${LAT_COL} IS NOT NULL
        AND ${LNG_COL} IS NOT NULL
        AND ${LAT_COL} != 0
        AND ${LNG_COL} != 0
    `);

    res.json({
      total: rows[0].total,
    });
  } catch (err) {
    console.error("❌ Lỗi getPharmacyCount:", err);

    res.status(500).json({
      message: "Lỗi lấy tổng số nhà thuốc",
      error: err.message,
    });
  }
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
      polygon,
    } = req.query;

    const requestLimit = parseLimit(req.query.limit);
    const parsedBBox = parseBBox(bbox);
    const polygonCoords = parsePolygon(polygon);
    const polygonBBox = getPolygonBBox(polygonCoords);

    const isPolygonMode =
      Array.isArray(polygonCoords) && polygonCoords.length >= 4;

    const isOverviewMode =
      mode === "overview" &&
      !search &&
      !province &&
      !district &&
      !isPolygonMode;

    const tableSource = isOverviewMode
      ? `${TABLE_NAME} TABLESAMPLE BERNOULLI (90) REPEATABLE (10)`
      : TABLE_NAME;

    const values = [];
    let index = 1;

    let whereSql = `
      WHERE ${LAT_COL} IS NOT NULL
        AND ${LNG_COL} IS NOT NULL
        AND ${LAT_COL} != 0
        AND ${LNG_COL} != 0
    `;

    const activeBBox = isPolygonMode ? polygonBBox : parsedBBox;

    if (activeBBox) {
      whereSql += `
        AND ${LNG_COL} BETWEEN $${index++} AND $${index++}
        AND ${LAT_COL} BETWEEN $${index++} AND $${index++}
      `;

      values.push(
        activeBBox.minLng,
        activeBBox.maxLng,
        activeBBox.minLat,
        activeBBox.maxLat
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
        COALESCE(image_url, image) AS image_url,
        product_groups,
        owner_name,
        is_surveyed,
        surveyed_at,
        surveyed_by,
        ${LAT_COL} AS lat,
        ${LNG_COL} AS lng
      FROM ${tableSource}
      ${whereSql}
    `;

    if (!isOverviewMode) {
      sql += ` ORDER BY id ASC`;
    }

    if (!isPolygonMode) {
      const finalLimit = requestLimit || DEFAULT_LIMIT;
      sql += ` LIMIT $${index++}`;
      values.push(finalLimit);
    }

    const { rows } = await pool.query(sql, values);

    const finalRows = isPolygonMode
      ? rows
          .filter((row) =>
            isPointInPolygon(
              [Number(row.lng), Number(row.lat)],
              polygonCoords
            )
          )
          .slice(0, requestLimit || MAX_LIMIT)
      : rows;

    res.json(rowsToGeoJSON(finalRows));
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
    const { search, province, district, rating_min } = req.query;

    const limit = parseLimit(req.query.limit) || DEFAULT_LIMIT;

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
        COALESCE(image_url, image) AS image_url,
        product_groups,
        owner_name,
        is_surveyed,
        surveyed_at,
        surveyed_by,
        ${LAT_COL} AS lat,
        ${LNG_COL} AS lng
      FROM ${TABLE_NAME}
      WHERE ${LAT_COL} IS NOT NULL
        AND ${LNG_COL} IS NOT NULL
        AND ${LAT_COL} != 0
        AND ${LNG_COL} != 0
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

    sql += ` ORDER BY id ASC LIMIT $${index++}`;
    values.push(limit);

    const { rows } = await pool.query(sql, values);

    res.json(rows.map((row) => ({
      ...row,
      rating: row.rating === null ? null : Number(row.rating),
      product_groups: row.product_groups || [],
      owner_name: row.owner_name || "",
    })));
  } catch (err) {
    console.error("❌ Lỗi getPharmaciesList:", err);

    res.status(500).json({
      message: "Lỗi lấy danh sách nhà thuốc",
      error: err.message,
    });
  }
};

export const getHeatmap = async (req, res) => {
  try {
    const { province, rating_min, bbox } = req.query;

    const parsedBBox = parseBBox(bbox);

    const values = [];
    let index = 1;

    let sql = `
      SELECT 
        ${LAT_COL} AS lat,
        ${LNG_COL} AS lng,
        rating
      FROM ${TABLE_NAME}
      WHERE ${LAT_COL} IS NOT NULL
        AND ${LNG_COL} IS NOT NULL
        AND ${LAT_COL} != 0
        AND ${LNG_COL} != 0
    `;

    if (parsedBBox) {
      sql += `
        AND ${LNG_COL} BETWEEN $${index++} AND $${index++}
        AND ${LAT_COL} BETWEEN $${index++} AND $${index++}
      `;

      values.push(
        parsedBBox.minLng,
        parsedBBox.maxLng,
        parsedBBox.minLat,
        parsedBBox.maxLat
      );
    }

    if (province) {
      sql += ` AND province = $${index++}`;
      values.push(province);
    }

    if (rating_min) {
      sql += ` AND rating >= $${index++}`;
      values.push(Number(rating_min));
    }

    sql += ` LIMIT 15000`;

    const { rows } = await pool.query(sql, values);

    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi getHeatmap:", err);

    res.status(500).json({
      message: "Lỗi lấy heatmap",
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
      province,
      district,
      phone,
      status,
      rating,
      image_url,
      product_groups,
      owner_name,
    } = req.body;

    if (!id || Number.isNaN(Number(id))) {
      return res.status(400).json({
        message: "ID nhà thuốc không hợp lệ",
      });
    }

    const normalizedProducts = normalizeProductGroups(product_groups);

    const sql = `
      UPDATE ${TABLE_NAME}
      SET
        name = $1,
        address = $2,
        province = $3,
        district = $4,
        phone = $5,
        status = $6,
        rating = $7,
        image_url = $8,
        image = $8,
        product_groups = $9,
        owner_name = $10,
        is_surveyed = true,
        surveyed_at = NOW(),
        surveyed_by = $11
      WHERE id = $12
      RETURNING
        id,
        name,
        address,
        province,
        district,
        phone,
        status,
        rating,
        COALESCE(image_url, image) AS image_url,
        product_groups,
        owner_name,
        is_surveyed,
        surveyed_at,
        surveyed_by,
        ${LAT_COL} AS lat,
        ${LNG_COL} AS lng;
    `;

    const values = [
      name || "",
      address || "",
      province || "",
      district || "",
      phone || "",
      status || "",
      rating === null || rating === undefined || rating === ""
        ? null
        : Number(rating),
      image_url || "",
      JSON.stringify(normalizedProducts),
      owner_name || "",
      req.user?.id || null,
      Number(id),
    ];

    const { rows } = await pool.query(sql, values);

    if (!rows.length) {
      return res.status(404).json({
        message: "Không tìm thấy nhà thuốc",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật nhà thuốc thành công",
      pharmacy: rows[0],
    });
  } catch (err) {
    console.error("❌ Lỗi updatePharmacy:", err);

    res.status(500).json({
      message: "Lỗi cập nhật nhà thuốc",
      error: err.message,
    });
  }
};