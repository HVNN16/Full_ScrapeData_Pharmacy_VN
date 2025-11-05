export default function StatsPanel({ features }) {
  if (!features || !features.features) return null;
  const total = features.features.length;
  const avgRating = (
    features.features.reduce((s, f) => s + (f.properties.rating || 0), 0) /
    (total || 1)
  ).toFixed(2);

  return (
    <div style={{
      background: "#f8f9fa",
      borderRadius: 12,
      padding: 12,
      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      marginTop: 10
    }}>
      <h4 style={{ marginBottom: 6, color: "#0d6efd" }}>📊 Thống kê nhanh</h4>
      <p><b>Tổng số nhà thuốc:</b> {total}</p>
      <p><b>Rating trung bình:</b> {avgRating}</p>
    </div>
  );
}
