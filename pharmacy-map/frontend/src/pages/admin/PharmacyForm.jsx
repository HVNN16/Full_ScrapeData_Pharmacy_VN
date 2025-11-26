import React, { useState } from "react";
import api from "../../api";
import "../admin/layout/pharmacyForm.css";   // ← CSS mới

export default function PharmacyForm({ selected, onClose }) {
  const [form, setForm] = useState(selected || {});

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const save = async () => {
    if (form.id) {
      await api.put(`/admin/pharmacies/${form.id}`, form);
    } else {
      await api.post(`/admin/pharmacies`, form);
    }
    onClose();
    window.location.reload();
  };

  return (
    <div className="modal-bg">
      <div className="modal-box">
        <h2>{form.id ? "Sửa nhà thuốc" : "Thêm nhà thuốc"}</h2>

        {[
          "name",
          "address",
          "province",
          "district",
          "phone",
          "status",
          "rating",
          "latitude",
          "longitude",
        ].map((key) => (
          <input
            key={key}
            name={key}
            placeholder={key}
            value={form[key] || ""}
            onChange={change}
          />
        ))}

        <button className="btn btn-blue" onClick={save}>
          💾 Lưu
        </button>
        <button className="btn btn-green" onClick={onClose}>
          ❌ Hủy
        </button>
      </div>
    </div>
  );
}
