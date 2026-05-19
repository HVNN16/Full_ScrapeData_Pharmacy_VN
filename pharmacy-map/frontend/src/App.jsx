import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminDashboard from "./pages/admin/AdminDashboard";

import AdminRoute from "./routes/AdminRoute";

import CompanyReportPanel from "./components/CompanyReportPanel";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            PUBLIC
        ========================= */}
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        {/* =========================
            COMPANY REPORTS
        ========================= */}
        <Route
          path="/company-reports"
          element={<CompanyReportPanel />}
        />

        {/* =========================
            ADMIN
        ========================= */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}