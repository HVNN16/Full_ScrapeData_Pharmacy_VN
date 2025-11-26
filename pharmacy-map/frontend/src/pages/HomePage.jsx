// src/pages/HomePage.jsx
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

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside
        style={{
          width: "360px",
          background: "#fff",
          borderRight: "1px solid #eee",
          overflowY: "auto",
          padding: "16px",
        }}
      >
        <h2 style={{ color: "#007bff", marginBottom: 10 }}>💊 Bản đồ nhà thuốc</h2>
      {/* ==== LOGIN & REGISTER BUTTONS ==== */}
<div style={{ marginBottom: 20 }}>
  {!localStorage.getItem("token") ? (
    <>
      <button
        onClick={() => (window.location.href = "/login")}
        style={{
          background: "#6c5ce7",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          width: "100%",
          cursor: "pointer",
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        🔐 Đăng nhập
      </button>

      <button
        onClick={() => (window.location.href = "/register")}
        style={{
          background: "#00b894",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          width: "100%",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        📝 Đăng ký
      </button>
    </>
  ) : (
    <>
      <div
        style={{
          padding: "8px",
          background: "#eaeaea",
          borderRadius: "6px",
          marginBottom: "10px",
          textAlign: "center",
          fontWeight: 500,
        }}
      >
        👤 Xin chào, {localStorage.getItem("fullname")}
      </div>

      {/* ⭐⭐⭐ Hiện nút Admin nếu role = admin ⭐⭐⭐ */}
      {localStorage.getItem("role") === "admin" && (
        <button
          onClick={() => (window.location.href = "/admin")}
          style={{
            background: "#0984e3",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            width: "100%",
            cursor: "pointer",
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          🛠 Trang quản trị
        </button>
      )}

      <button
        onClick={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
        style={{
          background: "#d63031",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          width: "100%",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        🚪 Đăng xuất
      </button>
    </>
  )}
</div>
{/* ==== END AUTH BUTTONS ==== */}

        <label>Tỉnh / Thành phố</label>
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        >
          <option value="">-- Tất cả --</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label>Địa chỉ hành chính cấp 2</label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          disabled={!districts.length}
        >
          <option value="">-- Tất cả --</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <label>Rating tối thiểu</label>
        <input
          type="number"
          value={ratingMin}
          onChange={(e) => setRatingMin(e.target.value)}
          placeholder="VD: 4.0"
          style={{ width: "100%", marginBottom: 15 }}
        />

        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          style={{
            background: showHeatmap ? "#ef4444" : "#10b981",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            width: "100%",
            marginBottom: 10,
          }}
        >
          {showHeatmap ? "🧊 Tắt lớp nhiệt" : "🔥 Bật lớp nhiệt"}
        </button>

        <button
          onClick={() => setShowStats(!showStats)}
          style={{
            background: "#007bff",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            marginBottom: 15,
            width: "100%",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {showStats ? "🔙 Trở lại danh sách" : "📊 Xem thống kê theo tỉnh"}
        </button>

        {showStats ? (
          <ProvinceStats province={province} />
        ) : (
          <PharmacyList
            province={province}
            district={district}
            ratingMin={ratingMin}
            userLocation={userLocation}
            setSelectedPharmacy={setSelectedPharmacy}
            setUserLocation={setUserLocation}
            setRadiusKm={setRadiusKm}
          />
        )}
      </aside>

      <main style={{ flex: 1 }}>
        <MapView
          province={province}
          district={district}
          ratingMin={ratingMin}
          selectedPharmacy={selectedPharmacy}
          userLocation={userLocation}
          radiusKm={radiusKm}
          showHeatmap={showHeatmap}
        />

        <ExportCSV province={province} district={district} />
      </main>
    </div>
  );
}
