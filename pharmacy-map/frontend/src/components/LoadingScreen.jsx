import React from "react";
import "./loading-screen.css";

export default function LoadingScreen({
  title = "Pharmacy Map",
  subtitle = "Đang tải dữ liệu nhà thuốc, vui lòng chờ một chút...",
}) {
  return (
    <div className="pharmacy-loading-screen">
      <div className="pharmacy-loading-bg"></div>

      <div className="pharmacy-loading-card">
        <div className="pharmacy-loading-logo-wrap">
          <div className="pharmacy-loading-glow"></div>

          <div className="pharmacy-loading-logo">
            <div className="pharmacy-loading-plus">+</div>
            <div className="pharmacy-loading-pill">
              <span className="pill-half pill-left"></span>
              <span className="pill-half pill-right"></span>
            </div>
          </div>
        </div>

        <h1 className="pharmacy-loading-title">{title}</h1>
        <p className="pharmacy-loading-subtitle">{subtitle}</p>

        <div className="pharmacy-loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="pharmacy-loading-progress">
          <div className="pharmacy-loading-progress-bar"></div>
        </div>

        <div className="pharmacy-loading-note">
          <span className="loading-note-icon">💊</span>
          <span>Chuẩn bị bản đồ và danh sách nhà thuốc...</span>
        </div>
      </div>
    </div>
  );
}