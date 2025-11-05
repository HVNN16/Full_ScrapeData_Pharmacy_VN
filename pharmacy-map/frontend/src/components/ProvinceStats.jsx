import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

export default function ProvinceStats({ province }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Tự động chọn API phù hợp: toàn quốc hoặc trong 1 tỉnh
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const url = province
          ? `http://localhost:5000/api/stats/district?province=${encodeURIComponent(province)}`
          : `http://localhost:5000/api/stats/province`;

        const res = await fetch(url);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("❌ Lỗi tải thống kê:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [province]);

  if (loading)
    return <p style={{ color: "#999", fontStyle: "italic" }}>Đang tải dữ liệu...</p>;
  if (!stats.length)
    return <p style={{ color: "red", fontStyle: "italic" }}>Không có dữ liệu thống kê</p>;

  // ✅ Pie chart tổng tỷ lệ mở cửa / đóng cửa
  const totalOpen = stats.reduce((s, p) => s + (parseInt(p.open_count) || 0), 0);
  const totalClosed = stats.reduce((s, p) => s + (parseInt(p.closed_count) || 0), 0);
  const pieData = [
    { name: "Mở cửa", value: totalOpen },
    { name: "Đóng cửa", value: totalClosed },
  ];
  const COLORS = ["#34d399", "#f87171"];

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ color: "#007bff", marginBottom: 10, textAlign: "center" }}>
        {province
          ? `📊 Thống kê theo huyện của ${province}`
          : "📊 Thống kê theo tỉnh (toàn quốc)"}
      </h3>

      {/* Biểu đồ cột: top 10 khu vực */}
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

      {/* Biểu đồ tròn: tổng tỷ lệ mở / đóng */}
      <div style={{ height: 250, marginTop: 30 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
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

      {/* Bảng dữ liệu chi tiết */}
      <div style={{ marginTop: 30 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
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
                  {s.province || s.district || "Không rõ"}
                </td>
                <td style={{ border: "1px solid #ddd" }}>{s.total || s.count}</td>
                <td style={{ border: "1px solid #ddd" }}>{s.avg_rating}</td>
                <td style={{ border: "1px solid #ddd" }}>{s.open_count}</td>
                <td style={{ border: "1px solid #ddd" }}>{s.closed_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
