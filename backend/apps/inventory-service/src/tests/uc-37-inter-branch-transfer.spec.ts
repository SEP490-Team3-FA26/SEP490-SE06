// backend/apps/inventory-service/src/tests/uc-37-inter-branch-transfer.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-37] INTER-BRANCH STOCK TRANSFER (CHUYỂN KHO LIÊN CHI NHÁNH)
 * Tham chiếu: Report 5 (Feature F05) & WBS #21 (Inter-Branch Transfer Slip)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-37] Inter-Branch Stock Transfer (Chuyển kho liên chi nhánh)', () => {
  const createStockMap = () => ({
    'BRANCH-A': 500, // Chi nhánh chuyển đi
    'BRANCH-B': 20,  // Chi nhánh nhận
  });

  const transferStock = (
    stocks: ReturnType<typeof createStockMap>,
    fromBranch: 'BRANCH-A' | 'BRANCH-B',
    toBranch: 'BRANCH-A' | 'BRANCH-B',
    qty: number,
  ) => {
    if (fromBranch === toBranch) {
      throw new Error('Chi nhánh nguồn và chi nhánh đích không được trùng nhau!');
    }
    if (qty <= 0) {
      throw new Error('Số lượng chuyển kho phải lớn hơn 0!');
    }
    if (stocks[fromBranch] < qty) {
      throw new Error(`Tồn kho chi nhánh nguồn (${stocks[fromBranch]}) không đủ để chuyển (${qty})!`);
    }

    stocks[fromBranch] -= qty;
    stocks[toBranch] += qty;

    return {
      success: true,
      fromBalance: stocks[fromBranch],
      toBalance: stocks[toBranch],
      transferred: qty,
      status: 'TRANSFER_COMPLETED',
    };
  };

  describe('1. [Normal Values] Điều chuyển hàng thành công giữa 2 chi nhánh', () => {
    it('TC-UC37-NORM-01: Chuyển 150 hộp từ Chi nhánh A sang Chi nhánh B', () => {
      const stocks = createStockMap();
      const result = transferStock(stocks, 'BRANCH-A', 'BRANCH-B', 150);

      expect(result.success).toBe(true);
      expect(result.fromBalance).toBe(350); // 500 - 150 = 350
      expect(result.toBalance).toBe(170);   // 20 + 150 = 170
    });
  });

  describe('2. [Boundary Values] Mốc biên 1 sản phẩm và chuyển sạch kho', () => {
    it('TC-UC37-BOUND-01: [Biên tối thiểu] Chuyển đúng 1 sản phẩm (qty = 1)', () => {
      const stocks = createStockMap();
      const result = transferStock(stocks, 'BRANCH-A', 'BRANCH-B', 1);

      expect(result.fromBalance).toBe(499);
      expect(result.toBalance).toBe(21);
    });

    it('TC-UC37-BOUND-02: [Biên tối đa toàn bộ tồn kho] Chuyển toàn bộ 500/500 sản phẩm từ chi nhánh A', () => {
      const stocks = createStockMap();
      const result = transferStock(stocks, 'BRANCH-A', 'BRANCH-B', 500);

      expect(result.fromBalance).toBe(0);
      expect(result.toBalance).toBe(520);
    });
  });

  describe('3. [Abnormal Values] Chuyển vượt tồn hoặc chuyển cùng 1 chi nhánh', () => {
    it('TC-UC37-ABNORM-01: Ném lỗi khi số lượng chuyển vượt quá tồn kho chi nhánh gửi (501 > 500)', () => {
      const stocks = createStockMap();
      expect(() => transferStock(stocks, 'BRANCH-A', 'BRANCH-B', 501)).toThrow(/không đủ để chuyển/);
    });

    it('TC-UC37-ABNORM-02: Ném lỗi khi chi nhánh nguồn và chi nhánh đích trùng nhau', () => {
      const stocks = createStockMap();
      expect(() => transferStock(stocks, 'BRANCH-A', 'BRANCH-A', 50)).toThrow(/không được trùng nhau/);
    });
  });
});
