import React, { useCallback, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function ExportCSV({ province, district }) {
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [exportMode, setExportMode] = useState("current");

  const canExport = useMemo(() => {
    const role = localStorage.getItem("role");
    return role === "admin" || role === "company";
  }, []);

  const exportLabel = useMemo(() => {
    if (exportMode === "all") return "Toàn bộ dữ liệu nhà thuốc";
    if (district) return `Theo quận/huyện: ${district}`;
    if (province) return `Theo tỉnh/thành: ${province}`;
    return "Toàn bộ dữ liệu nhà thuốc";
  }, [exportMode, province, district]);

  const handleExport = useCallback(async () => {
    if (!canExport) {
      alert("❌ Chỉ admin hoặc company mới được xuất CSV.");
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (exportMode === "current") {
        if (province) params.append("province", province);
        if (district) params.append("district", district);
      }

      const token = localStorage.getItem("token");
      const queryString = params.toString();

      const url = queryString
        ? `${API_BASE_URL}/api/export-csv?${queryString}`
        : `${API_BASE_URL}/api/export-csv`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 401) throw new Error("Bạn chưa đăng nhập.");
      if (res.status === 403) throw new Error("Bạn không có quyền xuất CSV.");
      if (!res.ok) throw new Error("Xuất CSV thất bại.");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const fileProvince =
        exportMode === "all" ? "all" : province || "all";

      const fileDistrict =
        exportMode === "all" ? "all" : district || "all";

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `pharmacy_${fileProvince}_${fileDistrict}.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(downloadUrl);
      setShowPopup(false);
    } catch (err) {
      console.error("❌ Export CSV error:", err);
      alert(err.message || "Có lỗi khi xuất CSV.");
    } finally {
      setLoading(false);
    }
  }, [province, district, exportMode, canExport]);

  if (!canExport) return null;

  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 9999,
        }}
      >
        <button
          onClick={() => setShowPopup(true)}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#16a34a,#22c55e)",
            color: "white",
            border: "3px solid white",
            cursor: "pointer",
            fontSize: 23,
            fontWeight: "bold",
            boxShadow: "0 10px 25px rgba(0,0,0,0.28)",
          }}
          title="Xuất CSV"
        >
          ⬇
        </button>
      </div>

      {showPopup && (
        <div
          onClick={() => !loading && setShowPopup(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15,23,42,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380,
              maxWidth: "100%",
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                background: "linear-gradient(135deg,#16a34a,#0f766e)",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <b>⬇ Xuất dữ liệu CSV</b>

              <button
                onClick={() => !loading && setShowPopup(false)}
                disabled={loading}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 900,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "#475569",
                  marginBottom: 14,
                  lineHeight: 1.5,
                }}
              >
                Chọn phạm vi dữ liệu muốn xuất. Việc xuất CSV không ảnh hưởng
                đến số marker đang hiển thị trên bản đồ.
              </div>

              <label
                style={{
                  display: "block",
                  padding: 12,
                  borderRadius: 14,
                  border:
                    exportMode === "current"
                      ? "2px solid #16a34a"
                      : "1px solid #e2e8f0",
                  background:
                    exportMode === "current" ? "#f0fdf4" : "#f8fafc",
                  marginBottom: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="exportMode"
                  value="current"
                  checked={exportMode === "current"}
                  onChange={() => setExportMode("current")}
                  style={{ marginRight: 8 }}
                />
                <b>Xuất theo bộ lọc hiện tại</b>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#64748b",
                    paddingLeft: 24,
                  }}
                >
                  {province || district
                    ? exportLabel
                    : "Chưa chọn tỉnh/huyện, hệ thống sẽ xuất toàn bộ."}
                </div>
              </label>

              <label
                style={{
                  display: "block",
                  padding: 12,
                  borderRadius: 14,
                  border:
                    exportMode === "all"
                      ? "2px solid #16a34a"
                      : "1px solid #e2e8f0",
                  background: exportMode === "all" ? "#f0fdf4" : "#f8fafc",
                  marginBottom: 14,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="exportMode"
                  value="all"
                  checked={exportMode === "all"}
                  onChange={() => setExportMode("all")}
                  style={{ marginRight: 8 }}
                />
                <b>Xuất toàn bộ dữ liệu</b>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#64748b",
                    paddingLeft: 24,
                  }}
                >
                  Xuất toàn bộ dữ liệu nhà thuốc trong hệ thống.
                </div>
              </label>

              <button
                onClick={handleExport}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: loading ? "#86efac" : "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                {loading ? "⏳ Đang xuất..." : "⬇ Xác nhận xuất CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}