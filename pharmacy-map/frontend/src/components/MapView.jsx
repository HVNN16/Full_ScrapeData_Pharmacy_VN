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
import {
  fetchGeoJSON,
  createSurveyArea,
  getMySurveyAreas,
  deleteSurveyArea,
  updateSurveyArea,
  getAdminSurveyUsers,
  getAdminSurveyAreasByUser,
  adminUpdateSurveyArea,
  adminDeleteSurveyArea,
} from "../api";
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

function coordsToLatLngs(coords) {
  if (!Array.isArray(coords)) return [];
  return coords.map(([lng, lat]) => [lat, lng]);
}

function coordsToPolygonObject(coords) {
  if (!Array.isArray(coords) || coords.length < 3) return null;

  return {
    type: "Polygon",
    coordinates: [[...coords, coords[0]]],
  };
}

function extractPolygonCoords(area) {
  const polygon = area?.polygon;
  const coords = polygon?.coordinates?.[0];

  if (!Array.isArray(coords) || coords.length < 4) return null;

  return coords
    .slice(0, -1)
    .map((p) => [Number(p[0]), Number(p[1])])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
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

function FitToPolygon({ polygonCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(polygonCoords) || polygonCoords.length < 3) return;

    map.fitBounds(coordsToLatLngs(polygonCoords), {
      padding: [45, 45],
      maxZoom: 15,
    });
  }, [polygonCoords, map]);

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
      }, 350);
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
  onFeaturesChange,
}) {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [bbox, setBbox] = useState(null);
  const [routeTarget, setRouteTarget] = useState(null);
  const [polygonCoords, setPolygonCoords] = useState(null);

  const [savedAreas, setSavedAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [areaName, setAreaName] = useState("");

  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [showPanel, setShowPanel] = useState(false);
  const [toast, setToast] = useState(null);
  const [panelPos, setPanelPos] = useState({ x: 92, y: 14 });

  const dragRef = useRef({
    dragging: false,
    offsetX: 0,
    offsetY: 0,
  });

  const featureGroupRef = useRef(null);
  const hasReportedInitialLoad = useRef(false);

  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";
  const canDrawArea = role === "company" || role === "admin";

  const isUsingPolygon =
    Array.isArray(polygonCoords) && polygonCoords.length >= 3;

  const polygonObject = useMemo(() => {
    return coordsToPolygonObject(polygonCoords);
  }, [polygonCoords]);

  const polygonParam = useMemo(() => {
    if (!polygonObject) return undefined;
    return JSON.stringify(polygonObject);
  }, [polygonObject]);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2200);
  }, []);

  const loadSavedAreas = useCallback(async () => {
    if (!canDrawArea) return;

    try {
      const data = await getMySurveyAreas();
      setSavedAreas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi load vùng đã lưu:", err);
      showToast("Không tải được vùng đã lưu", "error");
    }
  }, [canDrawArea, showToast]);

  const reloadAreasAfterChange = useCallback(async () => {
    if (isAdmin && selectedUserId) {
      const data = await getAdminSurveyAreasByUser(selectedUserId);
      setSavedAreas(Array.isArray(data) ? data : []);
    } else {
      await loadSavedAreas();
    }
  }, [isAdmin, selectedUserId, loadSavedAreas]);

  useEffect(() => {
    loadSavedAreas();
  }, [loadSavedAreas]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadAdminUsers = async () => {
      try {
        const data = await getAdminSurveyUsers();
        setAdminUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Lỗi load danh sách user:", err);
        showToast("Không tải được danh sách user", "error");
      }
    };

    loadAdminUsers();
  }, [isAdmin, showToast]);

  const handleSelectUser = async (userId) => {
    setSelectedUserId(userId);
    setSelectedAreaId("");
    setAreaName("");

    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }

    setPolygonCoords(null);
    setFeatures(null);
    onFeaturesChange?.([]);
    onVisibleCountChange?.(0);
    setReloadKey(Date.now());

    if (!userId) {
      await loadSavedAreas();
      return;
    }

    try {
      const data = await getAdminSurveyAreasByUser(userId);
      setSavedAreas(Array.isArray(data) ? data : []);
      showToast("Đã tải vùng của user", "success");
    } catch (err) {
      console.error("Lỗi load vùng theo user:", err);
      showToast("Không tải được vùng của user", "error");
    }
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragRef.current.dragging) return;

      const nextX = e.clientX - dragRef.current.offsetX;
      const nextY = e.clientY - dragRef.current.offsetY;

      setPanelPos({
        x: Math.max(8, Math.min(window.innerWidth - 320, nextX)),
        y: Math.max(8, Math.min(window.innerHeight - 220, nextY)),
      });
    };

    const onMouseUp = () => {
      dragRef.current.dragging = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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
    onFeaturesChange?.([]);
    onVisibleCountChange?.(0);
  }, [province, district, ratingMin, onVisibleCountChange, onFeaturesChange]);

  const handleViewportChange = useCallback(({ bbox }) => {
    setBbox((prev) => (prev === bbox ? prev : bbox));
  }, []);

  const addEditablePolygonToMap = useCallback((coords) => {
    if (!featureGroupRef.current) return;

    featureGroupRef.current.clearLayers();

    const layer = L.polygon(coordsToLatLngs(coords), {
      color: "#2563eb",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 0.22,
      dashArray: "6,6",
    });

    featureGroupRef.current.addLayer(layer);
  }, []);

  const clearPolygon = useCallback(() => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }

    setPolygonCoords(null);
    setSelectedAreaId("");
    setAreaName("");
    setFeatures(null);
    onFeaturesChange?.([]);
    onVisibleCountChange?.(0);
    setReloadKey(Date.now());
  }, [onFeaturesChange, onVisibleCountChange]);

  const handlePolygonCreated = useCallback(
    (e) => {
      const layer = e.layer;
      const coords = getLayerCoords(layer);

      if (coords.length < 3) {
        showToast("Vùng khảo sát cần ít nhất 3 điểm", "error");
        return;
      }

      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
        featureGroupRef.current.addLayer(layer);
      }

      setShowPanel(true);
      setSelectedAreaId("");
      setAreaName("");
      setPolygonCoords([...coords]);
      setFeatures(null);
      onFeaturesChange?.([]);
      onVisibleCountChange?.(0);
      setReloadKey(Date.now());
      showToast("Đã tạo vùng khảo sát", "success");
    },
    [showToast, onFeaturesChange, onVisibleCountChange]
  );

  const handlePolygonEdited = useCallback(
    async (e) => {
      let editedCoords = null;

      e.layers.eachLayer((layer) => {
        editedCoords = getLayerCoords(layer);
      });

      if (!editedCoords || editedCoords.length < 3) {
        showToast("Vùng sau khi sửa không hợp lệ", "error");
        return;
      }

      setPolygonCoords([...editedCoords]);
      setFeatures(null);
      onFeaturesChange?.([]);
      onVisibleCountChange?.(0);
      setReloadKey(Date.now());

      if (selectedAreaId) {
        try {
          const nextPolygon = coordsToPolygonObject(editedCoords);

          if (isAdmin && selectedUserId) {
            await adminUpdateSurveyArea(selectedAreaId, {
              name: areaName || "Vùng khảo sát",
              polygon: nextPolygon,
            });
          } else {
            await updateSurveyArea(selectedAreaId, {
              name: areaName || "Vùng khảo sát",
              polygon: nextPolygon,
            });
          }

          await reloadAreasAfterChange();
          showToast("Đã tự động lưu vùng sau khi sửa", "success");
        } catch (err) {
          console.error("Lỗi auto save vùng:", err);
          showToast("Không thể tự lưu vùng sau khi sửa", "error");
        }
      } else {
        showToast("Đã sửa vùng tạm thời", "success");
      }
    },
    [
      selectedAreaId,
      areaName,
      isAdmin,
      selectedUserId,
      reloadAreasAfterChange,
      showToast,
      onFeaturesChange,
      onVisibleCountChange,
    ]
  );

  const handlePolygonDeleted = useCallback(() => {
    setPolygonCoords(null);
    setSelectedAreaId("");
    setAreaName("");
    setFeatures(null);
    onFeaturesChange?.([]);
    onVisibleCountChange?.(0);
    setReloadKey(Date.now());
    showToast("Đã xoá vùng đang chọn", "success");
  }, [showToast, onFeaturesChange, onVisibleCountChange]);

  const handleSaveArea = async () => {
    if (!polygonObject) {
      showToast("Bạn chưa chọn vùng khảo sát", "error");
      return;
    }

    const finalName = areaName.trim();
    if (!finalName) {
      showToast("Vui lòng nhập tên vùng trước khi lưu", "error");
      return;
    }

    try {
      if (selectedAreaId) {
        if (isAdmin && selectedUserId) {
          await adminUpdateSurveyArea(selectedAreaId, {
            name: finalName,
            polygon: polygonObject,
          });
        } else {
          await updateSurveyArea(selectedAreaId, {
            name: finalName,
            polygon: polygonObject,
          });
        }

        showToast("Đã cập nhật vùng đã lưu", "success");
      } else {
        const saved = await createSurveyArea({
          name: finalName,
          polygon: polygonObject,
        });

        setSelectedAreaId(String(saved.id));
        showToast("Đã lưu vùng khảo sát", "success");
      }

      await reloadAreasAfterChange();
    } catch (err) {
      console.error("Lỗi lưu vùng:", err);
      showToast("Lưu vùng thất bại", "error");
    }
  };

  const handleSelectSavedArea = (id) => {
    setSelectedAreaId(id);

    if (!id) {
      clearPolygon();
      return;
    }

    const area = savedAreas.find((item) => String(item.id) === String(id));
    const coords = extractPolygonCoords(area);

    if (!coords || coords.length < 3) {
      showToast("Vùng đã lưu không hợp lệ", "error");
      return;
    }

    setShowPanel(true);
    setAreaName(area.name || "");
    setPolygonCoords(coords);
    setFeatures(null);
    onFeaturesChange?.([]);
    onVisibleCountChange?.(0);
    addEditablePolygonToMap(coords);
    setReloadKey(Date.now());
    showToast(`Đã mở vùng: ${area.name}`, "success");
  };

  const handleDeleteSavedArea = async () => {
    if (!selectedAreaId) {
      showToast("Bạn chưa chọn vùng đã lưu", "error");
      return;
    }

    const ok = window.confirm("Bạn có chắc muốn xoá vùng này?");
    if (!ok) return;

    try {
      if (isAdmin && selectedUserId) {
        await adminDeleteSurveyArea(selectedAreaId);
      } else {
        await deleteSurveyArea(selectedAreaId);
      }

      setSavedAreas((prev) =>
        prev.filter((item) => String(item.id) !== String(selectedAreaId))
      );

      clearPolygon();
      showToast("Đã xoá vùng đã lưu", "success");
    } catch (err) {
      console.error("Lỗi xoá vùng:", err);
      showToast("Xoá vùng thất bại", "error");
    }
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (!bbox && !isUsingPolygon) return;

        if (active) {
          setLoading(true);
          // setFeatures(null);
          // onFeaturesChange?.([]);
          // onVisibleCountChange?.(0);
        }

        // const params = {
        //   province,
        //   district,
        //   rating_min: ratingMin || 0,
        // };

        // if (isUsingPolygon && polygonParam) {
        //   params.polygon = polygonParam;
        // } else {
        //   params.bbox = bbox;
        // }
        const params = {
  province,
  district,
  rating_min: ratingMin || 0,
};

if (isUsingPolygon && polygonParam) {
  params.polygon = polygonParam;
  params.limit = 8000;
} else {
  params.bbox = bbox;

  if (!province && !district && !ratingMin) {
    params.mode = "overview";
    params.limit = 20000;
  } else {
    params.limit = 20000;
  }
}

        const data = await fetchGeoJSON(params);

        if (!active) return;

        const nextFeatures = Array.isArray(data?.features)
          ? data.features
          : [];

        setFeatures(data);
        onFeaturesChange?.(nextFeatures);
        onVisibleCountChange?.(nextFeatures.length);

        if (!hasReportedInitialLoad.current) {
          hasReportedInitialLoad.current = true;
          onInitialLoaded?.();
        }
      } catch (e) {
        console.error("fetchGeoJSON error:", e);

        if (active) {
          setFeatures(null);
          onFeaturesChange?.([]);
          onVisibleCountChange?.(0);
        }

        if (!hasReportedInitialLoad.current) {
          hasReportedInitialLoad.current = true;
          onInitialLoaded?.();
        }

        showToast("Không tải được dữ liệu nhà thuốc", "error");
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
    onFeaturesChange,
    showToast,
  ]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 9999,
            background: "rgba(255,255,255,0.95)",
            padding: "8px 13px",
            borderRadius: 999,
            fontSize: 13,
            color: "#334155",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          ⏳ Đang tải nhà thuốc...
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "absolute",
            top: loading ? 58 : 14,
            right: 14,
            zIndex: 10000,
            maxWidth: 300,
            background:
              toast.type === "error"
                ? "linear-gradient(135deg,#dc2626,#991b1b)"
                : "linear-gradient(135deg,#16a34a,#15803d)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
            animation: "surveyToastIn 0.25s ease-out",
          }}
        >
          {toast.message}
        </div>
      )}

      <style>
        {`
          @keyframes surveyPanelIn {
            from { opacity: 0; transform: translateY(-8px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes surveyToastIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }

          .survey-map-icon:hover {
            transform: translateY(-1px) scale(1.04);
          }

          .survey-panel-btn:hover {
            filter: brightness(0.96);
          }
        `}
      </style>

      {canDrawArea && (
        <button
          className="survey-map-icon"
          onClick={() => setShowPanel((prev) => !prev)}
          title="Vùng khảo sát"
          style={{
            position: "absolute",
            bottom: 160,
            right: 20,
            zIndex: 9999,
            width: 54,
            height: 54,
            borderRadius: "50%",
            border: "3px solid white",
            background: showPanel
              ? "linear-gradient(135deg,#0f172a,#2563eb)"
              : "linear-gradient(135deg,#2563eb,#06b6d4)",
            color: "#fff",
            fontSize: 24,
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            transition: "all 0.2s ease",
          }}
        >
          🧭
        </button>
      )}

      {canDrawArea && showPanel && (
        <div
          style={{
            position: "absolute",
            top: panelPos.y,
            left: panelPos.x,
            zIndex: 9999,
            width: 300,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: 20,
            boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            overflow: "hidden",
            fontSize: 13,
            border: "1px solid rgba(255,255,255,0.3)",
            animation: "surveyPanelIn 0.25s ease-out",
          }}
        >
          <div
            onMouseDown={(e) => {
              dragRef.current.dragging = true;
              dragRef.current.offsetX = e.clientX - panelPos.x;
              dragRef.current.offsetY = e.clientY - panelPos.y;
            }}
            style={{
              cursor: "move",
              padding: "12px 14px",
              background: "linear-gradient(135deg,#2563eb,#06b6d4)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none",
            }}
          >
            <b>{isAdmin ? "🛡️ Admin vùng khảo sát" : "🧭 Vùng khảo sát"}</b>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowPanel(false)}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                width: 28,
                height: 28,
                borderRadius: "50%",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: 12 }}>
            {isAdmin && (
              <select
                value={selectedUserId}
                onChange={(e) => handleSelectUser(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px",
                  borderRadius: 10,
                  border: "1px solid #d8e0ea",
                  marginBottom: 9,
                  outline: "none",
                }}
              >
                <option value="">-- Admin: chọn user/company --</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullname || u.email} ({u.role}) - {u.area_count || 0} vùng
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedAreaId}
              onChange={(e) => handleSelectSavedArea(e.target.value)}
              style={{
                width: "100%",
                padding: "9px",
                borderRadius: 10,
                border: "1px solid #d8e0ea",
                marginBottom: 9,
                outline: "none",
              }}
            >
              <option value="">-- Chọn vùng đã lưu --</option>
              {savedAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>

            {isUsingPolygon && (
              <>
                <input
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="Tên vùng khảo sát"
                  style={{
                    width: "100%",
                    padding: "9px",
                    borderRadius: 10,
                    border: "1px solid #d8e0ea",
                    marginBottom: 9,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    padding: "8px",
                    borderRadius: 10,
                    background: "#eef7ff",
                    color: "#0b63ce",
                    marginBottom: 9,
                    fontWeight: 700,
                  }}
                >
                  📌 Đã chọn {polygonCoords.length} điểm
                </div>

                {selectedAreaId && (
                  <div
                    style={{
                      padding: "8px",
                      borderRadius: 10,
                      background: "#f0fdf4",
                      color: "#15803d",
                      marginBottom: 9,
                      fontWeight: 700,
                    }}
                  >
                    ✅ Đang mở vùng đã lưu. Khi bấm Edit và lưu thay đổi, hệ
                    thống sẽ tự cập nhật.
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <button
                    className="survey-panel-btn"
                    onClick={handleSaveArea}
                    style={{
                      border: "none",
                      borderRadius: 10,
                      padding: "9px",
                      background: "#16a34a",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    💾 {selectedAreaId ? "Lưu Thay Đổi" : "Lưu"}
                  </button>

                  <button
                    className="survey-panel-btn"
                    onClick={clearPolygon}
                    style={{
                      border: "none",
                      borderRadius: 10,
                      padding: "9px",
                      background: "#f97316",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Xoá vùng
                  </button>
                </div>
              </>
            )}

            {selectedAreaId && (
              <button
                className="survey-panel-btn"
                onClick={handleDeleteSavedArea}
                style={{
                  marginTop: 9,
                  width: "100%",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px",
                  background: "#991b1b",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                🗑️ Xoá vùng đã lưu
              </button>
            )}

            {!isUsingPolygon && (
              <div
                style={{
                  color: "#64748b",
                  lineHeight: 1.5,
                  background: "#f8fafc",
                  padding: 10,
                  borderRadius: 12,
                }}
              >
                {isAdmin
                  ? "Admin có thể chọn user/company để xem vùng họ đã tạo, hoặc vẽ vùng mới."
                  : "Dùng công cụ vẽ bên trái bản đồ để khoanh vùng, hoặc chọn vùng đã lưu để mở lại."}
              </div>
            )}
          </div>
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
              position="topright"
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
                    fillOpacity: 0.22,
                    dashArray: "6,6",
                  },
                },
                rectangle: {
                  shapeOptions: {
                    color: "#2563eb",
                    weight: 3,
                    fillColor: "#2563eb",
                    fillOpacity: 0.22,
                    dashArray: "6,6",
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

        {isUsingPolygon && <FitToPolygon polygonCoords={polygonCoords} />}

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