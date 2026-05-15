import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import PROVINCE_DISTRICTS from "../../data/provinceDistricts";
import noImage from "../../assets/no-image.jpg";
import "./layout/admin.css";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

function isValidImageString(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return false;

  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("/uploads/") ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(v)
  );
}

function getImageSrc(value) {
  const raw = (value ?? "").toString().trim();

  if (!isValidImageString(raw)) return noImage;
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/uploads/")) return `${API_BASE_URL}${raw}`;

  return `${API_BASE_URL}/uploads/${raw}`;
}

function formatDate(value) {
  if (!value) return "Chưa có";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Không hợp lệ";

  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatProductGroups(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(Boolean)
          .map((v) => String(v).trim())
          .filter(Boolean);
      }
    } catch (_) {}

    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function PaginationBar({ page, totalPages, loading, setPage }) {
  return (
    <div className="pagination pagination-sticky">
      <button
        disabled={page <= 1 || loading}
        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        type="button"
      >
        ⬅ Prev
      </button>

      <span>
        Trang {page} / {totalPages}
      </span>

      <button
        disabled={page >= totalPages || loading}
        onClick={() => setPage((prev) => prev + 1)}
        type="button"
      >
        Next ➡
      </button>
    </div>
  );
}

export default function SurveyManagement() {
  const [list, setList] = useState([]);
  const [users, setUsers] = useState([]);

  const [page, setPage] = useState(1);
  const [totalSurveyed, setTotalSurveyed] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [totalUnsurveyed, setTotalUnsurveyed] = useState(0);

  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [surveyor, setSurveyor] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [hasImage, setHasImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    province: "",
    district: "",
    phone: "",
    status: "",
    rating: "",
    latitude: "",
    longitude: "",
    image: "",
    owner_name: "",
    product_groups: "",
  });

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(totalSurveyed / perPage));
  const abortRef = useRef(null);

  const districts = useMemo(() => {
    if (!province) return [];
    return PROVINCE_DISTRICTS[province] || [];
  }, [province]);

  const progressPercent = useMemo(() => {
    if (!totalAll) return 0;
    return Math.round((totalSurveyed / totalAll) * 100);
  }, [totalSurveyed, totalAll]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(t);
  }, [searchInput]);

  const loadUsers = async () => {
    try {
      const res = await api.get("/survey-areas/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi tải user khảo sát:", err);
      setUsers([]);
    }
  };

  const loadStats = async () => {
    try {
      const [allRes, surveyedRes, unsurveyedRes] = await Promise.all([
        api.get("/admin/pharmacies", {
          params: {
            page: 1,
            perPage: 1,
            province,
            district,
            search,
            hasImage: "false",
          },
        }),

        api.get("/admin/pharmacies", {
          params: {
            page: 1,
            perPage: 1,
            province,
            district,
            search,
            hasImage: hasImage ? "true" : "false",
            isSurveyed: "true",
          },
        }),

        api.get("/admin/pharmacies", {
          params: {
            page: 1,
            perPage: 1,
            province,
            district,
            search,
            hasImage: "false",
            isSurveyed: "false",
          },
        }),
      ]);

      setTotalAll(Number(allRes.data?.total) || 0);
      setTotalSurveyed(Number(surveyedRes.data?.total) || 0);
      setTotalUnsurveyed(Number(unsurveyedRes.data?.total) || 0);
    } catch (err) {
      console.error("Lỗi tải thống kê khảo sát:", err);
    }
  };

  const loadSurveyedPharmacies = async () => {
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
          isSurveyed: "true",
        },
        signal: controller.signal,
      });

      let rows = Array.isArray(res.data?.rows) ? res.data.rows : [];

      if (surveyor) {
        rows = rows.filter(
          (item) => String(item.surveyed_by_id || "") === String(surveyor)
        );
      }

      setList(rows);
    } catch (err) {
      if (err?.code !== "ERR_CANCELED" && err?.name !== "CanceledError") {
        console.error("Lỗi tải danh sách khảo sát:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadStats();
    loadSurveyedPharmacies();

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, province, district, search, hasImage, surveyor]);

  const handleOpenMap = (item) => {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("Nhà thuốc này chưa có tọa độ hợp lệ");
      return;
    }

    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const openEditModal = (item) => {
    setEditItem(item);

    setEditForm({
      name: item.name || "",
      address: item.address || "",
      province: item.province || "",
      district: item.district || "",
      phone: item.phone || "",
      status: item.status || "",
      rating: item.rating || "",
      latitude: item.latitude || "",
      longitude: item.longitude || "",
      image: item.image || item.image_url || "",
      owner_name: item.owner_name || "",
      product_groups: formatProductGroups(item.product_groups).join(", "),
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    try {
      if (!editItem?.id) return;

      const payload = {
        ...editForm,
        rating: editForm.rating === "" ? null : Number(editForm.rating),
        latitude: editForm.latitude === "" ? null : Number(editForm.latitude),
        longitude: editForm.longitude === "" ? null : Number(editForm.longitude),
        product_groups: editForm.product_groups
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };

      await api.put(`/admin/pharmacies/${editItem.id}`, payload);

      alert("✅ Đã cập nhật nhà thuốc");

      setEditItem(null);
      setDetailItem(null);

      loadSurveyedPharmacies();
      loadStats();
    } catch (err) {
      console.error(err);
      alert("❌ Cập nhật thất bại");
    }
  };

  return (
    <div className="admin-content">
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 6px" }}>📍 Quản lý khảo sát thực địa</h2>
        <p style={{ margin: 0, color: "#64748b" }}>
          Theo dõi tiến độ khảo sát, người khảo sát, ảnh và vị trí nhà thuốc.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div className="survey-stat-card">
          <div className="survey-stat-label">Tổng nhà thuốc</div>
          <div className="survey-stat-value">{totalAll}</div>
        </div>

        <div className="survey-stat-card green">
          <div className="survey-stat-label">Đã khảo sát</div>
          <div className="survey-stat-value">{totalSurveyed}</div>
        </div>

        <div className="survey-stat-card orange">
          <div className="survey-stat-label">Chưa khảo sát</div>
          <div className="survey-stat-value">{totalUnsurveyed}</div>
        </div>

        <div className="survey-stat-card blue">
          <div className="survey-stat-label">Tiến độ</div>
          <div className="survey-stat-value">{progressPercent}%</div>
        </div>
      </div>

      <div
        style={{
          height: 12,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: "linear-gradient(90deg,#22c55e,#0ea5e9)",
            transition: "width 0.25s ease",
          }}
        />
      </div>

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
            <option key={p} value={p}>
              {p}
            </option>
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
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={surveyor}
          onChange={(e) => {
            setSurveyor(e.target.value);
            setPage(1);
          }}
        >
          <option value="">-- Tất cả người khảo sát --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullname || u.email} ({u.role})
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tìm nhà thuốc / địa chỉ..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
          Chỉ bản ghi có ảnh
        </label>
      </div>

      <div className="admin-toolbar">
        <div className="admin-summary">
          {loading
            ? "Đang tải dữ liệu..."
            : `Tổng bản ghi đã khảo sát: ${totalSurveyed}`}
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          loading={loading}
          setPage={setPage}
        />
      </div>

      <div className="survey-list">
        {loading && (
          <div className="survey-empty">Đang tải dữ liệu khảo sát...</div>
        )}

        {!loading && list.length === 0 && (
          <div className="survey-empty">Không có dữ liệu khảo sát</div>
        )}

        {!loading &&
          list.map((item) => (
            <div className="survey-card" key={item.id}>
              <div className="survey-card-left">
                <img
                  src={getImageSrc(item.image || item.image_url)}
                  alt="survey"
                  className="survey-card-image"
                  onError={(e) => {
                    e.currentTarget.src = noImage;
                  }}
                />
              </div>

              <div className="survey-card-main">
                <div className="survey-card-top">
                  <div>
                    <div className="survey-card-title">
                      {item.name || "Không có tên"}
                    </div>
                    <div className="survey-card-id">ID: {item.id}</div>
                  </div>

                  <span className="survey-badge-success">✅ Đã khảo sát</span>
                </div>

                <div className="survey-card-address">
                  📍 {item.address || "Chưa có địa chỉ"}
                </div>

                <div className="survey-card-grid">
                  <div>
                    <span>Tỉnh</span>
                    <b>{item.province || "—"}</b>
                  </div>

                  <div>
                    <span>Huyện</span>
                    <b>{item.district || "—"}</b>
                  </div>

                  <div>
                    <span>Người khảo sát</span>
                    <b>{item.surveyed_by || "Không rõ"}</b>
                  </div>

                  <div>
                    <span>Thời gian</span>
                    <b>{formatDate(item.surveyed_at)}</b>
                  </div>
                </div>
              </div>

              <div className="survey-card-actions">
                <button
                  className="survey-detail-btn"
                  type="button"
                  onClick={() => setDetailItem(item)}
                >
                  👁️ Chi tiết
                </button>

                <button
                  className="survey-map-btn"
                  type="button"
                  onClick={() => handleOpenMap(item)}
                >
                  🗺️ Xem Map
                </button>
              </div>
            </div>
          ))}
      </div>

      {detailItem && (
        <div
          className="survey-modal-overlay"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="survey-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="survey-detail-header">
              <div>
                <h2>🏥 Chi tiết nhà thuốc</h2>
                <p>ID: {detailItem.id}</p>
              </div>

              <button
                className="survey-close-btn"
                onClick={() => setDetailItem(null)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="survey-detail-body">
              <div className="survey-detail-image-wrap">
                <img
                  src={getImageSrc(detailItem.image || detailItem.image_url)}
                  alt="detail"
                  className="survey-detail-image"
                  onError={(e) => {
                    e.currentTarget.src = noImage;
                  }}
                />
              </div>

              <div className="survey-detail-info">
                <div className="detail-row">
                  <span>Tên nhà thuốc</span>
                  <b>{detailItem.name || "Không có"}</b>
                </div>

                <div className="detail-row">
                  <span>Địa chỉ</span>
                  <b>{detailItem.address || "Không có"}</b>
                </div>

                <div className="detail-grid">
                  <div>
                    <span>Tỉnh</span>
                    <b>{detailItem.province || "—"}</b>
                  </div>

                  <div>
                    <span>Huyện</span>
                    <b>{detailItem.district || "—"}</b>
                  </div>

                  <div>
                    <span>SĐT</span>
                    <b>{detailItem.phone || "Chưa có"}</b>
                  </div>

                  <div>
                    <span>Rating</span>
                    <b>{detailItem.rating || "0"}</b>
                  </div>

                  <div>
                    <span>Trạng thái</span>
                    <b>{detailItem.status || "Chưa cập nhật"}</b>
                  </div>

                  <div>
                    <span>Người khảo sát</span>
                    <b>{detailItem.surveyed_by || "Không rõ"}</b>
                  </div>

                  <div>
                    <span>Thời gian khảo sát</span>
                    <b>{formatDate(detailItem.surveyed_at)}</b>
                  </div>

                  <div>
                    <span>Tọa độ</span>
                    <b>
                      {detailItem.latitude && detailItem.longitude
                        ? `${Number(detailItem.latitude).toFixed(6)}, ${Number(
                            detailItem.longitude
                          ).toFixed(6)}`
                        : "Chưa có"}
                    </b>
                  </div>
                </div>

                <div className="detail-row">
                  <span>Chủ sở hữu</span>
                  <b>{detailItem.owner_name || "Chưa cập nhật"}</b>
                </div>

                <div className="detail-products nice-products">
                  <div className="product-section-header">
                    <div>
                      <h3>💊 Danh mục thuốc / sản phẩm đang bán</h3>
                      <p>
                        Các nhóm hàng được ghi nhận trong quá trình khảo sát
                        thực địa.
                      </p>
                    </div>

                    <span className="product-count-badge">
                      {formatProductGroups(detailItem.product_groups).length}{" "}
                      danh mục
                    </span>
                  </div>

                  {formatProductGroups(detailItem.product_groups).length > 0 ? (
                    <div className="product-category-grid">
                      {formatProductGroups(detailItem.product_groups).map(
                        (p, idx) => (
                          <div className="product-category-card" key={idx}>
                            <div className="product-category-icon">💊</div>

                            <div>
                              <div className="product-category-name">{p}</div>
                              <div className="product-category-desc">
                                Đã ghi nhận khi khảo sát
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="product-empty-box">
                      <div className="product-empty-icon">📦</div>
                      <div>
                        <b>Chưa cập nhật danh mục sản phẩm</b>
                        <p>
                          Nhà thuốc này chưa có dữ liệu nhóm thuốc đang bán.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="detail-actions">
                  <button
                    className="survey-edit-info-btn"
                    type="button"
                    onClick={() => openEditModal(detailItem)}
                  >
                    ✏️ Sửa thông tin
                  </button>

                  <button
                    className="survey-map-btn"
                    type="button"
                    onClick={() => handleOpenMap(detailItem)}
                  >
                    🗺️ Xem vị trí trên Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="survey-modal-overlay" onClick={() => setEditItem(null)}>
          <div
            className="survey-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="survey-detail-header">
              <div>
                <h2>✏️ Chỉnh sửa nhà thuốc</h2>
                <p>ID: {editItem.id}</p>
              </div>

              <button
                className="survey-close-btn"
                onClick={() => setEditItem(null)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="survey-edit-grid">
              <div className="survey-edit-field full">
                <label>Tên nhà thuốc</label>
                <input
                  value={editForm.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                />
              </div>

              <div className="survey-edit-field full">
                <label>Địa chỉ</label>
                <textarea
                  rows={3}
                  value={editForm.address}
                  onChange={(e) => handleEditChange("address", e.target.value)}
                />
              </div>

              <div className="survey-edit-field">
                <label>Tỉnh</label>
                <input
                  value={editForm.province}
                  onChange={(e) => handleEditChange("province", e.target.value)}
                />
              </div>

              <div className="survey-edit-field">
                <label>Huyện</label>
                <input
                  value={editForm.district}
                  onChange={(e) => handleEditChange("district", e.target.value)}
                />
              </div>

              <div className="survey-edit-field">
                <label>SĐT</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => handleEditChange("phone", e.target.value)}
                />
              </div>

              <div className="survey-edit-field">
                <label>Trạng thái</label>
                <input
                  value={editForm.status}
                  onChange={(e) => handleEditChange("status", e.target.value)}
                />
              </div>

              <div className="survey-edit-field">
                <label>Rating</label>
                <input
                  value={editForm.rating}
                  onChange={(e) => handleEditChange("rating", e.target.value)}
                />
              </div>

              <div className="survey-edit-field">
                <label>Chủ sở hữu</label>
                <input
                  value={editForm.owner_name}
                  onChange={(e) =>
                    handleEditChange("owner_name", e.target.value)
                  }
                />
              </div>

              <div className="survey-edit-field">
                <label>Latitude</label>
                <input
                  value={editForm.latitude}
                  onChange={(e) => handleEditChange("latitude", e.target.value)}
                />
              </div>

              <div className="survey-edit-field">
                <label>Longitude</label>
                <input
                  value={editForm.longitude}
                  onChange={(e) => handleEditChange("longitude", e.target.value)}
                />
              </div>

              <div className="survey-edit-field full">
                <label>Ảnh / image_url</label>
                <input
                  value={editForm.image}
                  onChange={(e) => handleEditChange("image", e.target.value)}
                />
              </div>

              <div className="survey-edit-field full">
                <label>Danh mục thuốc / sản phẩm</label>
                <textarea
                  rows={4}
                  placeholder="Ví dụ: Thuốc cảm, Vitamin, Thiết bị y tế"
                  value={editForm.product_groups}
                  onChange={(e) =>
                    handleEditChange("product_groups", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="survey-edit-actions">
              <button
                className="btn-cancel-edit"
                onClick={() => setEditItem(null)}
                type="button"
              >
                Hủy
              </button>

              <button
                className="btn-save-edit"
                onClick={handleSaveEdit}
                type="button"
              >
                💾 Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}