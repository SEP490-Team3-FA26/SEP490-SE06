import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Attendance, AttendanceDocument, AttendanceStatus } from './schemas/attendance.schema';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { WorkShift } from './schemas/work-shift.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';

/**
 * Tính khoảng cách giữa 2 tọa độ theo công thức Haversine (đơn vị: mét)
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Bán kính trái đất tính bằng mét
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Helper lấy ngày hiện tại định dạng YYYY-MM-DD theo múi giờ Việt Nam (+07:00)
 */
function getVietnamTodayString(dateObj: Date = new Date()): string {
  const vnTime = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

/**
 * Helper chuyển đổi chuỗi giờ 'HH:mm' thành số phút trong ngày
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(WorkSchedule.name) private readonly workScheduleModel: Model<WorkSchedule>,
    @InjectModel(WorkShift.name) private readonly workShiftModel: Model<WorkShift>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Check-in ca làm việc bằng tọa độ GPS từ mobile app
   */
  async checkIn(dto: {
    employeeId: string;
    branchId?: string;
    shiftId?: string;
    latitude: number;
    longitude: number;
    isMockLocation?: boolean;
    note?: string;
  }) {
    const lat = Number(dto.latitude);
    const lng = Number(dto.longitude);
    if (
      dto.latitude === undefined ||
      dto.latitude === null ||
      dto.longitude === undefined ||
      dto.longitude === null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new RpcException('Tọa độ GPS không hợp lệ hoặc thiết bị chưa cấp quyền định vị');
    }

    const user = await this.userModel.findById(dto.employeeId)?.lean()?.exec();
    if (!user) {
      throw new RpcException('Không tìm thấy thông tin nhân viên');
    }

    const branchId = dto.branchId || user.branchId;
    if (!branchId) {
      throw new RpcException('Nhân viên chưa được phân bổ vào chi nhánh cụ thể để điểm danh');
    }
    let branch: any = await this.branchModel.findOne({ branchCode: branchId })?.lean()?.exec();
    if (!branch && Types.ObjectId.isValid(branchId)) {
      branch = await this.branchModel.findById(branchId)?.lean()?.exec();
    }

    if (
      !branch ||
      branch.latitude === undefined ||
      branch.latitude === null ||
      branch.longitude === undefined ||
      branch.longitude === null
    ) {
      throw new RpcException(
        'Chi nhánh chưa được thiết lập tọa độ GPS điểm danh. Vui lòng liên hệ Quản lý chi nhánh cấu hình vị trí trước khi điểm danh!',
      );
    }

    const branchLat = branch.latitude;
    const branchLng = branch.longitude;
    const allowedRadius = branch?.checkInRadiusMeters ?? 200;

    const distanceMeters = calculateHaversineDistanceMeters(
      lat,
      lng,
      branchLat,
      branchLng,
    );

    // Chặn nghiêm ngặt nếu ngoài bán kính cho phép hoặc không tính toán được khoảng cách
    if (Number.isNaN(distanceMeters) || distanceMeters > allowedRadius) {
      const roundedDist = Math.round(distanceMeters || 9999);
      throw new RpcException(
        `Bạn đang ở cách chi nhánh ${roundedDist}m, vượt quá bán kính cho phép (${allowedRadius}m). Vui lòng di chuyển đến gần chi nhánh để điểm danh.`,
      );
    }

    const todayStr = getVietnamTodayString();
    const now = new Date();
    // Giờ hiện tại theo VN
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const currentMinutes = vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();

    // Tìm ca phân công hôm nay của nhân viên
    let assignedShiftId = dto.shiftId;
    let assignedShiftName = 'Ca mặc định';
    let isLate = false;

    // Tra cứu lịch phân ca hôm nay trong work_schedules
    const schedules = await this.workScheduleModel
      .find({ branchId, status: 'published' })
      .lean()
      .exec();

    let matchedAssignment: any = null;
    for (const schedule of schedules) {
      const found = schedule.assignments?.find((a: any) => {
        const aDateStr = a.date ? new Date(a.date).toISOString().slice(0, 10) : '';
        return (
          a.employeeId === dto.employeeId &&
          (aDateStr === todayStr || Math.abs(new Date(a.date).getTime() - now.getTime()) < 24 * 3600 * 1000)
        );
      });
      if (found) {
        matchedAssignment = found;
        break;
      }
    }

    if (matchedAssignment) {
      assignedShiftId = matchedAssignment.shiftId;
      assignedShiftName = matchedAssignment.shiftName;
      const startMin = parseTimeToMinutes(matchedAssignment.shiftStart);
      // Nếu check-in trễ quá 15 phút so với giờ bắt đầu ca
      if (currentMinutes > startMin + 15) {
        isLate = true;
      }
    } else if (dto.shiftId) {
      const shift = await this.workShiftModel.findById(dto.shiftId).lean().exec();
      if (shift) {
        assignedShiftName = shift.name;
        const startMin = parseTimeToMinutes(shift.startTime);
        if (currentMinutes > startMin + 15) {
          isLate = true;
        }
      }
    }

    // Kiểm tra xem hôm nay đã check-in ca này chưa
    const existing = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        date: todayStr,
        shiftId: assignedShiftId || 'DEFAULT',
      })
      .exec();

    if (existing) {
      // Giữ nguyên checkInTime ban đầu để tránh dời giờ vào ca của nhân viên
      existing.checkInLatitude = dto.latitude;
      existing.checkInLongitude = dto.longitude;
      existing.checkInDistanceMeters = Math.round(distanceMeters);
      existing.isMockLocation = dto.isMockLocation || false;
      if (dto.note) existing.note = dto.note;
      await existing.save();
      return {
        success: true,
        message: 'Cập nhật điểm danh vào ca thành công',
        distanceMeters: Math.round(distanceMeters),
        attendance: existing.toObject ? existing.toObject() : existing,
      };
    }

    const attendance = await this.attendanceModel.create({
      employeeId: new Types.ObjectId(dto.employeeId),
      employeeName: user.fullName,
      employeeRole: user.role,
      branchId,
      shiftId: assignedShiftId || 'DEFAULT',
      shiftName: assignedShiftName,
      date: todayStr,
      checkInTime: now,
      checkInLatitude: dto.latitude,
      checkInLongitude: dto.longitude,
      checkInDistanceMeters: Math.round(distanceMeters),
      status: isLate ? AttendanceStatus.LATE : AttendanceStatus.CHECKED_IN,
      isMockLocation: dto.isMockLocation || false,
      note: dto.note || '',
    });

    return {
      success: true,
      message: isLate ? 'Điểm danh thành công (Ghi nhận đi muộn)' : 'Điểm danh vào ca thành công',
      distanceMeters: Math.round(distanceMeters),
      attendance: attendance.toObject ? attendance.toObject() : attendance,
    };
  }

  /**
   * Check-out kết thúc ca làm việc (có kiểm tra bán kính GPS Geofencing)
   */
  async checkOut(dto: {
    employeeId: string;
    branchId?: string;
    latitude?: number;
    longitude?: number;
    note?: string;
  }) {
    const lat = Number(dto.latitude);
    const lng = Number(dto.longitude);
    if (
      dto.latitude === undefined ||
      dto.latitude === null ||
      dto.longitude === undefined ||
      dto.longitude === null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new RpcException('Tọa độ GPS không hợp lệ hoặc thiết bị chưa cấp quyền định vị khi check-out');
    }

    const user = await this.userModel.findById(dto.employeeId)?.lean()?.exec();
    if (!user) {
      throw new RpcException('Không tìm thấy thông tin nhân viên');
    }

    const branchId = dto.branchId || user.branchId;
    if (!branchId) {
      throw new RpcException('Nhân viên chưa được phân bổ vào chi nhánh cụ thể');
    }
    let branch: any = await this.branchModel.findOne({ branchCode: branchId })?.lean()?.exec();
    if (!branch && Types.ObjectId.isValid(branchId)) {
      branch = await this.branchModel.findById(branchId)?.lean()?.exec();
    }

    if (
      !branch ||
      branch.latitude === undefined ||
      branch.latitude === null ||
      branch.longitude === undefined ||
      branch.longitude === null
    ) {
      throw new RpcException(
        'Chi nhánh chưa được thiết lập tọa độ GPS điểm danh. Vui lòng liên hệ Quản lý chi nhánh cấu hình vị trí trước khi check-out!',
      );
    }

    const branchLat = branch.latitude;
    const branchLng = branch.longitude;
    const allowedRadius = branch?.checkInRadiusMeters ?? 200;

    const distanceMeters = calculateHaversineDistanceMeters(
      lat,
      lng,
      branchLat,
      branchLng,
    );

    // Chặn nghiêm ngặt nếu ngoài bán kính cho phép
    if (Number.isNaN(distanceMeters) || distanceMeters > allowedRadius) {
      const roundedDist = Math.round(distanceMeters || 9999);
      throw new RpcException(
        `Bạn đang ở cách chi nhánh ${roundedDist}m, vượt quá bán kính cho phép (${allowedRadius}m). Vui lòng di chuyển đến gần chi nhánh để check-out.`,
      );
    }

    const todayStr = getVietnamTodayString();
    const attendance = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        date: todayStr,
        status: { $in: [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE] },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!attendance) {
      throw new RpcException('Không tìm thấy ca trực đang mở để check-out');
    }

    // Chốt chặn INV-SHO-01: Dược sĩ bắt buộc phải nộp Phiếu Bàn Giao Ca trước khi check-out
    if (user.role === 'pharmacist' && !attendance.isHandoverSubmitted) {
      throw new RpcException(
        'Theo quy chuẩn quản lý nhà thuốc GPP, Dược sĩ phụ trách quầy bắt buộc phải hoàn thành và nộp Phiếu Bàn Giao Ca (Shift Handover) trước khi Check-out tan ca!',
      );
    }

    attendance.checkOutTime = new Date();
    attendance.checkOutLatitude = lat;
    attendance.checkOutLongitude = lng;
    attendance.status = AttendanceStatus.COMPLETED;
    if (dto.note) attendance.note = (attendance.note ? attendance.note + ' | ' : '') + dto.note;

    await attendance.save();

    return {
      success: true,
      message: 'Check-out hoàn thành ca trực thành công',
      distanceMeters: Math.round(distanceMeters),
      attendance: attendance.toObject ? attendance.toObject() : attendance,
    };
  }

  /**
   * Lấy thông tin trạng thái ca trực hiện tại của nhân viên
   */
  async getMyCurrentShiftStatus(employeeId: string, branchId?: string) {
    const user = await this.userModel.findById(employeeId).lean().exec();
    if (!user) throw new RpcException('User not found');

    const effectiveBranchId = branchId || user.branchId || 'BR-001';
    let branch: any = await this.branchModel.findOne({ branchCode: effectiveBranchId }).lean().exec();
    if (!branch && Types.ObjectId.isValid(effectiveBranchId)) {
      branch = await this.branchModel.findById(effectiveBranchId).lean().exec();
    }
    const todayStr = getVietnamTodayString();

    // 1. Kiểm tra bản ghi điểm danh hôm nay
    const todayAttendance = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        date: todayStr,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // 2. Tra cứu lịch phân ca tuần này
    const schedules = await this.workScheduleModel
      .find({ branchId: effectiveBranchId, status: 'published' })
      .lean()
      .exec();

    let matchedAssignment: any = null;
    for (const schedule of schedules) {
      const found = schedule.assignments?.find((a: any) => {
        const aDateStr = a.date ? new Date(a.date).toISOString().slice(0, 10) : '';
        return a.employeeId === employeeId && aDateStr === todayStr;
      });
      if (found) {
        matchedAssignment = found;
        break;
      }
    }

    // 3. Đánh giá tính hợp lệ của ca hiện tại
    const isCompleted = !!todayAttendance && (todayAttendance.status === AttendanceStatus.COMPLETED || !!todayAttendance.checkOutTime);
    const isCheckedIn = !!todayAttendance && [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE].includes(todayAttendance.status as any) && !isCompleted;
    const isHandoverSubmitted = !!todayAttendance?.isHandoverSubmitted;

    // Nếu có lịch phân ca và chưa kết thúc ca làm việc
    const inShift = isCheckedIn || (!!matchedAssignment && !isCompleted);

    return {
      inShift,
      isCheckedIn,
      isCompleted,
      isHandoverSubmitted,
      handoverId: todayAttendance?.handoverId || null,
      currentShift: matchedAssignment || (todayAttendance ? { name: todayAttendance.shiftName, shiftId: todayAttendance.shiftId } : null),
      attendance: todayAttendance,
      branch: branch ? {
        branchCode: branch.branchCode || effectiveBranchId,
        name: branch.name || 'Chi nhánh ' + effectiveBranchId,
        latitude: branch.latitude ?? null,
        longitude: branch.longitude ?? null,
        checkInRadiusMeters: branch.checkInRadiusMeters ?? 200,
        isGpsConfigured: branch.latitude != null && branch.longitude != null,
      } : null,
    };
  }

  /**
   * Dùng cho chốt chặn bán hàng POS (POS Shift Guard):
   * Xác nhận xem Dược sĩ có ca trực đang hoạt động và ĐÃ CHECK-IN hay chưa.
   */
  async verifyPharmacistActiveShift(pharmacistId: string, branchId?: string) {
    const status = await this.getMyCurrentShiftStatus(pharmacistId, branchId);
    if (status.isCompleted) {
      return {
        allowed: false,
        reason: 'Dược sĩ đã hoàn thành ca trực hôm nay (đã Check-out). Theo quy chuẩn GPP, chỉ Dược sĩ đang trong ca trực hợp lệ mới được thực hiện bán hàng.',
        status,
      };
    }
    if (status.isHandoverSubmitted) {
      return {
        allowed: false,
        reason: 'Ca trực đã nộp biên bản bàn giao ca và chốt két tiền mặt. Phiên bán hàng POS đã đóng.',
        status,
      };
    }
    if (!status.isCheckedIn) {
      return {
        allowed: false,
        reason: 'Dược sĩ chưa thực hiện điểm danh (Check-in) ca trực hôm nay qua ứng dụng di động. Theo quy chuẩn GPP, chỉ Dược sĩ đang trong ca trực hợp lệ mới được thực hiện bán hàng.',
        status,
      };
    }
    return {
      allowed: true,
      status,
    };
  }

  /**
   * Danh sách điểm danh hôm nay của chi nhánh (cho Quản lý theo dõi)
   */
  async getBranchTodayAttendance(branchId: string, date?: string) {
    const targetDate = date || getVietnamTodayString();
    return this.attendanceModel
      .find({ branchId, date: targetDate })
      .sort({ checkInTime: -1 })
      .lean()
      .exec();
  }

  /**
   * Lấy lịch sử điểm danh của cá nhân nhân viên
   */
  async getMyAttendanceHistory(employeeId: string, startDate?: string, endDate?: string) {
    const filter: any = { employeeId: new Types.ObjectId(employeeId) };
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    }
    return this.attendanceModel
      .find(filter)
      .sort({ date: -1, checkInTime: -1 })
      .lean()
      .exec();
  }
}
