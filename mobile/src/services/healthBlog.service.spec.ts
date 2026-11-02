/**
 * Bộ kiểm thử đơn vị cho Dịch vụ Cẩm Nang Sức Khỏe & Thuốc Gợi Ý Theo Mùa
 * Tuân thủ quy tắc 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values]
 * Ngôn ngữ chú thích: 100% Tiếng Việt
 */

import {
  SEASONAL_BLOGS,
  BLOG_KEYWORDS_MAP,
  filterRecommendedMedicines,
  HealthBlogCategory,
  MedicineSearchItem,
} from './healthBlog.service';

describe('healthBlog.service - Dịch Vụ Cẩm Nang Sức Khỏe & Thuốc Gợi Ý', () => {
  // Dữ liệu mẫu danh sách thuốc kho y tế dùng cho kiểm thử
  const mockMedicines: MedicineSearchItem[] = [
    {
      id: 'med-01',
      name: 'Panadol Extra Đỏ Giảm Đau Hạ Sốt',
      active: 'Paracetamol 500mg, Caffeine 65mg',
      category: 'Hạ sốt & Cảm cúm',
      price: 45000,
    },
    {
      id: 'med-02',
      name: 'Viên ngậm Ho Eugica Xanh',
      active: 'Tinh dầu bạc hà, tràm',
      category: 'Hô hấp & Ho',
      price: 25000,
    },
    {
      id: 'med-03',
      name: 'Gói Uống Gaviscon Hỗn Dịch Dạ Dày',
      active: 'Sodium alginate, Nhôm hydroxyd',
      category: 'Tiêu hóa & Dạ dày',
      price: 135000,
    },
    {
      id: 'med-04',
      name: 'Men Vi Sinh Enterogermina Ruột',
      active: 'Bào tử Bacillus clausii',
      category: 'Hệ tiêu hóa vi sinh',
      price: 180000,
    },
    {
      id: 'med-05',
      name: 'Thuốc Kháng Histamine Loratadin Dị Ứng Da',
      active: 'Loratadin 10mg',
      category: 'Da liễu & Mề đay',
      price: 35000,
    },
    {
      id: 'med-06',
      name: 'Kem Dưỡng Da Phục Hồi Dị Ứng B5',
      active: 'Panthenol',
      category: 'Dược mỹ phẩm bôi da',
      price: 220000,
    },
    {
      id: 'med-07',
      name: 'Viên Sủi Bổ Sung Vitamin C Tăng Đề Kháng',
      active: 'Vitamin C 1000mg, Kẽm',
      category: 'Bổ sung đề kháng',
      price: 75000,
    },
    {
      id: 'med-08',
      name: 'Omega 3 Dầu Cá Tinh Khiết',
      active: 'EPA, DHA',
      category: 'Dinh dưỡng bổ sung',
      price: 320000,
    },
    {
      id: 'med-09',
      name: 'Hapacol 650 Giảm Đau Cấp Tốc',
      active: 'Paracetamol 650mg',
      category: 'Hạ sốt & Cảm cúm',
      price: 50000,
    },
  ];

  // =========================================================================
  // 1. NHÓM GIÁ TRỊ CHUẨN [Normal Values]
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Phải cung cấp đầy đủ thông tin cẩm nang blog cho cả 4 chủ đề', () => {
      const categories: HealthBlogCategory[] = ['FLU', 'STOMACH', 'ALLERGY', 'IMMUNITY'];

      categories.forEach((cat) => {
        const blog = SEASONAL_BLOGS[cat];
        expect(blog).toBeDefined();
        expect(blog.title).toBeTruthy();
        expect(blog.author).toMatch(/^DS\./); // Tác giả bắt đầu bằng DS.
        expect(blog.readTime).toContain('phút đọc');
        expect(blog.categoryName).toBeTruthy();
        expect(blog.imageUrl).toMatch(/^https:\/\//);
        expect(blog.summary.length).toBeGreaterThan(20);
        expect(blog.advice.length).toBeGreaterThan(20);
        expect(blog.symptoms.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('Phải lọc chính xác thuốc gợi ý cho chủ đề Cảm cúm (FLU)', () => {
      const results = filterRecommendedMedicines(mockMedicines, 'FLU');
      expect(results.length).toBeGreaterThan(0);
      // Kết quả phải chứa các thuốc cảm cúm/hạ sốt như Panadol hoặc Hapacol
      const ids = results.map((m) => m.id);
      expect(ids).toContain('med-01'); // Panadol
      expect(ids).toContain('med-09'); // Hapacol
    });

    it('Phải lọc chính xác thuốc gợi ý cho chủ đề Tiêu hóa (STOMACH)', () => {
      const results = filterRecommendedMedicines(mockMedicines, 'STOMACH');
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map((m) => m.id);
      expect(ids).toContain('med-03'); // Gaviscon
      expect(ids).toContain('med-04'); // Men vi sinh
    });

    it('Phải lọc chính xác thuốc gợi ý cho chủ đề Dị ứng (ALLERGY)', () => {
      const results = filterRecommendedMedicines(mockMedicines, 'ALLERGY');
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map((m) => m.id);
      expect(ids).toContain('med-05'); // Loratadin
      expect(ids).toContain('med-06'); // Kem dị ứng
    });

    it('Phải lọc chính xác thuốc gợi ý cho chủ đề Đề kháng (IMMUNITY)', () => {
      const results = filterRecommendedMedicines(mockMedicines, 'IMMUNITY');
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map((m) => m.id);
      expect(ids).toContain('med-07'); // Vitamin C Kẽm
    });
  });

  // =========================================================================
  // 2. NHÓM GIÁ TRỊ BIÊN [Boundary Values]
  // =========================================================================
  describe('[Boundary Values] Giá trị biên và giới hạn danh sách', () => {
    it('Phải trả về mảng rỗng [] khi danh sách thuốc đầu vào là rỗng []', () => {
      const results = filterRecommendedMedicines([], 'FLU');
      expect(results).toEqual([]);
    });

    it('Phải trả về đúng 1 thuốc khi danh sách chỉ có duy nhất 1 sản phẩm khớp', () => {
      const singleMedList: MedicineSearchItem[] = [
        { id: 'only-one', name: 'Thuốc Cảm Cúm Duy Nhất', price: 10000 },
      ];
      const results = filterRecommendedMedicines(singleMedList, 'FLU');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('only-one');
    });

    it('Phải giới hạn tối đa maxItems (mặc định 6 sản phẩm) khi có nhiều thuốc khớp', () => {
      // Tạo danh sách 10 thuốc cảm cúm
      const tenFluMeds: MedicineSearchItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `flu-${i}`,
        name: `Thuốc Cảm Cúm Số ${i + 1}`,
        price: 20000 + i * 1000,
      }));

      const results = filterRecommendedMedicines(tenFluMeds, 'FLU', 6);
      expect(results.length).toBe(6);
    });

    it('Phải fallback lấy đúng số lượng thuốc đầu tiên khi KHÔNG có sản phẩm nào khớp từ khóa', () => {
      const unrelatedMeds: MedicineSearchItem[] = [
        { id: 'other-1', name: 'Nước Nhỏ Mắt Chống Mỏi', price: 15000 },
        { id: 'other-2', name: 'Bông Băng Y Tế Tiệt Trùng', price: 10000 },
        { id: 'other-3', name: 'Cồn Đỏ Sát Khuẩn', price: 8000 },
      ];

      const results = filterRecommendedMedicines(unrelatedMeds, 'STOMACH', 2);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe('other-1');
      expect(results[1].id).toBe('other-2');
    });

    it('Phải tôn trọng tham số maxItems tùy chỉnh khi truyền vào 1 hoặc 3', () => {
      const results1 = filterRecommendedMedicines(mockMedicines, 'FLU', 1);
      expect(results1.length).toBe(1);

      const results3 = filterRecommendedMedicines(mockMedicines, 'FLU', 3);
      expect(results3.length).toBe(3);
    });
  });

  // =========================================================================
  // 3. NHÓM GIÁ TRỊ DỊ THƯỜNG [Abnormal Values]
  // =========================================================================
  describe('[Abnormal Values] Giá trị dị thường, sai định dạng và lỗi ngoại lệ', () => {
    it('Phải xử lý an toàn khi danh sách medicines là null hoặc undefined', () => {
      expect(filterRecommendedMedicines(null, 'FLU')).toEqual([]);
      expect(filterRecommendedMedicines(undefined, 'FLU')).toEqual([]);
      expect(filterRecommendedMedicines(null as any, 'IMMUNITY')).toEqual([]);
    });

    it('Phải xử lý an toàn khi danh sách chứa phần tử null, undefined hoặc thiếu trường', () => {
      const corruptedList: any[] = [
        null,
        undefined,
        { id: 'corrupt-1' }, // Thiếu name, active, category
        { id: 'valid-flu', name: 'PARACETAMOL ĐIỀU TRỊ CẢM SỐT', price: 30000 },
      ];

      expect(() => filterRecommendedMedicines(corruptedList, 'FLU')).not.toThrow();
      const results = filterRecommendedMedicines(corruptedList, 'FLU');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('valid-flu');
    });

    it('Phải lọc không phân biệt chữ hoa, chữ thường và dấu tiếng Việt', () => {
      const mixedCaseList: MedicineSearchItem[] = [
        { id: 'upper', name: 'PANADOL EXTRA HẠ SỐT CẢM CÚM', price: 50000 },
        { id: 'mixed', name: 'vIêN nGậM hỌnG sTrEpSiLs', price: 35000 },
      ];

      const results = filterRecommendedMedicines(mixedCaseList, 'FLU');
      expect(results.length).toBe(2);
    });

    it('Phải xử lý an toàn khi danh mục truyền vào không hợp lệ (chuỗi lạ)', () => {
      const results = filterRecommendedMedicines(mockMedicines, 'UNKNOWN_CATEGORY' as any);
      // Fallback an toàn lấy các thuốc đầu tiên, không văng lỗi
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(6);
    });
  });
});

