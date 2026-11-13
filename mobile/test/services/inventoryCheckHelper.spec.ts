/**
 * inventoryCheckHelper.spec.ts
 * Bộ kiểm thử đơn vị cho Tiện ích Biên Bản Kiểm Kê Kho & Liên Kết Sơ Đồ Kho Mobile (BW07)
 * Tuân thủ quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate) & Zero Untested Code.
 * 
 * Phân chia đầy đủ 3 nhóm giá trị kiểm thử:
 * 1. [Normal Values]: Chuyển đổi dữ liệu tầng kệ sang danh sách kiểm kê, tính chênh lệch, quét barcode đếm thuốc.
 * 2. [Boundary Values]: Mốc biên 0 tồn, số lượng bằng nhau không lệch, kiểm kê toàn bộ vs kiểm kê chọn lọc.
 * 3. [Abnormal Values]: Dữ liệu dị thường (mảng rỗng, null/undefined, số âm, chênh lệch thiếu lý do).
 */

import {
  buildCheckItemsFromShelf,
  calculateDiscrepancy,
  incrementStockByBarcode,
  validateInventoryCheckSubmission,
  formatWarehouseLocationLabel,
  ShelfDetailPayload,
} from '../../src/services/inventoryCheckHelper';

describe('Tiện Ích Biên Bản Kiểm Kê Kho & Sơ Đồ Kho Mobile (inventoryCheckHelper)', () => {
  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('1. [Normal Values] Luồng nghiệp vụ chuẩn', () => {
    const mockShelfData: ShelfDetailPayload = {
      zone: 'A',
      rack: 'A1',
      shelf: 2,
      batches: [
        {
          id: 'med-001',
          name: 'Amoxicillin 500mg',
          sku: 'AMX-500',
          barcode: '8935001234567',
          unit: 'Hộp',
          batches: [
            { _id: 'batch-01', batchNo: 'LOT-2026-A1', expDate: '2027-12-31', stock: 50 },
            { _id: 'batch-02', batchNo: 'LOT-2026-A2', expDate: '2027-06-30', stock: 30 },
          ],
        },
        {
          id: 'med-002',
          name: 'Paracetamol 500mg',
          sku: 'PARA-500',
          barcode: '8935009876543',
          unit: 'Vỉ',
          batches: [
            { _id: 'batch-03', batchNo: 'LOT-2026-P1', expDate: '2028-01-01', stock: 100 },
          ],
        },
      ],
    };

    it('TC-ICH-NORM-01: Chuyển đổi toàn bộ thuốc trên tầng kệ sang danh sách kiểm kê', () => {
      const items = buildCheckItemsFromShelf(mockShelfData);
      expect(items.length).toBe(3); // 2 lô của med-001 + 1 lô của med-002
      expect(items[0].medicineName).toBe('Amoxicillin 500mg');
      expect(items[0].batchNo).toBe('LOT-2026-A1');
      expect(items[0].systemStock).toBe(50);
      expect(items[0].actualStock).toBe(50);
      expect(items[0].difference).toBe(0);
      expect(items[0].location).toEqual({ zone: 'A', rack: 'A1', shelf: 2 });
    });

    it('TC-ICH-NORM-02: Lọc kiểm kê theo danh sách thuốc được thủ kho lựa chọn', () => {
      const items = buildCheckItemsFromShelf(mockShelfData, ['med-002']);
      expect(items.length).toBe(1);
      expect(items[0].medicineId).toBe('med-002');
      expect(items[0].medicineName).toBe('Paracetamol 500mg');
      expect(items[0].systemStock).toBe(100);
    });

    it('TC-ICH-NORM-03: Tính toán chênh lệch khớp tồn (MATCH)', () => {
      const res = calculateDiscrepancy(50, 50);
      expect(res.isValid).toBe(true);
      expect(res.difference).toBe(0);
      expect(res.status).toBe('MATCH');
    });

    it('TC-ICH-NORM-04: Quét barcode tìm đúng thuốc và tăng số lượng đếm thực tế', () => {
      const items = buildCheckItemsFromShelf(mockShelfData);
      const { updatedItems, found, matchedItem } = incrementStockByBarcode(items, '8935001234567');
      expect(found).toBe(true);
      expect(matchedItem?.actualStock).toBe(51);
      expect(matchedItem?.difference).toBe(1); // 51 - 50 = +1
      expect(updatedItems[0].actualStock).toBe(51);
    });

    it('TC-ICH-NORM-05: Định dạng nhãn vị trí kho GSP chuẩn', () => {
      const label = formatWarehouseLocationLabel({ zone: 'C', rack: 'C2', shelf: 3 });
      expect(label).toBe('Khu C · Kệ C2 · Tầng 3');
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên & Điểm cận
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên & Điểm cận', () => {
    it('TC-ICH-BOUND-01: Tồn kho hệ thống bằng 0, thực tế kiểm đếm được 1 (Thừa hàng)', () => {
      const res = calculateDiscrepancy(0, 1);
      expect(res.isValid).toBe(true);
      expect(res.difference).toBe(1);
      expect(res.status).toBe('SURPLUS');
    });

    it('TC-ICH-BOUND-02: Tồn kho hệ thống là 10, thực tế kiểm đếm bằng 0 (Mất hàng sạch kho)', () => {
      const res = calculateDiscrepancy(10, 0);
      expect(res.isValid).toBe(true);
      expect(res.difference).toBe(-10);
      expect(res.status).toBe('DEFICIT');
    });

    it('TC-ICH-BOUND-03: Biên bản kiểm kê hợp lệ khi tất cả thuốc đều khớp tồn và không cần nhập lý do', () => {
      const items = [
        {
          medicineId: 'med-1',
          medicineName: 'Thuốc A',
          systemStock: 20,
          actualStock: 20,
          difference: 0,
        },
      ];
      const valid = validateInventoryCheckSubmission(items as any);
      expect(valid.isValid).toBe(true);
      expect(valid.error).toBeUndefined();
    });

    it('TC-ICH-BOUND-04: Biên bản kiểm kê có chênh lệch và đã điền lý do đầy đủ', () => {
      const items = [
        {
          medicineId: 'med-1',
          medicineName: 'Thuốc A',
          systemStock: 20,
          actualStock: 18,
          difference: -2,
          discrepancyReason: 'Hư hỏng 2 hộp do ẩm mốc, đã niêm phong cách ly',
        },
      ];
      const valid = validateInventoryCheckSubmission(items as any);
      expect(valid.isValid).toBe(true);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & Ngoại lệ
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường & Ngoại lệ', () => {
    it('TC-ICH-ABNORM-01: Từ chối biên bản nếu danh sách kiểm kê rỗng hoặc undefined', () => {
      expect(validateInventoryCheckSubmission([]).isValid).toBe(false);
      expect(validateInventoryCheckSubmission(null as any).isValid).toBe(false);
    });

    it('TC-ICH-ABNORM-02: Từ chối biên bản nếu có chênh lệch nhưng để trống lý do', () => {
      const items = [
        {
          medicineId: 'med-1',
          medicineName: 'Thuốc B',
          systemStock: 50,
          actualStock: 48,
          difference: -2,
          discrepancyReason: '   ', // Rỗng toàn khoảng trắng
        },
      ];
      const res = validateInventoryCheckSubmission(items as any);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Bắt buộc phải ghi rõ lý do chênh lệch');
    });

    it('TC-ICH-ABNORM-03: Từ chối số lượng thực tế âm hoặc NaN', () => {
      const res1 = calculateDiscrepancy(50, -5);
      expect(res1.isValid).toBe(false);

      const res2 = calculateDiscrepancy(NaN, 10);
      expect(res2.isValid).toBe(false);
    });

    it('TC-ICH-ABNORM-04: Quét mã vạch không tồn tại trong danh sách kiểm', () => {
      const items = [
        {
          medicineId: 'med-1',
          medicineName: 'Thuốc A',
          barcode: '111',
          systemStock: 10,
          actualStock: 10,
          difference: 0,
        },
      ];
      const { found } = incrementStockByBarcode(items as any, '999999999');
      expect(found).toBe(false);
    });

    it('TC-ICH-ABNORM-05: Xử lý an toàn khi tầng kệ không có thuốc hoặc batches bị null', () => {
      const items = buildCheckItemsFromShelf({
        zone: 'A',
        rack: 'A1',
        shelf: 1,
        batches: null as any,
      });
      expect(items).toEqual([]);
    });
  });
});

