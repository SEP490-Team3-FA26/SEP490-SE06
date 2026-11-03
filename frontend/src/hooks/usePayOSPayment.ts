import { useState, useEffect, useRef, useCallback } from "react";
import { orderService } from "../services/sales/order.service";
import { cartService } from "../services/sales/cart.service";

export type PayOSStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

interface UsePayOSPaymentParams {
  orderCode: number;
  initialStatus?: PayOSStatus;
  expiresAt?: number;
  onPaymentSuccess?: (orderCode: number) => void;
}

export function usePayOSPayment({
  orderCode,
  initialStatus = "PENDING",
  expiresAt,
  onPaymentSuccess,
}: UsePayOSPaymentParams) {
  const [status, setStatus] = useState<PayOSStatus>(initialStatus);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Khởi tạo thời gian đếm ngược (mặc định 15 phút theo quy chuẩn PayOS)
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (expiresAt) {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      return remaining > 0 ? remaining : 15 * 60;
    }
    return 15 * 60;
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Bộ đếm ngược thời hạn thanh toán
  useEffect(() => {
    if (status !== "PENDING" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("EXPIRED");
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // Kiểm tra trạng thái thanh toán từ Backend qua API Gateway
  const checkStatus = useCallback(
    async (isManual = false) => {
      if (status === "PAID") return;
      if (isManual) setIsChecking(true);

      try {
        const res = await orderService.checkOrderStatus(orderCode);
        const paymentStatus = res?.paymentStatus || res?.status || res?.data?.status;

        if (paymentStatus === "PAID" || paymentStatus === "COMPLETED" || res?.isPaid) {
          setStatus("PAID");
          if (pollingRef.current) clearInterval(pollingRef.current);

          // Xóa giỏ hàng khi đơn đã thanh toán thành công
          cartService.clearCart().catch(() => {});
          try {
            localStorage.removeItem("guest_cart");
          } catch (_) {}
          window.dispatchEvent(new Event("cartUpdated"));

          if (onPaymentSuccess) {
            onPaymentSuccess(orderCode);
          }
        } else if (paymentStatus === "CANCELLED") {
          setStatus("CANCELLED");
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra trạng thái thanh toán PayOS:", err);
      } finally {
        if (isManual) setIsChecking(false);
      }
    },
    [orderCode, status, onPaymentSuccess]
  );

  // Tự động Polling đối soát giao dịch mỗi 3.5 giây
  useEffect(() => {
    if (status !== "PENDING") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(() => {
      checkStatus(false);
    }, 3500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, checkStatus]);

  // Sao chép nội dung chuyển khoản / mã đơn vào clipboard
  const handleCopy = useCallback((text: string, field: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (_) {}
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  const transferContent = `WDP${orderCode}`;

  return {
    status,
    isChecking,
    timeLeft,
    timeFormatted,
    copiedField,
    transferContent,
    checkStatus,
    handleCopy,
  };
}
