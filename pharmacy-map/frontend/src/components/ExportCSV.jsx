import React, { useCallback, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function ExportCSV({ province, district }) {
  const [loading, setLoading] = useState(false);

  const canExport = useMemo(() => {
    const role = localStorage.getItem("role");
    return role === "admin" || role === "company";
  }, []);

  const handleExport = useCallback(async () => {
    if (!canExport) {
      alert("❌ Chỉ admin hoặc company mới được xuất CSV.");
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({
        province: province || "",
        district: district || "",
      });

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/export-csv?${params.toString()}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (res.status === 401) {
        throw new Error("Bạn chưa đăng nhập.");
      }

      if (res.status === 403) {
        throw new Error("Bạn không có quyền xuất CSV.");
      }

      if (!res.ok) {
        throw new Error("Xuất CSV thất bại.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `pharmacy_${province || "all"}_${district || "all"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Export CSV error:", err);
      alert(err.message || "Có lỗi khi xuất CSV.");
    } finally {
      setLoading(false);
    }
  }, [province, district, canExport]);

  if (!canExport) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 9999,
      }}
    >
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          padding: "10px 16px",
          background: loading ? "#86efac" : "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
        }}
      >
        {loading ? "⏳ Đang xuất..." : "⬇ Xuất CSV"}
      </button>
    </div>
  );
}