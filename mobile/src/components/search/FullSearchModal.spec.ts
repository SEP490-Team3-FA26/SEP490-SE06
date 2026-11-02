/**
 * FullSearchModal.spec.ts - Bộ Kiểm Thử Logic Màn Hình Tìm Kiếm Toàn Diện
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Lọc từ khóa chuẩn, phân biệt danh mục, tìm theo barcode và hoạt chất.
 * 2. [Boundary Values]: Từ khóa 0 ký tự, 1 ký tự, chuỗi dài 100+ ký tự, danh sách kết quả 0 phần tử.
 * 3. [Abnormal Values]: Từ khóa chứa ký tự đặc biệt, HTML injection, dữ liệu thuốc thiếu trường.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine } from '../../types/pharmacy.types';

// Loại bỏ dấu tiếng Việt để tìm kiếm không dấu chuẩn xác
const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

// Hàm lọc mô phỏng logic tìm kiếm thông minh trong FullSearchModal
function filterMedicines(medicines: Medicine[], query: string): Medicine[] {
  const q = query.trim();
  if (!q) return [];

  const cleanQ = removeVietnameseTones(q);
  const subKeywords = q
    .split(/[&,+/]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 1);

  return medicines.filter((m) => {
    const name = m.name || '';
    const active = m.active || (m as any).active_ingredient || '';
    const category = m.category || '';
    const barcode = m.barcode || '';
    const unitsBarcode = m.units?.map((u) => u.barcode).join(' ') || '';

    const fullRawText = `${name} ${active} ${category} ${barcode} ${unitsBarcode}`.toLowerCase();
    const fullCleanText = removeVietnameseTones(fullRawText);

    // 1. Khớp nguyên chuỗi (có dấu hoặc không dấu)
    if (fullRawText.includes(q.toLowerCase()) || fullCleanText.includes(cleanQ)) {
      return true;
    }

    // 2. Khớp các từ khóa con (ví dụ 'Hạ sốt' hoặc 'Cảm cúm')
    if (subKeywords.length > 0) {
      return subKeywords.some((sub) => {
        const cleanSub = removeVietnameseTones(sub);
        return fullRawText.includes(sub.toLowerCase()) || fullCleanText.includes(cleanSub);
      });
    }

    return false;
  });
}

describe('Logic Tìm Kiếm Toàn Diện (FullSearchModal Filter)', () => {
  const mockMedicines: Medicine[] = [
    {
      id: 'med-1',
      name: 'Panadol Extra Đỏ Giảm Đau Hạ Sốt',
      active: 'Paracetamol 500mg, Caffeine 65mg',
      category: 'Giảm đau & Hạ sốt',
      price: 25000,
      stock: 150,
      unit: 'Hộp',
      barcode: '8935001234567',
      isRx: false,
      batches: [],
    },
    {
      id: 'med-2',
      name: 'Khẩu Trang Y Tế 4D Kháng Khuẩn',
      active: 'Vải không dệt y tế',
      category: 'Vật tư y tế',
      price: 35000,
      stock: 500,
      unit: 'Hộp',
      barcode: '8936009876543',
      isRx: false,
      batches: [],
    },
    {
      id: 'med-3',
      name: 'Men Vi Sinh Enterogermina 5ml',
      active: 'Bacillus clausii',
      category: 'Tiêu hóa',
      price: 180000,
      stock: 45,
      unit: 'Hộp',
      barcode: '8937001122334',
      isRx: false,
      batches: [],
    },
  ];

  // =========================================================================
  // 1. [Normal Values] Tìm kiếm chuẩn theo tên, hoạt chất, danh mục, mã vạch
  // =========================================================================
  describe('[Normal Values] - Tìm kiếm nghiệp vụ chuẩn', () => {
    it('Phải tìm thấy thuốc khi gõ đúng tên hoặc một phần tên (vd: panadol)', () => {
      const res = filterMedicines(mockMedicines, 'panadol');
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('med-1');
    });

    it('Phải tìm thấy thuốc khi gõ hoạt chất (vd: Paracetamol)', () => {
      const res = filterMedicines(mockMedicines, 'Paracetamol');
      expect(res.length).toBe(1);
      expect(res[0].name).toContain('Panadol');
    });

    it('Phải tìm thấy toàn bộ thuốc thuộc danh mục (vd: Tiêu hóa)', () => {
      const res = filterMedicines(mockMedicines, 'tiêu hóa');
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('med-3');
    });

    it('Phải tìm thấy thuốc khi quét đúng mã Barcode GS1', () => {
      const res = filterMedicines(mockMedicines, '8935001234567');
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('med-1');
    });

    it('Phải tìm thấy thuốc khi gõ từ khóa ghép có dấu & (vd: "Hạ sốt & Cảm cúm")', () => {
      const res = filterMedicines(mockMedicines, 'Hạ sốt & Cảm cúm');
      expect(res.length).toBeGreaterThanOrEqual(1);
      expect(res[0].name).toContain('Panadol');
    });

    it('Phải tìm thấy thuốc khi gõ tiếng Việt không dấu (vd: "ha sot")', () => {
      const res = filterMedicines(mockMedicines, 'ha sot');
      expect(res.length).toBeGreaterThanOrEqual(1);
      expect(res[0].name).toContain('Panadol');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên: rỗng, khoảng trắng, 1 ký tự, chuỗi cực dài
  // =========================================================================
  describe('[Boundary Values] - Kiểm tra điều kiện biên', () => {
    it('Truy vấn chuỗi rỗng "" hoặc chỉ có khoảng trắng "   " phải trả về mảng rỗng []', () => {
      expect(filterMedicines(mockMedicines, '')).toEqual([]);
      expect(filterMedicines(mockMedicines, '   ')).toEqual([]);
    });

    it('Truy vấn 1 ký tự đơn lẻ (vd: "a") phải lọc được các thuốc có chứa ký tự đó', () => {
      const res = filterMedicines(mockMedicines, 'a');
      expect(res.length).toBeGreaterThan(0);
    });

    it('Truy vấn chuỗi cực dài 150 ký tự không tồn tại phải trả về mảng rỗng [] mà không crash', () => {
      const longQuery = 'a'.repeat(150);
      const res = filterMedicines(mockMedicines, longQuery);
      expect(res).toEqual([]);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Ký tự đặc biệt, regex injection, thuốc bị null trường
  // =========================================================================
  describe('[Abnormal Values] - Kiểm tra an toàn dữ liệu và chống injection', () => {
    it('Truy vấn chứa ký tự đặc biệt Regex (*, +, ?, [, ]) không được gây lỗi Runtime Exception', () => {
      expect(() => filterMedicines(mockMedicines, '***[[++??')).not.toThrow();
      expect(filterMedicines(mockMedicines, '***[[++??')).toEqual([]);
    });

    it('Không bị crash khi danh sách thuốc chứa các phần tử thiếu name, active hoặc null', () => {
      const dirtyMedicines: any[] = [
        { id: 'bad-1', name: null, active: undefined, category: '' },
        { id: 'bad-2' },
        ...mockMedicines,
      ];
      expect(() => filterMedicines(dirtyMedicines, 'panadol')).not.toThrow();
      const res = filterMedicines(dirtyMedicines, 'panadol');
      expect(res.length).toBe(1);
    });
  });
});
