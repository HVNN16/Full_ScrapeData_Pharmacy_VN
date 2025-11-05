// src/components/RouteToPharmacy.jsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

export default function RouteToPharmacy({ userLocation, selectedPharmacy }) {
  const map = useMap();

  useEffect(() => {
    // 🧩 Nếu map hoặc dữ liệu chưa sẵn sàng thì thoát
    if (!map || !map._loaded || !userLocation || !selectedPharmacy) return;

    // 🧹 Xóa route cũ
    map.eachLayer((layer) => {
      if (layer._container?.classList?.contains("leaflet-routing-container")) {
        map.removeControl(layer);
      }
    });

    // 🚗 Tạo tuyến đường mới (tắt hoàn toàn auto-zoom để tránh lỗi getZoom)
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lon),
        L.latLng(selectedPharmacy.lat, selectedPharmacy.lon),
      ],
      lineOptions: {
        styles: [{ color: "#007bff", weight: 5, opacity: 0.8 }],
      },
      routeWhileDragging: false,
      addWaypoints: false,
      show: false,
      fitSelectedRoutes: false, // ✅ KHÔNG cho auto-zoom
      autoRoute: true,
      createMarker: () => null,
      language: "en",
    }).addTo(map);

    // 📏 Khi có kết quả
    routingControl.on("routesfound", (e) => {
      const route = e.routes[0];
      const distance = (route.summary.totalDistance / 1000).toFixed(2);
      const time = Math.round(route.summary.totalTime / 60);

      const end = route.waypoints[1].latLng;

      // ✨ Thay vì flyTo, chỉ panTo an toàn hơn
      if (map && map.getCenter) {
        map.panTo(end, { animate: true });
      }

      L.popup()
        .setLatLng(end)
        .setContent(
          `<b>🚗 Gợi ý đường đi</b><br/>
           📏 Khoảng cách: <b>${distance} km</b><br/>
           ⏱️ Thời gian: <b>${time} phút</b>`
        )
        .openOn(map);
    });

    // 🧹 Cleanup
    return () => {
      try {
        map.removeControl(routingControl);
      } catch (err) {
        console.warn("⚠️ routingControl cleanup error:", err.message);
      }
    };
  }, [map, userLocation, selectedPharmacy]);

  return null;
}
