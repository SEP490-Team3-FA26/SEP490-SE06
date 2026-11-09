// frontend/src/components/chat/AIConsultantTermsModal.tsx
/**
 * =========================================================================
 * MODAL THÔNG BÁO BẮT BUỘC ĐỌC NỘI QUY TRỢ LÝ DƯỢC SĨ AI (TỐI GIẢN - DỄ HIỂU)
 * - Ngôn ngữ đời thường, gần gũi, không từ viết tắt / thuật ngữ chuyên ngành
 * - Bôi đen toàn bộ các mục quan trọng (cấp cứu 115, không bán thuốc kê đơn...)
 * - Hiệu ứng mở khóa checkbox: Bắt buộc cuộn xuống dưới cùng mới được tích chọn
 * =========================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Lock,
  Unlock,
  Check,
  ChevronDown,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  AI_TERMS_VERSION,
  STORAGE_KEY_AI_TERMS_ACCEPTED,
  STORAGE_KEY_AI_TERMS_TIMESTAMP,
  STORAGE_KEY_AI_TERMS_AUDIT,
} from "../../constants/aiTerms";

export interface AIConsultantTermsModalProps {
  isOpen: boolean;
  onConfirm: (auditData: { version: string; acceptedAt: string }) => Promise<void> | void;
  onDecline: () => void;
  title?: string;
  forceReadMode?: boolean;
}

export const AIConsultantTermsModal: React.FC<AIConsultantTermsModalProps> = ({
  isOpen,
  onConfirm,
  onDecline,
  title = "Nội Quy Dùng Trợ Lý Dược Sĩ AI",
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isAgreementChecked, setIsAgreementChecked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [justUnlocked, setJustUnlocked] = useState<boolean>(false);
  const [shakeLocked, setShakeLocked] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo và thiết lập lại trạng thái mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setScrollProgress(0);
      setIsAgreementChecked(false);
      setIsSubmitting(false);
      setJustUnlocked(false);
      setShakeLocked(false);
      setSubmitError(null);

      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Bắt sự kiện cuộn để phát hiện khi người dùng đã đọc đến đáy
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setHasScrolledToBottom(true);
      setScrollProgress(100);
      return;
    }

    const rawProgress = Math.round((scrollTop / maxScroll) * 100);
    const progress = Math.min(100, Math.max(0, rawProgress));
    setScrollProgress(progress);

    // Dung sai 20px để nhận diện chạm đáy chính xác
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      if (!hasScrolledToBottom) {
        setHasScrolledToBottom(true);
        setJustUnlocked(true);
        setTimeout(() => setJustUnlocked(false), 2500);
      }
    }
  };

  // Cuộn mượt xuống đáy trang
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Khi người dùng cố bấm vào ô checkbox lúc chưa cuộn xong
  const handleLockedBoxClick = () => {
    if (!hasScrolledToBottom) {
      setShakeLocked(true);
      setTimeout(() => setShakeLocked(false), 500);
      scrollToBottom();
    }
  };

  // Xác nhận chấp thuận nội quy
  const handleAccept = async () => {
    if (!hasScrolledToBottom || !isAgreementChecked || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const nowIso = new Date().toISOString();

    try {
      // Chỉ khi onConfirm (API xác nhận lên server) thành công mới ghi nhận vào Storage và đóng modal
      await onConfirm({
        version: AI_TERMS_VERSION,
        acceptedAt: nowIso,
      });

      localStorage.setItem(STORAGE_KEY_AI_TERMS_ACCEPTED, "true");
      localStorage.setItem(STORAGE_KEY_AI_TERMS_TIMESTAMP, nowIso);
      sessionStorage.setItem(STORAGE_KEY_AI_TERMS_ACCEPTED, "true");

      const existingLogsStr = localStorage.getItem(STORAGE_KEY_AI_TERMS_AUDIT);
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      existingLogs.push({
        version: AI_TERMS_VERSION,
        acceptedAt: nowIso,
        userAgent: navigator.userAgent,
      });
      localStorage.setItem(STORAGE_KEY_AI_TERMS_AUDIT, JSON.stringify(existingLogs.slice(-20)));
    } catch (e: any) {
      console.warn("Không thể xác nhận điều khoản AI:", e);
      setSubmitError(e?.response?.data?.message || e?.message || "Không thể kết nối đến máy chủ để xác nhận nội quy. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-terms-title"
      className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <style>{`
        @keyframes subtleShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-subtle-shake {
          animation: subtleShake 0.35s ease-in-out;
        }
      `}</style>

      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[84vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tối Giản (Minimalist Header) */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ai-terms-title" className="text-sm sm:text-base font-bold text-slate-900">
                  {title}
                </h3>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  An toàn y tế
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vui lòng cuộn đọc đến cuối trang để mở khóa ô đồng ý bên dưới
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDecline}
            aria-label="Đóng"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thanh Tiến Độ Đọc Siêu Mảnh (1.5px) */}
        <div className="h-0.5 w-full bg-slate-100 shrink-0">
          <div
            className={`h-full transition-all duration-150 ${hasScrolledToBottom ? "bg-emerald-500" : "bg-blue-600"
              }`}
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Khung Nội Dung Điều Khoản Cuộn (Ngôn ngữ đời thường, không từ viết tắt, bôi đen mục quan trọng) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Nội dung điều khoản"
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-700 leading-relaxed bg-white focus:outline-none"
        >
          {/* Điều 1 */}
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                1
              </span>
              <span>Chỉ tư vấn thuốc thông thường không cần đơn bác sĩ</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Trợ lý AI chỉ giúp gợi ý các loại <strong>thuốc thông thường không cần đơn bác sĩ</strong> (như cảm cúm nhẹ, nhức đầu, ho khan, sổ mũi) và <strong>vitamin, thực phẩm bồi bổ sức khỏe</strong>.
            </p>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              👉 <strong>Lưu ý:</strong> Trợ lý AI <strong>tuyệt đối không chẩn đoán bệnh</strong> và <strong>không thay thế bác sĩ khám bệnh</strong>.
            </p>
          </div>

          {/* Điều 2 */}
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                2
              </span>
              <span>Không dùng trong trường hợp cấp cứu khẩn cấp</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Nếu bạn hoặc người thân bị <strong>khó thở, đau tức ngực dữ dội, ngất xỉu, co giật, sốt quá cao liên tục không hạ, chảy máu nhiều hoặc tai nạn</strong>:
            </p>
            <p className="pl-5.5 text-rose-700 font-semibold text-[11px] leading-relaxed">
              🚨 Hãy <strong>gọi ngay cấp cứu 115</strong> hoặc đến <strong>bệnh viện gần nhất</strong> để được bác sĩ cấp cứu kịp thời!
            </p>
          </div>

          {/* Điều 3 */}
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                3
              </span>
              <span>Không bán thuốc cần đơn bác sĩ trên mạng</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Theo quy định an toàn, các loại <strong>thuốc bắt buộc phải có đơn của bác sĩ</strong> (như thuốc kháng sinh, thuốc đặc trị) tuyệt đối <strong>không được bán giao hàng qua mạng</strong>.
            </p>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Bạn có thể gửi ảnh chụp đơn thuốc để Dược sĩ chuẩn bị sẵn, sau đó bạn cần <strong>mang đơn thuốc gốc đến nhận trực tiếp tại nhà thuốc</strong>.
            </p>
          </div>

          {/* Điều 4 */}
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                4
              </span>
              <span>Khai báo trung thực về sức khỏe của bạn</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Bạn cần cung cấp đúng và đầy đủ: <strong>dị ứng với loại thuốc nào, bệnh đang mắc (như huyết áp, tim mạch, tiểu đường, dạ dày), thuốc đang uống và có đang mang thai hay cho con bú không</strong>.
            </p>
            <p className="pl-5.5 text-amber-800 text-[11px] leading-relaxed">
              ⚠️ Khai báo sai có thể dẫn đến việc <strong>uống nhầm thuốc gây nguy hiểm trực tiếp cho sức khỏe</strong>.
            </p>
          </div>

          {/* Điều 5 */}
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                5
              </span>
              <span>Chỉ dùng thuốc cho chính bản thân bạn</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Lời khuyên và danh sách thuốc gợi ý chỉ dành riêng cho <strong>thể trạng của chính bạn lúc này</strong>.
            </p>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Tuyệt đối <strong>không đưa đơn thuốc này cho người khác uống theo</strong> và không tự ý dùng lại cho những lần ốm sau.
            </p>
          </div>

          {/* Điều 6 */}
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                6
              </span>
              <span>Luôn có Dược sĩ thật kiểm tra và duyệt lại</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Trợ lý AI chỉ đóng vai trò ghi nhận triệu chứng ban đầu. Mọi gợi ý thuốc <strong>bắt buộc phải được Dược sĩ thật có bằng cấp kiểm tra kỹ lưỡng</strong> thì đơn hàng mới được đóng gói bán cho bạn.
            </p>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Nếu phát hiện thuốc không an toàn, hệ thống sẽ <strong>chặn ngay</strong> và hướng dẫn bạn đi khám bác sĩ.
            </p>
          </div>

          {/* Điều 7 */}
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                7
              </span>
              <span>Minh bạch xử lý dữ liệu AI & Bảo vệ thông tin y tế</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Hệ thống tự động phát hiện và che giấu thông tin định danh cá nhân (SĐT kể cả có khoảng trắng/dấu chấm, số CCCD, Email, xưng danh họ tên) trong nội dung tin nhắn và ghi chú văn bản trước khi gửi tới mô hình AI. Hình ảnh chụp được chuyển nguyên vẹn để mô hình thị giác phân tích bao bì/đơn thuốc; bạn <strong>tuyệt đối không chụp hình chứa giấy tờ tùy thân</strong>.
            </p>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Hồ sơ y tế (tiền sử dị ứng thuốc và bệnh nền) <strong>mặc định được TẮT đính kèm</strong>. Dữ liệu này chỉ được gửi khi bạn <strong>chủ động bật tùy chọn đính kèm hồ sơ y tế</strong> trên khung chat, nhằm mục đích duy nhất là giúp AI và Dược sĩ kiểm tra tương tác thuốc, phòng tránh sốc phản vệ an toàn. Bạn có toàn quyền tắt đính kèm bất kỳ lúc nào.
            </p>
          </div>

          {/* Điều 8 */}
          <div className="pb-2 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                8
              </span>
              <span>Dừng uống thuốc ngay nếu thấy dấu hiệu lạ</span>
            </h4>
            <p className="pl-5.5 text-slate-600 text-[11px] leading-relaxed">
              Sau khi dùng thuốc, nếu thấy <strong>ngứa ngáy, nổi mẩn đỏ, khó thở, buồn nôn hoặc bất kỳ dấu hiệu lạ nào</strong>:
            </p>
            <p className="pl-5.5 text-rose-700 font-semibold text-[11px] leading-relaxed">
              📞 Hãy <strong>dừng uống thuốc ngay lập tức</strong> và gọi tổng đài Dược sĩ miễn phí: <strong>1800 6868</strong> (07:00 - 22:00) hoặc đến bệnh viện gần nhất.
            </p>
          </div>

          {/* Điểm neo chạm đáy */}
          <div className="pt-2 pb-1 text-center text-[11px] text-slate-400 italic select-none">
            — Bạn đã đọc hết nội quy an toàn —
          </div>
        </div>

        {/* Nút hỗ trợ cuộn nhanh xuống đáy khi người dùng chưa đọc hết */}
        {!hasScrolledToBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-24 right-5 z-10 flex items-center gap-1 text-[11px] bg-slate-900/85 hover:bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-md cursor-pointer transition-all active:scale-95"
          >
            <span>Cuộn xuống dưới cùng</span>
            <ChevronDown size={13} />
          </button>
        )}

        {/* Footer Xác Nhận (Hiệu ứng mở khóa checkbox khi cuộn đến đáy) */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 shrink-0 space-y-3">
          {/* Ô Checkbox tương tác có hiệu ứng mở khóa */}
          <div
            onClick={handleLockedBoxClick}
            className={`p-3 rounded-xl border transition-all duration-300 flex items-start gap-3 select-none ${shakeLocked ? "animate-subtle-shake ring-2 ring-amber-400" : ""
              } ${!hasScrolledToBottom
                ? "bg-slate-100/70 border-dashed border-slate-300/80 cursor-not-allowed opacity-75"
                : isAgreementChecked
                  ? "bg-blue-50/60 border-blue-300 shadow-2xs"
                  : justUnlocked
                    ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/60 scale-[1.01] shadow-xs"
                    : "bg-emerald-50/30 border-emerald-200 cursor-pointer hover:border-emerald-300"
              }`}
          >
            {/* Biểu tượng Checkbox / Khóa */}
            <div className="shrink-0 pt-0.5">
              {!hasScrolledToBottom ? (
                <div
                  className="w-4 h-4 rounded border border-slate-300 bg-slate-200 flex items-center justify-center text-slate-500 cursor-not-allowed"
                  title="Chưa mở khóa: Cần cuộn xuống dưới cùng trang"
                >
                  <Lock size={10} />
                </div>
              ) : (
                <input
                  id="ai-terms-friendly-checkbox"
                  type="checkbox"
                  checked={isAgreementChecked}
                  onChange={(e) => setIsAgreementChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer transition"
                />
              )}
            </div>

            {/* Nội dung cam kết & Thông báo trạng thái */}
            <div className="flex-1 text-xs">
              <label
                htmlFor={hasScrolledToBottom ? "ai-terms-friendly-checkbox" : undefined}
                className={`font-medium leading-snug block ${hasScrolledToBottom
                    ? "text-slate-800 cursor-pointer"
                    : "text-slate-500 cursor-not-allowed"
                  }`}
              >
                Tôi đã đọc kỹ và đồng ý tuân thủ toàn bộ <strong>Nội quy an toàn</strong> ở trên.
              </label>

              {/* Tag trạng thái có hiệu ứng chuyển đổi */}
              <div className="mt-1">
                {!hasScrolledToBottom ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                    <Lock size={10} />
                    <span>Cuộn xuống dưới cùng để mở khóa ô này</span>
                  </span>
                ) : justUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 animate-in fade-in duration-300">
                    <Sparkles size={11} className="text-emerald-600" />
                    <span>Đã mở khóa! Bạn hãy tích vào ô để xác nhận</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                    <Unlock size={10} />
                    <span>Đã mở khóa</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Thông báo lỗi nếu gửi API thất bại */}
          {submitError && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Nút Thao Tác (Gọn gàng) */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <button
              type="button"
              onClick={onDecline}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
            >
              Từ chối & Đóng
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || !isAgreementChecked || isSubmitting}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${hasScrolledToBottom && isAgreementChecked && !isSubmitting
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer active:scale-95"
                  : "bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed"
                }`}
            >
              <Check size={14} />
              <span>Xác nhận & Bắt đầu nhắn tin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConsultantTermsModal;
