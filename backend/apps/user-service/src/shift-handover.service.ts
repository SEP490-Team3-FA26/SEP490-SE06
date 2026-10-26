import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { ShiftHandover, ShiftHandoverDocument, ShiftHandoverStatus } from './schemas/shift-handover.schema';
import { Attendance, AttendanceDocument, AttendanceStatus } from './schemas/attendance.schema';
import { WorkShift } from './schemas/work-shift.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';
import { Medicine } from '../../inventory-service/src/medicine/schemas/medicine.schema';

function getVietnamTodayString(dateObj: Date = new Date()): string {
  const vnTime = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

@Injectable()
export class ShiftHandoverService {
  private readonly logger = new Logger(ShiftHandoverService.name);

  constructor(
    @InjectModel(ShiftHandover.name) private readonly handoverModel: Model<ShiftHandoverDocument>,
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(WorkShift.name) private readonly workShiftModel: Model<WorkShift>,
    @InjectModel(WorkSchedule.name) private readonly workScheduleModel: Model<WorkSchedule>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
  ) {}

  /**
   * Lấy thông số ca trực và danh sách thuốc GPP nhạy cảm phục vụ lập biên bản bàn giao
   */
  async getShiftLiveStats(payload: { employeeId: string; branchId?: string; shiftId?: string }) {
    if (!payload.employeeId || !Types.ObjectId.isValid(payload.employeeId)) {
      throw new RpcException('Mã nhân viên không hợp lệ');
    }
    const todayStr = getVietnamTodayString();
    const user = await this.userModel.findById(payload.employeeId).lean().exec();
    if (!user) throw new RpcException('Không tìm thấy thông tin nhân viên');

    const branchId = payload.branchId || user.branchId || 'BR-001';

    // 1. Tìm bản ghi điểm danh hiện tại của nhân viên
    const attendance = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(payload.employeeId),
        date: todayStr,
        status: { $in: [AttendanceStatus.CHECKED_IN, AttendanceStatus.LATE, AttendanceStatus.COMPLETED] },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // 2. Tìm ca làm việc tương ứng
    let shift = null;
    const shiftId = payload.shiftId || attendance?.shiftId;
    if (shiftId && shiftId !== 'DEFAULT') {
      shift = await this.workShiftModel.findOne({ shiftCode: shiftId }).lean().exec();
      if (!shift && Types.ObjectId.isValid(shiftId)) {
        shift = await this.workShiftModel.findById(shiftId).lean().exec();
      }
    }

    // 3. Tiền mặt đầu ca (Opening Float): mặc định 1.000.000₫ hoặc lấy từ retainedFloat ca trước gần nhất
    const lastHandover = await this.handoverModel
      .findOne({ branchId, status: ShiftHandoverStatus.ACCEPTED })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const openingFloat = lastHandover?.retainedFloatForNextShift ?? 1000000;

    // 4. Lấy danh sách 5 thuốc kiểm soát đặc biệt (hoặc kháng sinh kê đơn GPP) tại chi nhánh để kiểm kê
    const controlledMeds = await this.medicineModel
      .find({
        $or: [
          { prescriptionRequired: true },
          { category: { $regex: /kê đơn|đặc biệt|kháng sinh/i } },
        ],
      })
      .limit(6)
      .lean()
      .exec();

    const controlledDrugsChecklist = controlledMeds.map((m: any) => {
      // Dùng ?? để tránh lỗi falsy khi tồn kho bằng 0
      const stock = m.totalQuantity ?? m.stockQuantity ?? 0;
      return {
        medicineId: m._id.toString(),
        medicineName: m.name,
        unit: m.unit || 'Hộp',
        systemStock: stock,
        actualCount: stock,
        isMatched: true,
        note: 'Tủ thuốc GPP niêm phong nguyên vẹn',
      };
    });

    // Kiểm tra xem đã có bản ghi bàn giao nào được nộp hôm nay chưa
    const existingHandover = await this.handoverModel
      .findOne({
        outgoingPharmacistId: new Types.ObjectId(payload.employeeId),
        handoverDate: todayStr,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return {
      branchId,
      handoverDate: todayStr,
      employeeId: payload.employeeId,
      employeeName: user.fullName,
      shiftId: shift?.shiftCode || shiftId || 'CA_SANG',
      shiftName: shift?.shiftName || attendance?.shiftName || 'Ca làm việc chính',
      attendanceId: attendance?._id?.toString() || null,
      isCheckedIn: !!attendance?.checkInTime,
      checkInTime: attendance?.checkInTime || null,
      openingFloat,
      controlledDrugsChecklist,
      existingHandover,
      isHandoverSubmitted: !!existingHandover || !!attendance?.isHandoverSubmitted,
    };
  }

  /**
   * Nộp biên bản bàn giao ca (Shift Handover)
   */
  async submitHandover(dto: {
    employeeId: string;
    branchId: string;
    shiftId: string;
    shiftName: string;
    openingFloat: number;
    systemCashSales: number;
    systemDigitalSales: number;
    systemOrderCount: number;
    pettyExpenses?: number;
    actualCashAmount: number;
    cashDenominations?: Record<string, number>;
    retainedFloatForNextShift?: number;
    safeDropAmount?: number;
    discrepancyReason?: string;
    controlledDrugsHandover?: any[];
    pendingOrdersNote?: string;
    generalShiftNotes?: string;
    incomingPharmacistId?: string;
    incomingPharmacistName?: string;
  }) {
    if (!dto.employeeId || !Types.ObjectId.isValid(dto.employeeId)) {
      throw new RpcException('Mã nhân viên không hợp lệ');
    }
    const todayStr = getVietnamTodayString();
    const user = await this.userModel.findById(dto.employeeId).lean().exec();
    if (!user) throw new RpcException('Không tìm thấy thông tin Dược sĩ bàn giao');

    const branchId = dto.branchId || user.branchId || 'BR-001';

    // 1. Kiểm tra Attendance
    const attendance = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        date: todayStr,
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!attendance) {
      throw new RpcException('Không tìm thấy dữ liệu điểm danh ca trực hôm nay để bàn giao');
    }

    // 2. Tính toán tiền mặt lý thuyết phía server (INV-SHO-02)
    let openingFloat = Number(dto.openingFloat);
    if (isNaN(openingFloat) || openingFloat < 0) {
      const lastHandover = await this.handoverModel
        .findOne({ branchId, status: ShiftHandoverStatus.ACCEPTED })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      openingFloat = lastHandover?.retainedFloatForNextShift ?? 1000000;
    }

    const systemCashSales = Number(dto.systemCashSales) || 0;
    const pettyExpenses = Math.max(0, Number(dto.pettyExpenses) || 0);
    const expectedCashAmount = openingFloat + systemCashSales - pettyExpenses;
    const actualCashAmount = Math.max(0, Number(dto.actualCashAmount) || 0);
    const cashDiscrepancy = actualCashAmount - expectedCashAmount;

    // 3. Ràng buộc giải trình khi hụt két (INV-SHO-03: Chỉ bắt buộc khi âm tiền)
    if (cashDiscrepancy < 0) {
      if (!dto.discrepancyReason || dto.discrepancyReason.trim().length < 10) {
        throw new RpcException(
          `Két tiền bị thiếu hụt ${cashDiscrepancy.toLocaleString('vi-VN')}₫. Bắt buộc nhập lý do giải trình cụ thể (tối thiểu 10 ký tự) trước khi nộp biên bản!`,
        );
      }
    }

    // Tránh lỗi falsy khi người dùng nhập số 0 cho tiền lẻ hoặc nộp két
    const retainedFloat = (dto.retainedFloatForNextShift !== undefined && !isNaN(Number(dto.retainedFloatForNextShift)))
      ? Number(dto.retainedFloatForNextShift)
      : 1000000;
    const safeDrop = (dto.safeDropAmount !== undefined && !isNaN(Number(dto.safeDropAmount)))
      ? Number(dto.safeDropAmount)
      : Math.max(0, actualCashAmount - retainedFloat);

    // 4. Tạo hoặc cập nhật bản ghi ShiftHandover
    let handover = await this.handoverModel
      .findOne({
        outgoingPharmacistId: new Types.ObjectId(dto.employeeId),
        handoverDate: todayStr,
        shiftId: dto.shiftId,
      })
      .exec();

    if (handover && handover.status === ShiftHandoverStatus.ACCEPTED) {
      throw new RpcException('Biên bản bàn giao ca này đã được bên nhận xác nhận, không thể chỉnh sửa!');
    }

    if (!handover) {
      handover = new this.handoverModel({
        branchId,
        shiftId: dto.shiftId,
        shiftName: dto.shiftName || 'Ca làm việc',
        handoverDate: todayStr,
        outgoingPharmacistId: new Types.ObjectId(dto.employeeId),
        outgoingPharmacistName: user.fullName,
        incomingPharmacistId: dto.incomingPharmacistId ? new Types.ObjectId(dto.incomingPharmacistId) : null,
        incomingPharmacistName: dto.incomingPharmacistName || null,
        attendanceId: attendance._id,
        openingFloat,
        systemCashSales,
        systemDigitalSales: Number(dto.systemDigitalSales) || 0,
        systemOrderCount: Number(dto.systemOrderCount) || 0,
        pettyExpenses,
        expectedCashAmount,
        actualCashAmount,
        cashDiscrepancy,
        discrepancyReason: dto.discrepancyReason || '',
        cashDenominations: dto.cashDenominations || {},
        retainedFloatForNextShift: retainedFloat,
        safeDropAmount: safeDrop,
        controlledDrugsHandover: dto.controlledDrugsHandover || [],
        pendingOrdersNote: dto.pendingOrdersNote || '',
        generalShiftNotes: dto.generalShiftNotes || '',
        status: ShiftHandoverStatus.SUBMITTED,
        submittedAt: new Date(),
      });
    } else {
      handover.openingFloat = openingFloat;
      handover.systemCashSales = systemCashSales;
      handover.systemDigitalSales = Number(dto.systemDigitalSales) || 0;
      handover.systemOrderCount = Number(dto.systemOrderCount) || 0;
      handover.pettyExpenses = pettyExpenses;
      handover.expectedCashAmount = expectedCashAmount;
      handover.actualCashAmount = actualCashAmount;
      handover.cashDiscrepancy = cashDiscrepancy;
      handover.discrepancyReason = dto.discrepancyReason || '';
      handover.cashDenominations = dto.cashDenominations || {};
      handover.retainedFloatForNextShift = retainedFloat;
      handover.safeDropAmount = safeDrop;
      handover.controlledDrugsHandover = dto.controlledDrugsHandover || [];
      handover.pendingOrdersNote = dto.pendingOrdersNote || '';
      handover.generalShiftNotes = dto.generalShiftNotes || '';
      handover.status = ShiftHandoverStatus.SUBMITTED;
      handover.submittedAt = new Date();
    }

    await handover.save();

    // 5. Cập nhật Attendance để đánh dấu đã nộp bàn giao ca & khóa POS (INV-SHO-04)
    attendance.handoverId = handover._id as Types.ObjectId;
    attendance.isHandoverSubmitted = true;
    await attendance.save();

    return {
      success: true,
      message: 'Nộp biên bản bàn giao ca thành công! Bạn có thể thực hiện Check-out tan ca.',
      handover: handover.toObject ? handover.toObject() : handover,
    };
  }

  /**
   * Xác nhận tiếp nhận bàn giao ca (bởi Dược sĩ ca sau hoặc Quản lý chi nhánh)
   */
  async acceptHandover(id: string, user: { userId: string; fullName: string; branchId: string; role: string }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new RpcException('Mã biên bản bàn giao không hợp lệ');
    }

    const handover = await this.handoverModel.findById(id).exec();
    if (!handover) {
      throw new RpcException('Không tìm thấy biên bản bàn giao ca');
    }

    // Bảo vệ IDOR chi nhánh (INV-SHO-05)
    if (user.role !== 'admin' && user.branchId && handover.branchId !== user.branchId) {
      throw new RpcException('Bạn không có quyền xác nhận biên bản của chi nhánh khác');
    }

    // Không được tự giao tự nhận (trừ quản lý duyệt ca đêm)
    if (handover.outgoingPharmacistId.toString() === user.userId && user.role !== 'branch' && user.role !== 'admin') {
      throw new RpcException('Dược sĩ giao ca không thể tự xác nhận biên bản của chính mình');
    }

    handover.incomingPharmacistId = new Types.ObjectId(user.userId);
    handover.incomingPharmacistName = user.fullName;
    handover.status = ShiftHandoverStatus.ACCEPTED;
    handover.acceptedAt = new Date();
    await handover.save();

    // Cập nhật Attendance tương ứng
    await this.attendanceModel.findByIdAndUpdate(handover.attendanceId, {
      isHandoverCompleted: true,
    });

    return {
      success: true,
      message: 'Xác nhận tiếp nhận ca trực và két tiền thành công',
      handover: handover.toObject ? handover.toObject() : handover,
    };
  }

  /**
   * Lấy lịch sử biên bản bàn giao ca theo chi nhánh
   */
  async getHandoverHistory(query: { branchId: string; date?: string; limit?: number }) {
    const filter: any = {};
    if (query.branchId && query.branchId !== 'all') {
      filter.branchId = query.branchId;
    }
    if (query.date) {
      filter.handoverDate = query.date;
    }

    const handovers = await this.handoverModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit || 50)
      .lean()
      .exec();

    return {
      count: handovers.length,
      handovers,
    };
  }

  /**
   * Lấy chi tiết một biên bản bàn giao ca
   */
  async getHandoverDetail(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new RpcException('ID không hợp lệ');
    const handover = await this.handoverModel.findById(id).lean().exec();
    if (!handover) throw new RpcException('Không tìm thấy biên bản bàn giao');
    return handover;
  }
}
