import React from "react";
import "./admin.css";
import AdminHeader from "./AdminHeader";

export default function AdminLayout({ children }) {
  return (
    <div className="admin-container">
      <div className="admin-main">
        <AdminHeader />
        <main className="admin-page">{children}</main>
      </div>
    </div>
  );
}