// backend/apps/orders-service/src/tests/uc-74-flash-sale-campaign.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-74] FLASH SALE CAMPAIGN MANAGEMENT (CHIẾN DỊCH FLASH SALE)
 * Tham chiếu: Report 5 (Feature F07) & WBS #2
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-74] Flash Sale Campaign Management (Chiến dịch Flash Sale)', () => {
  const createMockCampaign = (overrides = {}) => ({
    campaignId: 'FS-2026',
    medicineId: 'MED-PANADOL',
    salePrice: 29000,
    originalPrice: 50000,
    maxPerUser: 3,
    remainingStock: 100,
    startTime: new Date(Date.now() - 3600000), // 1h trước
    endTime: new Date(Date.now() + 3600000),   // 1h tới
    ...overrides,
  });

  const evaluateFlashSale = (campaign: any, requestedQty: number, currentTime = new Date()) => {
    if (currentTime < campaign.startTime) {
      throw new Error('Chiến dịch Flash Sale chưa bắt đầu!');
    }
    if (currentTime > campaign.endTime) {
      throw new Error('Chiến dịch Flash Sale đã kết thúc!');
    }
    if (requestedQty <= 0) {
      throw new Error('Số lượng mua phải lớn hơn 0!');
    }
    if (requestedQty > campaign.maxPerUser) {
      return {
        eligible: false,
        reason: `Vượt hạn mức tối đa (${campaign.maxPerUser} sản phẩm/khách hàng)!`,
      };
    }
    if (requestedQty > campaign.remainingStock) {
      return {
        eligible: false,
        reason: 'Số lượng hàng khuyến mãi trong kho không đủ!',
      };
    }

    return {
      eligible: true,
      price: campaign.salePrice,
      totalAmount: requestedQty * campaign.salePrice,
      savings: requestedQty * (campaign.originalPrice - campaign.salePrice),
    };
  };

  // 1. NORMAL TEST CASES
  describe('1. [Normal Values] Mua hàng trong khung giờ Flash Sale', () => {
    it('TC-UC74-NORM-01: Áp dụng giá Flash Sale thành công và tính đúng số tiền tiết kiệm', () => {
      const campaign = createMockCampaign();
      const result = evaluateFlashSale(campaign, 2);

      expect(result.eligible).toBe(true);
      expect(result.totalAmount).toBe(58000); // 2 * 29k = 58k
      expect(result.savings).toBe(42000);     // Tiết kiệm 42k
    });
  });

  // 2. BOUNDARY TEST CASES
  describe('2. [Boundary Values] Mốc biên số lượng tối đa và thời gian', () => {
    it('TC-UC74-BOUND-01: [Khớp chính xác số lượng tối đa] Mua đúng 3 sản phẩm (maxPerUser = 3)', () => {
      const campaign = createMockCampaign({ maxPerUser: 3 });
      const result = evaluateFlashSale(campaign, 3);

      expect(result.eligible).toBe(true);
      expect(result.totalAmount).toBe(87000);
    });

    it('TC-UC74-BOUND-02: [Vượt biên 1 đơn vị] Mua 4 sản phẩm khi giới hạn là 3', () => {
      const campaign = createMockCampaign({ maxPerUser: 3 });
      const result = evaluateFlashSale(campaign, 4);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Vượt hạn mức tối đa');
    });
  });

  // 3. ABNORMAL TEST CASES
  describe('3. [Abnormal Values] Mua trước giờ mở bán hoặc sau khi hết giờ', () => {
    it('TC-UC74-ABNORM-01: Ném lỗi khi cố tình đặt mua trước giờ chiến dịch bắt đầu', () => {
      const futureCampaign = createMockCampaign({
        startTime: new Date(Date.now() + 3600000), // 1 tiếng nữa mới bắt đầu
      });

      expect(() => evaluateFlashSale(futureCampaign, 1)).toThrow(/chưa bắt đầu/);
    });

    it('TC-UC74-ABNORM-02: Ném lỗi khi chiến dịch đã hết hạn đếm ngược', () => {
      const expiredCampaign = createMockCampaign({
        endTime: new Date(Date.now() - 60000), // Hết hạn 1 phút trước
      });

      expect(() => evaluateFlashSale(expiredCampaign, 1)).toThrow(/đã kết thúc/);
    });
  });
});
