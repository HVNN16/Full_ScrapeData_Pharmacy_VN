import React, { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

/* ================= ICON ================= */
/* ================= ICON ================= */
const createPharmacyIcon = (selected = false) =>
  L.divIcon({
    html: `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <img
          src="/pharmacy-shop.png"
          alt="pharmacy"
          style="
            width:${selected ? 52 : 40}px;
            height:${selected ? 52 : 40}px;
            object-fit:contain;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
          "
        />
      </div>
    `,
    className: "pharmacy-marker",
    iconSize: [selected ? 52 : 40, selected ? 52 : 40],
    iconAnchor: [selected ? 26 : 20, selected ? 52 : 40],
    popupAnchor: [0, -40],
  });

/* ================= DISTANCE ================= */
const isNear = (lat1, lon1, lat2, lon2, meters = 30) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a)) <= meters;
};

/* ================= NORMALIZE ================= */
function normalizeFeature(f) {
  const coords = f?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const p = f.properties || {};

  return {
    id: p.id || `${lat}-${lon}`, // ✅ KEY STABLE
    lat,
    lon,
    properties: p,
  };
}

/* ================= MAIN ================= */
function PharmacyMarkers({
  features,
  selectedPharmacy,
  activeRouteTarget,
  onRequestRoute,
}) {
  const clusterRef = useRef(null);
  const markerInstances = useRef([]);

  const [ready, setReady] = useState(false);

  /* ===== CLEAN DATA ===== */
  const pharmacies = useMemo(() => {
    return (features?.features || [])
      .map(normalizeFeature)
      .filter(Boolean);
  }, [features]);

  /* ===== RESET MARKER CACHE ===== */
  useEffect(() => {
    markerInstances.current = [];
  }, [pharmacies]);

  /* ===== DELAY RENDER (AVOID CRASH) ===== */
  useEffect(() => {
    setReady(false);
    if (!pharmacies.length) return;

    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, [pharmacies]);

  /* ===== AUTO FLY TO SELECTED ===== */
  useEffect(() => {
    if (!ready) return;

    const target = activeRouteTarget || selectedPharmacy;
    if (!target) return;

    const lat = Number(target.lat);
    const lon = Number(target.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const found = markerInstances.current.find((m) =>
      isNear(m.lat, m.lon, lat, lon)
    );

    if (!found?.instance) return;

    const marker = found.instance;
    const map = marker._map;

    if (!map) return;

    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 18), {
      duration: 0.8,
    });

    setTimeout(() => marker.openPopup(), 300);
  }, [selectedPharmacy, activeRouteTarget, ready]);

  /* ===== BLOCK RENDER ===== */
  if (!ready) return null;
  if (!pharmacies.length) return null;

  /* ===== RENDER ===== */
  return (
    <MarkerClusterGroup
      key={pharmacies.length} // ✅ FORCE RESET SAFE
      ref={clusterRef}
      chunkedLoading
      chunkDelay={40}
      maxClusterRadius={45}
      spiderfyOnMaxZoom
      disableClusteringAtZoom={18}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={false}
      iconCreateFunction={(cluster) =>
        L.divIcon({
          html: `<div style="
            background:#ef4444;
            color:white;
            border-radius:50%;
            width:32px;
            height:32px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:700;">
            ${cluster.getChildCount()}
          </div>`,
          className: "cluster-icon",
          iconSize: [32, 32],
        })
      }
    >
      {pharmacies.map(({ id, lat, lon, properties: p }) => {
        const selected =
          selectedPharmacy &&
          isNear(lat, lon, selectedPharmacy.lat, selectedPharmacy.lon);

        return (
          <Marker
            key={id}
            position={[lat, lon]}
            icon={createPharmacyIcon(selected)}
            eventHandlers={{
              add: (e) => {
                markerInstances.current.push({
                  lat,
                  lon,
                  instance: e.target,
                });
              },
            }}
          >
            <Popup>
              <b>{p.name || "Nhà thuốc"}</b>
              <br />
              📍 {p.address || "Không có địa chỉ"}
              <br />
              ⭐ {p.rating || "N/A"}
              <br />
              🕒 {p.status || "N/A"}
              <br />
              📞 {p.phone || "N/A"}

              <button
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: 6,
                  border: "none",
                  borderRadius: 8,
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                }}
                onClick={() =>
                  onRequestRoute?.({
                    name: p.name,
                    lat,
                    lon,
                  })
                }
              >
                Chỉ đường
              </button>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}

export default React.memo(PharmacyMarkers);