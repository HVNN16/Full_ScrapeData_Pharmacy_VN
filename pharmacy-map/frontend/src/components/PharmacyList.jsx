import { useEffect, useState } from "react";

export default function PharmacyList({
  province,
  district,
  ratingMin,
  setSelectedPharmacy,
  userLocation,
  setUserLocation,
  setRadiusKm,
}) {
  const [features, setFeatures] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(5); // km
  const [sortByDistance, setSortByDistance] = useState(true); // ✅ auto sắp xếp

  // 🔄 Lấy dữ liệu từ backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          province: province || "",
          district: district || "",
          rating_min: ratingMin || 0,
          limit: 10000,
        });
        const res = await fetch(
          `http://localhost:5000/api/pharmacies.geojson?${params}`
        );
        const data = await res.json();
        setFeatures(data.features || []);
        setFiltered(data.features || []);
      } catch (err) {
        console.error("❌ Lỗi tải danh sách nhà thuốc:", err);
      }
    };
    fetchData();
  }, [province, district, ratingMin]);

  // 🧭 Hàm tính khoảng cách giữa 2 tọa độ (km)
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

  // 📍 Lấy vị trí người dùng
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
        if (err.code === 1)
          alert(
            "❌ Bạn đã từ chối quyền định vị! Hãy bật lại trong phần cài đặt trình duyệt (ổ khóa bên trái thanh địa chỉ)."
          );
        else if (err.code === 2)
          alert("⚠️ Không thể xác định vị trí (mạng yếu hoặc GPS tắt).");
        else alert("❌ Lỗi không xác định khi lấy vị trí!");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 🚀 Lọc & sắp xếp nhà thuốc gần tôi
  const handleFilterNearby = () => {
    if (!userLocation) {
      alert("⚠️ Vui lòng nhấn '📍 Lấy vị trí' trước!");
      return;
    }

    setRadiusKm(radius);

    // Thêm khoảng cách vào mỗi feature
    const withDistance = features.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const d = distanceKm(userLocation.lat, userLocation.lon, lat, lon);
      return { ...f, distance: d };
    });

    // Lọc theo bán kính
    let nearby = withDistance.filter((f) => f.distance <= radius);

    // Sắp xếp theo khoảng cách
    if (sortByDistance) {
      nearby = nearby.sort((a, b) => a.distance - b.distance);
    }

    setFiltered(nearby);
    alert(`✅ Đã lọc ${nearby.length} nhà thuốc trong ${radius} km.`);
  };

  // 🔍 Tìm kiếm theo tên hoặc địa chỉ
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(features);
      return;
    }

    const keyword = search.toLowerCase();
    const result = features.filter((f) => {
      const name = f.properties?.name?.toLowerCase() || "";
      const address = f.properties?.address?.toLowerCase() || "";
      return name.includes(keyword) || address.includes(keyword);
    });

    setFiltered(result);

    if (result.length === 1) {
      const [lon, lat] = result[0].geometry.coordinates;
      setSelectedPharmacy({ lat, lon, ...result[0].properties });
    }
  }, [search, features, setSelectedPharmacy]);

  return (
    <div>
      {/* --- Bộ lọc khoảng cách --- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleGetLocation}
          style={{
            background: "#34d399",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          📍 Lấy vị trí
        </button>

        <input
          type="number"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          min={1}
          max={50}
          step={1}
          style={{
            width: "70px",
            textAlign: "center",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "4px",
          }}
        />
        <span style={{ fontSize: "14px" }}>km</span>

        <button
          onClick={handleFilterNearby}
          style={{
            background: "#007bff",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🚀 Lọc gần tôi
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={sortByDistance}
            onChange={(e) => setSortByDistance(e.target.checked)}
          />
          Sắp xếp gần nhất
        </label>
      </div>

      {/* Ô tìm kiếm */}
      <input
        type="text"
        placeholder="🔍 Tìm kiếm nhà thuốc..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 10,
          padding: "6px 8px",
          border: "1px solid #ccc",
          borderRadius: "6px",
        }}
      />

      {/* 🧾 Tổng số nhà thuốc */}
      <p
        style={{
          fontWeight: "500",
          fontSize: "15px",
          color: "#333",
          margin: "6px 0 12px",
        }}
      >
        🏥 Tổng số nhà thuốc hiển thị:{" "}
        <span style={{ color: "#007bff", fontWeight: "600" }}>
          {filtered.length}
        </span>
      </p>

      {/* Danh sách kết quả */}
      {filtered.length === 0 ? (
        <p style={{ color: "#999", fontStyle: "italic" }}>
          Không tìm thấy kết quả phù hợp
        </p>
      ) : (
        filtered.map((f, i) => {
          const props = f.properties;
          const [lon, lat] = f.geometry.coordinates;
          const dist = f.distance ? f.distance.toFixed(2) : null;

          return (
            <div
              key={i}
              onClick={() => setSelectedPharmacy({ lat, lon, ...props })}
              style={{
                border: "1px solid #eee",
                padding: "8px",
                marginBottom: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <h4 style={{ color: "#007bff", marginBottom: 4 }}>{props.name}</h4>
              <p style={{ margin: 0 }}>📍 {props.address}</p>
              <p style={{ margin: "4px 0" }}>⭐ {props.rating}</p>
              {dist && (
                <p style={{ margin: 0, color: "#555" }}>📏 {dist} km</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
