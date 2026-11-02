/**
 * Tiện ích xử lý dữ liệu và mã QR cho đơn hàng phía ứng dụng Mobile
 * Tuân thủ quy chuẩn WDP301: Đảm bảo dữ liệu chuỗi QR luôn hợp lệ và không gây crash UI
 */

export interface OrderQrInput {
  id?: string;
  _id?: string;
  orderCode?: string | number;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | string;
  checkoutUrl?: string;
  qrCode?: string;
  finalAmount?: number;
}

/**
 * Lấy mã đơn hàng hiển thị an toàn dưới dạng chuỗi (String)
 * Ngăn ngừa lỗi runtime khi orderCode là number (vd: 81053351)
 * 
 * @param order Đối tượng đơn hàng
 * @returns Chuỗi mã đơn hàng (mặc định: 'ORD-ABC' nếu rỗng)
 */
export function getOrderDisplayCode(order?: OrderQrInput | null): string {
  if (!order) return 'ORD-ABC';
  const rawCode = order.orderCode != null ? String(order.orderCode).trim() : '';
  if (rawCode.length > 0) return rawCode;

  const rawId = order.id || order._id || '';
  const trimmedId = String(rawId).trim();
  return trimmedId.length > 0 ? trimmedId : 'ORD-ABC';
}

/**
 * Tạo nội dung chuỗi (payload) cho mã QR đơn hàng
 * - Đơn đã thanh toán: Trả về mã định danh chuẩn POS 'ABC_ORDER:<orderCode>' để quét tra cứu/nhận thuốc
 * - Đơn chờ thanh toán: Ưu tiên link PayOS checkoutUrl hoặc mã QR thanh toán để quét ngân hàng
 * 
 * @param order Đối tượng đơn hàng
 * @returns Chuỗi payload QR code an toàn, không bao giờ là null/undefined/number
 */
export function getOrderQrPayload(order?: OrderQrInput | null): string {
  if (!order) return 'ABC_ORDER:EMPTY';

  const displayCode = getOrderDisplayCode(order);
  const isPaid = String(order.paymentStatus || '').toUpperCase() === 'PAID';

  // Nếu đơn hàng chưa thanh toán và có liên kết thanh toán PayOS / VietQR
  if (!isPaid) {
    if (order.checkoutUrl && typeof order.checkoutUrl === 'string' && order.checkoutUrl.trim().length > 0) {
      return order.checkoutUrl.trim();
    }
    if (order.qrCode && typeof order.qrCode === 'string' && order.qrCode.trim().length > 0) {
      return order.qrCode.trim();
    }
  }

  // Trường hợp đã thanh toán hoặc đơn tra cứu tại quầy
  return `ABC_ORDER:${displayCode}`;
}

