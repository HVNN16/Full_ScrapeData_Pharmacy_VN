import axios from "axios";

// KHÔNG thêm /api ở đây
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Gắn JWT token tự động
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// =============== API ===============
export const fetchProvinces = async () => {
  const res = await api.get("/provinces");
  return res.data;
};

export const fetchGeoJSON = async (params) => {
  const res = await api.get("/pharmacies.geojson", { params });
  return res.data;
};

export const fetchPharmaciesList = async (params) => {
  const res = await api.get("/pharmacies", { params });
  return res.data;
};

export default api;