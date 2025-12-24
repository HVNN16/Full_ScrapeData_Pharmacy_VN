// import express from "express";
// import { pool } from "../db.js";
// import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

// const router = express.Router();

// /* ============================================================
//    GET LIST + FILTER + SEARCH + PAGINATION
// ============================================================ */
// router.get("/", verifyToken, verifyAdmin, async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 30;
//     const offset = (page - 1) * limit;

//     const search = req.query.search || "";
//     const province = req.query.province || "";
//     const district = req.query.district || "";

//     let where = "WHERE 1=1";
//     let params = [];

//     // SEARCH
//     if (search) {
//       params.push(`%${search}%`);
//       where += ` AND name ILIKE $${params.length}`;
//     }

//     // FILTER PROVINCE
//     if (province) {
//       params.push(province);
//       where += ` AND province = $${params.length}`;
//     }

//     // FILTER DISTRICT
//     if (district) {
//       params.push(district);
//       where += ` AND district = $${params.length}`;
//     }

//     // DATA QUERY
//     const sql = `
//       SELECT * 
//       FROM pharmacy_stores_cleaned
//       ${where}
//       ORDER BY id
//       LIMIT ${limit} OFFSET ${offset};
//     `;

//     // COUNT QUERY
//     const countSql = `
//       SELECT COUNT(*) 
//       FROM pharmacy_stores_cleaned
//       ${where};
//     `;

//     const data = await pool.query(sql, params);
//     const total = await pool.query(countSql, params);

//     res.json({
//       rows: data.rows,
//       total: Number(total.rows[0].count),
//       page,
//       totalPages: Math.ceil(total.rows[0].count / limit),
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "GET error" });
//   }
// });

// /* ============================================================
//    ADD
// ============================================================ */
// router.post("/", verifyToken, verifyAdmin, async (req, res) => {
//   try {
//     let {
//       name,
//       address,
//       province,
//       district,
//       phone,
//       status,
//       rating,
//       latitude,
//       longitude,
//     } = req.body;

//     latitude = parseFloat(latitude);
//     longitude = parseFloat(longitude);

//     if (isNaN(latitude) || isNaN(longitude)) {
//       return res.status(400).json({ error: "Latitude/Longitude không hợp lệ" });
//     }

//     const sql = `
//       INSERT INTO pharmacy_stores_cleaned 
//         (name, address, province, district, phone, status, rating, geom, longitude, latitude)
//       VALUES
//         ($1,$2,$3,$4,$5,$6,$7, ST_SetSRID(ST_Point($8,$9),4326), $8, $9)
//       RETURNING *;
//     `;

//     const result = await pool.query(sql, [
//       name,
//       address,
//       province,
//       district,
//       phone,
//       status,
//       rating,
//       longitude, 
//       latitude,
//     ]);

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "POST error" });
//   }
// });

// /* ============================================================
//    UPDATE
// ============================================================ */
// router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
//   try {
//     const id = parseInt(req.params.id);

//     if (!id) return res.status(400).json({ error: "ID không hợp lệ" });

//     let {
//       name,
//       address,
//       province,
//       district,
//       phone,
//       status,
//       rating,
//       latitude,
//       longitude,
//     } = req.body;

//     latitude = parseFloat(latitude);
//     longitude = parseFloat(longitude);

//     if (isNaN(latitude) || isNaN(longitude)) {
//       return res.status(400).json({ error: "Latitude/Longitude không hợp lệ" });
//     }

//     const sql = `
//       UPDATE pharmacy_stores_cleaned SET
//         name=$1,
//         address=$2,
//         province=$3,
//         district=$4,
//         phone=$5,
//         status=$6,
//         rating=$7,
//         geom = ST_SetSRID(ST_Point($8, $9), 4326),
//         longitude=$8,
//         latitude=$9
//       WHERE id=$10
//       RETURNING *;
//     `;

