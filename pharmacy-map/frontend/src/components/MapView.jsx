import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Circle,
  Marker,
  Popup,
  FeatureGroup,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import { fetchGeoJSON } from "../api";
import PharmacyMarkers from "./PharmacyMarkers";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import provinceCenters from "../data/provinceCenters";
import districtCenters from "../data/districtCenters";
import L from "leaflet";
import RouteToPharmacy from "./RouteToPharmacy";
import HeatLayer from "./HeatLayer";

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
      (f) =>
        (f.properties?.district || "").toLowerCase() === district.toLowerCase()
    )
    .map((f) => {
      const [lon, lat] = f.geometry?.coordinates || [];
      return typeof lat === "number" && typeof lon === "number"
        ? { lat, lon }
        : null;
    })
    .filter(Boolean);

  if (!points.length) return null;

  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  return [lat, lon];
}

function getLayerCoords(layer) {
  if (!layer?.getLatLngs) return [];

  const raw = layer.getLatLngs();
  if (!Array.isArray(raw)) return [];

  let latlngs = raw;

  while (Array.isArray(latlngs[0])) {
    latlngs = latlngs[0];
  }

  return latlngs
    .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
    .map((p) => [p.lng, p.lat]);
}

function FlyToSelected({ selectedPharmacy }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPharmacy) return;
    map.flyTo([selectedPharmacy.lat, selectedPharmacy.lon], 16, {
      duration: 1.2,
    });
  }, [selectedPharmacy, map]);

  return null;
}

function FlyToArea({ province, district, features, disabled }) {
  const map = useMap();
  const centerVN = useMemo(() => [16.05, 108.2], []);
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (disabled) return;

    const nextKey = `${province || ""}__${district || ""}`;
    if (lastKeyRef.current === nextKey) return;
    lastKeyRef.current = nextKey;

    if (district) {
      const normD = normalizeName(district);
      const dCenter =
        districtCenters[normD] ||
        districtCenters[normD.replace("Thành phố", "Thành Phố")] ||
        districtCenters[normD.replace("Thành Phố", "Thành phố")];

      if (dCenter) {
        map.flyTo(dCenter, 13.5, { duration: 1.2 });
        return;
      }

      const centroid = computeDistrictCentroid(features, district);
      if (centroid) {
        map.flyTo(centroid, 13.5, { duration: 1.2 });
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
        map.flyTo(pCenter, 8.5, { duration: 1.1 });
        return;
      }
    }

    map.flyTo(centerVN, 6, { duration: 1.1 });
  }, [province, district, map, centerVN, features, disabled]);

  return null;
}

function FlyToUser({ userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation) return;
    map.flyTo([userLocation.lat, userLocation.lon], 13, { duration: 1.2 });
  }, [userLocation, map]);

  return null;
}

function MapViewportWatcher({ onViewportChange, disabled }) {
  const map = useMap();

  useEffect(() => {
    if (disabled) return;

    let timer = null;

    const update = () => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        const bounds = map.getBounds();
        const bbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ].join(",");

        onViewportChange({ bbox });
      }, 300);
    };

    map.on("moveend", update);
    map.on("zoomend", update);
    update();

    return () => {
      clearTimeout(timer);
      map.off("moveend", update);
      map.off("zoomend", update);
    };
  }, [map, onViewportChange, disabled]);

  return null;
}

const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

