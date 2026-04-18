// src/components/MapView.jsx
import { MapContainer, TileLayer, useMap, Circle, Marker, Popup } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchGeoJSON } from "../api";
import PharmacyMarkers from "./PharmacyMarkers";
import "leaflet/dist/leaflet.css";
import provinceCenters from "../data/provinceCenters";
import districtCenters from "../data/districtCenters";
import L from "leaflet";
import RouteToPharmacy from "./RouteToPharmacy";
import HeatLayer from "./HeatLayer";

// === Utils ===
function normalizeName(name) {
  if (!name) return "";
  return name
    .trim()
    .normalize("NFC")
    .replace(/^tp\.?\s*/i, "Thành phố ")
    .replace(/^t\.?p\.?\s*/i, "Thành phố ")
    .replace(/^tinh\s*/i, "Tỉnh ")
    .replace(/^tỉnh\s*/i, "Tỉnh ")
    .replace(/\s+/g, " ")
    .replace(/\bPhố\b/, "phố")
    .replace(/\bTỉnh\b/, "Tỉnh")
    .trim();
}

function computeDistrictCentroid(features, district) {
  if (!features?.features?.length || !district) return null;
  const points = features.features
    .filter(
      (f) => (f.properties?.district || "").toLowerCase() === district.toLowerCase()
    )
    .map((f) => {
      const [lon, lat] = f.geometry?.coordinates || [];
      return typeof lat === "number" && typeof lon === "number" ? { lat, lon } : null;
    })
    .filter(Boolean);

  if (!points.length) return null;

  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  return [lat, lon];
}

// === Fly effects ===
function FlyToSelected({ selectedPharmacy }) {
  const map = useMap();

  useEffect(() => {
    if (selectedPharmacy) {
      const { lat, lon } = selectedPharmacy;
      map.flyTo([lat, lon], 16, { duration: 1.2 });
    }
  }, [selectedPharmacy, map]);

  return null;
}

function FlyToArea({ province, district, features }) {
  const map = useMap();
  const centerVN = useMemo(() => [16.05, 108.2], []);

  useEffect(() => {
    if (district) {
      const normD = normalizeName(district);
      const dCenter =
        districtCenters[normD] ||
        districtCenters[normD.replace("Thành phố", "Thành Phố")] ||
        districtCenters[normD.replace("Thành Phố", "Thành phố")];

      if (dCenter) {
        map.flyTo(dCenter, 13.5, { duration: 1.5 });
        return;
      }

      const centroid = computeDistrictCentroid(features, district);
      if (centroid) {
        map.flyTo(centroid, 13.5, { duration: 1.5 });
        return;
      }
    }

    if (province) {
      const normP = normalizeName(province);
      const pCenter =
        provinceCenters[normP] ||
        provinceCenters[normP.replace("Thành phố", "Thành Phố")] ||
        provinceCenters[normP.replace("Thành Phố", "Thành phố")];

      if (pCenter) {
        map.flyTo(pCenter, 8.5, { duration: 1.2 });
        return;
      }
    }

    map.flyTo(centerVN, 6, { duration: 1.2 });
  }, [province, district, features, map, centerVN]);

  return null;
}

function FlyToUser({ userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lon], 13, { duration: 1.2 });
    }
  }, [userLocation, map]);

  return null;
}

const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

export default function MapView({
  province,
  district,
  ratingMin,
  selectedPharmacy,
  userLocation,
  radiusKm,
  showHeatmap,
  onInitialLoaded,
}) {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const hasReportedInitialLoad = useRef(false);

  useEffect(() => {
    const handleManualReload = () => setReloadKey(Date.now());
    window.addEventListener("reloadMap", handleManualReload);
    return () => window.removeEventListener("reloadMap", handleManualReload);
  }, []);

  useEffect(() => {
    setFeatures(null);
  }, [province, district, ratingMin]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (active) setLoading(true);

        const data = await fetchGeoJSON({
          province,
          district,
          rating_min: ratingMin || 0,
          limit: 10000,
        });

        if (!active) return;

        setFeatures(data);

        if (!hasReportedInitialLoad.current) {
          hasReportedInitialLoad.current = true;
          onInitialLoaded?.();
        }
      } catch (e) {
        console.error("fetchGeoJSON error:", e);

        if (!hasReportedInitialLoad.current) {
          hasReportedInitialLoad.current = true;
          onInitialLoaded?.();
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [province, district, ratingMin, reloadKey, onInitialLoaded]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 9999,
            background: "rgba(255,255,255,0.9)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#333",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          ⏳ Đang tải dữ liệu nhà thuốc...
        </div>
      )}

      <MapContainer center={[16.05, 108.2]} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <PharmacyMarkers features={features} selectedPharmacy={selectedPharmacy} />
        <HeatLayer features={features?.features || []} enabled={showHeatmap} />
        <RouteToPharmacy userLocation={userLocation} selectedPharmacy={selectedPharmacy} />
        <FlyToSelected selectedPharmacy={selectedPharmacy} />
        <FlyToArea province={province} district={district} features={features} />

        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
              <Popup>
                <b>📍 Vị trí của bạn</b>
                <br />
                Bán kính hiển thị: {radiusKm} km
              </Popup>
            </Marker>

            <Circle
              center={[userLocation.lat, userLocation.lon]}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#007bff", fillColor: "#007bff", fillOpacity: 0.15 }}
            />

            <FlyToUser userLocation={userLocation} />
          </>
        )}
      </MapContainer>
    </div>
  );
}