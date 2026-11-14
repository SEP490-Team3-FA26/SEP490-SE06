/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { UserService } from '../../apps/user-service/src/user-service.service';
import { User } from '../../apps/auth-service/src/auth/user.schema';
import { Branch } from '../../apps/user-service/src/schemas/branch.schema';
import { Cart } from '../../apps/user-service/src/schemas/cart.schema';
import { Wishlist } from '../../apps/user-service/src/schemas/wishlist.schema';
import { AuditLog } from '../../apps/user-service/src/schemas/audit-log.schema';
import { BranchFeedback } from '../../apps/user-service/src/schemas/branch-feedback.schema';
import { Medicine } from '../../apps/inventory-service/src/medicine/schemas/medicine.schema';
import { WorkShift } from '../../apps/user-service/src/schemas/work-shift.schema';
import { WorkSchedule } from '../../apps/user-service/src/schemas/work-schedule.schema';
import { ShiftSwapRequest } from '../../apps/user-service/src/schemas/shift-swap-request.schema';
import { StaffNotification } from '../../apps/user-service/src/schemas/staff-notification.schema';
import { CustomerSegment } from '../../apps/user-service/src/schemas/customer-segment.schema';
import { StaffCertificate } from '../../apps/user-service/src/schemas/staff-certificate.schema';
import { Attendance } from '../../apps/user-service/src/schemas/attendance.schema';
import { Payroll } from '../../apps/user-service/src/schemas/payroll.schema';
import { LeaveRequest } from '../../apps/user-service/src/schemas/leave-request.schema';
import { SalesOrder } from '../../apps/inventory-service/src/sales/schemas/sales-order.schema';
import { StaffTransferRequest } from '../../apps/user-service/src/schemas/staff-transfer-request.schema';
import { ShiftHandover } from '../../apps/user-service/src/schemas/shift-handover.schema';

