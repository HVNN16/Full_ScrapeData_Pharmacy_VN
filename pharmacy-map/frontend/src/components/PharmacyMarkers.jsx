// import React, { useEffect, useRef, useState } from "react";
// import { Marker, Popup } from "react-leaflet";
// import MarkerClusterGroup from "react-leaflet-cluster";
// import L from "leaflet";

// const createPharmacyIcon = (selected = false) =>
//   L.divIcon({
//     html: `
//       <div style="position: relative; display: flex; align-items: center; justify-content: center;">
//         ${selected ? `<div class="pulse-wave"></div>` : ""}
//         <div style="
//           background: ${
//             selected
//               ? "linear-gradient(135deg, #00e5ff, #6200ea, #ff4081)"
//               : "#2b8a3e"
//           };
//           color: white;
//           font-size: 14px;
//           font-weight: bold;
//           border-radius: 50%;
//           width: ${selected ? 30 : 20}px;
//           height: ${selected ? 30 : 20}px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           border: 2px solid white;
//           box-shadow: 0 0 12px rgba(0,0,0,0.3);
//         ">
//           💊
//         </div>
//       </div>
//     `,
//     className: "pharmacy-marker",
//     iconSize: [selected ? 40 : 25, selected ? 40 : 25],
//     iconAnchor: [15, 15],
//     popupAnchor: [0, -10],
//   });

// const addPulseWaveStyle = () => {
//   if (document.getElementById("pulse-wave-style")) return;

//   const style = document.createElement("style");
//   style.id = "pulse-wave-style";
//   style.innerHTML = `
//     @keyframes wave {
//       0% { transform: scale(0.6); opacity: 0.8; }
//       60% { transform: scale(1.8); opacity: 0.3; }
//       100% { transform: scale(2.4); opacity: 0; }
//     }
//     .pulse-wave {
//       position: absolute;
//       width: 40px;
//       height: 40px;
//       border-radius: 50%;
//       background: radial-gradient(circle, rgba(255,255,255,0.6), rgba(0,255,255,0.3), rgba(0,0,0,0));
//       animation: wave 1.6s ease-out infinite;
//       z-index: -1;
//     }
//   `;
//   document.head.appendChild(style);
// };

// const isNear = (lat1, lon1, lat2, lon2, meters = 30) => {
//   const toRad = (d) => (d * Math.PI) / 180;
//   const R = 6371000;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLon / 2) ** 2;
//   const d = 2 * R * Math.asin(Math.sqrt(a));
//   return d <= meters;
// };

// const isActiveMarker = (lat, lon, selectedPharmacy, activeRouteTarget) => {
//   const isSelected =
//     selectedPharmacy &&
//     isNear(lat, lon, selectedPharmacy.lat, selectedPharmacy.lon, 30);

//   const isRouting =
//     activeRouteTarget &&
//     isNear(lat, lon, activeRouteTarget.lat, activeRouteTarget.lon, 30);

//   return isSelected || isRouting;
// };

// function PharmacyMarkers({
//   features,
//   selectedPharmacy,
//   activeRouteTarget,
//   onRequestRoute,
// }) {
//   const markerInstances = useRef([]);
//   const clusterRef = useRef();
//   const [ready, setReady] = useState(false);

//   useEffect(() => addPulseWaveStyle(), []);

//   useEffect(() => {
//     if (!features) return;
//     const timer = setTimeout(() => setReady(true), 200);
//     return () => clearTimeout(timer);
//   }, [features]);

//   useEffect(() => {
//     if (!selectedPharmacy && !activeRouteTarget) return;
//     if (!ready) return;

//     const target = activeRouteTarget || selectedPharmacy;
//     if (!target) return;

//     const found = markerInstances.current.find((m) =>
//       isNear(m.lat, m.lon, target.lat, target.lon, 30)
//     );

//     if (!found?.instance) return;

//     const marker = found.instance;
//     const map = marker._map;
//     const clusterLayer = clusterRef.current;

//     if (!map) return;

//     const flyAndOpen = () => {
//       const targetZoom = Math.max(map.getZoom(), 18);
//       map.flyTo(marker.getLatLng(), targetZoom, { duration: 0.8 });

