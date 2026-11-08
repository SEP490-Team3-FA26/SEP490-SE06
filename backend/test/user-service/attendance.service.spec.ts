/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import { AttendanceService, calculateHaversineDistanceMeters } from '../../apps/user-service/src/attendance.service';
import { Attendance, AttendanceStatus } from '../../apps/user-service/src/schemas/attendance.schema';
import { Branch } from '../../apps/user-service/src/schemas/branch.schema';
import { WorkSchedule } from '../../apps/user-service/src/schemas/work-schedule.schema';
import { WorkShift } from '../../apps/user-service/src/schemas/work-shift.schema';
import { User } from '../../apps/auth-service/src/auth/user.schema';

describe('AttendanceService (Unit & Security Tests)', () => {
  let service: AttendanceService;

  const mockAttendanceModel: any = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
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

  describe('T-01b: Reject check-in when branch has no GPS configured', () => {
    it('should throw RpcException when branch latitude or longitude is missing', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: 'emp-1', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: null, longitude: null }) }),
      });

      await expect(
        service.checkIn({
          employeeId: 'emp-1',
          latitude: 10.7769,
          longitude: 106.7009,
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

    it('T-SHO-03: should reject check-out when pharmacist has not submitted shift handover (INV-SHO-01)', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }) }),
      });

      const mockExistingAttendance = {
        _id: 'att-1',
        status: AttendanceStatus.CHECKED_IN,
        isHandoverSubmitted: false, // CHƯA NỘP BÀN GIAO CA
        checkInTime: new Date(Date.now() - 4 * 3600000),
        save: jest.fn().mockResolvedValue(true),
      };

      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          exec: jest.fn().mockResolvedValue(mockExistingAttendance),
        }),
      });

      await expect(
        service.checkOut({
          employeeId: '507f1f77bcf86cd799439011',
          latitude: 10.7769,
          longitude: 106.7009,
        }),
      ).rejects.toThrow('Theo quy chuẩn quản lý nhà thuốc GPP, Dược sĩ phụ trách quầy bắt buộc phải hoàn thành và nộp Phiếu Bàn Giao Ca (Shift Handover) trước khi Check-out tan ca!');
    });

    it('should reject check-out even if client attempts bypass with bypassHandover or fake handoverId', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', fullName: 'Dược sĩ A', role: 'pharmacist', branchId: 'BR-001' }) }),
      });

      mockBranchModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ branchCode: 'BR-001', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }) }),
      });

      const mockExistingAttendance = {
        _id: 'att-1',
        status: AttendanceStatus.CHECKED_IN,
        isHandoverSubmitted: false,
        checkInTime: new Date(Date.now() - 4 * 3600000),
        save: jest.fn().mockResolvedValue(true),
      };

      mockAttendanceModel.findOne.mockReturnValue({
        sort: () => ({
          exec: jest.fn().mockResolvedValue(mockExistingAttendance),
        }),
      });

      await expect(
        service.checkOut({
          employeeId: '507f1f77bcf86cd799439011',
          latitude: 10.7769,
          longitude: 106.7009,
          bypassHandover: true,
          handoverId: '507f1f77bcf86cd799439011',
        } as any),
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
        isHandoverSubmitted: true,
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

  describe('T-BRANCH-HISTORY: getBranchAttendanceHistory', () => {
    describe('[Normal Values]', () => {
      it('should query attendances with pagination and compute summary KPI and durationMinutes', () => {
        const mockRecords = [
          {
            _id: 'att-1',
            branchId: 'BR-001',
            employeeId: '507f1f77bcf86cd799439011',
            employeeName: 'Dược sĩ A',
            date: '2026-11-01',
            checkInTime: new Date('2026-11-01T08:00:00Z'),
            checkOutTime: new Date('2026-11-01T16:30:00Z'),
            status: 'COMPLETED',
          },
          {
            _id: 'att-2',
            branchId: 'BR-001',
            employeeId: '507f1f77bcf86cd799439012',
            employeeName: 'Dược sĩ B',
            date: '2026-11-01',
            checkInTime: new Date('2026-11-01T08:25:00Z'),
            checkOutTime: null,
            status: 'LATE',
          },
        ];

        mockAttendanceModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockResolvedValue(2),
        });

        mockAttendanceModel.find.mockImplementation((filter: any) => {
          return {
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () => ({
                    exec: jest.fn().mockResolvedValue(mockRecords),
                  }),
                }),
              }),
            }),
            select: () => ({
              lean: () => ({
                exec: jest.fn().mockResolvedValue(mockRecords),
              }),
            }),
          };
        });

        return service.getBranchAttendanceHistory('BR-001', {
          startDate: '2026-11-01',
          endDate: '2026-11-01',
          page: 1,
          limit: 20,
        }).then((res) => {
          expect(res.total).toBe(2);
          expect(res.items.length).toBe(2);
          expect(res.items[0].durationMinutes).toBe(510);
          expect(res.items[1].durationMinutes).toBeNull();
          expect(res.summary.lateCount).toBe(1);
          expect(res.summary.completedCount).toBe(1);
          expect(res.summary.totalRecords).toBe(2);
          // Bản ghi ngày quá khứ (2026-11-01) chưa có checkOutTime phải được đánh dấu isPastUnclosed = true và tính vào missingCheckoutCount
          expect(res.items[1].isPastUnclosed).toBe(true);
          expect(res.summary.missingCheckoutCount).toBe(1);
          expect(res.summary.inProgressCount).toBe(0);
        });
      });
    });

    describe('[Boundary Values]', () => {
      it('Nên xử lý an toàn khi không có bản ghi chấm công nào (total = 0, items = [])', async () => {
        mockAttendanceModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        });

        mockAttendanceModel.find.mockImplementation(() => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: () => ({
                  exec: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
          select: () => ({
            lean: () => ({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }));

        const res = await service.getBranchAttendanceHistory('BR-EMPTY', { page: 0 as any, limit: -5 as any });
        expect(res.total).toBe(0);
        expect(res.items).toEqual([]);
        expect(res.page).toBe(1);
        expect(res.limit).toBe(1);
        expect(res.summary.totalRecords).toBe(0);
      });
    });

    describe('[Abnormal Values]', () => {
      it('Nên ném ngoại lệ khi cơ sở dữ liệu gặp lỗi countDocuments', async () => {
        mockAttendanceModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB Connection Timeout')),
        });

        await expect(
          service.getBranchAttendanceHistory('BR-001', { page: 1, limit: 10 }),
        ).rejects.toThrow('DB Connection Timeout');
      });
    });
  });

  describe('T-MANAGER-CLOSE: managerCloseShift (Reconcile Forgotten Check-out)', () => {
    it('should allow branch manager to manually close an unclosed shift of their own branch', async () => {
      const validAttId = '507f1f77bcf86cd799439099';
      const mockRecord: any = {
        _id: validAttId,
        branchId: 'BR-001',
        date: '2026-11-05',
        checkInTime: new Date('2026-11-05T07:00:00.000Z'),
        checkOutTime: null,
        status: AttendanceStatus.CHECKED_IN,
        note: 'Vào ca sáng',
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: validAttId,
          branchId: 'BR-001',
          status: AttendanceStatus.COMPLETED,
        }),
      };

      mockAttendanceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRecord),
      });

      const res = await service.managerCloseShift({
        attendanceId: validAttId,
        branchId: 'BR-001',
        requesterRole: 'branch',
        checkOutTime: '2026-11-05T15:00:00.000Z',
        note: 'Nhân viên quên bấm tan ca, xác nhận từ camera quầy',
        managerName: 'Quản lý CN1',
      });

      expect(res.success).toBe(true);
      expect(mockRecord.status).toBe(AttendanceStatus.COMPLETED);
      expect(mockRecord.checkOutTime).toBeInstanceOf(Date);
      expect(mockRecord.isHandoverSubmitted).toBeUndefined();
      expect(mockRecord.note).toContain('Nhân viên quên bấm tan ca');
      expect(mockRecord.save).toHaveBeenCalled();
    });

    it('should reject closing a paid leave record (ON_LEAVE_PAID) or an already closed shift (COMPLETED)', async () => {
      const leaveAttId = '507f1f77bcf86cd799439097';
      mockAttendanceModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: leaveAttId,
          branchId: 'BR-001',
          date: '2026-11-05',
          status: AttendanceStatus.ON_LEAVE_PAID,
          checkInTime: null,
          checkOutTime: null,
        }),
      });

      await expect(
        service.managerCloseShift({
          attendanceId: leaveAttId,
          branchId: 'BR-001',
          requesterRole: 'branch',
        }),
      ).rejects.toThrow(RpcException);

      const completedAttId = '507f1f77bcf86cd799439096';
      mockAttendanceModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: completedAttId,
          branchId: 'BR-001',
          date: '2026-11-05',
          status: AttendanceStatus.COMPLETED,
          checkInTime: new Date('2026-11-05T07:00:00.000Z'),
          checkOutTime: new Date('2026-11-05T15:00:00.000Z'),
        }),
      });

      await expect(
        service.managerCloseShift({
          attendanceId: completedAttId,
          branchId: 'BR-001',
          requesterRole: 'branch',
          checkOutTime: '2026-11-05T16:00:00.000Z',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject future checkOutTime or checkOutTime earlier than checkInTime', async () => {
      const validAttId = '507f1f77bcf86cd799439095';
      const openShift = {
        _id: validAttId,
        branchId: 'BR-001',
        date: '2026-11-05',
        status: AttendanceStatus.CHECKED_IN,
        checkInTime: new Date('2026-11-05T07:00:00.000Z'),
        checkOutTime: null,
      };

      mockAttendanceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(openShift),
      });

      const futureIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      await expect(
        service.managerCloseShift({
          attendanceId: validAttId,
          branchId: 'BR-001',
          requesterRole: 'branch',
          checkOutTime: futureIso,
        }),
      ).rejects.toThrow(RpcException);

      await expect(
        service.managerCloseShift({
          attendanceId: validAttId,
          branchId: 'BR-001',
          requesterRole: 'branch',
          checkOutTime: '2026-11-05T06:00:00.000Z',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject cross-branch IDOR when manager attempts to close shift of another branch', async () => {
      const validAttId = '507f1f77bcf86cd799439098';
      mockAttendanceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: validAttId,
          branchId: 'BR-002',
          date: '2026-11-05',
        }),
      });

      await expect(
        service.managerCloseShift({
          attendanceId: validAttId,
          branchId: 'BR-001',
          requesterRole: 'branch',
          note: 'Cố tình đóng ca chi nhánh khác',
        }),
      ).rejects.toThrow(RpcException);
    });
  });

});
