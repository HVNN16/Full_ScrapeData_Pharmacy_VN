// import React, { useMemo, useState } from "react";
// import AdminLayout from "./layout/AdminLayout";
// import PharmacyTable from "./PharmacyTable";
// import PharmacyForm from "./PharmacyForm";
// import UserTable from "./UserTable";

// export default function AdminDashboard() {
//   const [selected, setSelected] = useState(null);
//   const [activeTab, setActiveTab] = useState("pharmacies");

//   const role = useMemo(() => localStorage.getItem("role"), []);

//   if (role !== "admin") {
//     return (
//       <AdminLayout>
//         <div className="admin-content">
//           <div className="admin-title">
//             <h1>⛔ Không có quyền truy cập</h1>
//           </div>
//           <p>Chỉ tài khoản admin mới được vào trang quản trị.</p>
//         </div>
//       </AdminLayout>
//     );
//   }

//   return (
//     <AdminLayout>
//       <div className="admin-dashboard">
//         <div className="admin-title">
//           <h1>🛠 Trang quản trị</h1>
//         </div>

//         <div className="admin-tabs">
//           <button
//             className={`admin-tab ${activeTab === "pharmacies" ? "active" : ""}`}
//             onClick={() => setActiveTab("pharmacies")}
//             type="button"
//           >
//             📋 Quản lý nhà thuốc
//           </button>

//           <button
//             className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
//             onClick={() => setActiveTab("users")}
//             type="button"
//           >
//             👤 Quản lý user
//           </button>
//         </div>

//         <div className="admin-view">
//           {activeTab === "pharmacies" && (
//             <>
//               <div className="admin-title">
//                 <h1>📋 Quản lý nhà thuốc</h1>

//                 <button
//                   className="btn btn-blue"
//                   onClick={() => setSelected({})}
//                   type="button"
//                 >
//                   ➕ Thêm nhà thuốc
//                 </button>
//               </div>

//               <PharmacyTable onEdit={setSelected} />

//               {selected && (
//                 <PharmacyForm
//                   selected={selected}
//                   onClose={() => setSelected(null)}
//                 />
//               )}
//             </>
//           )}

//           {activeTab === "users" && (
//             <>
//               <div className="admin-title">
//                 <h1>👤 Quản lý user</h1>
//               </div>

//               <UserTable />
//             </>
//           )}
//         </div>
//       </div>
//     </AdminLayout>
//   );
// }

import React, { useMemo, useState } from "react";
import AdminLayout from "./layout/AdminLayout";
import PharmacyTable from "./PharmacyTable";
import PharmacyForm from "./PharmacyForm";
import UserTable from "./UserTable";
import SurveyManagement from "./SurveyManagement";

export default function AdminDashboard() {
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("pharmacies");

  const role = useMemo(() => localStorage.getItem("role"), []);

  if (role !== "admin") {
    return (
      <AdminLayout>
        <div className="admin-content">
          <div className="admin-title">
            <h1>⛔ Không có quyền truy cập</h1>
          </div>
          <p>Chỉ tài khoản admin mới được vào trang quản trị.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <div className="admin-title">
          <h1>🛠 Trang quản trị</h1>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "pharmacies" ? "active" : ""}`}
            onClick={() => setActiveTab("pharmacies")}
            type="button"
          >
            📋 Quản lý nhà thuốc
          </button>

          <button
            className={`admin-tab ${activeTab === "surveys" ? "active" : ""}`}
            onClick={() => setActiveTab("surveys")}
            type="button"
          >
            📍 Quản lý khảo sát
          </button>

          <button
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
            type="button"
          >
            👤 Quản lý user
          </button>
        </div>

        <div className="admin-view">
          {activeTab === "pharmacies" && (
            <>
              <div className="admin-title">
                <h1>📋 Quản lý nhà thuốc</h1>

                <button
                  className="btn btn-blue"
                  onClick={() => setSelected({})}
                  type="button"
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
            </>
          )}

          {activeTab === "surveys" && (
            <>
              <SurveyManagement />
            </>
          )}

          {activeTab === "users" && (
            <>
              <div className="admin-title">
                <h1>👤 Quản lý user</h1>
              </div>

              <UserTable />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}