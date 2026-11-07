// frontend/src/components/common/PrivacyPolicyModal.tsx
/**
 * =========================================================================
 * MODAL QUY ĐỊNH BẢO MẬT THÔNG TIN NGƯỜI DÙNG & DỮ LIỆU Y TẾ
 * Tuân thủ Nghị định 13/2023/NĐ-CP và Chuẩn Thực hành tốt Nhà thuốc (GPP)
 * Thiết kế tối giản, sạch sẽ, ngôn ngữ đời thường, dễ đọc, dễ hiểu
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

import React from "react";
import { ShieldCheck, X, Check, Lock, Eye, Database, BellRing, PhoneCall } from "lucide-react";

export interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal Tối Giản */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="privacy-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                  Quy Định Bảo Mật Thông Tin Người Dùng
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  Nghị định 13/2023/NĐ-CP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cam kết bảo vệ dữ liệu cá nhân và hồ sơ sức khỏe khách hàng tại ABC Pharmacy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nội Dung Quy Định Chi Tiết */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed bg-white">
          {/* Lời mở đầu cam kết */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-900 flex items-start gap-3">
            <Lock size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-xs leading-relaxed">
              ABC Pharmacy cam kết <strong>tôn trọng và bảo vệ tối đa quyền riêng tư</strong> của Quý khách. Mọi dữ liệu về danh tính cá nhân, lịch sử đơn thuốc và bệnh án điện tử đều được bảo mật nghiêm ngặt theo quy định của <strong>Bộ Y tế</strong> và <strong>pháp luật Việt Nam</strong>.
            </p>
          </div>

          {/* Điều 1: Mục đích thu thập */}
          <div className="pb-4 border-b border-slate-100 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <span>Mục Đích Thu Thập & Sử Dụng Thông Tin</span>
            </h4>
            <p className="pl-7 text-slate-600 text-xs leading-relaxed">
              Chúng tôi chỉ thu thập các thông tin cần thiết nhằm phục vụ:
            </p>
            <ul className="pl-11 list-disc space-y-1 text-slate-600 text-xs">
              <li>Xác thực tài khoản và quản lý giao dịch mua thuốc chuẩn GPP.</li>
              <li>Kiểm tra tiền sử dị ứng thuốc và bệnh nền để đưa ra cảnh báo an toàn dùng thuốc tự động.</li>
              <li>Hỗ trợ Dược sĩ tư vấn chuyên môn và giao nhận thuốc chính xác tới tay khách hàng.</li>
            </ul>
          </div>

          {/* Điều 2: Cam kết không chia sẻ với bên thứ ba */}
          <div className="pb-4 border-b border-slate-100 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <span>Tuyệt Đối Không Bán Hoặc Chia Sẻ Dữ Liệu</span>
            </h4>
            <p className="pl-7 text-slate-600 text-xs leading-relaxed">
              ABC Pharmacy <strong>tuyệt đối không bán, trao đổi hoặc thương mại hóa</strong> thông tin cá nhân và hồ sơ y tế của Quý khách cho bất kỳ bên thứ ba hay tổ chức quảng cáo nào.
            </p>
            <p className="pl-7 text-slate-600 text-xs leading-relaxed">
              Thông tin chỉ được chia sẻ trong trường hợp cơ quan y tế có thẩm quyền yêu cầu phục vụ công tác thanh tra dịch tễ theo luật định.
            </p>
          </div>

          {/* Điều 3: Tiêu chuẩn mã hóa và lưu trữ an toàn */}
          <div className="pb-4 border-b border-slate-100 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <span>Mã Hóa & Lưu Trữ An Toàn Đa Tầng</span>
            </h4>
            <p className="pl-7 text-slate-600 text-xs leading-relaxed">
              Hệ thống áp dụng các biện pháp kỹ thuật cao cấp nhất:
            </p>
            <ul className="pl-11 list-disc space-y-1 text-slate-600 text-xs">
              <li>Mật khẩu được mã hóa một chiều an toàn bằng thuật toán <strong>Bcrypt chuẩn công nghiệp</strong>.</li>
              <li>Toàn bộ đường truyền mạng được bảo vệ bởi chứng chỉ <strong>SSL/TLS 256-bit</strong>.</li>
              <li>Nhật ký truy cập và kiểm toán (Audit Trail) lưu trữ bất biến chống giả mạo.</li>
            </ul>
          </div>

          {/* Điều 4: Quyền của chủ thể dữ liệu */}
          <div className="pb-4 border-b border-slate-100 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                4
              </span>
              <span>Quyền Lợi Của Khách Hàng Đối Với Dữ Liệu</span>
            </h4>
            <p className="pl-7 text-slate-600 text-xs leading-relaxed">
              Quý khách có toàn quyền:
            </p>
            <ul className="pl-11 list-disc space-y-1 text-slate-600 text-xs">
              <li>Xem, chỉnh sửa hồ sơ sức khỏe và thông tin cá nhân bất kỳ lúc nào tại mục <strong>Sổ Sức Khỏe Số</strong>.</li>
              <li>Tải về bản sao dữ liệu y tế qua mã QR Hộ chiếu sức khỏe điện tử.</li>
              <li>Yêu cầu khóa tài khoản hoặc xóa dữ liệu cá nhân theo quy định tại Nghị định 13/2023/NĐ-CP.</li>
            </ul>
          </div>

          {/* Điều 5: Kênh liên hệ */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                5
              </span>
              <span>Kênh Tiếp Nhận Ý Kiến & Khiếu Nại</span>
            </h4>
            <p className="pl-7 text-slate-600 text-xs leading-relaxed">
              Mọi thắc mắc hoặc phản ánh liên quan đến an toàn dữ liệu, Quý khách vui lòng liên hệ:
            </p>
            <div className="pl-7 pt-1 flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5 text-blue-600">
                <PhoneCall size={14} /> Tổng đài miễn cước: 1800 6868
              </span>
              <span className="text-slate-500">
                Thời gian: 07:00 – 22:00 (Tất cả các ngày trong tuần)
              </span>
            </div>
          </div>
        </div>

        {/* Footer Thao Tác */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={() => {
              if (onAccept) onAccept();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#0057cd] hover:bg-[#00419e] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Check size={16} />
            <span>Tôi đã hiểu & Đồng ý</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;

