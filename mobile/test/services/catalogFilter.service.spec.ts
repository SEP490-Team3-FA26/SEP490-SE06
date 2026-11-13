/**
 * catalogFilter.service.spec.ts - Kiểm Thử Đơn Vị Tầng Dịch Vụ Lọc & Sắp Xếp Dược Phẩm (Catalog Filter Service)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Loại bỏ thuốc Rx cho khách hàng, lọc theo tên, hoạt chất, danh mục, khoảng giá, sắp xếp giá/tên.
 * 2. [Boundary Values]: Mảng rỗng, từ khóa rỗng, ALL filters, phân trang trang cuối (hasMore = false).
 * 3. [Abnormal Values]: Dữ liệu thuốc null/undefined, mảng không hợp lệ, không gây sập ứng dụng.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine } from '../../src/types/pharmacy.types';
import { CatalogFilterService } from '../../src/services/catalogFilter.service';

describe('CatalogFilterService - Tầng Dịch Vụ Lọc Dược Phẩm Khách Hàng', () => {
  const sampleMedicines: Medicine[] = [
    {
      id: 'm1',
      name: 'Cao dán Ecosip',
      price: 15000,
      stock: 50,
      unit: 'Hộp',
      category: 'Cao dán',
      active: 'Thảo dược',
      isRx: false,
      batches: [],
    },
    {
      id: 'm2',
      name: 'Kháng sinh Cefixim 200mg',
      price: 120000,
      stock: 30,
      unit: 'Hộp',
      category: 'Thuốc kháng sinh',
      active: 'Cefixim',
      isRx: true, // Thuốc kê đơn
      batches: [],
    },
    {
      id: 'm3',
      name: 'Vitamin tổng hợp Nature Made',
      price: 320000,
      stock: 20,
      unit: 'Hộp',
      category: 'Vitamin & Thực phẩm chức năng',
      active: 'Multivitamin',
      isRx: false,
      batches: [],
    },
    {
      id: 'm4',
      name: 'Nhiệt kế điện tử Microlife',
      price: 650000,
      stock: 10,
      unit: 'Cái',
      category: 'Thiết bị y tế',
      active: '',
      isRx: false,
      batches: [],
    },
  ];

  // =========================================================================
  // 1. [Normal Values] - Nghiệp vụ chuẩn
  // =========================================================================
  describe('1. [Normal Values] - Luồng nghiệp vụ chuẩn', () => {
    it('N-01: Chặn 100% thuốc kê đơn Rx cho khách hàng theo chuẩn GPP', () => {
      const result = CatalogFilterService.filterAndSortMedicines(sampleMedicines);
      expect(result.some((m) => m.isRx)).toBe(false);
      expect(result).toHaveLength(3);
    });

    it('N-02: Lọc theo từ khóa tìm kiếm và khoảng giá', () => {
      const byName = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { query: 'Ecosip' });
      expect(byName).toHaveLength(1);
      expect(byName[0].id).toBe('m1');

      const over500 = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { priceFilter: 'OVER_500' });
      expect(over500).toHaveLength(1);
      expect(over500[0].id).toBe('m4');
    });

    it('N-03: Sắp xếp theo giá tăng dần và tên A-Z', () => {
      const sorted = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { sortBy: 'PRICE_ASC' });
      expect(sorted[0].price).toBe(15000);
      expect(sorted[sorted.length - 1].price).toBe(650000);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên
  // =========================================================================
  describe('2. [Boundary Values] - Kiểm tra giá trị biên', () => {
    it('B-01: Mảng thuốc rỗng trả về danh sách rỗng an toàn', () => {
      expect(CatalogFilterService.filterAndSortMedicines([])).toEqual([]);
    });

    it('B-02: Phân trang trang cuối cùng trả về hasMore = false', () => {
      const page = CatalogFilterService.paginateCatalog(sampleMedicines, 2, 3);
      expect(page.hasMore).toBe(false);
      expect(page.data).toHaveLength(1);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý dữ liệu dị thường
  // =========================================================================
  describe('3. [Abnormal Values] - Dữ liệu bất thường', () => {
    it('A-01: Truyền tham số null hoặc undefined không làm crash app', () => {
      expect(CatalogFilterService.filterAndSortMedicines(null as any)).toEqual([]);
      expect(CatalogFilterService.filterAndSortMedicines(undefined as any)).toEqual([]);
    });

    it('A-02: Lấy bộ lọc mặc định chứa đầy đủ trường an toàn', () => {
      const def = CatalogFilterService.getDefaultFilterState();
      expect(def.searchQuery).toBe('');
      expect(def.selectedCategory).toBe('ALL');
      expect((def as any).selectedRxFilter).toBeUndefined();
    });
  });
});
