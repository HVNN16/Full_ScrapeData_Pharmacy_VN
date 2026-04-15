import React, { useEffect, useState } from "react";
import api from "../../api";
import "./layout/admin.css";

export default function PharmacyForm({ selected, onClose }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    province: "",
    district: "",
    status: "",
    rating: "",
    latitude: "",
    longitude: "",
    image: "",
  });

  useEffect(() => {
    if (selected && Object.keys(selected).length > 0) {
      setForm({
        name: selected.name || "",
        address: selected.address || "",
        province: selected.province || "",
        district: selected.district || "",
        status: selected.status || "",
        rating: selected.rating || "",
        latitude: selected.latitude || "",
        longitude: selected.longitude || "",
        image: selected.image || "",
      });
    }
  }, [selected]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (selected?.id) {
        await api.put(`/admin/pharmacies/${selected.id}`, form);
      } else {
        await api.post("/admin/pharmacies", form);
      }

      alert("✅ Lưu thành công");
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("❌ Lưu thất bại");
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2>{selected?.id ? "Sửa nhà thuốc" : "Thêm nhà thuốc"}</h2>
          <button className="admin-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form-body">
            <input
              name="name"
              placeholder="name"
              value={form.name}
              onChange={handleChange}
            />
            <input
              name="address"
              placeholder="address"
              value={form.address}
              onChange={handleChange}
            />
            <input
              name="province"
              placeholder="province"
              value={form.province}
              onChange={handleChange}
            />
            <input
              name="district"
              placeholder="district"
              value={form.district}
              onChange={handleChange}
            />
            <input
              name="status"
              placeholder="status"
              value={form.status}
              onChange={handleChange}
            />
            <input
              name="rating"
              placeholder="rating"
              value={form.rating}
              onChange={handleChange}
            />
            <input
              name="latitude"
              placeholder="latitude"
              value={form.latitude}
              onChange={handleChange}
            />
            <input
              name="longitude"
              placeholder="longitude"
              value={form.longitude}
              onChange={handleChange}
            />
            <input
              name="image"
              placeholder="image"
              value={form.image}
              onChange={handleChange}
            />
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn-save">
              💾 Lưu
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>
              ❌ Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}