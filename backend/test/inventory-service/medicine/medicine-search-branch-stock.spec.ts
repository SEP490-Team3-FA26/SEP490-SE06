import { MedicineMapper } from '../../../apps/inventory-service/src/medicine/medicine.mapper';

/**
 * BỘ KIỂM THỬ TÍNH CHÍNH XÁC TỒN KHO CHI NHÁNH KHI TÌM KIẾM DƯỢC PHẨM (FEFO & MULTI-BRANCH)
 * Tuân thủ quy định kiểm thử 3 nhóm giá trị chuẩn:
 * 1. [Normal Values]: Luồng chuẩn, tìm kiếm trả về đúng tồn kho chi nhánh (404 hộp thay vì 3344 hộp).
 * 2. [Boundary Values]: Giá trị biên (0 hộp, 1 hộp, ngưỡng an toàn minStock, Kho Tổng CENTRAL_WH).
 * 3. [Abnormal Values]: Dữ liệu dị thường, chống rò rỉ tồn kho toàn chuỗi (Anti-Data Leakage).
 */
describe('Kiểm thử tính toán Tồn kho Chi nhánh khi Tìm kiếm Thuốc (Anti-Leak Total Chain Stock)', () => {
  // Giả lập dữ liệu thuốc Salonpas Diclofenac từ cơ sở dữ liệu
  const mockMasterMedicine = {
    _id: '66a01234567890abcdef1234',
    name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu giảm đau',
    category: 'Miếng dán giảm đau',
    price: 25000,
    stock: 3344, // TỒN KHO TỔNG TOÀN CHUỖI (Master DB)
    minStock: 50,
    unit: 'Hộp',
    barcode: '8931234567890',
    sku: 'MED-SLP-01',
  };

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('1. [Normal Values] Luồng chuẩn - Đảm bảo chính xác tồn kho chi nhánh', () => {
    it('[Normal] Phải ưu tiên lấy số dư từ bảng cân bằng kho branch_stock_balances (404 hộp) thay vì tồn tổng (3344 hộp)', () => {
      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, [], {
        branchId: 'BR-001',
        balanceStock: 404, // Tồn kho thực tế tại chi nhánh BR-001
        specificBranchInvs: [],
        dbMed: mockMasterMedicine,
      });

      // Kiểm tra: Tồn kho trả về cho Client bắt buộc phải là 404, tuyệt đối không được là 3344
      expect(dto.stock).toBe(404);
      expect(dto.stock).not.toBe(3344);
      expect(dto.status).toBe('In Stock');
    });

    it('[Normal] Khi không có balanceStock nhưng có danh sách lô vật lý specificBranchInvs, tổng tồn phải tính từ các lô chi nhánh', () => {
      const mockBranchBatches = [
        { batchNo: 'BATCH-01', stock: 200, expDate: new Date('2027-01-01') },
        { batchNo: 'BATCH-02', stock: 204, expDate: new Date('2027-06-01') },
      ];

      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, [], {
        branchId: 'BR-001',
        balanceStock: undefined,
        specificBranchInvs: mockBranchBatches,
        dbMed: mockMasterMedicine,
      });

      // 200 + 204 = 404 hộp
      expect(dto.stock).toBe(404);
      expect(dto.stock).not.toBe(3344);
    });

    it('[Normal] Hạn sử dụng gần nhất của chi nhánh phải tính theo lô sớm nhất của chi nhánh (FEFO)', () => {
      const mockBranchBatches = [
        { batchNo: 'BATCH-LATE', stock: 100, expDate: new Date('2028-12-31') },
        { batchNo: 'BATCH-EARLY', stock: 50, expDate: new Date('2026-08-15') },
      ];

      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, [], {
        branchId: 'BR-001',
        balanceStock: 150,
        specificBranchInvs: mockBranchBatches,
        dbMed: mockMasterMedicine,
      });

      expect(dto.stock).toBe(150);
      expect(dto.expiry).toBe('2026-08-15');
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên & Ngưỡng an toàn
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên & Kho Tổng', () => {
    it('[Boundary] Tồn kho chi nhánh bằng 0 phải hiển thị đúng 0 hộp (Out of Stock), cấm fallback lấy tồn chuỗi 3344', () => {
      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, [], {
        branchId: 'BR-001',
        balanceStock: 0, // Chi nhánh này đã hết hàng
        specificBranchInvs: [],
        dbMed: mockMasterMedicine,
      });

      // Bắt buộc hiển thị 0 để người dùng thấy nhãn 'Hết hàng'
      expect(dto.stock).toBe(0);
      expect(dto.status).toBe('Out of Stock');
    });

    it('[Boundary] Tồn kho chi nhánh ở mức biên 1 hộp phải giữ nguyên 1 hộp (được Frontend nhận diện là sắp hết)', () => {
      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, [], {
        branchId: 'BR-001',
        balanceStock: 1,
        specificBranchInvs: [],
        dbMed: mockMasterMedicine,
      });

      expect(dto.stock).toBe(1);
      expect(dto.status).toBe('In Stock');
      expect(dto.stock <= dto.minStock).toBe(true);
    });

    it('[Boundary] Khi truy vấn cho Kho Tổng CENTRAL_WH, phải tính theo lô thuộc Kho Tổng', () => {
      const mockCentralBatches = [
        { batchNo: 'CENTRAL-01', stock: 2000, branchId: 'CENTRAL_WH', expDate: new Date('2027-10-10') },
      ];

      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, mockCentralBatches, {
        branchId: 'CENTRAL_WH',
        dbMed: mockMasterMedicine,
      });

      expect(dto.stock).toBe(2000);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & Chống rò rỉ dữ liệu
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường & Chặn rò rỉ dữ liệu toàn chuỗi', () => {
    it('[Abnormal] Số dư kho chi nhánh bị âm (do lỗi hệ thống) phải được bảo vệ về mức 0 (Fail-Safe)', () => {
      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, [], {
        branchId: 'BR-001',
        balanceStock: -15, // Dữ liệu dị thường
        specificBranchInvs: [],
        dbMed: mockMasterMedicine,
      });

      expect(dto.stock).toBe(0);
      expect(dto.status).toBe('Out of Stock');
    });

    it('[Abnormal] Cấm tuyệt đối rò rỉ tồn kho chuỗi 3344 khi người dùng chỉ định branchId rõ ràng', () => {
      // Khi có balanceStock xác định (kể cả 0), không bao giờ được chạm vào dbMed.stock
      const dto = MedicineMapper.toListItemDto(mockMasterMedicine, [], {
        branchId: 'BR-001',
        balanceStock: 0,
        dbMed: { ...mockMasterMedicine, stock: 3344 },
      });

      expect(dto.stock).toBe(0);
      expect(dto.stock).not.toBe(3344);
    });
  });
});
