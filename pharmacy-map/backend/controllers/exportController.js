// controllers/exportController.js
import { pool } from "../db.js";
import { Parser } from "json2csv";

export async function exportPharmaciesCSV(req, res) {
  try {
    const { province, district, rating_min } = req.query;
    const where = [];
    const params = [];

    // Lọc theo tỉnh
    if (province) {
      params.push(`%${province}%`);
      where.push(`province ILIKE $${params.length}`);
    }

    // Lọc theo huyện
    if (district) {
      params.push(`%${district}%`);
      where.push(`district ILIKE $${params.length}`);
    }

    // Lọc rating tối thiểu
    if (rating_min) {
      params.push(+rating_min);
      where.push(`rating >= $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT 
        name, address, province, district, phone, status, rating,
        ST_X(geom) AS lon, ST_Y(geom) AS lat
      FROM public.pharmacy_stores_cleaned
      ${whereSql}
      ORDER BY province, district, name;
    `;

    const { rows } = await pool.query(sql, params);

    // Tạo CSV
    const json2csv = new Parser({
      fields: [
        "name",
        "address",
        "province",
        "district",
        "phone",
        "status",
        "rating",
        "lon",
        "lat",
      ],
    });

    const csv = json2csv.parse(rows);

    // 👉 THÊM BOM UTF-8 THỦ CÔNG (Excel mới đọc đúng)
    const BOM = "\ufeff";

    let filename = "pharmacy_export.csv";
    if (province) filename = `pharmacy_${province}.csv`;
    if (district) filename = `pharmacy_${province}_${district}.csv`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    // 👍 Gửi file với BOM
    return res.send(BOM + csv);

  } catch (err) {
    console.error("❌ Lỗi xuất CSV:", err);
    res.status(500).json({ error: "server_error" });
  }
}
