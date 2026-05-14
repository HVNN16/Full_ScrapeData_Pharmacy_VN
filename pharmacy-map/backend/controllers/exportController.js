// controllers/exportController.js
import { pool } from "../db.js";
import { Parser } from "json2csv";

export async function exportPharmaciesCSV(req, res) {
  try {
    const { province, district, rating_min, surveyed } = req.query;

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

    if (rating_min) {
      params.push(Number(rating_min));
      where.push(`rating >= $${params.length}`);
    }

    if (surveyed === "true") {
      where.push(`is_surveyed = true`);
    }

    if (surveyed === "false") {
      where.push(`is_surveyed = false`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

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
        longitude AS lon,
        latitude AS lat,
        image_url,
        is_surveyed,
        surveyed_at
      FROM public.pharmacy_stores_cleaned
      ${whereSql}
      ORDER BY province, district, name
    `;

    const { rows } = await pool.query(sql, params);

    const json2csv = new Parser({
      fields: [
        "id",
        "name",
        "address",
        "province",
        "district",
        "phone",
        "status",
        "rating",
        "lon",
        "lat",
        "image_url",
        "is_surveyed",
        "surveyed_at",
      ],
    });

    const csv = json2csv.parse(rows);
    const BOM = "\ufeff";

    let filename = "pharmacy_export.csv";

    if (province) {
      filename = `pharmacy_${province}.csv`;
    }

    if (province && district) {
      filename = `pharmacy_${province}_${district}.csv`;
    }

    filename = encodeURIComponent(filename);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    return res.status(200).send(BOM + csv);
  } catch (err) {
    console.error("❌ Lỗi xuất CSV:", err);

    return res.status(500).json({
      success: false,
      message: "Lỗi xuất CSV",
      error: err.message,
    });
  }
}