/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { BranchService } from './branch.service';
import { Branch } from './schemas/branch.schema';
import { User } from '../../auth-service/src/auth/user.schema';
import { MedicineBatch } from '../../inventory-service/src/medicine/schemas/medicine-batch.schema';

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

  describe('findById', () => {
    it('tìm kiếm theo branchCode khi id không phải là ObjectId', async () => {
      const res = await service.findById('BR-001');
      expect(mockBranchModel.findOne).toHaveBeenCalledWith({ branchCode: 'BR-001' });
      expect(res).toEqual(mockBranch);
    });
  });
});
