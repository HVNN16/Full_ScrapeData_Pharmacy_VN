import React, { useEffect, useState } from "react";
import api from "../../api";
import PROVINCE_DISTRICTS from "../../data/provinceDistricts";
import "./layout/admin.css";

export default function PharmacyTable({ onEdit }) {
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // FILTERS
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");

  const perPage = 20;

  // Load data
  const load = async () => {
    const res = await api.get("/admin/pharmacies", {
      params: { page, perPage, province, district, search },
    });

    setList(res.data.rows);
    setTotal(res.data.total);
  };

  useEffect(() => {
    load();
  }, [page, province, district, search]);

  const remove = async (id) => {
    if (window.confirm("Bạn có chắc muốn xoá?")) {
      await api.delete(`/admin/pharmacies/${id}`);
      load();
    }
  };

  // 🔥 Lấy danh sách huyện theo tỉnh được chọn
  const getDistricts = () => {
    if (!province) return [];
    return PROVINCE_DISTRICTS[province] || [];
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="admin-content">
      {/* 🔍 Bộ lọc */}
      <div className="filters">
        <select value={province} onChange={(e) => { setProvince(e.target.value); setDistrict(""); }}>
          <option value="">-- Tất cả tỉnh --</option>
          {Object.keys(PROVINCE_DISTRICTS).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">-- Tất cả huyện --</option>
          {getDistricts().map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tìm theo tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Bảng */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên</th>
            <th>Địa chỉ</th>
            <th>Tỉnh</th>
            <th>Huyện</th>
            <th>Rating</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.address}</td>
              <td>{p.province}</td>
              <td>{p.district}</td>
              <td>{p.rating}</td>
              <td>
                <button className="btn-edit" onClick={() => onEdit(p)}>✏</button>
                <button className="btn-delete" onClick={() => remove(p.id)}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔄 PHÂN TRANG */}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          ⬅ Prev
        </button>

        <span>Trang {page} / {totalPages}</span>

        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          Next ➡
        </button>
      </div>
    </div>
  );
}
