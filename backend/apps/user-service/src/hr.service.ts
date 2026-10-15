import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkShift } from './schemas/work-shift.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { ShiftSwapRequest } from './schemas/shift-swap-request.schema';
import { StaffNotification } from './schemas/staff-notification.schema';
import { LeaveRequest, LeaveType, LeaveStatus } from './schemas/leave-request.schema';
import { Attendance, AttendanceStatus } from './schemas/attendance.schema';
import { User } from '../../auth-service/src/auth/user.schema';
import { RpcException, ClientKafka } from '@nestjs/microservices';

@Injectable()
export class HrService {
  constructor(
    @InjectModel(WorkShift.name) private readonly workShiftModel: Model<WorkShift>,
    @InjectModel(WorkSchedule.name) private readonly workScheduleModel: Model<WorkSchedule>,
    @InjectModel(ShiftSwapRequest.name) private readonly shiftSwapRequestModel: Model<ShiftSwapRequest>,
    @InjectModel(StaffNotification.name) private readonly staffNotificationModel: Model<StaffNotification>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(LeaveRequest.name) private readonly leaveRequestModel: Model<LeaveRequest>,
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<Attendance>,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientKafka,
  ) {}

  // --- Nhóm Ca Làm Việc ---
  async listShifts(branchId: string) {
    return this.workShiftModel.find({ branchId }).lean().exec();
  }

  async createShift(branchId: string, dto: { name: string, startTime: string, endTime: string, color: string }) {
    const shift = await this.workShiftModel.create({ branchId, ...dto, isActive: true });
    return shift ? (shift.toObject ? shift.toObject() : shift) : null;
  }

  async updateShift(shiftId: string, branchId: string, dto: any) {
    const shift = await this.workShiftModel.findOneAndUpdate(
      { _id: shiftId, branchId },
      { $set: dto },
      { new: true }
    ).lean().exec();
    if (!shift) throw new RpcException('Shift not found');
    return shift;
  }

  async toggleShift(shiftId: string, branchId: string) {
    const shift = await this.workShiftModel.findOne({ _id: shiftId, branchId }).exec();
    if (!shift) throw new RpcException('Shift not found');
    shift.isActive = !shift.isActive;
    await shift.save();
    return shift.toObject ? shift.toObject() : shift;
  }

  // --- Nhóm Lịch Phân Công ---
  async getWeekSchedule(branchId: string, weekStart: string) {
    const start = new Date(weekStart);
    const schedule = await this.workScheduleModel.findOne({ branchId, weekStart: start }).lean().exec();
    if (schedule) return schedule;
    
    // Return empty draft
    return {
      branchId,
      weekStart: start,
      status: 'draft',
      assignments: []
    };
  }

