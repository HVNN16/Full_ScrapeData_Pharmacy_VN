# db.py
# Kết nối DB, tạo/migrate bảng, lưu dữ liệu cửa hàng (có geometry)

import psycopg2
import psycopg2.extras
from config import PG_DSN

def connect_postgres():
    conn = psycopg2.connect(PG_DSN)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    return conn, cur

def ensure_postgis(cur):
    """Bật PostGIS (nếu role hiện tại có quyền). Không fatal nếu không có quyền."""
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    except Exception:
        # Có thể không có quyền CREATE EXTENSION trên DB. Bỏ qua để không chặn app.
        pass

def ensure_tables(cur, conn):
    """
    - Tạo bảng nếu chưa có
    - Bổ sung cột/ chỉ mục còn thiếu
    - Tạo trigger tự động set geom từ lat/lon
    """
    ensure_postgis(cur)

    # Bảng dữ liệu cửa hàng
    cur.execute("""
        CREATE TABLE IF NOT EXISTS grocery_stores (
            id SERIAL PRIMARY KEY,
            province TEXT,
            district TEXT,
            place_id TEXT UNIQUE,
            name TEXT,
            image TEXT,
            rating TEXT,
            category TEXT,
            status TEXT,
            closing_time TEXT,
            phone TEXT,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            address TEXT,
            map_url TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # Thêm cột geom nếu chưa có (Point, WGS84)
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='grocery_stores' AND column_name='geom'
            ) THEN
                EXECUTE 'ALTER TABLE grocery_stores ADD COLUMN geom geometry(Point,4326)';
            END IF;
        END$$;
    """)

    # Bảng tiến trình
    cur.execute("""
        CREATE TABLE IF NOT EXISTS crawl_progress (
            province TEXT NOT NULL,
            district TEXT NOT NULL,
            keyword  TEXT NOT NULL,
            status   TEXT NOT NULL DEFAULT 'pending',   -- pending|running|partial|done|failed
            last_place_id TEXT,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT crawl_progress_pk PRIMARY KEY (province, district, keyword)
        );
    """)

    # Migrate phòng khi bảng cũ thiếu cột
    cur.execute("ALTER TABLE grocery_stores ADD COLUMN IF NOT EXISTS address TEXT;")
    cur.execute("ALTER TABLE grocery_stores ADD COLUMN IF NOT EXISTS map_url TEXT;")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gs_province ON grocery_stores (province);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gs_district ON grocery_stores (district);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gs_latlng ON grocery_stores (latitude, longitude);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gs_geom ON grocery_stores USING GIST (geom);")

    cur.execute("ALTER TABLE crawl_progress ADD COLUMN IF NOT EXISTS last_place_id TEXT;")
    cur.execute("ALTER TABLE crawl_progress ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';")
    cur.execute("ALTER TABLE crawl_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();")

    # Trigger: tự động set geom khi có lat/lon
    cur.execute("""
        CREATE OR REPLACE FUNCTION set_geom_from_latlon()
        RETURNS trigger AS $$
        BEGIN
          IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
            NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
          ELSE
            NEW.geom := NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    cur.execute("DROP TRIGGER IF EXISTS trg_set_geom ON grocery_stores;")
    cur.execute("""
        CREATE TRIGGER trg_set_geom
        BEFORE INSERT OR UPDATE OF latitude, longitude
        ON grocery_stores
        FOR EACH ROW
        EXECUTE FUNCTION set_geom_from_latlon();
    """)

    conn.commit()

def backfill_geom(cur, conn):
    """
    Điền geom cho dữ liệu cũ đang NULL (dựa vào lat/lon).
    Gọi 1 lần sau khi thêm cột/trigger.
    """
    cur.execute("""
        UPDATE grocery_stores
        SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        WHERE geom IS NULL
          AND longitude IS NOT NULL
          AND latitude  IS NOT NULL;
    """)
    conn.commit()
    return cur.rowcount  # số bản ghi được cập nhật

def is_duplicate(cur, place_id):
    if not place_id or place_id == 'N/A':
        return None
    cur.execute("SELECT * FROM grocery_stores WHERE place_id = %s;", (place_id,))
    return cur.fetchone()

def save_store(cur, conn, store_data):
    """
    Lưu 1 record vào grocery_stores, chống trùng theo place_id.
    - Insert kèm geom (nếu có lat/lon)
    - Nếu trùng, cập nhật lại các trường và geom (upsert)
    Trả về True nếu insert mới hoặc update, False nếu không thay đổi.
    """
    cur.execute("""
        INSERT INTO grocery_stores (
            province, district, place_id, name, image, rating, category,
            status, closing_time, phone, latitude, longitude,
            address, map_url, created_at, geom
        ) VALUES (
            %(province)s, %(district)s, %(place_id)s, %(name)s, %(image)s, %(rating)s, %(category)s,
            %(status)s, %(closing_time)s, %(phone)s, %(latitude)s, %(longitude)s,
            %(address)s, %(map_url)s, %(created_at)s,
            CASE
              WHEN %(longitude)s IS NOT NULL AND %(latitude)s IS NOT NULL
              THEN ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326)
              ELSE NULL
            END
        )
        ON CONFLICT (place_id) DO UPDATE
        SET
          province     = EXCLUDED.province,
          district     = EXCLUDED.district,
          name         = EXCLUDED.name,
          image        = EXCLUDED.image,
          rating       = EXCLUDED.rating,
          category     = EXCLUDED.category,
          status       = EXCLUDED.status,
          closing_time = EXCLUDED.closing_time,
          phone        = EXCLUDED.phone,
          latitude     = EXCLUDED.latitude,
          longitude    = EXCLUDED.longitude,
          address      = EXCLUDED.address,
          map_url      = EXCLUDED.map_url,
          created_at   = EXCLUDED.created_at,
          geom = CASE
            WHEN EXCLUDED.longitude IS NOT NULL AND EXCLUDED.latitude IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint(EXCLUDED.longitude, EXCLUDED.latitude), 4326)
            ELSE grocery_stores.geom
          END;
    """, store_data)
    conn.commit()
    return cur.rowcount > 0
