import axios from "axios";

export const getRoute = async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tọa độ bắt đầu hoặc kết thúc",
      });
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const response = await axios.get(url);
    const route = response.data?.routes?.[0];

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tuyến đường",
      });
    }

    return res.json({
      success: true,
      distance: route.distance,
      duration: route.duration,
      coordinates: route.geometry.coordinates,
    });
  } catch (err) {
    console.error("GET /route error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Không lấy được tuyến đường",
    });
  }
};