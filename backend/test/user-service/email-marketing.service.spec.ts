/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmailMarketingService } from '../../apps/user-service/src/email-marketing.service';
import { EmailCampaign, EmailCampaignStatus } from '../../apps/user-service/src/schemas/email-campaign.schema';
import { EmailDeliveryLog, DeliveryStatus } from '../../apps/user-service/src/schemas/email-delivery-log.schema';
import { User } from '../../apps/auth-service/src/auth/user.schema';

/**
 * =========================================================================
 * BÀI KIỂM THỬ: EMAIL MARKETING & BẢO VỆ CHẾ ĐỘ SANDBOX RESEND (AUDIT P1)
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Playbook v2.0 & sep.md)
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values] Luồng nghiệp vụ chuẩn: gửi khi bật RESEND_SANDBOX_MODE='true' tường minh.
 * 2. [Boundary Values] Giá trị biên: Giữ trạng thái PARTIAL_FAILED để cho phép Admin cấu hình lại và Retry.
 * 3. [Abnormal Values] Dữ liệu dị thường: Chặn đứng việc tự ý gán SENT giả khi thiếu RESEND_API_KEY.
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */
describe('EmailMarketingService - Audit P1 Configuration & Sandbox Guard Suite', () => {
  let service: EmailMarketingService;
  let mockCampaignModel: any;
  let mockDeliveryLogModel: any;
  let mockUserModel: any;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_SANDBOX_MODE;

    mockCampaignModel = {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      save: jest.fn(),
    };

    mockDeliveryLogModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      bulkWrite: jest.fn().mockResolvedValue({ ok: 1 }),
    };

    mockUserModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailMarketingService,
        {
          provide: getModelToken(EmailCampaign.name),
          useValue: mockCampaignModel,
        },
        {
          provide: getModelToken(EmailDeliveryLog.name),
          useValue: mockDeliveryLogModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<EmailMarketingService>(EmailMarketingService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. [Normal Values] Luồng chuẩn khi được cấu hình Sandbox tường minh
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Nên cho phép mô phỏng gửi test email khi được cấu hình tường minh RESEND_SANDBOX_MODE=true', async () => {
      process.env.RESEND_SANDBOX_MODE = 'true';

      mockCampaignModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'camp-123',
          title: 'Ưu đãi tháng 11',
          subject: 'Giảm giá 20%',
        }),
      });

      const result = await service.sendTestEmail('camp-123', 'admin@vinapharmacy.com');
      expect(result.success).toBe(true);
      expect(result.messageId).toContain('sandbox-test-');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên: Giữ trạng thái cho phép gửi lại (Retry)
  // =========================================================================
  describe('[Boundary Values] Ranh giới & Cho phép Retry', () => {
    it('Nên đánh dấu chiến dịch PARTIAL_FAILED và ghi nhận lastError để Admin có thể cấu hình lại rồi Retry', async () => {
      const mockCampaign = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Chiến dịch thử nghiệm',
        status: EmailCampaignStatus.PROCESSING,
        save: jest.fn().mockResolvedValue(true),
      };

      mockCampaignModel.findOneAndUpdate.mockResolvedValue(mockCampaign);

      await expect(service.executeCampaignSend('507f1f77bcf86cd799439011')).rejects.toThrow(
        'Chưa cấu hình RESEND_API_KEY trên máy chủ',
      );

      // Trạng thái chiến dịch phải là PARTIAL_FAILED (không được là COMPLETED giả)
      expect(mockCampaign.status).toBe(EmailCampaignStatus.PARTIAL_FAILED);
      expect(mockCampaign.save).toHaveBeenCalled();

      // Delivery logs phải được cập nhật lỗi cấu hình
      expect(mockDeliveryLogModel.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: DeliveryStatus.FAILED,
            lastError: expect.stringContaining('Chưa cấu hình RESEND_API_KEY'),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Chặn giả lập ngầm khi thiếu RESEND_API_KEY
  // =========================================================================
  describe('[Abnormal Values] Chặn đứng giả mạo trạng thái SENT khi thiếu API Key', () => {
    it('Nên ném lỗi cấu hình khi phát tán chiến dịch mà thiếu RESEND_API_KEY và không bật Sandbox', async () => {
      const mockCampaign = {
        _id: '507f1f77bcf86cd799439012',
        title: 'Khuyến mãi khủng',
        status: EmailCampaignStatus.PROCESSING,
        save: jest.fn().mockResolvedValue(true),
      };

      mockCampaignModel.findOneAndUpdate.mockResolvedValue(mockCampaign);

      // Bắt buộc phải throw lỗi thay vì tự ý gán SENT và hoàn tất chiến dịch ảo
      await expect(service.executeCampaignSend('507f1f77bcf86cd799439012')).rejects.toThrow(
        /Chưa cấu hình RESEND_API_KEY/,
      );

      // Đảm bảo không gọi bulkWrite đánh dấu SENT ảo
      expect(mockDeliveryLogModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('Nên ném lỗi cấu hình khi gửi test email mà thiếu RESEND_API_KEY và không bật Sandbox', async () => {
      mockCampaignModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'camp-test-err',
          title: 'Chiến dịch Test',
          subject: 'Tiêu đề Test',
        }),
      });

      await expect(service.sendTestEmail('camp-test-err', 'test@example.com')).rejects.toThrow(
        'Chưa cấu hình RESEND_API_KEY trên máy chủ',
      );
    });
  });
});
