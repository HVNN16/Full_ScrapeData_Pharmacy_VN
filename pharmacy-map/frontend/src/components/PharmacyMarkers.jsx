import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

// 🌈 Tạo marker có hiệu ứng lan tỏa + gradient hiện đại
const createPharmacyIcon = (selected = false) =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${selected ? `<div class="pulse-wave"></div>` : ""}
        <div style="
          background: ${selected
            ? 'linear-gradient(135deg, #00e5ff, #6200ea, #ff4081)'
            : '#2b8a3e'};
          color: white;
          font-size: 14px;
          font-weight: bold;
          border-radius: 50%;
          width: ${selected ? 30 : 20}px;
          height: ${selected ? 30 : 20}px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 0 12px rgba(0,0,0,0.3);
        ">
          💊
        </div>
      </div>
    `,
    className: "pharmacy-marker",
    iconSize: [selected ? 40 : 25, selected ? 40 : 25],
    iconAnchor: [15, 15],
    popupAnchor: [0, -10],
  });

// 💫 Hiệu ứng lan tỏa sóng ánh sáng
const addPulseWaveStyle = () => {
  if (document.getElementById("pulse-wave-style")) return;
  const style = document.createElement("style");
  style.id = "pulse-wave-style";
  style.innerHTML = `
    @keyframes wave {
      0% { transform: scale(0.6); opacity: 0.8; }
      60% { transform: scale(1.8); opacity: 0.3; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    .pulse-wave {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.6), rgba(0,255,255,0.3), rgba(0,0,0,0));
      animation: wave 1.6s ease-out infinite;
      z-index: -1;
    }
  `;
  document.head.appendChild(style);
};

// 🔍 Hàm tính khoảng cách
const isNear = (lat1, lon1, lat2, lon2, meters = 30) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const d = 2 * R * Math.asin(Math.sqrt(a));
  return d <= meters;
};

export default function PharmacyMarkers({ features, selectedPharmacy }) {
  const markerInstances = useRef([]);
  const clusterRef = useRef();
  const [ready, setReady] = useState(false);

  useEffect(() => addPulseWaveStyle(), []);

  useEffect(() => {
    if (!features) return;
    setTimeout(() => setReady(true), 300);
  }, [features]);

  // 🧭 Khi chọn 1 nhà thuốc từ danh sách → tự động zoom & mở popup
  useEffect(() => {
    if (!selectedPharmacy || !ready) return;

    const found = markerInstances.current.find((m) =>
      isNear(m.lat, m.lon, selectedPharmacy.lat, selectedPharmacy.lon, 30)
    );
    if (!found?.instance) return;

    const map = found.instance._map;
    const clusterLayer = clusterRef.current;

    const flyAndOpen = () => {
      const targetZoom = Math.max(map.getZoom(), 18);
      map.flyTo(found.instance.getLatLng(), targetZoom, { duration: 0.8 });

      map.once("moveend", () => {
        // 🔓 Nếu marker đang nằm trong cụm -> spiderfy (tách ra)
        const parent = found.instance.__parent;
        if (parent && parent.spiderfy) parent.spiderfy();
        setTimeout(() => found.instance.openPopup(), 150);
      });
    };

    if (clusterLayer?.zoomToShowLayer) {
      clusterLayer.zoomToShowLayer(found.instance, flyAndOpen);
    } else {
      flyAndOpen();
    }
  }, [selectedPharmacy, ready]);

  if (!features) return null;
  markerInstances.current = [];

  return (
    <MarkerClusterGroup
      ref={clusterRef}
      chunkedLoading
      showCoverageOnHover={false}
      spiderfyOnEveryZoom={true}
      spiderfyOnMaxZoom={true}
      disableClusteringAtZoom={18}
      maxClusterRadius={40}
      zoomToBoundsOnClick={false}
      iconCreateFunction={(cluster) =>
        L.divIcon({
          html: `<div style="background:#ff4d4d;color:#fff;border-radius:50%;
                  width:32px;height:32px;display:flex;align-items:center;
                  justify-content:center;font-weight:700;">
                   ${cluster.getChildCount()}
                 </div>`,
          className: "cluster-icon",
          iconSize: [32, 32],
        })
      }
    >
      {features.features.map((f, i) => {
        const [lon, lat] = f.geometry.coordinates;
        const p = f.properties;
        const selected =
          selectedPharmacy &&
          isNear(lat, lon, selectedPharmacy.lat, selectedPharmacy.lon, 30);

        return (
          <Marker
            key={i}
            position={[lat, lon]}
            icon={createPharmacyIcon(selected)}
            eventHandlers={{
              add: (e) =>
                markerInstances.current.push({
                  lat,
                  lon,
                  instance: e.target,
                }),
            }}
          >
            <Popup autoPan autoClose>
              <div style={{ minWidth: 230, lineHeight: 1.5 }}>
                <b style={{ color: "#0d6efd" }}>{p.name}</b>
                <br />
                📍 {p.address ?? "Không có địa chỉ"}
                <br />
                ☎ {p.phone ?? "Không có"}
                <br />
                ⭐ {p.rating ?? "Chưa có"}
                <br />
                🏙️ {p.province ?? ""} {p.district ? ", " + p.district : ""}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}
