/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { AttendanceService, calculateHaversineDistanceMeters } from './attendance.service';
import { Attendance, AttendanceStatus } from './schemas/attendance.schema';
import { Branch } from './schemas/branch.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { WorkShift } from './schemas/work-shift.schema';
import { User } from '../../auth-service/src/auth/user.schema';

describe('AttendanceService (Unit & Security Tests)', () => {
  let service: AttendanceService;

  const mockAttendanceModel: any = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockBranchModel: any = {
    findOne: jest.fn(),
  };

  const mockWorkScheduleModel: any = {
    find: jest.fn(),
  };

  const mockWorkShiftModel: any = {
    findById: jest.fn(),
  };

  const mockUserModel: any = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: getModelToken(Attendance.name), useValue: mockAttendanceModel },
        { provide: getModelToken(Branch.name), useValue: mockBranchModel },
        { provide: getModelToken(WorkSchedule.name), useValue: mockWorkScheduleModel },
        { provide: getModelToken(WorkShift.name), useValue: mockWorkShiftModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('T-01: Haversine Distance Calculation', () => {
    // Chi nhánh Q1: 10.7769, 106.7009
    const branchLat = 10.7769;
    const branchLng = 106.7009;

    it('should calculate distance ~150m accurately and remain within 200m radius', () => {
      // Cách ~150m về phía Bắc
      const userLat = 10.77825;
      const userLng = 106.7009;
      const dist = calculateHaversineDistanceMeters(userLat, userLng, branchLat, branchLng);
      expect(dist).toBeGreaterThan(130);
      expect(dist).toBeLessThan(170);
      expect(dist).toBeLessThanOrEqual(200);
    });

    it('should calculate distance ~350m and detect exceeding 200m radius', () => {
      // Cách ~350m về phía Bắc
      const userLat = 10.7800;
      const userLng = 106.7009;
      const dist = calculateHaversineDistanceMeters(userLat, userLng, branchLat, branchLng);
      expect(dist).toBeGreaterThan(250);
      expect(dist > 200).toBe(true);
    });
  });

  describe('Security Regression: NaN & Invalid Coordinates Check', () => {
    it('should reject check-in when latitude or longitude is NaN', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: 'emp-1', fullName: 'Dược sĩ Test', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      await expect(
        service.checkIn({
          employeeId: 'emp-1',
          latitude: NaN,
          longitude: NaN,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject check-in when coordinates are null or undefined', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: 'emp-1', fullName: 'Dược sĩ Test', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      await expect(
        service.checkIn({
          employeeId: 'emp-1',
          latitude: null as any,
          longitude: undefined as any,
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('T-03: Check-in outside allowed radius (> 200m)', () => {
    it('should throw RpcException with distance violation message when outside radius', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: 'emp-1', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }) }),
      });

      // Toạ độ cách xa chi nhánh ~800m
      await expect(
        service.checkIn({
          employeeId: 'emp-1',
          latitude: 10.7845,
          longitude: 106.7009,
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('T-02: Check-in within allowed radius (< 200m)', () => {
    it('should successfully create attendance record within allowed geofence', async () => {
      const mockUser = { _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' };
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockUser) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }) }),
      });

      mockWorkScheduleModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue([]) }),
      });

      mockAttendanceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockAttendanceModel.create.mockResolvedValue({
        _id: 'att-1',
        employeeId: mockUser._id,
        employeeName: mockUser.fullName,
        status: AttendanceStatus.CHECKED_IN,
        checkInDistanceMeters: 50,
      });

      const res = await service.checkIn({
        employeeId: mockUser._id,
        latitude: 10.7770,
        longitude: 106.7010,
      });

      expect(res.success).toBe(true);
      expect(mockAttendanceModel.create).toHaveBeenCalled();
    });
  });

  describe('T-04 & T-05: POS Shift Guard (verifyPharmacistActiveShift)', () => {
    it('should return allowed: false when pharmacist is not checked-in today', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ B', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009 }) }),
      });

      // Chưa có điểm danh
      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
        }),
      });

      mockWorkScheduleModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue([]) }),
      });

      const check = await service.verifyPharmacistActiveShift('507f1f77bcf86cd799439011', 'BR-001');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Dược sĩ chưa thực hiện điểm danh');
    });

    it('should return allowed: true when pharmacist has checked-in successfully', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ B', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009 }) }),
      });

      // Đã check-in hợp lệ
      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          lean: () => ({
            exec: jest.fn().mockResolvedValue({
              _id: 'att-1',
              status: AttendanceStatus.CHECKED_IN,
              checkInTime: new Date(),
              shiftName: 'Ca sáng',
            }),
          }),
        }),
      });

      mockWorkScheduleModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue([]) }),
      });

      const check = await service.verifyPharmacistActiveShift('507f1f77bcf86cd799439011', 'BR-001');
      expect(check.allowed).toBe(true);
    });

    it('should return allowed: false when pharmacist has already CHECKED_OUT (status: COMPLETED)', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ B', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009 }) }),
      });

      // Đã check-out hoàn thành ca trực
      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          lean: () => ({
            exec: jest.fn().mockResolvedValue({
              _id: 'att-1',
              status: AttendanceStatus.COMPLETED,
              checkInTime: new Date(Date.now() - 8 * 3600000),
              checkOutTime: new Date(),
              shiftName: 'Ca sáng',
            }),
          }),
        }),
      });

      mockWorkScheduleModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue([]) }),
      });

      const check = await service.verifyPharmacistActiveShift('507f1f77bcf86cd799439011', 'BR-001');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Dược sĩ đã hoàn thành ca trực hôm nay (đã Check-out)');
    });
  });

  describe('T-CHECKOUT: Geofencing Check-out Guard', () => {
    it('should reject check-out when coordinates are missing or invalid', async () => {
      await expect(
        service.checkOut({
          employeeId: '507f1f77bcf86cd799439011',
          latitude: undefined as any,
          longitude: undefined as any,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject check-out when pharmacist is outside allowed radius (> 200m)', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }) }),
      });

      // Tọa độ xa ~800m
      await expect(
        service.checkOut({
          employeeId: '507f1f77bcf86cd799439011',
          latitude: 10.7845,
          longitude: 106.7009,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should successfully check-out when within allowed geofence (< 200m)', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }) }),
      });

      const mockExistingAttendance = {
        _id: 'att-1',
        status: AttendanceStatus.CHECKED_IN,
        checkInTime: new Date(Date.now() - 4 * 3600000),
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'att-1', status: AttendanceStatus.COMPLETED }),
      };

      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          exec: jest.fn().mockResolvedValue(mockExistingAttendance),
        }),
      });

      const res = await service.checkOut({
        employeeId: '507f1f77bcf86cd799439011',
        latitude: 10.7770,
        longitude: 106.7010,
      });

      expect(res.success).toBe(true);
      expect(mockExistingAttendance.status).toBe(AttendanceStatus.COMPLETED);
      expect(mockExistingAttendance.save).toHaveBeenCalled();
    });
  });

  describe('T-RECHECKIN: Preserving original checkInTime', () => {
    it('should keep original checkInTime when re-checking in on the same day', async () => {
      const originalTime = new Date('2026-10-13T08:00:00.000Z');
      const mockExisting = {
        _id: 'att-1',
        checkInTime: originalTime,
        checkInLatitude: 10.7769,
        checkInLongitude: 106.7009,
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'att-1', checkInTime: originalTime }),
      };

      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }) }),
      });

      mockWorkScheduleModel.find.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue([]) }),
      });

      mockAttendanceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExisting),
      });

      const res = await service.checkIn({
        employeeId: '507f1f77bcf86cd799439011',
        latitude: 10.7770,
        longitude: 106.7010,
      });

      expect(res.success).toBe(true);
      // checkInTime phải được giữ nguyên là originalTime
      expect(mockExisting.checkInTime).toBe(originalTime);
      expect(mockExisting.save).toHaveBeenCalled();
    });
  });
});
