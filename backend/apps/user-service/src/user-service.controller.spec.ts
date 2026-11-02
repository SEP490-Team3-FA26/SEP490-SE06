/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UserServiceController } from './user-service.controller';
import { UserService } from './user-service.service';
import { BranchService } from './branch.service';
import { HrService } from './hr.service';

import { CertificateService } from './certificate.service';
import { AttendanceService } from './attendance.service';
import { PayrollService } from './payroll.service';
import { ShiftHandoverService } from './shift-handover.service';
import { EmailMarketingService } from './email-marketing.service';

describe('UserServiceController', () => {
  let controller: UserServiceController;
  let userService: UserService;

  const mockUserService = {
    getExportJobStatus: jest.fn(),
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
  });

  describe('[Abnormal Values]', () => {
    it('should handle service rejection when getExportJobStatus throws', async () => {
      mockUserService.getExportJobStatus.mockRejectedValue(new Error('Job not found'));

      await expect(controller.handleExportAuditLogsStatus({ jobId: 'invalid-id' })).rejects.toThrow('Job not found');
    });
  });
});
