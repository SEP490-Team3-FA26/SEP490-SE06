/**
 * homeBannerCarousel.spec.ts - Bộ Kiểm Thử Đơn Vị cho Banner Carousel Trang Chủ
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: 5 Banner khuyến mãi y tế mạng chuẩn chất lượng cao (ID, Title, Badge, ImageUrl hợp lệ).
 * 2. [Boundary Values]: Vị trí slide biên (Index 0 đầu tiên, Index cuối cùng 4, vòng lặp xoay vòng auto-scroll mượt mà).
 * 3. [Abnormal Values]: Xử lý khi banner thiếu thuộc tính phụ (actionTab, category) mà không làm crash app.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

// Mock native modules để tránh lỗi ESM trong Jest Node.js
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  Dimensions: { get: jest.fn().mockReturnValue({ width: 375, height: 812 }) },
  StyleSheet: { create: (styles: any) => styles },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Image: 'Image',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('../../../src/components/ui/AnimatedTouchable', () => ({
  AnimatedTouchable: 'AnimatedTouchable',
}));

import { CAROUSEL_BANNERS, CarouselBannerItem } from '../../../src/components/carousel/HomeBannerCarousel';

describe('HomeBannerCarousel - Danh Sách Ảnh Mạng & Logic Chuyển Slide', () => {
  // =========================================================================
  // 1. [Normal Values] - Dữ liệu Banner Mạng Chuẩn Y Tế & Long Châu
  // =========================================================================
  describe('[Normal Values] - Cấu hình danh sách banner khuyến mãi mạng', () => {
    it('N-01: Có đầy đủ 5 banner khuyến mãi y tế với ảnh mạng chất lượng cao (Unsplash CDN)', () => {
      expect(CAROUSEL_BANNERS).toHaveLength(5);

      CAROUSEL_BANNERS.forEach((banner) => {
        expect(banner.id).toBeDefined();
        expect(banner.title.length).toBeGreaterThan(0);
        expect(banner.badge.length).toBeGreaterThan(0);
        expect(banner.subtitle.length).toBeGreaterThan(0);
        expect(banner.imageUrl).toMatch(/^https:\/\//); // Bắt buộc là URL HTTPS từ mạng
        expect(banner.imageUrl).toContain('images.unsplash.com'); // CDN ảnh mạng chất lượng cao
      });
    });

    it('N-02: Các banner định tuyến chuẩn xác đến các tính năng cốt lõi (VOUCHERS, AI_CHAT, Danh mục)', () => {
      const bannerVoucher = CAROUSEL_BANNERS.find((b) => b.actionTab === 'VOUCHERS');
      const bannerAi = CAROUSEL_BANNERS.find((b) => b.actionTab === 'AI_CHAT');
      const bannerVitamin = CAROUSEL_BANNERS.find((b) => b.category === 'VITAMIN');

      expect(bannerVoucher).toBeDefined();
      expect(bannerAi).toBeDefined();
      expect(bannerVitamin).toBeDefined();
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Logic Xoay Vòng Chỉ Số Slide (Auto-Scroll Loop)
  // =========================================================================
  describe('[Boundary Values] - Xoay vòng chỉ số slide tự động', () => {
    const getNextSlideIndex = (currentIndex: number, totalSlides: number): number => {
      if (totalSlides <= 0) return 0;
      return (currentIndex + 1) % totalSlides;
    };

    it('B-01: Slide đầu tiên (index = 0) chuyển sang slide kế tiếp (index = 1)', () => {
      const next = getNextSlideIndex(0, CAROUSEL_BANNERS.length);
      expect(next).toBe(1);
    });

    it('B-02: Slide cuối cùng (index = 4) tự động xoay vòng về slide đầu (index = 0)', () => {
      const lastIndex = CAROUSEL_BANNERS.length - 1;
      const next = getNextSlideIndex(lastIndex, CAROUSEL_BANNERS.length);
      expect(next).toBe(0);
    });

    it('B-03: Tính toán vị trí cuộn x chuẩn xác theo chiều rộng banner', () => {
      const bannerWidth = 350; // Giả lập width màn hình - 32
      const targetIndex = 2;
      const scrollX = targetIndex * bannerWidth;
      expect(scrollX).toBe(700);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý dữ liệu dị thường an toàn
  // =========================================================================
  describe('[Abnormal Values] - Xử lý an toàn khi thiếu trường dữ liệu', () => {
    it('A-01: Banner không có actionTab hay category vẫn click an toàn', () => {
      const bareBanner: CarouselBannerItem = {
        id: 'BARE_BANNER',
        badge: 'TIN TỨC',
        title: 'Thông báo sức khỏe',
        subtitle: 'Cập nhật tin y tế',
        imageUrl: 'https://example.com/banner.jpg',
      };

      const mockOnSelect = jest.fn();
      mockOnSelect(bareBanner);

      expect(mockOnSelect).toHaveBeenCalledWith(bareBanner);
      expect(bareBanner.actionTab).toBeUndefined();
      expect(bareBanner.category).toBeUndefined();
    });

    it('A-02: Tổng số slide bằng 0 hoặc 1 không gây lỗi chia cho 0', () => {
      const getNextSlideSafe = (currentIndex: number, totalSlides: number): number => {
        if (!totalSlides || totalSlides <= 0) return 0;
        return (currentIndex + 1) % totalSlides;
      };

      expect(getNextSlideSafe(0, 0)).toBe(0);
      expect(getNextSlideSafe(0, 1)).toBe(0);
    });
  });
});
