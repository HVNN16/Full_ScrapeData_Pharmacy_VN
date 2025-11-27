import React, { useState } from "react";
import api from "../api";
import { FaMapMarkerAlt } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("fullname", res.data.fullname);

      if (res.data.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      alert("Sai tài khoản hoặc mật khẩu!");
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
      {/* LỚP LÀM MỜ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(4px)",
        }}
      ></div>

      {/* FORM LOGIN */}
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
        {/* ICON MAP */}
        <div
          style={{
            position: "absolute",
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2F80ED",
            width: 65,
            height: 65,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          <FaMapMarkerAlt size={32} color="#fff" />
        </div>

        <h2
          style={{
            marginTop: 20,
            marginBottom: 10,
            fontWeight: "700",
            fontSize: 22,
          }}
        >
          Hệ thống Bản đồ Nhà thuốc
        </h2>

        <p style={{ color: "#444", fontSize: 14, marginBottom: 25 }}>
          Tra cứu vị trí – tìm nhà thuốc nhanh nhất
        </p>

        {/* EMAIL */}
        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "90%",
            marginBottom: 12,
            padding: "13px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "rgba(255,255,255,0.8)",
          }}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Mật khẩu"
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "90%",
            marginBottom: 15,
            padding: "13px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "rgba(255,255,255,0.8)",
          }}
        />

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "13px",
            background: "linear-gradient(135deg, #2F80ED, #1C55B5)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: "bold",
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(47,128,237,0.5)",
            transition: "0.2s",
          }}
        >
          Đăng nhập
        </button>

        {/* 👉 LINK TỚI ĐĂNG KÝ */}
        <p style={{ marginTop: 15, fontSize: 14, color: "#444" }}>
          Chưa có tài khoản?{" "}
          <a
            href="/register"
            style={{
              color: "#1e66d0",
              fontWeight: "bold",
              textDecoration: "none",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.target.style.textDecoration = "none")}
          >
            Đăng ký ngay
          </a>
        </p>

        <p style={{ marginTop: 15, fontSize: 13, color: "#333" }}>
          © 2025 Pharmacy Map System
        </p>
      </div>
    </div>
  );
}
