// frontend/src/components/chat/AIConsultantTermsModal.tsx
/**
 * =========================================================================
 * MODAL THÔNG BÁO BẮT BUỘC ĐỌC NỘI QUY TRỢ LÝ DƯỢC SĨ AI (SEP490 / WDP301)
 * Tuân thủ quy chuẩn y tế, tài liệu nghiệp vụ Chức năng AI tư vấn thuốc không kê đơn
 * Cơ chế Fail-Closed: Bắt buộc cuộn xuống cuối trang mới mở khóa nút xác nhận
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  X,
  FileText,
  Lock,
  PhoneCall,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  AI_TERMS_ARTICLES,
  AI_TERMS_VERSION,
  AI_TERMS_RELEASE_DATE,
  STORAGE_KEY_AI_TERMS_ACCEPTED,
  STORAGE_KEY_AI_TERMS_TIMESTAMP,
  STORAGE_KEY_AI_TERMS_AUDIT,
} from "../../constants/aiTerms";

export interface AIConsultantTermsModalProps {
  isOpen: boolean;
  onConfirm: (auditData: { version: string; acceptedAt: string }) => void;
  onDecline: () => void;
  title?: string;
  forceReadMode?: boolean; // Nếu true: Luôn bắt buộc cuộn dù đã từng đồng ý trước đó
}

export const AIConsultantTermsModal: React.FC<AIConsultantTermsModalProps> = ({
  isOpen,
  onConfirm,
  onDecline,
  title = "Nội Quy & Điều Khoản Sử Dụng Trợ Lý Dược Sĩ AI",
  forceReadMode = true,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isAgreementChecked, setIsAgreementChecked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Khởi tạo và thiết lập lại trạng thái mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setScrollProgress(0);
      setIsAgreementChecked(false);
      setIsSubmitting(false);

      // Đưa thanh cuộn về vị trí đầu tiên
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Bắt sự kiện cuộn của người dùng để tính toán % và phát hiện khi đã chạm đáy
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      // Trường hợp nội dung ngắn hơn khung nhìn (fallback)
      setHasScrolledToBottom(true);
      setScrollProgress(100);
      return;
    }

    // Tính % đã đọc (từ 0% đến 100%)
    const rawProgress = Math.round((scrollTop / maxScroll) * 100);
    const progress = Math.min(100, Math.max(0, rawProgress));
    setScrollProgress(progress);

    // Cho phép dung sai 15px để hỗ trợ các màn hình DPI cao hoặc zoom trình duyệt
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      if (!hasScrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };

  // Nút hỗ trợ cuộn nhanh xuống cuối trang để người dùng thuận tiện đọc
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Xử lý khi người dùng bấm xác nhận đồng ý nội quy
  const handleAccept = () => {
    if (!hasScrolledToBottom || !isAgreementChecked || isSubmitting) return;

    setIsSubmitting(true);
    const nowIso = new Date().toISOString();

    try {
      // 1. Lưu trạng thái đồng ý vào localStorage và sessionStorage
      localStorage.setItem(STORAGE_KEY_AI_TERMS_ACCEPTED, "true");
      localStorage.setItem(STORAGE_KEY_AI_TERMS_TIMESTAMP, nowIso);
      sessionStorage.setItem(STORAGE_KEY_AI_TERMS_ACCEPTED, "true");

      // 2. Ghi nhật ký kiểm toán bất biến (Audit Trail) phục vụ đối soát y tế
      const existingLogsStr = localStorage.getItem(STORAGE_KEY_AI_TERMS_AUDIT);
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      const newAuditItem = {
        version: AI_TERMS_VERSION,
        acceptedAt: nowIso,
        userAgent: navigator.userAgent,
      };
      existingLogs.push(newAuditItem);
      localStorage.setItem(STORAGE_KEY_AI_TERMS_AUDIT, JSON.stringify(existingLogs.slice(-20)));
    } catch (e) {
      console.warn("Không thể lưu audit log vào LocalStorage:", e);
    }

    // 3. Kích hoạt callback về Component cha
    onConfirm({
      version: AI_TERMS_VERSION,
      acceptedAt: nowIso,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-terms-modal-title"
      className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Thông báo Nội quy */}
        <div className="bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-800 text-white p-4 sm:p-5 flex items-start justify-between shrink-0 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-2xs">
                  Bắt buộc đọc & xác nhận
                </span>
                <span className="text-[11px] font-mono text-sky-200 bg-sky-900/60 px-2 py-0.5 rounded-full border border-sky-400/30">
                  Phiên bản {AI_TERMS_VERSION}
                </span>
              </div>
              <h2
                id="ai-terms-modal-title"
                className="text-base sm:text-lg font-bold text-white mt-1 leading-snug"
              >
                {title}
              </h2>
              <p className="text-xs text-sky-100/90 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Ban hành: {AI_TERMS_RELEASE_DATE} · Chuẩn Thực hành tốt Nhà thuốc (GPP)</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDecline}
            aria-label="Đóng và từ chối nội quy"
            title="Đóng (Không thể sử dụng AI nếu chưa đồng ý)"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh tiến độ đọc văn bản (Visual Scroll Progress Indicator) */}
        <div className="h-1.5 w-full bg-slate-100 overflow-hidden shrink-0">
          <div
            className={`h-full transition-all duration-150 ease-out ${
              hasScrolledToBottom ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Hộp Cảnh báo Y tế Quan trọng Ghim Trước Nội dung */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 p-3 sm:px-5 shrink-0 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-0.5">
            <p className="font-semibold text-amber-950">
              Lưu ý an toàn: Trợ lý AI chỉ tư vấn thuốc không kê đơn (OTC) & TPCN nhẹ
            </p>
            <p className="text-amber-800 leading-relaxed">
              Mọi gợi ý thuốc đều phải được <strong>Dược sĩ chuyên môn phê duyệt</strong> trước khi xác nhận đơn.{" "}
              <strong>Tuyệt đối không dùng cho trường hợp cấp cứu (gọi ngay 115).</strong>
            </p>
          </div>
        </div>

        {/* Khung Nội Dung Điều Khoản Cuộn (Scrollable Terms Container) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Khung cuộn nội quy sử dụng AI"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-700 text-xs sm:text-sm leading-relaxed bg-slate-50/40 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {/* Lời mở đầu cam kết an toàn */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Nguyên tắc Minh bạch & Trách nhiệm Y tế Số</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Nhằm đảm bảo an toàn tối đa cho sức khỏe cộng đồng và tuân thủ chặt chẽ các quy định của Bộ Y tế
              Việt Nam về kinh doanh dược phẩm trực tuyến, Quý khách vui lòng đọc kỹ và cam kết tuân thủ
              toàn bộ các điều khoản bắt buộc dưới đây trước khi bắt đầu trò chuyện với Trợ lý Dược sĩ AI.
            </p>
          </div>

          {/* Danh sách 8 Điều khoản chi tiết trích xuất từ tài liệu nghiệp vụ */}
          <div className="space-y-4">
            {AI_TERMS_ARTICLES.map((article) => (
              <div
                key={article.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  article.isCrucial
                    ? "bg-white border-blue-200/90 shadow-2xs"
                    : "bg-white border-slate-200/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {article.order}
                    </span>
                    <span>{article.title}</span>
                  </h3>
                  {article.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                        article.isCrucial
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {article.badge}
                    </span>
                  )}
                </div>

                <p className="text-slate-800 font-medium text-xs mb-2 italic">
                  {article.summary}
                </p>

                <ul className="list-disc list-outside pl-4 space-y-1.5 text-xs text-slate-600">
                  {article.details.map((detail, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Điểm neo cuối trang (Bottom Sentinel) */}
          <div
            ref={bottomSentinelRef}
            className="pt-2 pb-1 border-t border-slate-200/80 flex items-center justify-center text-center"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Quý khách đã cuộn tới cuối toàn văn nội quy</span>
            </div>
          </div>
        </div>

        {/* Nút Hướng Dẫn Nổi Khi Người Dùng Chưa Cuộn Tới Cuối */}
        {!hasScrolledToBottom && (
          <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-10 animate-bounce duration-1000 pointer-events-auto">
            <button
              type="button"
              onClick={scrollToBottom}
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-slate-700 cursor-pointer transition-all active:scale-95"
            >
              <span>Cuộn xuống cuối để mở khóa xác nhận ({scrollProgress}%)</span>
              <ChevronDown className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        )}

        {/* Footer Xác Nhận Bắt Buộc */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 space-y-3">
          {/* Checkbox Cam Kết (Chỉ click được hoặc nên khuyến khích click sau khi đã cuộn) */}
          <div className="flex items-start gap-2.5">
            <input
              id="ai-terms-agreement-checkbox"
              type="checkbox"
              checked={isAgreementChecked}
              disabled={!hasScrolledToBottom}
              onChange={(e) => setIsAgreementChecked(e.target.checked)}
              className={`w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 transition ${
                !hasScrolledToBottom ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
            <label
              htmlFor="ai-terms-agreement-checkbox"
              className={`text-xs select-none leading-snug ${
                hasScrolledToBottom
                  ? "text-slate-800 cursor-pointer font-medium"
                  : "text-slate-400 cursor-not-allowed"
              }`}
            >
              Tôi cam kết đã đọc kỹ, hiểu rõ và tự nguyện tuân thủ toàn bộ <strong>Nội quy & Điều khoản</strong> sử dụng Trợ lý Dược sĩ AI nêu trên.
              {!hasScrolledToBottom && (
                <span className="block text-[11px] text-amber-600 font-normal mt-0.5">
                  (Cần cuộn xuống hết trang văn bản để kích hoạt ô xác nhận này)
                </span>
              )}
            </label>
          </div>

          {/* Cặp Nút Hành Động (Từ chối & Xác nhận) */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onDecline}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Từ chối & Đóng
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || !isAgreementChecked || isSubmitting}
              title={
                !hasScrolledToBottom
                  ? "Vui lòng cuộn xuống cuối trang để kích hoạt nút này"
                  : !isAgreementChecked
                  ? "Vui lòng đánh dấu vào ô cam kết đồng ý"
                  : "Xác nhận và tiếp tục sử dụng Dược sĩ AI"
              }
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                hasScrolledToBottom && isAgreementChecked && !isSubmitting
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
                  : "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75"
              }`}
            >
              {hasScrolledToBottom && isAgreementChecked ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Xác nhận & Bắt đầu Chat AI</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Cuộn hết trang để xác nhận</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConsultantTermsModal;

