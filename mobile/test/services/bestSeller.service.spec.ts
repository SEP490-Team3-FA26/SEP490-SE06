/**
 * Bộ kiểm thử đơn vị cho Dịch vụ Sản Phẩm Bán Chạy (bestSeller.service.ts)
 * Tuân thủ quy tắc 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values]
 * Ngôn ngữ chú thích: 100% Tiếng Việt
 */

import { getTopBestSellers } from '../../src/services/bestSeller.service';

describe('bestSeller.service - Dịch Vụ Sản Phẩm Bán Chạy', () => {
  const mockMedicines = [
    {
      id: 'med-01',
      name: 'Panadol Extra Đỏ Giảm Đau Cấp Tốc',
      price: 45000,
      active: 'Paracetamol 500mg, Caffeine',
      category: 'Hạ sốt & Cảm cúm',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
    },
    {
      id: 'med-02',
      name: 'Cao Dán Giảm Đau Ecosip Đài Loan',
      price: 213000,
      active: 'Thảo dược thiên nhiên',
      category: 'Miếng dán giảm đau',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
    },
    {
      id: 'med-03',
      name: 'Viên Ngậm Ho Bạc Hà Eugica Hộp 100 Viên',
      price: 65000,
      active: 'Tinh dầu tràm, gừng, tần',
      category: 'Hô hấp & Ho',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
    },
    {
      id: 'med-04',
      name: 'Men Vi Sinh Tiêu Hóa Enterogermina',
      price: 180000,
      active: 'Bacillus clausii',
      category: 'Tiêu hóa',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
    },
    {
      id: 'med-05',
      name: 'Viên Sủi Bổ Sung Vitamin C Tăng Đề Kháng',
      price: 75000,
      active: 'Vitamin C 1000mg',
      category: 'Bổ sung đề kháng',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
    },
  ];

  // =========================================================================
  // 1. NHÓM GIÁ TRỊ CHUẨN [Normal Values]
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Phải lấy chính xác Top 3 sản phẩm bán chạy với đầy đủ xếp hạng và metadata', () => {
      const top3 = getTopBestSellers(mockMedicines, 3);
      expect(top3).toHaveLength(3);

      // Kiểm tra sản phẩm TOP 1
      expect(top3[0].id).toBe('med-01');
      expect(top3[0].rank).toBe(1);
      expect(top3[0].badgeLabel).toBe('TOP 1 BÁN CHẠY');
      expect(top3[0].soldCountText).toContain('đã bán');
      expect(top3[0].ratingText).toContain('đánh giá');
      expect(top3[0].originalPrice).toBeGreaterThan(top3[0].price);

      // Kiểm tra sản phẩm TOP 2
      expect(top3[1].id).toBe('med-02');
      expect(top3[1].rank).toBe(2);
      expect(top3[1].badgeLabel).toBe('TOP 2 BÁN CHẠY');

      // Kiểm tra sản phẩm TOP 3
      expect(top3[2].id).toBe('med-03');
      expect(top3[2].rank).toBe(3);
      expect(top3[2].badgeLabel).toBe('TOP 3 BÁN CHẠY');
    });

    it('Phải tính đúng giá gốc originalPrice dựa trên tỷ lệ discountPercent', () => {
      const [top1] = getTopBestSellers(mockMedicines, 1);
      // top1 discountPercent là 25%, giá gốc = 45000 * 1.25 = 56250
      expect(top1.originalPrice).toBe(56250);
      expect(top1.progressPercent).toBe(94);
    });
  });

  // =========================================================================
  // 2. NHÓM GIÁ TRỊ BIÊN [Boundary Values]
  // =========================================================================
  describe('[Boundary Values] Giá trị biên và giới hạn', () => {
    it('Phải trả về mảng rỗng [] khi danh sách đầu vào là rỗng []', () => {
      expect(getTopBestSellers([])).toEqual([]);
    });

    it('Phải trả về mảng rỗng [] khi limit <= 0', () => {
      expect(getTopBestSellers(mockMedicines, 0)).toEqual([]);
      expect(getTopBestSellers(mockMedicines, -1)).toEqual([]);
    });

    it('Phải xử lý đúng khi danh sách chỉ có 1 hoặc 2 sản phẩm', () => {
      const single = [mockMedicines[0]];
      const resultSingle = getTopBestSellers(single, 3);
      expect(resultSingle).toHaveLength(1);
      expect(resultSingle[0].rank).toBe(1);

      const twoItems = [mockMedicines[0], mockMedicines[1]];
      const resultTwo = getTopBestSellers(twoItems, 3);
      expect(resultTwo).toHaveLength(2);
      expect(resultTwo[1].rank).toBe(2);
    });

    it('Phải cắt đúng số lượng theo limit tùy chỉnh (ví dụ limit = 4)', () => {
      const result = getTopBestSellers(mockMedicines, 4);
      expect(result).toHaveLength(4);
      expect(result[3].rank).toBe(4);
    });
  });

  // =========================================================================
  // 3. NHÓM GIÁ TRỊ DỊ THƯỜNG [Abnormal Values]
  // =========================================================================
  describe('[Abnormal Values] Giá trị dị thường và ngoại lệ', () => {
    it('Phải xử lý an toàn khi danh sách là null hoặc undefined', () => {
      expect(getTopBestSellers(null)).toEqual([]);
      expect(getTopBestSellers(undefined)).toEqual([]);
    });

    it('Phải tự động lọc bỏ các phần tử bị lỗi, null, hoặc thiếu name/price', () => {
      const corruptedList: any[] = [
        null,
        undefined,
        { id: 'bad-1' }, // thiếu name và price
        { id: 'bad-2', name: 'Thuốc thiếu giá' }, // thiếu price
        { id: 'valid', name: 'Thuốc Chuẩn', price: 50000 },
      ];

      const result = getTopBestSellers(corruptedList, 3);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid');
      expect(result[0].rank).toBe(1);
    });
  });
});

