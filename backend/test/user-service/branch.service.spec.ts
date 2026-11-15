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
});
