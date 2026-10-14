/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { PayrollService } from './payroll.service';
import { Payroll, PayrollStatus } from './schemas/payroll.schema';
import { Attendance } from './schemas/attendance.schema';
import { User } from '../../auth-service/src/auth/user.schema';
import { StaffCertificate, CertificateStatus } from './schemas/staff-certificate.schema';
import { SalesOrder } from '../../inventory-service/src/sales/schemas/sales-order.schema';

describe('PayrollService (Unit & Security Tests)', () => {
  let service: PayrollService;

  const mockPayrollModel: any = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockAttendanceModel: any = {
    find: jest.fn(),
  };

  const mockUserModel: any = {
    find: jest.fn(),
  };

  const mockCertificateModel: any = {
    find: jest.fn(),
  };

  const mockSalesOrderModel: any = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: getModelToken(Payroll.name), useValue: mockPayrollModel },
        { provide: getModelToken(Attendance.name), useValue: mockAttendanceModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(StaffCertificate.name), useValue: mockCertificateModel },
        { provide: getModelToken(SalesOrder.name), useValue: mockSalesOrderModel },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  describe('T-07 & INV-04: Cross-branch IDOR / BOLA Prevention', () => {
    it('should reject calculation when manager branch does not match target branch', async () => {
      await expect(
        service.calculateMonthlyPayroll({
          branchId: 'BR-002',
          month: 10,
          year: 2026,
          requesterBranchId: 'BR-001',
          requesterRole: 'branch',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject viewing payroll detail when manager accesses another branch payroll', async () => {
      mockPayrollModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: 'pay-2', branchId: 'BR-002' }) }),
      });

      await expect(
        service.getPayrollDetail('pay-2', 'BR-001', 'branch'),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('Branch Autonomy & Approval Authorization (AGENTS.md Rule)', () => {
    it('should allow branch manager to directly approve payroll for their own branch', async () => {
      const mockPayrollDoc: any = {
        _id: 'pay-1',
        branchId: 'BR-001',
        status: PayrollStatus.DRAFT,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: 'pay-1', status: PayrollStatus.APPROVED }),
      };

      mockPayrollModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPayrollDoc),
      });

      const res = await service.approvePayroll('pay-1', '507f1f77bcf86cd799439011', 'branch', 'BR-001');
      expect(mockPayrollDoc.status).toBe(PayrollStatus.APPROVED);
      expect(res.status).toBe(PayrollStatus.APPROVED);
    });

    it('should reject branch manager when trying to approve payroll of another branch (IDOR)', async () => {
      const mockPayrollDoc: any = {
        _id: 'pay-2',
        branchId: 'BR-002',
        status: PayrollStatus.DRAFT,
      };

      mockPayrollModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPayrollDoc),
      });

      // Manager BR-001 cố duyệt bảng lương của BR-002
      await expect(
        service.approvePayroll('pay-2', '507f1f77bcf86cd799439011', 'branch', 'BR-001'),
      ).rejects.toThrow(RpcException);
    });

    it('should reject approval when requester role is unauthorized (e.g. pharmacist)', async () => {
      await expect(
        service.approvePayroll('pay-1', '507f1f77bcf86cd799439011', 'pharmacist'),
      ).rejects.toThrow(RpcException);
    });

    it('should allow director or admin to approve any branch payroll', async () => {
      const mockPayrollDoc: any = {
        _id: 'pay-1',
        branchId: 'BR-001',
        status: PayrollStatus.SUBMITTED,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: 'pay-1', status: PayrollStatus.APPROVED }),
      };

      mockPayrollModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPayrollDoc),
      });

      const res = await service.approvePayroll('pay-1', '507f1f77bcf86cd799439011', 'director');
      expect(mockPayrollDoc.status).toBe(PayrollStatus.APPROVED);
      expect(res.status).toBe(PayrollStatus.APPROVED);
    });
  });

  describe('T-09 & INV-03: Immutability of Approved Payroll', () => {
    it('should reject recalculation when payroll is already APPROVED', async () => {
      mockPayrollModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status: PayrollStatus.APPROVED }),
      });

      await expect(
        service.calculateMonthlyPayroll({
          branchId: 'BR-001',
          month: 10,
          year: 2026,
          requesterBranchId: 'BR-001',
          requesterRole: 'branch',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject manual adjustments when payroll is APPROVED', async () => {
      mockPayrollModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          branchId: 'BR-001',
          status: PayrollStatus.APPROVED,
        }),
      });

      await expect(
        service.adjustPayrollItem({
          payrollId: 'pay-1',
          employeeId: 'emp-1',
          manualAdjustment: 500000,
          requesterBranchId: 'BR-001',
          requesterRole: 'branch',
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('T-06: Comprehensive Pharmacy Payroll Formula Verification', () => {
    it('should correctly calculate salary including base, CCHN allowance, PIC allowance, meal and 1% POS commission', async () => {
      // 1. Existing payroll check -> null
      mockPayrollModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // 2. Employee: base 7.500.000, isBranchPIC: true
      const mockEmp = {
        _id: '507f1f77bcf86cd799439011',
        fullName: 'Dược sĩ Nguyễn Văn Test',
        role: 'pharmacist',
        baseSalary: 7500000,
        isBranchPIC: true,
      };

      mockUserModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue([mockEmp]) }),
      });

      // 3. Attendances: 26 ca đúng hạn
      const mockAttendances = Array.from({ length: 26 }, (_, i) => ({
        _id: `att-${i}`,
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        status: 'CHECKED_IN',
      }));

      mockAttendanceModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockAttendances) }),
      });

      // 4. Approved Certificate: CCHN Đại học phụ cấp 1.500.000
      mockCertificateModel.find.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue([
            { title: 'Chứng chỉ hành nghề Dược', monthlyAllowance: 1500000, status: CertificateStatus.DA_DUYET },
          ]),
        }),
      });

      // 5. Sales orders: Doanh số cá nhân 50.000.000 VNĐ -> Hoa hồng 1% = 500.000 VNĐ
      mockSalesOrderModel.find.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue([
            { totalAmount: 30000000, soldBy: mockEmp.fullName },
            { totalAmount: 20000000, soldBy: mockEmp.fullName },
          ]),
        }),
      });

      mockPayrollModel.findOneAndUpdate.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockImplementation(() => {
            return { success: true };
          }),
        }),
      });

      await service.calculateMonthlyPayroll({
        branchId: 'BR-001',
        month: 10,
        year: 2026,
        requesterBranchId: 'BR-001',
        requesterRole: 'branch',
      });

      expect(mockPayrollModel.findOneAndUpdate).toHaveBeenCalled();
      const saveCallArgs = mockPayrollModel.findOneAndUpdate.mock.calls[0][1].$set;
      const item = saveCallArgs.items[0];

      // Kỳ vọng công thức:
      // - Tiêu chuẩn 26 ca / 26 ca làm = 7.500.000 đ
      expect(item.standardSalary).toBe(7500000);
      // - Phụ cấp bằng cấp / CCHN = 1.500.000 đ
      expect(item.certificateAllowance).toBe(1500000);
      // - Phụ cấp Dược sĩ PTCM = 3.000.000 đ
      expect(item.picAllowance).toBe(3000000);
      // - Cơm trưa: 26 ca * 35.000 = 910.000 đ
      expect(item.mealAllowance).toBe(26 * 35000);
      // - Hoa hồng bán lẻ POS: 1% * 50.000.000 = 500.000 đ
      expect(item.commissionAmount).toBe(500000);
      // - Tổng Gross = 7.500.000 + 1.500.000 + 3.000.000 + 910.000 + 500.000 = 13.410.000 đ
      expect(item.grossSalary).toBe(7500000 + 1500000 + 3000000 + 910000 + 500000);
      expect(item.netSalary).toBe(item.grossSalary);
    });
  });
});