//     const result = await pool.query(sql, [
//       name,
//       address,
//       province,
//       district,
//       phone,
//       status,
//       rating,
//       longitude,
//       latitude,
//       id,
//     ]);

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "PUT error" });
//   }
// });

// /* ============================================================
//    DELETE
// ============================================================ */
// router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
//   try {
//     const id = parseInt(req.params.id);
//     if (!id) return res.status(400).json({ error: "ID không hợp lệ" });

//     await pool.query("DELETE FROM pharmacy_stores_cleaned WHERE id=$1", [id]);

//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "DELETE error" });
//   }
// });

// export default router;

import express from "express";
import { pool } from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   GET LIST + FILTER + SEARCH + PAGINATION + VALID IMAGE FILTER
   - hasImage=true => chỉ lấy ảnh hợp lệ:
     + URL http/https
     + hoặc chuỗi có đuôi .jpg/.jpeg/.png/.webp/.gif
============================================================ */
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const limit = Math.max(1, perPage);
    const offset = (page - 1) * limit;

    const search = req.query.search || "";
    const province = req.query.province || "";
    const district = req.query.district || "";
    const hasImage = String(req.query.hasImage || "false") === "true";

    let where = "WHERE 1=1";
    const params = [];

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

    // ✅ LỌC ẢNH HỢP LỆ (khớp đúng thống kê 6032 của bạn)
    if (hasImage) {
      where += `
        AND NULLIF(BTRIM(COALESCE(image,'')), '') IS NOT NULL
        AND (
          image ~* '^(https?://)'
          OR image ~* '\\.(jpg|jpeg|png|webp|gif)$'
        )
      `;
    }

    // COUNT (total đúng theo filter)
    const countSql = `
      SELECT COUNT(*)
      FROM pharmacy_stores_cleaned
      ${where};
    `;
    const totalRes = await pool.query(countSql, params);
    const total = Number(totalRes.rows?.[0]?.count || 0);

    // DATA
    const dataSql = `
      SELECT id, name, address, province, district, phone, status, rating, image, latitude, longitude
      FROM pharmacy_stores_cleaned
      ${where}
      ORDER BY id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(dataSql, dataParams);

    res.json({
      rows: dataRes.rows || [],
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("GET /admin/pharmacies error:", err);
    res.status(500).json({ error: "GET error" });
  }
});

/* ============================================================
   ADD
============================================================ */
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    let {
      name,
      address,
      province,
      district,
      phone,
      status,
      rating,
      latitude,
      longitude,
      image,
    } = req.body;

    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "Latitude/Longitude không hợp lệ" });
    }

    const sql = `
      INSERT INTO pharmacy_stores_cleaned 
        (name, address, province, district, phone, status, rating, image, geom, longitude, latitude)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8, ST_SetSRID(ST_Point($9,$10),4326), $9, $10)
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
      image || null,
      longitude,
      latitude,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /admin/pharmacies error:", err);
    res.status(500).json({ error: "POST error" });
  }
});

/* ============================================================
   UPDATE
============================================================ */
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID không hợp lệ" });

    let {
      name,
      address,
      province,
      district,
      phone,
      status,
      rating,
      latitude,
      longitude,
      image,
    } = req.body;

    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "Latitude/Longitude không hợp lệ" });
    }

    const sql = `
      UPDATE pharmacy_stores_cleaned SET
        name=$1,
        address=$2,
        province=$3,
        district=$4,
        phone=$5,
        status=$6,
        rating=$7,
        image=$8,
        geom = ST_SetSRID(ST_Point($9, $10), 4326),
        longitude=$9,
        latitude=$10
      WHERE id=$11
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
      image || null,
      longitude,
      latitude,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /admin/pharmacies error:", err);
    res.status(500).json({ error: "PUT error" });
  }
});

/* ============================================================
   DELETE
============================================================ */
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID không hợp lệ" });

    await pool.query("DELETE FROM pharmacy_stores_cleaned WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /admin/pharmacies error:", err);
    res.status(500).json({ error: "DELETE error" });
  }
});

export default router;
