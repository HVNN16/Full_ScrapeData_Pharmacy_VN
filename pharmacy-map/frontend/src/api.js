import axios from "axios";
const API_BASE = "http://localhost:5000/api";

export const fetchProvinces = async () => {
  const res = await axios.get(`${API_BASE}/provinces`);
  return res.data;
};

export const fetchGeoJSON = async (params) => {
  const res = await axios.get(`${API_BASE}/pharmacies.geojson`, { params });
  return res.data;
};