//       map.once("moveend", () => {
//         const parent = marker.__parent;
//         if (parent && parent.spiderfy) parent.spiderfy();

//         setTimeout(() => {
//           marker.openPopup();
//         }, 150);
//       });
//     };

//     if (clusterLayer?.zoomToShowLayer) {
//       clusterLayer.zoomToShowLayer(marker, flyAndOpen);
//     } else {
//       flyAndOpen();
//     }
//   }, [selectedPharmacy, activeRouteTarget, ready]);

//   if (!features?.features?.length) return null;

//   markerInstances.current = [];

//   return (
//     <MarkerClusterGroup
//       ref={clusterRef}
//       chunkedLoading
//       chunkDelay={50}
//       showCoverageOnHover={false}
//       spiderfyOnEveryZoom
//       spiderfyOnMaxZoom
//       disableClusteringAtZoom={18}
//       maxClusterRadius={40}
//       zoomToBoundsOnClick={false}
//       iconCreateFunction={(cluster) =>
//         L.divIcon({
//           html: `<div style="background:#ff4d4d;color:#fff;border-radius:50%;
//                   width:32px;height:32px;display:flex;align-items:center;
//                   justify-content:center;font-weight:700;">
//                    ${cluster.getChildCount()}
//                  </div>`,
//           className: "cluster-icon",
//           iconSize: [32, 32],
//         })
//       }
//     >
//       {features.features.map((f, i) => {
//         const [lon, lat] = f.geometry.coordinates;
//         const p = f.properties;

//         const selected = isActiveMarker(
//           lat,
//           lon,
//           selectedPharmacy,
//           activeRouteTarget
//         );

//         return (
//           <Marker
//             key={`${p.name || "pharmacy"}-${lat}-${lon}-${i}`}
//             position={[lat, lon]}
//             icon={createPharmacyIcon(selected)}
//             eventHandlers={{
//               add: (e) =>
//                 markerInstances.current.push({
//                   lat,
//                   lon,
//                   instance: e.target,
//                 }),
//             }}
//           >
//             <Popup autoPan autoClose>
//               <div style={{ minWidth: 230, lineHeight: 1.5 }}>
//                 <b style={{ color: "#0d6efd" }}>{p.name}</b>
//                 <br />
//                 📍 {p.address ?? "Không có địa chỉ"}
//                 <br />
//                 ☎ {p.phone ?? "Không có"}
//                 <br />
//                 ⭐ {p.rating ?? "Chưa có"}
//                 <br />
//                 🏙️ {p.province ?? ""} {p.district ? ", " + p.district : ""}

//                 <div style={{ marginTop: 10 }}>
//                   <button
//                     type="button"
//                     onClick={() =>
//                       onRequestRoute?.({
//                         name: p.name,
//                         address: p.address,
//                         lat,
//                         lon,
//                         province: p.province,
//                         district: p.district,
//                         phone: p.phone,
//                         rating: p.rating,
//                       })
//                     }
//                     style={{
//                       width: "100%",
//                       padding: "8px 12px",
//                       borderRadius: "10px",
//                       border: "none",
//                       background: "#2563eb",
//                       color: "#fff",
//                       fontWeight: 600,
//                       cursor: "pointer",
//                     }}
//                   >
//                     🧭 Chỉ đường đến đây
//                   </button>
//                 </div>
//               </div>
//             </Popup>
//           </Marker>
//         );
//       })}
//     </MarkerClusterGroup>
//   );
// }

// export default React.memo(PharmacyMarkers);


import React, { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

const createPharmacyIcon = (selected = false) =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${selected ? `<div class="pulse-wave"></div>` : ""}
        <div style="
          background: ${
            selected
              ? "linear-gradient(135deg, #00e5ff, #6200ea, #ff4081)"
              : "#2b8a3e"
          };
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

const isNear = (lat1, lon1, lat2, lon2, meters = 30) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Number(lat1))) *
      Math.cos(toRad(Number(lat2))) *
      Math.sin(dLon / 2) ** 2;

  const d = 2 * R * Math.asin(Math.sqrt(a));

  return d <= meters;
};

