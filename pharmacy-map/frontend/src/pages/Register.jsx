import React, { useState } from "react";
import api from "../api";
import { FaUserPlus } from "react-icons/fa";

export default function Register() {
  const [fullname, setFullname] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      await api.post("/auth/register", { fullname, email, password });

      alert("Đăng ký thành công!");
      window.location.href = "/login";
    } catch (err) {
      alert("Email đã tồn tại!");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        backgroundImage:
          "url('https://upload.wikimedia.org/wikipedia/commons/6/6f/OpenStreetMap_Mapnik_snapshot.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Lớp phủ mờ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(4px)",
        }}
      ></div>

      {/* FORM */}
      <div
        style={{
          position: "relative",
          width: 380,
          padding: "45px 35px 35px 35px",
          background: "rgba(255,255,255,0.65)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
          borderRadius: 20,
          backdropFilter: "blur(10px)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#27ae60",
            width: 65,
            height: 65,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          <FaUserPlus size={32} color="#fff" />
        </div>

        <h2 style={{ marginTop: 20, marginBottom: 10 }}>Tạo tài khoản mới</h2>

        <p style={{ fontSize: 14, color: "#555", marginBottom: 25 }}>
          Đăng ký để sử dụng hệ thống bản đồ nhà thuốc
        </p>

        {/* Fullname */}
        <input
          placeholder="Họ và tên"
          onChange={(e) => setFullname(e.target.value)}
          style={{
            width: "90%",
            padding: "13px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "rgba(255,255,255,0.85)",
            marginBottom: 12,
          }}
        />

        {/* Email */}
        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "90%",
            padding: "13px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "rgba(255,255,255,0.85)",
            marginBottom: 12,
          }}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Mật khẩu"
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "90%",
            padding: "13px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "rgba(255,255,255,0.85)",
            marginBottom: 17,
          }}
        />

        {/* Button */}
        <button
          onClick={handleRegister}
          style={{
            width: "90%",
            padding: "13px",
            background: "linear-gradient(135deg, #27ae60, #1e874b)",
            color: "white",
            fontWeight: "bold",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontSize: 15,
            boxShadow: "0 4px 12px rgba(39,174,96,0.5)",
          }}
        >
          Tạo tài khoản
        </button>

        {/* 👉 LINK ĐĂNG NHẬP */}
        <p style={{ marginTop: 15, fontSize: 14, color: "#444" }}>
          Đã có tài khoản?{" "}
          <a
            href="/login"
            style={{
              color: "#1e66d0",
              fontWeight: "bold",
              textDecoration: "none",
            }}
            onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.target.style.textDecoration = "none")}
          >
            Đăng nhập
          </a>
        </p>

        <p style={{ marginTop: 15, fontSize: 13, color: "#333" }}>
          © 2025 Pharmacy Map System
        </p>
      </div>
    </div>
  );
}
