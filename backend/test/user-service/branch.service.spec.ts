/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { BranchService } from '../../apps/user-service/src/branch.service';
import { Branch } from '../../apps/user-service/src/schemas/branch.schema';
import { User } from '../../apps/auth-service/src/auth/user.schema';
import { MedicineBatch } from '../../apps/inventory-service/src/medicine/schemas/medicine-batch.schema';

describe('BranchService', () => {
  let service: BranchService;

  const mockBranch = {
    _id: new Types.ObjectId(),
    branchCode: 'BR-001',
    name: 'Chi Nhánh Quận 1',
    latitude: 10.7769,
    longitude: 106.7009,
    checkInRadiusMeters: 200,
    address: '123 Nguyễn Huệ, Q.1',
  };

  const mockBranchModel = {
    updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockBranch]),
        }),
      }),
    }),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBranch),
      }),
    }),
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBranch),
      }),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBranch),
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBranch),
    }),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    }),
  };

  const mockUserModel = {
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(5),
    }),
  };

  const mockBatchModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ total: 100 }]),
    }),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(2),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: getModelToken(Branch.name), useValue: mockBranchModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(MedicineBatch.name), useValue: mockBatchModel },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
    jest.clearAllMocks();
  });

  describe('updateLocation', () => {
    it('ném lỗi RpcException khi tọa độ vĩ độ không hợp lệ (NaN hoặc vượt quá 90)', async () => {
      await expect(
        service.updateLocation('BR-001', {
          latitude: 95,
          longitude: 106.7009,
        }),
      ).rejects.toThrow(RpcException);

      await expect(
        service.updateLocation('BR-001', {
          latitude: NaN,
          longitude: 106.7009,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('ném lỗi RpcException khi tọa độ kinh độ không hợp lệ (vượt quá 180 hoặc null)', async () => {
      await expect(
        service.updateLocation('BR-001', {
          latitude: 10.77,
          longitude: 200,
        }),
      ).rejects.toThrow(RpcException);

      await expect(
        service.updateLocation('BR-001', {
          latitude: 10.77,
          longitude: null as any,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('ném lỗi RpcException khi bán kính điểm danh dưới 20m hoặc trên 5000m', async () => {
      await expect(
        service.updateLocation('BR-001', {
          latitude: 10.7769,
          longitude: 106.7009,
          checkInRadiusMeters: 10,
        }),
      ).rejects.toThrow(RpcException);

      await expect(
        service.updateLocation('BR-001', {
          latitude: 10.7769,
          longitude: 106.7009,
          checkInRadiusMeters: 6000,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('cập nhật thành công khi tọa độ và bán kính hợp lệ', async () => {
      mockBranchModel.findOneAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          ...mockBranch,
          latitude: 10.778,
          longitude: 106.702,
          checkInRadiusMeters: 300,
        }),
      });

      const res = await service.updateLocation('BR-001', {
        latitude: 10.778,
        longitude: 106.702,
        checkInRadiusMeters: 300,
        address: '456 Lê Lợi, Q.1',
      });

      expect(res).toBeDefined();
      expect(res.latitude).toBe(10.778);
      expect(res.longitude).toBe(106.702);
      expect(res.checkInRadiusMeters).toBe(300);
    });
  });

  describe('activateBranch', () => {
    // [Normal Values]
    it('[Normal Values] kích hoạt thành công chi nhánh khi đủ quản lý và GPP hợp lệ', async () => {
      const validBranch = {
        ...mockBranch,
        status: 'preparing',
        manager: 'DS. Mai',
        gppNumber: 'GPP-HN-2026-088',
        gppExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
      mockBranchModel.findOne.mockReturnValueOnce({ lean: () => ({ exec: jest.fn().mockResolvedValue(validBranch) }) });
      mockBranchModel.findByIdAndUpdate.mockReturnValueOnce({ lean: () => ({ exec: jest.fn().mockResolvedValue({ ...validBranch, status: 'active' }) }) });
      const res = await service.activateBranch('BR-001', 'Admin');
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('active');
    });

    // [Boundary Values]
    it('[Boundary Values] trả về thành công ngay nếu chi nhánh đã ở trạng thái active (idempotent)', async () => {
      const activeBranch = { ...mockBranch, status: 'active' };
      mockBranchModel.findOne.mockReturnValueOnce({ lean: () => ({ exec: jest.fn().mockResolvedValue(activeBranch) }) });
      const res = await service.activateBranch('BR-001');
      expect(res.success).toBe(true);
      expect(res.message).toContain('đã hoạt động');
    });

    // [Abnormal Values]
    it('[Abnormal Values] ném lỗi RpcException khi chi nhánh chưa có quản lý hoặc thiếu GPP', async () => {
      mockBranchModel.findOne.mockReturnValueOnce({ lean: () => ({ exec: jest.fn().mockResolvedValue({ ...mockBranch, status: 'preparing', manager: null }) }) });
      await expect(service.activateBranch('BR-001')).rejects.toThrow(RpcException);

      mockBranchModel.findOne.mockReturnValueOnce({ lean: () => ({ exec: jest.fn().mockResolvedValue({ ...mockBranch, status: 'preparing', manager: 'DS. Mai', gppNumber: null }) }) });
      await expect(service.activateBranch('BR-001')).rejects.toThrow(RpcException);

      mockBranchModel.findOne.mockReturnValueOnce({ lean: () => ({ exec: jest.fn().mockResolvedValue({
        ...mockBranch, status: 'preparing', manager: 'DS. Mai', gppNumber: 'GPP-01', gppExpiryDate: new Date(Date.now() - 86400000)
      }) }) });
      await expect(service.activateBranch('BR-001')).rejects.toThrow(RpcException);
    });
  });

  describe('findById', () => {
    it('tìm kiếm theo branchCode khi id không phải là ObjectId', async () => {
      const res = await service.findById('BR-001');
      expect(mockBranchModel.findOne).toHaveBeenCalledWith({ branchCode: 'BR-001' });
      expect(res).toEqual(mockBranch);
    });
  });

  describe('findAll - Database-per-Service Kafka RPC & Fallback', () => {
    it('[Normal Values] TC-01: Lấy danh sách chi nhánh và thống kê tồn kho qua Kafka RPC thành công', async () => {
      const mockInventoryClient = {
        send: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue(
            require('rxjs').of({ totalStock: 350, expiringCount: 12 })
          ),
        }),
        subscribeToResponseOf: jest.fn(),
        connect: jest.fn().mockResolvedValue(true),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          BranchService,
          { provide: getModelToken(Branch.name), useValue: mockBranchModel },
          { provide: getModelToken(User.name), useValue: mockUserModel },
          { provide: 'INVENTORY_SERVICE', useValue: mockInventoryClient },
        ],
      }).compile();

      const branchSvc = testModule.get<BranchService>(BranchService);
      const res = await branchSvc.findAll();

      expect(res).toBeDefined();
      expect(res.length).toBe(1);
      expect(res[0].stats.totalStock).toBe(350);
      expect(res[0].stats.expiring).toBe(12);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.batch.stats_by_branch', { branchCodes: ['BR-001'] });
    });

    it('[Normal Values] TC-01b: Batch RPC lấy đồng thời thống kê cho nhiều chi nhánh trong 1 thông điệp Kafka', async () => {
      const mockBranches = [
        { _id: '66a01234567890abcdef0001', branchCode: 'BR-001', branchName: 'Chi nhánh 1' },
        { _id: '66a01234567890abcdef0002', branchCode: 'BR-002', branchName: 'Chi nhánh 2' },
      ];
      const multiBranchModel = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockBranches),
            }),
          }),
        }),
      };
      const mockInventoryClient = {
        send: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue(
            require('rxjs').of({
              'BR-001': { totalStock: 350, expiringCount: 12 },
              'BR-002': { totalStock: 800, expiringCount: 5 },
            })
          ),
        }),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          BranchService,
          { provide: getModelToken(Branch.name), useValue: multiBranchModel },
          { provide: getModelToken(User.name), useValue: mockUserModel },
          { provide: 'INVENTORY_SERVICE', useValue: mockInventoryClient },
        ],
      }).compile();

      const branchSvc = testModule.get<BranchService>(BranchService);
      const res = await branchSvc.findAll();

      expect(res).toHaveLength(2);
      expect(res[0].stats.totalStock).toBe(350);
      expect(res[1].stats.totalStock).toBe(800);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.batch.stats_by_branch', {
        branchCodes: ['BR-001', 'BR-002'],
      });
    });

    it('[Boundary Values] TC-02: Chi nhánh có 0 tồn kho và 0 lô thuốc (Boundary: zero-stock branch)', async () => {
      const mockInventoryClient = {
        send: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue(
            require('rxjs').of({ totalStock: 0, expiringCount: 0 })
          ),
        }),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          BranchService,
          { provide: getModelToken(Branch.name), useValue: mockBranchModel },
          { provide: getModelToken(User.name), useValue: mockUserModel },
          { provide: 'INVENTORY_SERVICE', useValue: mockInventoryClient },
        ],
      }).compile();

      const branchSvc = testModule.get<BranchService>(BranchService);
      const res = await branchSvc.findAll();

      expect(res).toBeDefined();
      expect(res[0].stats.totalStock).toBe(0);
      expect(res[0].stats.expiring).toBe(0);
    });

    it('[Abnormal Values] TC-03: Xử lý an toàn khi Kafka RPC bị timeout hoặc ngoại lệ (Fallback 0)', async () => {
      const mockInventoryClient = {
        send: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue(
            require('rxjs').throwError(() => new Error('Kafka Connection Timeout'))
          ),
        }),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          BranchService,
          { provide: getModelToken(Branch.name), useValue: mockBranchModel },
          { provide: getModelToken(User.name), useValue: mockUserModel },
          { provide: 'INVENTORY_SERVICE', useValue: mockInventoryClient },
        ],
      }).compile();

      const branchSvc = testModule.get<BranchService>(BranchService);
      // Khi Kafka RPC lỗi, hàm findAll vẫn trả về kết quả an toàn không bị sập
      const res = await branchSvc.findAll();

      expect(res).toBeDefined();
      expect(res[0].stats.totalStock).toBe(0);
      expect(res[0].stats.expiring).toBe(0);
    });
  });
});
