export default function AdminRoute({ children }) {
  const role = localStorage.getItem("role");
  if (role !== "admin") {
    return <h2 style={{ padding: 20 }}>❌ Bạn không có quyền admin!</h2>;
  }
  return children;
}
