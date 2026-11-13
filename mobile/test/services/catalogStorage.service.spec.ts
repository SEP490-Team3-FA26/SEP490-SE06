// mobile/test/services/catalogStorage.service.spec.ts
/**
 * =========================================================================
 * BỘ KIỂM THỬ DỊCH VỤ CATALOG STORAGE CHO MOBILE (2000+ SẢN PHẨM)
 * Hệ thống ABC Pharmacy Mobile - WDP301 / SEP490
 * Tuân thủ Test-Coupled Mandate & 3 nhóm giá trị chuẩn
 * =========================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatalogStorageService } from '../../src/services/catalogStorage.service';
import { ApiService } from '../../src/services/api.service';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../src/services/api.service', () => ({
  ApiService: {
    syncMedicineCatalog: jest.fn(),
  },
}));

describe('CatalogStorageService - Xử lý danh mục 2000+ sản phẩm trên Mobile', () => {
  let service: CatalogStorageService;

  const sampleMeds = [
    {
      id: 'med-01',
      _id: 'med-01',
      name: 'Panadol Extra Đỏ',
      barcode: '8935001111111',
      sku: 'PANADOL-EXTRA',
      price: 25000,
      stock: 120,
      category: 'Giảm đau',
      units: [
        { unitName: 'Hộp', barcode: '8935001111111', exchangeValue: 1, price: 25000 },
        { unitName: 'Vỉ', barcode: '8935001111112', exchangeValue: 10, price: 2500 },
      ],
    },
    {
      id: 'med-02',
      _id: 'med-02',
      name: 'Berberin Mộc Hoa Trắng',
      barcode: '8935002222222',
      sku: 'BERBERIN-MHT',
      price: 15000,
      stock: 50,
      category: 'Tiêu hóa',
      units: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    service = CatalogStorageService.getInstance();
  });

  // =========================================================================
  // 1. NHÓM GIÁ TRỊ CHUẨN [Normal Values]: Tra cứu O(1), Full Sync, Delta Sync
  // =========================================================================
  describe('[Normal Values] - Đồng bộ và tra cứu chuẩn', () => {
    it('N-01: Full Sync thành công và tra cứu O(1) bằng barcode chính và barcode đơn vị đóng gói', async () => {
      (ApiService.syncMedicineCatalog as jest.Mock).mockResolvedValueOnce({
        items: sampleMeds,
        total: 2,
        serverTime: '2026-11-12T00:00:00Z',
        isFullSync: true,
      });

      const res = await service.syncCatalog('BR-01', true);
      expect(res.count).toBe(2);
      expect(res.isFullSync).toBe(true);

      // Tra cứu bằng mã vạch hộp
      const medByBox = service.findMedicineByBarcode('8935001111111');
      expect(medByBox).toBeDefined();
      expect(medByBox?.name).toBe('Panadol Extra Đỏ');

      // Tra cứu bằng mã vạch vỉ (mã đơn vị con)
      const medByBlister = service.findMedicineByBarcode('8935001111112');
      expect(medByBlister).toBeDefined();
      expect(medByBlister?.id).toBe('med-01');

      // Tra cứu bằng SKU
      const medBySku = service.findMedicineBySku('PANADOL-EXTRA');
      expect(medBySku).toBeDefined();
    });

    it('N-02: Delta Sync thành công, hợp nhất thuốc mới cập nhật vào danh mục', async () => {
      const updatedMed = {
        id: 'med-01',
        _id: 'med-01',
        name: 'Panadol Extra Đỏ (Đổi Giá)',
        barcode: '8935001111111',
        sku: 'PANADOL-EXTRA',
        price: 28000,
        stock: 90,
      };

      (ApiService.syncMedicineCatalog as jest.Mock).mockResolvedValueOnce({
        items: [updatedMed],
        total: 1,
        serverTime: '2026-11-12T01:00:00Z',
        isFullSync: false,
      });

      await service.syncCatalog('BR-01', false);
      const med = service.findMedicineById('med-01');
      expect(med?.price).toBe(28000);
      expect(med?.stock).toBe(90);
    });

    it('N-03: Tìm kiếm Client-Side tức thì không cần kết nối mạng', () => {
      const searchResults = service.searchMedicines('Panadol', 10);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].name).toContain('Panadol');
    });
  });

  // =========================================================================
  // 2. NHÓM GIÁ TRỊ BIÊN [Boundary Values]: Danh mục rỗng, chuỗi trắng, mã không tồn tại
  // =========================================================================
  describe('[Boundary Values] - Giá trị biên', () => {
    it('B-01: Barcode rỗng hoặc toàn khoảng trắng trả về undefined an toàn', () => {
      expect(service.findMedicineByBarcode('')).toBeUndefined();
      expect(service.findMedicineByBarcode('   ')).toBeUndefined();
    });

    it('B-02: SKU rỗng hoặc ID không có trong danh mục trả về undefined', () => {
      expect(service.findMedicineBySku('')).toBeUndefined();
      expect(service.findMedicineById('non-existent-id')).toBeUndefined();
    });

    it('B-03: Tìm kiếm với từ khóa rỗng trả về top danh sách theo limit', () => {
      const hits = service.searchMedicines('', 1);
      expect(hits.length).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // 3. NHÓM GIÁ TRỊ DỊ THƯỜNG [Abnormal Values]: Ngoại lệ mạng, lỗi parse AsyncStorage
  // =========================================================================
  describe('[Abnormal Values] - Xử lý dữ liệu dị thường & ngoại lệ mạng', () => {
    it('A-01: API đồng bộ ném ngoại lệ mạng thì dịch vụ vẫn giữ nguyên danh mục cũ và không làm crash app', async () => {
      (ApiService.syncMedicineCatalog as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

      const res = await service.syncCatalog('BR-01');
      expect(res).toBeDefined();
      expect(res.count).toBe(service.getTotalCount());
    });

    it('A-02: AsyncStorage chứa JSON hỏng không làm sập hàm init', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{ corrupt json...');
      await expect(service.init()).resolves.not.toThrow();
    });
  });
});

