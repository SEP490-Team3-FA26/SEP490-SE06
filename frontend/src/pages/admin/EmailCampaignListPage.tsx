import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Plus,
  Send,
  Eye,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  BarChart2,
  Search,
  Filter,
  ChevronRight,
  Trash2,
  Edit3,
  AlertOctagon,
} from "lucide-react";
import { useEmailCampaignManagement } from "../../hooks/useEmailCampaignManagement";
import { EmailCampaignData } from "../../services/sales/emailCampaign.service";

// ===================================================================
// Badge trạng thái chiến dịch với màu sắc tương ứng
// ===================================================================
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    DRAFT: { label: "Nháp", color: "#64748b", icon: <Clock size={12} /> },
    SCHEDULED: { label: "Đã lên lịch", color: "#0284c7", icon: <Clock size={12} /> },
    PROCESSING: { label: "Đang gửi...", color: "#d97706", icon: <RefreshCw size={12} className="animate-spin" /> },
    COMPLETED: { label: "Hoàn tất", color: "#16a34a", icon: <CheckCircle2 size={12} /> },
    PARTIAL_FAILED: { label: "Gửi lỗi một phần", color: "#dc2626", icon: <AlertTriangle size={12} /> },
    CANCELLED: { label: "Đã hủy", color: "#6b7280", icon: <XCircle size={12} /> },
  };
  const cfg = configs[status] || configs["DRAFT"];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: cfg.color + "1a",
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ===================================================================
// Modal thống kê real-time của 1 chiến dịch
// ===================================================================
const StatsModal: React.FC<{
  campaignId: string;
  onClose: () => void;
  loadStats: (id: string) => void;
  stats: any;
  statsLoading: boolean;
}> = ({ campaignId, onClose, loadStats, stats, statsLoading }) => {
  React.useEffect(() => {
    loadStats(campaignId);
    // Tự động refresh stats mỗi 5 giây khi đang PROCESSING
    const interval = setInterval(() => loadStats(campaignId), 5000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const progress =
    stats?.stats?.totalRecipients > 0
      ? Math.round(
          ((stats.realtimeStats?.sentCount || 0) / stats.stats.totalRecipients) * 100,
        )
      : 0;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff", borderRadius: 16, padding: 32, width: 480,
          boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            📊 Thống kê chiến dịch
          </h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}>
            <XCircle size={20} />
          </button>
        </div>

        {statsLoading && !stats ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <div>Đang tải thống kê...</div>
          </div>
        ) : stats ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>
                Tiến độ gửi email
              </div>
              <div style={{ background: "#f1f5f9", borderRadius: 8, height: 12, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: progress === 100 ? "#16a34a" : "#0284c7",
                    borderRadius: 8,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, textAlign: "right" }}>
                {progress}%
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Tổng người nhận", value: stats.stats?.totalRecipients || 0, color: "#0284c7" },
                { label: "Đã gửi thành công", value: stats.realtimeStats?.sentCount || 0, color: "#16a34a" },
                { label: "Gửi thất bại", value: stats.realtimeStats?.failedCount || 0, color: "#dc2626" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: item.color + "0d",
                    border: `1px solid ${item.color}22`,
                    borderRadius: 12, padding: "16px 12px", textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>
                    {item.value.toLocaleString("vi-VN")}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13 }}>
              <RefreshCw size={12} />
              Tự động cập nhật mỗi 5 giây
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "#64748b" }}>Không có dữ liệu thống kê</div>
        )}
      </div>
    </div>
  );
};

