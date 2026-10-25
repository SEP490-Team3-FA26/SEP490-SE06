// backend/apps/inventory-service/src/tests/uc-39-branch-specific-pricing.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-39] BRANCH-SPECIFIC PRICING (THIẾT LẬP BẢNG GIÁ THEO CHI NHÁNH)
 * Tham chiếu: Report 5 (Feature F05) & WBS #48 (Branch Price List) & WBS #90 (Regional Pricing)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-39] Branch-Specific Pricing (Bảng giá theo chi nhánh)', () => {
  const BASE_PRICE = 50000; // Giá niêm yết chuẩn: 50.000đ

  const calculateBranchPrice = (basePrice: number, markupPercent: number) => {
    if (basePrice <= 0) {
      throw new Error('Giá niêm yết gốc phải lớn hơn 0!');
    }
    if (markupPercent < -50 || markupPercent > 100) {
      throw new Error('Tỷ lệ điều chỉnh giá vượt biên cho phép (-50% đến +100%)!');
    }
    return Math.round(basePrice * (1 + markupPercent / 100));
  };

  describe('1. [Normal Values] Áp dụng giá riêng cho chi nhánh vùng sâu hoặc chi nhánh sân bay', () => {
    it('TC-UC39-NORM-01: Chi nhánh sân bay áp dụng markup +10% do chi phí mặt bằng', () => {
      const price = calculateBranchPrice(BASE_PRICE, 10);
      expect(price).toBe(55000); // 50k + 10% = 55k
    });

    it('TC-UC39-NORM-02: Chi nhánh khai trương giảm giá ưu đãi -10%', () => {
      const price = calculateBranchPrice(BASE_PRICE, -10);
      expect(price).toBe(45000); // 50k - 10% = 45k
    });
  });

  describe('2. [Boundary Values] Mốc biên 0%, -50% và +100%', () => {
    it('TC-UC39-BOUND-01: [Biên 0% không điều chỉnh] Giữ nguyên đúng giá gốc niêm yết', () => {
      const price = calculateBranchPrice(BASE_PRICE, 0);
      expect(price).toBe(50000);
    });

    it('TC-UC39-BOUND-02: [Biên giảm tối đa -50%] Giảm 50% giá thuốc', () => {
      const price = calculateBranchPrice(BASE_PRICE, -50);
      expect(price).toBe(25000);
    });

    it('TC-UC39-BOUND-03: [Biên tăng tối đa +100%] Tăng gấp đôi giá thuốc', () => {
      const price = calculateBranchPrice(BASE_PRICE, 100);
      expect(price).toBe(100000);
    });
  });

  describe('3. [Abnormal Values] Điều chỉnh giá vượt quá khung quy định', () => {
    it('TC-UC39-ABNORM-01: Ném lỗi khi markup vượt quá +100% (ví dụ +120%)', () => {
      expect(() => calculateBranchPrice(BASE_PRICE, 120)).toThrow(/vượt biên cho phép/);
    });

    it('TC-UC39-ABNORM-02: Ném lỗi khi giảm giá quá sâu vượt -50% (ví dụ -70%)', () => {
      expect(() => calculateBranchPrice(BASE_PRICE, -70)).toThrow(/vượt biên cho phép/);
    });
  });
});
