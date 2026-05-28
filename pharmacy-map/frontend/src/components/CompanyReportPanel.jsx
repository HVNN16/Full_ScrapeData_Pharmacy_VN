import { useEffect, useMemo, useState } from "react";
import {
  exportCompanySurveyReport,
  getCompanyAssignmentReport,
  getCompanyStaffSummaryReport,
  getCompanyStaffSurveyedPharmacies,
  getCompanySurveyedPharmacies,
} from "../api";

const isMobileView = () => window.innerWidth <= 768;

const btnBase = {
  border: "none",
  borderRadius: 14,
  padding: "11px 16px",
  fontWeight: 800,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const cardStyle = {
  background: "rgba(255,255,255,0.96)",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
  overflow: "hidden",
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
};

export default function CompanyReportPanel() {
  const [tab, setTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [selectedStaffName, setSelectedStaffName] = useState("Tất cả nhân viên");
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(isMobileView());

  useEffect(() => {
    const onResize = () => setIsMobile(isMobileView());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const totalSurveyed = useMemo(
    () => summary.reduce((sum, item) => sum + Number(item.surveyed_total || 0), 0),
    [summary]
  );

  const totalToday = useMemo(
    () => summary.reduce((sum, item) => sum + Number(item.surveyed_today || 0), 0),
    [summary]
  );

  const totalThisMonth = useMemo(
    () =>
      summary.reduce(
        (sum, item) => sum + Number(item.surveyed_this_month || 0),
        0
      ),
    [summary]
  );

  const totalAssignedPharmacies = useMemo(
    () =>
      assignments.reduce(
        (sum, item) => sum + Number(item.total_pharmacies_in_area || 0),
        0
      ),
    [assignments]
  );

  const loadAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryRes, assignmentRes, pharmacyRes] = await Promise.all([
        getCompanyStaffSummaryReport(),
        getCompanyAssignmentReport(),
        getCompanySurveyedPharmacies({ staffId: "all" }),
      ]);

      setSummary(Array.isArray(summaryRes?.data) ? summaryRes.data : []);
      setAssignments(Array.isArray(assignmentRes?.data) ? assignmentRes.data : []);
      setPharmacies(Array.isArray(pharmacyRes?.data) ? pharmacyRes.data : []);
    } catch (err) {
      console.error("Lỗi tải báo cáo company:", err);
      setError(err?.response?.data?.message || "Không tải được báo cáo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleViewStaffDetail = async (staff) => {
    setLoading(true);
    setError("");
    setSelectedStaffId(staff.staff_id);
    setSelectedStaffName(staff.staff_name || staff.staff_email || "Nhân viên");
    setTab("pharmacies");

    try {
      const res = await getCompanyStaffSurveyedPharmacies(staff.staff_id);
      setPharmacies(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi tải chi tiết nhân viên:", err);
      setError(err?.response?.data?.message || "Không tải được chi tiết nhân viên");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllPharmacies = async () => {
    setLoading(true);
    setError("");
    setSelectedStaffId("all");
    setSelectedStaffName("Tất cả nhân viên");
    setTab("pharmacies");

    try {
      const res = await getCompanySurveyedPharmacies({ staffId: "all" });
      setPharmacies(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi tải danh sách khảo sát:", err);
      setError(err?.response?.data?.message || "Không tải được danh sách khảo sát");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (staffId = "all") => {
    try {
      await exportCompanySurveyReport(staffId);
    } catch (err) {
      console.error("Lỗi export:", err);
      alert(err?.response?.data?.message || "Xuất báo cáo thất bại");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
        background: "linear-gradient(135deg,#f8fbff 0%,#eef4ff 100%)",
        padding: isMobile ? 12 : 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          width: "100%",
          margin: "0 auto",
          display: "grid",
          gap: 16,
          minWidth: 0,
        }}
      >
        <Header onReload={loadAll} isMobile={isMobile} />

        <div
          style={{
            ...cardStyle,
            padding: isMobile ? 14 : 18,
            borderRadius: isMobile ? 18 : 22,
          }}
        >
          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: "#fee2e2",
                color: "#991b1b",
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              ⏳ Đang tải báo cáo...
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr 1fr"
                : "repeat(auto-fit,minmax(200px,1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatBox icon="👥" label="Nhân viên" value={summary.length} isMobile={isMobile} />
            <StatBox icon="🧭" label="Vùng đã giao" value={assignments.length} isMobile={isMobile} />
            <StatBox icon="💊" label="Nhà thuốc được giao" value={totalAssignedPharmacies} isMobile={isMobile} />
            <StatBox icon="✅" label="Đã khảo sát" value={totalSurveyed} isMobile={isMobile} />
            <StatBox
              icon="📅"
              label="Hôm nay"
              value={totalToday}
              sub={`Tháng này: ${totalThisMonth}`}
              isMobile={isMobile}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: isMobile ? "auto" : "visible",
              flexWrap: isMobile ? "nowrap" : "wrap",
              paddingBottom: isMobile ? 6 : 0,
            }}
          >
            <TabButton active={tab === "summary"} onClick={() => setTab("summary")} isMobile={isMobile}>
              👥 Nhân viên
            </TabButton>

            <TabButton active={tab === "assignments"} onClick={() => setTab("assignments")} isMobile={isMobile}>
              🧭 Vùng giao
            </TabButton>

            <TabButton active={tab === "pharmacies"} onClick={handleViewAllPharmacies} isMobile={isMobile}>
              💊 Nhà thuốc khảo sát
            </TabButton>

            <button
              onClick={() => handleExport("all")}
              style={{
                ...btnBase,
                background: "linear-gradient(135deg,#16a34a,#22c55e)",
                color: "#fff",
                marginLeft: isMobile ? 0 : "auto",
                minWidth: isMobile ? 190 : "auto",
                flexShrink: 0,
                boxShadow: "0 10px 22px rgba(22,163,74,0.2)",
              }}
            >
              📥 Xuất tất cả CSV
            </button>
          </div>
        </div>

        {tab === "summary" && (
          <SectionCard title="👥 Thống kê theo nhân viên" isMobile={isMobile}>
            <Table minWidth={isMobile ? 820 : 900}>
              <thead>
                <tr>
                  <Th>Nhân viên</Th>
                  <Th>Email</Th>
                  <Th>Vùng</Th>
                  <Th>Đã khảo sát</Th>
                  <Th>Hôm nay</Th>
                  <Th>Tháng này</Th>
                  <Th>Lần cuối</Th>
                  <Th>Thao tác</Th>
                </tr>
              </thead>

              <tbody>
                {summary.map((item) => (
                  <tr key={item.staff_id}>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={item.staff_name || item.staff_email} />
                        <b>{item.staff_name || "—"}</b>
                      </div>
                    </Td>
                    <Td>{item.staff_email || "—"}</Td>
                    <Td>{item.assigned_area_count || 0}</Td>
                    <Td>
                      <Badge>{item.surveyed_total || 0}</Badge>
                    </Td>
                    <Td>{item.surveyed_today || 0}</Td>
                    <Td>{item.surveyed_this_month || 0}</Td>
                    <Td>{formatDate(item.last_surveyed_at)}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <SmallButton
                          bg="#dbeafe"
                          color="#1d4ed8"
                          onClick={() => handleViewStaffDetail(item)}
                        >
                          Xem
                        </SmallButton>
                        <SmallButton
                          bg="#dcfce7"
                          color="#15803d"
                          onClick={() => handleExport(item.staff_id)}
                        >
                          CSV
                        </SmallButton>
                      </div>
                    </Td>
                  </tr>
                ))}

                {!summary.length && (
                  <tr>
                    <Td colSpan={8}>Chưa có nhân viên hoặc dữ liệu khảo sát.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </SectionCard>
        )}

        {tab === "assignments" && (
          <SectionCard title="🧭 Vùng nào đang giao cho nhân viên nào" isMobile={isMobile}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(280px,1fr))",
                gap: 12,
              }}
            >
              {assignments.map((item) => (
                <div
                  key={item.assignment_id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    border: "1px solid #e2e8f0",
                    background: "linear-gradient(135deg,#ffffff,#f8fafc)",
                    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 16 }}>
                    📍 {item.area_name || `Vùng #${item.area_id}`}
                  </div>

                  <div style={{ marginTop: 8, color: "#475569", fontSize: 13 }}>
                    👤 {item.staff_name || "—"}
                  </div>

                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {item.staff_email || "—"}
                  </div>

                  <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                    <Badge>💊 Tổng nhà thuốc: {item.total_pharmacies_in_area || 0}</Badge>
                    <Badge>✅ Đã khảo sát: {item.surveyed_count || 0}</Badge>
                    <Badge>⏳ Còn lại: {item.remaining_count || 0}</Badge>
                  </div>

                  <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
                    Giao lúc: {formatDate(item.assigned_at)}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => {
                        localStorage.setItem(
                          "company_selected_area",
                          JSON.stringify(item)
                        );

                        window.location.href = "/";
                      }}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 14px",
                        background: "linear-gradient(135deg,#2563eb,#3b82f6)",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      🗺️ Xem trên bản đồ
                    </button>
                  </div>
                </div>
              ))}

              {!assignments.length && (
                <div style={{ color: "#64748b", fontWeight: 800 }}>
                  Chưa có vùng nào được giao.
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {tab === "pharmacies" && (
          <SectionCard
            title={`💊 Nhà thuốc đã khảo sát - ${selectedStaffName}`}
            isMobile={isMobile}
            right={
              <button
                onClick={() => handleExport(selectedStaffId)}
                style={{
                  ...btnBase,
                  background: "linear-gradient(135deg,#16a34a,#22c55e)",
                  color: "#fff",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                📥 Xuất CSV
              </button>
            }
          >
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
              Tổng: <b>{pharmacies.length}</b> nhà thuốc
            </div>

            <Table maxHeight={520} minWidth={isMobile ? 950 : 1000}>
              <thead>
                <tr>
                  <Th>Nhà thuốc</Th>
                  <Th>Địa chỉ</Th>
                  <Th>Liên hệ</Th>
                  <Th>Chủ sở hữu</Th>
                  <Th>Người khảo sát</Th>
                  <Th>Thời gian</Th>
                  <Th>Ảnh</Th>
                </tr>
              </thead>

              <tbody>
                {pharmacies.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <b>{p.name || "—"}</b>
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        #{p.id} · ⭐ {p.rating ?? "—"}
                      </div>
                    </Td>
                    <Td>
                      <div>{p.address || "—"}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        {p.district || "—"}, {p.province || "—"}
                      </div>
                    </Td>
                    <Td>{p.phone || "—"}</Td>
                    <Td>{p.owner_name || "—"}</Td>
                    <Td>{p.surveyed_by_name || "—"}</Td>
                    <Td>{formatDate(p.surveyed_at)}</Td>
                    <Td>
                      {p.image_url ? (
                        <a
                          href={p.image_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#2563eb", fontWeight: 800 }}
                        >
                          Xem ảnh
                        </a>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                ))}

                {!pharmacies.length && (
                  <tr>
                    <Td colSpan={7}>Chưa có nhà thuốc khảo sát.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function Header({ onReload, isMobile }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(14px)",
        border: "1px solid #e2e8f0",
        borderRadius: isMobile ? 20 : 26,
        padding: isMobile ? 14 : 20,
        boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: isMobile ? 48 : 64,
            height: isMobile ? 48 : 64,
            minWidth: isMobile ? 48 : 64,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg,#2563eb,#7c3aed)",
            color: "#fff",
            fontSize: isMobile ? 22 : 28,
            boxShadow: "0 14px 28px rgba(37,99,235,0.25)",
          }}
        >
          💊
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? 21 : 30,
              fontWeight: 900,
              color: "#1d4ed8",
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}
          >
            Pharmacy Company Dashboard
          </div>
          <div style={{ marginTop: 4, color: "#64748b", fontSize: isMobile ? 12 : 14 }}>
            Quản lý vùng giao, nhân viên khảo sát và báo cáo doanh nghiệp
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto",
          gap: 10,
          width: isMobile ? "100%" : "auto",
        }}
      >
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            ...btnBase,
            background: "linear-gradient(135deg,#2563eb,#3b82f6)",
            color: "#fff",
            boxShadow: "0 10px 22px rgba(37,99,235,0.18)",
            minWidth: 0,
          }}
        >
          ← Bản đồ
        </button>

        <button
          onClick={onReload}
          style={{
            ...btnBase,
            background: "linear-gradient(135deg,#0ea5e9,#38bdf8)",
            color: "#fff",
            minWidth: 0,
          }}
        >
          🔄 Tải lại
        </button>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, sub, isMobile }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: isMobile ? 12 : 16,
        background: "linear-gradient(135deg,#f8fafc,#ffffff)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 22px rgba(15,23,42,0.04)",
        minWidth: 0,
      }}
    >
      <div style={{ color: "#64748b", fontSize: isMobile ? 11 : 13, fontWeight: 800 }}>
        {icon} {label}
      </div>
      <div
        style={{
          color: "#0f172a",
          fontSize: isMobile ? 22 : 30,
          fontWeight: 900,
          marginTop: 6,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ color: "#64748b", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, children, right, isMobile }) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: isMobile ? 14 : 18,
        borderRadius: isMobile ? 18 : 22,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: 12,
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            color: "#0f172a",
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.35,
          }}
        >
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function TabButton({ active, onClick, children, isMobile }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnBase,
        background: active
          ? "linear-gradient(135deg,#2563eb,#3b82f6)"
          : "#f1f5f9",
        color: active ? "#fff" : "#334155",
        minHeight: 46,
        minWidth: isMobile ? 150 : "auto",
        flexShrink: 0,
        boxShadow: active ? "0 10px 20px rgba(37,99,235,0.18)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function Table({ children, maxHeight, minWidth = 900 }) {
  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        maxHeight,
        overflowY: maxHeight ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table
        style={{
          width: "100%",
          minWidth,
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: 13,
          overflow: "hidden",
          borderRadius: 16,
        }}
      >
        {children}
      </table>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: 12,
        background: "#f8fafc",
        color: "#334155",
        borderBottom: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, colSpan }) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: 12,
        verticalAlign: "top",
        borderBottom: "1px solid #e2e8f0",
        background: "#fff",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function Badge({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "5px 11px",
        borderRadius: 999,
        background: "#dcfce7",
        color: "#15803d",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SmallButton({ children, onClick, bg, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 10,
        padding: "8px 10px",
        background: bg,
        color,
        fontWeight: 900,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Avatar({ name }) {
  const first = String(name || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: 34,
        height: 34,
        minWidth: 34,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg,#2563eb,#7c3aed)",
        color: "#fff",
        fontWeight: 900,
      }}
    >
      {first}
    </div>
  );
}