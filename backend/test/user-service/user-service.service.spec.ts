/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../apps/user-service/src/user-service.service';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';

describe('UserService - getExportJobStatus', () => {
  let service: UserService;

  const mockModel = {};
  const mockKafkaClient = {
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken('User'), useValue: mockModel },
        { provide: getModelToken('Cart'), useValue: mockModel },
        { provide: getModelToken('Wishlist'), useValue: mockModel },
        { provide: getModelToken('Medicine'), useValue: mockModel },
        { provide: getModelToken('AuditLog'), useValue: mockModel },
        { provide: getModelToken('Branch'), useValue: mockModel },
        { provide: getModelToken('BranchFeedback'), useValue: mockModel },
        { provide: getModelToken('CustomerSegment'), useValue: mockModel },
        { provide: getModelToken('StaffTransferRequest'), useValue: mockModel },
        { provide: getModelToken('StaffNotification'), useValue: mockModel },
        { provide: getModelToken('WorkSchedule'), useValue: mockModel },
        { provide: getModelToken('ShiftSwapRequest'), useValue: mockModel },
        { provide: getModelToken('LeaveRequest'), useValue: mockModel },
        { provide: getConnectionToken(), useValue: {} },
        { provide: 'INVENTORY_SERVICE', useValue: mockKafkaClient },
        { provide: 'AUTH_SERVICE', useValue: mockKafkaClient },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should throw RpcException if job is not found', async () => {
    await expect(service.getExportJobStatus('invalid-id')).rejects.toThrow(RpcException);
  });

  it('should return job if found', async () => {
    const jobId = 'test-id';
    const jobData: any = {
      id: jobId,
      status: 'COMPLETED',
      filename: 'test.csv.gz',
      createdAt: new Date(),
    };

    (service as any).exportJobs.set(jobId, jobData);

    const result = await service.getExportJobStatus(jobId);
    expect(result).toEqual(jobData);
  });

  // =========================================================================
  // UC-106: Clinical Profile Unit Tests
  // =========================================================================
  describe('UserService - UC-106 Clinical Profile Management', () => {
    const mockUserDoc = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Trần Hồng Phước',
      phone: '0903333444',
      email: 'phuoc@example.com',
      points: 150,
      accumulatedPoints: 500,
      allergies: ['Penicillin'],
      allergicMedicines: ['Augmentin'],
      allergicIngredients: ['Amoxicillin'],
      chronicConditions: ['Tăng huyết áp'],
      bloodType: 'O+',
      medicalNotes: 'Tiền sử dị ứng kháng sinh',
      hasCompletedHealthOnboarding: true,
      save: jest.fn().mockResolvedValue(true),
    };

    describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
      it('Nên lấy hồ sơ bệnh án thành công theo userId', async () => {
        (mockModel as any).findById = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUserDoc),
        });

        const profile: any = await service.getClinicalProfileByUserId('507f1f77bcf86cd799439011');
        expect(profile.userId).toBe('507f1f77bcf86cd799439011');
        expect(profile.fullName).toBe('Trần Hồng Phước');
        expect(profile.allergies).toContain('Penicillin');
        expect(profile.allergicMedicines).toContain('Augmentin');
        expect(profile.hasCompletedHealthOnboarding).toBe(true);
      });

      it('Nên cập nhật thành công hồ sơ bệnh án qua userId', async () => {
        (mockModel as any).findById = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockUserDoc }),
        });

        const updateData = {
          userId: '507f1f77bcf86cd799439011',
          allergies: ['Penicillin', 'Cephalosporin'],
          chronicConditions: ['Viêm loét dạ dày'],
          bloodType: 'A+',
        };

        const res: any = await service.updateClinicalProfile(updateData);
        expect(res.userId).toBe('507f1f77bcf86cd799439011');
        expect(res.allergies).toContain('Cephalosporin');
        expect(res.bloodType).toBe('A+');
        expect(res.hasCompletedHealthOnboarding).toBe(true);
      });
    });

    describe('[Boundary Values] Giá trị biên & Mảng rỗng', () => {
      it('Nên cập nhật thành công hồ sơ bệnh án với mảng dị ứng rỗng', async () => {
        (mockModel as any).findById = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockUserDoc }),
        });

        const res: any = await service.updateClinicalProfile({
          userId: '507f1f77bcf86cd799439011',
          allergies: [],
          allergicMedicines: [],
          allergicIngredients: [],
          chronicConditions: [],
          hasCompletedHealthOnboarding: true,
        });

        expect(res.allergies).toEqual([]);
        expect(res.hasCompletedHealthOnboarding).toBe(true);
      });
    });

    describe('[Abnormal Values] Dữ liệu dị thường & Người dùng không tồn tại', () => {
      it('Nên trả về lỗi 404 khi userId không tìm thấy trong database', async () => {
        (mockModel as any).findById = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        const res: any = await service.getClinicalProfileByUserId('non-existent-user');
        expect(res.error).toBe(true);
        expect(res.statusCode).toBe(404);
        expect(res.message).toContain('Không tìm thấy hồ sơ người dùng');
      });

      it('Nên trả về lỗi 404 khi cập nhật hồ sơ cho người dùng không tồn tại', async () => {
        (mockModel as any).findById = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        const res: any = await service.updateClinicalProfile({
          userId: 'non-existent-user',
          allergies: ['Paracetamol'],
        });

        expect(res.error).toBe(true);
        expect(res.statusCode).toBe(404);
      });
    });
  });
});
