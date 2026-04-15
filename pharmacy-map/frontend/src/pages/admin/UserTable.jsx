import React, { useCallback, useEffect, useState } from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function UserTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const token = localStorage.getItem("token");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Không tải được user");

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Lỗi tải user");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateRole = async (id, role) => {
    try {
      setUpdatingId(id);

      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Cập nhật role thất bại");

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role } : u))
      );
    } catch (err) {
      alert(err.message || "Không đổi được quyền user");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa user này?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Xóa user thất bại");

      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(err.message || "Không xóa được user");
    }
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="admin-content">
      <h2 style={{ marginBottom: 15 }}>👤 Quản lý người dùng</h2>

      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Role</th>
              <th>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.fullname}</td>
                <td>{u.email}</td>

                <td>
                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    style={{ padding: 6, borderRadius: 6 }}
                  >
                    <option value="user">User</option>
                    <option value="company">Company</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>

                <td>
                  <button
                    onClick={() => deleteUser(u.id)}
                    style={{
                      background: "#e53935",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    🗑 Xóa
                  </button>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                  Không có user
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}