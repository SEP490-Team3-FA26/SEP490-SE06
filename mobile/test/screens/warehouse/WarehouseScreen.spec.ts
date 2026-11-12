/**
 * WarehouseScreen.spec.ts - Kiểm Thử Đơn Vị Nghiệp Vụ Role Thủ Kho (Warehouse Keeper)
 * Hệ thống Quản lý Chuỗi Nhà thuốc - WDP301 / SEP490
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Kiểm kê đầy đủ 2.334 SKU (cả Rx kê đơn lẫn OTC không kê đơn), KPI tổng kho, sơ đồ kho GSP Zone A-F, chuyển kho, quét GS1.
 * 2. [Boundary Values]: Fallback khi stats = 0, bộ lọc trạng thái chuyển kho biên, chuỗi tìm kiếm rỗng/khoảng trắng.
 * 3. [Abnormal Values]: Dữ liệu thuốc rỗng, thiếu trường, mã vạch lỗi/dị thường, không làm gián đoạn màn hình.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine, StockTransfer, WarehouseZone } from '../../../src/types/pharmacy.types';
import { WarehouseCalculationService } from '../../../src/services/warehouseCalculation.service';

export const calculateWarehouseKPI = WarehouseCalculationService.calculateWarehouseKPI;
export const filterWarehouseInventory = WarehouseCalculationService.filterWarehouseInventory;
export const filterStockTransfers = WarehouseCalculationService.filterStockTransfers;

// Dữ liệu mẫu kiểm thử
const sampleWarehouseMedicines: Medicine[] = [
  {
    id: 'med-rx-01',
    name: 'Amoxicillin 500mg (Kháng sinh)',
    price: 45000,
    stock: 500,
    unit: 'Hộp',
    category: 'Kháng sinh',
    active: 'Amoxicillin Trihydrate',
    sku: 'SKU-AMOX-500',
    barcode: '893500100101',
    isRx: true, // Thuốc kê đơn
    batches: [
      { batchNo: 'AMX202601', expDate: '2027-01-01', stock: 500 },
    ],
  },
  {
    id: 'med-rx-02',
    name: 'Amlodipine 5mg (Tim mạch - Huyết áp)',
    price: 68000,
    stock: 320,
    unit: 'Hộp',
    category: 'Tim mạch',
    active: 'Amlodipine Besylate',
    sku: 'SKU-AMLO-5',
    barcode: '893500100102',
    isRx: true, // Thuốc kê đơn
    batches: [
      { batchNo: 'AML202602', expDate: '2026-12-15', stock: 320 },
    ],
  },
  {
    id: 'med-otc-01',
    name: 'Panadol Extra Đỏ Giảm Đau Hạ Sốt',
    price: 35000,
    stock: 1200,
    unit: 'Hộp',
    category: 'Hạ sốt & Giảm đau',
    active: 'Paracetamol, Caffeine',
    sku: 'SKU-PANA-RED',
    barcode: '893500100103',
    isRx: false, // Thuốc OTC
    batches: [
      { batchNo: 'PAN202603', expDate: '2028-06-30', stock: 1200 },
    ],
  },
  {
    id: 'med-otc-02',
    name: 'Berberin Mộc Hương Tiêu Hóa',
    price: 18000,
    stock: 800,
    unit: 'Lọ',
    category: 'Tiêu hóa',
    active: 'Berberin clorid',
    sku: 'SKU-BERB-01',
    barcode: '893500100104',
    isRx: false, // Thuốc OTC
    batches: [
      { batchNo: 'BER202604', expDate: '2027-08-20', stock: 800 },
    ],
  },
];

const sampleTransfers: StockTransfer[] = [
  {
    id: 'st-01',
    transferCode: 'TRF-HN-001',
    fromBranchId: 'CENTRAL_WH',
    fromBranchName: 'Kho Tổng GSP Miền Bắc',
    toBranchId: 'BRANCH-01',
    toBranchName: 'Nhà thuốc Chi Nhánh 1 Cầu Giấy',
    status: 'SHIPPING',
    createdAt: '2026-11-10T08:00:00Z',
    items: [],
  },
  {
    id: 'st-02',
    transferCode: 'TRF-HN-002',
    fromBranchId: 'CENTRAL_WH',
    fromBranchName: 'Kho Tổng GSP Miền Bắc',
    toBranchId: 'BRANCH-02',
    toBranchName: 'Nhà thuốc Chi Nhánh 2 Đống Đa',
    status: 'COMPLETED',
    createdAt: '2026-11-09T08:00:00Z',
    items: [],
  },
];

describe('WarehouseScreen - Role Thủ Kho (Warehouse Keeper)', () => {
  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn của Thủ kho
  // =========================================================================
  describe('1. [Normal Values] - Nghiệp vụ chuẩn', () => {
    it('N-01: Thủ kho kiểm kê thấy đầy đủ cả thuốc kê đơn (Rx) và không kê đơn (OTC), không bị lọc bỏ', () => {
      // Xác nhận Thủ kho không bị áp quy tắc chặn kê đơn như màn hình Khách hàng
      const inventory = filterWarehouseInventory(sampleWarehouseMedicines, '');
      expect(inventory.length).toBe(4);

      const rxItems = inventory.filter((m) => m.isRx);
      const otcItems = inventory.filter((m) => !m.isRx);

      expect(rxItems.length).toBe(2);
      expect(otcItems.length).toBe(2);
      expect(rxItems.some((m) => m.name.includes('Amoxicillin'))).toBe(true);
      expect(rxItems.some((m) => m.name.includes('Amlodipine'))).toBe(true);
    });

    it('N-02: KPI tổng kho hiển thị chính xác 2.334 SKU từ ApiService.getInventoryStats', () => {
      const statsFromBackend = {
        totalMedicines: 2334,
        totalStock: 185600,
      };

      const kpi = calculateWarehouseKPI(statsFromBackend, sampleWarehouseMedicines);

      expect(kpi.displayedTotalMedicines).toBe(2334);
      expect(kpi.displayedTotalStock).toBe(185600);
      expect(kpi.rxCount).toBe(2);
      expect(kpi.otcCount).toBe(2);
    });

    it('N-03: Tìm kiếm theo mã vạch GS1 hoặc SKU định vị chính xác thuốc kê đơn và không kê đơn', () => {
      // Tìm thuốc kê đơn qua SKU
      const searchRx = filterWarehouseInventory(sampleWarehouseMedicines, 'SKU-AMOX-500');
      expect(searchRx.length).toBe(1);
      expect(searchRx[0].name).toContain('Amoxicillin');
      expect(searchRx[0].isRx).toBe(true);

      // Tìm thuốc không kê đơn qua Barcode GS1
      const searchOtc = filterWarehouseInventory(sampleWarehouseMedicines, '893500100103');
      expect(searchOtc.length).toBe(1);
      expect(searchOtc[0].name).toContain('Panadol');
      expect(searchOtc[0].isRx).toBe(false);
    });

    it('N-04: Lọc danh sách phiếu chuyển kho liên chi nhánh theo các trạng thái SHIPPING và COMPLETED', () => {
      const allTransfers = filterStockTransfers(sampleTransfers, 'ALL');
      expect(allTransfers.length).toBe(2);

      const shippingTransfers = filterStockTransfers(sampleTransfers, 'SHIPPING');
      expect(shippingTransfers.length).toBe(1);
      expect(shippingTransfers[0].transferCode).toBe('TRF-HN-001');

      const completedTransfers = filterStockTransfers(sampleTransfers, 'COMPLETED');
      expect(completedTransfers.length).toBe(1);
      expect(completedTransfers[0].transferCode).toBe('TRF-HN-002');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, fallback
  // =========================================================================
  describe('2. [Boundary Values] - Kiểm tra giá trị biên', () => {
    it('B-01: Khi inventoryStats trả về 0 (chưa kịp load hoặc rỗng), fallback về medicines.length', () => {
      const emptyStats = { totalMedicines: 0, totalStock: 0 };
      const kpi = calculateWarehouseKPI(emptyStats, sampleWarehouseMedicines);

      expect(kpi.displayedTotalMedicines).toBe(sampleWarehouseMedicines.length);
      expect(kpi.displayedTotalStock).toBe(500 + 320 + 1200 + 800); // 2820
    });

    it('B-02: Chuỗi tìm kiếm có khoảng trắng thừa được chuẩn hóa an toàn (trim)', () => {
      const result = filterWarehouseInventory(sampleWarehouseMedicines, '   panadol   ');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('med-otc-01');
    });

    it('B-03: Bộ lọc chuyển kho với danh sách rỗng trả về mảng rỗng [] không lỗi', () => {
      const res = filterStockTransfers([], 'SHIPPING');
      expect(res).toEqual([]);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu bất thường, thiếu trường
  // =========================================================================
  describe('3. [Abnormal Values] - Xử lý dữ liệu dị thường', () => {
    it('A-01: Thuốc thiếu trường name, active hoặc barcode không làm crash bộ lọc kho', () => {
      const dirtyMeds: Medicine[] = [
        ...sampleWarehouseMedicines,
        {
          id: 'med-dirty',
          name: undefined as any,
          price: 0,
          stock: 10,
          unit: 'Hộp',
          category: 'Khác',
          active: undefined as any,
          isRx: false,
          batches: [],
        },
      ];

      expect(() => filterWarehouseInventory(dirtyMeds, 'Amoxicillin')).not.toThrow();
      const res = filterWarehouseInventory(dirtyMeds, 'Amoxicillin');
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('med-rx-01');
    });

    it('A-02: Thuốc có mảng batches rỗng hoặc stock undefined được tính tổng tồn kho an toàn bằng 0', () => {
      const medNoStock: Medicine[] = [
        {
          id: 'med-no-stock',
          name: 'Thuốc chưa có tồn',
          price: 10000,
          stock: undefined as any,
          unit: 'Hộp',
          category: 'Khác',
          active: 'Test',
          isRx: true,
          batches: [],
        },
      ];

      const kpi = calculateWarehouseKPI({ totalMedicines: 0, totalStock: 0 }, medNoStock);
      expect(kpi.displayedTotalStock).toBe(0);
      expect(kpi.rxCount).toBe(1);
    });

    it('A-03: Dữ liệu chuyển kho thiếu status không làm vỡ hàm lọc filterStockTransfers', () => {
      const dirtyTransfers: any[] = [
        { id: 'st-dirty', transferCode: 'TRF-ERR', status: undefined },
      ];

      expect(() => filterStockTransfers(dirtyTransfers, 'SHIPPING')).not.toThrow();
      const res = filterStockTransfers(dirtyTransfers, 'SHIPPING');
      expect(res.length).toBe(0);
    });
  });
});
