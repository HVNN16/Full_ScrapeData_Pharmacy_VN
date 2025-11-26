// src/api.js
import axios from "axios";

// =============== CẤU HÌNH AXIOS ===============
const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Gắn JWT token tự động
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// =============== API CŨ ===============
export const fetchProvinces = async () => {
  const res = await api.get("/provinces");
  return res.data;
};

export const fetchGeoJSON = async (params) => {
  const res = await api.get("/pharmacies.geojson", { params });
  return res.data;
};

// =============== EXPORT DEFAULT (QUAN TRỌNG!) ===============
export default api;
