import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Payroll, PayrollDocument, PayrollStatus, PayrollItem } from './schemas/payroll.schema';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';
import { StaffCertificate, StaffCertificateDocument, CertificateStatus } from './schemas/staff-certificate.schema';
import { SalesOrder } from '../../inventory-service/src/sales/schemas/sales-order.schema';

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Payroll.name) private readonly payrollModel: Model<PayrollDocument>,
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(StaffCertificate.name) private readonly certificateModel: Model<StaffCertificateDocument>,
    @InjectModel(SalesOrder.name) private readonly salesOrderModel: Model<SalesOrder>,
  ) {}

  /**
   * Tính toán bảng lương dự thảo (Draft) cho toàn bộ nhân sự chi nhánh trong tháng
   */
  async calculateMonthlyPayroll(dto: {
    branchId: string;
    month: number;
    year: number;
    mealAllowanceRate?: number;
    managerId?: string;
    managerName?: string;
    requesterBranchId?: string;
    requesterRole?: string;
  }) {
    const { branchId, month, year, mealAllowanceRate: rawMealRate, managerId, managerName, requesterBranchId, requesterRole } = dto;
    const mealAllowanceRate = rawMealRate && Number(rawMealRate) > 0 ? Number(rawMealRate) : 35000;

    if (requesterRole === 'branch' && requesterBranchId && branchId !== requesterBranchId) {
      throw new RpcException('Bạn không có quyền tính bảng lương cho chi nhánh khác');
    }

    // 1. Kiểm tra nếu bảng lương đã được duyệt hoặc thanh toán -> Không cho tính đè
    const existingPayroll = await this.payrollModel.findOne({ branchId, month, year }).exec();
    if (existingPayroll && [PayrollStatus.APPROVED, PayrollStatus.PAID].includes(existingPayroll.status)) {
      throw new RpcException(
        `Bảng lương tháng ${month}/${year} của chi nhánh ${branchId} đã được duyệt (${existingPayroll.status}), không thể tính toán lại.`,
      );
    }

    // 2. Lấy danh sách toàn bộ nhân viên thuộc chi nhánh (pharmacist, branch, warehouse)
    const employees = await this.userModel
      .find({
        branchId,
        role: { $in: ['pharmacist', 'branch', 'warehouse'] },
        isActive: true,
      })
      .lean()
      .exec();

    if (!employees || employees.length === 0) {
      throw new RpcException(`Không tìm thấy nhân viên nào đang hoạt động tại chi nhánh ${branchId}`);
    }

    // 3. Khung thời gian của tháng (từ ngày 01 đến ngày cuối tháng)
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
    const startDateTime = new Date(`${startDateStr}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDateStr}T23:59:59.999Z`);

    const standardShifts = 26; // Định mức 26 ca/tháng chuẩn ngành Dược

    // 4. Tính toán cho từng nhân viên
    const payrollItems: PayrollItem[] = [];
    let totalGross = 0;
    let totalNet = 0;

    for (const emp of employees) {
      const empId = (emp._id as any).toString();
      const baseSalary = emp.baseSalary && emp.baseSalary > 0 ? emp.baseSalary : 7500000;
      const shiftRate = Math.round(baseSalary / standardShifts);

      // 4.1 Thống kê Chấm công thực tế từ collection attendances (bao gồm cả nghỉ phép hưởng lương)
      const attendances = await this.attendanceModel
        .find({
          employeeId: new Types.ObjectId(empId),
          date: { $gte: startDateStr, $lte: endDateStr },
          status: { $in: ['CHECKED_IN', 'COMPLETED', 'LATE', 'ON_LEAVE_PAID'] },
        })
        .lean()
        .exec();

      const actualShifts = attendances.length;
      const missingShifts = Math.max(0, standardShifts - actualShifts);
      const otShifts = Math.max(0, actualShifts - standardShifts);
      const lateCount = attendances.filter((a) => a.status === 'LATE').length;
      const lateMinutes = lateCount * 15;

      // Tiền lương theo ca thực tế (đủ định mức thì nhận trọn lương cơ bản chuẩn)
      const standardSalary = actualShifts >= standardShifts
        ? baseSalary
        : Math.round(actualShifts * shiftRate);
      // Lương làm thêm giờ OT (hệ số 1.5)
      const otSalary = Math.round(otShifts * shiftRate * 1.5);

      // 4.2 Thống kê Phụ cấp Bằng cấp & CCHN từ StaffCertificate đã duyệt
      const approvedCerts = await this.certificateModel
        .find({
          userId: new Types.ObjectId(empId),
          status: CertificateStatus.DA_DUYET,
        })
        .lean()
        .exec();

      let certificateAllowance = 0;
      for (const cert of approvedCerts) {
        certificateAllowance += cert.monthlyAllowance || 0;
      }
      if (certificateAllowance === 0 && emp.certificateAllowance) {
        certificateAllowance = emp.certificateAllowance;
      }

      // 4.3 Phụ cấp trách nhiệm Dược sĩ Phụ trách chuyên môn (PTCM) chi nhánh
      const isPIC = !!emp.isBranchPIC || approvedCerts.some((c) => c.isBranchPIC);
      const picAllowance = isPIC ? 3000000 : 0;

      // 4.4 Phụ cấp ăn trưa: tính theo định mức chung của chi nhánh (mặc định 50.000đ/ca, hoặc 60.000đ/ca do Quản lý cấu hình)
      const mealAllowance = actualShifts * mealAllowanceRate;

      // 4.5 Phụ cấp ca đêm (nếu có ca làm việc đêm): tạm tính 0 nếu không có ca đêm
      const nightShiftAllowance = 0;

      // 4.6 Doanh số bán hàng POS cá nhân và Hoa hồng (1.0%)
      const sales = await this.salesOrderModel
        .find({
          branchId,
          soldBy: emp.fullName,
          createdAt: { $gte: startDateTime, $lte: endDateTime },
        })
        .lean()
        .exec();

      let personalSalesRevenue = 0;
      for (const s of sales) {
        personalSalesRevenue += s.totalAmount || 0;
      }
      const commissionRate = 1.0; // 1%
      const commissionAmount = Math.round(personalSalesRevenue * 0.01);

      // 4.7 Thưởng chi nhánh & Khấu trừ vi phạm
      const branchBonus = 0; // Có thể điều chỉnh thủ công
      const penalties = lateCount * 50000; // Phạt 50k cho mỗi lần đi muộn

      // 4.8 Tổng thu nhập Gross và Lương thực lĩnh Net
      const grossSalary =
        standardSalary +
        otSalary +
        certificateAllowance +
        picAllowance +
        mealAllowance +
        nightShiftAllowance +
        commissionAmount +
        branchBonus;

      const netSalary = Math.max(0, grossSalary - penalties);

      totalGross += grossSalary;
      totalNet += netSalary;

      payrollItems.push({
        employeeId: new Types.ObjectId(empId),
        employeeName: emp.fullName,
        role: emp.role,
        baseSalary,
        standardShifts,
        actualShifts,
        missingShifts,
        lateMinutes,
        otShifts,
        standardSalary,
        shiftRate,
        otSalary,
        certificateAllowance,
        picAllowance,
        mealAllowanceRate,
        mealAllowance,
        nightShiftAllowance,
        personalSalesRevenue,
        commissionRate,
        commissionAmount,
        branchBonus,
        penalties,
        manualAdjustment: 0,
        grossSalary,
        netSalary,
        adjustmentNote: '',
      });
    }

    // 5. Lưu vào MongoDB collection `payrolls`
    const payload = {
      branchId,
      month,
      year,
      status: PayrollStatus.DRAFT,
      mealAllowanceRate,
      totalGross,
      totalNet,
      items: payrollItems,
      calculatedBy: managerId && Types.ObjectId.isValid(managerId) ? new Types.ObjectId(managerId) : null,
      calculatedByName: managerName || 'Hệ thống tự động',
    };

    const savedPayroll = await this.payrollModel.findOneAndUpdate(
      { branchId, month, year },
      { $set: payload },
      { upsert: true, new: true },
    ).lean().exec();

    return savedPayroll;
  }

  /**
   * Danh sách bảng lương của chi nhánh
   */
  async listPayrolls(branchId?: string, year?: number) {
    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    if (year) filter.year = Number(year);
    return this.payrollModel.find(filter).sort({ year: -1, month: -1 }).lean().exec();
  }

  /**
   * Xem chi tiết bảng lương
   */
  async getPayrollDetail(payrollId: string, requesterBranchId?: string, requesterRole?: string) {
    const payroll = await this.payrollModel.findById(payrollId).lean().exec();
    if (!payroll) throw new RpcException('Không tìm thấy bảng lương');
    if (requesterRole === 'branch' && requesterBranchId && payroll.branchId !== requesterBranchId) {
      throw new RpcException('Bạn không có quyền truy cập bảng lương của chi nhánh khác');
    }
    return payroll;
  }

  /**
   * Quản lý điều chỉnh tay thưởng/phạt hoặc ghi chú cho một nhân viên trước khi gửi duyệt
   */
  async adjustPayrollItem(dto: {
    payrollId: string;
    employeeId: string;
    manualAdjustment: number;
    penalties?: number;
    adjustmentNote?: string;
    requesterBranchId?: string;
    requesterRole?: string;
  }) {
    const payroll = await this.payrollModel.findById(dto.payrollId).exec();
    if (!payroll) throw new RpcException('Không tìm thấy bảng lương');
    if (dto.requesterRole === 'branch' && dto.requesterBranchId && payroll.branchId !== dto.requesterBranchId) {
      throw new RpcException('Bạn không có quyền điều chỉnh bảng lương của chi nhánh khác');
    }
    if ([PayrollStatus.APPROVED, PayrollStatus.PAID].includes(payroll.status)) {
      throw new RpcException('Bảng lương đã được phê duyệt, không thể điều chỉnh');
    }

    const item = payroll.items.find((i) => i.employeeId.toString() === dto.employeeId);
    if (!item) throw new RpcException('Không tìm thấy nhân viên trong bảng lương');

    if (dto.manualAdjustment !== undefined) item.manualAdjustment = dto.manualAdjustment;
    if (dto.penalties !== undefined) item.penalties = dto.penalties;
    if (dto.adjustmentNote !== undefined) item.adjustmentNote = dto.adjustmentNote;

    // Tính lại Gross và Net cho item
    item.grossSalary =
      item.standardSalary +
      item.otSalary +
      item.certificateAllowance +
      item.picAllowance +
      item.mealAllowance +
      item.nightShiftAllowance +
      item.commissionAmount +
      item.branchBonus +
      item.manualAdjustment;

    item.netSalary = Math.max(0, item.grossSalary - item.penalties);

    // Tính lại tổng bảng lương
    payroll.totalGross = payroll.items.reduce((sum, it) => sum + it.grossSalary, 0);
    payroll.totalNet = payroll.items.reduce((sum, it) => sum + it.netSalary, 0);

    await payroll.save();
    return payroll.toObject ? payroll.toObject() : payroll;
  }

  /**
   * Quản lý chi nhánh gửi bảng lương lên Ban Giám đốc duyệt
   */
  async submitPayroll(payrollId: string, managerId?: string, requesterBranchId?: string, requesterRole?: string) {
    const payroll = await this.payrollModel.findById(payrollId).exec();
    if (!payroll) throw new RpcException('Không tìm thấy bảng lương');
    if (requesterRole === 'branch' && requesterBranchId && payroll.branchId !== requesterBranchId) {
      throw new RpcException('Bạn không có quyền gửi duyệt bảng lương của chi nhánh khác');
    }
    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new RpcException(`Bảng lương đang ở trạng thái ${payroll.status}, không thể gửi duyệt`);
    }

    payroll.status = PayrollStatus.SUBMITTED;
    payroll.submittedAt = new Date();
    if (managerId && Types.ObjectId.isValid(managerId)) {
      payroll.submittedBy = new Types.ObjectId(managerId);
    }

    await payroll.save();
    return payroll.toObject ? payroll.toObject() : payroll;
  }

  /**
   * Quản lý chi nhánh toàn quyền phê duyệt bảng lương chi nhánh mình; Ban Giám đốc / Admin duyệt toàn chuỗi
   */
  async approvePayroll(payrollId: string, approverId?: string, approverRole?: string, requesterBranchId?: string) {
    if (approverRole && !['branch', 'director', 'admin'].includes(approverRole)) {
      throw new RpcException('Bạn không có quyền phê duyệt bảng lương');
    }

    const payroll = await this.payrollModel.findById(payrollId).exec();
    if (!payroll) throw new RpcException('Không tìm thấy bảng lương');

    // Chống IDOR: Quản lý chi nhánh chỉ được duyệt bảng lương của chi nhánh mình
    if (approverRole === 'branch' && requesterBranchId && payroll.branchId !== requesterBranchId) {
      throw new RpcException('Bạn không có quyền phê duyệt bảng lương của chi nhánh khác');
    }

    if ([PayrollStatus.APPROVED, PayrollStatus.PAID].includes(payroll.status)) {
      throw new RpcException('Bảng lương này đã được phê duyệt trước đó');
    }

    payroll.status = PayrollStatus.APPROVED;
    payroll.approvedAt = new Date();
    if (approverId && Types.ObjectId.isValid(approverId)) {
      payroll.approvedBy = new Types.ObjectId(approverId);
    }

    await payroll.save();
    return payroll.toObject ? payroll.toObject() : payroll;
  }

  /**
   * Nhân viên xem phiếu lương cá nhân của chính mình (IDOR Guard)
   */
  async getMyPayslip(employeeId: string, month?: number, year?: number) {
    try {
      if (!employeeId) return [];

      const filter: any = {};
      if (Types.ObjectId.isValid(employeeId)) {
        filter['items.employeeId'] = new Types.ObjectId(employeeId);
      } else {
        filter['items.employeeId'] = employeeId;
      }
      if (month) filter.month = Number(month);
      if (year) filter.year = Number(year);

      const payrolls = await this.payrollModel
        .find(filter)
        .sort({ year: -1, month: -1 })
        .lean()
        .exec();

      if (!payrolls || payrolls.length === 0) {
        return [];
      }

      // Trích xuất phiếu lương của nhân viên từ các bảng lương
      const payslips = payrolls
        .map((p) => {
          const item = p.items?.find((i: any) => i.employeeId?.toString() === employeeId);
          return {
            payrollId: p._id,
            branchId: p.branchId,
            month: p.month,
            year: p.year,
            status: p.status,
            item,
            submittedAt: p.submittedAt,
            approvedAt: p.approvedAt,
          };
        })
        .filter((ps: any) => Boolean(ps.item));

      return payslips;
    } catch (err: any) {
      return [];
    }
  }
}
