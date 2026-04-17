import React, { useState } from "react";
import api from "../api";
import { FaUserPlus, FaMapMarkerAlt, FaExclamationCircle, FaCheckCircle } from "react-icons/fa";

export default function Register() {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [popup, setPopup] = useState({
    open: false,
    message: "",
    type: "error", // error | success
  });

  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const showPopup = (message, type = "error") => {
    setPopup({ open: true, message, type });
  };

  const closePopup = () => {
    if (popup.type === "success") {
      window.location.href = "/login";
      return;
    }
    setPopup({ open: false, message: "", type: "error" });
  };

  const handleRegister = async () => {
    const cleanName = fullname.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      return showPopup("Vui lòng nhập họ và tên.");
    }

    if (cleanName.length < 2) {
      return showPopup("Họ và tên phải có ít nhất 2 ký tự.");
    }

    if (!cleanEmail) {
      return showPopup("Vui lòng nhập email.");
    }

    if (!isValidEmail(cleanEmail)) {
      return showPopup("Email không đúng định dạng. Ví dụ: abc@gmail.com");
    }

    if (!password) {
      return showPopup("Vui lòng nhập mật khẩu.");
    }

    if (password.length < 5) {
      return showPopup("Mật khẩu phải có ít nhất 5 ký tự.");
    }

    try {
      await api.post("/auth/register", {
        fullname: cleanName,
        email: cleanEmail,
        password,
      });

      showPopup("Đăng ký thành công! Hãy đăng nhập để tiếp tục.", "success");
    } catch (err) {
      console.error(err);
      showPopup(err?.response?.data?.message || "Email đã tồn tại hoặc đăng ký thất bại.");
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInOverlay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes popupIn {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes floatIcon {
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
            background: "rgba(255,255,255,0.25)",
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
              background: "linear-gradient(135deg, #27ae60, #1e874b)",
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

          <h2 style={{ marginTop: 20, marginBottom: 10, fontWeight: "700", fontSize: 22 }}>
            Tạo tài khoản mới
          </h2>

          <p style={{ fontSize: 14, color: "#555", marginBottom: 25 }}>
            Đăng ký để sử dụng hệ thống bản đồ nhà thuốc
          </p>

          <input
            value={fullname}
            placeholder="Họ và tên"
            onChange={(e) => setFullname(e.target.value)}
            style={{
              width: "90%",
              padding: "13px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(255,255,255,0.85)",
              marginBottom: 12,
              outline: "none",
            }}
          />

          <input
            type="email"
            value={email}
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "90%",
              padding: "13px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(255,255,255,0.85)",
              marginBottom: 12,
              outline: "none",
            }}
          />

          <input
            type="password"
            value={password}
            placeholder="Mật khẩu"
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "90%",
              padding: "13px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(255,255,255,0.85)",
              marginBottom: 17,
              outline: "none",
            }}
          />

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
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 8px 18px rgba(39,174,96,0.45)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(39,174,96,0.5)";
            }}
          >
            Tạo tài khoản
          </button>

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
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
            animation: "fadeInOverlay 0.28s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 390,
              background: "rgba(255,255,255,0.97)",
              borderRadius: 22,
              padding: "24px 22px",
              boxShadow: "0 18px 45px rgba(0,0,0,0.28)",
              textAlign: "center",
              border: "1px solid rgba(39,174,96,0.18)",
              animation: "popupIn 0.32s ease",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 14px",
                borderRadius: "50%",
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #27ae60, #6ddc9a)"
                    : "linear-gradient(135deg, #2F80ED, #56CCF2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  popup.type === "success"
                    ? "0 10px 24px rgba(39,174,96,0.35)"
                    : "0 10px 24px rgba(47,128,237,0.35)",
                animation: "floatIcon 2s ease-in-out infinite",
              }}
            >
              {popup.type === "success" ? (
                <FaCheckCircle size={30} color="#fff" />
              ) : (
                <FaMapMarkerAlt size={28} color="#fff" />
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 10,
                color: popup.type === "success" ? "#1e874b" : "#d63031",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {popup.type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
              <span>
                {popup.type === "success" ? "Đăng ký thành công" : "Thông báo đăng ký"}
              </span>
            </div>

            <p
              style={{
                color: "#333",
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 18,
              }}
            >
              {popup.message}
            </p>

            <button
              onClick={closePopup}
              style={{
                minWidth: 130,
                padding: "11px 18px",
                border: "none",
                borderRadius: 12,
                background:
                  popup.type === "success"
                    ? "linear-gradient(135deg, #27ae60, #1e874b)"
                    : "linear-gradient(135deg, #2F80ED, #1C55B5)",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow:
                  popup.type === "success"
                    ? "0 6px 14px rgba(39,174,96,0.35)"
                    : "0 6px 14px rgba(47,128,237,0.35)",
                transition: "transform 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {popup.type === "success" ? "Đi tới đăng nhập" : "Đã hiểu"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}