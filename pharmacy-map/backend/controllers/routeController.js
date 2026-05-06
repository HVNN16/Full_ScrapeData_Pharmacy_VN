export const getRoute = async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({
        message: "Thiếu tọa độ startLat, startLng, endLat, endLng",
      });
    }

    const sLat = Number(startLat);
    const sLng = Number(startLng);
    const eLat = Number(endLat);
    const eLng = Number(endLng);

    if (
      !Number.isFinite(sLat) ||
      !Number.isFinite(sLng) ||
      !Number.isFinite(eLat) ||
      !Number.isFinite(eLng)
    ) {
      return res.status(400).json({
        message: "Tọa độ không hợp lệ",
      });
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Không lấy được tuyến đường từ OSRM",
      });
    }

    const data = await response.json();

    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi /route:", err);
    res.status(500).json({
      message: "Lỗi server khi lấy tuyến đường",
      error: err.message,
    });
  }
};