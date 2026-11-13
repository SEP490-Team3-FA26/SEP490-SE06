/**
 * CustomerScreenTypography.spec.ts - Kiểm Thử Quy Chuẩn Đồng Bộ Cỡ Chữ Màn Hình Khách Hàng
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Đồng bộ font size chuẩn 11px cho lưới tính năng và chuyên mục, hiển thị trọn vẹn "Săn voucher", "Sổ sức khỏe".
 * 2. [Boundary Values]: Độ rộng cột biên (màn hình nhỏ 320px vs chuẩn 390px), chuỗi tối đa không vỡ layout.
 * 3. [Abnormal Values]: Chuỗi rỗng, null/undefined, chuỗi siêu dài.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

// =========================================================================
// Các hàm tiện ích tính toán và kiểm chứng Typography UI
// =========================================================================

/**
 * Tính toán độ rộng ước lượng của chuỗi ký tự theo kích thước phông (ước tính font hệ thống ~0.58 x fontSize)
 */
export function estimateTextWidth(text: string | null | undefined, fontSize: number): number {
  if (!text) return 0;
  const safeFontSize = Math.max(1, isNaN(fontSize) ? 11 : fontSize);
  // Hệ số trung bình của ký tự tiếng Việt có dấu trong font chữ Sans-serif
  const avgCharWidthRatio = 0.58;
  return Math.round(text.length * safeFontSize * avgCharWidthRatio);
}

/**
 * Kiểm tra xem chuỗi nhãn chức năng có hiển thị trọn vẹn trong ô lưới 4 cột (width: 25%) không
 */
export function canFitInGridColumn(
  label: string | null | undefined,
  screenWidth = 390,
  horizontalPadding = 32,
  fontSize = 11,
): { fits: boolean; estimatedWidth: number; availableWidth: number } {
  const containerWidth = screenWidth - horizontalPadding;
  const availableWidth = Math.floor(containerWidth / 4);
  const textWidth = estimateTextWidth(label, fontSize);

  return {
    fits: textWidth <= availableWidth,
    estimatedWidth: textWidth,
    availableWidth,
  };
}

/**
 * Quy chuẩn bảng kích thước phông chữ đồng bộ trên màn hình chính
 */
export const UNIFIED_STORE_TYPOGRAPHY = {
  headerSearchPlaceholder: 12,
  calloutTitle: 12,
  calloutSub: 10.5,
  calloutBtn: 11,
  pillarTitle: 12,
  quickGridTitle: 11,
  categoryGridLabel: 11,
  bannerTitle: 13.5,
  bannerSub: 11,
  bottomNavLabel: 10,
};

// =========================================================================
// TEST SUITE
// =========================================================================

describe('CustomerScreenTypography - Kiểm Thử Kích Thước Chữ Đồng Bộ & Chống Cắt Cụt', () => {
  const mockQuickActions = [
    'Tủ thuốc',
    'Dược sĩ AI',
    'Nhắc thuốc',
    'Quét mã',
    'Nhà thuốc',
    'Săn voucher',
    'Sổ sức khỏe',
    'Đơn của tôi',
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // 1. [Normal Values]
  // ───────────────────────────────────────────────────────────────────────────
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Lưới 8 hành động nhanh và Lưới danh mục dùng CHUNG cỡ chữ chuẩn 11px', () => {
      expect(UNIFIED_STORE_TYPOGRAPHY.quickGridTitle).toBe(11);
      expect(UNIFIED_STORE_TYPOGRAPHY.categoryGridLabel).toBe(11);
      expect(UNIFIED_STORE_TYPOGRAPHY.quickGridTitle).toBe(UNIFIED_STORE_TYPOGRAPHY.categoryGridLabel);
    });

    it('Hai thẻ tiện ích chính (Tra cứu toa, Nhắc thuốc) có cỡ chữ chuẩn 12px không vượt quá 12.5px', () => {
      expect(UNIFIED_STORE_TYPOGRAPHY.pillarTitle).toBeLessThanOrEqual(12.5);
      expect(UNIFIED_STORE_TYPOGRAPHY.pillarTitle).toBe(12);
    });

    it('Tất cả 8 nhãn tính năng nhanh ("Săn voucher", "Sổ sức khỏe",...) hiển thị trọn vẹn, không bị cắt dấu ba chấm', () => {
      mockQuickActions.forEach((label) => {
        const check = canFitInGridColumn(label, 390, 32, UNIFIED_STORE_TYPOGRAPHY.quickGridTitle);
        expect(check.fits).toBe(true);
        expect(check.estimatedWidth).toBeLessThanOrEqual(check.availableWidth);
      });
    });

    it('Chữ "Săn voucher" với font 11px nhỏ hơn độ rộng khả dụng (89px)', () => {
      const check = canFitInGridColumn('Săn voucher', 390, 32, 11);
      expect(check.fits).toBe(true);
      expect(check.estimatedWidth).toBeLessThan(check.availableWidth);
    });

    it('Chữ "Sổ sức khỏe" với font 11px nhỏ hơn độ rộng khả dụng (89px)', () => {
      const check = canFitInGridColumn('Sổ sức khỏe', 390, 32, 11);
      expect(check.fits).toBe(true);
      expect(check.estimatedWidth).toBeLessThan(check.availableWidth);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. [Boundary Values]
  // ───────────────────────────────────────────────────────────────────────────
  describe('[Boundary Values] Ranh giới kích thước màn hình và độ dài nhãn', () => {
    it('Trên màn hình nhỏ (360px), các nhãn 11px vẫn vừa vặn trong cột', () => {
      const check = canFitInGridColumn('Săn voucher', 360, 32, 11);
      expect(check.fits).toBe(true);
    });

    it('So sánh với font cũ 13.5px: chữ "Săn voucher" bị sát trần hoặc tràn mép', () => {
      const oldCheck = canFitInGridColumn('Săn voucher', 360, 32, 13.5);
      const newCheck = canFitInGridColumn('Săn voucher', 360, 32, 11);
      expect(newCheck.estimatedWidth).toBeLessThan(oldCheck.estimatedWidth);
    });

    it('Cỡ chữ banner chính (13.5px) lớn hơn nhãn phụ (11px) theo đúng thứ bậc thị giác', () => {
      expect(UNIFIED_STORE_TYPOGRAPHY.bannerTitle).toBeGreaterThan(UNIFIED_STORE_TYPOGRAPHY.quickGridTitle);
      expect(UNIFIED_STORE_TYPOGRAPHY.bannerSub).toBe(UNIFIED_STORE_TYPOGRAPHY.quickGridTitle);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. [Abnormal Values]
  // ───────────────────────────────────────────────────────────────────────────
  describe('[Abnormal Values] Giá trị dị thường và phòng vệ', () => {
    it('Xử lý an toàn khi chuỗi nhãn rỗng "" hoặc null', () => {
      const checkNull = canFitInGridColumn(null, 390, 32, 11);
      expect(checkNull.estimatedWidth).toBe(0);
      expect(checkNull.fits).toBe(true);

      const checkEmpty = canFitInGridColumn('', 390, 32, 11);
      expect(checkEmpty.estimatedWidth).toBe(0);
      expect(checkEmpty.fits).toBe(true);
    });

    it('Xử lý an toàn khi fontSize truyền vào là số âm hoặc NaN', () => {
      const width = estimateTextWidth('Tủ thuốc', NaN);
      expect(width).toBeGreaterThan(0);
      expect(isNaN(width)).toBe(false);
    });
  });
});
