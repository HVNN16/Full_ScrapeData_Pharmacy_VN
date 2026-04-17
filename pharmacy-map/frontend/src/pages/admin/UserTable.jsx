import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const initialForm = {
  fullname: "",
  email: "",
  password: "",
  role: "user",
};

export default function UserTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(initialForm);

  const token = localStorage.getItem("token");

  const isEdit = useMemo(() => !!editingUser, [editingUser]);

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
        prev.map((u) => (u.id === id ? { ...u, role: data.user?.role || role } : u))
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

  const openAddModal = () => {
    setEditingUser(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      fullname: user.fullname || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingUser(null);
    setForm(initialForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveUser = async (e) => {
    e.preventDefault();

    if (!form.fullname.trim() || !form.email.trim() || !form.role) {
      alert("Vui lòng nhập đầy đủ họ tên, email, role");
      return;
    }

    if (!isEdit && !form.password.trim()) {
      alert("Vui lòng nhập mật khẩu khi thêm user");
      return;
    }

    try {
      setSaving(true);

      const url = isEdit
        ? `${API_BASE_URL}/api/admin/users/${editingUser.id}`
        : `${API_BASE_URL}/api/admin/users`;

      const method = isEdit ? "PUT" : "POST";

      const payload = {
        fullname: form.fullname.trim(),
        email: form.email.trim(),
        role: form.role,
      };

      if (!isEdit || form.password.trim()) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Lưu user thất bại");

      if (isEdit) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? data.user : u))
        );
      } else {
        setUsers((prev) => [data.user, ...prev]);
      }

      closeModal();
    } catch (err) {
      alert(err.message || "Không lưu được user");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="admin-content">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 15,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>👤 Quản lý người dùng</h2>

        <button
          onClick={openAddModal}
          style={{
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "#fff",
            border: "none",
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ＋ Thêm user
        </button>
      </div>

      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div className="table-wrap" style={{ overflowX: "auto" }}>
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => openEditModal(u)}
                        style={{
                          background: "#1976d2",
                          color: "white",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Sửa
                      </button>

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
                    </div>
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
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>
              {isEdit ? "✏️ Sửa user" : "➕ Thêm user"}
            </h3>

            <form onSubmit={saveUser}>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    Họ tên
                  </label>
                  <input
                    type="text"
                    name="fullname"
                    value={form.fullname}
                    onChange={handleChange}
                    placeholder="Nhập họ tên"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Nhập email"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    {isEdit ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={
                      isEdit
                        ? "Để trống nếu không đổi mật khẩu"
                        : "Nhập mật khẩu"
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    Role
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="user">User</option>
                    <option value="company">Company</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
};