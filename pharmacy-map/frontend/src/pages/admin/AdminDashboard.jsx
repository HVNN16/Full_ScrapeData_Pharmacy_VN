import React, { useState } from "react";
import AdminLayout from "./layout/AdminLayout";
import PharmacyTable from "./PharmacyTable";
import PharmacyForm from "./PharmacyForm";

export default function AdminDashboard() {
  const [selected, setSelected] = useState(null);

  return (
    <AdminLayout>
      <div className="admin-title">
        <h1>📋 Quản lý nhà thuốc</h1>

        <button
          className="btn btn-blue"
          onClick={() => setSelected({})}
        >
          ➕ Thêm nhà thuốc
        </button>
      </div>

      <PharmacyTable onEdit={setSelected} />

      {selected && (
        <PharmacyForm
          selected={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </AdminLayout>
  );
}