const isActiveMarker = (lat, lon, selectedPharmacy, activeRouteTarget) => {
  const selectedLat = Number(selectedPharmacy?.lat);
  const selectedLon = Number(selectedPharmacy?.lon);

  const routeLat = Number(activeRouteTarget?.lat);
  const routeLon = Number(activeRouteTarget?.lon);

  const isSelected =
    selectedPharmacy &&
    Number.isFinite(selectedLat) &&
    Number.isFinite(selectedLon) &&
    isNear(lat, lon, selectedLat, selectedLon, 30);

  const isRouting =
    activeRouteTarget &&
    Number.isFinite(routeLat) &&
    Number.isFinite(routeLon) &&
    isNear(lat, lon, routeLat, routeLon, 30);

  return isSelected || isRouting;
};

function normalizeFeature(f, i) {
  const coords = f?.geometry?.coordinates;

  if (!Array.isArray(coords) || coords.length < 2) return null;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const p = f.properties || {};

  return {
    id: `${p.id || p.name || "pharmacy"}-${lat}-${lon}-${i}`,
    lat,
    lon,
    properties: p,
  };
}

function PharmacyMarkers({
  features,
  selectedPharmacy,
  activeRouteTarget,
  onRequestRoute,
}) {
  const markerInstances = useRef([]);
  const clusterRef = useRef(null);
  const [ready, setReady] = useState(false);

  const pharmacies = useMemo(() => {
    const list = features?.features || [];
    return list.map(normalizeFeature).filter(Boolean);
  }, [features]);

  useEffect(() => {
    addPulseWaveStyle();
  }, []);

  useEffect(() => {
    markerInstances.current = [];
    setReady(false);

    if (!pharmacies.length) return;

    const timer = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(timer);
  }, [pharmacies]);

  useEffect(() => {
    if (!selectedPharmacy && !activeRouteTarget) return;
    if (!ready) return;

    const target = activeRouteTarget || selectedPharmacy;
    if (!target) return;

    const targetLat = Number(target.lat);
    const targetLon = Number(target.lon);

    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLon)) return;

    const found = markerInstances.current.find((m) =>
      isNear(m.lat, m.lon, targetLat, targetLon, 30)
    );

    if (!found?.instance) return;

    const marker = found.instance;
    const map = marker._map;
    const clusterLayer = clusterRef.current;

    if (!map) return;

    const flyAndOpen = () => {
      const targetZoom = Math.max(map.getZoom(), 18);
      map.flyTo(marker.getLatLng(), targetZoom, { duration: 0.8 });

      map.once("moveend", () => {
        const parent = marker.__parent;
        if (parent && parent.spiderfy) parent.spiderfy();

        setTimeout(() => {
          marker.openPopup();
        }, 150);
      });
    };

    if (clusterLayer?.zoomToShowLayer) {
      clusterLayer.zoomToShowLayer(marker, flyAndOpen);
    } else {
      flyAndOpen();
    }
  }, [selectedPharmacy, activeRouteTarget, ready]);

  if (!pharmacies.length) return null;

  return (
    <MarkerClusterGroup
      ref={clusterRef}
      chunkedLoading
      chunkDelay={50}
      showCoverageOnHover={false}
      spiderfyOnEveryZoom
      spiderfyOnMaxZoom
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
      {pharmacies.map(({ id, lat, lon, properties: p }) => {
        const selected = isActiveMarker(
          lat,
          lon,
          selectedPharmacy,
          activeRouteTarget
        );

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
            <Popup autoPan autoClose>
              <div style={{ minWidth: 230, lineHeight: 1.5 }}>
                <b style={{ color: "#0d6efd" }}>
                  {p.name || "Nhà thuốc chưa có tên"}
                </b>
                <br />
                📍 {p.address ?? "Không có địa chỉ"}
                <br />
                ☎ {p.phone ?? "Không có"}
                <br />
                ⭐ {p.rating ?? "Chưa có"}
                <br />
                🏙️ {p.province ?? ""} {p.district ? ", " + p.district : ""}

                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() =>
                      onRequestRoute?.({
                        name: p.name,
                        address: p.address,
                        lat,
                        lon,
                        province: p.province,
                        district: p.district,
                        phone: p.phone,
                        rating: p.rating,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🧭 Chỉ đường đến đây
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}

export default React.memo(PharmacyMarkers);