function MapView({
  province,
  district,
  ratingMin,
  selectedPharmacy,
  userLocation,
  radiusKm,
  showHeatmap,
  onInitialLoaded,
  onVisibleCountChange,
}) {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [bbox, setBbox] = useState(null);
  const [routeTarget, setRouteTarget] = useState(null);
  const [polygonCoords, setPolygonCoords] = useState(null);

  const featureGroupRef = useRef(null);
  const hasReportedInitialLoad = useRef(false);

  const role = localStorage.getItem("role");
  const canDrawArea = role === "company" || role === "admin";

  const isUsingPolygon =
    Array.isArray(polygonCoords) && polygonCoords.length >= 3;

  const polygonParam = useMemo(() => {
    if (!isUsingPolygon) return undefined;

    return JSON.stringify({
      type: "Polygon",
      coordinates: [[...polygonCoords, polygonCoords[0]]],
    });
  }, [isUsingPolygon, polygonCoords]);

  useEffect(() => {
    const handleManualReload = () => setReloadKey(Date.now());
    window.addEventListener("reloadMap", handleManualReload);

    return () => {
      window.removeEventListener("reloadMap", handleManualReload);
    };
  }, []);

  useEffect(() => {
    if (selectedPharmacy) setRouteTarget(selectedPharmacy);
  }, [selectedPharmacy]);

  useEffect(() => {
    setFeatures(null);
    onVisibleCountChange?.(0);
  }, [province, district, ratingMin, onVisibleCountChange]);

  const handleViewportChange = useCallback(({ bbox }) => {
    setBbox((prev) => (prev === bbox ? prev : bbox));
  }, []);

  const handlePolygonCreated = useCallback((e) => {
    const layer = e.layer;
    const coords = getLayerCoords(layer);

    if (coords.length < 3) {
      alert("Vùng khảo sát cần ít nhất 3 điểm.");
      return;
    }

    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);
    }

    setPolygonCoords([...coords]);
    setReloadKey(Date.now());
  }, []);

  const handlePolygonEdited = useCallback((e) => {
    let editedCoords = null;

    e.layers.eachLayer((layer) => {
      editedCoords = getLayerCoords(layer);
    });

    if (editedCoords && editedCoords.length >= 3) {
      setPolygonCoords([...editedCoords]);
      setReloadKey(Date.now());
    }
  }, []);

  const handlePolygonDeleted = useCallback(() => {
    setPolygonCoords(null);
    setReloadKey(Date.now());
  }, []);

  const clearPolygon = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }

    setPolygonCoords(null);
    setReloadKey(Date.now());
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (!bbox && !isUsingPolygon) return;

        if (active) setLoading(true);

        const params = {
          province,
          district,
          rating_min: ratingMin || 0,
        };

        if (isUsingPolygon && polygonParam) {
          params.polygon = polygonParam;
        } else {
          params.bbox = bbox;
        }

        const data = await fetchGeoJSON(params);

        if (!active) return;

        setFeatures(data);

        onVisibleCountChange?.(
          Array.isArray(data?.features) ? data.features.length : 0
        );

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
  }, [
    province,
    district,
    ratingMin,
    bbox,
    reloadKey,
    isUsingPolygon,
    polygonParam,
    onInitialLoaded,
    onVisibleCountChange,
  ]);

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

      {canDrawArea && isUsingPolygon && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 92,
            zIndex: 9999,
            background: "rgba(255,255,255,0.96)",
            padding: "10px 12px",
            borderRadius: "12px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            width: 240,
            fontSize: 13,
          }}
        >
          <b>🧭 Vùng khảo sát</b>

          <div
            style={{
              marginTop: 6,
              padding: "6px",
              borderRadius: 6,
              background: "#eef7ff",
              color: "#0b63ce",
            }}
          >
            Đã chọn {polygonCoords.length} điểm.
          </div>

          <button
            onClick={clearPolygon}
            style={{
              marginTop: 8,
              width: "100%",
              border: "none",
              borderRadius: 8,
              padding: "8px",
              cursor: "pointer",
              background: "#dc3545",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Xoá vùng đang chọn
          </button>
        </div>
      )}

      <MapContainer
        center={[16.05, 108.2]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <MapViewportWatcher
          onViewportChange={handleViewportChange}
          disabled={isUsingPolygon}
        />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {canDrawArea && (
          <FeatureGroup
            ref={(group) => {
              if (group) featureGroupRef.current = group;
            }}
          >
            <EditControl
              position="topleft"
              onCreated={handlePolygonCreated}
              onEdited={handlePolygonEdited}
              onDeleted={handlePolygonDeleted}
              draw={{
                polygon: {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: {
                    color: "#2563eb",
                    weight: 3,
                    fillColor: "#2563eb",
                    fillOpacity: 0.18,
                  },
                },
                rectangle: {
                  shapeOptions: {
                    color: "#2563eb",
                    weight: 3,
                    fillColor: "#2563eb",
                    fillOpacity: 0.18,
                  },
                },
                circle: false,
                marker: false,
                polyline: false,
                circlemarker: false,
              }}
              edit={{
                edit: true,
                remove: true,
              }}
            />
          </FeatureGroup>
        )}

        <PharmacyMarkers
          features={features}
          selectedPharmacy={selectedPharmacy}
          activeRouteTarget={routeTarget}
          onRequestRoute={setRouteTarget}
        />

        <HeatLayer features={features?.features || []} enabled={showHeatmap} />

        <RouteToPharmacy
          userLocation={userLocation}
          selectedPharmacy={routeTarget}
          onClearRoute={() => setRouteTarget(null)}
        />

        <FlyToSelected selectedPharmacy={selectedPharmacy} />

        <FlyToArea
          province={province}
          district={district}
          features={features}
          disabled={isUsingPolygon}
        />

        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lon]}
              icon={userIcon}
            >
              <Popup>
                <b>📍 Vị trí của bạn</b>
                <br />
                Bán kính hiển thị: {radiusKm} km
              </Popup>
            </Marker>

            <Circle
              center={[userLocation.lat, userLocation.lon]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "#007bff",
                fillColor: "#007bff",
                fillOpacity: 0.15,
              }}
            />

            <FlyToUser userLocation={userLocation} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;