// ===================================================================
// TRANG CHÍNH: Danh sách & Quản lý chiến dịch Email Newsletter
// ===================================================================
const EmailCampaignListPage: React.FC = () => {
  const {
    campaigns, loading, submitting, error, stats, statsLoading,
    refresh, triggerCampaign, cancelCampaign, deleteCampaign, loadCampaignStats,
  } = useEmailCampaignManagement();

  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/director")
    ? "/director/marketing/email-campaigns"
    : "/admin/marketing/email-campaigns";

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statsModalId, setStatsModalId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EmailCampaignData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailCampaignData | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Hiển thị toast thông báo tự đóng sau 3 giây
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // Lọc danh sách chiến dịch theo tìm kiếm và status
  const filtered = campaigns.filter((c) => {
    const matchSearch =
      !searchText ||
      c.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      c.subject?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Xử lý kích hoạt / retry gửi email
  const handleTrigger = async (campaign: EmailCampaignData) => {
    const label =
      campaign.status === "PARTIAL_FAILED" ? "retry gửi lại" : "kích hoạt gửi";
    if (!window.confirm(`Xác nhận ${label} chiến dịch "${campaign.title}"?`)) return;

    const result = await triggerCampaign(campaign._id!);
    if (result.success) {
      showToast("success", `✅ Đã ${label} chiến dịch! Hệ thống đang xử lý ngầm...`);
    } else {
      showToast("error", result.error || "Lỗi khi kích hoạt chiến dịch");
    }
  };

  // Xử lý xác nhận hủy lịch phát tán
  const handleConfirmCancel = async () => {
    if (!cancelTarget?._id) return;
    const result = await cancelCampaign(cancelTarget._id);
    if (result.success) {
      showToast("success", `🛑 Đã hủy lịch phát tán chiến dịch "${cancelTarget.title}"`);
      setCancelTarget(null);
    } else {
      showToast("error", result.error || "Lỗi khi hủy lịch phát tán");
    }
  };

  // Xử lý xác nhận xóa vĩnh viễn
  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id) return;
    const result = await deleteCampaign(deleteTarget._id);
    if (result.success) {
      showToast("success", `🗑️ Đã xóa thành công chiến dịch "${deleteTarget.title}"`);
      setDeleteTarget(null);
    } else {
      showToast("error", result.error || "Lỗi khi xóa chiến dịch");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, Arial, sans-serif" }}>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: toast.type === "success" ? "#16a34a" : "#dc2626",
            color: "#fff", borderRadius: 12, padding: "12px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)", fontSize: 14, fontWeight: 600,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)",
          padding: "32px 40px", color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Mail size={28} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
                Email Newsletter Marketing
              </h1>
              <p style={{ margin: 0, opacity: 0.85, fontSize: 14, marginTop: 4 }}>
                Quản lý chiến dịch gửi email khuyến mãi tự động đến khách hàng
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`${basePath}/new`)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#fff", color: "#0284c7",
              padding: "10px 20px", borderRadius: 10,
              fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <Plus size={16} />
            Tạo chiến dịch mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "24px 40px 0" }}>
        <div
          style={{
            display: "flex", gap: 12, background: "#fff",
            borderRadius: 12, padding: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên chiến dịch hoặc tiêu đề email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%", paddingLeft: 40, paddingRight: 16, height: 40,
                border: "1px solid #e2e8f0", borderRadius: 8,
                fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} style={{ color: "#64748b" }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: 40, padding: "0 12px", border: "1px solid #e2e8f0",
                borderRadius: 8, fontSize: 14, outline: "none",
                background: "#fff", cursor: "pointer",
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Nháp</option>
              <option value="SCHEDULED">Đã lên lịch</option>
              <option value="PROCESSING">Đang gửi</option>
              <option value="COMPLETED">Hoàn tất</option>
              <option value="PARTIAL_FAILED">Gửi lỗi một phần</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <button
            onClick={() => refresh()}
            disabled={loading}
            style={{
              height: 40, paddingInline: 16, borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              fontSize: 14, color: "#64748b",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Campaign List */}
      <div style={{ padding: 24, paddingInline: 40 }}>
        {error && (
          <div
            style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 12, padding: 16, color: "#dc2626",
              marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading && !campaigns.length ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            <RefreshCw size={32} style={{ margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 15 }}>Đang tải danh sách chiến dịch...</div>
          </div>
        ) : !filtered.length ? (
          <div
            style={{
              textAlign: "center", padding: "60px 0", color: "#94a3b8",
              background: "#fff", borderRadius: 16, border: "2px dashed #e2e8f0",
            }}
          >
            <Mail size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Chưa có chiến dịch email nào
            </div>
            <div style={{ fontSize: 14 }}>
              Hãy tạo chiến dịch đầu tiên để bắt đầu gửi email marketing đến khách hàng
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((campaign) => {
              const sentPct =
                campaign.stats?.totalRecipients > 0
                  ? Math.round(
                      (campaign.stats.sentCount / campaign.stats.totalRecipients) * 100,
                    )
                  : 0;

              return (
                <div
                  key={campaign._id}
                  style={{
                    background: "#fff", borderRadius: 14,
                    padding: "20px 24px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    border: "1px solid #f1f5f9",
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.boxShadow =
                      "0 4px 16px rgba(2,132,199,0.12)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.06)")
                  }
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      {/* Tên & trạng thái */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                          {campaign.title}
                        </h3>
                        <StatusBadge status={campaign.status || "DRAFT"} />
                      </div>

                      {/* Tiêu đề email */}
                      <p style={{ margin: 0, fontSize: 14, color: "#64748b", marginBottom: 12 }}>
                        📧 {campaign.subject}
                      </p>

                      {/* Metadata */}
                      <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#94a3b8" }}>
                        <span>
                          🎯 Đối tượng:{" "}
                          <strong style={{ color: campaign.targetAudience === "VIP" ? "#b45309" : "#64748b" }}>
                            {campaign.targetAudience === "VIP"
                              ? "⭐ Khách hàng VIP"
                              : "🌐 Tất cả khách hàng"}
                          </strong>
                        </span>
                        <span>
                          📅 Lịch gửi:{" "}
                          <strong style={{ color: "#64748b" }}>
                            {campaign.scheduledAt
                              ? new Date(campaign.scheduledAt).toLocaleString("vi-VN")
                              : "—"}
                          </strong>
                        </span>
                        {campaign.voucherCode && (
                          <span>
                            🎟️ Voucher: <strong style={{ color: "#0284c7" }}>{campaign.voucherCode}</strong>
                          </span>
                        )}
                      </div>

                      {/* Progress bar gửi email (chỉ hiển thị khi có data) */}
                      {campaign.stats && campaign.stats.totalRecipients > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div
                            style={{
                              display: "flex", justifyContent: "space-between",
                              fontSize: 12, color: "#64748b", marginBottom: 4,
                            }}
                          >
                            <span>
                              {campaign.stats.sentCount.toLocaleString("vi-VN")} /{" "}
                              {campaign.stats.totalRecipients.toLocaleString("vi-VN")} email đã gửi
                            </span>
                            <span style={{ fontWeight: 700, color: sentPct === 100 ? "#16a34a" : "#0284c7" }}>
                              {sentPct}%
                            </span>
                          </div>
                          <div style={{ background: "#f1f5f9", borderRadius: 6, height: 6 }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${sentPct}%`,
                                background: sentPct === 100 ? "#16a34a" : "#0284c7",
                                borderRadius: 6,
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cụm nút thao tác (Actions) */}
                    <div style={{ display: "flex", gap: 6, marginLeft: 20, flexShrink: 0, alignItems: "center" }}>
                      {/* 1. Xem thống kê phát tán */}
                      <button
                        onClick={() => setStatsModalId(campaign._id!)}
                        title="Xem thống kê phát tán"
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          border: "1px solid #e2e8f0", background: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "#64748b",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#0284c7";
                          e.currentTarget.style.color = "#0284c7";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.color = "#64748b";
                        }}
                      >
                        <BarChart2 size={15} />
                      </button>

                      {/* 2. Chỉnh sửa chiến dịch (DRAFT, SCHEDULED, CANCELLED) */}
                      {campaign.status !== "PROCESSING" && (
                        <button
                          onClick={() => navigate(`${basePath}/${campaign._id}`)}
                          title="Chỉnh sửa nội dung & thiết lập"
                          style={{
                            width: 36, height: 36, borderRadius: 8,
                            border: "1px solid #e2e8f0", background: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "#0284c7",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f0f9ff";
                            e.currentTarget.style.borderColor = "#bae6fd";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                      )}

                      {/* 3. Hủy lịch phát tán (Chỉ khi đang SCHEDULED) */}
                      {campaign.status === "SCHEDULED" && (
                        <button
                          onClick={() => setCancelTarget(campaign)}
                          disabled={submitting}
                          title="Hủy lịch phát tán tự động"
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "0 10px", height: 36, borderRadius: 8,
                            border: "1px solid #fde68a", background: "#fffbeb",
                            cursor: "pointer", color: "#d97706",
                            fontWeight: 600, fontSize: 13,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#fef3c7";
                            e.currentTarget.style.borderColor = "#f59e0b";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fffbeb";
                            e.currentTarget.style.borderColor = "#fde68a";
                          }}
                        >
                          <XCircle size={14} />
                          <span>Hủy lịch</span>
                        </button>
                      )}

                      {/* 4. Kích hoạt gửi ngay / Retry */}
                      {(campaign.status === "SCHEDULED" ||
                        campaign.status === "DRAFT" ||
                        campaign.status === "PARTIAL_FAILED") && (
                        <button
                          onClick={() => handleTrigger(campaign)}
                          disabled={submitting}
                          title={campaign.status === "PARTIAL_FAILED" ? "Retry gửi lại" : "Kích hoạt gửi ngay"}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "0 14px", height: 36, borderRadius: 8,
                            border: "none", cursor: "pointer",
                            background: campaign.status === "PARTIAL_FAILED" ? "#dc2626" : "#0284c7",
                            color: "#fff", fontWeight: 600, fontSize: 13,
                            boxShadow: "0 2px 6px rgba(2,132,199,0.25)",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.9";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          {campaign.status === "PARTIAL_FAILED" ? (
                            <><RefreshCw size={13} /> Retry</>
                          ) : (
                            <><Send size={13} /> Gửi ngay</>
                          )}
                        </button>
                      )}

                      {/* 5. Xóa chiến dịch vĩnh viễn (Trừ khi đang PROCESSING) */}
                      {campaign.status !== "PROCESSING" && (
                        <button
                          onClick={() => setDeleteTarget(campaign)}
                          disabled={submitting}
                          title="Xóa vĩnh viễn chiến dịch"
                          style={{
                            width: 36, height: 36, borderRadius: 8,
                            border: "1px solid #fee2e2", background: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "#ef4444",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#fef2f2";
                            e.currentTarget.style.borderColor = "#fca5a5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.borderColor = "#fee2e2";
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      {/* 6. Xem chi tiết */}
                      <button
                        onClick={() => navigate(`${basePath}/${campaign._id}`)}
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          border: "1px solid #e2e8f0", background: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "#64748b",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#0284c7";
                          e.currentTarget.style.color = "#0284c7";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.color = "#64748b";
                        }}
                        title="Xem chi tiết chiến dịch"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Modal */}
      {statsModalId && (
        <StatsModal
          campaignId={statsModalId}
          onClose={() => setStatsModalId(null)}
          loadStats={loadCampaignStats}
          stats={stats}
          statsLoading={statsLoading}
        />
      )}

      {/* Modal xác nhận HỦY LỊCH PHÁT TÁN */}
      {cancelTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setCancelTarget(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 16, padding: "28px 32px",
              maxWidth: 480, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "#fffbeb", border: "1px solid #fde68a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#d97706", flexShrink: 0,
                }}
              >
                <XCircle size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                  Xác nhận hủy lịch phát tán?
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                  Chiến dịch sẽ dừng phát tán và chuyển về trạng thái Đã hủy
                </p>
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                {cancelTarget.title}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                📧 Tiêu đề: {cancelTarget.subject}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                📅 Lịch dự kiến: {cancelTarget.scheduledAt ? new Date(cancelTarget.scheduledAt).toLocaleString("vi-VN") : "—"}
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
              Hệ thống cron job sẽ không tự động quét và không phát tán email khuyến mãi này tới khách hàng nữa. Anh có thể lên lịch lại bất kỳ lúc nào.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={submitting}
                style={{
                  padding: "10px 18px", borderRadius: 8,
                  border: "1px solid #e2e8f0", background: "#fff",
                  fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer",
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={submitting}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: "#d97706", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
                }}
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                <span>{submitting ? "Đang hủy..." : "Xác nhận hủy lịch"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận XÓA VĨNH VIỄN CHIẾN DỊCH */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 16, padding: "28px 32px",
              maxWidth: 480, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#ef4444", flexShrink: 0,
                }}
              >
                <AlertOctagon size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                  Xác nhận xóa vĩnh viễn?
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>

            <div
              style={{
                background: "#fef2f2", border: "1px solid #fee2e2",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>
                {deleteTarget.title}
              </div>
              <div style={{ fontSize: 12, color: "#b91c1c" }}>
                📧 {deleteTarget.subject}
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
              Chiến dịch này cùng toàn bộ thông số thống kê và nhật ký gửi thư liên quan sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={submitting}
                style={{
                  padding: "10px 18px", borderRadius: 8,
                  border: "1px solid #e2e8f0", background: "#fff",
                  fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer",
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: "#dc2626", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)",
                }}
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{submitting ? "Đang xóa..." : "Xác nhận xóa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { EmailCampaignListPage };
export default EmailCampaignListPage;
