/**
 * loyaltyRewards.service.spec.ts - Bộ Kiểm Thử Đơn Vị Điểm Thưởng & Ưu Đãi Hội Viên FPT Long Châu
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Quy đổi điểm sang tiền mặt, nhận diện hạng thành viên, format badge voucher, lọc lịch sử điểm, đổi quà.
 * 2. [Boundary Values]: Điểm bằng 0, 1 đơn vị, giá trị voucher 1000₫, đổi vừa đủ số điểm hiện có.
 * 3. [Abnormal Values]: Dữ liệu null, undefined, số âm, NaN, danh sách rỗng, không đủ điểm đổi quà.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import {
  convertPointsToCash,
  getLoyaltyTierMeta,
  formatMinimalVoucherBadge,
  filterVouchersByQuery,
  filterPointsHistory,
  filterGiftsByPointsTier,
  calculatePointsAfterRedeem,
  formatPointsDisplay,
  PointsHistoryItem,
  LoyaltyGiftItem,
  DEFAULT_LOYALTY_GIFTS,
  DEFAULT_POINTS_HISTORY,
} from './loyaltyRewards.service';

describe('loyaltyRewards.service - Dịch Vụ Điểm Thưởng & Ưu Đãi Chuẩn Long Châu', () => {
  // =========================================================================
  // 1. NHÓM GIÁ TRỊ CHUẨN [Normal Values]
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Phải quy đổi chính xác 1.250 điểm thành 1.250 ₫ tiền mặt (tỷ lệ 1:1)', () => {
      const cash = convertPointsToCash(1250);
      expect(cash).toBe(1250);
    });

    it('Phải định dạng hiển thị số điểm có dấu phân cách nghìn chuẩn vi-VN', () => {
      expect(formatPointsDisplay(7838)).toBe('7.838');
      expect(formatPointsDisplay(1500)).toBe('1.500');
    });

    it('Phải nhận diện chính xác các hạng thành viên chuẩn: Diamond, Gold, Silver, Bronze', () => {
      const diamond = getLoyaltyTierMeta('Diamond');
      expect(diamond.tierName).toBe('Kim Cương');
      expect(diamond.multiplier).toBe(2.0);

      const gold = getLoyaltyTierMeta('Gold');
      expect(gold.tierName).toBe('Vàng');
      expect(gold.multiplier).toBe(1.5);

      const silver = getLoyaltyTierMeta('Silver');
      expect(silver.tierName).toBe('Bạc');
      expect(silver.multiplier).toBe(1.2);

      const bronze = getLoyaltyTierMeta('Bronze');
      expect(bronze.tierName).toBe('Đồng');
      expect(bronze.multiplier).toBe(1.0);
    });

    it('Phải định dạng chính xác voucher giảm theo phần trăm (-20%) và tiền mặt (-50k)', () => {
      expect(formatMinimalVoucherBadge('PERCENT', 20)).toBe('-20%');
      expect(formatMinimalVoucherBadge('FIXED', 50000)).toBe('-50k');
      expect(formatMinimalVoucherBadge('CASH', 100000)).toBe('-100k');
    });

    it('Phải tìm kiếm và lọc voucher chính xác theo mã hoặc mô tả trong tab Điểm Thưởng', () => {
      const sampleVouchers = [
        { code: 'SUMMER30', description: 'Giảm 30k đơn từ 100k' },
        { code: 'MUATANG', description: 'Ưu đãi dành riêng cho bạn' },
        { code: 'FREESHIP', description: 'Miễn phí giao thuốc tận nơi' },
      ];

      const resCode = filterVouchersByQuery(sampleVouchers, 'SUMMER');
      expect(resCode).toHaveLength(1);
      expect(resCode[0].code).toBe('SUMMER30');

      const resDesc = filterVouchersByQuery(sampleVouchers, 'giao thuốc');
      expect(resDesc).toHaveLength(1);
      expect(resDesc[0].code).toBe('FREESHIP');
    });

    it('Phải lọc chính xác lịch sử điểm thưởng theo các tab Tất cả, Tích điểm, Sử dụng, Hết hạn', () => {
      const sampleHistory: PointsHistoryItem[] = [
        { id: '1', title: 'Tích điểm đơn thuốc', date: '28/10', points: 150, type: 'EARN' },
        { id: '2', title: 'Đổi quà mặt nạ', date: '24/10', points: -1500, type: 'USE' },
        { id: '3', title: 'Thưởng thăng hạng', date: '20/10', points: 500, type: 'BONUS' },
        { id: '4', title: 'Điểm hết hạn', date: '31/12', points: -50, type: 'EXPIRE' },
      ];

      expect(filterPointsHistory(sampleHistory, 'ALL')).toHaveLength(4);
      
      const earnOnly = filterPointsHistory(sampleHistory, 'EARN');
      expect(earnOnly).toHaveLength(2); // EARN and BONUS
      
      const useOnly = filterPointsHistory(sampleHistory, 'USE');
      expect(useOnly).toHaveLength(1);
      expect(useOnly[0].id).toBe('2');

      const expireOnly = filterPointsHistory(sampleHistory, 'EXPIRE');
      expect(expireOnly).toHaveLength(1);
      expect(expireOnly[0].id).toBe('4');
    });

    it('Phải lọc quà tặng chính xác theo mức điểm 1.500 điểm', () => {
      const gifts1500 = filterGiftsByPointsTier(DEFAULT_LOYALTY_GIFTS, 1500);
      expect(gifts1500.length).toBeGreaterThanOrEqual(2);
      expect(gifts1500.every(g => g.requiredPoints === 1500)).toBe(true);
    });

    it('Phải tính toán hợp lệ khi đổi quà nếu người dùng đủ điểm', () => {
      const result = calculatePointsAfterRedeem(3000, 1500, 1);
      expect(result.isEligible).toBe(true);
      expect(result.totalPointsNeeded).toBe(1500);
      expect(result.remainingPoints).toBe(1500);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. NHÓM GIÁ TRỊ BIÊN [Boundary Values]
  // =========================================================================
  describe('[Boundary Values] Giá trị biên và giới hạn', () => {
    it('Phải trả về 0 ₫ khi điểm thưởng là 0', () => {
      expect(convertPointsToCash(0)).toBe(0);
      expect(formatPointsDisplay(0)).toBe('0');
    });

    it('Phải quy đổi đúng 1 điểm thành 1 ₫', () => {
      expect(convertPointsToCash(1)).toBe(1);
    });

    it('Phải định dạng đúng -1k khi giá trị giảm đúng bằng 1000 ₫', () => {
      expect(formatMinimalVoucherBadge('FIXED', 1000)).toBe('-1k');
    });

    it('Phải định dạng đúng đơn vị đồng khi giá trị giảm nhỏ hơn 1000 ₫', () => {
      expect(formatMinimalVoucherBadge('FIXED', 500)).toBe('-500₫');
    });

    it('Phải cho phép đổi quà khi điểm hiện có vừa khít số điểm cần đổi (remaining = 0)', () => {
      const result = calculatePointsAfterRedeem(1500, 1500, 1);
      expect(result.isEligible).toBe(true);
      expect(result.remainingPoints).toBe(0);
      expect(result.totalPointsNeeded).toBe(1500);
    });

    it('Phải trả về toàn bộ voucher khi từ khóa rỗng hoặc chỉ có khoảng trắng', () => {
      const sample = [{ code: 'V1' }, { code: 'V2' }];
      expect(filterVouchersByQuery(sample, '')).toHaveLength(2);
      expect(filterVouchersByQuery(sample, '   ')).toHaveLength(2);
      expect(filterVouchersByQuery(sample, null)).toHaveLength(2);
    });

    it('Phải trả về toàn bộ quà tặng khi mức điểm lọc là null, 0 hoặc undefined', () => {
      expect(filterGiftsByPointsTier(DEFAULT_LOYALTY_GIFTS, null)).toHaveLength(DEFAULT_LOYALTY_GIFTS.length);
      expect(filterGiftsByPointsTier(DEFAULT_LOYALTY_GIFTS, 0)).toHaveLength(DEFAULT_LOYALTY_GIFTS.length);
    });
  });

  // =========================================================================
  // 3. NHÓM GIÁ TRỊ DỊ THƯỜNG [Abnormal Values]
  // =========================================================================
  describe('[Abnormal Values] Giá trị dị thường, sai định dạng và ngoại lệ', () => {
    it('Phải trả về 0 khi điểm thưởng là số âm, NaN, null hoặc undefined', () => {
      expect(convertPointsToCash(-100)).toBe(0);
      expect(convertPointsToCash(NaN)).toBe(0);
      expect(convertPointsToCash(null)).toBe(0);
      expect(convertPointsToCash(undefined)).toBe(0);
      expect(formatPointsDisplay(-50)).toBe('0');
      expect(formatPointsDisplay(null)).toBe('0');
    });

    it('Phải báo lỗi "Không đủ điểm thưởng" và vô hiệu hóa đổi quà khi điểm hiện có ít hơn cần thiết', () => {
      // Hiện có 0 điểm, cần 1.500 điểm (giống hệt ảnh Long Châu của user)
      const result = calculatePointsAfterRedeem(0, 1500, 1);
      expect(result.isEligible).toBe(false);
      expect(result.totalPointsNeeded).toBe(1500);
      expect(result.remainingPoints).toBe(0);
      expect(result.errorMessage).toBe('Không đủ điểm thưởng.');
    });

    it('Phải tự động fallback về Hạng Đồng khi hạng thành viên là chuỗi lạ hoặc null', () => {
      const fallbackNull = getLoyaltyTierMeta(null);
      expect(fallbackNull.tierName).toBe('Đồng');

      const fallbackStrange = getLoyaltyTierMeta('UNKNOWN_TIER_XYZ');
      expect(fallbackStrange.tierName).toBe('Đồng');
    });

    it('Phải trả về 0% an toàn khi giá trị voucher là null, âm hoặc NaN', () => {
      expect(formatMinimalVoucherBadge('PERCENT', null)).toBe('0%');
      expect(formatMinimalVoucherBadge('FIXED', -50000)).toBe('0%');
      expect(formatMinimalVoucherBadge('PERCENT', NaN)).toBe('0%');
    });

    it('Phải xử lý an toàn khi danh sách truyền vào là null hoặc undefined', () => {
      expect(filterVouchersByQuery(null as any, 'CODE')).toEqual([]);
      expect(filterPointsHistory(null as any, 'ALL')).toEqual([]);
      expect(filterGiftsByPointsTier(null as any, 1500)).toEqual([]);
    });
  });
});
