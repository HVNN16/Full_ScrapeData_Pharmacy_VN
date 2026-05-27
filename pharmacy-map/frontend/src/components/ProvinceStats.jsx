import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const COLORS = ["#22c55e", "#ef4444"];

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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

  const summary = useMemo(() => {
    const total = stats.reduce(
      (sum, item) => sum + Number(item.total || item.count || 0),
      0
    );

    const totalOpen = stats.reduce(
      (sum, item) => sum + Number(item.open_count || 0),
      0
    );

    const totalClosed = stats.reduce(
      (sum, item) => sum + Number(item.closed_count || 0),
      0
    );

    const avgRating =
      stats.length > 0
        ? (
            stats.reduce((sum, item) => sum + Number(item.avg_rating || 0), 0) /
            stats.length
          ).toFixed(2)
        : "0.00";

    return {
      total,
      totalOpen,
      totalClosed,
      avgRating,
    };
  }, [stats]);

  const chartData = useMemo(() => {
    return [...stats]
      .sort(
        (a, b) =>
          Number(b.total || b.count || 0) - Number(a.total || a.count || 0)
      )
      .slice(0, 10);
  }, [stats]);

  const pieData = useMemo(
    () => [
      { name: "Mở cửa", value: summary.totalOpen },
      { name: "Đóng cửa", value: summary.totalClosed },
    ],
    [summary]
  );

  if (loading) {
    return (
      <div style={styles.loadingCard}>
        <div style={styles.spinner}>⏳</div>
        <div>
          <b>Đang tải thống kê...</b>
          <p style={styles.mutedText}>Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (!stats.length) {
    return (
      <div style={styles.emptyCard}>
        <div style={{ fontSize: 38 }}>📭</div>
        <h3 style={{ margin: "8px 0 4px" }}>Không có dữ liệu thống kê</h3>
        <p style={styles.mutedText}>Hãy thử chọn tỉnh/thành khác.</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerCard}>
        <div>
          <div style={styles.badge}>PHARMACY ANALYTICS</div>
          <h2 style={styles.title}>
            {province
              ? `Thống kê nhà thuốc tại ${province}`
              : "Thống kê nhà thuốc toàn quốc"}
          </h2>
          <p style={styles.subtitle}>
            Tổng hợp số lượng, trạng thái hoạt động và rating trung bình.
          </p>
        </div>
        <div style={styles.headerIcon}>📊</div>
      </div>

      <div style={styles.summaryGrid}>
        <StatCard icon="🏪" label="Tổng nhà thuốc" value={summary.total} />
        <StatCard icon="✅" label="Đang mở" value={summary.totalOpen} />
        <StatCard icon="🚫" label="Đã đóng" value={summary.totalClosed} />
        <StatCard icon="⭐" label="Rating TB" value={summary.avgRating} />
      </div>

      <div style={styles.chartCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>
              Top 10 khu vực có nhiều nhà thuốc
            </h3>
            <p style={styles.mutedText}>
              {province ? "Theo quận/huyện" : "Theo tỉnh/thành phố"}
            </p>
          </div>
        </div>

        <div style={{ height: 220, width: "100%", overflow: "hidden" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
  data={chartData}
  margin={{ top: 10, right: 8, left: -20, bottom: 20 }}
>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
  dataKey={province ? "district" : "province"}
  angle={-35}
  textAnchor="end"
  interval={0}
  height={70}
  tick={{ fontSize: 10, fill: "#475569" }}
/>
              <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
              <Tooltip />
              <Bar
                dataKey="total"
                name="Số nhà thuốc"
                fill="#2563eb"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.chartCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Tỷ lệ trạng thái hoạt động</h3>
            <p style={styles.mutedText}>So sánh nhà thuốc mở cửa và đóng cửa</p>
          </div>
        </div>

        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={82}
                innerRadius={45}
                paddingAngle={3}
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
      </div>

      <div style={styles.tableCard}>
        <h3 style={styles.sectionTitle}>Bảng dữ liệu chi tiết</h3>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  {province ? "Quận / Huyện" : "Tỉnh / Thành phố"}
                </th>
                <th style={styles.th}>Tổng số</th>
                <th style={styles.th}>Rating TB</th>
                <th style={styles.th}>Mở cửa</th>
                <th style={styles.th}>Đóng cửa</th>
              </tr>
            </thead>

            <tbody>
              {stats.map((s, i) => (
                <tr key={i}>
                  <td style={styles.tdName}>
                    {province ? s.district || "Không rõ" : s.province || "Không rõ"}
                  </td>
                  <td style={styles.td}>{s.total || s.count || 0}</td>
                  <td style={styles.td}>⭐ {s.avg_rating || 0}</td>
                  <td style={{ ...styles.td, color: "#16a34a", fontWeight: 800 }}>
                    {s.open_count || 0}
                  </td>
                  <td style={{ ...styles.td, color: "#dc2626", fontWeight: 800 }}>
                    {s.closed_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    marginTop: 0,
    display: "grid",
    gap: 12,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflowX: "hidden",
    boxSizing: "border-box",
  },

  headerCard: {
    background: "linear-gradient(135deg,#2563eb,#06b6d4)",
    borderRadius: 18,
    padding: 16,
    color: "#fff",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
    boxShadow: "0 10px 24px rgba(37,99,235,0.22)",
  },

  badge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.6,
    padding: "5px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    marginBottom: 10,
    maxWidth: "100%",
  },

  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.3,
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },

  subtitle: {
    margin: "8px 0 0",
    fontSize: 12,
    opacity: 0.92,
    lineHeight: 1.5,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },

  headerIcon: {
    display: "none",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
  },

  statCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    overflow: "hidden",
  },

  statIcon: {
    width: 38,
    height: 38,
    minWidth: 38,
    borderRadius: 13,
    background: "#eff6ff",
    display: "grid",
    placeItems: "center",
    fontSize: 20,
  },

  statValue: {
    fontSize: 19,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.1,
  },

  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
    whiteSpace: "normal",
  },

  chartCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
  },

  sectionHeader: {
    marginBottom: 8,
    width: "100%",
    minWidth: 0,
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 900,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },

  mutedText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
    wordBreak: "break-word",
  },

  tableCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
  },

  table: {
    width: "100%",
    minWidth: 520,
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 12,
  },

  th: {
    background: "#f1f5f9",
    color: "#334155",
    padding: "9px 7px",
    textAlign: "center",
    fontWeight: 900,
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "9px 7px",
    textAlign: "center",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  tdName: {
    padding: "9px 7px",
    borderBottom: "1px solid #f1f5f9",
    color: "#0f172a",
    fontWeight: 800,
    minWidth: 120,
    maxWidth: 160,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },

  loadingCard: {
    marginTop: 0,
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    gap: 12,
    alignItems: "center",
    border: "1px solid #e5e7eb",
    width: "100%",
    boxSizing: "border-box",
  },

  emptyCard: {
    marginTop: 0,
    background: "#fff7ed",
    borderRadius: 16,
    padding: 18,
    textAlign: "center",
    color: "#c2410c",
    border: "1px solid #fed7aa",
    width: "100%",
    boxSizing: "border-box",
  },

  spinner: {
    fontSize: 28,
  },
};

export default React.memo(ProvinceStats);