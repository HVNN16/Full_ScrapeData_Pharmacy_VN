import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import PROVINCE_DISTRICTS from "../../data/provinceDistricts";
import "./layout/admin.css";
import noImage from "../../assets/no-image.jpg";

function isValidImageString(s) {
  const v = (s ?? "").toString().trim();
  if (!v) return false;
  // ✅ giống backend
  return /^https?:\/\//i.test(v) || /\.(jpg|jpeg|png|webp|gif)$/i.test(v);
}

function ImageCell({ imageValue, showDefaultWhenInvalid }) {
  const raw = (imageValue ?? "").toString().trim();
  const valid = isValidImageString(raw);

  const src = useMemo(() => {
    if (!valid) return showDefaultWhenInvalid ? noImage : "";
    if (raw.startsWith("http")) return raw;
    return `http://localhost:5000/uploads/${raw}`;
  }, [raw, valid, showDefaultWhenInvalid]);

  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        border: "1px solid #ddd",
        overflow: "hidden",
        background: "#f3f3f3",
        display: "inline-block",
      }}
      title={valid ? "Ảnh hợp lệ" : "Ảnh không hợp lệ / dùng mặc định"}
    >
      {src ? (
        <img
          src={src}
          alt="pharmacy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            if (showDefaultWhenInvalid) e.currentTarget.src = noImage;
            else e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}

export default function PharmacyTable({ onEdit }) {
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [hasImage, setHasImage] = useState(false);
  const [loading, setLoading] = useState(false);

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const getDistricts = () => (!province ? [] : PROVINCE_DISTRICTS[province] || []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const abortRef = useRef(null);

  const load = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const res = await api.get("/admin/pharmacies", {
        params: {
          page,
          perPage,
          province,
          district,
          search,
          hasImage: hasImage ? "true" : "false",
        },
        signal: controller.signal,
      });

      setList(Array.isArray(res.data.rows) ? res.data.rows : []);
      setTotal(res.data.total || 0);
    } catch (err) {
      if (err?.code !== "ERR_CANCELED" && err?.name !== "CanceledError") {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, province, district, search, hasImage]);

  const remove = async (id) => {
    if (!id || isNaN(Number(id))) {
      alert("❌ ID không hợp lệ, không thể xoá!");
      return;
    }
    if (window.confirm("Bạn có chắc muốn xoá?")) {
      await api.delete(`/admin/pharmacies/${id}`);
      load();
    }
  };

  return (
    <div className="admin-content">
      <div className="filters">
        <select
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            setDistrict("");
            setPage(1);
          }}
        >
          <option value="">-- Tất cả tỉnh --</option>
          {Object.keys(PROVINCE_DISTRICTS).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={district}
          disabled={!province}
          onChange={(e) => {
            setDistrict(e.target.value);
            setPage(1);
          }}
        >
          <option value="">-- Tất cả huyện --</option>
          {getDistricts().map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tìm theo tên..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
        />

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={hasImage}
            onChange={(e) => {
              setHasImage(e.target.checked);
              setPage(1);
            }}
          />
          Chỉ nhà thuốc có hình ảnh (hợp lệ)
        </label>
      </div>

      <div style={{ height: 18, margin: "8px 0" }}>
        <span style={{ fontSize: 13, color: "#666" }}>
          {loading ? "Đang tải dữ liệu..." : `Tổng: ${total} nhà thuốc`}
        </span>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 80 }}>ID</th>
            <th>Tên</th>
            <th>Địa chỉ</th>
            <th style={{ width: 160 }}>Tỉnh</th>
            <th style={{ width: 140 }}>Huyện</th>
            <th style={{ width: 90 }}>Rating</th>
            <th style={{ width: 90 }}>Hình ảnh</th>
            <th style={{ width: 120 }}>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {(list || []).map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.address}</td>
              <td>{p.province}</td>
              <td>{p.district}</td>
              <td>{p.rating}</td>

              <td style={{ textAlign: "center" }}>
                {/* ✅ Nếu đang lọc hasImage => chỉ show ảnh hợp lệ (không show default) */}
                {/* ✅ Nếu không lọc => show default khi ảnh không hợp lệ */}
                <ImageCell
                  imageValue={p.image}
                  showDefaultWhenInvalid={!hasImage}
                />
              </td>

              <td>
                <button className="btn-edit" onClick={() => onEdit(p)}>✏</button>
                <button className="btn-delete" onClick={() => remove(p.id)}>🗑</button>
              </td>
            </tr>
          ))}

          {!loading && (!list || list.length === 0) && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>
          ⬅ Prev
        </button>

        <span>Trang {page} / {totalPages}</span>

        <button
          disabled={page === totalPages || loading}
          onClick={() => setPage(page + 1)}
        >
          Next ➡
        </button>
      </div>
    </div>
  );
}
