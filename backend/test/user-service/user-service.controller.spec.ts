/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UserServiceController } from '../../apps/user-service/src/user-service.controller';
import { UserService } from '../../apps/user-service/src/user-service.service';
import { BranchService } from '../../apps/user-service/src/branch.service';
import { HrService } from '../../apps/user-service/src/hr.service';

import { CertificateService } from '../../apps/user-service/src/certificate.service';
import { AttendanceService } from '../../apps/user-service/src/attendance.service';
import { PayrollService } from '../../apps/user-service/src/payroll.service';
import { ShiftHandoverService } from '../../apps/user-service/src/shift-handover.service';
import { EmailMarketingService } from '../../apps/user-service/src/email-marketing.service';

describe('UserServiceController', () => {
  let controller: UserServiceController;
  let userService: UserService;

  const mockUserService = {
    getExportJobStatus: jest.fn(),
    getClinicalProfileByUserId: jest.fn(),
    lookupLoyaltyByPhone: jest.fn(),
    updateClinicalProfile: jest.fn(),
  };
  const mockBranchService = {};

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserServiceController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: BranchService, useValue: mockBranchService },
        { provide: HrService, useValue: {} },
        { provide: CertificateService, useValue: {} },
        { provide: AttendanceService, useValue: {} },
        { provide: PayrollService, useValue: {} },
        { provide: ShiftHandoverService, useValue: {} },
        { provide: EmailMarketingService, useValue: {} },
      ],
    }).compile();

    controller = app.get<UserServiceController>(UserServiceController);
    userService = app.get<UserService>(UserService);
  });

  describe('[Normal Values]', () => {
    it('should call getExportJobStatus on service', async () => {
      const jobId = 'test-job';
      const mockStatus: any = { id: jobId, status: 'COMPLETED' };
      mockUserService.getExportJobStatus.mockResolvedValue(mockStatus);

      const result = await controller.handleExportAuditLogsStatus({ jobId });
      expect(userService.getExportJobStatus).toHaveBeenCalledWith(jobId);
      expect(result).toEqual(mockStatus);
    });

    it('[UC-106] Lấy hồ sơ bệnh án thành công theo userId', async () => {
      const mockProfile = {
        userId: 'user-123',
        fullName: 'Nguyễn Văn A',
        bloodType: 'O+',
        allergies: ['Penicillin'],
        chronicConditions: ['Tăng huyết áp'],
        hasCompletedHealthOnboarding: true,
      };
      mockUserService.getClinicalProfileByUserId.mockResolvedValue(mockProfile);

      const result = await controller.handleGetClinicalProfile({ userId: 'user-123' });
      expect(userService.getClinicalProfileByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockProfile);
    });

    it('[UC-106] Cập nhật hồ sơ bệnh án thành công cho khách hàng', async () => {
      const updateData = {
        userId: 'user-123',
        allergies: ['Penicillin', 'Cephalosporin'],
        chronicConditions: ['Đái tháo đường'],
        bloodType: 'A+',
        hasCompletedHealthOnboarding: true,
      };
      const mockRes = { success: true, ...updateData };
      mockUserService.updateClinicalProfile.mockResolvedValue(mockRes);

      const result = await controller.handleUpdateClinicalProfile(updateData);
      expect(userService.updateClinicalProfile).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(mockRes);
    });
  });

  describe('[Boundary Values]', () => {
    it('should handle getExportJobStatus with empty jobId string', async () => {
      const jobId = '';
      const mockStatus: any = { id: '', status: 'FAILED' };
      mockUserService.getExportJobStatus.mockResolvedValue(mockStatus);

      const result = await controller.handleExportAuditLogsStatus({ jobId });
      expect(userService.getExportJobStatus).toHaveBeenCalledWith(jobId);
      expect(result).toEqual(mockStatus);
    });

    it('[UC-106] Lấy hồ sơ khi phone rỗng thì chuyển sang lookup với chuỗi rỗng', async () => {
      mockUserService.lookupLoyaltyByPhone.mockResolvedValue(null);

      const result = await controller.handleGetClinicalProfile({});
      expect(userService.lookupLoyaltyByPhone).toHaveBeenCalledWith('');
      expect(result).toBeNull();
    });

    it('[UC-106] Cập nhật hồ sơ với danh sách dị ứng rỗng (khách hàng không có dị ứng)', async () => {
      const updateData = {
        userId: 'user-empty',
        allergies: [],
        chronicConditions: [],
        hasCompletedHealthOnboarding: true,
      };
      mockUserService.updateClinicalProfile.mockResolvedValue({ success: true, ...updateData });

      const result = await controller.handleUpdateClinicalProfile(updateData);
      expect(userService.updateClinicalProfile).toHaveBeenCalledWith(updateData);
      expect(result).toEqual({ success: true, ...updateData });
    });
  });

  describe('[Abnormal Values]', () => {
    it('should handle service rejection when getExportJobStatus throws', async () => {
      mockUserService.getExportJobStatus.mockRejectedValue(new Error('Job not found'));

      await expect(controller.handleExportAuditLogsStatus({ jobId: 'invalid-id' })).rejects.toThrow('Job not found');
    });

    it('[UC-106] Xử lý ngoại lệ khi service lấy hồ sơ bệnh án thất bại', async () => {
      mockUserService.getClinicalProfileByUserId.mockRejectedValue(new Error('User not found'));

      await expect(controller.handleGetClinicalProfile({ userId: 'invalid-user' })).rejects.toThrow('User not found');
    });

    it('[UC-106] Xử lý ngoại lệ khi cập nhật hồ sơ bệnh án bị lỗi cơ sở dữ liệu', async () => {
      mockUserService.updateClinicalProfile.mockRejectedValue(new Error('Database write error'));

      await expect(controller.handleUpdateClinicalProfile({ userId: 'user-err' })).rejects.toThrow('Database write error');
    });
  });
});
