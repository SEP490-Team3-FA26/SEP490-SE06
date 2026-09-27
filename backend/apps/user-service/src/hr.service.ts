import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkShift } from './schemas/work-shift.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { ShiftSwapRequest } from './schemas/shift-swap-request.schema';
import { StaffNotification } from './schemas/staff-notification.schema';
import { User } from '../../auth-service/src/auth/user.schema';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class HrService {
  constructor(
    @InjectModel(WorkShift.name) private readonly workShiftModel: Model<WorkShift>,
    @InjectModel(WorkSchedule.name) private readonly workScheduleModel: Model<WorkSchedule>,
    @InjectModel(ShiftSwapRequest.name) private readonly shiftSwapRequestModel: Model<ShiftSwapRequest>,
    @InjectModel(StaffNotification.name) private readonly staffNotificationModel: Model<StaffNotification>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
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

  async publishSchedule(branchId: string, managerId: string, weekStart: string) {
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
    await this.staffNotificationModel.create({
      recipientId,
      branchId,
      type,
      title,
      message,
      relatedId
    });
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
}
