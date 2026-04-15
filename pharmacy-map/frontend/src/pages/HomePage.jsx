import { useEffect, useState } from "react";
import { fetchProvinces } from "../api";
import MapView from "../components/MapView";
import PharmacyList from "../components/PharmacyList";
import PROVINCE_DISTRICTS from "../data/provinceDistricts";
import ProvinceStats from "../components/ProvinceStats";
import ExportCSV from "../components/ExportCSV";

export default function HomePage() {
  const [provinces, setProvinces] = useState([]);
  const [province, setProvince] = useState("");
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoggedIn = !!localStorage.getItem("token");
  const fullname = localStorage.getItem("fullname") || "Admin";
  const role = localStorage.getItem("role");

  const normalizeProvinceName = (name) => {
    if (!name) return "";
    return name
      .trim()
      .replace(/^TP\.?\s*/i, "Thành phố ")
      .replace(/^T\.?P\.?\s*/i, "Thành phố ")
      .replace(/^Tinh\s*/i, "Tỉnh ")
      .replace(/^Tỉnh\s*/i, "Tỉnh ")
      .replace("Phố", "phố");
  };

  useEffect(() => {
    fetchProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    const normalized = normalizeProvinceName(province);
    const list = PROVINCE_DISTRICTS[normalized] || [];
    setDistricts(list);
    setDistrict("");
  }, [province]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="home-layout">
      <button
        className="mobile-menu-btn"
        onClick={() => setMenuOpen(true)}
        aria-label="Mở menu"
      >
        ☰
      </button>

      {menuOpen && (
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`sidebar ${menuOpen ? "show" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <button
              className="sidebar-close-btn"
              onClick={() => setMenuOpen(false)}
              aria-label="Đóng menu"
            >
              ✕
            </button>

            <div className="brand-block">
              <div className="brand-icon">💊</div>
              <div>
                <h1 className="brand-title">Bản đồ nhà thuốc</h1>
                <p className="brand-subtitle">
                  Quản lý, lọc và trực quan dữ liệu nhà thuốc
                </p>
              </div>
            </div>
          </div>

          <section className="panel-card">
            {!isLoggedIn ? (
              <>
                <div className="panel-title">Tài khoản</div>
                <div className="button-stack">
                  <button
                    className="btn btn-primary"
                    onClick={() => (window.location.href = "/login")}
                  >
                    🔐 Đăng nhập
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => (window.location.href = "/register")}
                  >
                    📝 Đăng ký
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="panel-title">Tài khoản</div>
                <div className="user-card">
                  <div className="user-avatar">👤</div>
                  <div>
                    <div className="user-label">Xin chào</div>
                    <div className="user-name">{fullname}</div>
                  </div>
                </div>

                <div className="button-stack">
                  {role === "admin" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => (window.location.href = "/admin")}
                    >
                      🛠 Trang quản trị
                    </button>
                  )}

                  <button className="btn btn-danger" onClick={handleLogout}>
                    🚪 Đăng xuất
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="panel-card">
            <div className="panel-title">Bộ lọc dữ liệu</div>

            <div className="form-group">
              <label>Tỉnh / Thành phố</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="modern-input"
              >
                <option value="">-- Tất cả --</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Địa chỉ hành chính cấp 2</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="modern-input"
                disabled={!districts.length}
              >
                <option value="">-- Tất cả --</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Rating tối thiểu</label>
              <input
                type="number"
                value={ratingMin}
                onChange={(e) => setRatingMin(e.target.value)}
                placeholder="VD: 4.0"
                className="modern-input"
              />
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">Công cụ hiển thị</div>

            <div className="button-stack">
              <button
                className={`btn ${showHeatmap ? "btn-danger-soft" : "btn-success"}`}
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                {showHeatmap ? "🧊 Tắt lớp nhiệt" : "🔥 Bật lớp nhiệt"}
              </button>

              <button
                className="btn btn-info"
                onClick={() => setShowStats(!showStats)}
              >
                {showStats ? "🔙 Trở lại danh sách" : "📊 Xem thống kê theo tỉnh"}
              </button>
            </div>
          </section>

          <section className="panel-content">
            {showStats ? (
              <div className="panel-card content-card">
                <ProvinceStats province={province} />
              </div>
            ) : (
              <div className="panel-card content-card">
                <PharmacyList
                  province={province}
                  district={district}
                  ratingMin={ratingMin}
                  userLocation={userLocation}
                  setSelectedPharmacy={setSelectedPharmacy}
                  setUserLocation={setUserLocation}
                  setRadiusKm={setRadiusKm}
                />
              </div>
            )}
          </section>
        </div>
      </aside>

      <main className="map-wrapper">
        <div className="map-frame">
          <MapView
            province={province}
            district={district}
            ratingMin={ratingMin}
            selectedPharmacy={selectedPharmacy}
            userLocation={userLocation}
            radiusKm={radiusKm}
            showHeatmap={showHeatmap}
          />
        </div>

        <div className="export-floating">
          <ExportCSV province={province} district={district} />
        </div>
      </main>
    </div>
  );
}
  