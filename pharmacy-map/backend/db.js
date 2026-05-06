// import pg from "pg";
// import dotenv from "dotenv";
// dotenv.config();

// export const pool = new pg.Pool({
//   host: process.env.DB_HOST || "localhost",
//   port: process.env.DB_PORT || 5432,
//   user: process.env.DB_USER || "postgres",
//   password: process.env.DB_PASSWORD || "12345",
//   database: process.env.DB_NAME || "gisdb",
// });
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

let pool;

if (process.env.DATABASE_URL) {
  // Production (Neon) - sử dụng DATABASE_URL từ biến môi trường production
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  // Local development - sử dụng cấu hình .env nếu chạy local
  pool = new pg.Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "12345",
    database: process.env.DB_NAME || "gisdb",
  });
}

console.log(
  "✅ DB đang dùng:",
  process.env.DATABASE_URL ? "NEON" : "LOCAL"
);
export { pool };