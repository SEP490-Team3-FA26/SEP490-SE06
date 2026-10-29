/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { ShiftHandoverService } from './shift-handover.service';
import { ShiftHandover, ShiftHandoverStatus } from './schemas/shift-handover.schema';
import { Attendance, AttendanceStatus } from './schemas/attendance.schema';
import { WorkShift } from './schemas/work-shift.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { User } from '../../auth-service/src/auth/user.schema';
import { Medicine } from '../../inventory-service/src/medicine/schemas/medicine.schema';

describe('ShiftHandoverService (Unit & Security Tests)', () => {
  let service: ShiftHandoverService;

  const mockHandoverModel: any = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockAttendanceModel: any = {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockWorkShiftModel: any = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  const mockWorkScheduleModel: any = {
    find: jest.fn(),
  };

  const mockUserModel: any = {
    findById: jest.fn(),
  };

  const mockMedicineModel: any = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftHandoverService,
        { provide: getModelToken(ShiftHandover.name), useValue: mockHandoverModel },
        { provide: getModelToken(Attendance.name), useValue: mockAttendanceModel },
        { provide: getModelToken(WorkShift.name), useValue: mockWorkShiftModel },
        { provide: getModelToken(WorkSchedule.name), useValue: mockWorkScheduleModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Medicine.name), useValue: mockMedicineModel },
      ],
    }).compile();

    service = module.get<ShiftHandoverService>(ShiftHandoverService);
  });

  describe('T-SHO-01 & T-SHO-02: Chốt két tiền mặt & Bắt buộc giải trình chênh lệch', () => {
    const employeeId = new Types.ObjectId().toString();
    const branchId = 'BR-001';

    it('T-SHO-02: should throw RpcException if cash discrepancy != 0 and discrepancyReason is missing or under 10 chars (INV-SHO-03)', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: employeeId, fullName: 'Dược Sĩ A', role: 'pharmacist', branchId }) }),
      });

      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            status: AttendanceStatus.CHECKED_IN,
            save: jest.fn().mockResolvedValue(true),
          }),
        }),
      });

      // Opening float = 1.000.000, Cash Sales = 2.000.000 -> Expected = 3.000.000
      // Actual = 2.800.000 -> Lệch -200.000 nhưng lý do chỉ có 9 ký tự ('lech tien')
      await expect(
        service.submitHandover({
          employeeId,
          branchId,
          shiftId: 'CA_SANG',
          shiftName: 'Ca sáng',
          openingFloat: 1000000,
          systemCashSales: 2000000,
          systemDigitalSales: 500000,
          systemOrderCount: 15,
          actualCashAmount: 2800000,
          discrepancyReason: 'lech tien', // 9 ký tự < 10 ký tự
        }),
      ).rejects.toThrow(RpcException);
    });

    it('T-SHO-01: should succeed when cash is balanced or reason is properly provided', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: employeeId, fullName: 'Dược Sĩ A', role: 'pharmacist', branchId }) }),
      });

      const mockAttendance = {
        _id: new Types.ObjectId(),
        status: AttendanceStatus.CHECKED_IN,
        isHandoverSubmitted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({ exec: jest.fn().mockResolvedValue(mockAttendance) }),
      });

      mockHandoverModel.findOne.mockResolvedValue(null);

      // Constructor mock
      function MockHandoverDoc(this: any, data: any) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue(this);
      }
      (MockHandoverDoc as any).findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      (service as any).handoverModel = MockHandoverDoc as any;

      const result = await service.submitHandover({
        employeeId,
        branchId,
        shiftId: 'CA_SANG',
        shiftName: 'Ca sáng',
        openingFloat: 1000000,
        systemCashSales: 2000000,
        systemDigitalSales: 500000,
        systemOrderCount: 15,
        actualCashAmount: 3000000, // Cân bằng 100%
      });

      expect(result.success).toBe(true);
      expect(mockAttendance.isHandoverSubmitted).toBe(true);
      expect(mockAttendance.save).toHaveBeenCalled();
    });

    it('T-SHO-03: should succeed without discrepancyReason when cash is surplus (positive discrepancy)', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: employeeId, fullName: 'Dược Sĩ A', role: 'pharmacist', branchId }) }),
      });

      const mockAttendance = {
        _id: new Types.ObjectId(),
        status: AttendanceStatus.CHECKED_IN,
        isHandoverSubmitted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({ exec: jest.fn().mockResolvedValue(mockAttendance) }),
      });

      function MockHandoverDoc(this: any, data: any) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue(this);
      }
      (MockHandoverDoc as any).findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      (service as any).handoverModel = MockHandoverDoc as any;

      // Expected = 3.000.000, Actual = 3.050.000 (Dư 50.000đ nhưng không cần giải trình)
      const result = await service.submitHandover({
        employeeId,
        branchId,
        shiftId: 'CA_SANG',
        shiftName: 'Ca sáng',
        openingFloat: 1000000,
        systemCashSales: 2000000,
        systemDigitalSales: 500000,
        systemOrderCount: 15,
        actualCashAmount: 3050000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('T-SHO-04 & T-SHO-05: Bảo mật phân quyền tiếp nhận ca (Anti-Spoofing & Anti-IDOR)', () => {
    const handoverId = new Types.ObjectId().toString();
    const pharmacistA = new Types.ObjectId().toString();
    const pharmacistB = new Types.ObjectId().toString();

    it('T-SHO-04: should reject if outgoing pharmacist attempts to accept their own handover', async () => {
      const mockHandover = {
        _id: handoverId,
        branchId: 'BR-001',
        outgoingPharmacistId: new Types.ObjectId(pharmacistA),
        status: ShiftHandoverStatus.SUBMITTED,
        save: jest.fn().mockResolvedValue(true),
      };

      mockHandoverModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockHandover),
      });

      // Dược sĩ A tự nhận biên bản của chính mình
      await expect(
        service.acceptHandover(handoverId, {
          userId: pharmacistA,
          fullName: 'Dược Sĩ A',
          branchId: 'BR-001',
          role: 'pharmacist',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('T-SHO-05: should reject if pharmacist from another branch tries to accept handover (IDOR Protection)', async () => {
      const mockHandover = {
        _id: handoverId,
        branchId: 'BR-001',
        outgoingPharmacistId: new Types.ObjectId(pharmacistA),
        status: ShiftHandoverStatus.SUBMITTED,
        save: jest.fn().mockResolvedValue(true),
      };

      mockHandoverModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockHandover),
      });

      // Dược sĩ B thuộc BR-002 cố tình duyệt của BR-001
      await expect(
        service.acceptHandover(handoverId, {
          userId: pharmacistB,
          fullName: 'Dược Sĩ B',
          branchId: 'BR-002',
          role: 'pharmacist',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('T-SHO-06: should allow incoming pharmacist from same branch to accept handover successfully', async () => {
      const mockAttendanceId = new Types.ObjectId();
      const mockHandover = {
        _id: handoverId,
        branchId: 'BR-001',
        outgoingPharmacistId: new Types.ObjectId(pharmacistA),
        attendanceId: mockAttendanceId,
        status: ShiftHandoverStatus.SUBMITTED,
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({ status: ShiftHandoverStatus.ACCEPTED }),
      };

      mockHandoverModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockHandover),
      });

      mockAttendanceModel.findByIdAndUpdate.mockResolvedValue(true);

      const res = await service.acceptHandover(handoverId, {
        userId: pharmacistB,
        fullName: 'Dược Sĩ B',
        branchId: 'BR-001',
        role: 'pharmacist',
      });

      expect(res.success).toBe(true);
      expect(mockHandover.status).toBe(ShiftHandoverStatus.ACCEPTED);
      expect(mockHandover.save).toHaveBeenCalled();
      expect(mockAttendanceModel.findByIdAndUpdate).toHaveBeenCalledWith(mockAttendanceId, { isHandoverCompleted: true });
    });
  });

  describe('T-SHO-07, T-SHO-08: Falsy & Float Inheritance Edge Cases', () => {
    it('T-SHO-07: should correctly keep stock as 0 when totalQuantity is 0 (no falsy bug)', async () => {
      const validEmpId = new Types.ObjectId().toString();
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: validEmpId, fullName: 'Dược Sĩ Test', role: 'pharmacist', branchId: 'BR-001' }) }),
      });
      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) }),
      });
      mockHandoverModel.findOne.mockReturnValue({
        sort: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) }),
      });
      mockMedicineModel.find.mockReturnValue({
        limit: () => ({
          lean: () => ({
            exec: jest.fn().mockResolvedValue([
              { _id: new Types.ObjectId(), name: 'Morphin 10mg', unit: 'Ống', totalQuantity: 0, stockQuantity: 0 },
            ]),
          }),
        }),
      });

      const stats = await service.getShiftLiveStats({ employeeId: validEmpId, branchId: 'BR-001' });
      expect(stats.controlledDrugsChecklist[0].systemStock).toBe(0);
      expect(stats.controlledDrugsChecklist[0].actualCount).toBe(0);
    });

    it('T-SHO-08: should inherit float from latest accepted handover in branch', async () => {
      const validEmpId = new Types.ObjectId().toString();
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: validEmpId, fullName: 'Dược Sĩ Test', role: 'pharmacist', branchId: 'BR-001' }) }),
      });
      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) }),
      });
      mockHandoverModel.findOne.mockReturnValue({
        sort: () => ({
          lean: () => ({
            exec: jest.fn().mockResolvedValue({ retainedFloatForNextShift: 1750000, status: ShiftHandoverStatus.ACCEPTED }),
          }),
        }),
      });
      mockMedicineModel.find.mockReturnValue({
        limit: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue([]) }) }),
      });

      const stats = await service.getShiftLiveStats({ employeeId: validEmpId, branchId: 'BR-001' });
      expect(stats.openingFloat).toBe(1750000);
    });
  });

  describe('T-SHO-09, T-SHO-10, T-SHO-11: Handover Detail & IDOR Protection', () => {
    // [Normal Values]
    it('T-SHO-09: [Normal Values] should return handover detail when requested by same branch', async () => {
      const validId = new Types.ObjectId().toString();
      const mockRecord = {
        _id: validId,
        branchId: 'BR-001',
        outgoingPharmacistName: 'Dược sĩ Test',
      };
      mockHandoverModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockRecord) }),
      });

      const result = await service.getHandoverDetail(validId, 'BR-001', 'pharmacist');
      expect(result).toBeDefined();
      expect(result._id).toBe(validId);
    });

    // [Boundary Values]
    it('T-SHO-10: [Boundary Values] should allow admin or director to access detail from any branch', async () => {
      const validId = new Types.ObjectId().toString();
      const mockRecord = {
        _id: validId,
        branchId: 'BR-001',
        outgoingPharmacistName: 'Dược sĩ Test',
      };
      mockHandoverModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockRecord) }),
      });

      const adminResult = await service.getHandoverDetail(validId, 'BR-002', 'admin');
      expect(adminResult).toBeDefined();

      const directorResult = await service.getHandoverDetail(validId, 'BR-003', 'director');
      expect(directorResult).toBeDefined();
    });

    // [Abnormal Values]
    it('T-SHO-11: [Abnormal Values] should block unauthorized cross-branch access with RpcException', async () => {
      const validId = new Types.ObjectId().toString();
      const mockRecord = {
        _id: validId,
        branchId: 'BR-001',
        outgoingPharmacistName: 'Dược sĩ Test',
      };
      mockHandoverModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockRecord) }),
      });

      // Dược sĩ hoặc Quản lý chi nhánh BR-002 cố tình đọc biên bản của BR-001
      await expect(
        service.getHandoverDetail(validId, 'BR-002', 'branch'),
      ).rejects.toThrow(RpcException);

      await expect(
        service.getHandoverDetail(validId, 'BR-002', 'pharmacist'),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('T-SHO-12, T-SHO-13, T-SHO-14: Xử lý an toàn incomingPharmacistId & IDOR khi xác nhận bàn giao', () => {
    // 1. [Normal Values]
    it('T-SHO-12: [Normal Values] Cho phép tiếp nhận biên bản bàn giao với incomingPharmacistId hợp lệ', async () => {
      const handoverId = new Types.ObjectId().toString();
      const outgoingId = new Types.ObjectId().toString();
      const incomingId = new Types.ObjectId().toString();

      const mockHandover: any = {
        _id: handoverId,
        branchId: 'BR-001',
        outgoingPharmacistId: new Types.ObjectId(outgoingId),
        status: ShiftHandoverStatus.SUBMITTED,
        save: jest.fn().mockResolvedValue(true),
      };

      mockHandoverModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockHandover),
      });
      mockAttendanceModel.findByIdAndUpdate.mockResolvedValue(true);

      const res = await service.acceptHandover(handoverId, {
        userId: incomingId,
        fullName: 'Dược sĩ nhận ca',
        branchId: 'BR-001',
        role: 'pharmacist',
      });

      expect(res.success).toBe(true);
      expect(mockHandover.status).toBe(ShiftHandoverStatus.ACCEPTED);
      expect(mockHandover.incomingPharmacistName).toBe('Dược sĩ nhận ca');
    });

    // 2. [Boundary Values]
    it('T-SHO-13: [Boundary Values] Nộp biên bản khi incomingPharmacistId là chuỗi rỗng "" hoặc khoảng trắng không gây lỗi crash BSON', async () => {
      const employeeId = new Types.ObjectId().toString();
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: employeeId, fullName: 'Dược Sĩ Test', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            shiftId: 'CA_SANG',
            status: AttendanceStatus.CHECKED_IN,
            save: jest.fn().mockResolvedValue(true),
          }),
        }),
      });

      function MockHandoverDoc(this: any, data: any) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue(this);
      }
      (MockHandoverDoc as any).findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      (service as any).handoverModel = MockHandoverDoc as any;

      const res = await service.submitHandover({
        employeeId,
        branchId: 'BR-001',
        shiftId: 'CA_SANG',
        shiftName: 'Ca sáng',
        openingFloat: 1000000,
        systemCashSales: 1000000,
        systemDigitalSales: 0,
        systemOrderCount: 5,
        actualCashAmount: 2000000,
        incomingPharmacistId: '', // Chuỗi rỗng boundary
      });

      expect(res.success).toBe(true);
    });

    // 3. [Abnormal Values]
    it('T-SHO-14: [Abnormal Values] Không cho phép tự xác nhận biên bản của chính mình (Anti-Self-Approve)', async () => {
      const handoverId = new Types.ObjectId().toString();
      const sameUserId = new Types.ObjectId().toString();

      const mockHandover: any = {
        _id: handoverId,
        branchId: 'BR-001',
        outgoingPharmacistId: new Types.ObjectId(sameUserId),
        status: ShiftHandoverStatus.SUBMITTED,
      };

      mockHandoverModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockHandover),
      });

      await expect(
        service.acceptHandover(handoverId, {
          userId: sameUserId,
          fullName: 'Dược sĩ tự duyệt',
          branchId: 'BR-001',
          role: 'pharmacist',
        }),
      ).rejects.toThrow(RpcException);
    });
  });
});

