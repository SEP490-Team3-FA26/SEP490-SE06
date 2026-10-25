import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Mail,
  Image,
  Calendar,
  Users,
  Send,
  Eye,
  Save,
  ArrowLeft,
  Tag,
  FileText,
  Monitor,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Clock,
} from "lucide-react";
import { useEmailCampaignManagement } from "../../hooks/useEmailCampaignManagement";
import { emailCampaignService, EmailCampaignData } from "../../services/sales/emailCampaign.service";
// Import Rich Text Editor — cho phép soạn thảo văn bản phong phú với định dạng tự do
import RichTextEditor from "../../components/common/RichTextEditor";

// ===================================================================
// Live Preview — Giả lập giao diện Email chuẩn nhận diện ABC Pharmacy
// Bố cục mới: Logo góc trái -> Lời chào -> Tiêu đề lớn -> Lời dẫn dắt
//             -> Khung Voucher nét đứt -> Nút CTA -> Banner 1200x400 (3:1)
//             -> Điều kiện áp dụng -> Chân trang
// ===================================================================
const EmailLivePreview: React.FC<{
  data: Partial<EmailCampaignData>;
  mode: "desktop" | "mobile";
}> = ({ data, mode }) => {
  const previewContainerStyle: React.CSSProperties =
    mode === "desktop"
      ? { width: "100%", maxWidth: 520, margin: "0 auto" }
      : { width: 340, margin: "0 auto" };

  // Định dạng ngày hết hạn hiển thị trong khung voucher
  let formattedEndDate = "dd/mm/yyyy";
  if (data.promotionEndDate) {
    try {
      const d = new Date(data.promotionEndDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        formattedEndDate = `${day}/${month}/${year}`;
      }
    } catch {
      formattedEndDate = "dd/mm/yyyy";
    }
  }

  // Tách các dòng điều kiện áp dụng
  const rawTerms =
    data.termsAndConditions ||
    "• Áp dụng cho sản phẩm không kê đơn tại toàn bộ chi nhánh.\n• Mỗi khách dùng 1 lần, không cộng gộp với ưu đãi khác.";
  const termsList = rawTerms
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 16,
        padding: "24px 16px",
        minHeight: 520,
        overflow: "auto",
        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.3)",
      }}
    >
      <div style={previewContainerStyle}>
        {/* Thanh tiêu đề giả lập hộp thư Gmail / Apple Mail */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px 14px 0 0",
            padding: "12px 20px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
            TỪ: <strong>ABC Pharmacy</strong> &lt;no-reply@abcpharmacy.store&gt;
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {data.subject || "Giảm 20% toàn chuỗi"}
          </div>
          {data.preheader && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {data.preheader}
            </div>
          )}
        </div>

        {/* Khung nội dung Email chính */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "0 0 14px 14px",
            padding: "24px 28px 28px 28px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          }}
        >
          {/* 1. Header Logo góc trái: Khối vuông xanh có dấu + và chữ ABC Pharmacy */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                backgroundColor: "#0070ba",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              +
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: -0.2,
              }}
            >
              ABC Pharmacy
            </span>
          </div>

          {/* 2. Lời chào */}
          <div style={{ fontSize: 14, color: "#334155", marginBottom: 6 }}>
            Xin chào <strong>[TÊN KHÁCH HÀNG]</strong>,
          </div>

          {/* 3. Tiêu đề lớn màu xanh */}
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: 26,
              fontWeight: 800,
              color: "#0070ba",
              lineHeight: 1.25,
            }}
          >
            {data.subject || "Giảm 20% toàn chuỗi"}
          </h1>

          {/* 4. Lời cảm ơn / dẫn dắt — render HTML từ rich text editor */}
          <div
            style={{
              fontSize: 14,
              color: "#475569",
              lineHeight: 1.5,
              marginBottom: 20,
            }}
            dangerouslySetInnerHTML={{
              __html:
                data.greetingText && data.greetingText.trim()
                  ? data.greetingText
                  : "Cảm ơn bạn đã đồng hành cùng ABC Pharmacy. Món quà nhỏ dành riêng cho bạn.",
            }}
          />

          {/* Nội dung chi tiết nếu có nhập thêm HTML */}
          {data.mainContentHtml &&
            data.mainContentHtml.trim() &&
            data.mainContentHtml !== "<p>Nội dung bản xem trước</p>" && (
              <div
                style={{
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
                dangerouslySetInnerHTML={{ __html: data.mainContentHtml }}
              />
            )}

          {/* 5. Khung Voucher nét đứt (Dashed Box) */}
          <div
            style={{
              border: "1.5px dashed #0070ba",
              borderRadius: 8,
              backgroundColor: "#ffffff",
              textAlign: "center",
              padding: "18px 16px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#0070ba",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              MÃ ƯU ĐÃI CỦA BẠN
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#0070ba",
                letterSpacing: 3,
                margin: "4px 0 6px 0",
                lineHeight: 1.1,
              }}
            >
              {data.voucherCode || "HEALTH20"}
            </div>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 4 }}>
              {data.discountSummary || "Giảm tối đa 100.000đ cho đơn từ 300.000đ"}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#b91c1c",
                marginTop: 4,
              }}
            >
              Dùng đến [{formattedEndDate}]
            </div>
          </div>

          {/* 6. Nút Call-To-Action (MUA NGAY TẠI ABC PHARMACY) */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#0070ba",
                color: "#ffffff",
                padding: "12px 30px",
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 112, 186, 0.25)",
              }}
            >
              {data.ctaButtonText || "MUA NGAY TẠI ABC PHARMACY"}
            </div>
          </div>

          {/* 7. Ảnh Banner 1200x400 (Tỉ lệ 3:1) — ĐẶT SAU NÚT CTA */}
          {data.bannerUrl &&
          !data.bannerUrl.includes("placeholder.com") &&
          data.bannerUrl.trim().length > 0 ? (
            <img
              src={data.bannerUrl}
              alt="Banner khuyến mãi"
              style={{
                width: "100%",
                aspectRatio: "3/1",
                objectFit: "cover",
                borderRadius: 6,
                display: "block",
                marginBottom: 24,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div
              style={{
                marginBottom: 24,
                backgroundColor: "#e0f2fe",
                borderRadius: 6,
                padding: "42px 16px",
                textAlign: "center",
                color: "#0369a1",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              [ẢNH BANNER 1200×400 - ảnh lối sống, tỉ lệ 3:1, không dùng ảnh vỉ thuốc]
            </div>
          )}

          {/* 8. Điều kiện áp dụng */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 6,
              }}
            >
              Điều kiện áp dụng
            </div>
            <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.6 }}>
              {termsList.map((item, idx) => (
                <div key={idx}>{item.startsWith("•") ? item : `• ${item}`}</div>
              ))}
            </div>
          </div>

          {/* 9. Chân trang (Footer) */}
          <div
            style={{
              borderTop: "1px solid #f1f5f9",
              paddingTop: 20,
              textAlign: "center",
              fontSize: 11,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, color: "#475569" }}>
              ABC Pharmacy - [ĐỊA CHỈ]
            </div>
            <div>Hotline dược sĩ tư vấn: [HOTLINE]</div>
            <div style={{ marginTop: 4 }}>
              Bạn nhận email này vì đã đăng ký thành viên tại ABC Pharmacy.
            </div>
            <div style={{ marginTop: 2 }}>
              <span
                style={{
                  color: "#64748b",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Hủy đăng ký nhận email
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// TRANG TẠO & CHỈNH SỬA CHIẾN DỊCH EMAIL — Split-Screen Layout
// ===================================================================
const EmailCampaignPage: React.FC = () => {
  const { createCampaign, updateCampaign, triggerCampaign, sendTestEmail, submitting } =
    useEmailCampaignManagement();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id && id !== "new");
  const basePath = location.pathname.startsWith("/director")
    ? "/director/marketing/email-campaigns"
    : "/admin/marketing/email-campaigns";

  // State lưu trữ dữ liệu form cấu hình chiến dịch
  const [formData, setFormData] = useState<Partial<EmailCampaignData>>({
    title: "",
    subject: "Giảm 20% toàn chuỗi",
    preheader: "Món quà nhỏ dành riêng cho bạn — Ưu đãi độc quyền",
    bannerUrl: "",
    greetingText: "Cảm ơn bạn đã đồng hành cùng ABC Pharmacy. Món quà nhỏ dành riêng cho bạn.",
    mainContentHtml: "",
    voucherCode: "HEALTH20",
    discountSummary: "Giảm tối đa 100.000đ cho đơn từ 300.000đ",
    promotionEndDate: "",
    ctaButtonText: "MUA NGAY TẠI ABC PHARMACY",
    ctaButtonUrl: "https://abcpharmacy.store/",
    termsAndConditions:
      "• Áp dụng cho sản phẩm không kê đơn tại toàn bộ chi nhánh.\n• Mỗi khách dùng 1 lần, không cộng gộp với ưu đãi khác.",
    targetAudience: "ALL",
    sendMode: "SCHEDULED",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Mặc định: ngày mai (chuẩn ISO UTC)
  });

  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [testEmail, setTestEmail] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Tải thông tin chiến dịch nếu có ID trên URL (Chế độ chỉnh sửa)
  useEffect(() => {
    if (id && id !== "new") {
      emailCampaignService
        .getCampaignById(id)
        .then((camp) => {
          if (camp) {
            setFormData({
              ...camp,
              scheduledAt: camp.scheduledAt
                ? new Date(camp.scheduledAt).toISOString()
                : formData.scheduledAt,
              promotionEndDate: camp.promotionEndDate
                ? new Date(camp.promotionEndDate).toISOString().slice(0, 10)
                : "",
            });
          }
        })
        .catch((err) => {
          showToast(
            "error",
            "Không thể tải chi tiết chiến dịch: " + (err.message || "Lỗi")
          );
        });
    }
  }, [id]);

  // Cập nhật giá trị trường form
  const updateField = (field: keyof EmailCampaignData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Hàm chuyển đổi Date/ISO sang chuỗi định dạng cho datetime-local theo giờ máy tính (Local Time)
  const toLocalDatetimeInput = (dateInput?: string | Date) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Nút chọn nhanh thời gian phát tán
  const setQuickSchedule = (type: "1h" | "tomorrow_morning" | "tomorrow_noon" | "tomorrow_evening") => {
    const d = new Date();
    if (type === "1h") {
      d.setHours(d.getHours() + 1);
    } else if (type === "tomorrow_morning") {
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
    } else if (type === "tomorrow_noon") {
      d.setDate(d.getDate() + 1);
      d.setHours(11, 30, 0, 0);
    } else if (type === "tomorrow_evening") {
      d.setDate(d.getDate() + 1);
      d.setHours(20, 0, 0, 0);
    }
    updateField("scheduledAt", d.toISOString());
  };

  // Kiểm tra tính hợp lệ của dữ liệu trước khi gửi
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.title?.trim()) errs.title = "Tên chiến dịch không được để trống";
    if (!formData.subject?.trim()) errs.subject = "Tiêu đề ưu đãi không được để trống";
    if (!formData.ctaButtonUrl?.trim()) errs.ctaButtonUrl = "URL nút CTA không được để trống";
    if (formData.sendMode === "SCHEDULED" && !formData.scheduledAt) {
      errs.scheduledAt = "Vui lòng chọn thời điểm gửi";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Xử lý lưu nháp chiến dịch
  const handleSaveDraft = async () => {
    if (!formData.title?.trim()) {
      showToast("error", "Tên chiến dịch không được để trống khi lưu nháp");
      return;
    }
    const targetId = formData._id || (id && id !== "new" ? id : null);
    const payload = {
      ...formData,
      status: "DRAFT",
      scheduledAt: formData.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      bannerUrl: formData.bannerUrl || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200",
      mainContentHtml: formData.mainContentHtml || "<p>Nội dung bản xem trước</p>",
      ctaButtonUrl: formData.ctaButtonUrl || "https://abcpharmacy.store/",
    } as any;

    const result = targetId
      ? await updateCampaign(targetId, payload)
      : await createCampaign(payload);

    if (result.success) {
      const createdId = result.data?._id || (result.data as any)?.id;
      if (createdId) {
        setFormData((prev) => ({
          ...prev,
          _id: createdId,
          scheduledAt: result.data?.scheduledAt
            ? new Date(result.data.scheduledAt).toISOString()
            : prev.scheduledAt,
        }));
      } else if (result.data?.scheduledAt) {
        setFormData((prev) => ({
          ...prev,
          scheduledAt: new Date(result.data!.scheduledAt).toISOString(),
        }));
      }
      showToast(
        "success",
        targetId
          ? "✅ Đã cập nhật bản nháp thành công!"
          : "✅ Đã lưu nháp chiến dịch thành công!"
      );
    } else {
      showToast("error", result.error || "Lỗi khi lưu nháp");
    }
  };

  // Xử lý lên lịch phát tán
  const handleSchedule = async () => {
    if (!validate()) {
      showToast("error", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    const targetId = formData._id || (id && id !== "new" ? id : null);
    const payload = {
      ...formData,
      status: "SCHEDULED", // Chuyển trạng thái từ DRAFT sang SCHEDULED khi xác nhận lên lịch
      scheduledAt:
        formData.sendMode === "IMMEDIATE"
          ? new Date().toISOString()
          : formData.scheduledAt || new Date().toISOString(),
      bannerUrl:
        formData.bannerUrl ||
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200",
      mainContentHtml:
        formData.mainContentHtml || "<p>Nội dung bản xem trước</p>",
    } as any;

    const result = targetId
      ? await updateCampaign(targetId, payload)
      : await createCampaign(payload);

    if (result.success) {
      const savedCampaignId = targetId || result.data?._id || (result.data as any)?.id;
      // Nếu là chế độ gửi ngay (IMMEDIATE), lập tức kích hoạt trigger phát tán
      if (formData.sendMode === "IMMEDIATE" && savedCampaignId) {
        await triggerCampaign(savedCampaignId);
      }

      showToast(
        "success",
        formData.sendMode === "IMMEDIATE"
          ? "🚀 Đã kích hoạt chiến dịch và đang bắt đầu gửi email!"
          : targetId
          ? "🚀 Đã cập nhật lịch chiến dịch thành công!"
          : "🚀 Chiến dịch email đã được lên lịch thành công!"
      );
      setTimeout(() => {
        navigate(basePath);
      }, 1200);
    } else {
      showToast("error", result.error || "Lỗi khi lên lịch chiến dịch");
    }
  };

  // Xử lý gửi email thử nghiệm (Send Test)
  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      showToast("error", "Vui lòng nhập địa chỉ email thử nghiệm");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail.trim())) {
      showToast("error", "Địa chỉ email không đúng định dạng");
      return;
    }

    let campaignId = formData._id || (id && id !== "new" ? id : null);

    // Tự động lưu nháp nếu chưa có ID để đảm bảo lấy được nội dung mới nhất
    if (!campaignId) {
      if (!formData.title?.trim()) {
        showToast(
          "error",
          "Vui lòng nhập ít nhất Tên chiến dịch trước khi gửi email thử nghiệm"
        );
        return;
      }

      const draftPayload = {
        ...formData,
        scheduledAt:
          formData.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
        bannerUrl:
          formData.bannerUrl ||
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200",
        mainContentHtml:
          formData.mainContentHtml || "<p>Nội dung bản xem trước</p>",
        ctaButtonUrl: formData.ctaButtonUrl || "https://abcpharmacy.store/",
      } as any;

      const saveRes = await createCampaign(draftPayload);
      const createdId =
        saveRes.data?._id ||
        (saveRes.data as any)?.id ||
        (typeof saveRes.data === "string" &&
          (saveRes.data as string).match(
            /'?_id'?:\s*(?:new ObjectId\(')?([a-f0-9]{24})'?/i
          )?.[1]);

      if (!saveRes.success || !createdId) {
        showToast("error", saveRes.error || "Không thể tự động lưu nháp để gửi test");
        return;
      }
      campaignId = createdId;
      setFormData((prev) => ({ ...prev, _id: campaignId }));
    }

    showToast("success", "⏳ Đang gửi email thử nghiệm...");
    const res = await sendTestEmail(campaignId, testEmail.trim());
    if (res.success) {
      showToast(
        "success",
        `✅ Đã gửi email test thành công tới ${testEmail.trim()}! Vui lòng kiểm tra hộp thư.`
      );
      setShowTestModal(false);
    } else {
      showToast("error", res.error || "Lỗi khi gửi email thử nghiệm");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Toast thông báo */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "success" ? "#16a34a" : "#dc2626",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header điều hướng */}
      <div
        style={{
          background: "linear-gradient(135deg, #0369a1 0%, #0070ba 100%)",
          padding: "18px 36px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(basePath)}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: 0.9,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.3)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mail size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
              {isEditMode
                ? "Chỉnh sửa chiến dịch Email Newsletter"
                : "Tạo chiến dịch Email Newsletter (Mẫu Chuẩn 2026)"}
            </h1>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
              Thiết kế theo mẫu nhận diện thương hiệu ABC Pharmacy tối giản, hiện đại
            </p>
          </div>
        </div>
      </div>

      {/* Split-screen layout */}
      <div style={{ display: "flex", height: "calc(100vh - 74px)", overflow: "hidden" }}>
        {/* CỘT TRÁI: Form cấu hình (52%) */}
        <div
          style={{
            flex: "0 0 52%",
            overflowY: "auto",
            padding: "24px 28px",
            borderRight: "1px solid #e2e8f0",
          }}
        >
          {/* === KHỐI 1: Tiêu đề & Thông điệp chính === */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 22,
              marginBottom: 18,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #f1f5f9",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FileText size={16} style={{ color: "#0070ba" }} /> Tiêu đề & Thông điệp chính
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Tên chiến dịch (nội bộ) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                style={{ ...inputStyle, borderColor: errors.title ? "#dc2626" : "#e2e8f0" }}
                placeholder="VD: Tri ân Hội viên — Giảm 20% toàn chuỗi"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
              {errors.title && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.title}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Tiêu đề email (Headline lớn màu xanh) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.subject ? "#dc2626" : "#e2e8f0",
                  fontWeight: 600,
                  color: "#0070ba",
                }}
                placeholder="VD: Giảm 20% toàn chuỗi"
                value={formData.subject}
                onChange={(e) => updateField("subject", e.target.value)}
              />
              {errors.subject && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  {errors.subject}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Lời cảm ơn / dẫn dắt khách hàng
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#0070ba",
                    background: "#e0f2fe",
                    padding: "2px 7px",
                    borderRadius: 4,
                  }}
                >
                  ✍️ Rich Text
                </span>
              </label>
              {/* Soạn thảo tự do: bold, italic, màu chữ, cỡ chữ, danh sách... */}
              <RichTextEditor
                value={formData.greetingText || ""}
                onChange={(html) => updateField("greetingText", html)}
                placeholder="VD: Cảm ơn bạn đã đồng hành cùng ABC Pharmacy. Món quà nhỏ dành riêng cho bạn."
                minHeight={90}
              />
            </div>

            <div>
              <label style={labelStyle}>Preheader (Dòng tóm tắt hiển thị ngoài hộp thư)</label>
              <input
                style={inputStyle}
                placeholder="VD: Món quà nhỏ dành riêng cho bạn — Ưu đãi độc quyền"
                value={formData.preheader}
                onChange={(e) => updateField("preheader", e.target.value)}
              />
            </div>
          </div>

          {/* === KHỐI 2: Ưu đãi Voucher & Nút CTA === */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 22,
              marginBottom: 18,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #f1f5f9",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Tag size={16} style={{ color: "#0070ba" }} /> Khung ưu đãi Voucher & Nút CTA
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Mã Voucher</label>
                <input
                  style={{
                    ...inputStyle,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    fontWeight: 700,
                    color: "#0070ba",
                  }}
                  placeholder="VD: HEALTH20"
                  value={formData.voucherCode}
                  onChange={(e) => updateField("voucherCode", e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label style={labelStyle}>Mô tả mức giảm</label>
                <input
                  style={inputStyle}
                  placeholder="VD: Giảm tối đa 100.000đ cho đơn từ 300.000đ"
                  value={formData.discountSummary}
                  onChange={(e) => updateField("discountSummary", e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Hạn sử dụng Voucher (Dùng đến ngày)</label>
              <input
                type="date"
                style={inputStyle}
                value={
                  formData.promotionEndDate
                    ? formData.promotionEndDate.slice(0, 10)
                    : ""
                }
                onChange={(e) => updateField("promotionEndDate", e.target.value)}
              />
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                Hiển thị dòng chữ màu đỏ nổi bật: <code>Dùng đến [dd/mm/yyyy]</code> trong khung nét đứt.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Văn bản nút CTA</label>
                <input
                  style={inputStyle}
                  value={formData.ctaButtonText}
                  onChange={(e) => updateField("ctaButtonText", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  URL đích khi bấm nút <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.ctaButtonUrl ? "#dc2626" : "#e2e8f0",
                  }}
                  value={formData.ctaButtonUrl}
                  onChange={(e) => updateField("ctaButtonUrl", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* === KHỐI 3: Ảnh Banner & Điều kiện áp dụng === */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 22,
              marginBottom: 18,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #f1f5f9",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Image size={16} style={{ color: "#0070ba" }} /> Banner & Điều kiện áp dụng
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                URL ảnh Banner (Đặt sau nút CTA)
                <span style={{ color: "#0070ba", fontWeight: 500, marginLeft: 6 }}>
                  (Tỉ lệ 3:1 — 1200×400px, ảnh lối sống, không dùng ảnh vỉ thuốc)
                </span>
              </label>
              <input
                style={inputStyle}
                placeholder="https://res.cloudinary.com/.../banner_1200x400.jpg"
                value={formData.bannerUrl}
                onChange={(e) => updateField("bannerUrl", e.target.value)}
              />
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                Nếu để trống, hệ thống sẽ hiển thị ô khung viền xanh mẫu chuẩn 1200×400 như hình mẫu.
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Điều kiện áp dụng (Mỗi dòng 1 gạch đầu dòng)
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  height: 75,
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
                value={formData.termsAndConditions}
                onChange={(e) => updateField("termsAndConditions", e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Nội dung chi tiết bổ sung
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#0070ba",
                    background: "#e0f2fe",
                    padding: "2px 7px",
                    borderRadius: 4,
                  }}
                >
                  ✍️ Rich Text
                </span>
              </label>
              {/* Soạn thảo tự do: hỗ trợ tiêu đề, danh sách, link, màu sắc cho nội dung mở rộng */}
              <RichTextEditor
                value={formData.mainContentHtml || ""}
                onChange={(html) => updateField("mainContentHtml", html)}
                placeholder="Nhập thông tin sản phẩm hoặc đoạn văn chi tiết, mô tả ưu đãi nếu cần..."
                minHeight={130}
              />
            </div>
          </div>

          {/* === KHỐI 4: Tệp khách hàng & Lịch gửi === */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 22,
              marginBottom: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #f1f5f9",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Users size={16} style={{ color: "#0070ba" }} /> Tệp khách hàng & Lịch gửi
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Tệp khách hàng mục tiêu</label>
              <select
                style={{ ...inputStyle }}
                value={formData.targetAudience}
                onChange={(e) => updateField("targetAudience", e.target.value)}
              >
                <option value="ALL">🌐 Tất cả khách hàng đã đăng ký nhận tin</option>
                <option value="VIP">⭐ Khách hàng thân thiết / VIP (Hạng Gold & Platinum)</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Chế độ phát tán</label>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { value: "IMMEDIATE", label: "🔥 Gửi ngay bây giờ" },
                  { value: "SCHEDULED", label: "📅 Lên lịch gửi tự động" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      border: "1px solid",
                      borderColor: formData.sendMode === opt.value ? "#0070ba" : "#e2e8f0",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: formData.sendMode === opt.value ? "#f0f9ff" : "#fff",
                      fontSize: 14,
                      fontWeight: formData.sendMode === opt.value ? 600 : 400,
                    }}
                  >
                    <input
                      type="radio"
                      name="sendMode"
                      value={opt.value}
                      checked={formData.sendMode === opt.value}
                      onChange={() => updateField("sendMode", opt.value)}
                      style={{ accentColor: "#0070ba" }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {formData.sendMode === "IMMEDIATE" ? (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#166534",
                  fontSize: 13,
                }}
              >
                <Sparkles size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
                <div>
                  <strong>Chế độ phát tán ngay:</strong> Email sẽ được gửi vào hàng đợi xử lý ngay lập tức khi bạn bấm nút <strong>"Kích Hoạt & Gửi Ngay"</strong> bên dưới (không cần chọn giờ gửi hẹn trước).
                </div>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>
                  <Calendar
                    size={13}
                    style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }}
                  />
                  Thời điểm gửi (Múi giờ Việt Nam UTC+7) <span style={{ color: "#dc2626" }}>*</span>
                </label>

                {/* Các nút chọn nhanh (Quick Presets) */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule("1h")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0369a1",
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Sau 1 giờ nữa
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule("tomorrow_morning")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0369a1",
                      cursor: "pointer",
                    }}
                  >
                    🌅 Sáng mai (08:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule("tomorrow_noon")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0369a1",
                      cursor: "pointer",
                    }}
                  >
                    ☀️ Trưa mai (11:30)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule("tomorrow_evening")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0369a1",
                      cursor: "pointer",
                    }}
                  >
                    🌙 Tối mai (20:00)
                  </button>
                </div>

                <input
                  type="datetime-local"
                  style={{
                    ...inputStyle,
                    borderColor: errors.scheduledAt ? "#dc2626" : "#e2e8f0",
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                  value={toLocalDatetimeInput(formData.scheduledAt)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      updateField("scheduledAt", "");
                      return;
                    }
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      updateField("scheduledAt", d.toISOString());
                    }
                  }}
                />
                {errors.scheduledAt && (
                  <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                    {errors.scheduledAt}
                  </div>
                )}

                {/* Dòng xác nhận thời gian đã chọn hiển thị theo giờ Việt Nam */}
                {formData.scheduledAt && !isNaN(new Date(formData.scheduledAt).getTime()) && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#0369a1",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Clock size={15} style={{ color: "#0284c7", flexShrink: 0 }} />
                    <span>
                      Thời gian phát tán đã chọn:{" "}
                      <strong style={{ color: "#0c4a6e" }}>
                        {new Intl.DateTimeFormat("vi-VN", {
                          weekday: "long",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: "Asia/Ho_Chi_Minh",
                        }).format(new Date(formData.scheduledAt))}
                      </strong>{" "}
                      (Giờ Việt Nam)
                    </span>
                  </div>
                )}

                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  💡 <strong>Cách chọn:</strong> Trong popup lịch của trình duyệt, anh yêu click chọn <strong>Ngày</strong> rồi chọn <strong>Giờ</strong> (SA: Sáng, CH: Chiều). Chọn xong, anh chỉ cần <strong>click chuột ra ngoài ô hoặc nhấn Enter</strong> là thời gian sẽ được lưu lại ạ! Hoặc anh có thể bấm nhanh các nút gợi ý phía trên.
                </div>
              </div>
            )}
          </div>

          {/* Thanh công cụ nút bấm Action */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "16px 0",
              position: "sticky",
              bottom: 0,
              background: "linear-gradient(transparent, #f8fafc 30%)",
              paddingTop: 28,
            }}
          >
            <button
              onClick={handleSaveDraft}
              disabled={submitting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 20px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <Save size={15} />
              Lưu nháp
            </button>

            <button
              onClick={() => setShowTestModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 20px",
                borderRadius: 10,
                border: "1px solid #0070ba",
                background: "#f0f9ff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "#0070ba",
              }}
            >
              <Eye size={15} />
              Gửi test email
            </button>

            <button
              onClick={handleSchedule}
              disabled={submitting}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 20px",
                borderRadius: 10,
                border: "none",
                background: submitting ? "#94a3b8" : "#0070ba",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                boxShadow: "0 2px 6px rgba(0, 112, 186, 0.3)",
              }}
            >
              {submitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Send size={15} />
                  {formData.sendMode === "IMMEDIATE"
                    ? "Kích Hoạt & Gửi Ngay"
                    : isEditMode
                    ? "Cập Nhật Lịch Chiến Dịch"
                    : "Lên Lịch Chiến Dịch"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: Live Preview chuẩn giao diện hình mẫu (48%) */}
        <div
          style={{
            flex: "0 0 48%",
            overflowY: "auto",
            padding: "24px 20px",
            background: "#0f172a",
          }}
        >
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} style={{ color: "#38bdf8" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                Bản xem trước trực tiếp (Live Preview)
              </span>
            </div>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 3 }}>
              {[
                { id: "desktop", icon: <Monitor size={14} />, label: "Desktop" },
                { id: "mobile", icon: <Smartphone size={14} />, label: "Mobile" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPreviewMode(opt.id as "desktop" | "mobile")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: previewMode === opt.id ? "#0070ba" : "transparent",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: previewMode === opt.id ? "#ffffff" : "#94a3b8",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <EmailLivePreview data={formData} mode={previewMode} />

          {/* Ghi chú thiết kế */}
          <div
            style={{
              marginTop: 16,
              background: "rgba(2, 132, 199, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 12,
              color: "#bae6fd",
              lineHeight: 1.5,
            }}
          >
            <strong>✨ Thiết kế mới:</strong> Giao diện hiển thị trực quan theo phong cách tối giản chuẩn WDP301/SEP490.
            Tương thích hoàn hảo với hộp thư Gmail, Apple Mail và Outlook trên cả Desktop lẫn Smartphone.
          </div>
        </div>
      </div>

      {/* Modal gửi test email */}
      {showTestModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowTestModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 30,
              width: 420,
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                📧 Gửi email thử nghiệm
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Nhập địa chỉ email bất kỳ để nhận bản mẫu thực tế theo đúng thiết kế mới này.
            </p>
            <input
              type="email"
              placeholder="nhap-email-cua-ban@gmail.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <button
              onClick={handleSendTest}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: "#0070ba",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Send size={15} />
              Gửi test ngay vào hộp thư
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { EmailCampaignPage };
export default EmailCampaignPage;
