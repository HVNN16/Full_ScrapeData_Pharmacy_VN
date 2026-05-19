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

// ===== COMPANY STAFF =====

export const getCompanyStaff = async () => {
  const res = await api.get("/auth/company/staff");
  return res.data;
};

export const createCompanyStaff = async (data) => {
  const res = await api.post("/auth/company/create-staff", data);
  return res.data;
};

export const assignSurveyAreaToStaff = async (areaId, staffId) => {
  const res = await api.post(`/survey-areas/${areaId}/assign-staff`, {
    staffId,
  });
  return res.data;
};

export const getAssignedSurveyAreas = async () => {
  const res = await api.get("/survey-areas/staff/assigned");
  return res.data;
};

// ===== COMPANY REPORTS =====

export const getCompanyAssignmentReport = async () => {
  const res = await api.get("/company/reports/assignments");
  return res.data;
};

export const getCompanyStaffSummaryReport = async () => {
  const res = await api.get("/company/reports/staff-summary");
  return res.data;
};

export const getCompanyStaffSurveyedPharmacies = async (staffId) => {
  const res = await api.get(`/company/reports/staff/${staffId}/pharmacies`);
  return res.data;
};

export const getCompanySurveyedPharmacies = async (params = {}) => {
  const res = await api.get("/company/reports/pharmacies", { params });
  return res.data;
};

export const exportCompanySurveyReport = async (staffId = "all") => {
  const res = await api.get("/company/reports/export", {
    params: { staffId },
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute(
    "download",
    staffId && staffId !== "all"
      ? `staff_${staffId}_survey_report.csv`
      : "company_survey_report.csv"
  );

  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;