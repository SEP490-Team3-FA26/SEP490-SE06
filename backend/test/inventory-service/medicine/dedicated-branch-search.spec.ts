import { RpcException } from '@nestjs/microservices';
import { MedicineMapper } from '../../../apps/inventory-service/src/medicine/medicine.mapper';

/**
 * BỘ KIỂM THỬ API CHUYÊN BIỆT: TÌM KIẾM DƯỢC PHẨM TẠI CHI NHÁNH (DEDICATED BRANCH SEARCH)
 * Tuân thủ quy chuẩn Test-Coupled Mandate với 3 nhóm kiểm thử tiêu chuẩn:
 * 1. [Normal Values]: Luồng nghiệp vụ chuẩn (Tìm kiếm theo tên/hoạt chất/barcode, tính chuẩn tồn chi nhánh 404 hộp).
 * 2. [Boundary Values]: Giá trị biên (Từ khóa rỗng, giới hạn phân trang min/max, thuốc tồn kho 0).
 * 3. [Abnormal Values]: Dữ liệu dị thường (Thiếu branchId, ký tự Regex Injection, thuốc không tồn tại).
 */
describe('API Chuyên Biệt Tìm Kiếm Thuốc Chi Nhánh (Dedicated Branch Search API)', () => {
  // Giả lập dữ liệu Master Catalog thuốc
  const mockDbMedicines = [
    {
      _id: '66a01234567890abcdef1001',
      name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu giảm đau',
      active_ingredient: 'Diclofenac sodium 1.5%',
      sku: 'MED-SLP-01',
      barcode: '8931234567890',
      price: 25000,
      stock: 3344, // Tồn kho toàn chuỗi
      minStock: 50,
      category: 'Miếng dán giảm đau',
    },
    {
      _id: '66a01234567890abcdef1002',
      name: 'Cao dán Salonsip Gel - Patch Hisamitsu giảm đau',
      active_ingredient: 'L-menthol 1g, DL-camphor',
      sku: 'MED-SLS-02',
      barcode: '8931234567891',
      price: 123123,
      stock: 5000, // Tồn kho toàn chuỗi
      minStock: 50,
      category: 'Miếng dán giảm đau',
    },
    {
      _id: '66a01234567890abcdef1003',
      name: 'Cao dán thảo dược Ecosip Tatra',
      active_ingredient: 'Thảo ma',
      sku: 'MED-ECO-03',
      barcode: '8931234567892',
      price: 213000,
      stock: 1200,
      minStock: 50,
      category: 'Miếng dán giảm đau',
    },
  ];

  // Giả lập số dư kho chi nhánh BR-001 (branch_stock_balances)
  const mockBranchBalances: Record<string, number> = {
    '66a01234567890abcdef1001': 404, // Salonpas Diclofenac: 404 hộp
    '66a01234567890abcdef1002': 0,   // Salonsip Gel: Hết hàng tại BR-001 (0 hộp)
    // Ecosip không có bản ghi -> mặc định 0 hộp
  };

  // Giả lập service tìm kiếm chuyên biệt
  const createMockService = () => {
    return {
      async searchBranchMedicines(query: any) {
        if (!query?.branchId) {
          throw new RpcException('Yêu cầu branchId để tìm kiếm thuốc tại chi nhánh');
        }

        const branchId = String(query.branchId).trim();
        const rawSearch = (query.search || '').trim();
        const page = Math.max(Number(query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);

        // Fast-path Barcode
        const isBarcode = /^[0-9]{8,14}$/.test(rawSearch);
        let candidates = mockDbMedicines;

        if (rawSearch) {
          if (isBarcode) {
            candidates = candidates.filter((m) => m.barcode === rawSearch);
          } else {
            const words = rawSearch.split(/[\s\-]+/).filter(Boolean);
            const safePattern = words.length > 0
              ? words.map((w) => w.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')).join('.*')
              : rawSearch.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
            const regex = new RegExp(safePattern, 'i');
            candidates = candidates.filter((m) => regex.test(m.name) || regex.test(m.active_ingredient));
          }
        }

        if (query.branchStockOnly) {
          candidates = candidates.filter((m) => (mockBranchBalances[m._id] || 0) > 0);
        }

        // Branch Stock Enrichment với Zero-Leak Policy
        const mappedData = candidates.map((med) => {
          const balStock = mockBranchBalances[med._id];
          const safeBalanceStock = balStock !== undefined ? balStock : 0;
          return MedicineMapper.toListItemDto(med, [], {
            dbMed: med,
            branchId,
            balanceStock: safeBalanceStock,
          });
        });

        // Smart Re-ranking: còn hàng lên trước
        mappedData.sort((a, b) => {
          if (a.stock > 0 && b.stock <= 0) return -1;
          if (a.stock <= 0 && b.stock > 0) return 1;
          return 0;
        });

        const total = mappedData.length;
        const totalPages = Math.ceil(total / limit);

        return {
          data: mappedData.slice((page - 1) * limit, page * limit),
          total,
          totalPages,
          page,
          limit,
          pagination: { total, totalPages, page, limit },
        };
      },
    };
  };

  const service = createMockService();

  // =========================================================================
  // 1. [Normal Values]: Luồng chuẩn
  // =========================================================================
  describe('1. [Normal Values] Luồng chuẩn - Đảm bảo chính xác tồn kho chi nhánh khi tìm kiếm', () => {
    it('[Normal] Tìm kiếm theo từ khóa "Salonpas Diclofenac" phải trả về đúng 404 hộp, không bị rò rỉ 3344 hộp', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: 'Salonpas Diclofenac',
      });

      expect(result.data.length).toBe(1);
      const item = result.data[0];
      expect(item.name).toContain('Salonpas Diclofenac');
      expect(item.stock).toBe(404); // Chuẩn tồn kho chi nhánh BR-001
      expect(item.stock).not.toBe(3344); // Không bao giờ rò rỉ tồn chuỗi
      expect(item.status).toBe('In Stock');
    });

    it('[Normal] Tìm kiếm qua Fast-Path Barcode chính xác "8931234567890"', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: '8931234567890',
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].barcode).toBe('8931234567890');
      expect(result.data[0].stock).toBe(404);
    });

    it('[Normal] Bật cờ branchStockOnly: true phải loại trừ hoàn toàn các thuốc có tồn kho 0 tại chi nhánh', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: 'Salonpas',
        branchStockOnly: true,
      });

      // Salonsip Gel hết hàng (0 hộp) bị loại bỏ, chỉ còn Salonpas Diclofenac (404 hộp)
      expect(result.data.length).toBe(1);
      expect(result.data[0].stock).toBe(404);
      expect(result.data.every((m: any) => m.stock > 0)).toBe(true);
    });

    it('[Normal] Smart Re-ranking: Thuốc còn hàng (stock > 0) phải được ưu tiên đứng trước thuốc hết hàng', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: 'Cao dán', // Khớp cả 3 thuốc
      });

      expect(result.data.length).toBe(3);
      // Phần tử đầu tiên phải là thuốc còn hàng (404 hộp)
      expect(result.data[0].stock).toBe(404);
      // Các phần tử sau có tồn kho 0
      expect(result.data[1].stock).toBe(0);
      expect(result.data[2].stock).toBe(0);
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên & Giới hạn
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên & Phân trang', () => {
    it('[Boundary] Thuốc hết hàng tại chi nhánh phải hiển thị chính xác stock: 0 và Out of Stock', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: 'Salonsip Gel',
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].stock).toBe(0);
      expect(result.data[0].status).toBe('Out of Stock');
      expect(result.data[0].stock).not.toBe(5000); // Không rò rỉ tồn chuỗi
    });

    it('[Boundary] Phân trang với limit tối thiểu (1) và page 2', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: 'Cao dán',
        page: 2,
        limit: 1,
      });

      expect(result.data.length).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.totalPages).toBe(3);
    });

    it('[Boundary] Phân trang với limit vượt ngưỡng (200) phải được chặn trần tối đa 100', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: 'Cao dán',
        limit: 200,
      });

      expect(result.limit).toBe(100);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & Ngoại lệ
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường & Chống tấn công giả mạo', () => {
    it('[Abnormal] Thiếu branchId phải ném ra ngoại lệ RpcException', async () => {
      await expect(
        service.searchBranchMedicines({ branchId: '', search: 'Panadol' })
      ).rejects.toThrow(RpcException);
    });

    it('[Abnormal] Ký tự Regex Injection đặc biệt phải được escape an toàn, không làm crash hệ thống', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: '.*+?{}()[]^$|\\',
      });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.total).toBe(0);
    });

    it('[Abnormal] Tìm kiếm từ khóa không tồn tại trả về mảng rỗng và tổng số 0', async () => {
      const result = await service.searchBranchMedicines({
        branchId: 'BR-001',
        search: 'Thuốc Không Hề Tồn Tại 12345XYZ',
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

