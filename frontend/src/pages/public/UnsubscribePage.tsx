import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MailX, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, HeartHandshake } from "lucide-react";
import api from "../../services/core/api";

export const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("too_frequent");
  const [confirmed, setConfirmed] = useState<boolean>(false);

  // Xử lý xác nhận hủy đăng ký
  const handleUnsubscribe = async () => {
    if (!token || !email) {
      setError("Đường dẫn hủy đăng ký không hợp lệ hoặc thiếu thông tin xác thực.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/public/newsletter/unsubscribe", {
        params: { token, email },
      });

      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || "Không thể xử lý yêu cầu hủy đăng ký.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Có lỗi xảy ra trong quá trình hủy đăng ký. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
      setConfirmed(true);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #eff6ff 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0,0,0,0.04)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Banner header y tế */}
        <div
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            padding: "28px 24px",
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              backdropFilter: "blur(4px)",
            }}
          >
            <MailX size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            Hủy Đăng Ký Nhận Email
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, margin: "6px 0 0 0" }}>
            Hệ Thống Nhà Thuốc Chuỗi ABC Pharmacy
          </p>
        </div>

        {/* Thân giao diện */}
        <div style={{ padding: "32px 28px" }}>
          {/* Trạng thái thành công */}
          {confirmed && success ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={36} color="#16a34a" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                Hủy Đăng Ký Thành Công
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px 0" }}>
                Địa chỉ email <strong style={{ color: "#0f172a" }}>{email}</strong> đã được loại khỏi danh sách gửi email khuyến mãi định kỳ của ABC Pharmacy.
              </p>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "16px",
                  fontSize: 13,
                  color: "#475569",
                  marginBottom: 24,
                  textAlign: "left",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <ShieldCheck size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Lưu ý quan trọng:</strong> Quý khách vẫn sẽ nhận được các email giao dịch bắt buộc như hóa đơn mua hàng, mã OTP bảo mật và trạng thái giao hàng.
                  </div>
                </div>
              </div>

              <Link
                to="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "12px 20px",
                  background: "#0284c7",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                  borderRadius: 10,
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                }}
              >
                <ArrowLeft size={16} /> Quay về Trang chủ Nhà thuốc
              </Link>
            </div>
          ) : (
            <div>
              {/* Form xác nhận hủy */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                  Bạn đang yêu cầu ngừng nhận thông báo tin tức ưu đãi, mã giảm giá và cẩm nang sức khỏe định kỳ cho hộp thư:
                </p>
                <div
                  style={{
                    background: "#f1f5f9",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0369a1",
                    border: "1px solid #cbd5e1",
                    wordBreak: "break-all",
                  }}
                >
                  {email || "(Không xác định được email)"}
                </div>
              </div>

              {/* Lựa chọn lý do khảo sát */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 10 }}>
                  Giúp chúng tôi hoàn thiện dịch vụ (không bắt buộc):
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#334155" }}>
                  {[
                    { id: "too_frequent", text: "Tần suất gửi email quá dày đặc" },
                    { id: "not_relevant", text: "Nội dung ưu đãi không phù hợp nhu cầu" },
                    { id: "spam", text: "Tôi không nhớ từng đăng ký nhận tin" },
                    { id: "other", text: "Lý do cá nhân khác" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: reason === item.id ? "#f0f9ff" : "transparent",
                        border: reason === item.id ? "1px solid #bae6fd" : "1px solid transparent",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={item.id}
                        checked={reason === item.id}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <span>{item.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Báo lỗi nếu có */}
              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>{error}</div>
                </div>
              )}

              {/* Nút hành động */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  disabled={loading || !token || !email}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: loading || !token || !email ? "not-allowed" : "pointer",
                    opacity: loading || !token || !email ? 0.6 : 1,
                    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
                  }}
                >
                  {loading ? "Đang xử lý..." : "Xác nhận Hủy Đăng Ký"}
                </button>

                <Link
                  to="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    padding: "10px 20px",
                    background: "#f8fafc",
                    color: "#64748b",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 13,
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  Giữ đăng ký & Quay về Trang chủ
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer cam kết bảo mật y tế */}
        <div
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "14px 24px",
            textAlign: "center",
            fontSize: 12,
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <HeartHandshake size={14} color="#0284c7" />
          <span>Hệ thống bảo vệ quyền riêng tư người dùng theo quy chuẩn GPP & Bộ Y Tế</span>
        </div>
      </div>
    </div>
  );
};

export default UnsubscribePage;
