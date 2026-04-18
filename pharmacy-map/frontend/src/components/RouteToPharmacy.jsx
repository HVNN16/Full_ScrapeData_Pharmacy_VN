// // src/components/RouteToPharmacy.jsx
// import { useEffect } from "react";
// import { useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet-routing-machine";
// import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// export default function RouteToPharmacy({ userLocation, selectedPharmacy }) {
//   const map = useMap();

//   useEffect(() => {
//     // 🧩 Nếu map hoặc dữ liệu chưa sẵn sàng thì thoát
//     if (!map || !map._loaded || !userLocation || !selectedPharmacy) return;

//     // 🧹 Xóa route cũ
//     map.eachLayer((layer) => {
//       if (layer._container?.classList?.contains("leaflet-routing-container")) {
//         map.removeControl(layer);
//       }
//     });

//     // 🚗 Tạo tuyến đường mới (tắt hoàn toàn auto-zoom để tránh lỗi getZoom)
//     const routingControl = L.Routing.control({
//       waypoints: [
//         L.latLng(userLocation.lat, userLocation.lon),
//         L.latLng(selectedPharmacy.lat, selectedPharmacy.lon),
//       ],
//       lineOptions: {
//         styles: [{ color: "#007bff", weight: 5, opacity: 0.8 }],
//       },
//       routeWhileDragging: false,
//       addWaypoints: false,
//       show: false,
//       fitSelectedRoutes: false, // ✅ KHÔNG cho auto-zoom
//       autoRoute: true,
//       createMarker: () => null,
//       language: "en",
//     }).addTo(map);

//     // 📏 Khi có kết quả
//     routingControl.on("routesfound", (e) => {
//       const route = e.routes[0];
//       const distance = (route.summary.totalDistance / 1000).toFixed(2);
//       const time = Math.round(route.summary.totalTime / 60);

//       const end = route.waypoints[1].latLng;

//       // ✨ Thay vì flyTo, chỉ panTo an toàn hơn
//       if (map && map.getCenter) {
//         map.panTo(end, { animate: true });
//       }

//       L.popup()
//         .setLatLng(end)
//         .setContent(
//           `<b>🚗 Gợi ý đường đi</b><br/>
//            📏 Khoảng cách: <b>${distance} km</b><br/>
//            ⏱️ Thời gian: <b>${time} phút</b>`
//         )
//         .openOn(map);
//     });

//     // 🧹 Cleanup
//     return () => {
//       try {
//         map.removeControl(routingControl);
//       } catch (err) {
//         console.warn("⚠️ routingControl cleanup error:", err.message);
//       }
//     };
//   }, [map, userLocation, selectedPharmacy]);

//   return null;
// }

import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "./route-panel.css";

function formatInstruction(text = "") {
  return text
    .replace("Head", "Đi")
    .replace("north", "về hướng Bắc")
    .replace("south", "về hướng Nam")
    .replace("east", "về hướng Đông")
    .replace("west", "về hướng Tây")
    .replace("Turn right", "Rẽ phải")
    .replace("Turn left", "Rẽ trái")
    .replace("Continue", "Tiếp tục")
    .replace("You have arrived at your destination", "Bạn đã đến nơi")
    .replace("Destination", "Điểm đến");
}

function formatDistance(meters = 0) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatTime(seconds = 0) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} giờ ${m} phút`;
}

export default function RouteToPharmacy({ userLocation, selectedPharmacy }) {
  const map = useMap();
  const routingRef = useRef(null);
  const stepsRef = useRef(null);
  const panelRef = useRef(null);

  const [routeInfo, setRouteInfo] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!panelRef.current) return;

    // chặn click/wheel của map khi chuột đang ở trên panel
    L.DomEvent.disableClickPropagation(panelRef.current);
  }, []);

  useEffect(() => {
    if (!stepsRef.current) return;

    // cho phép panel cuộn riêng, không zoom map
    L.DomEvent.disableScrollPropagation(stepsRef.current);
    L.DomEvent.disableClickPropagation(stepsRef.current);
  }, [routeInfo, collapsed]);

  useEffect(() => {
    if (!map) return;

    if (routingRef.current) {
      try {
        map.removeControl(routingRef.current);
      } catch (err) {
        console.warn("remove routing control warning:", err);
      }
      routingRef.current = null;
    }

    setRouteInfo(null);

    if (!userLocation || !selectedPharmacy) return;

    const control = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lon),
        L.latLng(selectedPharmacy.lat, selectedPharmacy.lon),
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      collapsible: false,
      createMarker: () => null,
      lineOptions: {
        styles: [{ color: "#2563eb", weight: 5, opacity: 0.85 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
    });

    control.on("routesfound", (e) => {
      const route = e.routes?.[0];
      if (!route) return;

      const steps =
        route.instructions?.map((item, index) => ({
          id: index,
          text: formatInstruction(item.text),
          distance: formatDistance(item.distance || 0),
        })) || [];

      setRouteInfo({
        summary: {
          distance: formatDistance(route.summary?.totalDistance || 0),
          time: formatTime(route.summary?.totalTime || 0),
        },
        steps,
        destination:
          selectedPharmacy?.name ||
          selectedPharmacy?.address ||
          "Tuyến đường đến nhà thuốc",
      });
    });

    control.on("routingerror", (e) => {
      console.error("Routing error:", e);
      setRouteInfo({
        summary: null,
        steps: [],
        destination: "Không thể tính tuyến đường",
        error:
          "Không thể tải chỉ đường lúc này. Vui lòng thử lại sau hoặc chọn nhà thuốc khác.",
      });
    });

    try {
      control.addTo(map);
      routingRef.current = control;
    } catch (err) {
      console.error("Routing add error:", err);
    }

    return () => {
      if (routingRef.current) {
        try {
          map.removeControl(routingRef.current);
        } catch (err) {
          console.warn("cleanup routing control warning:", err);
        }
        routingRef.current = null;
      }
    };
  }, [map, userLocation, selectedPharmacy]);

  if (!userLocation || !selectedPharmacy || !routeInfo) return null;

  return (
    <div
      ref={panelRef}
      className={`route-panel ${collapsed ? "collapsed" : ""}`}
    >
      <div className="route-panel__header">
        <div>
          <div className="route-panel__label">Chỉ đường</div>
          <div className="route-panel__title">{routeInfo.destination}</div>
        </div>

        <div className="route-panel__actions">
          <button
            className="route-panel__btn"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
            type="button"
          >
            {collapsed ? "⤢" : "—"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {routeInfo.summary && (
            <div className="route-panel__summary">
              <div className="route-chip">📏 {routeInfo.summary.distance}</div>
              <div className="route-chip">⏱ {routeInfo.summary.time}</div>
            </div>
          )}

          {routeInfo.error ? (
            <div className="route-panel__error">{routeInfo.error}</div>
          ) : (
            <div ref={stepsRef} className="route-panel__steps">
              {routeInfo.steps.map((step, index) => (
                <div key={step.id} className="route-step">
                  <div className="route-step__index">{index + 1}</div>
                  <div className="route-step__content">
                    <div className="route-step__text">{step.text}</div>
                    <div className="route-step__distance">{step.distance}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}