import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";

import { fetchProvinces, getAssignedSurveyAreas } from "../api";
import MapView from "../components/MapView";
import PharmacyList from "../components/PharmacyList";
import ProvinceStats from "../components/ProvinceStats";
import ExportCSV from "../components/ExportCSV";
import LoadingScreen from "../components/LoadingScreen";

import PROVINCE_DISTRICTS from "../data/provinceDistricts";

function extractStaffCompanyName(areas) {
  if (!Array.isArray(areas) || !areas.length) return "";

  return (
    areas[0]?.company_name ||
    areas[0]?.company_fullname ||
    areas[0]?.company_email ||
    ""
  );
}

export default function HomePage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const [visibleMapCount, setVisibleMapCount] = useState(0);
  const [visibleFeatures, setVisibleFeatures] = useState([]);

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
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyFeatures, setNearbyFeatures] = useState([]);

  const [menuOpen] = useState(false);
  const mapRef = useRef(null);

  const [assignedAreas, setAssignedAreas] = useState([]);
  const [selectedAssignedAreaId, setSelectedAssignedAreaId] = useState("");
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [staffCompanyName, setStaffCompanyName] = useState("");

  const isLoggedIn = !!localStorage.getItem("token");
  const fullname = localStorage.getItem("fullname") || "Người dùng";
  const role = localStorage.getItem("role") || "user";

  const isCompanyStaff = role === "company_staff";

  const selectedAssignedArea = useMemo(() => {
    if (!selectedAssignedAreaId) return null;

    return assignedAreas.find(
      (area) => String(area.id) === String(selectedAssignedAreaId)
    );
  }, [assignedAreas, selectedAssignedAreaId]);

  const canUseAdvancedTools = useMemo(() => {
    return role === "admin" || role === "company";
  }, [role]);

  useEffect(() => {
    const saved = localStorage.getItem("company_selected_area");

    if (!saved) return;

    try {
      const area = JSON.parse(saved);

      if (area?.polygon) {
        setSelectedPolygon(area.polygon);
      }

      localStorage.removeItem("company_selected_area");
    } catch (err) {
      console.error("Lỗi đọc polygon company:", err);
    }
  }, []);

  useEffect(() => {
    const resetFilters = () => {
      setProvince("");
      setDistrict("");
      setRatingMin("");
    };

    window.addEventListener("resetMapFilters", resetFilters);

    return () => {
      window.removeEventListener("resetMapFilters", resetFilters);
    };
  }, []);

  useEffect(() => {
    fetchProvinces()
      .then(setProvinces)
      .catch((err) => {
        console.error("Lỗi tải danh sách tỉnh:", err);
      });
  }, []);

  useEffect(() => {
    if (!isCompanyStaff) return;

    const loadAssignedAreas = async () => {
      try {
        const res = await getAssignedSurveyAreas();
        const list = Array.isArray(res?.data) ? res.data : [];

        setAssignedAreas(list);
        setStaffCompanyName(extractStaffCompanyName(list));

        if (list.length > 0) {
          setSelectedAssignedAreaId(String(list[0].id));
        } else {
          setSelectedAssignedAreaId("");
        }
      } catch (err) {
        console.error("Lỗi tải vùng được giao:", err);
        setAssignedAreas([]);
        setSelectedAssignedAreaId("");
      }
    };

    loadAssignedAreas();
  }, [isCompanyStaff]);

  const handleInitialLoaded = useCallback(
    (mapInstance) => {
      setInitialLoading(false);

      if (mapInstance) {
        mapRef.current = mapInstance;
      }

      if (selectedPolygon && mapInstance) {
        try {
          const layer = L.geoJSON(selectedPolygon);

          mapInstance.fitBounds(layer.getBounds(), {
            padding: [40, 40],
          });
        } catch (err) {
          console.error("Lỗi fitBounds company polygon:", err);
        }
      }
    },
    [selectedPolygon]
  );

  const handleVisibleCountChange = useCallback((count) => {
    setVisibleMapCount(count);
  }, []);

  const handleFeaturesChange = useCallback((features) => {
    setVisibleFeatures(Array.isArray(features) ? features : []);
  }, []);

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
    const normalized = normalizeProvinceName(province);
    const list = PROVINCE_DISTRICTS[normalized] || [];

    setDistricts(list);
    setDistrict("");
  }, [province]);

  useEffect(() => {
    if (!canUseAdvancedTools) {
      setShowStats(false);
      setShowHeatmap(false);
    }
  }, [canUseAdvancedTools]);

  const confirmLogout = useCallback(() => {
    localStorage.clear();
    window.location.href = "/";
  }, []);

  const handleToggleHeatmap = () => {
    if (!canUseAdvancedTools) return;
    setShowHeatmap((prev) => !prev);
  };

  const handleToggleStats = () => {
    if (!canUseAdvancedTools) return;
    setShowStats((prev) => !prev);
  };

  const renderAccountSection = () => {
    if (!isLoggedIn) {
      return (
        <section className="panel-card">
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
        </section>
      );
    }

    return (
      <section className="panel-card">
        <div className="panel-title">Tài khoản</div>

        <div className="user-card">
          <div className="user-avatar">👤</div>

          <div>
            <div className="user-label">Xin chào</div>
            <div className="user-name">{fullname}</div>

            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#666",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              QUYỀN: {role}
            </div>

            {isCompanyStaff && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#2563eb",
                  fontWeight: 700,
                }}
              >
                Công ty: {staffCompanyName || "Đang cập nhật"}
              </div>
            )}
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

          {role === "company" && (
            <button
              className="btn btn-info"
              onClick={() => (window.location.href = "/company-reports")}
            >
              📊 Báo cáo nhân viên
            </button>
          )}

          <button
            className="btn btn-danger"
            onClick={() => setShowLogoutPopup(true)}
          >
            🚪 Đăng xuất
          </button>
        </div>
      </section>
    );
  };

  const renderStaffAssignedSection = () => {
    if (!isCompanyStaff) return null;

    return (
      <section className="panel-card">
        <div className="panel-title">Vùng được giao</div>

        {assignedAreas.length === 0 ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "#fff7ed",
              color: "#c2410c",
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            Bạn chưa được công ty giao vùng khảo sát.
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Chọn vùng khảo sát</label>

              <select
                value={selectedAssignedAreaId}
                onChange={(e) => setSelectedAssignedAreaId(e.target.value)}
                className="modern-input"
              >
                {assignedAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name || `Vùng #${area.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                padding: 10,
                borderRadius: 12,
                background: "#ecfdf5",
                color: "#047857",
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              Nhân viên chỉ xem và khảo sát nhà thuốc trong vùng được giao.
            </div>
          </>
        )}
      </section>
    );
  };

  const renderFilterSection = () => {
    if (isCompanyStaff) return null;

    return (
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
    );
  };

  const renderAdvancedToolsSection = () => {
    if (!canUseAdvancedTools) return null;

    return (
      <section className="panel-card">
        <div className="panel-title">Công cụ hiển thị</div>

        <div className="button-stack">
          <button
            className={`btn ${showHeatmap ? "btn-danger-soft" : "btn-success"}`}
            onClick={handleToggleHeatmap}
          >
            {showHeatmap ? "🧊 Tắt lớp nhiệt" : "🔥 Bật lớp nhiệt"}
          </button>

          <button className="btn btn-info" onClick={handleToggleStats}>
            {showStats ? "🔙 Trở lại danh sách" : "📊 Xem thống kê theo tỉnh"}
          </button>
        </div>
      </section>
    );
  };

  const renderMainContent = () => {
    if (showStats && canUseAdvancedTools) {
      return (
        <div className="panel-card content-card">
          <ProvinceStats province={province} />
        </div>
      );
    }

    return (
      <div className="panel-card content-card">
        <PharmacyList
  province={isCompanyStaff ? "" : province}
  district={isCompanyStaff ? "" : district}
  ratingMin={isCompanyStaff ? "" : ratingMin}
  nearbyMode={nearbyMode}
  setNearbyMode={setNearbyMode}
  setNearbyFeatures={setNearbyFeatures}
  userLocation={userLocation}
  setSelectedPharmacy={setSelectedPharmacy}
  setUserLocation={setUserLocation}
  setRadiusKm={setRadiusKm}
  visibleMapCount={visibleMapCount}
  features={visibleFeatures}
/>
      </div>
    );
  };

  return (
    <>
      {initialLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
          }}
        >
          <LoadingScreen
            title="Pharmacy Map"
            subtitle="Đang tải dữ liệu nhà thuốc..."
          />
        </div>
      )}

      <div
        className="home-layout"
        style={{
          opacity: initialLoading ? 0 : 1,
          pointerEvents: initialLoading ? "none" : "auto",
        }}
      >
        <aside className={`sidebar ${menuOpen ? "show" : ""}`}>
          <div className="sidebar-inner">
            <div className="brand-block">
              <div className="brand-icon">💊</div>

              <div>
                <h1 className="brand-title">Bản đồ nhà thuốc</h1>

                <p className="brand-subtitle">
                  Quản lý, lọc và trực quan dữ liệu nhà thuốc
                </p>
              </div>
            </div>

            {renderAccountSection()}
            {renderStaffAssignedSection()}
            {renderFilterSection()}
            {renderAdvancedToolsSection()}
            {renderMainContent()}
          </div>
        </aside>

        <main className="map-wrapper">
          <div className="map-frame">
            <MapView
  province={isCompanyStaff ? "" : province}
  district={isCompanyStaff ? "" : district}
  ratingMin={isCompanyStaff ? "" : ratingMin}
  selectedPharmacy={selectedPharmacy}
  userLocation={userLocation}
  radiusKm={radiusKm}
  nearbyMode={nearbyMode}
  nearbyFeatures={nearbyFeatures}
  showHeatmap={canUseAdvancedTools ? showHeatmap : false}
  staffAssignedArea={selectedAssignedArea}
  companySelectedPolygon={selectedPolygon}
  onInitialLoaded={handleInitialLoaded}
  onVisibleCountChange={handleVisibleCountChange}
  onFeaturesChange={handleFeaturesChange}
/>
          </div>

          {(role === "admin" || role === "company") && (
            <div className="export-floating">
              <ExportCSV province={province} district={district} />
            </div>
          )}
        </main>
      </div>

      {showLogoutPopup && (
        <div
          className="logout-popup-overlay"
          onClick={() => setShowLogoutPopup(false)}
        >
          <div
            className="logout-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logout-popup-icon">🚪</div>

            <h2 className="logout-popup-title">Xác nhận đăng xuất</h2>

            <p className="logout-popup-text">
              Bạn có chắc muốn đăng xuất khỏi hệ thống không?
            </p>

            <div className="logout-popup-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowLogoutPopup(false)}
              >
                Hủy
              </button>

              <button className="btn btn-danger" onClick={confirmLogout}>
                🚪 Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}