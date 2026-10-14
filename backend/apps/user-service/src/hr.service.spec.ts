import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HrService } from './hr.service';
import { WorkShift } from './schemas/work-shift.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { ShiftSwapRequest } from './schemas/shift-swap-request.schema';
import { StaffNotification } from './schemas/staff-notification.schema';
import { LeaveRequest, LeaveType, LeaveStatus } from './schemas/leave-request.schema';
import { Attendance, AttendanceStatus } from './schemas/attendance.schema';
import { Model } from 'mongoose';

const mockShift = {
  _id: 'shift-1',
  branchId: 'BR-001',
  name: 'Ca Sáng',
  startTime: '06:00',
  endTime: '14:00',
  color: '#3B82F6',
  isActive: true,
};

const createMockModel = () => ({
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  updateMany: jest.fn().mockReturnThis(),
  updateOne: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
});

describe('HrService', () => {
  let service: HrService;
  let shiftModel: Model<WorkShift>;
  let scheduleModel: Model<WorkSchedule>;
  let swapModel: Model<ShiftSwapRequest>;
  let notificationModel: Model<StaffNotification>;
  let leaveModel: Model<LeaveRequest>;
  let userModel: any;

  beforeEach(async () => {
    const mockShiftModel = { ...createMockModel(), exec: jest.fn().mockResolvedValue([mockShift]) };
    const mockScheduleModel = { ...createMockModel(), exec: jest.fn().mockResolvedValue(null) };
    const mockSwapModel = createMockModel();
    const mockNotificationModel = createMockModel();
    const mockUserModel = createMockModel();
    const mockLeaveModel = createMockModel();
    const mockAttendanceModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        {
          provide: getModelToken(WorkShift.name),
          useValue: mockShiftModel,
        },
        {
          provide: getModelToken(WorkSchedule.name),
          useValue: mockScheduleModel,
        },
        {
          provide: getModelToken(ShiftSwapRequest.name),
          useValue: mockSwapModel,
        },
        {
          provide: getModelToken(StaffNotification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(LeaveRequest.name),
          useValue: mockLeaveModel,
        },
        {
          provide: getModelToken(Attendance.name),
          useValue: mockAttendanceModel,
        },
      ],
    }).compile();

    service = module.get<HrService>(HrService);
    shiftModel = module.get<Model<WorkShift>>(getModelToken(WorkShift.name));
    scheduleModel = module.get<Model<WorkSchedule>>(getModelToken(WorkSchedule.name));
    swapModel = module.get<Model<ShiftSwapRequest>>(getModelToken(ShiftSwapRequest.name));
    notificationModel = module.get<Model<StaffNotification>>(getModelToken(StaffNotification.name));
    leaveModel = module.get<Model<LeaveRequest>>(getModelToken(LeaveRequest.name));
    userModel = module.get(getModelToken('User'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list shifts successfully', async () => {
    const result = await service.listShifts('BR-001');
    expect(shiftModel.find).toHaveBeenCalledWith({ branchId: 'BR-001' });
    expect(result).toEqual([mockShift]);
  });

  it('should upsert schedule', async () => {
    const upsertData = {
      weekStart: '2023-10-23',
      assignments: []
    };
    const expectedSchedule = { _id: 'sched-1', branchId: 'BR-001', weekStart: '2023-10-23', assignments: [] };
    
    (scheduleModel.findOneAndUpdate as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(expectedSchedule)
      })
    });

    const result = await service.upsertSchedule('BR-001', 'manager-1', upsertData);
    const start = new Date('2023-10-23');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

    expect(scheduleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { branchId: 'BR-001', weekStart: start },
      { 
        $set: { assignments: [], weekEnd: end, publishedBy: 'manager-1' },
        $setOnInsert: { status: 'draft' }
      },
      { new: true, upsert: true }
    );
    expect(result).toEqual(expectedSchedule);
  });

  it('should approve swap request and swap schedule', async () => {
    const mockSwap = {
      _id: 'swap-1',
      branchId: 'BR-001',
      requesterId: 'user-1',
      requesterShiftDate: '2023-10-23T00:00:00.000Z',
      requesterShiftId: 'shift-1',
      targetId: 'user-2',
      targetShiftDate: '2023-10-24T00:00:00.000Z',
      targetShiftId: 'shift-2',
      status: 'pending_manager',
      save: jest.fn().mockResolvedValue(true),
    };

    (swapModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSwap)
    });

    (scheduleModel.updateMany as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(true)
    });

    await service.managerRespond('swap-1', 'manager-1', 'approved');

    expect(mockSwap.status).toBe('approved');
    expect(mockSwap.save).toHaveBeenCalled();
    expect(scheduleModel.updateMany).toHaveBeenCalledTimes(2);
    expect(notificationModel.create).toHaveBeenCalled();
  });

  // --- LEAVE MANAGEMENT TESTS (T-01, T-02, T-04, T-05, T-07, T-INV-01) ---
  it('T-01: should create leave request successfully when assigned and balance is sufficient', async () => {
    (leaveModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    (userModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', annualLeaveBalance: 12 }),
      }),
    });

    const mockSchedule = {
      _id: 'sched-1',
      branchId: 'BR-001',
      assignments: [
        {
          employeeId: '507f1f77bcf86cd799439011',
          shiftId: 'shift-1',
          date: new Date('2026-10-15'),
        },
      ],
    };
    (scheduleModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockSchedule]),
      }),
    });

    (userModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: 'manager-1' }]),
      }),
    });

    const createdLeave = {
      _id: 'leave-1',
      status: LeaveStatus.PENDING,
      toObject: () => ({ _id: 'leave-1', status: LeaveStatus.PENDING }),
    };
    (leaveModel.create as jest.Mock).mockResolvedValue(createdLeave);

    const result = await service.createLeaveRequest({
      branchId: 'BR-001',
      requesterId: '507f1f77bcf86cd799439011',
      requesterName: 'Dược Sĩ An',
      requesterRole: 'pharmacist',
      leaveType: LeaveType.ANNUAL_PAID,
      shiftDate: '2026-10-15',
      shiftId: 'shift-1',
      shiftName: 'Ca Sáng',
      startTime: '06:30',
      endTime: '14:30',
      reason: 'Bận việc gia đình',
    });

    expect(result).toBeDefined();
    expect(leaveModel.create).toHaveBeenCalled();
    expect(notificationModel.create).toHaveBeenCalled();
  });

  it('T-INV-01: should throw error when employee requests leave for a shift they are not assigned to', async () => {
    (leaveModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    (userModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', annualLeaveBalance: 12 }),
      }),
    });

    // Mock không tìm thấy ca trực nào của nhân viên
    (scheduleModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });

    await expect(
      service.createLeaveRequest({
        branchId: 'BR-001',
        requesterId: '507f1f77bcf86cd799439011',
        requesterName: 'Dược Sĩ An',
        requesterRole: 'pharmacist',
        leaveType: LeaveType.ANNUAL_PAID,
        shiftDate: '2026-10-15',
        shiftId: 'shift-1',
        shiftName: 'Ca Sáng',
        startTime: '06:30',
        endTime: '14:30',
        reason: 'Xin nghỉ khống',
      })
    ).rejects.toThrow('Bạn không có ca trực nào được phân công');
  });

  it('T-02: should throw error when requesting ANNUAL_PAID with 0 leave balance', async () => {
    (leaveModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    (userModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', annualLeaveBalance: 0 }),
      }),
    });

    await expect(
      service.createLeaveRequest({
        branchId: 'BR-001',
        requesterId: '507f1f77bcf86cd799439011',
        requesterName: 'Dược Sĩ An',
        requesterRole: 'pharmacist',
        leaveType: LeaveType.ANNUAL_PAID,
        shiftDate: '2026-10-15',
        shiftId: 'shift-1',
        shiftName: 'Ca Sáng',
        startTime: '06:30',
        endTime: '14:30',
        reason: 'Nghỉ phép',
      })
    ).rejects.toThrow();
  });

  it('T-04: should reject approval if manager belongs to a different branch (IDOR protection)', async () => {
    const mockLeave = {
      _id: 'leave-1',
      branchId: 'BR-001',
      requesterId: '507f1f77bcf86cd799439011',
      status: LeaveStatus.PENDING,
    };

    (leaveModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockLeave),
    });

    await expect(
      service.respondLeave({
        leaveId: 'leave-1',
        managerId: 'manager-stranger',
        managerName: 'Quản Lý Lạ',
        managerRole: 'branch',
        managerBranchId: 'BR-002', // Khác với BR-001
        action: 'approve',
      })
    ).rejects.toThrow('Bạn không có quyền phê duyệt đơn xin nghỉ của chi nhánh khác.');
  });

  it('T-05: should approve leave request, deduct annual leave balance, and sync attendance', async () => {
    const mockLeave = {
      _id: 'leave-1',
      branchId: 'BR-001',
      requesterId: '507f1f77bcf86cd799439011',
      requesterName: 'Dược Sĩ An',
      requesterRole: 'pharmacist',
      leaveType: LeaveType.ANNUAL_PAID,
      shiftDate: '2026-10-15',
      shiftId: 'shift-1',
      shiftName: 'Ca Sáng',
      shiftsCount: 1,
      status: LeaveStatus.PENDING,
      reason: 'Nghỉ có phép',
      toObject: () => ({ _id: 'leave-1', status: LeaveStatus.APPROVED }),
    };

    (leaveModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockLeave),
    });

    (leaveModel.findOneAndUpdate as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockLeave,
        status: LeaveStatus.APPROVED,
        toObject: () => ({ _id: 'leave-1', status: LeaveStatus.APPROVED }),
      }),
    });

    (userModel.updateOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    (scheduleModel.updateMany as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(true),
    });

    const result = await service.respondLeave({
      leaveId: 'leave-1',
      managerId: 'manager-1',
      managerName: 'Quản Lý Bình',
      managerRole: 'branch',
      managerBranchId: 'BR-001',
      action: 'approve',
      managerNote: 'Đồng ý duyệt',
    });

    expect(result).toBeDefined();
    expect(leaveModel.findOneAndUpdate).toHaveBeenCalled();
    expect(userModel.updateOne).toHaveBeenCalled();
    expect(scheduleModel.updateMany).toHaveBeenCalled();
    expect(notificationModel.create).toHaveBeenCalled();
  });

  it('T-07: should reject leave request with manager note', async () => {
    const mockLeave = {
      _id: 'leave-2',
      branchId: 'BR-001',
      requesterId: '507f1f77bcf86cd799439011',
      shiftDate: '2026-10-15',
      shiftName: 'Ca Sáng',
      status: LeaveStatus.PENDING,
      toObject: () => ({ _id: 'leave-2', status: LeaveStatus.REJECTED }),
    };

    (leaveModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockLeave),
    });

    (leaveModel.findOneAndUpdate as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockLeave,
        status: LeaveStatus.REJECTED,
        toObject: () => ({ _id: 'leave-2', status: LeaveStatus.REJECTED }),
      }),
    });

    const result = await service.respondLeave({
      leaveId: 'leave-2',
      managerId: 'manager-1',
      managerName: 'Quản Lý Bình',
      managerRole: 'branch',
      managerBranchId: 'BR-001',
      action: 'reject',
      managerNote: 'Ca trực thiếu người',
    });

    expect(result).toBeDefined();
    expect(leaveModel.findOneAndUpdate).toHaveBeenCalled();
    expect(notificationModel.create).toHaveBeenCalled();
  });

  it('T-CANCEL: should allow requester to cancel pending leave', async () => {
    const mockLeave = {
      _id: 'leave-3',
      branchId: 'BR-001',
      requesterId: '507f1f77bcf86cd799439011',
      status: LeaveStatus.PENDING,
      toObject: () => ({ _id: 'leave-3', status: LeaveStatus.CANCELLED }),
    };

    (leaveModel.findById as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockLeave),
    });

    (leaveModel.findOneAndUpdate as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockLeave,
        status: LeaveStatus.CANCELLED,
        toObject: () => ({ _id: 'leave-3', status: LeaveStatus.CANCELLED }),
      }),
    });

    const result = await service.cancelLeave('leave-3', '507f1f77bcf86cd799439011', 'Đổi ý không nghỉ nữa');
    expect(result).toBeDefined();
    expect(leaveModel.findOneAndUpdate).toHaveBeenCalled();
  });
});
