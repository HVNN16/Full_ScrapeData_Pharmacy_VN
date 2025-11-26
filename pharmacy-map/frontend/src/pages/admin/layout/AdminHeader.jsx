import React from "react";
import "../layout/adminPanel.css";
import { Link } from "react-router-dom";

export default function AdminHeader() {
  return (
    <div className="admin-header">
      <h2>🔧 Admin Panel</h2>

      <div className="admin-header-actions">
        <Link to="/" className="btn btn-green">🏠 Về Map</Link>
      </div>
    </div>
  );
}
