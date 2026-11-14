/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MedicineService } from '../../../apps/inventory-service/src/medicine/medicine.service';
import { Medicine } from '../../../apps/inventory-service/src/medicine/schemas/medicine.schema';
import { MedicineBatch } from '../../../apps/inventory-service/src/medicine/schemas/medicine-batch.schema';
import { MedicineLocation } from '../../../apps/inventory-service/src/medicine/schemas/medicine-location.schema';
import { BranchInventory } from '../../../apps/inventory-service/src/medicine/schemas/branch-inventory.schema';
import { BranchStockBalance } from '../../../apps/inventory-service/src/medicine/schemas/branch-stock-balance.schema';
import { InventoryCheck } from '../../../apps/inventory-service/src/medicine/schemas/inventory-check.schema';
import { InventoryTransaction } from '../../../apps/inventory-service/src/purchase/schemas/inventory-transaction.schema';
import { NationalPharmaService } from '../../../apps/inventory-service/src/national-pharma/national-pharma.service';

/**
 * =========================================================================
 * BỘ KIỂM THỬ THỐNG KÊ LÔ THUỐC THEO CHI NHÁNH (KAFKA RPC CHO USER-SERVICE)
 * Phục vụ bóc tách Database-per-Service
 * Đầy đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
 * =========================================================================
 */
describe('Kiểm thử Thống kê Lô thuốc Chi nhánh (getBatchStatsByBranch)', () => {
  let service: MedicineService;

  const mockBatchModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicineService,
        { provide: getModelToken(Medicine.name), useValue: {} },
        { provide: getModelToken(MedicineBatch.name), useValue: mockBatchModel },
        { provide: getModelToken(MedicineLocation.name), useValue: {} },
        { provide: getModelToken(BranchInventory.name), useValue: {} },
        { provide: getModelToken(BranchStockBalance.name), useValue: {} },
        { provide: getModelToken(InventoryCheck.name), useValue: {} },
        { provide: getModelToken(InventoryTransaction.name), useValue: {} },
        { provide: NationalPharmaService, useValue: { syncTransaction: jest.fn() } },
        { provide: 'KAFKA_SERVICE', useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<MedicineService>(MedicineService);
    jest.clearAllMocks();
  });

  describe('1. [Normal Values] Luồng tính toán chuẩn xác', () => {
    it('[Normal Values] TC-01: Tính đúng tổng tồn kho và số lô sắp hết hạn cho chi nhánh hợp lệ', async () => {
      mockBatchModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ total: 1250 }]),
      });
      mockBatchModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(4),
      });

      const res = await service.getBatchStatsByBranch('BR-001');

      expect(res).toBeDefined();
      expect(res.totalStock).toBe(1250);
      expect(res.expiringCount).toBe(4);
      expect(mockBatchModel.aggregate).toHaveBeenCalled();
      expect(mockBatchModel.countDocuments).toHaveBeenCalled();
    });
  });

  describe('2. [Boundary Values] Giá trị biên: Chi nhánh mới hoặc không có tồn kho', () => {
    it('[Boundary Values] TC-02: Chi nhánh mới tạo chưa có lô thuốc nào trong kho (stock = 0)', async () => {
      mockBatchModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([]),
      });
      mockBatchModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(0),
      });

      const res = await service.getBatchStatsByBranch('BR-NEW-099');

      expect(res).toBeDefined();
      expect(res.totalStock).toBe(0);
      expect(res.expiringCount).toBe(0);
    });
  });

  describe('3. [Abnormal Values] Xử lý ngoại lệ, mã chi nhánh rỗng hoặc lỗi truy vấn', () => {
    it('[Abnormal Values] TC-03: Trả về mặc định 0 khi branchCode rỗng hoặc undefined', async () => {
      const res = await service.getBatchStatsByBranch('');

      expect(res).toEqual({ totalStock: 0, expiringCount: 0 });
      expect(mockBatchModel.aggregate).not.toHaveBeenCalled();
    });

    it('[Abnormal Values] TC-04: Xử lý an toàn khi MongoDB gặp lỗi kết nối (không làm sập hệ thống)', async () => {
      mockBatchModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error('Mongo connection error')),
      });

      const res = await service.getBatchStatsByBranch('BR-001');

      expect(res).toEqual({ totalStock: 0, expiringCount: 0 });
    });
  });
});
