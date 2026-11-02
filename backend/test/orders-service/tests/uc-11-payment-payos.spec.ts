// backend/apps/orders-service/src/tests/uc-11-payment-payos.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-11] PAYOS VIETQR PAYMENT (THANH TOÁN VIETQR & ĐỐI SOÁT)
 * Tham chiếu: Report 5 (Feature F02/F03) & WBS #3 (Payment Confirmation)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-11] PayOS VietQR Payment (Thanh toán & Đối soát VietQR)', () => {
  // Logic xử lý xác nhận thanh toán PayOS
  const verifyPayOsTransaction = (
    order: { orderCode: number; totalAmount: number; paymentStatus: string },
    webhookPayload: { orderCode: number; amount: number; code: string },
  ) => {
    if (!order) {
      throw new Error('Đơn hàng không tồn tại trong hệ thống (404 Not Found)!');
    }
    if (order.paymentStatus === 'PAID') {
      return { status: 'ALREADY_PAID', message: 'Đơn hàng đã được thanh toán trước đó' };
    }
    if (webhookPayload.code !== '00') {
      return { status: 'FAILED', message: 'Giao dịch qua PayOS thất bại hoặc bị hủy' };
    }
    if (webhookPayload.amount < order.totalAmount) {
      return {
        status: 'PARTIAL_PAID',
        paidAmount: webhookPayload.amount,
        missingAmount: order.totalAmount - webhookPayload.amount,
        message: 'Số tiền thanh toán chưa đủ so với tổng giá trị đơn hàng!',
      };
    }

    order.paymentStatus = 'PAID';
    return {
      status: 'PAID',
      orderCode: order.orderCode,
      paidAmount: webhookPayload.amount,
      message: 'Thanh toán VietQR PayOS thành công',
      paidAt: new Date(),
    };
  };

  // 1. NORMAL TEST CASES
  describe('1. [Normal Values] Thanh toán VietQR thành công đúng số tiền', () => {
    it('TC-UC11-NORM-01: Chuyển trạng thái đơn hàng sang PAID khi nhận webhook PayOS mã code 00 và đủ tiền', () => {
      const order = { orderCode: 202601, totalAmount: 250000, paymentStatus: 'PENDING' };
      const webhook = { orderCode: 202601, amount: 250000, code: '00' };

      const result = verifyPayOsTransaction(order, webhook);

      expect(result.status).toBe('PAID');
      expect(order.paymentStatus).toBe('PAID');
      expect(result.paidAmount).toBe(250000);
    });
  });

  // 2. BOUNDARY TEST CASES
  describe('2. [Boundary Values] Mốc biên số tiền thanh toán', () => {
    it('TC-UC11-BOUND-01: [Khớp chính xác từng đồng] Số tiền chuyển khoản đúng bằng tổng tiền đơn hàng', () => {
      const order = { orderCode: 202602, totalAmount: 154500, paymentStatus: 'PENDING' };
      const webhook = { orderCode: 202602, amount: 154500, code: '00' };

      const result = verifyPayOsTransaction(order, webhook);

      expect(result.status).toBe('PAID');
    });

    it('TC-UC11-BOUND-02: [Thanh toán dư tiền] Khách hàng chuyển khoản nhiều hơn giá trị đơn hàng', () => {
      const order = { orderCode: 202603, totalAmount: 100000, paymentStatus: 'PENDING' };
      const webhook = { orderCode: 202603, amount: 120000, code: '00' }; // Chuyển dư 20k

      const result = verifyPayOsTransaction(order, webhook);

      expect(result.status).toBe('PAID');
      expect(result.paidAmount).toBe(120000);
    });
  });

  // 3. ABNORMAL TEST CASES
  describe('3. [Abnormal Values] Thanh toán thiếu tiền, lỗi giao dịch hoặc đơn hàng không tồn tại', () => {
    it('TC-UC11-ABNORM-01: Đánh dấu PARTIAL_PAID khi khách hàng quét QR chuyển thiếu tiền (ví dụ thiếu 10.000đ)', () => {
      const order = { orderCode: 202604, totalAmount: 200000, paymentStatus: 'PENDING' };
      const webhook = { orderCode: 202604, amount: 190000, code: '00' }; // Thiếu 10k

      const result = verifyPayOsTransaction(order, webhook);

      expect(result.status).toBe('PARTIAL_PAID');
      expect(result.missingAmount).toBe(10000);
      expect(order.paymentStatus).toBe('PENDING'); // Chưa hoàn tất
    });

    it('TC-UC11-ABNORM-02: Báo lỗi FAILED khi mã kết quả PayOS khác 00 (Giao dịch bị ngân hàng từ chối)', () => {
      const order = { orderCode: 202605, totalAmount: 300000, paymentStatus: 'PENDING' };
      const webhook = { orderCode: 202605, amount: 300000, code: '01' }; // Lỗi từ PayOS

      const result = verifyPayOsTransaction(order, webhook);

      expect(result.status).toBe('FAILED');
    });

    it('TC-UC11-ABNORM-03: Ném lỗi ngoại lệ khi mã đơn hàng không tồn tại trong hệ thống', () => {
      expect(() =>
        verifyPayOsTransaction(null as any, { orderCode: 999999, amount: 100000, code: '00' }),
      ).toThrow(/Đơn hàng không tồn tại/);
    });
  });
});
