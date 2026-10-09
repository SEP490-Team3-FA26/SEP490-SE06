import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QrCode, X, CheckCircle, XCircle, Clock } from "lucide-react";

// --- Type Definitions ---

interface VietQRPopupProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderCode: string;
  description?: string;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
}

// Payment polling interval in milliseconds
const POLL_INTERVAL_MS = 3000;
// Countdown duration in seconds (10 minutes)
const COUNTDOWN_SECONDS = 10 * 60;

// --- Helper ---

const formatVND = (value: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCountdown = (seconds: number): string => {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

// --- Main Component ---

export function VietQRPopup({
  isOpen,
  onClose,
  amount,
  orderCode,
  description,
  onPaymentSuccess,
  onPaymentCancel,
}: VietQRPopupProps) {
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear all intervals
  const clearIntervals = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  // Poll payment status every POLL_INTERVAL_MS
  const startPolling = useCallback(() => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        // Replace with real API call: orderService.checkOrderStatus(orderCode)
        // const res = await orderService.checkOrderStatus(orderCode);
        // if (res?.status === 'PAID') { clearIntervals(); onPaymentSuccess(); }
        console.debug("[VietQRPopup] Polling payment status for", orderCode);
      } catch (err) {
        console.error("[VietQRPopup] Poll error:", err);
      }
    }, POLL_INTERVAL_MS);
  }, [orderCode, clearIntervals]);

  // Countdown timer
  const startCountdown = useCallback(() => {
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearIntervals();
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearIntervals]);

  // Start/stop timers based on open state
  useEffect(() => {
    if (isOpen) {
      setCountdown(COUNTDOWN_SECONDS);
      setIsExpired(false);
      startPolling();
      startCountdown();
    } else {
      clearIntervals();
    }
    return () => clearIntervals();
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    // Slight delay to show the loading state before delegating to parent
    await new Promise((r) => setTimeout(r, 600));
    clearIntervals();
    onPaymentSuccess();
    setIsConfirming(false);
  };

  const handleCancel = () => {
    clearIntervals();
    onPaymentCancel();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        // Backdrop
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md"
          onClick={(e) => {
            // Close only when clicking directly on backdrop
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-sm mx-auto overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/5 border-b border-teal-100/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center">
                  <QrCode size={16} className="text-teal-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm leading-tight">
                    Thanh toán VietQR
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">#{orderCode}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close VietQR payment popup"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* QR placeholder */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-[200px] h-[200px] bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex flex-col items-center justify-center gap-2 border border-emerald-200/60 shadow-inner">
                  <QrCode size={80} className="text-teal-600 opacity-60" />
                  <span className="font-mono text-xs text-teal-700 font-semibold tracking-wider">
                    {orderCode}
                  </span>
                </div>

                {/* Countdown timer */}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock size={13} />
                  <span className="text-xs">Hết hạn sau</span>
                  <span
                    className={`font-mono tabular-nums font-bold text-sm ${
                      isExpired
                        ? "text-rose-500"
                        : countdown <= 60
                        ? "text-amber-500"
                        : "text-teal-600"
                    }`}
                  >
                    {formatCountdown(countdown)}
                  </span>
                </div>
                {isExpired && (
                  <p className="text-xs text-rose-500 font-medium text-center">
                    Mã QR đã hết hạn. Vui lòng tạo đơn mới.
                  </p>
                )}
              </div>

              {/* Bank info */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/60 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Ngân hàng</span>
                  <span className="font-semibold text-slate-700">VietinBank</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Số tài khoản</span>
                  <span className="font-mono font-bold text-slate-700">1234 5678 9012</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tên TK</span>
                  <span className="font-semibold text-slate-700">ABC PHARMACY</span>
                </div>
                {description && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Nội dung</span>
                    <span className="font-mono text-slate-600 truncate max-w-[160px]">
                      {description}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200/80 pt-2 flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold">Số tiền</span>
                  <div className="text-right">
                    <span className="font-mono tabular-nums font-black text-2xl text-emerald-700">
                      {formatVND(amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instruction */}
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Quét mã để thanh toán. Mã hết hạn sau{" "}
                <span className="font-mono font-semibold text-slate-500">
                  {formatCountdown(countdown)}
                </span>
                .
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                {/* Cancel */}
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl border-2 border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <XCircle size={15} />
                  <span>Hủy</span>
                </button>

                {/* Confirm paid */}
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming || isExpired}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  {isConfirming ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                  ) : (
                    <CheckCircle size={15} />
                  )}
                  <span>{isConfirming ? "Xác nhận..." : "Đã thanh toán"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
