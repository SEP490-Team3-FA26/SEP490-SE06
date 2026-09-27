import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HrService } from './hr.service';
import { WorkShift } from './schemas/work-shift.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { ShiftSwapRequest } from './schemas/shift-swap-request.schema';
import { StaffNotification } from './schemas/staff-notification.schema';
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

const mockModel = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  updateMany: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
};

describe('HrService', () => {
  let service: HrService;
  let shiftModel: Model<WorkShift>;
  let scheduleModel: Model<WorkSchedule>;
  let swapModel: Model<ShiftSwapRequest>;
  let notificationModel: Model<StaffNotification>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        {
          provide: getModelToken(WorkShift.name),
          useValue: { ...mockModel, exec: jest.fn().mockResolvedValue([mockShift]) },
        },
        {
          provide: getModelToken(WorkSchedule.name),
          useValue: { 
            ...mockModel, 
            exec: jest.fn().mockResolvedValue(null),
            findOneAndUpdate: jest.fn().mockReturnThis(),
          },
        },
        {
          provide: getModelToken(ShiftSwapRequest.name),
          useValue: { 
            ...mockModel,
            findById: jest.fn().mockReturnThis(),
          },
        },
        {
          provide: getModelToken(StaffNotification.name),
          useValue: { ...mockModel },
        },
        {
          provide: getModelToken('User'),
          useValue: { ...mockModel },
        },
      ],
    }).compile();

    service = module.get<HrService>(HrService);
    shiftModel = module.get<Model<WorkShift>>(getModelToken(WorkShift.name));
    scheduleModel = module.get<Model<WorkSchedule>>(getModelToken(WorkSchedule.name));
    swapModel = module.get<Model<ShiftSwapRequest>>(getModelToken(ShiftSwapRequest.name));
    notificationModel = module.get<Model<StaffNotification>>(getModelToken(StaffNotification.name));
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
    
    // override exec for this specific test
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
    
    // It should swap schedules (two updateMany calls)
    expect(scheduleModel.updateMany).toHaveBeenCalledTimes(2);
    
    // It should send notifications
    expect(notificationModel.create).toHaveBeenCalled();
  });
});
