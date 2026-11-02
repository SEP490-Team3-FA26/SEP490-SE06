/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NewsletterCronService } from '../../apps/user-service/src/newsletter-cron.service';
import { EmailCampaign, EmailCampaignStatus } from '../../apps/user-service/src/schemas/email-campaign.schema';
import { EmailMarketingService } from '../../apps/user-service/src/email-marketing.service';

// Mock biến lưu trữ callback của cron
let scheduledCallback: (() => Promise<void>) | null = null;
let scheduledOptions: any = null;
let scheduledExpression: string | null = null;

jest.mock('node-cron', () => ({
  schedule: jest.fn((expr, cb, opts) => {
    scheduledExpression = expr;
    scheduledCallback = cb;
    scheduledOptions = opts;
    return {
      start: jest.fn(),
      stop: jest.fn(),
    };
  }),
}));

/**
 * Bộ kiểm thử đơn vị cho NewsletterCronService
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Rule 7) với đầy đủ 3 nhóm giá trị:
 * 1. [Normal Values]: Luồng nghiệp vụ chuẩn, scheduler khởi động và kích hoạt gửi chiến dịch đến hạn.
 * 2. [Boundary Values]: Giá trị biên, danh sách chiến dịch rỗng, biên 1 chiến dịch duy nhất.
 * 3. [Abnormal Values]: Database truy vấn lỗi, dịch vụ gửi email ném ngoại lệ bất đồng bộ.
 */
describe('NewsletterCronService - Automated Email Campaign Scheduler', () => {
  let service: NewsletterCronService;
  let mockCampaignModel: any;
  let mockEmailMarketingService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    scheduledCallback = null;
    scheduledOptions = null;
    scheduledExpression = null;

    mockCampaignModel = {
      find: jest.fn(),
    };

    mockEmailMarketingService = {
      executeCampaignSend: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterCronService,
        {
          provide: getModelToken(EmailCampaign.name),
          useValue: mockCampaignModel,
        },
        {
          provide: EmailMarketingService,
          useValue: mockEmailMarketingService,
        },
      ],
    }).compile();

    service = module.get<NewsletterCronService>(NewsletterCronService);
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('[Normal Values] Luồng hoạt động chuẩn của Newsletter Scheduler', () => {
    it('N-01: Khởi động Cron Scheduler thành công với chu kỳ 1 phút và múi giờ Việt Nam (Asia/Ho_Chi_Minh)', () => {
      service.onModuleInit();

      expect(scheduledExpression).toBe('* * * * *');
      expect(scheduledOptions).toEqual({ timezone: 'Asia/Ho_Chi_Minh' });
      expect(typeof scheduledCallback).toBe('function');
    });

    it('N-02: Quét và kích hoạt phát tán danh sách các chiến dịch email đã đến hạn', async () => {
      service.onModuleInit();

      const mockDueCampaigns = [
        { _id: 'camp_001', title: 'Ưu đãi tháng 11', scheduledAt: new Date() },
        { _id: 'camp_002', title: 'Khuyến mãi thành viên VIP', scheduledAt: new Date() },
      ];

      mockCampaignModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockDueCampaigns),
        }),
      });

      // Kích hoạt callback của Cron Job
      await scheduledCallback!();

      expect(mockCampaignModel.find).toHaveBeenCalledWith({
        status: EmailCampaignStatus.SCHEDULED,
        scheduledAt: { $lte: expect.any(Date) },
      });
      expect(mockEmailMarketingService.executeCampaignSend).toHaveBeenCalledTimes(2);
      expect(mockEmailMarketingService.executeCampaignSend).toHaveBeenCalledWith('camp_001');
      expect(mockEmailMarketingService.executeCampaignSend).toHaveBeenCalledWith('camp_002');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên và Idempotency
  // =========================================================================
  describe('[Boundary Values] Các trường hợp biên và không có chiến dịch', () => {
    it('B-01: Biên rỗng - Không có chiến dịch nào đến hạn gửi, kết thúc êm dịu không gọi executeCampaignSend', async () => {
      service.onModuleInit();

      mockCampaignModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      await scheduledCallback!();

      expect(mockCampaignModel.find).toHaveBeenCalled();
      expect(mockEmailMarketingService.executeCampaignSend).not.toHaveBeenCalled();
    });

    it('B-02: Biên 1 đơn vị - Đúng 1 chiến dịch duy nhất đến hạn, kích hoạt chính xác 1 lần', async () => {
      service.onModuleInit();

      const singleCampaign = [
        { _id: 'camp_single_99', title: 'Thông báo bảo trì hệ thống', scheduledAt: new Date() },
      ];

      mockCampaignModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(singleCampaign),
        }),
      });

      await scheduledCallback!();

      expect(mockEmailMarketingService.executeCampaignSend).toHaveBeenCalledTimes(1);
      expect(mockEmailMarketingService.executeCampaignSend).toHaveBeenCalledWith('camp_single_99');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu bất thường và ngoại lệ
  // =========================================================================
  describe('[Abnormal Values] Xử lý ngoại lệ an toàn và chống sập ứng dụng', () => {
    it('A-01: Ngoại lệ Database - Truy vấn campaignModel.find bị lỗi kết nối, scheduler bắt lỗi an toàn', async () => {
      service.onModuleInit();

      mockCampaignModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('MongoDB connection timeout')),
        }),
      });

      // Đảm bảo không ném ngoại lệ làm crash app
      await expect(scheduledCallback!()).resolves.not.toThrow();
      expect(mockEmailMarketingService.executeCampaignSend).not.toHaveBeenCalled();
    });

    it('A-02: Ngoại lệ gửi mail - executeCampaignSend trả về Promise Rejected, hệ thống ghi log và không sập vòng lặp', async () => {
      service.onModuleInit();

      const failingCampaigns = [
        { _id: 'camp_fail_01', title: 'Chiến dịch lỗi Resend', scheduledAt: new Date() },
      ];

      mockCampaignModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(failingCampaigns),
        }),
      });

      mockEmailMarketingService.executeCampaignSend.mockRejectedValue(
        new Error('Resend API Key Invalid'),
      );

      await expect(scheduledCallback!()).resolves.not.toThrow();
      expect(mockEmailMarketingService.executeCampaignSend).toHaveBeenCalledWith('camp_fail_01');
    });
  });
});
