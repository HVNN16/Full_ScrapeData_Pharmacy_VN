import React from "react";
import "./admin.css";
import Sidebar from "./Sidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayout({ children }) {
  return (
    <div className="admin-container">
      <div className="admin-main">
        <AdminHeader />
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
}
