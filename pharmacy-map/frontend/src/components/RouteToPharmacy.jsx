import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "./route-panel.css";

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

function getStepIcon(text = "") {
  const t = text.toLowerCase();

  if (t.includes("right")) return "↱";
  if (t.includes("left")) return "↰";
  if (t.includes("destination") || t.includes("arrived")) return "⚑";
  if (t.includes("roundabout")) return "⟳";
  return "↑";
}

function formatInstruction(text = "") {
  return text
    .replace("Head", "Đi")
    .replace("Continue", "Đi tiếp")
    .replace("Turn right", "Rẽ phải")
    .replace("Turn left", "Rẽ trái")
    .replace("Slight right", "Chếch phải")
    .replace("Slight left", "Chếch trái")
    .replace("Make a U-turn", "Quay đầu")
    .replace("Roundabout", "Vào vòng xuyến")
    .replace("Destination", "Điểm đến")
    .replace("You have arrived at your destination", "Bạn đã đến nơi")
    .replace("north", "hướng Bắc")
    .replace("south", "hướng Nam")
    .replace("east", "hướng Đông")
    .replace("west", "hướng Tây")
    .replace("onto", "vào")
    .replace("on the right", "ở bên phải")
    .replace("on the left", "ở bên trái")
    .replace("stay on", "đi tiếp trên");
}

export default function RouteToPharmacy({
  userLocation,
  selectedPharmacy,
  onClearRoute,
}) {
  const map = useMap();
  const routingRef = useRef(null);
  const stepsRef = useRef(null);
  const panelRef = useRef(null);

  const [routeInfo, setRouteInfo] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!panelRef.current) return;
    L.DomEvent.disableClickPropagation(panelRef.current);
  }, []);

  useEffect(() => {
    if (!stepsRef.current) return;
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
        styles: [{ color: "#2563eb", weight: 5, opacity: 0.95 }],
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
          icon: getStepIcon(item.text),
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

  const handleClearRoute = () => {
    if (routingRef.current) {
      try {
        map.removeControl(routingRef.current);
      } catch (err) {
        console.warn("clear routing control warning:", err);
      }
      routingRef.current = null;
    }

    setRouteInfo(null);
    setCollapsed(false);
    onClearRoute?.();
  };

  if (!userLocation || !selectedPharmacy || !routeInfo) return null;

  return (
    <div
      ref={panelRef}
      className={`route-panel ${collapsed ? "collapsed" : ""}`}
    >
      <div className="route-panel__header">
        <div className="route-panel__header-left">
          <div className="route-panel__label">Chỉ đường</div>
          <div className="route-panel__title">{routeInfo.destination}</div>
        </div>

        <div className="route-panel__actions">
          <button
            className="route-panel__icon-btn"
            onClick={handleClearRoute}
            title="Tắt chỉ đường"
            type="button"
          >
            ✕
          </button>

          <button
            className="route-panel__icon-btn"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
            type="button"
          >
            {collapsed ? "↗" : "↙"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {routeInfo.summary && (
            <div className="route-panel__summary">
              <div className="route-chip">
                <span className="route-chip__icon">⌁</span>
                <span>{routeInfo.summary.distance}</span>
              </div>

              <div className="route-chip">
                <span className="route-chip__icon">◷</span>
                <span>{routeInfo.summary.time}</span>
              </div>
            </div>
          )}

          {routeInfo.error ? (
            <div className="route-panel__error">{routeInfo.error}</div>
          ) : (
            <>
              <div ref={stepsRef} className="route-panel__steps">
                {routeInfo.steps.map((step, index) => (
                  <div key={step.id} className="route-step">
                    <div className="route-step__index">{index + 1}</div>
                    <div className="route-step__icon">{step.icon}</div>
                    <div className="route-step__content">
                      <div className="route-step__text">{step.text}</div>
                      <div className="route-step__distance">{step.distance}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="route-panel__footer">
                <button
                  type="button"
                  className="route-panel__footer-btn route-panel__footer-btn--light"
                >
                  ⌖ Vị trí hiện tại
                </button>

                <button
                  type="button"
                  onClick={handleClearRoute}
                  className="route-panel__footer-btn route-panel__footer-btn--danger"
                >
                  🗑 Tắt chỉ đường
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}