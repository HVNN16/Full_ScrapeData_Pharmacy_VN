import React, { useCallback, useEffect, useMemo, useState } from "react";

function PharmacyList({
  province,
  district,
  ratingMin,
  nearbyMode,
  setNearbyMode,
  setNearbyFeatures,
  setSelectedPharmacy,
  userLocation,
  setUserLocation,
  setRadiusKm,
  visibleMapCount = 0,
  features = [],
}) {
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(3);
  const [sortByDistance, setSortByDistance] = useState(true);

  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const buildNearbyFeatures = useCallback(() => {
    if (!userLocation || !Array.isArray(features)) return [];

    return features.filter((feature) => {
      const coords = feature?.geometry?.coordinates || [];
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

      const d = distanceKm(userLocation.lat, userLocation.lon, lat, lon);
      return d <= radius;
    });
  }, [features, userLocation, radius]);

  const items = useMemo(() => {
    if (!Array.isArray(features)) return [];

    return features
      .map((feature) => {
        const props = feature?.properties || {};
        const coords = feature?.geometry?.coordinates || [];

        const lon = Number(coords[0]);
        const lat = Number(coords[1]);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        const distance =
          userLocation && nearbyMode
            ? distanceKm(userLocation.lat, userLocation.lon, lat, lon)
            : null;

        return {
          ...props,
          lat,
          lon,
          distance,
        };
      })
      .filter(Boolean);
  }, [features, userLocation, nearbyMode]);

  const searchedItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return items;

    return items.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const address = item.address?.toLowerCase() || "";
      const provinceName = item.province?.toLowerCase() || "";
      const districtName = item.district?.toLowerCase() || "";

      return (
        name.includes(keyword) ||
        address.includes(keyword) ||
        provinceName.includes(keyword) ||
        districtName.includes(keyword)
      );
    });
  }, [items, search]);

  const filtered = useMemo(() => {
    let result = searchedItems;

    if (nearbyMode && userLocation) {
      result = searchedItems.filter(
        (item) => typeof item.distance === "number" && item.distance <= radius
      );
    }

    if (nearbyMode && sortByDistance) {
      return [...result].sort((a, b) => a.distance - b.distance);
    }

    return result;
  }, [searchedItems, nearbyMode, userLocation, radius, sortByDistance]);

  useEffect(() => {
    setNearbyMode(false);
    setNearbyFeatures([]);
  }, [province, district, ratingMin, setNearbyMode, setNearbyFeatures]);

  useEffect(() => {
    if (!nearbyMode) return;

    setRadiusKm(radius);
    setNearbyFeatures(buildNearbyFeatures());
  }, [
    radius,
    nearbyMode,
    buildNearbyFeatures,
    setRadiusKm,
    setNearbyFeatures,
  ]);

  useEffect(() => {
    if (filtered.length === 1) {
      const only = filtered[0];

      setSelectedPharmacy({
        lat: Number(only.lat),
        lon: Number(only.lon),
        ...only,
      });
    }
  }, [filtered, setSelectedPharmacy]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("⚠️ Trình duyệt không hỗ trợ định vị GPS!");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        alert("✅ Đã lấy vị trí của bạn thành công!");
      },
      (err) => {
        console.error("⚠️ Lỗi định vị:", err);

        if (err.code === 1) {
          alert(
            "❌ Bạn đã từ chối quyền định vị! Hãy bật lại trong phần cài đặt trình duyệt."
          );
        } else if (err.code === 2) {
          alert("⚠️ Không thể xác định vị trí, mạng yếu hoặc GPS tắt.");
        } else {
          alert("❌ Lỗi không xác định khi lấy vị trí!");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleFilterNearby = () => {
    if (!userLocation) {
      alert("⚠️ Vui lòng nhấn '📍 Lấy vị trí hiện tại' trước!");
      return;
    }

    if (!radius || radius <= 0) {
      alert("⚠️ Vui lòng nhập bán kính hợp lệ!");
      return;
    }

    setRadiusKm(radius);
    setNearbyMode(true);
    setNearbyFeatures(buildNearbyFeatures());
  };

  const handleClearNearby = () => {
    setNearbyMode(false);
    setNearbyFeatures([]);
  };

  const quickRadiusOptions = [1, 3, 5, 10];

  return (
    <div>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <button
            onClick={handleGetLocation}
            style={{
              background: "#34d399",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "15px",
            }}
          >
            📍 Lấy vị trí hiện tại
          </button>

          <button
            onClick={handleFilterNearby}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "15px",
            }}
          >
            🚀 Lọc gần tôi
          </button>

          {nearbyMode && (
            <button
              onClick={handleClearNearby}
              style={{
                background: "#f97316",
                color: "white",
                border: "none",
                padding: "10px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "15px",
              }}
            >
              ↩️ Bỏ lọc gần tôi
            </button>
          )}
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1f2937",
              marginBottom: 4,
            }}
          >
            Bán kính tìm kiếm
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            Phạm vi lọc được tính từ vị trí hiện tại của bạn.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              min={1}
              max={50}
              step={1}
              style={{
                width: "90px",
                textAlign: "center",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                padding: "8px 10px",
                fontSize: "15px",
                fontWeight: 600,
                outline: "none",
              }}
            />

            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              km
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            {quickRadiusOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRadius(value)}
                style={{
                  border:
                    radius === value
                      ? "1px solid #2563eb"
                      : "1px solid #d1d5db",
                  background: radius === value ? "#eff6ff" : "#fff",
                  color: radius === value ? "#2563eb" : "#374151",
                  borderRadius: "999px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                {value} km
              </button>
            ))}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={sortByDistance}
              onChange={(e) => setSortByDistance(e.target.checked)}
            />
            Sắp xếp nhà thuốc gần nhất lên trước
          </label>
        </div>
      </div>

      <input
        type="text"
        placeholder="🔍 Tìm kiếm nhà thuốc..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 10,
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          fontSize: "15px",
          outline: "none",
        }}
      />

      <div
        style={{
          fontWeight: 500,
          fontSize: "15px",
          color: "#333",
          margin: "6px 0 12px",
          lineHeight: 1.8,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "10px 12px",
        }}
      >
        🗺️ Số nhà thuốc đang hiển thị trên bản đồ:{" "}
        <span style={{ color: "#2563eb", fontWeight: 700 }}>
          {visibleMapCount}
        </span>
        <br />
        📋 Số nhà thuốc trong danh sách:{" "}
        <span style={{ color: "#16a34a", fontWeight: 700 }}>
          {filtered.length}
        </span>
        {nearbyMode && (
          <>
            <br />
            📍 Đang lọc gần tôi trong bán kính:{" "}
            <span style={{ color: "#f97316", fontWeight: 700 }}>
              {radius} km
            </span>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "#999", fontStyle: "italic" }}>
          Không tìm thấy kết quả phù hợp
        </p>
      ) : (
        filtered.map((item, i) => {
          const dist =
            typeof item.distance === "number" ? item.distance.toFixed(2) : null;

          return (
            <div
              key={`${item.id || item.name || "pharmacy"}-${item.lat}-${item.lon}-${i}`}
              onClick={() =>
                setSelectedPharmacy({
                  lat: Number(item.lat),
                  lon: Number(item.lon),
                  ...item,
                })
              }
              style={{
                border: "1px solid #eee",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "12px",
                cursor: "pointer",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                transition: "all 0.2s ease",
              }}
            >
              <h4 style={{ color: "#007bff", marginBottom: 6 }}>
                {item.name || "Không có tên"}
              </h4>

              <p style={{ margin: "0 0 4px 0", lineHeight: 1.5 }}>
                📍 {item.address || "Không có địa chỉ"}
              </p>

              <p style={{ margin: "0 0 4px 0" }}>
                ⭐ {item.rating ?? "Chưa có rating"}
              </p>

              {item.is_surveyed && (
                <p
                  style={{
                    margin: "0 0 4px 0",
                    color: "#16a34a",
                    fontWeight: 700,
                  }}
                >
                  ✅ Đã khảo sát
                </p>
              )}

              {dist && (
                <p style={{ margin: 0, color: "#555", fontWeight: 500 }}>
                  📏 {dist} km
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default React.memo(PharmacyList);