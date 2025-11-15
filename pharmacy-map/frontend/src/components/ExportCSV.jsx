import React, { useCallback } from "react";

export default function ExportCSV({ province, district }) {

  const handleExport = useCallback(() => {
    const params = new URLSearchParams({
      province: province || "",
      district: district || "",
    });

    const url = `http://localhost:5000/api/export-csv?${params.toString()}`;
    window.open(url, "_blank");
  }, [province, district]);

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
        style={{
          padding: "10px 16px",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
        }}
      >
        ⬇ Xuất CSV
      </button>
    </div>
  );
}
