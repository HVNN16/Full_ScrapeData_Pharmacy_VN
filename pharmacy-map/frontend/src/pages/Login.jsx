import React, { useState } from "react";
import api from "../api";
import { FaMapMarkerAlt, FaExclamationCircle, FaTimes } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [popup, setPopup] = useState({
    open: false,
    message: "",
    type: "error",
  });

  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const showPopup = (message, type = "error") => {
    setPopup({ open: true, message, type });
  };

  const closePopup = () => {
    setPopup({ open: false, message: "", type: "error" });
  };

  const handleLogin = async () => {
    if (!email) {
      return showPopup("Vui lòng nhập email.");
    }

    if (!isValidEmail(email)) {
      return showPopup("Email không đúng định dạng. Ví dụ: abc@gmail.com");
    }

    if (!password) {
      return showPopup("Vui lòng nhập mật khẩu.");
    }

    if (password.length < 5) {
      return showPopup("Mật khẩu phải có ít nhất 5 ký tự.");
    }

    try {
      const res = await api.post("/auth/login", { email, password });

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("fullname", user.fullname);
      localStorage.setItem("userId", user.id);

      if (user.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
      showPopup(err?.response?.data?.message || "Sai tài khoản hoặc mật khẩu!");
    }
  };

  return (
    <>
      <style>{`
        @keyframes popupOverlayFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes popupCardIn {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes iconFloat {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>

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
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(rgba(255,255,255,0.25), rgba(255,255,255,0.35))",
            backdropFilter: "blur(4px)",
          }}
        />

        <div
          style={{
            position: "relative",
            width: 380,
            padding: "45px 35px 35px 35px",
            background: "rgba(255,255,255,0.68)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            borderRadius: 20,
            backdropFilter: "blur(10px)",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.45)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -30,
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #2F80ED, #1C55B5)",
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

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "90%",
              marginBottom: 12,
              padding: "13px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(255,255,255,0.85)",
              outline: "none",
            }}
          />

          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "90%",
              marginBottom: 15,
              padding: "13px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(255,255,255,0.85)",
              outline: "none",
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
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 8px 18px rgba(47,128,237,0.42)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(47,128,237,0.5)";
            }}
          >
            Đăng nhập
          </button>

          <p style={{ marginTop: 15, fontSize: 14, color: "#444" }}>
            Chưa có tài khoản?{" "}
            <a
              href="/register"
              style={{
                color: "#1e66d0",
                fontWeight: "bold",
                textDecoration: "none",
              }}
            >
              Đăng ký ngay
            </a>
          </p>

          <p style={{ marginTop: 15, fontSize: 13, color: "#333" }}>
            © 2026 Pharmacy Map System - UDA 2026
          </p>
        </div>
      </div>

      {popup.open && (
        <div
          onClick={closePopup}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "radial-gradient(circle at center, rgba(30,102,208,0.12), rgba(0,0,0,0.42))",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
            animation: "popupOverlayFade 0.25s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 400,
              background: "rgba(255,255,255,0.97)",
              borderRadius: 24,
              padding: "26px 24px 22px",
              boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
              textAlign: "center",
              position: "relative",
              border: "1px solid rgba(47,128,237,0.16)",
              animation: "popupCardIn 0.28s ease",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: "linear-gradient(90deg, #2F80ED, #56CCF2)",
              }}
            />

            <button
              onClick={closePopup}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "none",
                background: "rgba(47,128,237,0.08)",
                color: "#1C55B5",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(47,128,237,0.16)";
                e.currentTarget.style.transform = "scale(1.06)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(47,128,237,0.08)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <FaTimes size={14} />
            </button>

            <div
              style={{
                width: 74,
                height: 74,
                margin: "4px auto 14px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2F80ED, #56CCF2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 24px rgba(47,128,237,0.35)",
                animation: "iconFloat 2s ease-in-out infinite",
              }}
            >
              <FaMapMarkerAlt size={30} color="#fff" />
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 10,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(214,48,49,0.08)",
                color: "#d63031",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              <FaExclamationCircle />
              <span>Thông báo đăng nhập</span>
            </div>

            <h3
              style={{
                margin: "2px 0 10px",
                fontSize: 22,
                color: "#1d2b4f",
                fontWeight: 700,
              }}
            >
              Có vấn đề khi đăng nhập
            </h3>

            <p
              style={{
                color: "#4b5563",
                fontSize: 15,
                lineHeight: 1.65,
                marginBottom: 22,
                padding: "0 6px",
              }}
            >
              {popup.message}
            </p>

            <button
              onClick={closePopup}
              style={{
                minWidth: 150,
                padding: "12px 20px",
                border: "none",
                borderRadius: 14,
                background: "linear-gradient(135deg, #2F80ED, #1C55B5)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(47,128,237,0.35)",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 22px rgba(47,128,237,0.42)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 8px 18px rgba(47,128,237,0.35)";
              }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}