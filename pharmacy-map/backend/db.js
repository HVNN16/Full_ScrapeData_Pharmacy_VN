import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

let pool;

if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  pool = new pg.Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "12345",
    database: process.env.DB_NAME || "gisdb",
  });
}

console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("✅ DB đang dùng:", process.env.DATABASE_URL ? "NEON" : "LOCAL");

export { pool };