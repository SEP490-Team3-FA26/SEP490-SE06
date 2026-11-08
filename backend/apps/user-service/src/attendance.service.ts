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

function getVietnamYesterdayString(dateObj: Date = new Date()): string {
  const vnYesterday = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000 - 24 * 3600 * 1000);
  return vnYesterday.toISOString().slice(0, 10);
}

/**
 * Helper chuyển đổi chuỗi giờ 'HH:mm' thành số phút trong ngày
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

/**
 * Kiểm tra ca làm việc có vắt qua nửa đêm hay không (VD: 22:00 - 06:00 hoặc 18:00 - 02:00)
 */
function isOvernightShift(startTime?: string, endTime?: string): boolean {
  if (!startTime || !endTime) return false;
  return parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime);
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
    const yesterdayStr = getVietnamYesterdayString();
    const now = new Date();
    // Giờ hiện tại theo VN
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const currentMinutes = vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();

    // Tìm ca phân công hiện tại của nhân viên (hỗ trợ cả 3 ca/ngày và ca đêm vắt qua 00:00 từ hôm qua)
    let assignedShiftId = dto.shiftId;
    let assignedShiftName = 'Ca mặc định';
    let attendanceDateStr = todayStr;
    let isLate = false;

    // Tra cứu lịch phân ca đã đăng trong work_schedules
    const schedules = await this.workScheduleModel
      .find({ branchId, status: 'published' })
      .lean()
      .exec();

    const candidateAssignments: Array<{ assign: any; dateStr: string; isYesterdayOvernight: boolean }> = [];
    for (const schedule of schedules) {
      for (const a of schedule.assignments || []) {
        if (String(a.employeeId) !== String(dto.employeeId)) continue;
        const aDateStr = a.date ? new Date(a.date).toISOString().slice(0, 10) : '';
        if (aDateStr === todayStr) {
          candidateAssignments.push({ assign: a, dateStr: todayStr, isYesterdayOvernight: false });
        } else if (
          aDateStr === yesterdayStr &&
          isOvernightShift(a.shiftStart, a.shiftEnd) &&
          currentMinutes <= parseTimeToMinutes(a.shiftEnd) + 120
        ) {
          candidateAssignments.push({ assign: a, dateStr: yesterdayStr, isYesterdayOvernight: true });
        }
      }
    }

    let matchedCandidate: { assign: any; dateStr: string; isYesterdayOvernight: boolean } | null = null;
    if (candidateAssignments.length > 0) {
      if (dto.shiftId) {
        matchedCandidate =
          candidateAssignments.find((c) => String(c.assign.shiftId) === String(dto.shiftId)) ||
          candidateAssignments[0];
      } else {
        // Nếu có nhiều ca trong ngày (hoặc ca đêm hôm qua), ưu tiên ca có khoảng cách tới giờ hiện tại nhỏ nhất
        matchedCandidate = candidateAssignments.reduce((best, curr) => {
          const bestStart = parseTimeToMinutes(best.assign.shiftStart);
          const bestEffNow = best.isYesterdayOvernight ? currentMinutes + 1440 : currentMinutes;
          const currStart = parseTimeToMinutes(curr.assign.shiftStart);
          const currEffNow = curr.isYesterdayOvernight ? currentMinutes + 1440 : currentMinutes;
          const bestDiff = Math.abs(bestEffNow - bestStart);
          const currDiff = Math.abs(currEffNow - currStart);
          return currDiff < bestDiff ? curr : best;
        }, candidateAssignments[0]);
      }
    }

    const matchedAssignment = matchedCandidate?.assign || null;
    if (matchedCandidate) {
      attendanceDateStr = matchedCandidate.dateStr;
      assignedShiftId = matchedAssignment.shiftId;
      assignedShiftName = matchedAssignment.shiftName;
      const startMin = parseTimeToMinutes(matchedAssignment.shiftStart);
      const effectiveCurrentMin = matchedCandidate.isYesterdayOvernight
        ? currentMinutes + 1440
        : currentMinutes;
      // Nếu check-in trễ quá 15 phút so với giờ bắt đầu ca
      if (effectiveCurrentMin > startMin + 15) {
        isLate = true;
      }
    } else if (dto.shiftId) {
      const shift = await this.workShiftModel.findById(dto.shiftId).lean().exec();
      if (shift) {
        assignedShiftName = shift.name;
        const startMin = parseTimeToMinutes(shift.startTime);
        const overnight = isOvernightShift(shift.startTime, shift.endTime);
        const effectiveCurrentMin =
          overnight && currentMinutes <= parseTimeToMinutes(shift.endTime) + 120
            ? currentMinutes + 1440
            : currentMinutes;
        if (effectiveCurrentMin > startMin + 15) {
          isLate = true;
        }
      }
    }

    const effectiveShiftId = assignedShiftId || 'DEFAULT';

    // Kiểm tra xem đã check-in ca này chưa (hoặc đã có bản ghi DEFAULT đang mở trong ngày để tránh tạo trùng)
    let existing = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        date: attendanceDateStr,
        shiftId: effectiveShiftId,
      })
      .exec();

    if (!existing) {
      existing = await this.attendanceModel
        .findOne({
          employeeId: new Types.ObjectId(dto.employeeId),
          date: attendanceDateStr,
          $or: [
            { shiftId: 'DEFAULT', status: { $in: [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE] } },
            ...(effectiveShiftId === 'DEFAULT'
              ? [{ status: { $in: [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE] } }]
              : []),
          ],
        })
        .exec();
    }

    if (existing) {
      // Giữ nguyên checkInTime ban đầu để tránh dời giờ vào ca của nhân viên
      if (existing.shiftId === 'DEFAULT' && effectiveShiftId !== 'DEFAULT') {
        existing.shiftId = effectiveShiftId;
        existing.shiftName = assignedShiftName;
      }
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
      date: attendanceDateStr,
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
    const yesterdayStr = getVietnamYesterdayString();
    const attendance = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        date: { $in: [todayStr, yesterdayStr] },
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
    const yesterdayStr = getVietnamYesterdayString();
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const currentMinutes = vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();
    const recentOpenLimit = new Date(Date.now() - 14 * 3600 * 1000);

    // 1. Kiểm tra bản ghi điểm danh hôm nay (hoặc ca đêm mở từ hôm qua chưa quá 14 tiếng)
    const todayAttendance = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        $or: [
          { date: todayStr },
          {
            date: yesterdayStr,
            status: { $in: [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE] },
            checkOutTime: null,
            checkInTime: { $gte: recentOpenLimit },
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // 2. Tra cứu lịch phân ca tuần này (hỗ trợ nhiều ca/ngày và ca đêm vắt qua 00:00)
    const schedules = await this.workScheduleModel
      .find({ branchId: effectiveBranchId, status: 'published' })
      .lean()
      .exec();

    const candidateAssignments: any[] = [];
    for (const schedule of schedules) {
      for (const a of schedule.assignments || []) {
        if (String(a.employeeId) !== String(employeeId)) continue;
        const aDateStr = a.date ? new Date(a.date).toISOString().slice(0, 10) : '';
        if (aDateStr === todayStr) {
          candidateAssignments.push(a);
        } else if (
          aDateStr === yesterdayStr &&
          isOvernightShift(a.shiftStart, a.shiftEnd) &&
          currentMinutes <= parseTimeToMinutes(a.shiftEnd) + 120
        ) {
          candidateAssignments.push(a);
        }
      }
    }

    let matchedAssignment: any = null;
    if (candidateAssignments.length > 0) {
      matchedAssignment = candidateAssignments.reduce((best, curr) => {
        const bestDiff = Math.abs(parseTimeToMinutes(best.shiftStart) - currentMinutes);
        const currDiff = Math.abs(parseTimeToMinutes(curr.shiftStart) - currentMinutes);
        return currDiff < bestDiff ? curr : best;
      }, candidateAssignments[0]);
    }

    // 3. Đánh giá tính hợp lệ của ca hiện tại (Nếu có ca 2 trong ngày khác với ca 1 đã đóng, cho phép vào ca 2)
    const rawCompleted =
      !!todayAttendance &&
      (todayAttendance.status === AttendanceStatus.COMPLETED || !!todayAttendance.checkOutTime);
    const hasNextDistinctShift =
      rawCompleted &&
      !!matchedAssignment &&
      todayAttendance?.shiftId &&
      todayAttendance.shiftId !== 'DEFAULT' &&
      String(matchedAssignment.shiftId) !== String(todayAttendance.shiftId) &&
      currentMinutes >= parseTimeToMinutes(matchedAssignment.shiftStart) - 30;

    const isCompleted = rawCompleted && !hasNextDistinctShift;
    const isCheckedIn =
      !!todayAttendance &&
      [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE].includes(todayAttendance.status as any) &&
      !rawCompleted;
    const isHandoverSubmitted = !hasNextDistinctShift && !!todayAttendance?.isHandoverSubmitted;

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

  /**
   * Lấy lịch sử điểm danh & chấm công toàn diện của chi nhánh (cho Quản lý theo dõi & đối soát)
   */
  async getBranchAttendanceHistory(
    branchId: string,
    query: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      shiftId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const filter: any = { branchId };

    // Lọc theo khoảng ngày (YYYY-MM-DD)
    if (query.startDate && query.endDate) {
      filter.date = { $gte: query.startDate, $lte: query.endDate };
    } else if (query.startDate) {
      filter.date = { $gte: query.startDate };
    } else if (query.endDate) {
      filter.date = { $lte: query.endDate };
    }

    // Lọc theo nhân viên cụ thể
    if (query.employeeId) {
      if (Types.ObjectId.isValid(query.employeeId)) {
        filter.employeeId = new Types.ObjectId(query.employeeId);
      } else {
        filter.employeeId = query.employeeId;
      }
    }

    // Lọc theo ca làm việc
    if (query.shiftId) {
      filter.shiftId = query.shiftId;
    }

    const todayStr = getVietnamTodayString();

    // Lọc theo trạng thái
    if (query.status && query.status !== 'ALL') {
      if (query.status === 'MISSING_CHECKOUT') {
        filter.status = { $in: [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE] };
        filter.checkOutTime = null;
        filter.isHandoverSubmitted = { $ne: true };
        filter.date = filter.date ? { ...filter.date, $lt: todayStr } : { $lt: todayStr };
      } else {
        filter.status = query.status;
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, records, allFiltered] = await Promise.all([
      this.attendanceModel.countDocuments(filter).exec(),
      this.attendanceModel
        .find(filter)
        .sort({ date: -1, checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.attendanceModel
        .find(filter)
        .select('date status checkInTime checkOutTime isHandoverSubmitted checkInDistanceMeters isMockLocation')
        .lean()
        .exec(),
    ]);

    let onTimeCount = 0;
    let lateCount = 0;
    let completedCount = 0;
    let onLeaveCount = 0;
    let inProgressCount = 0;
    let missingCheckoutCount = 0;

    const yesterdayStr = getVietnamYesterdayString();
    const activeOvernightCutoffMs = Date.now() - 12 * 3600 * 1000;

    for (const rec of allFiltered) {
      const isShiftEnded = rec.status === AttendanceStatus.COMPLETED || !!rec.checkOutTime || !!rec.isHandoverSubmitted;
      const isActiveOvernight =
        !isShiftEnded &&
        rec.date === yesterdayStr &&
        Boolean(rec.checkInTime && new Date(rec.checkInTime).getTime() >= activeOvernightCutoffMs);
      const isPastDay = Boolean(rec.date && rec.date < todayStr && !isActiveOvernight);

      if (isShiftEnded) {
        completedCount++;
        if (rec.status === AttendanceStatus.LATE) {
          lateCount++;
        }
      } else if (rec.status === AttendanceStatus.ON_LEAVE_PAID || rec.status === AttendanceStatus.ON_LEAVE_UNPAID) {
        onLeaveCount++;
      } else if (rec.status === AttendanceStatus.CHECKED_IN || rec.status === AttendanceStatus.LATE) {
        if (rec.status === AttendanceStatus.LATE) {
          lateCount++;
        }
        if (isPastDay) {
          missingCheckoutCount++;
        } else {
          inProgressCount++;
        }
      }

      if (rec.checkInTime && rec.status !== AttendanceStatus.LATE && rec.status !== AttendanceStatus.ABSENT) {
        onTimeCount++;
      }
    }

    const items = records.map((rec: any) => {
      let durationMinutes: number | null = null;
      const effectiveCheckOut = rec.checkOutTime || (rec.isHandoverSubmitted ? (rec.updatedAt || rec.createdAt) : null);
      if (rec.checkInTime && effectiveCheckOut) {
        durationMinutes = Math.max(1, Math.round((new Date(effectiveCheckOut).getTime() - new Date(rec.checkInTime).getTime()) / 60000));
      }
      const isShiftEnded = rec.status === AttendanceStatus.COMPLETED || !!effectiveCheckOut || !!rec.isHandoverSubmitted;
      const isActiveOvernight =
        !isShiftEnded &&
        rec.date === yesterdayStr &&
        Boolean(rec.checkInTime && new Date(rec.checkInTime).getTime() >= activeOvernightCutoffMs);
      const isPastDay = Boolean(rec.date && rec.date < todayStr && !isActiveOvernight);
      const isPastUnclosed = !isShiftEnded && isPastDay && (rec.status === AttendanceStatus.CHECKED_IN || rec.status === AttendanceStatus.LATE);

      return {
        ...rec,
        checkOutTime: effectiveCheckOut,
        durationMinutes,
        isPastUnclosed,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalRecords: total,
        onTimeCount,
        lateCount,
        completedCount,
        inProgressCount,
        missingCheckoutCount,
        onLeaveCount,
      },
    };
  }

  /**
   * Quản lý chi nhánh chốt đóng ca bổ sung cho các phiên ca quên check-out
   */
  async managerCloseShift(dto: {
    attendanceId: string;
    branchId: string;
    requesterRole?: string;
    managerName?: string;
    checkOutTime?: string;
    note?: string;
  }) {
    if (!dto.attendanceId || !Types.ObjectId.isValid(dto.attendanceId)) {
      throw new RpcException('Mã bản ghi điểm danh không hợp lệ');
    }

    const attendance = await this.attendanceModel.findById(dto.attendanceId).exec();
    if (!attendance) {
      throw new RpcException('Không tìm thấy bản ghi điểm danh');
    }

    if (dto.requesterRole === 'branch' && dto.branchId && attendance.branchId !== dto.branchId) {
      throw new RpcException('Bạn không có quyền chốt ca của chi nhánh khác');
    }

    const checkInMs = attendance.checkInTime ? new Date(attendance.checkInTime).getTime() : Date.now() - 8 * 3600 * 1000;
    let resolvedCheckOut = new Date(checkInMs + 8 * 3600 * 1000);
    if (dto.checkOutTime) {
      const parsed = new Date(dto.checkOutTime);
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > checkInMs) {
        resolvedCheckOut = parsed;
      }
    }

    attendance.checkOutTime = resolvedCheckOut;
    attendance.isHandoverSubmitted = true;
    // Nếu trước đó nhân viên đi muộn (LATE), giữ nguyên cờ LATE nhưng đã có checkOutTime để vừa ghi nhận hoàn thành ca vừa giữ lịch sử đi muộn
    if (attendance.status !== AttendanceStatus.LATE) {
      attendance.status = AttendanceStatus.COMPLETED;
    }

    const closeReason = dto.note?.trim() || `Quản lý ${dto.managerName || 'chi nhánh'} chốt đóng ca bổ sung (8h tiêu chuẩn)`;
    attendance.note = attendance.note ? `${attendance.note} | ${closeReason}` : closeReason;

    await attendance.save();
    return {
      success: true,
      message: 'Đã chốt đóng ca bổ sung thành công',
      attendance: attendance.toObject ? attendance.toObject() : attendance,
    };
  }
}
