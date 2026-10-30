// backend/apps/orders-service/src/tests/wbs-08-order-exchange-return.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * SCREEN / FUNCTION: [WBS #8 & #9] EXCHANGE & RETURN PROCESSING SCREEN
 * Tham chiếu: WBS #8, #9 & Report 5 (Feature F03)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[WBS #8 & #9] Exchange & Return Processing (Đổi Trả Hàng & Hoàn Tiền)', () => {
  const POLICY_DAYS = 7;

  const returnGoods = (
    order: { orderCode: number; paid: boolean; purchaseDate: Date; boughtQty: number; unitPrice: number },
    returnQty: number,
    returnDate = new Date(),
  ) => {
    if (!order.paid) {
      throw new Error('Chỉ được đổi trả sản phẩm từ đơn hàng đã thanh toán!');
    }
    if (returnQty <= 0) {
      throw new Error('Số lượng đổi trả phải lớn hơn 0!');
    }
    if (returnQty > order.boughtQty) {
      throw new Error(`Số lượng đổi trả (${returnQty}) vượt quá số lượng đã mua (${order.boughtQty})!`);
    }

    const elapsedDays = Math.floor(
      Math.abs(returnDate.getTime() - order.purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (elapsedDays > POLICY_DAYS) {
      return {
        success: false,
        reason: `Đã quá thời hạn đổi trả quy định (${elapsedDays} ngày > ${POLICY_DAYS} ngày)!`,
        refundTotal: 0,
      };
    }

    return {
      success: true,
      refundTotal: returnQty * order.unitPrice,
      returnedQuantity: returnQty,
      remainingQuantity: order.boughtQty - returnQty,
    };
  };

  describe('1. [Normal Values] Đổi trả hàng hợp lệ trong thời hạn', () => {
    it('TC-WBS08-NORM-01: Đổi trả 2 hộp thuốc sau 3 ngày mua và hoàn tiền 100.000đ', () => {
      const order = {
        orderCode: 30301,
        paid: true,
        purchaseDate: new Date(Date.now() - 3 * 86400000), // 3 ngày trước
        boughtQty: 5,
        unitPrice: 50000,
      };

      const result = returnGoods(order, 2);

      expect(result.success).toBe(true);
      expect(result.refundTotal).toBe(100000);
      expect(result.remainingQuantity).toBe(3);
    });
  });

  describe('2. [Boundary Values] Mốc biên 7 ngày và số lượng tối đa/tối thiểu', () => {
    it('TC-WBS08-BOUND-01: [Biên thời gian tối đa] Đổi trả đúng vào ngày thứ 7 kể từ ngày mua', () => {
      const order = {
        orderCode: 30302,
        paid: true,
        purchaseDate: new Date(Date.now() - 7 * 86400000), // Đúng 7 ngày
        boughtQty: 5,
        unitPrice: 50000,
      };

      const result = returnGoods(order, 1);

      expect(result.success).toBe(true);
      expect(result.refundTotal).toBe(50000);
    });

    it('TC-WBS08-BOUND-02: [Biên số lượng toàn bộ] Đổi trả toàn bộ 5/5 sản phẩm đã mua', () => {
      const order = {
        orderCode: 30303,
        paid: true,
        purchaseDate: new Date(Date.now() - 2 * 86400000),
        boughtQty: 5,
        unitPrice: 50000,
      };

      const result = returnGoods(order, 5);

      expect(result.success).toBe(true);
      expect(result.refundTotal).toBe(250000);
      expect(result.remainingQuantity).toBe(0);
    });
  });

  describe('3. [Abnormal Values] Đổi trả quá hạn hoặc số lượng sai lệch', () => {
    it('TC-WBS08-ABNORM-01: Từ chối đổi trả khi đã quá hạn (ngày thứ 8)', () => {
      const order = {
        orderCode: 30304,
        paid: true,
        purchaseDate: new Date(Date.now() - 8 * 86400000), // 8 ngày > 7 ngày
        boughtQty: 5,
        unitPrice: 50000,
      };

      const result = returnGoods(order, 1);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Đã quá thời hạn đổi trả');
    });

    it('TC-WBS08-ABNORM-02: Ném lỗi khi số lượng trả lớn hơn số lượng đã mua (10 > 5)', () => {
      const order = {
        orderCode: 30305,
        paid: true,
        purchaseDate: new Date(Date.now() - 1 * 86400000),
        boughtQty: 5,
        unitPrice: 50000,
      };

      expect(() => returnGoods(order, 10)).toThrow(/vượt quá số lượng đã mua/);
    });
  });
});