  async upsertSchedule(branchId: string, managerId: string, dto: { weekStart: string, assignments: any[] }) {
    const start = new Date(dto.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

    const schedule = await this.workScheduleModel.findOneAndUpdate(
      { branchId, weekStart: start },
      { 
        $set: { 
          assignments: dto.assignments, 
          publishedBy: managerId,
          weekEnd: end
        },
        $setOnInsert: { status: 'draft' }
      },
      { upsert: true, new: true }
    ).lean().exec();
    return schedule;
  }

  async publishSchedule(branchId: string, managerId: string, weekStart: string, sendEmailNotification: boolean = true) {
    const start = new Date(weekStart);
    const schedule = await this.workScheduleModel.findOne({ branchId, weekStart: start }).exec();
    
    if (!schedule) throw new RpcException('Schedule not found');
    if (schedule.status === 'published') throw new RpcException('Schedule is already published');

    schedule.status = 'published';
    schedule.publishedAt = new Date();
    await schedule.save();

    const employeeIds = [...new Set(schedule.assignments.map(a => a.employeeId))];
    
    for (const empId of employeeIds) {
      await this.sendNotification(
        empId, 
        branchId, 
        'schedule_published', 
        'Lịch tuần đã được đăng', 
        'Lịch làm việc tuần mới đã được đăng, vui lòng kiểm tra.',
        schedule._id.toString()
      );
    }

    // Tu dong gui email lich lam viec tuan cho tung nhan vien
    if (sendEmailNotification && employeeIds.length > 0) {
      try {
        const users = await this.userModel.find({ _id: { $in: employeeIds } }).select('fullName email').lean().exec();
        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

        const weekStartStr = schedule.weekStart ? new Date(schedule.weekStart).toISOString().split('T')[0] : weekStart;
        const weekEndStr = schedule.weekEnd ? new Date(schedule.weekEnd).toISOString().split('T')[0] : '';

        for (const empId of employeeIds) {
          const u = userMap.get(empId.toString());
          if (!u || !u.email) continue;

          const userAssignments = (schedule.assignments || [])
            .filter(a => a.employeeId.toString() === empId.toString())
            .map(a => {
              const d = new Date(a.date);
              const dayOfWeek = dayNames[d.getDay()];
              const dateStr = d.toISOString().split('T')[0];
              return {
                date: dateStr,
                dayOfWeek,
                shiftName: a.shiftName,
                time: `${a.shiftStart} - ${a.shiftEnd}`,
                note: a.note || '',
              };
            })
            .sort((a, b) => a.date.localeCompare(b.date));

          if (userAssignments.length > 0) {
            this.authClient.emit('hr.schedule.email.send', {
              recipientEmail: u.email,
              recipientName: u.fullName,
              branchId,
              weekStart: weekStartStr,
              weekEnd: weekEndStr,
              shifts: userAssignments,
            });
          }
        }
      } catch (err: any) {
        console.warn('[HrService] Loi khi phat su kien gui email lich lam viec:', err.message);
      }
    }

    return schedule.toObject ? schedule.toObject() : schedule;
  }

  async getMyWeekSchedule(employeeId: string, branchId: string, weekStart: string) {
    return this.getWeekSchedule(branchId, weekStart);
  }

  // --- Nhóm Đổi Ca ---
  async listSwapRequests(branchId: string, status?: string) {
    const filter: any = { branchId };
    if (status) filter.status = status;
    return this.shiftSwapRequestModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  }

  async listMySwapRequests(userId: string) {
    return this.shiftSwapRequestModel.find({
      $or: [{ requesterId: userId }, { targetId: userId }]
    }).sort({ createdAt: -1 }).lean().exec();
  }

  async createSwapRequest(dto: any) {
    // 1. Kiểm tra ràng buộc: Chỉ cho phép đổi chéo ca giữa các nhân sự CÙNG VAI TRÒ
    if (dto.requesterId && dto.targetId) {
      const [requester, target] = await Promise.all([
        this.userModel.findById(dto.requesterId).lean().exec(),
        this.userModel.findById(dto.targetId).lean().exec()
      ]);

      if (!requester || !target) {
        throw new RpcException('Không tìm thấy thông tin nhân viên tham gia đổi ca.');
      }

      if (requester.role !== target.role) {
        throw new RpcException('Chỉ có thể đổi chéo ca với nhân sự cùng vai trò (Dược sĩ không thể đổi ca với Quản lý).');
      }
    }

    const request = await this.shiftSwapRequestModel.create({
      ...dto,
      status: 'pending_target'
    });

    await this.sendNotification(
      dto.targetId,
      dto.branchId,
      'shift_swap_request',
      'Yêu cầu đổi ca mới',
      `${dto.requesterName} muốn đổi ca với bạn.`,
      request._id.toString()
    );

    return request.toObject ? request.toObject() : request;
  }

  async targetRespond(swapId: string, targetId: string, response: 'accepted' | 'rejected', rejectReason?: string) {
    const request = await this.shiftSwapRequestModel.findById(swapId).exec();
    if (!request) throw new RpcException('Swap request not found');
    if (request.targetId !== targetId) throw new RpcException('Unauthorized');
    if (request.status !== 'pending_target') throw new RpcException('Invalid status');

    request.targetResponse = response;
    request.targetRespondedAt = new Date();

    if (response === 'rejected') {
      request.status = 'rejected';
      request.targetRejectReason = rejectReason;
      await request.save();

      await this.sendNotification(
        request.requesterId,
        request.branchId,
        'shift_swap_rejected',
        'Yêu cầu đổi ca bị từ chối',
        `${request.targetName} đã từ chối yêu cầu đổi ca của bạn.`,
        request._id.toString()
      );
    } else {
      request.status = 'pending_manager';
      await request.save();

      const managers = await this.userModel.find({ role: 'branch', branchId: request.branchId }).exec();
      for (const manager of managers) {
        await this.sendNotification(
          manager._id.toString(),
          request.branchId,
          'shift_swap_response',
          'Yêu cầu đổi ca chờ duyệt',
          `${request.requesterName} và ${request.targetName} xin đổi ca, chờ bạn duyệt.`,
          request._id.toString()
        );
      }
    }

    return request.toObject ? request.toObject() : request;
  }

  async managerRespond(swapId: string, managerId: string, response: 'approved' | 'rejected', rejectReason?: string) {
    const request = await this.shiftSwapRequestModel.findById(swapId).exec();
    if (!request) throw new RpcException('Swap request not found');
    if (request.status !== 'pending_manager') throw new RpcException('Invalid status');

    request.managerResponse = response;
    request.managerId = managerId;
    request.managerRespondedAt = new Date();

    if (response === 'rejected') {
      request.status = 'rejected';
      request.managerRejectReason = rejectReason;
      await request.save();

      const msg = 'Yêu cầu đổi ca đã bị từ chối bởi quản lý.';
      await this.sendNotification(request.requesterId, request.branchId, 'shift_swap_rejected', 'Đổi ca bị từ chối', msg, request._id.toString());
      await this.sendNotification(request.targetId, request.branchId, 'shift_swap_rejected', 'Đổi ca bị từ chối', msg, request._id.toString());
    } else {
      request.status = 'approved';
      await request.save();

      const reqStart = new Date(request.requesterShiftDate);
      const tarStart = new Date(request.targetShiftDate);
      
      await this.workScheduleModel.updateMany(
        { branchId: request.branchId },
        {
          $set: {
            'assignments.$[req].employeeId': request.targetId,
            'assignments.$[req].employeeName': request.targetName,
          }
        },
        {
          arrayFilters: [
            {
              'req.employeeId': request.requesterId,
              'req.date': reqStart,
              'req.shiftId': request.requesterShiftId
            }
          ]
        }
      ).exec();

      await this.workScheduleModel.updateMany(
        { branchId: request.branchId },
        {
          $set: {
            'assignments.$[tar].employeeId': request.requesterId,
            'assignments.$[tar].employeeName': request.requesterName,
          }
        },
        {
          arrayFilters: [
            {
              'tar.employeeId': request.targetId,
              'tar.date': tarStart,
              'tar.shiftId': request.targetShiftId
            }
          ]
        }
      ).exec();

      const msg = 'Yêu cầu đổi ca đã được chấp thuận.';
      await this.sendNotification(request.requesterId, request.branchId, 'shift_swap_approved', 'Đổi ca thành công', msg, request._id.toString());
      await this.sendNotification(request.targetId, request.branchId, 'shift_swap_approved', 'Đổi ca thành công', msg, request._id.toString());
    }

    return request.toObject ? request.toObject() : request;
  }

  private async sendNotification(recipientId: string, branchId: string, type: string, title: string, message: string, relatedId?: string) {
    try {
      await this.staffNotificationModel.create({
        recipientId,
        branchId,
        type,
        title,
        message,
        relatedId
      });
    } catch (err: any) {
      console.warn(`[HrService] Khong the gui StaffNotification toi ${recipientId}:`, err.message);
    }
  }

  // --- Nhóm Notification ---
  async listNotifications(userId: string, limit = 20, skip = 0) {
    return this.staffNotificationModel.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  }

  async markRead(userId: string, notificationId?: string) {
    if (notificationId) {
      return this.staffNotificationModel.updateOne(
        { _id: notificationId, recipientId: userId },
        { $set: { isRead: true } }
      ).exec();
    } else {
      return this.staffNotificationModel.updateMany(
        { recipientId: userId, isRead: false },
        { $set: { isRead: true } }
      ).exec();
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.staffNotificationModel.countDocuments({ recipientId: userId, isRead: false });
  }

  // --- Nhóm Nghỉ Phép & Điều Phối Nhân Sự (Leave Management) ---
  async getMyLeaveBalance(userId: string) {
    const user = await this.userModel.findById(userId).lean().exec();
    return {
      annualLeaveBalance: user?.annualLeaveBalance ?? 12,
      usedAnnualLeave: user?.usedAnnualLeave ?? 0,
    };
  }

  async getMyLeaves(userId: string, status?: string) {
    const query: any = { requesterId: new Types.ObjectId(userId) };
    if (status) query.status = status;

    const [leaves, user] = await Promise.all([
      this.leaveRequestModel.find(query).sort({ createdAt: -1 }).lean().exec(),
      this.userModel.findById(userId).lean().exec(),
    ]);

    return {
      leaves: leaves || [],
      balance: user?.annualLeaveBalance ?? 12,
      used: user?.usedAnnualLeave ?? 0,
    };
  }

  async getBranchLeaves(branchId: string, status?: string) {
    const query: any = { branchId };
    if (status) query.status = status;
    return this.leaveRequestModel.find(query).sort({ createdAt: -1 }).lean().exec();
  }

  async createLeaveRequest(dto: {
    branchId: string;
    requesterId: string;
    requesterName: string;
    requesterRole: string;
    leaveType: LeaveType;
    shiftDate: string;
    shiftId: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    reason: string;
    attachmentUrl?: string;
  }) {
    // 1. Kiểm tra không được nộp trùng đơn cho ca đang PENDING hoặc APPROVED
    const existing = await this.leaveRequestModel.findOne({
      requesterId: new Types.ObjectId(dto.requesterId),
      shiftDate: dto.shiftDate,
      shiftId: dto.shiftId,
      status: { $in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
    }).lean().exec();

    if (existing) {
      throw new RpcException('Bạn đã có đơn xin nghỉ cho ca trực này đang chờ duyệt hoặc đã duyệt.');
    }

    // 2. Kiểm tra nếu là nghỉ phép năm: quỹ phép phải còn >= 1 ngày
    const user = await this.userModel.findById(dto.requesterId).lean().exec();
    if (!user) throw new RpcException('Không tìm thấy thông tin nhân viên.');

    const currentBalance = user.annualLeaveBalance ?? 12;
    if (dto.leaveType === LeaveType.ANNUAL_PAID && currentBalance < 1) {
      throw new RpcException(`Số dư phép năm khả dụng không đủ (còn ${currentBalance} ngày). Vui lòng chọn loại Nghỉ không lương hoặc lý do khác.`);
    }

    // 3. Kiểm tra ca trực hợp lệ trong WorkSchedule (Chống nộp đơn nghỉ khống - INV-01)
    const schedules = await this.workScheduleModel.find({
      branchId: dto.branchId,
      'assignments.employeeId': dto.requesterId,
    }).lean().exec();

    let isAssigned = false;
    let matchingSchedule: any = null;
    let assignedShift: any = null;

    for (const sch of schedules) {
      const found = sch.assignments?.find((a: any) => {
        const aDateStr = a.date instanceof Date ? a.date.toISOString().slice(0, 10) : new Date(a.date).toISOString().slice(0, 10);
        const matchEmployee = a.employeeId?.toString() === dto.requesterId?.toString();
        const matchDate = aDateStr === dto.shiftDate;
        // Khớp shiftId chính xác hoặc khớp theo tên ca
        const matchShift =
          a.shiftId === dto.shiftId ||
          (dto.shiftName && a.shiftName && a.shiftName.toLowerCase().includes(dto.shiftName.toLowerCase().slice(0, 5)));
        return matchEmployee && matchDate && matchShift;
      });

      if (found) {
        isAssigned = true;
        matchingSchedule = sch;
        assignedShift = found;
        break;
      }
    }

    if (!isAssigned) {
      throw new RpcException('Bạn không có ca trực nào được phân công trong thời gian này để xin nghỉ.');
    }

    // Tự động chuẩn hóa shiftId và thời gian ca trực theo lịch phân công thực tế
    if (assignedShift) {
      dto.shiftId = assignedShift.shiftId;
      dto.shiftName = assignedShift.shiftName;
      dto.startTime = assignedShift.shiftStart || dto.startTime;
      dto.endTime = assignedShift.shiftEnd || dto.endTime;
    }

    // 4. Kiểm tra cảnh báo định biên GPP (Nếu sau khi nghỉ, ca trực không còn ai)
    let isWarningGppUnderstaffed = false;
    if (matchingSchedule && matchingSchedule.assignments) {
      const remainingAssigned = matchingSchedule.assignments.filter(
        (a: any) => {
          const aDateStr = a.date instanceof Date ? a.date.toISOString().slice(0, 10) : new Date(a.date).toISOString().slice(0, 10);
          return a.shiftId === dto.shiftId && aDateStr === dto.shiftDate && a.employeeId !== dto.requesterId;
        }
      );
      if (remainingAssigned.length === 0) {
        isWarningGppUnderstaffed = true;
      }
    }

    // 5. Tạo bản ghi đơn xin nghỉ
    const leave = await this.leaveRequestModel.create({
      ...dto,
      requesterId: new Types.ObjectId(dto.requesterId),
      shiftsCount: 1,
      status: LeaveStatus.PENDING,
      isWarningGppUnderstaffed,
    });

    // 6. Gửi thông báo đến Quản lý chi nhánh
    const managers = await this.userModel.find({ role: 'branch', branchId: dto.branchId }).lean().exec();
    for (const m of managers) {
      await this.sendNotification(
        (m._id as any).toString(),
        dto.branchId,
        'leave_request_pending',
        'Đơn xin nghỉ ca mới',
        `${dto.requesterName} xin nghỉ ca ${dto.shiftName} ngày ${dto.shiftDate}. Chờ bạn duyệt.`,
        leave._id.toString()
      );
    }

    return leave.toObject ? leave.toObject() : leave;
  }

  async respondLeave(dto: {
    leaveId: string;
    managerId: string;
    managerName: string;
    managerRole?: string;
    managerBranchId?: string;
    action: 'approve' | 'reject';
    managerNote?: string;
  }) {
    const leave = await this.leaveRequestModel.findById(dto.leaveId).exec();
    if (!leave) throw new RpcException('Không tìm thấy đơn xin nghỉ.');

    // Kiểm tra IDOR: Quản lý chỉ được duyệt đơn thuộc chi nhánh của mình (INV-03)
    if (dto.managerRole !== 'admin' && dto.managerBranchId && leave.branchId !== dto.managerBranchId) {
      throw new RpcException('Bạn không có quyền phê duyệt đơn xin nghỉ của chi nhánh khác.');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new RpcException('Đơn xin nghỉ không ở trạng thái chờ duyệt.');
    }

    if (dto.action === 'reject') {
      const updatedLeave = await this.leaveRequestModel.findOneAndUpdate(
        { _id: dto.leaveId, status: LeaveStatus.PENDING },
        {
          $set: {
            status: LeaveStatus.REJECTED,
            managerId: dto.managerId,
            managerName: dto.managerName,
            managerNote: dto.managerNote || '',
            managerRespondedAt: new Date(),
          },
        },
        { new: true }
      ).exec();

      if (!updatedLeave) {
        throw new RpcException('Đơn xin nghỉ đã được xử lý hoặc không còn ở trạng thái chờ duyệt.');
      }

      await this.sendNotification(
        updatedLeave.requesterId.toString(),
        updatedLeave.branchId,
        'leave_request_rejected',
        'Đơn xin nghỉ bị từ chối',
        `Quản lý chi nhánh đã từ chối đơn xin nghỉ ca ${updatedLeave.shiftName} ngày ${updatedLeave.shiftDate}.${dto.managerNote ? ' Lý do: ' + dto.managerNote : ''}`,
        updatedLeave._id.toString()
      );

      return updatedLeave.toObject ? updatedLeave.toObject() : updatedLeave;
    }

    // Trường hợp APPROVE
    // 1. Trừ phép năm nếu là ANNUAL_PAID
    if (leave.leaveType === LeaveType.ANNUAL_PAID) {
      const user = await this.userModel.findById(leave.requesterId).exec();
      const currentBalance = user?.annualLeaveBalance ?? 12;
      const currentUsed = user?.usedAnnualLeave ?? 0;
      const deduct = leave.shiftsCount || 1;

      if (currentBalance < deduct) {
        throw new RpcException('Nhân viên không còn đủ số dư phép năm để duyệt.');
      }

      await this.userModel.updateOne(
        { _id: leave.requesterId },
        {
          $set: {
            annualLeaveBalance: currentBalance - deduct,
            usedAnnualLeave: currentUsed + deduct,
          },
        }
      ).exec();
    }

    // 2. Chuyển trạng thái sang APPROVED nguyên tử
    const updatedLeave = await this.leaveRequestModel.findOneAndUpdate(
      { _id: dto.leaveId, status: LeaveStatus.PENDING },
      {
        $set: {
          status: LeaveStatus.APPROVED,
          managerId: dto.managerId,
          managerName: dto.managerName,
          managerNote: dto.managerNote || '',
          managerRespondedAt: new Date(),
        },
      },
      { new: true }
    ).exec();

    if (!updatedLeave) {
      // Rollback số dư phép năm nếu trạng thái không còn là PENDING
      if (leave.leaveType === LeaveType.ANNUAL_PAID) {
        const user = await this.userModel.findById(leave.requesterId).exec();
        const currentBalance = user?.annualLeaveBalance ?? 12;
        const currentUsed = user?.usedAnnualLeave ?? 0;
        const deduct = leave.shiftsCount || 1;
        await this.userModel.updateOne(
          { _id: leave.requesterId },
          {
            $set: {
              annualLeaveBalance: currentBalance + deduct,
              usedAnnualLeave: Math.max(0, currentUsed - deduct),
            },
          }
        ).exec();
      }
      throw new RpcException('Đơn xin nghỉ đã được xử lý hoặc không còn ở trạng thái chờ duyệt.');
    }

    // 3. Cập nhật ghi chú trên lịch làm việc WorkSchedule
    const targetDate = new Date(updatedLeave.shiftDate);
    await this.workScheduleModel.updateMany(
      { branchId: updatedLeave.branchId },
      {
        $set: {
          'assignments.$[assign].note': `[NGHỈ PHÉP: ${updatedLeave.leaveType}]`,
        },
      },
      {
        arrayFilters: [
          {
            'assign.employeeId': updatedLeave.requesterId.toString(),
            'assign.shiftId': updatedLeave.shiftId,
            'assign.date': targetDate,
          },
        ],
      }
    ).exec();

    // 4. Đồng bộ bản ghi chấm công Attendance
    const attendanceStatus =
      updatedLeave.leaveType === LeaveType.ANNUAL_PAID || updatedLeave.leaveType === LeaveType.SPECIAL_PAID
        ? AttendanceStatus.ON_LEAVE_PAID
        : AttendanceStatus.ON_LEAVE_UNPAID;

    await this.attendanceModel.findOneAndUpdate(
      {
        employeeId: updatedLeave.requesterId,
        date: updatedLeave.shiftDate,
        shiftId: updatedLeave.shiftId,
      },
      {
        $set: {
          employeeName: updatedLeave.requesterName,
          employeeRole: updatedLeave.requesterRole,
          branchId: updatedLeave.branchId,
          shiftName: updatedLeave.shiftName,
          status: attendanceStatus,
          note: `Nghỉ phép (${updatedLeave.leaveType}): ${updatedLeave.reason}`,
        },
      },
      { upsert: true, new: true }
    ).exec();

    // 5. Gửi thông báo đến nhân viên
    await this.sendNotification(
      updatedLeave.requesterId.toString(),
      updatedLeave.branchId,
      'leave_request_approved',
      'Đơn xin nghỉ đã được duyệt',
      `Đơn xin nghỉ ca ${updatedLeave.shiftName} ngày ${updatedLeave.shiftDate} của bạn đã được quản lý phê duyệt.`,
      updatedLeave._id.toString()
    );

    return updatedLeave.toObject ? updatedLeave.toObject() : updatedLeave;
  }

  async cancelLeave(leaveId: string, userId: string, cancelReason?: string) {
    const leave = await this.leaveRequestModel.findById(leaveId).exec();
    if (!leave) throw new RpcException('Không tìm thấy đơn xin nghỉ.');
    if (leave.requesterId.toString() !== userId.toString()) {
      throw new RpcException('Bạn không có quyền hủy đơn xin nghỉ này.');
    }

    const cancelledLeave = await this.leaveRequestModel.findOneAndUpdate(
      { _id: leaveId, status: LeaveStatus.PENDING },
      {
        $set: {
          status: LeaveStatus.CANCELLED,
          cancelReason: cancelReason || '',
          cancelledAt: new Date(),
        },
      },
      { new: true }
    ).exec();

    if (!cancelledLeave) {
      throw new RpcException('Chỉ có thể hủy đơn đang ở trạng thái chờ duyệt.');
    }

    return cancelledLeave.toObject ? cancelledLeave.toObject() : cancelledLeave;
  }
}

