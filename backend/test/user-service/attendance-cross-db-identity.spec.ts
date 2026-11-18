import { Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { AttendanceService } from '../../apps/user-service/src/attendance.service';
import { ShiftHandoverService } from '../../apps/user-service/src/shift-handover.service';
import { AttendanceStatus } from '../../apps/user-service/src/schemas/attendance.schema';

/**
 * BỘ KIỂM THỬ ĐỐI SOÁT DANH TÍNH NHÂN VIÊN XUYÊN DATABASE (AUTH DB <-> USER DB)
 * Khắc phục triệt để lỗi "Không tìm thấy thông tin nhân viên" khi tài khoản nhân viên
 * có _id khác nhau giữa wdp301_auth (JWT sub) và wdp301_users (lịch phân ca & điểm danh).
 * Tuân thủ Test-Coupled Mandate: [Normal Values], [Boundary Values], [Abnormal Values].
 */
describe('AttendanceService & ShiftHandoverService - Cross-DB Identity Resolution', () => {
  const authUserId = new Types.ObjectId().toString(); // _id nằm trong JWT sub từ auth-service
  const userDbId = new Types.ObjectId(); // _id thực tế nằm trong user-service & work_schedules

  const mockDatUser = {
    _id: userDbId,
    email: 'dat@gmail.com',
    fullName: 'Dược sĩ Đạt',
    role: 'pharmacist',
    branchId: 'BR-001',
  };

  const mockBranch = {
    _id: new Types.ObjectId(),
    branchCode: 'BR-001',
    name: 'Chi nhánh Trung Tâm',
    latitude: 10.7769,
    longitude: 106.7009,
    checkInRadiusMeters: 200,
  };

  const makeLeanExec = (val: any) => ({
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(val),
    }),
  });

  const makeSortLeanExec = (val: any) => ({
    sort: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(val),
      }),
    }),
  });

  const getVnToday = () => {
    const vn = new Date(Date.now() + 7 * 3600 * 1000);
    return vn.toISOString().slice(0, 10);
  };

  // =========================================================================
  // 1. [Normal Values]: Luồng đối soát thành công khi lệch _id giữa 2 DB
  // =========================================================================
  describe('1. [Normal Values] Đối soát qua email khi JWT sub lệch _id với user-service DB', () => {
    it('[Normal] checkIn tự động fallback tìm dat@gmail.com qua email, khớp lịch phân ca của ID_USER và tạo bản ghi điểm danh thành công', async () => {
      const todayStr = getVnToday();
      const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
      const startHour = String(vnNow.getUTCHours()).padStart(2, '0');
      const endHour = String((vnNow.getUTCHours() + 4) % 24).padStart(2, '0');

      const userModel = {
        findById: jest.fn().mockReturnValue(makeLeanExec(null)), // Không thấy theo ID_AUTH
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockDatUser)), // Tìm thấy theo email dat@gmail.com
      };
      const branchModel = {
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockBranch)),
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
      };
      const workScheduleModel = {
        find: jest.fn().mockReturnValue(
          makeLeanExec([
            {
              branchId: 'BR-001',
              status: 'published',
              assignments: [
                {
                  employeeId: userDbId.toString(), // Lịch phân ca lưu theo ID_USER
                  shiftId: 'SHIFT-SANG',
                  shiftName: 'Ca Sáng',
                  date: new Date(`${todayStr}T00:00:00.000Z`),
                  shiftStart: `${startHour}:00`,
                  shiftEnd: `${endHour}:00`,
                },
              ],
            },
          ]),
        ),
      };
      const attendanceModel = {
        find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        create: jest.fn().mockImplementation(async (doc) => ({
          ...doc,
          _id: new Types.ObjectId(),
          toObject: () => doc,
        })),
      };

      const service = new AttendanceService(
        attendanceModel as any,
        branchModel as any,
        workScheduleModel as any,
        {} as any,
        userModel as any,
      );

      const res = await service.checkIn({
        employeeId: authUserId,
        employeeEmail: 'dat@gmail.com',
        branchId: 'BR-001',
        latitude: 10.7769,
        longitude: 106.7009,
      });

      expect(res.success).toBe(true);
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'dat@gmail.com' });
      expect(attendanceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: userDbId, // Chuẩn hóa lưu theo ID_USER trong user-service
          shiftId: 'SHIFT-SANG',
          shiftName: 'Ca Sáng',
        }),
      );
    });

    it('[Normal] verifyPharmacistActiveShift nhận diện ca đã check-in thành công khi truyền pharmacistEmail', async () => {
      const todayStr = getVnToday();
      const userModel = {
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockDatUser)),
      };
      const branchModel = {
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockBranch)),
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
      };
      const attendanceModel = {
        find: jest.fn().mockReturnValue(
          makeSortLeanExec([
            {
              _id: new Types.ObjectId(),
              employeeId: userDbId,
              date: todayStr,
              shiftId: 'SHIFT-SANG',
              shiftName: 'Ca Sáng',
              status: AttendanceStatus.CHECKED_IN,
              checkInTime: new Date(),
              checkOutTime: null,
              isHandoverSubmitted: false,
            },
          ]),
        ),
      };
      const workScheduleModel = {
        find: jest.fn().mockReturnValue(makeLeanExec([])),
      };

      const service = new AttendanceService(
        attendanceModel as any,
        branchModel as any,
        workScheduleModel as any,
        {} as any,
        userModel as any,
      );

      const res = await service.verifyPharmacistActiveShift(authUserId, 'BR-001', 'dat@gmail.com');
      expect(res.allowed).toBe(true);
      expect(res.status.isCheckedIn).toBe(true);
    });

    it('[Normal] ShiftHandoverService.getShiftLiveStats tìm được nhân viên và ca đang mở thông qua employeeEmail', async () => {
      const todayStr = getVnToday();
      const userModel = {
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockDatUser)),
      };
      const attendanceModel = {
        findOne: jest.fn().mockReturnValue(
          makeSortLeanExec({
            _id: new Types.ObjectId(),
            employeeId: userDbId,
            date: todayStr,
            shiftId: 'SHIFT-SANG',
            shiftName: 'Ca Sáng',
            status: AttendanceStatus.CHECKED_IN,
            checkInTime: new Date(),
          }),
        ),
      };
      const workShiftModel = {
        findOne: jest.fn().mockReturnValue(makeLeanExec(null)),
      };
      const handoverModel = {
        findOne: jest.fn().mockReturnValue(makeSortLeanExec(null)),
      };
      const medicineModel = {
        find: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue(makeLeanExec([])),
        }),
      };

      const handoverService = new ShiftHandoverService(
        handoverModel as any,
        attendanceModel as any,
        workShiftModel as any,
        {} as any,
        userModel as any,
        medicineModel as any,
      );

      const stats = await handoverService.getShiftLiveStats({
        employeeId: authUserId,
        employeeEmail: 'dat@gmail.com',
        branchId: 'BR-001',
      });

      expect(stats.employeeName).toBe('Dược sĩ Đạt');
      expect(stats.isCheckedIn).toBe(true);
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Chuẩn hóa email hoa/thường & khoảng trắng biên
  // =========================================================================
  describe('2. [Boundary Values] Chuẩn hóa email có chữ hoa và khoảng trắng dư thừa', () => {
    it('[Boundary] Email "  DAT@GMAIL.COM  " vẫn chuẩn hóa về "dat@gmail.com" để đối soát thành công', async () => {
      const userModel = {
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockDatUser)),
      };
      const branchModel = {
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockBranch)),
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
      };
      const attendanceModel = {
        find: jest.fn().mockReturnValue(makeSortLeanExec([])),
      };
      const workScheduleModel = {
        find: jest.fn().mockReturnValue(makeLeanExec([])),
      };

      const service = new AttendanceService(
        attendanceModel as any,
        branchModel as any,
        workScheduleModel as any,
        {} as any,
        userModel as any,
      );

      const status = await service.getMyCurrentShiftStatus(authUserId, 'BR-001', '  DAT@GMAIL.COM  ');
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'dat@gmail.com' });
      expect(status.branch?.branchCode).toBe('BR-001');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Không tồn tại nhân viên & ObjectId sai định dạng
  // =========================================================================
  describe('3. [Abnormal Values] Ngoại lệ khi không tìm thấy nhân viên hoặc employeeId sai định dạng', () => {
    it('[Abnormal] Cả employeeId lẫn employeeEmail đều không tồn tại trong DB -> ném RpcException rõ ràng', async () => {
      const userModel = {
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
        findOne: jest.fn().mockReturnValue(makeLeanExec(null)),
      };

      const service = new AttendanceService(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        userModel as any,
      );

      await expect(
        service.checkIn({
          employeeId: authUserId,
          employeeEmail: 'khongtontai@gmail.com',
          branchId: 'BR-001',
          latitude: 10.7769,
          longitude: 106.7009,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('[Abnormal] employeeId không phải ObjectId 24 ký tự nhưng có employeeEmail hợp lệ -> không crash CastError mà fallback email an toàn', async () => {
      const userModel = {
        findById: jest.fn(),
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockDatUser)),
      };
      const branchModel = {
        findOne: jest.fn().mockReturnValue(makeLeanExec(mockBranch)),
        findById: jest.fn().mockReturnValue(makeLeanExec(null)),
      };
      const attendanceModel = {
        find: jest.fn().mockReturnValue(makeSortLeanExec([])),
      };
      const workScheduleModel = {
        find: jest.fn().mockReturnValue(makeLeanExec([])),
      };

      const service = new AttendanceService(
        attendanceModel as any,
        branchModel as any,
        workScheduleModel as any,
        {} as any,
        userModel as any,
      );

      const status = await service.getMyCurrentShiftStatus('legacy-non-objectid', 'BR-001', 'dat@gmail.com');
      expect(userModel.findById).not.toHaveBeenCalled();
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'dat@gmail.com' });
      expect(status.branch?.branchCode).toBe('BR-001');
    });
  });
});
