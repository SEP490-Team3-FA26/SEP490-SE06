// backend/apps/orders-service/src/tests/uc-20-voucher-management.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-20] VOUCHER & LOYALTY DISCOUNT (ÁP DỤNG VOUCHER KHUYẾN MÃI)
 * Tham chiếu: Report 5 (Feature F03) & WBS #2 (Promotion & Discount Code)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-20] Voucher & Loyalty Discount (Áp dụng Voucher Khuyến Mãi)', () => {
  // Mock voucher mẫu
  const createMockVoucher = (overrides = {}) => ({
    code: 'DISCOUNT30K',
    discountType: 'FIXED_AMOUNT',
    discountValue: 30000,
    minOrderValue: 200000,
    maxDiscountValue: 30000,
    isActive: true,
    startDate: new Date(Date.now() - 86400000), // Hôm qua
    expiryDate: new Date(Date.now() + 86400000 * 7), // 7 ngày tới
    ...overrides,
  });

  // Logic kiểm tra và áp dụng voucher
  const applyVoucher = (voucher: any, orderTotal: number) => {
    if (!voucher || !voucher.isActive) {
      throw new Error('Mã giảm giá không tồn tại hoặc đã bị tạm ngưng sử dụng!');
    }
    const now = new Date();
    if (now < voucher.startDate || now > voucher.expiryDate) {
      throw new Error('Mã giảm giá đã hết hạn sử dụng!');
    }
    if (orderTotal < voucher.minOrderValue) {
      return {
        applicable: false,
        discountAmount: 0,
        finalTotal: orderTotal,
        reason: `Đơn hàng tối thiểu phải từ ${voucher.minOrderValue.toLocaleString()}đ để dùng mã này!`,
      };
    }

    let discount = 0;
    if (voucher.discountType === 'PERCENTAGE') {
      discount = (orderTotal * voucher.discountValue) / 100;
      if (voucher.maxDiscountValue && discount > voucher.maxDiscountValue) {
        discount = voucher.maxDiscountValue;
      }
    } else {
      discount = voucher.discountValue;
    }

    discount = Math.min(discount, orderTotal);
    return {
      applicable: true,
      voucherCode: voucher.code,
      discountAmount: discount,
      finalTotal: orderTotal - discount,
      reason: 'Áp dụng mã giảm giá thành công',
    };
  };

  // 1. NORMAL TEST CASES
  describe('1. [Normal Values] Áp dụng voucher hợp lệ và giảm trừ tiền thành công', () => {
    it('TC-UC20-NORM-01: Áp dụng voucher cố định 30.000đ cho đơn hàng 300.000đ (thỏa minOrderValue = 200k)', () => {
      const voucher = createMockVoucher();
      const orderTotal = 300000;

      const result = applyVoucher(voucher, orderTotal);

      expect(result.applicable).toBe(true);
      expect(result.discountAmount).toBe(30000);
      expect(result.finalTotal).toBe(270000); // 300k - 30k = 270k
    });

    it('TC-UC20-NORM-02: Áp dụng voucher tỷ lệ phần trăm (10%) có trần tối đa (maxDiscount = 50.000đ)', () => {
      const percentageVoucher = createMockVoucher({
        code: 'SALE10PERCENT',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscountValue: 50000,
        minOrderValue: 100000,
      });

      // Đơn 800.000đ -> 10% = 80.000đ nhưng bị chặn trần 50.000đ
      const result = applyVoucher(percentageVoucher, 800000);

      expect(result.applicable).toBe(true);
      expect(result.discountAmount).toBe(50000); // Chặn trần 50k
      expect(result.finalTotal).toBe(750000);
    });
  });

  // 2. BOUNDARY TEST CASES
  describe('2. [Boundary Values] Các mốc biên giá trị đơn hàng tối thiểu', () => {
    it('TC-UC20-BOUND-01: [Khớp chính xác giá trị tối thiểu] Đơn hàng đúng bằng 200.000đ (orderTotal === minOrderValue)', () => {
      const voucher = createMockVoucher({ minOrderValue: 200000 });
      const exactMinTotal = 200000;

      const result = applyVoucher(voucher, exactMinTotal);

      expect(result.applicable).toBe(true);
      expect(result.discountAmount).toBe(30000);
      expect(result.finalTotal).toBe(170000);
    });

    it('TC-UC20-BOUND-02: [Thiếu 1 VNĐ để đủ điều kiện] Đơn hàng 199.999đ (orderTotal = minOrderValue - 1)', () => {
      const voucher = createMockVoucher({ minOrderValue: 200000 });
      const belowByOneVnd = 199999;

      const result = applyVoucher(voucher, belowByOneVnd);

      expect(result.applicable).toBe(false);
      expect(result.discountAmount).toBe(0);
      expect(result.reason).toContain('Đơn hàng tối thiểu');
    });
  });

  // 3. ABNORMAL TEST CASES
  describe('3. [Abnormal Values] Xử lý voucher hết hạn hoặc bị vô hiệu hóa', () => {
    it('TC-UC20-ABNORM-01: Ném lỗi khi voucher đã hết hạn sử dụng', () => {
      const expiredVoucher = createMockVoucher({
        startDate: new Date(Date.now() - 86400000 * 10),
        expiryDate: new Date(Date.now() - 86400000), // Hết hạn hôm qua
      });

      expect(() => applyVoucher(expiredVoucher, 500000)).toThrow(/hết hạn sử dụng/);
    });

    it('TC-UC20-ABNORM-02: Ném lỗi khi voucher bị tắt kích hoạt (isActive = false)', () => {
      const inactiveVoucher = createMockVoucher({ isActive: false });

      expect(() => applyVoucher(inactiveVoucher, 500000)).toThrow(/bị tạm ngưng sử dụng/);
    });
  });
});
