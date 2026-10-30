// backend/apps/orders-service/src/tests/uc-97-rare-medicine-preorder.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-97] RARE MEDICINE PRE-ORDER BOOKING (ĐẶT CỌC THUỐC HIẾM)
 * Tham chiếu: Report 5 (Feature F02)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-97] Rare Medicine Pre-Order Booking (Đặt cọc thuốc hiếm)', () => {
  const MIN_DEPOSIT_RATE = 0.3; // Tỷ lệ đặt cọc bắt buộc tối thiểu 30%

  const createPreOrder = (rareDrug: { name: string; price: number }, depositAmount: number) => {
    if (rareDrug.price <= 0) {
      throw new Error('Giá trị thuốc hiếm không hợp lệ!');
    }
    const requiredDeposit = rareDrug.price * MIN_DEPOSIT_RATE;

    if (depositAmount < requiredDeposit) {
      return {
        confirmed: false,
        requiredDeposit,
        paidDeposit: depositAmount,
        reason: `Tiền cọc tối thiểu phải từ 30% (${requiredDeposit.toLocaleString()}đ)!`,
      };
    }

    return {
      confirmed: true,
      orderCode: Math.floor(100000 + Math.random() * 900000),
      totalPrice: rareDrug.price,
      depositPaid: depositAmount,
      remainingAmount: rareDrug.price - depositAmount,
      status: 'PREORDER_CONFIRMED',
    };
  };

  describe('1. [Normal Values] Đặt cọc thuốc hiếm hợp lệ', () => {
    it('TC-UC97-NORM-01: Xác nhận đặt trước khi khách hàng thanh toán tiền cọc 50% giá trị', () => {
      const rareDrug = { name: 'Kháng thể đơn dòng Orphan Drug', price: 20000000 }; // 20 triệu
      const deposit = 10000000; // Cọc 10 triệu (50%)

      const result = createPreOrder(rareDrug, deposit);

      expect(result.confirmed).toBe(true);
      expect(result.status).toBe('PREORDER_CONFIRMED');
      expect(result.remainingAmount).toBe(10000000);
    });
  });

  describe('2. [Boundary Values] Mốc biên 30% tiền cọc bắt buộc', () => {
    it('TC-UC97-BOUND-01: [Khớp chính xác biên 30%] Đặt cọc đúng bằng 30% giá trị thuốc', () => {
      const rareDrug = { name: 'Thuốc điều trị xơ nang', price: 10000000 }; // 10 triệu
      const exactDeposit = 3000000; // Đúng 30% = 3 triệu

      const result = createPreOrder(rareDrug, exactDeposit);

      expect(result.confirmed).toBe(true);
      expect(result.depositPaid).toBe(3000000);
      expect(result.remainingAmount).toBe(7000000);
    });

    it('TC-UC97-BOUND-02: [Thanh toán toàn bộ 100%] Đặt cọc 100% giá trị tiền thuốc', () => {
      const rareDrug = { name: 'Thuốc điều trị xơ nang', price: 10000000 };
      const fullDeposit = 10000000;

      const result = createPreOrder(rareDrug, fullDeposit);

      expect(result.confirmed).toBe(true);
      expect(result.remainingAmount).toBe(0);
    });
  });

  describe('3. [Abnormal Values] Cọc thiếu tiền hoặc giá thuốc bằng 0', () => {
    it('TC-UC97-ABNORM-01: Từ chối đơn đặt trước khi tiền cọc dưới mức 30% quy định (ví dụ cọc 20%)', () => {
      const rareDrug = { name: 'Thuốc hiếm', price: 10000000 };
      const insufficientDeposit = 2000000; // 20% < 30%

      const result = createPreOrder(rareDrug, insufficientDeposit);

      expect(result.confirmed).toBe(false);
      expect(result.reason).toContain('Tiền cọc tối thiểu phải từ 30%');
    });

    it('TC-UC97-ABNORM-02: Ném lỗi khi giá trị thuốc không hợp lệ (bằng 0 hoặc âm)', () => {
      expect(() => createPreOrder({ name: 'Lỗi', price: 0 }, 100000)).toThrow(/không hợp lệ/);
    });
  });
});
