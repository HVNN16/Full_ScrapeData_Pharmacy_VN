import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatLayer({ features = [], enabled = true }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !enabled || features.length === 0) return;

    const heatPoints = features
      .map((f) => {
        const [lon, lat] = f.geometry?.coordinates || [];
        const rating = f.properties?.rating || 0;
        if (!lat || !lon) return null;
        return [lat, lon, rating / 5];
      })
      .filter(Boolean);

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 18,
      maxZoom: 12,
      minOpacity: 0.3,
      gradient: {
        0.2: "#4ade80",
        0.4: "#facc15",
        0.6: "#fb923c",
        0.8: "#f87171",
        1.0: "#dc2626",
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, features, enabled]);

  return null;
}