/**
 * feedback-performance.spec.ts
 * Bộ kiểm thử cho tính năng Thu Thập Đánh Giá Khách Hàng & Báo Cáo Hiệu Suất Nhân Viên / Chi Nhánh
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code).
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('UserService - Customer Feedback & Performance Analytics', () => {
  let service: UserService;
  let mockFeedbackModel: any;
  let mockBranchModel: any;
  let mockConnection: any;

  const defaultMockModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    aggregate: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    lean: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    mockFeedbackModel = {
      aggregate: jest.fn(),
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockBranchModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { branchCode: 'BR-001', name: 'Chi nhánh Quận 1', manager: 'DS. An' },
            { branchCode: 'BR-002', name: 'Chi nhánh Bình Thạnh', manager: 'DS. Bình' },
          ]),
        }),
      }),
    };

    mockConnection = {
      collection: jest.fn().mockImplementation((name: string) => ({
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: defaultMockModel },
        { provide: getModelToken(Branch.name), useValue: mockBranchModel },
        { provide: getModelToken(Cart.name), useValue: defaultMockModel },
        { provide: getModelToken(Wishlist.name), useValue: defaultMockModel },
        { provide: getModelToken(AuditLog.name), useValue: defaultMockModel },
        { provide: getModelToken(BranchFeedback.name), useValue: mockFeedbackModel },
        { provide: getModelToken(Medicine.name), useValue: defaultMockModel },
        { provide: getModelToken(WorkShift.name), useValue: defaultMockModel },
        { provide: getModelToken(WorkSchedule.name), useValue: defaultMockModel },
        { provide: getModelToken(ShiftSwapRequest.name), useValue: defaultMockModel },
        { provide: getModelToken(StaffNotification.name), useValue: defaultMockModel },
        { provide: getModelToken(CustomerSegment.name), useValue: defaultMockModel },
        { provide: getModelToken(StaffCertificate.name), useValue: defaultMockModel },
        { provide: getModelToken(Attendance.name), useValue: defaultMockModel },
        { provide: getModelToken(Payroll.name), useValue: defaultMockModel },
        { provide: getModelToken(LeaveRequest.name), useValue: defaultMockModel },
        { provide: getModelToken(SalesOrder.name), useValue: defaultMockModel },
        { provide: getModelToken(StaffTransferRequest.name), useValue: defaultMockModel },
        { provide: getModelToken(ShiftHandover.name), useValue: defaultMockModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        {
          provide: 'INVENTORY_SERVICE',
          useValue: {
            send: jest.fn(),
            emit: jest.fn(),
            subscribeToResponseOf: jest.fn(),
            connect: jest.fn().mockResolvedValue(true),
            close: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: 'AUTH_SERVICE',
          useValue: {
            send: jest.fn(),
            emit: jest.fn(),
            subscribeToResponseOf: jest.fn(),
            connect: jest.fn().mockResolvedValue(true),
            close: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Phân tích hiệu suất nhân viên & chi nhánh', () => {
    it('TC-PERF-NORM-01: Phân loại chính xác Top dược sĩ 5 sao và dược sĩ bị 1-2 sao', async () => {
      mockFeedbackModel.aggregate.mockResolvedValueOnce([
        {
          pharmacistId: 'staff-1',
          pharmacistName: 'DS. Nguyễn Văn An',
          branchId: 'BR-001',
          branchName: 'Chi nhánh Quận 1',
          totalFeedbacks: 20,
          avgRating: 4.9,
          fiveStarCount: 18,
          fourStarCount: 2,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0,
          negativeCount: 0,
          fiveStarRatio: 90,
          negativeRatio: 0,
          tagsList: [['Tư vấn nhiệt tình', 'Đúng liều'], ['Chuyên nghiệp']],
        },
        {
          pharmacistId: 'staff-2',
          pharmacistName: 'DS. Lê Thị Bình',
          branchId: 'BR-001',
          branchName: 'Chi nhánh Quận 1',
          totalFeedbacks: 15,
          avgRating: 2.3,
          fiveStarCount: 2,
          fourStarCount: 1,
          threeStarCount: 2,
          twoStarCount: 4,
          oneStarCount: 6,
          negativeCount: 10,
          fiveStarRatio: 13.3,
          negativeRatio: 66.7,
          tagsList: [['Thái độ chưa tốt', 'Tư vấn chậm'], ['Chờ lâu']],
        },
      ]);

      const res = await service.getStaffPerformanceReport({ branchId: 'BR-001' });

      expect(res.success).toBe(true);
      expect(res.totalStaffEvaluated).toBe(2);
      // Top 5 sao phải là DS. An
      expect(res.topFiveStarStaff[0].pharmacistName).toBe('DS. Nguyễn Văn An');
      expect(res.topFiveStarStaff[0].fiveStarCount).toBe(18);
      // At-risk 1-2 sao phải là DS. Bình
      expect(res.atRiskStaff[0].pharmacistName).toBe('DS. Lê Thị Bình');
      expect(res.atRiskStaff[0].negativeCount).toBe(10);
      expect(res.atRiskStaff[0].topTags).toEqual(
        expect.arrayContaining([{ tag: 'Thái độ chưa tốt', count: 1 }]),
      );
    });

    it('TC-PERF-NORM-02: Báo cáo hiệu suất chi nhánh tổng hợp chất lượng phục vụ và dữ liệu mua/bán', async () => {
      mockFeedbackModel.aggregate.mockResolvedValueOnce([
        {
          _id: 'BR-001',
          branchName: 'Chi nhánh Quận 1',
          totalFeedbacks: 50,
          avgRating: 4.8,
          fiveStarCount: 42,
          fourStarCount: 6,
          threeStarCount: 2,
          negativeCount: 0,
          resolvedCount: 0,
        },
        {
          _id: 'BR-002',
          branchName: 'Chi nhánh Bình Thạnh',
          totalFeedbacks: 30,
          avgRating: 2.8,
          fiveStarCount: 5,
          fourStarCount: 5,
          threeStarCount: 8,
          negativeCount: 12,
          resolvedCount: 10,
        },
      ]);

      // Mock dữ liệu mua hàng và bán hàng
      mockConnection.collection.mockImplementation((name: string) => {
        if (name === 'purchaseorders') {
          return {
            aggregate: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([
                { _id: 'BR-001', totalPoCount: 8, totalPurchaseValue: 120000000 },
                { _id: 'BR-002', totalPoCount: 4, totalPurchaseValue: 45000000 },
              ]),
            }),
          };
        }
        if (name === 'orders') {
          return {
            aggregate: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([
                { _id: 'BR-001', totalOrders: 250, totalSalesRevenue: 85000000 },
                { _id: 'BR-002', totalOrders: 110, totalSalesRevenue: 32000000 },
              ]),
            }),
          };
        }
        return { aggregate: () => ({ toArray: () => Promise.resolve([]) }) };
      });

      const res = await service.getBranchPerformanceReport();

      expect(res.success).toBe(true);
      expect(res.totalBranches).toBe(2);

      const br1 = res.branches.find((b: any) => b.branchId === 'BR-001');
      expect(br1.serviceQuality).toBe('EXCELLENT');
      expect(br1.procurement.totalPoCount).toBe(8);
      expect(br1.sales.totalSalesRevenue).toBe(85000000);

      const br2 = res.branches.find((b: any) => b.branchId === 'BR-002');
      expect(br2.serviceQuality).toBe('POOR');
      expect(br2.negativeCount).toBe(12);
      expect(br2.resolutionRate).toBe(83); // 10 / 12 = 83%
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Mốc biên 0 đánh giá, 100% 5 sao, chia cho 0 an toàn
  // =========================================================================
  describe('2. [Boundary Values] Mốc biên phân tích CSAT và tỷ lệ', () => {
    it('TC-PERF-BOUND-01: [Biên 0 đánh giá] Chi nhánh mới chưa có phản hồi trả về mặc định an toàn không lỗi NaN', async () => {
      mockFeedbackModel.aggregate.mockResolvedValueOnce([]); // Không có đánh giá nào

      const res = await service.getBranchPerformanceReport({ branchId: 'BR-001' });

      expect(res.success).toBe(true);
      expect(res.branches[0].totalFeedbacks).toBe(0);
      expect(res.branches[0].avgRating).toBe(5.0);
      expect(res.branches[0].positiveRatio).toBe(100);
      expect(res.branches[0].negativeRatio).toBe(0);
      expect(Number.isNaN(res.chainAverageRating)).toBe(false);
    });

    it('TC-PERF-BOUND-02: [Biên 100% 5 sao] Dược sĩ đạt tuyệt đối 5/5 sao trên 50 lượt đánh giá', async () => {
      mockFeedbackModel.aggregate.mockResolvedValueOnce([
        {
          pharmacistId: 'staff-perfect',
          pharmacistName: 'DS. Hoàn Hảo',
          branchId: 'BR-001',
          branchName: 'Chi nhánh Quận 1',
          totalFeedbacks: 50,
          avgRating: 5.0,
          fiveStarCount: 50,
          fourStarCount: 0,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0,
          negativeCount: 0,
          fiveStarRatio: 100,
          negativeRatio: 0,
          tagsList: [['Xuất sắc', 'Tận tâm']],
        },
      ]);

      const res = await service.getStaffPerformanceReport();

      expect(res.topFiveStarStaff[0].fiveStarRatio).toBe(100);
      expect(res.topFiveStarStaff[0].negativeCount).toBe(0);
      expect(res.atRiskStaff.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Ngoại lệ truy vấn, lỗi database mua hàng
  // =========================================================================
  describe('3. [Abnormal Values] Xử lý ngoại lệ và an toàn hệ thống', () => {
    it('TC-PERF-ABNORM-01: Hệ thống vẫn trả về báo cáo đánh giá phục vụ khi database mua hàng gặp lỗi', async () => {
      mockFeedbackModel.aggregate.mockResolvedValueOnce([
        {
          _id: 'BR-001',
          branchName: 'Chi nhánh Quận 1',
          totalFeedbacks: 10,
          avgRating: 4.5,
          fiveStarCount: 8,
          fourStarCount: 1,
          threeStarCount: 1,
          negativeCount: 0,
          resolvedCount: 0,
        },
      ]);

      // Giả lập lỗi truy vấn purchaseorders
      mockConnection.collection.mockImplementation((name: string) => {
        if (name === 'purchaseorders') {
          return {
            aggregate: jest.fn().mockImplementation(() => {
              throw new Error('Connection timeout to purchaseorders');
            }),
          };
        }
        return {
          aggregate: () => ({ toArray: () => Promise.resolve([]) }),
        };
      });

      const res = await service.getBranchPerformanceReport();

      expect(res.success).toBe(true);
      const br1 = res.branches.find((b: any) => b.branchId === 'BR-001');
      expect(br1).toBeDefined();
      expect(br1.procurement.totalPoCount).toBe(0);
      expect(br1.totalFeedbacks).toBe(10);
    });

    it('TC-PERF-ABNORM-02: Truy vấn với khoảng ngày ngược (startDate > endDate) vẫn thực thi an toàn không ném crash', async () => {
      mockFeedbackModel.aggregate.mockResolvedValueOnce([]);

      const res = await service.getStaffPerformanceReport({
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      });

      expect(res.success).toBe(true);
      expect(res.totalStaffEvaluated).toBe(0);
    });
  });
});
