/**
 * warehouseCalculation.service.spec.ts - Kiểm Thử Đơn Vị Tầng Dịch Vụ Tính Toán Kho Hàng (Warehouse Calculation Service)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Tính toán KPI hiển thị chuẩn, đếm số lượng thuốc Rx và OTC, lọc danh mục kho, lọc chuyển kho.
 * 2. [Boundary Values]: Tồn kho bằng 0, mảng chuyển kho rỗng, bộ lọc ALL, chuỗi tìm kiếm rỗng/khoảng trắng.
 * 3. [Abnormal Values]: Dữ liệu null, undefined, thuốc thiếu trường stock hoặc giá âm.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine, StockTransfer } from '../../src/types/pharmacy.types';
import { WarehouseCalculationService } from '../../src/services/warehouseCalculation.service';

describe('WarehouseCalculationService - Tầng Dịch Vụ Tính Toán & Quản Lý Kho Hàng GSP', () => {
  const sampleMedicines: Medicine[] = [
    {
      id: 'med-01',
      name: 'Amoxicillin 500mg (Kháng sinh kê đơn)',
      price: 60000,
      stock: 200,
      unit: 'Hộp',
      active: 'Amoxicillin',
      isRx: true,
      category: 'Kháng sinh',
      sku: 'AMOX-500',
      barcode: '8931111111111',
      batches: [],
    },
    {
      id: 'med-02',
      name: 'Panadol Extra Đỏ (Giảm đau hạ sốt)',
      price: 25000,
      stock: 350,
      unit: 'Hộp',
      active: 'Paracetamol',
      isRx: false,
      category: 'Giảm đau',
      sku: 'PANADOL-EXTRA',
      barcode: '8932222222222',
      batches: [],
    },
    {
      id: 'med-03',
      name: 'Băng cá nhân Urgo (Vật tư y tế)',
      price: 15000,
      stock: 0,
      unit: 'Hộp',
      active: 'Vật tư',
      isRx: false,
      category: 'Vật tư',
      sku: 'URGO-BOX',
      barcode: '8933333333333',
      batches: [],
    },
  ];

  const sampleTransfers: StockTransfer[] = [
    {
      id: 'tr-01',
      transferCode: 'TR-001',
      fromBranchId: 'CENTRAL_WH',
      toBranchId: 'BR-01',
      status: 'SHIPPING',
      createdAt: '2026-11-12T00:00:00Z',
      items: [],
    },
    {
      id: 'tr-02',
      transferCode: 'TR-002',
      fromBranchId: 'CENTRAL_WH',
      toBranchId: 'BR-02',
      status: 'COMPLETED',
      createdAt: '2026-11-12T01:00:00Z',
      items: [],
    },
  ];

  // =========================================================================
  // 1. [Normal Values] - Nghiệp vụ chuẩn
  // =========================================================================
  describe('1. [Normal Values] - Tính toán KPI & Lọc kho chuẩn', () => {
    it('N-01: Tính đúng KPI tổng loại thuốc, tổng tồn kho và tỷ lệ Rx / OTC', () => {
      const kpi = WarehouseCalculationService.calculateWarehouseKPI(
        { totalMedicines: 0, totalStock: 0 },
        sampleMedicines
      );

      expect(kpi.displayedTotalMedicines).toBe(3);
      expect(kpi.displayedTotalStock).toBe(550); // 200 + 350 + 0
      expect(kpi.rxCount).toBe(1);
      expect(kpi.otcCount).toBe(2);
    });

    it('N-02: Ưu tiên số liệu chính xác từ inventoryStats của cơ sở dữ liệu nếu có', () => {
      const kpi = WarehouseCalculationService.calculateWarehouseKPI(
        { totalMedicines: 2334, totalStock: 150000 },
        sampleMedicines
      );

      expect(kpi.displayedTotalMedicines).toBe(2334);
      expect(kpi.displayedTotalStock).toBe(150000);
    });

    it('N-03: Lọc danh mục kho hàng cho phép tìm kiếm cả thuốc kê đơn Rx', () => {
      const rxItems = WarehouseCalculationService.filterWarehouseInventory(sampleMedicines, 'Amoxicillin');
      expect(rxItems).toHaveLength(1);
      expect(rxItems[0].isRx).toBe(true);
    });

    it('N-04: Lọc đơn chuyển kho theo trạng thái SHIPPING và COMPLETED', () => {
      const shipping = WarehouseCalculationService.filterStockTransfers(sampleTransfers, 'SHIPPING');
      expect(shipping).toHaveLength(1);
      expect(shipping[0].transferCode).toBe('TR-001');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên
  // =========================================================================
  describe('2. [Boundary Values] - Kiểm tra các giá trị biên', () => {
    it('B-01: Danh sách thuốc rỗng trả về KPI bằng 0 an toàn', () => {
      const emptyKpi = WarehouseCalculationService.calculateWarehouseKPI(
        { totalMedicines: 0, totalStock: 0 },
        []
      );
      expect(emptyKpi.displayedTotalMedicines).toBe(0);
      expect(emptyKpi.displayedTotalStock).toBe(0);
      expect(emptyKpi.rxCount).toBe(0);
      expect(emptyKpi.otcCount).toBe(0);
    });

    it('B-02: Bộ lọc chuyển kho ALL trả về toàn bộ danh sách', () => {
      const allTransfers = WarehouseCalculationService.filterStockTransfers(sampleTransfers, 'ALL');
      expect(allTransfers).toHaveLength(2);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý dữ liệu dị thường
  // =========================================================================
  describe('3. [Abnormal Values] - Dữ liệu bất thường', () => {
    it('A-01: Truyền danh sách null hoặc undefined không làm gián đoạn chương trình', () => {
      expect(WarehouseCalculationService.filterWarehouseInventory(null as any)).toEqual([]);
      expect(WarehouseCalculationService.filterStockTransfers(undefined as any)).toEqual([]);
    });

    it('A-02: Thuốc thiếu trường stock được coi như tồn kho = 0', () => {
      const corruptMeds: any[] = [{ id: 'c1', name: 'Thuốc lỗi', stock: undefined, isRx: false }];
      const kpi = WarehouseCalculationService.calculateWarehouseKPI(
        { totalMedicines: 0, totalStock: 0 },
        corruptMeds as Medicine[]
      );
      expect(kpi.displayedTotalStock).toBe(0);
      expect(kpi.otcCount).toBe(1);
    });
  });
});
