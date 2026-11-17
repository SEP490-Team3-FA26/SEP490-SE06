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
    createEmployee: jest.fn(),
    updateEmployee: jest.fn(),
    getEmployeeById: jest.fn(),
  };
  const mockBranchService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
  };

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

    it('Tạo chi nhánh mới và cấp tài khoản Quản lý mới thành công', async () => {
      const branchPayload = {
        name: 'ABC Pharmacy - CN8',
        address: '123 Đường ABC, Hà Nội',
        newManager: {
          fullName: 'Nguyễn Văn Quản Lý',
          email: 'manager.cn8@abcpharmacy.vn',
          password: 'Password123',
          phone: '0988776655',
        },
      };

      const mockCreatedBranch = {
        _id: 'branch-8',
        branchCode: 'BR-008',
        name: 'ABC Pharmacy - CN8',
        address: '123 Đường ABC, Hà Nội',
        toObject: () => ({
          _id: 'branch-8',
          branchCode: 'BR-008',
          name: 'ABC Pharmacy - CN8',
        }),
      };
      mockBranchService.create.mockResolvedValue(mockCreatedBranch);

      const mockCreatedUser = {
        _id: 'user-manager-8',
        fullName: 'Nguyễn Văn Quản Lý',
        email: 'manager.cn8@abcpharmacy.vn',
        phone: '0988776655',
        role: 'branch',
        branchId: 'BR-008',
      };
      mockUserService.createEmployee.mockResolvedValue(mockCreatedUser);
      mockBranchService.update.mockResolvedValue({
        ...mockCreatedBranch,
        managerId: 'user-manager-8',
        manager: 'Nguyễn Văn Quản Lý',
      });

      const res: any = await controller.handleCreateBranch(branchPayload);
      expect(mockBranchService.create).toHaveBeenCalled();
      expect(mockUserService.createEmployee).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn Quản Lý',
        email: 'manager.cn8@abcpharmacy.vn',
        password: 'Password123',
        phone: '0988776655',
        role: 'branch',
        branchId: 'BR-008',
      });
      expect(res.newManagerAccount).toBeDefined();
      expect(res.newManagerAccount.email).toBe('manager.cn8@abcpharmacy.vn');
      expect(res.newManagerAccount.password).toBe('Password123');
    });

    it('Tạo chi nhánh mới với Quản lý có sẵn thành công', async () => {
      const branchPayload = {
        name: 'ABC Pharmacy - CN9',
        address: '456 Đường XYZ',
        managerId: 'existing-manager-id',
      };
      mockUserService.getEmployeeById.mockResolvedValue({
        _id: 'existing-manager-id',
        fullName: 'Trần Văn Quản Lý',
        role: 'branch',
        phone: '0912345678',
      });
      const mockCreatedBranch = {
        _id: 'branch-9',
        branchCode: 'BR-009',
        name: 'ABC Pharmacy - CN9',
      };
      mockBranchService.create.mockResolvedValue(mockCreatedBranch);
      mockUserService.updateEmployee.mockResolvedValue({ success: true });
      mockBranchService.update.mockResolvedValue({ ...mockCreatedBranch, managerId: 'existing-manager-id' });

      const res: any = await controller.handleCreateBranch(branchPayload);
      expect(mockUserService.updateEmployee).toHaveBeenCalledWith('existing-manager-id', {
        branchId: 'BR-009',
        role: 'branch',
      });
      expect(res.branchCode).toBe('BR-009');
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

    it('Tạo chi nhánh mới với Quản lý mới không cung cấp mật khẩu thì tự động đặt mặc định 123456', async () => {
      const branchPayload = {
        name: 'ABC Pharmacy - CN10',
        address: '789 Đường KLM',
        newManager: {
          fullName: 'Lê Quản Lý',
          email: 'manager.cn10@abcpharmacy.vn',
        },
      };
      const mockCreatedBranch = {
        _id: 'branch-10',
        branchCode: 'BR-010',
        name: 'ABC Pharmacy - CN10',
      };
      mockBranchService.create.mockResolvedValue(mockCreatedBranch);
      mockUserService.createEmployee.mockResolvedValue({
        _id: 'user-manager-10',
        fullName: 'Lê Quản Lý',
        email: 'manager.cn10@abcpharmacy.vn',
        role: 'branch',
        branchId: 'BR-010',
      });
      mockBranchService.update.mockResolvedValue({ ...mockCreatedBranch, managerId: 'user-manager-10' });

      const res: any = await controller.handleCreateBranch(branchPayload);
      expect(mockUserService.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({ password: '123456' }),
      );
      expect(res.newManagerAccount.password).toBe('123456');
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

    it('Ném lỗi RpcException khi tạo Quản lý mới thiếu email đăng nhập', async () => {
      const invalidPayload = {
        name: 'ABC Pharmacy - Fail',
        address: '123 Fake St',
        newManager: {
          fullName: 'No Email User',
          email: '',
        },
      };

      await expect(controller.handleCreateBranch(invalidPayload)).rejects.toMatchObject({
        error: expect.objectContaining({
          statusCode: 400,
          message: 'Vui lòng cung cấp email đăng nhập cho Quản lý chi nhánh mới',
        }),
      });
    });

    it('Rollback và xóa chi nhánh khi tạo tài khoản Quản lý mới bị trùng email', async () => {
      const branchPayload = {
        name: 'ABC Pharmacy - Rollback',
        address: '123 Fake St',
        newManager: {
          fullName: 'Trùng Email',
          email: 'duplicate@abcpharmacy.vn',
        },
      };
      mockBranchService.create.mockResolvedValue({
        _id: 'branch-to-rollback',
        branchCode: 'BR-999',
      });
      mockUserService.createEmployee.mockResolvedValue({
        error: true,
        statusCode: 409,
        message: 'Email đã tồn tại',
      });
      mockBranchService.delete.mockResolvedValue(true);

      await expect(controller.handleCreateBranch(branchPayload)).rejects.toMatchObject({
        error: expect.objectContaining({
          statusCode: 409,
          message: 'Email đã tồn tại',
        }),
      });
      expect(mockBranchService.delete).toHaveBeenCalledWith('branch-to-rollback');
    });

    it('Ném lỗi RpcException khi gán managerId không tồn tại', async () => {
      mockUserService.getEmployeeById.mockResolvedValue(null);

      await expect(
        controller.handleCreateBranch({
          name: 'ABC Pharmacy - Not Found',
          address: '123 Fake St',
          managerId: 'non-existent-id',
        }),
      ).rejects.toMatchObject({
        error: expect.objectContaining({
          statusCode: 404,
          message: 'Tài khoản quản lý ID non-existent-id không tồn tại',
        }),
      });
    });
  });
});
