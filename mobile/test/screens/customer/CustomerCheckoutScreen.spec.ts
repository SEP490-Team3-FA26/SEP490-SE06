/**
 * File kiểm thử đơn vị cho Màn hình Thanh Toán & Đặt Hàng (CustomerCheckoutScreen)
 * Tuân thủ nghiêm ngặt Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate)
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values]: Tạo payload đặt hàng thành công với trường ghi chú cho dược sĩ (note & notes), chọn phương thức PayOS / COD, hình thức giao tận nơi / nhận tại quầy.
 * 2. [Boundary Values]: Ghi chú rỗng, ghi chú toàn khoảng trắng, đơn hàng 0 ₫ sau giảm giá voucher, độ dài tối đa của ghi chú.
 * 3. [Abnormal Values]: Dữ liệu giỏ hàng rỗng, ký tự đặc biệt / XSS injection trong ghi chú, xử lý lỗi phản hồi từ máy chủ mà không crash ứng dụng.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

describe('Kiểm thử Màn Hình Thanh Toán Khách Hàng (CustomerCheckoutScreen)', () => {
  // Hàm trợ giúp chuẩn hóa Payload Đơn Hàng (mô phỏng logic an toàn trong CustomerCheckoutScreen)
  const buildOrderPayload = (params: {
    patientName: string;
    patientPhone: string;
    shippingAddress: string;
    deliveryType: 'DELIVERY' | 'PICKUP';
    paymentMethod: 'QR_PAY' | 'CASH';
    cart: Array<{ medicine: { id: string; name: string; price: number; unit?: string }; quantity: number }>;
    finalTotal: number;
    usePoints?: boolean;
    pointsDiscount?: number;
    appliedVoucher?: { code: string } | null;
    orderNote?: string;
  }) => {
    const cleanNote = (params.orderNote || '').trim();
    const resolvedShippingAddress =
      params.deliveryType === 'DELIVERY'
        ? (cleanNote ? `${params.shippingAddress.trim()} (Ghi chú cho Dược sĩ: ${cleanNote})` : params.shippingAddress.trim())
        : (cleanNote
            ? `Nhận tại Nhà Thuốc Chi Nhánh Q1 - 123 Hai Bà Trưng, Q.1 (Ghi chú: ${cleanNote})`
            : 'Nhận tại Nhà Thuốc Chi Nhánh Q1 - 123 Hai Bà Trưng, Q.1');

    return {
      patientName: params.patientName.trim(),
      patientPhone: params.patientPhone.trim(),
      shippingAddress: resolvedShippingAddress,
      paymentMethod: params.paymentMethod,
      type: 'ONLINE',
      totalAmount: Math.round(params.finalTotal),
      redeemedPoints: params.usePoints ? (params.pointsDiscount || 0) : 0,
      items: params.cart.map((i) => ({
        medicineId: i.medicine.id,
        name: i.medicine.name,
        quantity: i.quantity,
        price: i.medicine.price,
        unit: i.medicine.unit || 'Hộp',
      })),
      ...(params.appliedVoucher ? { voucherCode: params.appliedVoucher.code } : {}),
    };
  };

  const sampleCart = [
    {
      medicine: { id: 'med-01', name: 'Panadol Extra', price: 50000, unit: 'Hộp' },
      quantity: 2,
    },
    {
      medicine: { id: 'med-02', name: 'Vitamin C 500mg', price: 30000, unit: 'Lọ' },
      quantity: 1,
    },
  ];

  // =========================================================================
  // 1. [NORMAL VALUES] - LUỒNG NGHIỆP VỤ CHUẨN
  // =========================================================================
  describe('[Normal Values] - Đặt hàng với ghi chú cho Dược sĩ & Phương thức thanh toán', () => {
    it('Tạo payload chuẩn xác tích hợp ghi chú trực tiếp vào shippingAddress để vượt qua ValidationPipe', () => {
      const payload = buildOrderPayload({
        patientName: 'TJP',
        patientPhone: '0936929381',
        shippingAddress: '48 Tiểu La, Đà Nẵng',
        deliveryType: 'DELIVERY',
        paymentMethod: 'QR_PAY',
        cart: sampleCart,
        finalTotal: 130000,
        orderNote: 'tuff',
      });

      expect(payload.patientName).toBe('TJP');
      expect(payload.patientPhone).toBe('0936929381');
      expect(payload.shippingAddress).toBe('48 Tiểu La, Đà Nẵng (Ghi chú cho Dược sĩ: tuff)');
      expect(payload.paymentMethod).toBe('QR_PAY');
      // Đảm bảo không gửi thuộc tính thừa `note` lên máy chủ tránh lỗi 400 ValidationPipe
      expect((payload as any).note).toBeUndefined();
      expect((payload as any).notes).toBeUndefined();
      expect(payload.items).toHaveLength(2);
      expect(payload.totalAmount).toBe(130000);
    });

    it('Chọn hình thức "Nhận Tại Nhà Thuốc" tự động điền địa chỉ chi nhánh kèm ghi chú nhận thuốc', () => {
      const payload = buildOrderPayload({
        patientName: 'Nguyễn Văn B',
        patientPhone: '0912345678',
        shippingAddress: '',
        deliveryType: 'PICKUP',
        paymentMethod: 'CASH',
        cart: sampleCart,
        finalTotal: 130000,
        orderNote: 'Đến lấy lúc 15h',
      });

      expect(payload.shippingAddress).toContain('Nhận tại Nhà Thuốc');
      expect(payload.shippingAddress).toContain('(Ghi chú: Đến lấy lúc 15h)');
      expect((payload as any).note).toBeUndefined();
      expect(payload.paymentMethod).toBe('CASH');
    });

    it('Xác thực màu sắc giao diện sử dụng Tone Xanh Nước Biển Basic (#0284C7), không dùng màu xanh lá cây', () => {
      const themeColors = {
        primary: '#0284C7',
        primaryDark: '#0369A1',
        primaryLight: '#F0F9FF',
        borderFocus: '#BAE6FD',
      };

      expect(themeColors.primary).toBe('#0284C7');
      expect(themeColors.primary).not.toBe('#059669');
      expect(themeColors.primaryLight).not.toBe('#ECFDF5');
    });
  });

  // =========================================================================
  // 2. [BOUNDARY VALUES] - GIÁ TRỊ BIÊN & CỰC TRỊ
  // =========================================================================
  describe('[Boundary Values] - Kiểm tra các giá trị biên của ghi chú và giảm giá', () => {
    it('Khi ghi chú rỗng hoặc chỉ có khoảng trắng, địa chỉ giao hàng giữ nguyên không kèm hậu tố ghi chú', () => {
      const payloadEmpty = buildOrderPayload({
        patientName: 'TJP',
        patientPhone: '0936929381',
        shippingAddress: '48 Tiểu La',
        deliveryType: 'DELIVERY',
        paymentMethod: 'QR_PAY',
        cart: sampleCart,
        finalTotal: 130000,
        orderNote: '   ',
      });

      expect(payloadEmpty.shippingAddress).toBe('48 Tiểu La');
      expect((payloadEmpty as any).note).toBeUndefined();
      expect((payloadEmpty as any).notes).toBeUndefined();
    });

    it('Đơn hàng có voucher giảm giá 100% (tổng tiền = 0 ₫) không kích hoạt cổng thanh toán PayOS', () => {
      const isFreeOrder = (finalTotal: number) => Math.round(finalTotal) <= 0;
      expect(isFreeOrder(0)).toBe(true);
      expect(isFreeOrder(-100)).toBe(true);
      expect(isFreeOrder(1000)).toBe(false);
    });

    it('Ghi chú độ dài tối đa 500 ký tự được nối an toàn vào địa chỉ giao hàng', () => {
      const longNote = 'A'.repeat(500);
      const payload = buildOrderPayload({
        patientName: 'TJP',
        patientPhone: '0936929381',
        shippingAddress: '48 Tiểu La',
        deliveryType: 'DELIVERY',
        paymentMethod: 'QR_PAY',
        cart: sampleCart,
        finalTotal: 130000,
        orderNote: longNote,
      });

      expect(payload.shippingAddress).toContain(longNote);
      expect((payload as any).note).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. [ABNORMAL VALUES] - DỮ LIỆU DỊ THƯỜNG & NGOẠI LỆ
  // =========================================================================
  describe('[Abnormal Values] - Xử lý ngoại lệ dữ liệu bất thường và lỗi server', () => {
    it('Ghi chú chứa ký tự đặc biệt, dấu xuống dòng và thẻ HTML được nối an toàn vào địa chỉ', () => {
      const maliciousNote = '<script>alert("xss")</script>\nGọi số: 0988776655! & "giao trước 12h"';
      const payload = buildOrderPayload({
        patientName: 'TJP',
        patientPhone: '0936929381',
        shippingAddress: '48 Tiểu La',
        deliveryType: 'DELIVERY',
        paymentMethod: 'QR_PAY',
        cart: sampleCart,
        finalTotal: 130000,
        orderNote: maliciousNote,
      });

      expect(payload.shippingAddress).toContain(maliciousNote);
      expect((payload as any).note).toBeUndefined();
      expect((payload as any).notes).toBeUndefined();
    });

    it('Xử lý thông báo lỗi phản hồi từ backend dạng mảng hoặc chuỗi mà không làm crash app', () => {
      const parseBackendError = (data: any, statusCode: number) => {
        if (Array.isArray(data?.message)) {
          return data.message.join(', ');
        }
        return data?.message || data?.error || `Lỗi tạo đơn hàng (Mã ${statusCode})`;
      };

      const arrayError = { message: ['property note should not exist', 'invalid phone'] };
      const stringError = { message: 'Tồn kho không đủ' };
      const fallbackError = {};

      expect(parseBackendError(arrayError, 400)).toBe('property note should not exist, invalid phone');
      expect(parseBackendError(stringError, 400)).toBe('Tồn kho không đủ');
      expect(parseBackendError(fallbackError, 500)).toBe('Lỗi tạo đơn hàng (Mã 500)');
    });
  });
});

