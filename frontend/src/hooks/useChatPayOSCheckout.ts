import { useState, useEffect, useCallback } from "react";
import { orderService } from "../services/sales/order.service";
import { cartService } from "../services/sales/cart.service";
import { MessageItem } from "../components/chat/ChatMessage";
import { ChatDrugItem } from "../components/chat/DrugCard";

export interface CheckoutCustomerInfo {
  name?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  email?: string;
}

interface UseChatPayOSCheckoutParams {
  customerInfo?: CheckoutCustomerInfo;
  onSuccessMessage: (msg: MessageItem) => void;
  onEmptyCart: () => void;
  onError: (errMsg: string) => void;
  onLoginRequired: () => void;
}

/**
 * Custom hook quản lý logic lấy giỏ hàng, nhận diện intent thanh toán,
 * và gọi API tạo đơn hàng PayOS VietQR cho khung chat Dược sĩ Bồ Câu AI.
 */
export function useChatPayOSCheckout({
  customerInfo,
  onSuccessMessage,
  onEmptyCart,
  onError,
  onLoginRequired,
}: UseChatPayOSCheckoutParams) {
  const [isProcessingOrder, setIsProcessingOrder] = useState<boolean>(false);
  const [cartCount, setCartCount] = useState<number>(0);

  // Lấy toàn bộ sản phẩm trong giỏ hàng (hỗ trợ cả giỏ hàng Server và Guest cart trong localStorage)
  const getCartItems = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const cartRes = await cartService.getCart();
        const items = Array.isArray(cartRes?.items)
          ? cartRes.items
          : Array.isArray(cartRes)
          ? cartRes
          : [];
        if (items.length > 0) {
          return items.map((it: any) => ({
            medicineId: it.medicineId || it.medicine?._id || it.id || it._id,
            name: it.medicine?.name || it.name || "Dược phẩm",
            quantity: Number(it.quantity) || 1,
            price: Number(it.price || it.medicine?.price) || 0,
            unit: it.unit || it.medicine?.unit || "Hộp",
          }));
        }
      }
    } catch (e) {
      console.warn("Không lấy được giỏ hàng server, dùng guest cart:", e);
    }

    try {
      const guestCartStr = localStorage.getItem("guest_cart");
      if (guestCartStr) {
        const parsed = JSON.parse(guestCartStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it: any) => ({
            medicineId: it.medicineId || it.id || it._id,
            name: it.name || "Dược phẩm",
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            unit: it.unit || "Hộp",
          }));
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc guest cart:", e);
    }

    return [];
  }, []);

  // Lắng nghe cập nhật số lượng giỏ hàng để cập nhật badge UI
  useEffect(() => {
    const updateCartBadge = async () => {
      try {
        const items = await getCartItems();
        setCartCount(items.length);
      } catch {
        setCartCount(0);
      }
    };

    updateCartBadge();
    window.addEventListener("cartUpdated", updateCartBadge);
    return () => window.removeEventListener("cartUpdated", updateCartBadge);
  }, [getCartItems]);

  // Nhận diện intent thanh toán PayOS từ câu thoại người dùng
  const isPaymentIntent = useCallback((rawText: string): boolean => {
    const t = rawText.toLowerCase().trim();
    if (t === "thanh toán" || t === "thanh toan" || t === "mua ngay") return true;

    const keywords = [
      "thanh toán giỏ hàng",
      "thanh toan gio hang",
      "thanh toán giỏ",
      "thanh toan gio",
      "thanh toán đơn hàng",
      "thanh toan don hang",
      "thanh toán đơn",
      "thanh toan don",
      "thanh toán online",
      "thanh toan online",
      "tiền onl",
      "tien onl",
      "trả tiền onl",
      "tra tien onl",
      "thẻ ngân hàng",
      "the ngan hang",
      "chuyển khoản",
      "chuyen khoan",
      "quét mã qr",
      "quet ma qr",
      "quét qr",
      "quet qr",
      "mã qr",
      "ma qr",
      "payos",
      "vietqr",
      "mua giỏ hàng",
      "lên đơn",
      "len don",
    ];
    return keywords.some((kw) => t.includes(kw));
  }, []);

  // Gọi API tạo đơn hàng và tạo link thanh toán PayOS VietQR
  const processPayOSOrder = useCallback(
    async (
      specificItems?: Array<{ medicineId: string; name: string; quantity: number; price: number; unit?: string }>,
      customIntro?: string
    ) => {
      // Kiểm tra đăng nhập bắt buộc: khách phải đăng nhập để lưu SĐT, địa chỉ và tích điểm
      const token = localStorage.getItem("token");
      if (!token) {
        onLoginRequired();
        return;
      }

      setIsProcessingOrder(true);

      try {
        let itemsToOrder = specificItems;
        if (!itemsToOrder || itemsToOrder.length === 0) {
          itemsToOrder = await getCartItems();
        }

        if (!itemsToOrder || itemsToOrder.length === 0) {
          onEmptyCart();
          return;
        }

        const totalAmount = itemsToOrder.reduce(
          (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
          0
        );

        const customerName =
          customerInfo?.name || customerInfo?.fullName || "Khách hàng mua online";
        const customerPhone = customerInfo?.phone || "0900000000";
        const customerAddress =
          customerInfo?.address || "Nhận tại nhà thuốc ABC Pharmacy";

        const orderPayload = {
          patientName: customerName,
          patientPhone: customerPhone,
          patientEmail: customerInfo?.email || undefined,
          shippingAddress: customerAddress,
          paymentMethod: "QR_PAY",
          totalAmount,
          type: "ONLINE",
          items: itemsToOrder.map((it) => ({
            medicineId: it.medicineId,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            unit: it.unit || "Hộp",
          })),
        };

        const result = await orderService.createOrder(orderPayload);

        if (result && (result.checkoutUrl || result.orderCode)) {
          const orderCode = result.orderCode || result.order?.orderCode;
          const checkoutUrl = result.checkoutUrl;
          const qrCode = result.qrCode || checkoutUrl;

          const payosBotMsg: MessageItem = {
            id: `bot-payos-${Date.now()}`,
            sender: "bot",
            text:
              customIntro ||
              `Dạ vâng! Dược sĩ Bồ Câu đã tạo thành công mã thanh toán VietQR (PayOS) cho đơn hàng #${orderCode} với tổng tiền ${totalAmount.toLocaleString("vi-VN")}₫ gồm ${itemsToOrder.length} sản phẩm. Bạn hãy dùng App Ngân hàng quét mã QR dưới đây để thanh toán nhé:`,
            timestamp: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            payment: {
              orderCode,
              totalAmount,
              checkoutUrl,
              qrCode,
              items: itemsToOrder.map((it) => ({
                name: it.name,
                quantity: it.quantity,
                price: it.price,
                unit: it.unit,
              })),
              status: "PENDING",
              expiresAt: Date.now() + 15 * 60 * 1000,
            },
          };

          onSuccessMessage(payosBotMsg);
        } else {
          throw new Error("Không nhận được phản hồi link thanh toán từ PayOS");
        }
      } catch (err: any) {
        console.error("Lỗi tạo mã thanh toán PayOS trong Chat:", err);
        const errMsg =
          err.response?.data?.message || err.message || "Không thể kết nối cổng PayOS";
        onError(errMsg);
      } finally {
        setIsProcessingOrder(false);
      }
    },
    [customerInfo, getCartItems, onEmptyCart, onError, onSuccessMessage]
  );

  // Mua ngay 1 sản phẩm thuốc đề xuất
  const buyNowDrug = useCallback(
    async (drug: ChatDrugItem) => {
      if (!drug.medicine_id) return;
      const item = {
        medicineId: drug.medicine_id,
        name: drug.name,
        quantity: 1,
        price: drug.price || 0,
        unit: drug.unit || "Hộp",
      };

      await processPayOSOrder(
        [item],
        `Dược sĩ đã tạo mã thanh toán VietQR (PayOS) cho sản phẩm "${drug.name}". Bạn vui lòng quét mã bên dưới để hoàn tất nhé:`
      );
    },
    [processPayOSOrder]
  );

  return {
    cartCount,
    isProcessingOrder,
    isPaymentIntent,
    processPayOSOrder,
    buyNowDrug,
    getCartItems,
  };
}
