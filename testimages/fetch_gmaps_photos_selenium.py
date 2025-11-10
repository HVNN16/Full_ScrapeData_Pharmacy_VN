# -*- coding: utf-8 -*-
"""
Backfill ảnh Google Maps bằng Selenium.

⚠️ Lưu ý:
  - Cào dữ liệu từ Google Maps có thể vi phạm Điều khoản dịch vụ. Hãy dùng cẩn trọng.
  - Không "vượt" CAPTCHA. Chỉ giảm xác suất & tự làm mát phiên khi gặp CAPTCHA.

Yêu cầu:
  pip install undetected-chromedriver selenium psycopg2-binary python-dotenv
"""

import os
import re
import time
import random
import argparse
import logging
from typing import Optional, List

import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Selenium (undetected-chromedriver + WebDriverWait)
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, WebDriverException, NoSuchWindowException
)

# ---------------------------------------------------------------------
# Config chung
# ---------------------------------------------------------------------
load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DATABASE_URL = os.getenv("DATABASE_URL")
PGHOST = os.getenv("PGHOST", "localhost")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGDATABASE = os.getenv("PGDATABASE")
PGUSER = os.getenv("PGUSER")
PGPASSWORD = os.getenv("PGPASSWORD")

HEADLESS = os.getenv("SELENIUM_HEADLESS", "true").lower() == "true"
WINDOW = os.getenv("SELENIUM_WINDOW", "1200x900")
CHROME_BIN = os.getenv("SELENIUM_DRIVER_PATH", "").strip() or None
CHROME_VERSION_MAIN_ENV = os.getenv("CHROME_VERSION_MAIN", "").strip()
CHROME_VERSION_MAIN = int(CHROME_VERSION_MAIN_ENV) if CHROME_VERSION_MAIN_ENV.isdigit() else None

# Cache/profilê Chrome (ưu tiên ổ F)
CACHE_ROOT = os.getenv("CACHE_ROOT", r"F:\gmaps_cache").strip() or r"F:\gmaps_cache"
PROFILE_DIR = os.path.join(CACHE_ROOT, "profile")
DISK_CACHE_DIR = os.path.join(CACHE_ROOT, "chromecache")
os.makedirs(PROFILE_DIR, exist_ok=True)
os.makedirs(DISK_CACHE_DIR, exist_ok=True)

# ---------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------
def get_conn():
    """Kết nối Postgres + bật autocommit + timeouts để không treo."""
    if DATABASE_URL:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=DictCursor)
    else:
        if not (PGDATABASE and PGUSER and PGPASSWORD):
            raise SystemExit("Thiếu cấu hình DB (DATABASE_URL hoặc PG*).")
        conn = psycopg2.connect(
            host=PGHOST, port=PGPORT, dbname=PGDATABASE, user=PGUSER, password=PGPASSWORD,
            cursor_factory=DictCursor
        )
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SET lock_timeout TO '1s';")         # chờ khóa tối đa 1s
            cur.execute("SET statement_timeout TO '15s';")   # chạy truy vấn tối đa 15s
            cur.execute("SET deadlock_timeout TO '1s';")
    except Exception as e:
        logging.warning("Không đặt được DB timeouts: %s", e)
    return conn

