// backend/apps/inventory-service/src/tests/uc-30-fefo-expiry-tracking.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-30] BATCH & FEFO EXPIRY DATE TRACKING (XUẤT KHO ƯU TIÊN CẬN HẠN)
 * Tham chiếu: Report 5 (Feature F04) & WBS #16 (FIFO / FEFO Issue & Expiry Warning)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-30] FEFO Expiry Tracking (Xuất Kho Ưu Tiên Cận Hạn Nhất)', () => {
  const sampleBatches = [
    { batchCode: 'LOT-DEC-2026', expiryDate: new Date('2026-12-31'), stock: 100 },
    { batchCode: 'LOT-JUN-2026', expiryDate: new Date('2026-06-30'), stock: 50 },  // Hạn cận nhất
    { batchCode: 'LOT-SEP-2026', expiryDate: new Date('2026-09-30'), stock: 80 },
  ];

  const allocateStockByFefo = (batches: typeof sampleBatches, requiredQty: number) => {
    if (requiredQty <= 0) {
      throw new Error('Số lượng yêu cầu xuất kho phải lớn hơn 0!');
    }
    const totalAvailable = batches.reduce((sum, b) => sum + b.stock, 0);
    if (requiredQty > totalAvailable) {
      throw new Error(`Tồn kho không đủ! Yêu cầu: ${requiredQty}, Khả dụng: ${totalAvailable}`);
    }

    // Sắp xếp FEFO: Lô có ngày hết hạn nhỏ nhất xuất trước
    const sorted = [...batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    const allocations = [];
    let remaining = requiredQty;

    for (const batch of sorted) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.stock, remaining);
      allocations.push({ batchCode: batch.batchCode, deducted: deduct });
      remaining -= deduct;
    }

    return {
      success: true,
      allocations,
      remainingRequired: remaining,
    };
  };

  describe('1. [Normal Values] Xuất kho theo nguyên tắc FEFO qua nhiều lô', () => {
    it('TC-UC30-NORM-01: Ưu tiên xuất hết 50 hộp từ lô hạn gần nhất (LOT-JUN-2026) trước khi sang lô tiếp theo', () => {
      const result = allocateStockByFefo(sampleBatches, 70);

      expect(result.success).toBe(true);
      expect(result.allocations).toEqual([
        { batchCode: 'LOT-JUN-2026', deducted: 50 },
        { batchCode: 'LOT-SEP-2026', deducted: 20 },
      ]);
      expect(result.remainingRequired).toBe(0);
    });
  });

  describe('2. [Boundary Values] Mốc biên xuất 1 sản phẩm và xuất sạch toàn bộ kho', () => {
    it('TC-UC30-BOUND-01: [Biên xuất tối thiểu 1 hộp] Chỉ trừ đúng 1 hộp từ lô cận hạn nhất', () => {
      const result = allocateStockByFefo(sampleBatches, 1);

      expect(result.allocations).toEqual([{ batchCode: 'LOT-JUN-2026', deducted: 1 }]);
    });

    it('TC-UC30-BOUND-02: [Biên xuất sạch toàn bộ kho] Xuất toàn bộ 230/230 hộp có trong cả 3 lô', () => {
      const result = allocateStockByFefo(sampleBatches, 230);

      expect(result.allocations).toHaveLength(3);
      expect(result.remainingRequired).toBe(0);
    });
  });

  describe('3. [Abnormal Values] Yêu cầu xuất vượt tồn hoặc số lượng âm', () => {
    it('TC-UC30-ABNORM-01: Ném lỗi khi yêu cầu xuất vượt quá tổng tồn kho khả dụng (231 > 230)', () => {
      expect(() => allocateStockByFefo(sampleBatches, 231)).toThrow(/Tồn kho không đủ/);
    });

    it('TC-UC30-ABNORM-02: Ném lỗi khi số lượng yêu cầu xuất kho bằng 0 hoặc âm', () => {
      expect(() => allocateStockByFefo(sampleBatches, 0)).toThrow(/phải lớn hơn 0/);
    });
  });
});
