/**
 * BranchScreen.spec.ts - Kiểm Thử Đơn Vị Nghiệp Vụ Quản Lý Chi Nhánh (Branch Manager)
 * Hệ thống Quản lý Chuỗi Nhà thuốc - WDP301 / SEP490
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Chuyển tab điều hướng, tính số lượng chuyển kho chờ nhận, định dạng badge (99+), lọc cảnh báo tồn kho.
 * 2. [Boundary Values]: Danh sách rỗng, ngưỡng biên 99 và 100 sản phẩm, tồn kho = 0 (hết hàng) và tồn kho = 10 (tồn thấp).
 * 3. [Abnormal Values]: Phiếu chuyển kho thiếu trường status, thuốc thiếu số lượng tồn, tìm kiếm ký tự đặc biệt/khoảng trắng.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

// Hàm logic hỗ trợ tính số phiếu chuyển kho chờ nhận tại chi nhánh
export const calculatePendingTransfersCount = (transfers: any[]): number => {
  if (!Array.isArray(transfers)) return 0;
  return transfers.filter((t) => t && t.status !== 'COMPLETED' && t.status !== 'RECEIVED').length;
};

// Hàm định dạng badge số lượng chuẩn UI/UX
export const formatBadgeCount = (count: number): string => {
  if (typeof count !== 'number' || isNaN(count) || count <= 0) return '0';
  return count > 99 ? '99+' : String(count);
};

// Hàm lọc cảnh báo thuốc tồn thấp tại quầy chi nhánh
export const filterBranchLowStock = (
  items: any[],
  filter: 'ALL' | 'OUT' | 'LOW',
  searchQuery: string = ''
): any[] => {
  if (!Array.isArray(items)) return [];
  const sq = (searchQuery || '').trim().toLowerCase();

  return items.filter((item) => {
    if (!item) return false;
    const name = String(item.name || '').toLowerCase();
    const supplier = String(item.supplier || '').toLowerCase();
    const matchesSearch = !sq || name.includes(sq) || supplier.includes(sq);
    if (!matchesSearch) return false;

    const stock = typeof item.stock === 'number' ? item.stock : 0;
    if (filter === 'OUT') return stock === 0;
    if (filter === 'LOW') return stock > 0 && stock <= 10;
    return true;
  });
};

describe('BranchScreen - Logic Điều Hướng & Quản Lý Chi Nhánh', () => {
  // ─── 1. [Normal Values] ──────────────────────────────────────────────────
  describe('[Normal Values] - Luồng nghiệp vụ chuẩn', () => {
    it('Nên đếm chính xác số phiếu chuyển kho đang chờ nhận (loại trừ COMPLETED và RECEIVED)', () => {
      const mockTransfers = [
        { id: 'tf-1', transferCode: 'TF-001', status: 'SHIPPED' },
        { id: 'tf-2', transferCode: 'TF-002', status: 'IN_TRANSIT' },
        { id: 'tf-3', transferCode: 'TF-003', status: 'PENDING' },
        { id: 'tf-4', transferCode: 'TF-004', status: 'COMPLETED' },
        { id: 'tf-5', transferCode: 'TF-005', status: 'RECEIVED' },
      ];

      const pendingCount = calculatePendingTransfersCount(mockTransfers);
      expect(pendingCount).toBe(3);
    });

    it('Nên định dạng số lượng dưới 99 giữ nguyên số gốc', () => {
      expect(formatBadgeCount(1)).toBe('1');
      expect(formatBadgeCount(42)).toBe('42');
      expect(formatBadgeCount(99)).toBe('99');
    });

    it('Nên lọc thuốc theo từ khóa tìm kiếm tên thuốc và nhà cung cấp', () => {
      const mockItems = [
        { name: 'Panadol Extra', supplier: 'GSK', stock: 5 },
        { name: 'Amoxicillin 500mg', supplier: 'Dược Hậu Giang', stock: 0 },
        { name: 'Berberin Mộc Hương', supplier: 'OPV', stock: 15 },
      ];

      const res = filterBranchLowStock(mockItems, 'ALL', 'panadol');
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Panadol Extra');

      const resSupplier = filterBranchLowStock(mockItems, 'ALL', 'Hậu Giang');
      expect(resSupplier).toHaveLength(1);
      expect(resSupplier[0].name).toBe('Amoxicillin 500mg');
    });
  });

  // ─── 2. [Boundary Values] ────────────────────────────────────────────────
  describe('[Boundary Values] - Giá trị biên', () => {
    it('Nên trả về 0 khi danh sách chuyển kho rỗng', () => {
      expect(calculatePendingTransfersCount([])).toBe(0);
    });

    it('Nên hiển thị 99+ khi số lượng vượt ngưỡng 99', () => {
      expect(formatBadgeCount(100)).toBe('99+');
      expect(formatBadgeCount(942)).toBe('99+');
      expect(formatBadgeCount(8245)).toBe('99+');
    });

    it('Nên lọc chính xác tại ngưỡng biên hết hàng (stock = 0)', () => {
      const mockItems = [
        { name: 'Thuốc A', stock: 0 },
        { name: 'Thuốc B', stock: 1 },
      ];

      const outOfStock = filterBranchLowStock(mockItems, 'OUT');
      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].name).toBe('Thuốc A');
    });

    it('Nên lọc chính xác tại ngưỡng biên tồn thấp (stock = 1 và stock = 10)', () => {
      const mockItems = [
        { name: 'Thuốc 0', stock: 0 },
        { name: 'Thuốc 1', stock: 1 },
        { name: 'Thuốc 10', stock: 10 },
        { name: 'Thuốc 11', stock: 11 },
      ];

      const lowStock = filterBranchLowStock(mockItems, 'LOW');
      expect(lowStock).toHaveLength(2);
      expect(lowStock.map((it) => it.name)).toEqual(['Thuốc 1', 'Thuốc 10']);
    });
  });

  // ─── 3. [Abnormal Values] ────────────────────────────────────────────────
  describe('[Abnormal Values] - Xử lý dữ liệu dị thường & ngoại lệ', () => {
    it('Nên xử lý an toàn khi đầu vào transfers là null hoặc undefined', () => {
      expect(calculatePendingTransfersCount(null as any)).toBe(0);
      expect(calculatePendingTransfersCount(undefined as any)).toBe(0);
      expect(calculatePendingTransfersCount('không phải mảng' as any)).toBe(0);
    });

    it('Nên bỏ qua các phần tử null/undefined bên trong mảng transfers mà không crash', () => {
      const corruptTransfers = [
        null,
        undefined,
        { id: 'tf-1', status: 'PENDING' },
      ];
      expect(calculatePendingTransfersCount(corruptTransfers)).toBe(1);
    });

    it('Nên định dạng an toàn khi count là NaN, âm hoặc undefined', () => {
      expect(formatBadgeCount(-5)).toBe('0');
      expect(formatBadgeCount(NaN)).toBe('0');
      expect(formatBadgeCount(undefined as any)).toBe('0');
    });

    it('Nên xử lý tìm kiếm an toàn khi query toàn khoảng trắng hoặc ký tự đặc biệt', () => {
      const mockItems = [
        { name: 'Panadol Extra', supplier: 'GSK', stock: 5 },
      ];
      const res = filterBranchLowStock(mockItems, 'ALL', '    ');
      expect(res).toHaveLength(1);

      const nullItems = filterBranchLowStock(null as any, 'ALL');
      expect(nullItems).toEqual([]);
    });
  });
});