def count_targets(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM grocery_stores
            WHERE (image IS NULL OR image = '' OR image = 'N/A')
              AND place_id IS NOT NULL AND place_id <> '';
        """)
        return cur.fetchone()[0]

def fetch_batch_after_id(conn, last_id: int, limit: int) -> List[dict]:
    with conn.cursor() as cur:
        # Nếu bạn chạy song song nhiều tiến trình, có thể dùng FOR UPDATE SKIP LOCKED
        # nhưng khi đó cần quản lý transaction dài hơn. Ở đây ta đọc bình thường.
        cur.execute("""
            SELECT id, place_id
            FROM grocery_stores
            WHERE (image IS NULL OR image = '' OR image = 'N/A')
              AND place_id IS NOT NULL AND place_id <> ''
              AND id > %s
            ORDER BY id
            LIMIT %s;
        """, (last_id, limit))
        return cur.fetchall()

def update_image(conn, row_id: int, image_url: str, dry_run: bool = False,
                 db_retries: int = 3, db_backoff_base: float = 0.7) -> bool:
    """
    UPDATE ảnh an toàn:
      - SELECT ... FOR UPDATE NOWAIT để fail fast nếu bị lock
      - Retry/backoff nếu lock/timeout
      - autocommit nên KHÔNG cần conn.commit()
    Trả về True nếu ghi OK, False nếu bỏ qua do lock/timeout/không tồn tại.
    """
    if dry_run:
        logging.info("[DRY-RUN] Sẽ cập nhật id=%s image(len=%s)=%s",
                     row_id, len(image_url or ""), image_url)
        return True

    attempt = 0
    while attempt < db_retries:
        attempt += 1
        try:
            with conn.cursor() as cur:
                # fail fast nếu hàng đang bị session khác khóa
                cur.execute("SELECT 1 FROM grocery_stores WHERE id=%s FOR UPDATE NOWAIT;", (row_id,))
                cur.execute("""
                    UPDATE grocery_stores
                       SET image = %s
                     WHERE id = %s
                 RETURNING id;
                """, (image_url, row_id))
                got = cur.fetchone()
                if got:
                    logging.info("UPDATE ok id=%s (len=%s).", row_id, len(image_url or ""))
                    return True
                else:
                    logging.warning("UPDATE 0 dòng (id không tồn tại?) id=%s", row_id)
                    return False
        except psycopg2.Error as e:
            msg = (str(e) or "").lower()
            if ("lock timeout" in msg) or ("statement timeout" in msg) or ("could not obtain lock" in msg):
                wait = db_backoff_base * (1.5 ** (attempt - 1)) + random.uniform(0, 0.3)
                logging.warning("DB lock/timeout khi UPDATE id=%s (attempt %s/%s): %s → ngủ %.2fs rồi thử lại",
                                row_id, attempt, db_retries, e, wait)
                time.sleep(wait)
                continue
            logging.error("Lỗi UPDATE image cho id=%s (len=%s): %s",
                          row_id, len(image_url or ""), e)
            raise
        except Exception as e:
            logging.error("Lỗi không mong đợi khi UPDATE id=%s: %s", row_id, e)
            raise

    logging.warning("BỎ QUA id=%s sau %s lần retry do lock/timeout.", row_id, db_retries)
    return False

# ---------------------------------------------------------------------
# URL & trình duyệt
# ---------------------------------------------------------------------
def build_maps_url(place_id: str) -> str:
    return f"https://www.google.com/maps/place/?q=place_id:{place_id}"

def create_driver(proxy: Optional[str] = None):
    """Tạo Chrome (uc) ổn định cho Windows/headless; set cache/profile sang ổ F; tắt GPU/WebGL; hỗ trợ proxy."""
    options = uc.ChromeOptions()
    options.add_argument(f"--window-size={WINDOW}")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-features=AutomationControlled")
    options.add_argument("--lang=vi-VN,vi")
    options.add_argument("--disable-infobars")
    options.add_argument("--remote-allow-origins=*")
    options.page_load_strategy = "eager"

    # Dùng profile & cache trên F:
    options.add_argument(f"--user-data-dir={PROFILE_DIR}")
    options.add_argument(f"--profile-directory=Default")
    options.add_argument(f"--disk-cache-dir={DISK_CACHE_DIR}")
    options.add_argument("--disk-cache-size=1048576000")    # ~1GB
    options.add_argument("--media-cache-size=268435456")    # ~256MB
    options.add_argument("--disable-site-isolation-trials")
    options.add_argument("--lang=vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")

    # Ổn định đồ họa: ép software GL + tắt WebGL/GPU
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--use-gl=swiftshader")
    options.add_argument("--enable-unsafe-swiftshader")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-gpu-compositing")
    options.add_argument("--disable-webgl")
    options.add_argument("--disable-3d-apis")
    options.add_argument("--disable-features=CanvasOopRasterization,WebGL2ComputeContext")
    options.add_argument("--blink-settings=imagesEnabled=true")

    if HEADLESS:
        options.add_argument("--headless=new")
    if CHROME_BIN:
        options.binary_location = CHROME_BIN

    # Proxy (tùy chọn)
    if proxy:
        options.add_argument(f"--proxy-server={proxy}")

    # UA random nhẹ
    ua = random.choice([
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    ])
    options.add_argument(f"user-agent={ua}")

    driver = uc.Chrome(options=options, version_main=CHROME_VERSION_MAIN, use_subprocess=True)
    driver.set_page_load_timeout(45)
    return driver

def _is_session_broken(e: Exception) -> bool:
    msg = (str(e) or "").lower()
    return any(k in msg for k in [
        "no such window",
        "web view not found",
        "disconnected:",
        "not connected to devtools",
        "invalid session id",
        "chrome not reachable",
    ])

def safe_get(driver, url: str, recreate_cb, max_recreate: int = 2):
    """
    Gọi driver.get(url) với khả năng tự phục hồi: nếu phiên chết, tạo driver mới và thử lại.
    Trả về (driver_mới_hoặc_cũ).
    """
    attempts = 0
    while True:
        try:
            driver.get(url)
            return driver
        except (NoSuchWindowException, WebDriverException) as e:
            if not _is_session_broken(e) or attempts >= max_recreate:
                raise
            attempts += 1
            logging.warning("Phiên Chrome hỏng ('%s') → khởi tạo lại (lần %s/%s)...",
                            e, attempts, max_recreate)
            try:
                driver.quit()
            except Exception:
                pass
            driver = recreate_cb()
            time.sleep(0.6 + attempts * 0.3)

# ---------------------------------------------------------------------
# Google Maps helpers
# ---------------------------------------------------------------------
def looks_like_captcha(driver) -> bool:
    try:
        title = (driver.title or "").lower()
        html = (driver.page_source or "").lower()
        return (
            "unusual traffic" in html
            or "/sorry/index" in html
            or "captcha" in html
            or ("verify" in html and "robot" in html)
            or ("google" in title and "sorry" in title)
            or "vui lòng xác minh" in html
            or "xác minh rằng bạn không phải là robot" in html
        )
    except Exception:
        return False

def extract_og_image(driver) -> Optional[str]:
    """Lấy ảnh từ meta og:image (nhanh gọn)."""
    try:
        el = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'meta[property="og:image"]'))
        )
        return el.get_attribute("content") or None
    except TimeoutException:
        return None

IMG_REGEX = re.compile(
    r'https?://(?:lh\d\.googleusercontent\.com|streetviewpixels[^"\']+|maps\.googleapis\.com[^"\']+)[^"\']+',
    re.IGNORECASE
)

def extract_image_from_html(driver) -> Optional[str]:
    """Fallback: regex quét ảnh từ HTML."""
    try:
        html = driver.page_source or ""
        m = IMG_REGEX.search(html)
        if m:
            return m.group(0)
    except Exception:
        pass
    return None

def open_header_photo_and_extract(driver) -> Optional[str]:
    """Nếu không có og:image → thử click header photo rồi quét ảnh."""
    selectors = [
        'button[jsaction*="pane.heroHeaderImage"]',
        'button[aria-label*="Photo"]',
        'button[aria-label*="Hình ảnh"]',
    ]
    for sel in selectors:
        try:
            btn = WebDriverWait(driver, 8).until(EC.element_to_be_clickable((By.CSS_SELECTOR, sel)))
            btn.click()
            time.sleep(1.6)
            imgs = driver.find_elements(By.CSS_SELECTOR, "img")
            for img in imgs:
                src = img.get_attribute("src") or ""
                if "googleusercontent.com" in src:
                    return src
        except Exception:
            continue
    return extract_image_from_html(driver)

# ---------------------------------------------------------------------
# ETA
# ---------------------------------------------------------------------
def eta_string(start_ts: float, done: int, total: int) -> str:
    if done <= 0: return "ETA: n/a"
    elapsed = time.time() - start_ts
    rate = done / max(elapsed, 1e-6)
    remaining = max(total - done, 0)
    if rate <= 0: return "ETA: n/a"
    secs = int(remaining / rate)
    h, m, s = secs // 3600, (secs % 3600) // 60, secs % 60
    return f"ETA ~ {h}h {m}m {s}s"

# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Cập nhật ảnh Google Maps bằng Selenium")
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--limit", type=int, default=0, help="0 = tất cả record")
    parser.add_argument("--sleep", type=float, default=2.0, help="nghỉ (giây) giữa các record")
    parser.add_argument("--max-retries", type=int, default=2)
    parser.add_argument("--captcha-sleep", type=int, default=600, help="nghỉ (giây) cơ sở khi gặp CAPTCHA (nếu không xoay proxy)")
    parser.add_argument("--captcha-skip", action="store_true", help="bỏ qua record nếu gặp CAPTCHA (không nghỉ)")
    parser.add_argument("--dry-run", action="store_true", help="Không ghi DB, chỉ log")
    parser.add_argument("--once", action="store_true", help="Chỉ xử lý đúng 1 record đầu tiên (debug)")
    parser.add_argument("--db-retries", type=int, default=3, help="Số lần retry UPDATE khi bị lock/timeout")
    parser.add_argument("--proxy", type=str, default="", help="Proxy http://user:pass@host:port (tùy chọn)")
    parser.add_argument("--proxy-list", type=str, default="", help="File chứa danh sách proxy, mỗi dòng 1 proxy")

    args = parser.parse_args()

    # Load proxy list (nếu có)
    proxies: List[str] = []
    if args.proxy_list:
        try:
            with open(args.proxy_list, "r", encoding="utf-8") as f:
                proxies = [ln.strip() for ln in f if ln.strip()]
        except Exception as e:
            logging.warning("Không đọc được proxy list: %s", e)

    cur_proxy_idx = -1
    def next_proxy():
        nonlocal cur_proxy_idx
        if proxies:
            cur_proxy_idx = (cur_proxy_idx + 1) % len(proxies)
            return proxies[cur_proxy_idx]
        return (args.proxy.strip() or None)

    conn = get_conn()
    total = count_targets(conn)
    logging.info("Tổng số record cần cập nhật: %s", total)

    to_process_total = total if args.limit == 0 else min(args.limit, total)
    processed, last_id, start_ts = 0, 0, time.time()

    # Khởi tạo driver với proxy (nếu có)
    proxy = next_proxy()
    driver = create_driver(proxy=proxy)
    if proxy:
        logging.info("Đang dùng proxy: %s", proxy)

    captcha_hits = 0  # dùng để cooldown nếu gặp captcha liên tiếp

    try:
        while processed < to_process_total:
            batch_limit = min(args.batch_size, to_process_total - processed)
            rows = fetch_batch_after_id(conn, last_id, batch_limit)
            if not rows:
                break

            logging.info("Batch id %s → %s (size=%s) | %s",
                         rows[0]["id"], rows[-1]["id"], len(rows),
                         eta_string(start_ts, processed, to_process_total))

            for row in rows:
                row_id, pid = row["id"], row["place_id"]
                url = build_maps_url(pid)
                success, attempt = False, 0

                while attempt < args.max_retries and not success:
                    attempt += 1
                    try:
                        logging.info("Mở URL id=%s (attempt=%s): %s", row_id, attempt, url)
                        # GET có auto-recover: nếu phiên chết sẽ tạo lại driver
                        driver = safe_get(driver, url, recreate_cb=lambda: create_driver(proxy=proxy), max_recreate=2)

                        # pace nhẹ để giảm captcha/bị chặn
                        time.sleep(args.sleep + random.uniform(0.3, 0.7))

                        if looks_like_captcha(driver):
                            captcha_hits += 1
                            if args.captcha_skip:
                                logging.warning("CAPTCHA ở id=%s → BỎ QUA record", row_id)
                                break

                            # Cooldown ngắn + xoay proxy + recreate driver
                            cool = min(max(45, int(args.captcha_sleep / 5)), 180)  # 45–180s
                            logging.warning("Gặp CAPTCHA (hit #%s) → nghỉ %ss, đổi proxy & recreate driver.", captcha_hits, cool)
                            time.sleep(cool)

                            # Đổi proxy, recreate driver
                            try:
                                driver.quit()
                            except Exception:
                                pass
                            proxy = next_proxy()
                            logging.info("Dùng proxy mới: %s", proxy or "(none)")
                            driver = create_driver(proxy=proxy)
                            # thử lại cùng attempt (không tăng attempt thêm)
                            continue
                        else:
                            # reset đếm nếu hết captcha
                            if captcha_hits > 0:
                                captcha_hits = 0

                        # lấy ảnh theo các tầng
                        img_url = (
                            extract_og_image(driver)
                            or open_header_photo_and_extract(driver)
                            or extract_image_from_html(driver)
                        )

                        if img_url:
                            logging.info("Ảnh tìm được (id=%s, len=%s): %s", row_id, len(img_url or ""), img_url)
                            ok_update = update_image(conn, row_id, img_url,
                                                     dry_run=args.dry_run, db_retries=args.db_retries)
                            if ok_update:
                                processed += 1
                                success = True
                                logging.info("Đã cập nhật id=%s (%s/%s)", row_id, processed, to_process_total)
                            else:
                                # Quan trọng: BỎ QUA record khi bị lock/timeout để không lặp lại cùng id
                                success = True
                                logging.info("Bỏ qua id=%s do bị khóa/timeout/không tồn tại.", row_id)
                        else:
                            logging.info("Không tìm thấy ảnh id=%s (attempt %s)", row_id, attempt)

                    except Exception as e:
                        logging.warning("Lỗi id=%s attempt=%s: %s", row_id, attempt, e)
                        time.sleep(1.2 + attempt * 0.5)

                # cập nhật con trỏ keyset (dù thành công hay không vẫn nhảy id)
                last_id = row_id

                # nghỉ giữa các record
                time.sleep(args.sleep + random.uniform(0.2, 0.6))

                if args.once:
                    logging.info("--once: dừng sau 1 record để debug")
                    break

            if args.once:
                break

    finally:
        try:
            driver.quit()
        except Exception:
            pass
        conn.close()

    logging.info("Hoàn thành. Đã cập nhật %s/%s record", processed, to_process_total)

if __name__ == "__main__":
    main()
