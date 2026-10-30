import React from "react";
import {
  QrCode,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { VietQRCode } from "../common/VietQRCode";
import { usePayOSPayment, PayOSStatus } from "../../hooks/usePayOSPayment";

export interface PayOSPaymentItem {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
}

export interface PayOSPaymentData {
  orderCode: number;
  totalAmount: number;
  checkoutUrl?: string;
  qrCode?: string;
  items: PayOSPaymentItem[];
  status: PayOSStatus;
  expiresAt?: number;
}

interface PayOSCardProps {
  payment: PayOSPaymentData;
  onPaymentSuccess?: (orderCode: number) => void;
}

/**
 * PayOS Payment Card Component (Pure UI Component)
 * Consumes state and polling logic exclusively from usePayOSPayment hook
 */
export const PayOSCard: React.FC<PayOSCardProps> = ({
  payment,
  onPaymentSuccess,
}) => {
  const {
    status,
    isChecking,
    timeFormatted,
    copiedField,
    transferContent,
    checkStatus,
    handleCopy,
  } = usePayOSPayment({
    orderCode: payment.orderCode,
    initialStatus: payment.status,
    expiresAt: payment.expiresAt,
    onPaymentSuccess,
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col animate-in fade-in zoom-in-98 duration-200">
      {/* Payment Card Header */}
      <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
            <QrCode size={14} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-tight">Thanh toán PayOS</span>
              <span className="text-[10px] bg-amber-400 text-slate-900 font-bold px-1 rounded">
                VietQR
              </span>
            </div>
          </div>
        </div>

        {/* Payment Status Badge */}
        <div>
          {status === "PAID" ? (
            <span className="bg-emerald-500 text-white font-medium text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={11} /> Thành công
            </span>
          ) : status === "EXPIRED" ? (
            <span className="bg-rose-500 text-white font-medium text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertCircle size={11} /> Hết hạn
            </span>
          ) : status === "CANCELLED" ? (
            <span className="bg-slate-500 text-white font-medium text-[10px] px-2 py-0.5 rounded-full">
              Đã hủy
            </span>
          ) : (
            <span className="bg-white/15 text-slate-200 font-medium text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Chờ quét
            </span>
          )}
        </div>
      </div>

      {/* Main Payment Content */}
      <div className="p-3.5 flex flex-col gap-3">
        {/* Order Items Summary */}
        {payment.items && payment.items.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs">
            <div className="font-medium text-slate-600 mb-1 flex items-center gap-1 text-[11px]">
              <ShoppingBag size={12} className="text-blue-600" />
              Đơn hàng #{payment.orderCode} ({payment.items.length} món)
            </div>
            <div className="max-h-20 overflow-y-auto space-y-1 pr-1">
              {(payment.items || []).map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700">
                  <span className="truncate max-w-[70%]">
                    {it.name} <span className="text-slate-400 font-normal">x{it.quantity}</span>
                  </span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 shrink-0">
                    {((it.price || 0) * (it.quantity || 1)).toLocaleString("vi-VN")}₫
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Amount to Pay */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs text-slate-500 font-normal">Cần thanh toán:</span>
          <span className="text-base font-mono tabular-nums font-bold text-blue-700">
            {(payment.totalAmount || 0).toLocaleString("vi-VN")}{" "}
            <span className="text-xs font-sans text-blue-600 font-semibold">₫</span>
          </span>
        </div>

        {/* QR Code view or success card */}
        {status === "PAID" ? (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 animate-in zoom-in-98 duration-200">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <div className="font-bold text-emerald-800 text-xs">Thanh toán hoàn tất!</div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Đơn hàng <strong>#{payment.orderCode}</strong> đã được thanh toán thành công. Dược sĩ đang chuẩn bị gửi đến bạn!
            </p>
          </div>
        ) : status === "EXPIRED" ? (
          <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-xl flex flex-col items-center justify-center text-center gap-1">
            <AlertCircle size={20} className="text-rose-500" />
            <div className="font-semibold text-rose-800 text-xs">Mã QR đã hết hạn</div>
            <p className="text-[11px] text-rose-600">
              Vui lòng nhắn "thanh toán giỏ hàng" để tạo lại mã mới.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            {/* QR Code Container */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col items-center">
              <VietQRCode
                value={payment.qrCode || payment.checkoutUrl || ""}
                size={170}
                alt="VietQR PayOS"
              />
              <div className="text-[10px] text-slate-400 mt-1.5 font-normal flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-600" />
                Quét bằng App Ngân Hàng hoặc Ví điện tử
              </div>
            </div>

            {/* Transfer Reference Details */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nội dung CK:</span>
                <button
                  type="button"
                  onClick={() => handleCopy(transferContent, "content")}
                  aria-label="Sao chép nội dung chuyển khoản"
                  className="flex items-center gap-1 font-mono font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <span>{transferContent}</span>
                  {copiedField === "content" ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                </button>
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> Thời hạn còn lại:
                </span>
                <span className="font-mono tabular-nums font-semibold text-rose-600">
                  {timeFormatted}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full flex gap-2">
              <button
                type="button"
                onClick={() => checkStatus(true)}
                disabled={isChecking}
                aria-label="Kiểm tra trạng thái thanh toán"
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={isChecking ? "animate-spin" : ""} />
                <span>{isChecking ? "Đang kiểm tra..." : "Kiểm tra"}</span>
              </button>

              {payment.checkoutUrl && (
                <a
                  href={payment.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Mở trang thanh toán PayOS bên ngoài"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Mở PayOS</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Security note footer */}
      <div className="px-3 py-1.5 bg-slate-50/80 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-slate-400" />
          Bảo mật bởi PayOS
        </span>
        <span>Xác nhận tự động</span>
      </div>
    </div>
  );
};

export default PayOSCard;
