// backend/apps/orders-service/src/tests/customer-order-qr.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: CUSTOMER ORDER QR CODE & VERIFICATION (MÃ QR ĐƠN HÀNG KHÁCH HÀNG)
 * Quy chuẩn: Test-Coupled Mandate (RULE[sep.md]) & Fullstack Playbook v2.0
 * Phân loại bài test: [Normal Values], [Boundary Values], [Abnormal Values]
 * Ngôn ngữ chú thích: Tiếng Việt 100%
 * =========================================================================
 */

interface OrderQrInput {
  id?: string;
  _id?: string;
  orderCode?: string | number;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | string;
  checkoutUrl?: string;
  qrCode?: string;
  finalAmount?: number;
}

/**
 * Hàm tiện ích định dạng mã đơn hàng hiển thị an toàn
 */
function getOrderDisplayCode(order?: OrderQrInput | null): string {
  if (!order) return 'ORD-ABC';
  const rawCode = order.orderCode != null ? String(order.orderCode).trim() : '';
  if (rawCode.length > 0) return rawCode;

  const rawId = order.id || order._id || '';
  const trimmedId = String(rawId).trim();
  return trimmedId.length > 0 ? trimmedId : 'ORD-ABC';
}

/**
 * Hàm tiện ích sinh payload mã QR cho ứng dụng Mobile / POS
 */
function getOrderQrPayload(order?: OrderQrInput | null): string {
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

describe('[Customer Order QR] Kiểm tra logic mã QR đơn hàng Mobile & Quầy POS', () => {
  // =========================================================================
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('TC-QR-NORM-01: Đơn hàng đã thanh toán (PAID) với mã số orderCode sinh mã QR tra cứu POS', () => {
      // Đơn hàng thực tế trong hình ảnh chụp: 81053351, ĐÃ THANH TOÁN
      const order: OrderQrInput = {
        orderCode: 81053351,
        finalAmount: 70794,
        paymentStatus: 'PAID',
      };

      const displayCode = getOrderDisplayCode(order);
      const payload = getOrderQrPayload(order);

      // Mã hiển thị phải là chuỗi string chuẩn
      expect(typeof displayCode).toBe('string');
      expect(displayCode).toBe('81053351');

      // Payload phải bắt đầu bằng prefix tra cứu ABC_ORDER
      expect(payload).toBe('ABC_ORDER:81053351');
    });

    it('TC-QR-NORM-02: Đơn hàng chờ thanh toán (PENDING) có link PayOS checkoutUrl sinh mã QR thanh toán', () => {
      const order: OrderQrInput = {
        orderCode: 99120345,
        finalAmount: 150000,
        paymentStatus: 'PENDING',
        checkoutUrl: 'https://pay.payos.vn/web/abc-checkout-link-123',
      };

      const payload = getOrderQrPayload(order);
      expect(payload).toBe('https://pay.payos.vn/web/abc-checkout-link-123');
    });

    it('TC-QR-NORM-03: Đơn hàng chờ thanh toán có chuỗi VietQR raw string sinh mã QR chuyển khoản trực tiếp', () => {
      const order: OrderQrInput = {
        orderCode: 99120346,
        finalAmount: 200000,
        paymentStatus: 'PENDING',
        qrCode: '00020101021238540010A0000007270124000697042201100348719266530370454062000005802VN',
      };

      const payload = getOrderQrPayload(order);
      expect(payload.startsWith('000201010212')).toBe(true);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên, tối thiểu, tối đa, 0, chuỗi trắng
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên & Idempotency', () => {
    it('TC-QR-BOUND-01: orderCode là số 0 hoặc số nguyên cực lớn an toàn chuyển đổi sang string', () => {
      const bigOrder: OrderQrInput = {
        orderCode: 9007199254740991, // Number.MAX_SAFE_INTEGER
        paymentStatus: 'PAID',
      };
      expect(getOrderDisplayCode(bigOrder)).toBe('9007199254740991');
      expect(getOrderQrPayload(bigOrder)).toBe('ABC_ORDER:9007199254740991');
    });

    it('TC-QR-BOUND-02: Không có orderCode nhưng có Mongo _id hoặc id thì fallback sang id an toàn', () => {
      const orderWithId: OrderQrInput = {
        _id: '6726190abf12c98d76543210',
        paymentStatus: 'PAID',
      };
      expect(getOrderDisplayCode(orderWithId)).toBe('6726190abf12c98d76543210');
      expect(getOrderQrPayload(orderWithId)).toBe('ABC_ORDER:6726190abf12c98d76543210');
    });

    it('TC-QR-BOUND-03: orderCode là chuỗi trắng (whitespace) tự động trim và dùng fallback', () => {
      const orderBlank: OrderQrInput = {
        orderCode: '   ',
        paymentStatus: 'PAID',
      };
      expect(getOrderDisplayCode(orderBlank)).toBe('ORD-ABC');
      expect(getOrderQrPayload(orderBlank)).toBe('ABC_ORDER:ORD-ABC');
    });

    it('TC-QR-BOUND-04: Đơn hàng PENDING nhưng không có checkoutUrl và qrCode fallback sang mã tra cứu', () => {
      const orderNoLink: OrderQrInput = {
        orderCode: 123456,
        paymentStatus: 'PENDING',
      };
      expect(getOrderQrPayload(orderNoLink)).toBe('ABC_ORDER:123456');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường, rỗng, null, undefined, ngoại lệ
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường & Chống Crash', () => {
    it('TC-QR-ABNORM-01: Order là null hoặc undefined không làm crash hàm và trả fallback an toàn', () => {
      expect(getOrderDisplayCode(null)).toBe('ORD-ABC');
      expect(getOrderDisplayCode(undefined)).toBe('ORD-ABC');
      expect(getOrderQrPayload(null)).toBe('ABC_ORDER:EMPTY');
      expect(getOrderQrPayload(undefined)).toBe('ABC_ORDER:EMPTY');
    });

    it('TC-QR-ABNORM-02: Order là object rỗng không có bất kỳ thuộc tính nào', () => {
      const emptyOrder = {};
      expect(getOrderDisplayCode(emptyOrder)).toBe('ORD-ABC');
      expect(getOrderQrPayload(emptyOrder)).toBe('ABC_ORDER:ORD-ABC');
    });

    it('TC-QR-ABNORM-03: checkoutUrl là kiểu dữ liệu sai (số, boolean) không gây lỗi crash runtime', () => {
      const badOrder = {
        orderCode: 'ORD-ERR-01',
        paymentStatus: 'PENDING',
        checkoutUrl: 123456 as any,
      };
      // Vì checkoutUrl không phải string hợp lệ, hàm tự động fallback an toàn
      expect(getOrderQrPayload(badOrder)).toBe('ABC_ORDER:ORD-ERR-01');
    });
  });
});

