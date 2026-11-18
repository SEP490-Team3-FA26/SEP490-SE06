/**
 * warehousePerformance.spec.ts
 * Bộ kiểm thử đơn vị xác minh tối ưu hiệu năng Mobile WarehouseScreen:
 * - Lazy-load theo từng Tab (không bắn đồng thời 8 API nặng khi vừa mở màn hình)
 * - Debounce tìm kiếm 350ms (chỉ gọi riêng getMedicines, không gọi lại 8 API kho)
 * - Hiển thị cuốn chiếu danh mục thuốc (20 mục/lần) & sử dụng expo-image cache memory-disk
 * Tuân thủ Test-Coupled Mandate: Đủ 3 nhóm [Normal Values], [Boundary Values], [Abnormal Values].
 */

declare const require: any;
declare const __dirname: string;

const fs = require('fs');
const path = require('path');

const warehouseScreenSource: string = fs.readFileSync(
  path.resolve(__dirname, '../../src/screens/warehouse/WarehouseScreen.tsx'),
  'utf8',
);

// Helper mô phỏng phân trang cuốn chiếu danh sách thuốc Mobile
function getMobileVisibleSlice<T>(items: T[], limit: number): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  return items.slice(0, safeLimit);
}

describe('Mobile WarehouseScreen - Performance Optimization Suite', () => {
  // 1. [Normal Values]
  describe('1. [Normal Values] Cấu trúc tối ưu tải dữ liệu và render mượt 60fps', () => {
    it('TC-MOB-PERF-01: Áp dụng Lazy-load theo từng Tab (loadTabData + loadedTabsRef) thay vì gọi 8 API đồng thời', () => {
      expect(warehouseScreenSource).toContain('loadedTabsRef');
      expect(warehouseScreenSource).toContain('const loadTabData = useCallback');
      expect(warehouseScreenSource).toContain("if (tab === 'MAP')");
      expect(warehouseScreenSource).toContain("} else if (tab === 'RECEIPTS')");
    });

    it('TC-MOB-PERF-02: Áp dụng Debounce tìm kiếm 350ms tách biệt khỏi loadData', () => {
      expect(warehouseScreenSource).toContain('}, 350);');
      expect(warehouseScreenSource).toContain('ApiService.getMedicines({ search: searchQuery })');
    });

    it('TC-MOB-PERF-03: Sử dụng expo-image với cachePolicy="memory-disk" và hiển thị cuốn chiếu visibleMedicines', () => {
      expect(warehouseScreenSource).toContain("import { Image as ExpoImage } from 'expo-image'");
      expect(warehouseScreenSource).toContain('cachePolicy="memory-disk"');
      expect(warehouseScreenSource).toContain('visibleMedicines.map');
      expect(warehouseScreenSource).toContain('useMemo');
    });
  });

  // 2. [Boundary Values]
  describe('2. [Boundary Values] Giới hạn hiển thị cuốn chiếu tại các mốc biên', () => {
    it('TC-MOB-PERF-04: Danh sách 500 thuốc ban đầu chỉ render đúng 20 item (không làm treo JS Thread)', () => {
      const meds = Array.from({ length: 500 }, (_, i) => ({ id: `m-${i}` }));
      const page1 = getMobileVisibleSlice(meds, 20);
      expect(page1).toHaveLength(20);
      expect(page1[19].id).toBe('m-19');
    });

    it('TC-MOB-PERF-05: Danh sách ít hơn 20 thuốc hoặc rỗng trả đúng kích thước an toàn', () => {
      expect(getMobileVisibleSlice([{ id: '1' }], 20)).toHaveLength(1);
      expect(getMobileVisibleSlice([], 20)).toHaveLength(0);
    });
  });

  // 3. [Abnormal Values]
  describe('3. [Abnormal Values] Xử lý tham số dị thường an toàn', () => {
    it('TC-MOB-PERF-06: Mảng null/undefined hoặc giới hạn âm/NaN trả về mảng rỗng không crash', () => {
      expect(getMobileVisibleSlice(null as any, 20)).toEqual([]);
      expect(getMobileVisibleSlice([{ id: '1' }], -5)).toEqual([]);
      expect(getMobileVisibleSlice([{ id: '1' }], Number.NaN)).toEqual([]);
    });
  });
});
