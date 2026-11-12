// backend/apps/inventory-service/src/medicine/medicine-sync.spec.ts
/**
 * =========================================================================
 * KIỂM THỬ CUỘN VÔ TẬN DANH MỤC THUỐC (INFINITE SCROLL UNIT TEST)
 * Hệ thống Quản lý Chuỗi Nhà thuốc - WDP301 / SEP490
 * Tuân thủ nghiêm ngặt Test-Coupled Mandate & 3 nhóm giá trị chuẩn
 * =========================================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { MedicineService } from './medicine.service';
import { Medicine } from './schemas/medicine.schema';
import { MedicineBatch } from './schemas/medicine-batch.schema';
import { MedicineLocation } from './schemas/medicine-location.schema';
import { BranchInventory } from './schemas/branch-inventory.schema';
import { BranchStockBalance } from './schemas/branch-stock-balance.schema';
import { InventoryCheck } from './schemas/inventory-check.schema';
import { InventoryTransaction } from '../purchase/schemas/inventory-transaction.schema';
import { NationalPharmaService } from '../national-pharma/national-pharma.service';

describe('MedicineService - getMedicinesInfiniteScroll (Bài toán cuộn 2000+ sản phẩm cho Mobile)', () => {
  let service: MedicineService;
  let mockMedicineModel: any;
  let mockBatchModel: any;
  let mockLocationModel: any;
  let mockBranchInvModel: any;
  let mockBalanceModel: any;
  let mockCheckModel: any;
  let mockTxnModel: any;
  let mockNationalPharmaService: any;

  // Dữ liệu mẫu 2 bản ghi đại diện cho 2000+ sản phẩm trong hệ thống
  const sampleMedicines = [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'Panadol Extra Đỏ 500mg',
      barcode: '8935001234567',
      sku: 'MED-PANADOL-001',
      price: 25000,
      stock: 150,
      category: 'Hạ sốt & Giảm đau',
      image: 'https://cdn.pharmacy.vn/panadol.png',
      drug_classification: 'NON_PRESCRIPTION',
      prescription_status: 0,
      is_medicine: true,
      units: [
        { unitName: 'Hộp', exchangeValue: 1, price: 25000, isBaseUnit: true, barcode: '8935001234567' },
        { unitName: 'Vỉ', exchangeValue: 10, price: 2500, isBaseUnit: false, barcode: '8935001234568' },
      ],
      updatedAt: new Date('2026-11-10T08:00:00Z'),
    },
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Kháng sinh Augmentin 1g',
      barcode: '8935007654321',
      sku: 'MED-AUGMENTIN-002',
      price: 185000,
      stock: 60,
      category: 'Kháng sinh',
      image: 'https://cdn.pharmacy.vn/augmentin.png',
      drug_classification: 'PRESCRIPTION',
      prescription_status: 1,
      is_medicine: true,
      units: [
        { unitName: 'Hộp', exchangeValue: 1, price: 185000, isBaseUnit: true, barcode: '8935007654321' },
      ],
      updatedAt: new Date('2026-11-11T02:00:00Z'),
    },
  ];

  beforeEach(async () => {
    // Giả lập Query Chain của Mongoose (.find().select().sort().limit().lean().exec())
    mockMedicineModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                  exec: jest.fn().mockResolvedValue(sampleMedicines),
                }),
              }),
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(sampleMedicines),
              }),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(sampleMedicines.length),
      }),
      bulkWrite: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      }),
    };

    mockBatchModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { medicineId: '507f1f77bcf86cd799439011', stock: 80, branchId: 'BR-01' },
              { medicineId: '507f1f77bcf86cd799439012', stock: 35, branchId: 'BR-01' },
            ]),
          }),
        }),
      }),
    };

    const emptyModelMock = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      updateMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      }),
    };

    mockLocationModel = emptyModelMock;
    mockBranchInvModel = emptyModelMock;
    mockBalanceModel = emptyModelMock;
    mockCheckModel = emptyModelMock;
    mockTxnModel = emptyModelMock;

    mockNationalPharmaService = {
      syncSingleMedicine: jest.fn().mockResolvedValue(true),
    };

    // Vô hiệu hóa onModuleInit trong unit test để tránh chạy background job thực tế
    jest.spyOn(MedicineService.prototype, 'onModuleInit').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicineService,
        { provide: getModelToken(Medicine.name), useValue: mockMedicineModel },
        { provide: getModelToken(MedicineBatch.name), useValue: mockBatchModel },
        { provide: getModelToken(MedicineLocation.name), useValue: mockLocationModel },
        { provide: getModelToken(BranchInventory.name), useValue: mockBranchInvModel },
        { provide: getModelToken(BranchStockBalance.name), useValue: mockBalanceModel },
        { provide: getModelToken(InventoryCheck.name), useValue: mockCheckModel },
        { provide: getModelToken(InventoryTransaction.name), useValue: mockTxnModel },
        { provide: NationalPharmaService, useValue: mockNationalPharmaService },
      ],
    }).compile();

    service = module.get<MedicineService>(MedicineService);
  });

  // =========================================================================
  // 1. NHÓM GIÁ TRỊ CHUẨN [Normal Values]: Cuộn trang 1, tính cursor và tồn kho
  // =========================================================================
  describe('[Normal Values] - Cuộn vô tận danh mục thuốc thành công', () => {
    it('N-01: Nên tải trang đầu tiên với pageSize mặc định 20 và trả về nextCursor', async () => {
      const result = await service.getMedicinesInfiniteScroll();

      expect(result).toBeDefined();
      expect(result.data.length).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.serverTime).toBeDefined();

      const item1 = result.data[0];
      expect(item1.id).toBe('507f1f77bcf86cd799439011');
      expect(item1.name).toBe('Panadol Extra Đỏ 500mg');
      expect(item1.barcode).toBe('8935001234567');
      expect(item1.stock).toBe(150);
      expect(item1.units.length).toBe(2);
      expect((item1 as any).thong_tin_chi_tiet).toBeUndefined();
    });

    it('N-02: Nên hỗ trợ phân trang Cursor-based (Keyset Pagination) qua cursor hợp lệ', async () => {
      const cursorId = '507f1f77bcf86cd799439011';
      const result = await service.getMedicinesInfiniteScroll({ cursor: cursorId });

      expect(result).toBeDefined();
      expect(mockMedicineModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Object),
        })
      );
    });

    it('N-03: Nên tính toán lại tồn kho chi nhánh khi truyền branchId cụ thể', async () => {
      const result = await service.getMedicinesInfiniteScroll({ branchId: 'BR-01' });

      expect(result).toBeDefined();
      const med1 = result.data.find((m) => m.id === '507f1f77bcf86cd799439011');
      expect(med1?.stock).toBe(80);
      const med2 = result.data.find((m) => m.id === '507f1f77bcf86cd799439012');
      expect(med2?.stock).toBe(35);
    });
  });

  // =========================================================================
  // 2. NHÓM GIÁ TRỊ BIÊN [Boundary Values]: Giới hạn tối thiểu, tối đa, danh mục rỗng
  // =========================================================================
  describe('[Boundary Values] - Xử lý các giá trị biên', () => {
    it('B-01: Giới hạn limit nhỏ hơn 1 hoặc bằng 0 sẽ tự động ép về mức mặc định 20', async () => {
      await service.getMedicinesInfiniteScroll({ limit: 0 });
      expect(mockMedicineModel.find().select().sort().limit).toHaveBeenCalledWith(20);
    });

    it('B-02: Giới hạn limit vượt quá 100 sẽ bị chặn trần ở mức 100 để bảo vệ RAM Mobile', async () => {
      await service.getMedicinesInfiniteScroll({ limit: 99999 });
      expect(mockMedicineModel.find().select().sort().limit).toHaveBeenCalledWith(100);
    });

    it('B-03: Trả về hasMore = false và nextCursor = null khi đến trang cuối rỗng', async () => {
      mockMedicineModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await service.getMedicinesInfiniteScroll();
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  // =========================================================================
  // 3. NHÓM GIÁ TRỊ DỊ THƯỜNG [Abnormal Values]: Ngoại lệ, dữ liệu lỗi, DB gián đoạn
  // =========================================================================
  describe('[Abnormal Values] - Xử lý dữ liệu dị thường & ngoại lệ hệ thống', () => {
    it('A-01: Chuỗi cursor không phải ObjectId hợp lệ sẽ bỏ qua và không làm sập ứng dụng', async () => {
      const result = await service.getMedicinesInfiniteScroll({ cursor: 'cursor-khong-hop-le' });
      expect(result).toBeDefined();
      expect(mockMedicineModel.find).toHaveBeenCalledWith({});
    });

    it('A-02: Bắt và bọc lỗi RpcException an toàn khi Mongoose Database gặp sự cố', async () => {
      mockMedicineModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockRejectedValue(new Error('MongoDB connection timeout')),
              }),
            }),
          }),
        }),
      });

      await expect(service.getMedicinesInfiniteScroll()).rejects.toThrow(RpcException);
    });
  });
});
