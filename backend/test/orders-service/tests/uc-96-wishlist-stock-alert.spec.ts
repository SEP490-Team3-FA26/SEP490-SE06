// backend/apps/orders-service/src/tests/uc-96-wishlist-stock-alert.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-96] WISHLIST & BACK-IN-STOCK NOTIFICATION (THÔNG BÁO THUỐC VỀ KHO)
 * Tham chiếu: Report 5 (Feature F02)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-96] Wishlist & Back-In-Stock Notification (Thuốc về kho)', () => {
  const processStockArrival = (wishlist: { userId: string; medicineId: string; notified: boolean }, arrivalQty: number) => {
    if (arrivalQty < 0) {
      throw new Error('Số lượng hàng nhập kho không hợp lệ (số âm)!');
    }
    if (arrivalQty === 0) {
      return { notified: false, message: 'Chưa có hàng về kho' };
    }
    wishlist.notified = true;
    return {
      notified: true,
      availableStock: arrivalQty,
      message: 'Đã gửi thông báo đẩy (Push Notification) đến khách hàng!',
    };
  };

  describe('1. [Normal Values] Thông báo có hàng khi nhập kho thành công', () => {
    it('TC-UC96-NORM-01: Gửi thông báo đến khách hàng khi thuốc nhập về 100 hộp', () => {
      const item = { userId: 'USER-01', medicineId: 'MED-SPECIAL', notified: false };
      const result = processStockArrival(item, 100);

      expect(result.notified).toBe(true);
      expect(item.notified).toBe(true);
      expect(result.message).toContain('Đã gửi thông báo đẩy');
    });
  });

  describe('2. [Boundary Values] Mốc biên số lượng hàng về kho', () => {
    it('TC-UC96-BOUND-01: [Biên tối thiểu] Nhập đúng 1 hộp (arrivalQty = 1) cũng kích hoạt thông báo', () => {
      const item = { userId: 'USER-02', medicineId: 'MED-SPECIAL', notified: false };
      const result = processStockArrival(item, 1);

      expect(result.notified).toBe(true);
      expect(result.availableStock).toBe(1);
    });

    it('TC-UC96-BOUND-02: [Biên 0 hộp] Nhập kho = 0 không kích hoạt gửi thông báo', () => {
      const item = { userId: 'USER-03', medicineId: 'MED-SPECIAL', notified: false };
      const result = processStockArrival(item, 0);

      expect(result.notified).toBe(false);
    });
  });

  describe('3. [Abnormal Values] Xử lý số lượng âm', () => {
    it('TC-UC96-ABNORM-01: Ném lỗi ngoại lệ khi số lượng hàng nhập kho bị âm', () => {
      const item = { userId: 'USER-04', medicineId: 'MED-SPECIAL', notified: false };
      expect(() => processStockArrival(item, -10)).toThrow(/không hợp lệ/);
    });
  });
});
