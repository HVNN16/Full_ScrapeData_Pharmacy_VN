// import axios from "axios";

// const API_BASE_URL =
//   process.env.REACT_APP_API_URL || "http://localhost:5000";

// const api = axios.create({
//   baseURL: `${API_BASE_URL}/api`,
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// export const fetchProvinces = async () => {
//   const res = await api.get("/provinces");
//   return res.data;
// };

// export const fetchGeoJSON = async (params) => {
//   const res = await api.get("/pharmacies.geojson", { params });
//   return res.data;
// };

// export const fetchPharmaciesList = async (params) => {
//   const res = await api.get("/pharmacies", { params });
//   return res.data;
// };

// // ===== SURVEY AREAS =====

// export const createSurveyArea = async (data) => {
//   const res = await api.post("/survey-areas", data);
//   return res.data;
// };

// export const getMySurveyAreas = async () => {
//   const res = await api.get("/survey-areas/my");
//   return res.data;
// };

// export const updateSurveyArea = async (id, data) => {
//   const res = await api.put(`/survey-areas/${id}`, data);
//   return res.data;
// };

// export const deleteSurveyArea = async (id) => {
//   const res = await api.delete(`/survey-areas/${id}`);
//   return res.data;
// };
// export default api;

import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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

// ===== SURVEY AREAS: COMPANY / ADMIN SELF =====

export const createSurveyArea = async (data) => {
  const res = await api.post("/survey-areas", data);
  return res.data;
};

export const getMySurveyAreas = async () => {
  const res = await api.get("/survey-areas/my");
  return res.data;
};

export const updateSurveyArea = async (id, data) => {
  const res = await api.put(`/survey-areas/${id}`, data);
  return res.data;
};

export const deleteSurveyArea = async (id) => {
  const res = await api.delete(`/survey-areas/${id}`);
  return res.data;
};

// ===== SURVEY AREAS: ADMIN =====

export const getAdminSurveyUsers = async () => {
  const res = await api.get("/survey-areas/admin/users");
  return res.data;
};

export const getAdminSurveyAreasByUser = async (userId) => {
  const res = await api.get(`/survey-areas/admin/user/${userId}`);
  return res.data;
};

export const adminUpdateSurveyArea = async (id, data) => {
  const res = await api.put(`/survey-areas/admin/${id}`, data);
  return res.data;
};

export const adminDeleteSurveyArea = async (id) => {
  const res = await api.delete(`/survey-areas/admin/${id}`);
  return res.data;
};

export default api;