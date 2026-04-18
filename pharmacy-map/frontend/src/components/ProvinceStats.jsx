import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

function ProvinceStats({ province }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      try {
        const endpoint = province
          ? `/api/stats/district?province=${encodeURIComponent(province)}`
          : `/api/stats/province`;

        const res = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setStats(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Lỗi tải thống kê:", err);
        setStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [province]);

  if (loading) {
    return (
      <p style={{ color: "#999", fontStyle: "italic" }}>
        Đang tải dữ liệu...
      </p>
    );
  }

  if (!stats.length) {
    return (
      <p style={{ color: "red", fontStyle: "italic" }}>
        Không có dữ liệu thống kê
      </p>
    );
  }

  const totalOpen = stats.reduce(
    (sum, item) => sum + (parseInt(item.open_count, 10) || 0),
    0
  );

  const totalClosed = stats.reduce(
    (sum, item) => sum + (parseInt(item.closed_count, 10) || 0),
    0
  );

  const pieData = [
    { name: "Mở cửa", value: totalOpen },
    { name: "Đóng cửa", value: totalClosed },
  ];

  const COLORS = ["#34d399", "#f87171"];

  return (
    <div style={{ marginTop: 20 }}>
      <h3
        style={{
          color: "#007bff",
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        {province
          ? `📊 Thống kê theo huyện của ${province}`
          : "📊 Thống kê theo tỉnh (toàn quốc)"}
      </h3>

      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={province ? "district" : "province"}
              angle={-40}
              textAnchor="end"
              interval={0}
              height={90}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#60a5fa" name="Số nhà thuốc" />
            <Bar dataKey="avg_rating" fill="#facc15" name="Rating TB" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: 250, marginTop: 30 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 30, overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            background: "#fff",
          }}
        >
          <thead style={{ background: "#f1f5f9" }}>
            <tr>
              <th style={{ padding: 6, border: "1px solid #ccc" }}>
                {province ? "Huyện / Quận" : "Tỉnh / Thành phố"}
              </th>
              <th style={{ padding: 6, border: "1px solid #ccc" }}>Tổng số</th>
              <th style={{ padding: 6, border: "1px solid #ccc" }}>⭐ TB</th>
              <th style={{ padding: 6, border: "1px solid #ccc" }}>🏪 Mở</th>
              <th style={{ padding: 6, border: "1px solid #ccc" }}>🚫 Đóng</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} style={{ textAlign: "center" }}>
                <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>
                  {province ? s.district || "Không rõ" : s.province || "Không rõ"}
                </td>
                <td style={{ border: "1px solid #ddd" }}>
                  {s.total || s.count || 0}
                </td>
                <td style={{ border: "1px solid #ddd" }}>
                  {s.avg_rating || 0}
                </td>
                <td style={{ border: "1px solid #ddd" }}>
                  {s.open_count || 0}
                </td>
                <td style={{ border: "1px solid #ddd" }}>
                  {s.closed_count || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(ProvinceStats);