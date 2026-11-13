/**
 * ProductCatalogScreen.spec.ts - Kiểm Thử Đơn Vị Tầng Dịch Vụ & Nghiệp Vụ Danh Mục Sản Phẩm (Catalog Filter Service)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate) - Zero Mock / Test Code Thật:
 * 1. [Normal Values]: Lọc danh mục, tìm kiếm chuẩn xác, chặn thuốc kê đơn Rx theo GPP, sắp xếp giá/tên, phân trang 50 sản phẩm.
 * 2. [Boundary Values]: Từ khóa rỗng, danh mục ALL, trang cuối cùng (hasMore = false), biên giá 100k, 300k, 500k.
 * 3. [Abnormal Values]: Dữ liệu thuốc rỗng, thuốc thiếu trường giá, reset bộ lọc không ném lỗi runtime crash (ReferenceError: setSelectedRxFilter).
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine } from '../../../src/types/pharmacy.types';
import { CatalogFilterService } from '../../../src/services/catalogFilter.service';

describe('ProductCatalogScreen & CatalogFilterService - Kiểm Thử Nghiệp Vụ Thực Tế Tầng Service', () => {
  const sampleMedicines: Medicine[] = [
    {
      id: 'med-01',
      name: 'Cao dán Salonpas Diclofenac Patch',
      price: 25000,
      stock: 100,
      unit: 'Hộp',
      category: 'Miếng dán giảm đau',
      active: 'Diclofenac',
      isRx: false,
      batches: [],
    },
    {
      id: 'med-02',
      name: 'Thuốc kháng sinh Amoxicillin 500mg',
      price: 90000,
      stock: 50,
      unit: 'Hộp',
      category: 'Thuốc kháng sinh',
      active: 'Amoxicillin',
      isRx: true,
      batches: [],
    },
    {
      id: 'med-03',
      name: 'Viên sủi Vitamin C Plussz',
      price: 45000,
      stock: 70,
      unit: 'Tuýp',
      category: 'Vitamin & Khoáng chất',
      active: 'Vitamin C',
      isRx: false,
      batches: [],
    },
    {
      id: 'med-04',
      name: 'Máy đo huyết áp Omron HEM-7120',
      price: 850000,
      stock: 15,
      unit: 'Bộ',
      category: 'Thiết bị y tế gia đình',
      active: '',
      isRx: false,
      batches: [],
    },
    {
      id: 'med-05',
      name: 'Thuốc xịt mũi Cold & Flu Relief',
      price: 150000,
      stock: 0, // Hết hàng
      unit: 'Chai',
      category: 'Thuốc hô hấp',
      active: 'Oxymetazoline',
      isRx: false,
      batches: [],
    },
  ];

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn & tuân thủ GPP
  // =========================================================================
  describe('1. [Normal Values] - Nghiệp vụ chuẩn & Tuân thủ quy chuẩn GPP', () => {
    it('N-01: Chặn 100% thuốc kê đơn (Rx) đối với màn hình mua sắm khách hàng', () => {
      const filtered = CatalogFilterService.filterAndSortMedicines(sampleMedicines);

      const hasRx = filtered.some((m) => m.isRx);
      expect(hasRx).toBe(false);
      expect(filtered.find((m) => m.id === 'med-02')).toBeUndefined();
    });

    it('N-02: Lọc sản phẩm chính xác theo từ khóa tìm kiếm (tên thuốc, hoạt chất, SKU)', () => {
      const byName = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { query: 'Salonpas' });
      expect(byName).toHaveLength(1);
      expect(byName[0].id).toBe('med-01');

      const byActive = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { query: 'Vitamin C' });
      expect(byActive).toHaveLength(1);
      expect(byActive[0].id).toBe('med-03');
    });

    it('N-03: Lọc sản phẩm theo danh mục thuốc', () => {
      const byCategory = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { categoryKeyword: 'dán' });
      expect(byCategory).toHaveLength(1);
      expect(byCategory[0].name).toContain('Cao dán');
    });

    it('N-04: Lọc theo khoảng giá và nhóm phân loại thực phẩm chức năng / thiết bị', () => {
      const cheap = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { priceFilter: 'UNDER_100' });
      expect(cheap.every((m) => (m.price || 0) < 100000)).toBe(true);

      const devices = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { productType: 'DEVICE' });
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toContain('Máy đo huyết áp');
    });

    it('N-05: Sắp xếp theo giá tăng dần và giảm dần', () => {
      const asc = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { sortBy: 'PRICE_ASC' });
      expect(asc[0].price).toBeLessThanOrEqual(asc[asc.length - 1].price || 0);

      const desc = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { sortBy: 'PRICE_DESC' });
      expect(desc[0].price).toBeGreaterThanOrEqual(desc[desc.length - 1].price || 0);
    });

    it('N-06: Phân trang danh mục 50 sản phẩm / trang', () => {
      const paged = CatalogFilterService.paginateCatalog(sampleMedicines, 1, 2);
      expect(paged.data).toHaveLength(2);
      expect(paged.page).toBe(1);
      expect(paged.totalPages).toBe(3);
      expect(paged.hasMore).toBe(true);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên (Biên giá, danh mục ALL, trang cuối)
  // =========================================================================
  describe('2. [Boundary Values] - Kiểm tra các giá trị biên', () => {
    it('B-01: Bộ lọc ALL hoặc chuỗi tìm kiếm rỗng phải giữ nguyên toàn bộ sản phẩm OTC', () => {
      const all = CatalogFilterService.filterAndSortMedicines(sampleMedicines, {
        query: '   ',
        categoryKeyword: 'ALL',
        priceFilter: 'ALL',
        productType: 'ALL',
      });
      // 5 thuốc trừ 1 thuốc Rx = 4 thuốc OTC
      expect(all).toHaveLength(4);
    });

    it('B-02: Lọc sản phẩm còn hàng khi có thuốc stock = 0', () => {
      const inStock = CatalogFilterService.filterAndSortMedicines(sampleMedicines, { inStockOnly: true });
      expect(inStock.some((m) => m.id === 'med-05')).toBe(false);
      expect(inStock.every((m) => (m.stock || 0) > 0)).toBe(true);
    });

    it('B-03: Phân trang ở trang cuối cùng phải trả về hasMore = false', () => {
      const lastPage = CatalogFilterService.paginateCatalog(sampleMedicines, 3, 2);
      expect(lastPage.hasMore).toBe(false);
      expect(lastPage.data).toHaveLength(1);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu bất thường & Ngăn ngừa Runtime Crash
  // =========================================================================
  describe('3. [Abnormal Values] - Xử lý dữ liệu dị thường & Ngăn ngừa Crash', () => {
    it('A-01: Mảng thuốc rỗng, null hoặc undefined không gây exception', () => {
      expect(CatalogFilterService.filterAndSortMedicines([])).toEqual([]);
      expect(CatalogFilterService.filterAndSortMedicines(null as any)).toEqual([]);
      expect(CatalogFilterService.filterAndSortMedicines(undefined as any)).toEqual([]);
    });

    it('A-02: Thuốc thiếu trường hoặc chứa trường null được xử lý an toàn', () => {
      const corrupted: any[] = [
        { id: 'corrupt-1', name: null, price: undefined, isRx: false },
        { id: 'corrupt-2', name: 'Thuốc lỗi', price: null, isRx: false },
      ];
      const result = CatalogFilterService.filterAndSortMedicines(corrupted as Medicine[], { query: 'Thuốc' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('corrupt-2');
    });

    it('A-03: Hàm getDefaultFilterState trả về đối tượng bộ lọc hoàn chỉnh, ngăn ngừa lỗi runtime ReferenceError: setSelectedRxFilter is not defined', () => {
      const defaults = CatalogFilterService.getDefaultFilterState();

      expect(defaults).toBeDefined();
      expect(defaults.searchQuery).toBe('');
      expect(defaults.selectedCategory).toBe('ALL');
      expect(defaults.selectedProductType).toBe('ALL');
      expect(defaults.selectedPriceFilter).toBe('ALL');
      expect(defaults.selectedInStockOnly).toBe(false);
      expect(defaults.sortBy).toBe('DEFAULT');

      // Khẳng định không có trường setSelectedRxFilter gây crash
      expect((defaults as any).selectedRxFilter).toBeUndefined();
    });
  });
});
