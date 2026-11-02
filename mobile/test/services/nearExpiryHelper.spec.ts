/**
 * nearExpiryHelper.spec.ts - Bộ kiểm thử hàm tiện ích quản lý dược phẩm cận hạn & quá hạn dùng GSP/GDP
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Định dạng ngày chuẩn, phân loại nhóm cận hạn, đề xuất FEFO chính xác.
 * 2. [Boundary Values]: Mốc biên 0 ngày, 1 ngày, 30 ngày, 90 ngày, danh sách rỗng.
 * 3. [Abnormal Values]: Số ngày âm cực lớn (-999), dữ liệu null/undefined/NaN, mảng rỗng hoặc sai kiểu.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import {
  formatDaysLeftLabel,
  filterNearExpiryList,
  getFefoPriorityRecommendation,
} from '../../src/services/nearExpiryHelper';

describe('Tiện Ích Quản Lý Thuốc Cận Hạn & Quá Hạn GSP (nearExpiryHelper)', () => {
  // =========================================================================
  // 1. [Normal Values]: Dữ liệu nghiệp vụ chuẩn
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Định dạng chính xác cho thuốc cận hạn 27 ngày (CRITICAL)', () => {
      const badge = formatDaysLeftLabel(27);
      expect(badge.label).toBe('Còn 27 ngày');
      expect(badge.isExpired).toBe(false);
      expect(badge.severity).toBe('CRITICAL');
      expect(badge.text).toBe('#D97706');
    });

    it('Định dạng chính xác cho thuốc cận hạn 60 ngày (WARNING)', () => {
      const badge = formatDaysLeftLabel(60);
      expect(badge.label).toBe('Còn 60 ngày');
      expect(badge.isExpired).toBe(false);
      expect(badge.severity).toBe('WARNING');
      expect(badge.text).toBe('#0284C7');
    });

    it('Định dạng chính xác cho thuốc an toàn 120 ngày (SAFE)', () => {
      const badge = formatDaysLeftLabel(120);
      expect(badge.label).toBe('Còn 120 ngày');
      expect(badge.isExpired).toBe(false);
      expect(badge.severity).toBe('SAFE');
      expect(badge.text).toBe('#059669');
    });

    it('Định dạng chính xác cho thuốc đã hết hạn 15 ngày (EXPIRED)', () => {
      const badge = formatDaysLeftLabel(-15);
      expect(badge.label).toBe('Quá 15 ngày');
      expect(badge.isExpired).toBe(true);
      expect(badge.severity).toBe('EXPIRED');
      expect(badge.text).toBe('#DC2626');
    });

    it('Lọc chính xác danh sách theo từng nhóm phân loại', () => {
      const sampleList = [
        { id: '1', name: 'Paracetamol', daysLeft: -10 },
        { id: '2', name: 'Amoxicillin', daysLeft: 15 },
        { id: '3', name: 'Berberin', daysLeft: 45 },
        { id: '4', name: 'Vitamin C', daysLeft: 120 },
      ];

      const all = filterNearExpiryList(sampleList, 'ALL');
      expect(all).toHaveLength(4);

      const expired = filterNearExpiryList(sampleList, 'EXPIRED');
      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('1');

      const under30 = filterNearExpiryList(sampleList, 'UNDER_30');
      expect(under30).toHaveLength(1);
      expect(under30[0].id).toBe('2');

      const under90 = filterNearExpiryList(sampleList, 'UNDER_90');
      expect(under90).toHaveLength(1);
      expect(under90[0].id).toBe('3');
    });

    it('Đưa ra đề xuất FEFO chuẩn cho từng mức độ', () => {
      const recCritical = getFefoPriorityRecommendation({ daysLeft: 20 });
      expect(recCritical.levelTitle).toContain('FEFO CẤP 1');

      const recWarning = getFefoPriorityRecommendation({ daysLeft: 70 });
      expect(recWarning.levelTitle).toContain('FEFO CẤP 2');

      const recExpired = getFefoPriorityRecommendation({ daysLeft: -5 });
      expect(recExpired.levelTitle).toContain('NGHIÊM CẤM');
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên, 0, 1, 30, 90 ngày
  // =========================================================================
  describe('[Boundary Values] Giá trị biên', () => {
    it('Mốc 0 ngày: Hết hạn đúng hôm nay', () => {
      const badge = formatDaysLeftLabel(0);
      expect(badge.label).toBe('Hết hạn hôm nay');
      expect(badge.isExpired).toBe(true);
      expect(badge.severity).toBe('EXPIRED');
    });

    it('Mốc 1 ngày: Còn đúng 1 ngày (CRITICAL)', () => {
      const badge = formatDaysLeftLabel(1);
      expect(badge.label).toBe('Còn 1 ngày');
      expect(badge.isExpired).toBe(false);
      expect(badge.severity).toBe('CRITICAL');
    });

    it('Mốc 30 ngày: Ngưỡng tối đa của nhóm CRITICAL', () => {
      const badge = formatDaysLeftLabel(30);
      expect(badge.label).toBe('Còn 30 ngày');
      expect(badge.severity).toBe('CRITICAL');
    });

    it('Mốc 31 ngày: Bắt đầu chuyển sang nhóm WARNING', () => {
      const badge = formatDaysLeftLabel(31);
      expect(badge.label).toBe('Còn 31 ngày');
      expect(badge.severity).toBe('WARNING');
    });

    it('Mốc 90 ngày: Ngưỡng tối đa của nhóm WARNING', () => {
      const badge = formatDaysLeftLabel(90);
      expect(badge.label).toBe('Còn 90 ngày');
      expect(badge.severity).toBe('WARNING');
    });

    it('Mốc 91 ngày: Chuyển sang ngưỡng an toàn SAFE', () => {
      const badge = formatDaysLeftLabel(91);
      expect(badge.label).toBe('Còn 91 ngày');
      expect(badge.severity).toBe('SAFE');
    });

    it('Mảng dữ liệu 0 phần tử', () => {
      const emptyFiltered = filterNearExpiryList([], 'ALL');
      expect(emptyFiltered).toEqual([]);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, số âm cực lớn, null, undefined, NaN
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường', () => {
    it('Số âm cực lớn (-999 ngày)', () => {
      const badge = formatDaysLeftLabel(-999);
      expect(badge.label).toBe('Quá 999 ngày');
      expect(badge.isExpired).toBe(true);
      expect(badge.severity).toBe('EXPIRED');
    });

    it('Dữ liệu null / undefined / NaN trả về nhãn an toàn mặc định', () => {
      const nullBadge = formatDaysLeftLabel(null);
      expect(nullBadge.label).toBe('Chưa có HSD');

      const undefinedBadge = formatDaysLeftLabel(undefined);
      expect(undefinedBadge.label).toBe('Chưa có HSD');

      const nanBadge = formatDaysLeftLabel(NaN);
      expect(nanBadge.label).toBe('Chưa có HSD');
    });

    it('Danh sách null hoặc undefined được xử lý an toàn không sập ứng dụng', () => {
      const nullRes = filterNearExpiryList(null, 'ALL');
      expect(nullRes).toEqual([]);

      const undefRes = filterNearExpiryList(undefined, 'EXPIRED');
      expect(undefRes).toEqual([]);
    });

    it('Phần tử trong danh sách thiếu trường daysLeft', () => {
      const brokenList = [{ id: 'x', name: 'Lỗi' }, { id: 'y', daysLeft: 'invalid' }];
      const res = filterNearExpiryList(brokenList as any, 'EXPIRED');
      // Không ném exception và lọc chuẩn
      expect(Array.isArray(res)).toBe(true);
    });

    it('Đề xuất FEFO xử lý an toàn khi item thiếu daysLeft', () => {
      const rec = getFefoPriorityRecommendation({});
      expect(rec.levelTitle).toBe('TỒN KHO AN TOÀN THEO CHUẨN GSP');
    });
  });
});

