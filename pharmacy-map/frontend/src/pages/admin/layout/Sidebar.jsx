import React from "react";
import "./admin.css";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h3>📁 Quản lý</h3>
      <ul>
        <li><Link to="/admin">🏥 Nhà thuốc</Link></li>
      </ul>
    </div>
  );
}
