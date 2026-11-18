import { MedicineMapper } from '../../../apps/inventory-service/src/medicine/medicine.mapper';
import { MedicineService } from '../../../apps/inventory-service/src/medicine/medicine.service';

/**
 * BỘ KIỂM THỬ ĐỒNG BỘ TỒN KHO & HẠN DÙNG GIỮA TỔNG QUAN KHO VÀ BIÊN BẢN KIỂM KÊ
 * Tuân thủ Test-Coupled Mandate (đầy đủ 3 nhóm giá trị chuẩn):
 * 1. [Normal Values]: Đồng bộ tồn kho & hạn dùng Kho Tổng (CENTRAL_WH) và Kho Chi Nhánh (BR-001).
 * 2. [Boundary Values]: Lô INIT-BATCH tồn 0 (chặn fallback med.stock cũ & ngày giả định 31/12/2026), chuẩn hóa mã chi nhánh BR-1 <-> BR-001, sắp xếp lô còn tồn lên trước.
 * 3. [Abnormal Values]: Trộn lẫn lô chi nhánh trong Kho Tổng, chi nhánh chưa có bản ghi tồn kho (cấm rò rỉ med.stock), syncStockAfterCheck chỉ cộng đúng kho mục tiêu.
 */
describe('InventoryCheck & Warehouse Stock Synchronization (Central vs Branch)', () => {
  const salonpasMaster = {
    _id: '6a21a9a84f7acd1b57259765',
    name: 'Cao dán Salonpas Hisamitsu giảm đau vai, đau lưng, đau cơ (2 gói x 10 miếng)',
    category: 'Miếng dán giảm đau',
    price: 315000,
    stock: 35, // Trường tồn kho cũ trên master document (dễ bị lệch sau xuất/chuyển kho)
    minStock: 50,
    unit: 'Hộp',
    registration_number: '893100105223',
  };

  /**
   * Tạo instance nhẹ của MedicineService với các Mongoose model giả lập phục vụ kiểm thử đơn vị
   */
  const createMockMedicineService = (overrides: Record<string, any> = {}) => {
    const mockBatchModel = overrides.batchModel || { find: jest.fn() };
    const mockBranchInvModel = overrides.branchInvModel || { find: jest.fn() };
    const mockMedicineModel = overrides.medicineModel || {
      find: jest.fn(),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    const mockBalanceModel = overrides.balanceModel || {
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };

    const service = Object.create(MedicineService.prototype);
    service.batchModel = mockBatchModel;
    service.branchInvModel = mockBranchInvModel;
    service.medicineModel = mockMedicineModel;
    service.balanceModel = mockBalanceModel;
    return { service, mockBatchModel, mockBranchInvModel, mockMedicineModel, mockBalanceModel };
  };

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('1. [Normal Values] Đồng bộ chính xác Kho Tổng & Kho Chi Nhánh', () => {
    it('[Normal] Kho Tổng (CENTRAL_WH) có lô ACTIVE còn tồn -> trả về tổng tồn lô Kho Tổng và hạn dùng sớm nhất thực tế', () => {
      const centralBatches = [
        { batchNo: 'LOT-A', stock: 20, expDate: new Date('2027-06-15'), status: 'ACTIVE', branchId: 'CENTRAL_WH' },
        { batchNo: 'LOT-B', stock: 15, expDate: new Date('2027-02-03'), status: 'ACTIVE', branchId: 'CENTRAL_WH' },
      ];

      const dto = MedicineMapper.toListItemDto(salonpasMaster, centralBatches, {
        branchId: 'CENTRAL_WH',
        dbMed: salonpasMaster,
      });

      expect(dto.stock).toBe(35);
      expect(dto.status).toBe('In Stock');
      expect(dto.expiry).toBe('2027-02-03');
    });

    it('[Normal] listInventoryCheckBatches(CENTRAL_WH) truy vấn collection batchModel và sắp xếp lô còn tồn + FEFO lên đầu', async () => {
      const batchRows = [
        { _id: 'b1', medicineId: salonpasMaster._id, batchNo: 'INIT-BATCH', stock: 0, expDate: new Date('2027-02-03'), status: 'ACTIVE' },
        { _id: 'b2', medicineId: salonpasMaster._id, batchNo: 'LOT-LATE', stock: 10, expDate: new Date('2028-01-01'), status: 'ACTIVE' },
        { _id: 'b3', medicineId: salonpasMaster._id, batchNo: 'LOT-FEFO', stock: 5, expDate: new Date('2027-05-01'), status: 'ACTIVE' },
      ];

      const batchFind = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(batchRows) }),
        }),
      });
      const medFind = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([salonpasMaster]) }),
          }),
        }),
      });

      const { service, mockBranchInvModel } = createMockMedicineService({
        batchModel: { find: batchFind },
        medicineModel: { find: medFind },
      });

      const result = await service.listInventoryCheckBatches('CENTRAL_WH');

      expect(batchFind).toHaveBeenCalledWith({
        branchId: { $in: ['CENTRAL_WH', null, ''] },
        status: { $ne: 'DISPOSED' },
      });
      expect(mockBranchInvModel.find).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      // Lô còn tồn cận hạn nhất (LOT-FEFO) lên đầu, tiếp đến LOT-LATE, cuối cùng lô tồn 0 (INIT-BATCH)
      expect(result[0].batches.map((b: any) => b.batchNo)).toEqual(['LOT-FEFO', 'LOT-LATE', 'INIT-BATCH']);
    });

    it('[Normal] listInventoryCheckBatches(BR-001) truy vấn đúng collection branchInvModel riêng của chi nhánh', async () => {
      const branchRows = [
        { _id: 'br1', medicineId: salonpasMaster._id, batchNo: 'BR-LOT-01', stock: 12, expDate: new Date('2027-08-01'), status: 'ACTIVE' },
      ];
      const branchInvFind = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(branchRows) }),
        }),
      });
      const medFind = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([salonpasMaster]) }),
          }),
        }),
      });

      const { service, mockBatchModel } = createMockMedicineService({
        branchInvModel: { find: branchInvFind },
        medicineModel: { find: medFind },
      });

      const result = await service.listInventoryCheckBatches('BR-001');

      expect(branchInvFind).toHaveBeenCalledWith({
        branchId: 'BR-001',
        status: { $ne: 'DISPOSED' },
      });
      expect(mockBatchModel.find).not.toHaveBeenCalled();
      expect(result[0].batches[0].stock).toBe(12);
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên (Lô tồn 0, chuẩn hóa mã chi nhánh)
  // =========================================================================
  describe('2. [Boundary Values] Chặn sai lệch lô tồn 0 & chuẩn hóa mã chi nhánh', () => {
    it('[Boundary] Kho Tổng chỉ có lô INIT-BATCH tồn 0 (HSD 3/2/2027) -> phải hiển thị 0 Hộp và HSD 2027-02-03, cấm fallback med.stock=35 hoặc 2026-12-31', () => {
      const depletedCentralBatch = [
        {
          batchNo: 'INIT-BATCH',
          stock: 0,
          expDate: new Date('2027-02-03T00:00:00.000Z'),
          status: 'ACTIVE',
          branchId: 'CENTRAL_WH',
        },
      ];

      const dto = MedicineMapper.toListItemDto(salonpasMaster, depletedCentralBatch, {
        branchId: 'CENTRAL_WH',
        dbMed: salonpasMaster,
      });

      // Đồng bộ tuyệt đối với màn Biên bản kiểm kê Kho Tổng GSP
      expect(dto.stock).toBe(0);
      expect(dto.status).toBe('Out of Stock');
      expect(dto.expiry).toBe('2027-02-03');
      expect(dto.expiry).not.toBe('2026-12-31');
    });

    it('[Boundary] Chuẩn hóa mã chi nhánh BR-1 sang cả BR-001 và BR-1 trong bộ lọc kiểm kê', () => {
      const { service } = createMockMedicineService();
      const filter = (service as any).inventoryCheckBranchFilter('BR-1');

      expect(filter).toEqual({
        branchId: { $in: ['BR-001', 'BR-1'] },
      });
    });

    it('[Boundary] Mã KHO_TONG được chuẩn hóa về nhóm lọc Kho Tổng CENTRAL_WH', () => {
      const { service } = createMockMedicineService();
      const filter = (service as any).inventoryCheckBranchFilter('KHO_TONG');

      expect(filter).toEqual({
        branchId: { $in: ['CENTRAL_WH', null, ''] },
      });
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Chống rò rỉ tồn kho giữa các kho & lọc sai phạm vi
  // =========================================================================
  describe('3. [Abnormal Values] Chặn rò rỉ tồn tổng & sai phạm vi đồng bộ sau kiểm kê', () => {
    it('[Abnormal] Khi chi nhánh BR-002 chưa có bản ghi balance/batch nào -> phải trả về 0, cấm rò rỉ med.stock=35 của toàn chuỗi', () => {
      const dto = MedicineMapper.toListItemDto(salonpasMaster, [], {
        branchId: 'BR-002',
        balanceStock: undefined,
        specificBranchInvs: [],
        dbMed: salonpasMaster,
      });

      expect(dto.stock).toBe(0);
      expect(dto.status).toBe('Out of Stock');
    });

    it('[Abnormal] Kho Tổng (CENTRAL_WH) bị truyền lẫn lô thuộc chi nhánh BR-001 -> phải loại bỏ lô chi nhánh khỏi tổng tồn Kho Tổng', () => {
      const mixedBatches = [
        { batchNo: 'INIT-BATCH', stock: 0, expDate: new Date('2027-02-03'), status: 'ACTIVE', branchId: 'CENTRAL_WH' },
        { batchNo: 'BRANCH-ONLY', stock: 500, expDate: new Date('2027-09-01'), status: 'ACTIVE', branchId: 'BR-001' },
      ];

      const dto = MedicineMapper.toListItemDto(salonpasMaster, mixedBatches, {
        branchId: 'CENTRAL_WH',
        dbMed: salonpasMaster,
      });

      expect(dto.stock).toBe(0);
      expect(dto.expiry).toBe('2027-02-03');
    });

    it('[Abnormal] syncStockAfterCheck(CENTRAL_WH) bắt buộc đính kèm bộ lọc branchId Kho Tổng để không cộng nhầm tồn chi nhánh', async () => {
      const batchFind = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([{ stock: 18 }]) }),
        }),
      });
      const updateExec = jest.fn().mockResolvedValue({});
      const medUpdateOne = jest.fn().mockReturnValue({ exec: updateExec });

      const { service } = createMockMedicineService({
        batchModel: { find: batchFind },
        medicineModel: { updateOne: medUpdateOne },
      });

      await (service as any).syncStockAfterCheck(salonpasMaster._id, 'CENTRAL_WH');

      expect(batchFind).toHaveBeenCalledWith({
        branchId: { $in: ['CENTRAL_WH', null, ''] },
        medicineId: salonpasMaster._id,
        status: 'ACTIVE',
        stock: { $gt: 0 },
      });
      expect(medUpdateOne).toHaveBeenCalledWith(
        { _id: salonpasMaster._id },
        { $set: { stock: 18, status: 'In Stock' } },
        {},
      );
    });
  });
});
