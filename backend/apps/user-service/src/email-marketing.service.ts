import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Resend } from 'resend';

import {
  EmailCampaign,
  EmailCampaignDocument,
  EmailCampaignStatus,
  TargetAudience,
} from './schemas/email-campaign.schema';
import {
  EmailDeliveryLog,
  EmailDeliveryLogDocument,
  DeliveryStatus,
} from './schemas/email-delivery-log.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';
import { buildPromotionEmailHtml } from './utils/email-template.builder';
import { CreateEmailCampaignDto } from './dto/email-campaign.dto';

// ===================================================================
// Hằng số cấu hình gửi Batch Email
// ===================================================================
const BATCH_SIZE = 100;        // Giới hạn tối đa Resend Batch API: 100 mail/request
const BATCH_DELAY_MS = 1000;   // Nghỉ 1 giây giữa các lô để tránh Rate Limit 429
const MAX_RETRY_ATTEMPTS = 3;  // Số lần thử lại tối đa cho mỗi email lỗi

// ===================================================================
// Tiện ích chia mảng thành các lô nhỏ
// ===================================================================
function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

// Tiện ích tạm dừng để tránh Rate Limit Resend
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class EmailMarketingService {
  private readonly logger = new Logger(EmailMarketingService.name);
  private readonly resend: Resend;

  constructor(
    @InjectModel(EmailCampaign.name)
    private readonly campaignModel: Model<EmailCampaignDocument>,

    @InjectModel(EmailDeliveryLog.name)
    private readonly deliveryLogModel: Model<EmailDeliveryLogDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    // Khởi tạo Resend client với API Key từ biến môi trường
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // ===================================================================
  // CRUD: Tạo chiến dịch mới (Lưu DRAFT hoặc SCHEDULED)
  // ===================================================================
  async createCampaign(dto: CreateEmailCampaignDto, createdBy?: string): Promise<any> {
    const parsedDate = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(Date.now() + 86400000);
    const scheduledAt = isNaN(parsedDate.getTime()) ? new Date(Date.now() + 86400000) : parsedDate;
    const now = new Date();

    // Xác định trạng thái: Ưu tiên giữ DRAFT nếu người dùng chủ động chọn lưu nháp
    const status =
      dto.status ||
      (dto.sendMode === 'IMMEDIATE' || scheduledAt <= now
        ? EmailCampaignStatus.SCHEDULED
        : EmailCampaignStatus.DRAFT);

    const validCreatedBy =
      createdBy && Types.ObjectId.isValid(createdBy)
        ? new Types.ObjectId(createdBy)
        : undefined;

    const campaign = new this.campaignModel({
      ...dto,
      scheduledAt,
      status,
      createdBy: validCreatedBy,
    });

    const saved = await campaign.save();
    this.logger.log(`✅ Đã tạo chiến dịch email mới: "${saved.title}" — ID: ${saved._id}`);
    return saved.toObject();
  }

  // ===================================================================
  // Cập nhật thông tin chiến dịch email
  // ===================================================================
  async updateCampaign(campaignId: string, dto: Partial<CreateEmailCampaignDto>): Promise<any> {
    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      throw new Error(`Không tìm thấy chiến dịch email với ID: ${campaignId}`);
    }

    if (campaign.status === EmailCampaignStatus.PROCESSING) {
      throw new Error('Không thể chỉnh sửa chiến dịch đang trong tiến trình phát tán email!');
    }

    const updateData: any = { ...dto };
    delete updateData._id;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;

    if (dto.scheduledAt) {
      const parsedDate = new Date(dto.scheduledAt);
      if (!isNaN(parsedDate.getTime())) {
        updateData.scheduledAt = parsedDate;
      }
    }

    const updated = await this.campaignModel.findByIdAndUpdate(
      campaignId,
      { $set: updateData },
      { new: true },
    ).lean();

    this.logger.log(`✏️ Đã cập nhật chiến dịch email: "${updated.title}" — ID: ${campaignId}`);
    return updated;
  }

  // ===================================================================
  // Lấy danh sách chiến dịch email
  // ===================================================================
  async getAllCampaigns(status?: string): Promise<EmailCampaign[]> {
    const filter = status ? { status } : {};
    return this.campaignModel
      .find(filter)
      .sort({ createdAt: -1 })
      .select('-mainContentHtml') // Bỏ HTML nặng ra khỏi list view
      .lean();
  }

  // ===================================================================
  // Lấy chi tiết 1 chiến dịch theo ID
  // ===================================================================
  async getCampaignById(id: string): Promise<EmailCampaign> {
    return this.campaignModel.findById(id).lean();
  }

  // ===================================================================
  // Lấy thống kê tiến độ gửi của 1 chiến dịch (Real-time)
  // ===================================================================
  async getCampaignStats(campaignId: string) {
    const [campaign, sentCount, failedCount, pendingCount] = await Promise.all([
      this.campaignModel.findById(campaignId).select('title status stats scheduledAt').lean(),
      this.deliveryLogModel.countDocuments({ campaignId, status: DeliveryStatus.SENT }),
      this.deliveryLogModel.countDocuments({ campaignId, status: DeliveryStatus.FAILED }),
      this.deliveryLogModel.countDocuments({ campaignId, status: DeliveryStatus.PENDING }),
    ]);

    return {
      ...campaign,
      realtimeStats: { sentCount, failedCount, pendingCount },
    };
  }

  // ===================================================================
  // HỦY LỊCH GỬI CHIẾN DỊCH (Chuyển sang CANCELLED)
  // ===================================================================
  async cancelCampaign(campaignId: string): Promise<any> {
    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      throw new Error(`Không tìm thấy chiến dịch email với ID: ${campaignId}`);
    }

    if (campaign.status === EmailCampaignStatus.PROCESSING) {
      throw new Error('Không thể hủy chiến dịch đang trong tiến trình gửi email!');
    }

    campaign.status = EmailCampaignStatus.CANCELLED;
    const saved = await campaign.save();

    // Cập nhật các log email chưa gửi (PENDING) để không gửi nhầm
    await this.deliveryLogModel.updateMany(
      { campaignId, status: DeliveryStatus.PENDING },
      { $set: { status: DeliveryStatus.FAILED, lastError: 'Chiến dịch đã bị hủy bởi Quản trị viên' } },
    );

    this.logger.log(`🛑 Đã hủy chiến dịch email: "${saved.title}" — ID: ${saved._id}`);
    return saved.toObject();
  }

  // ===================================================================
  // XÓA VĨNH VIỄN CHIẾN DỊCH & LOG PHÁT TÁN LIÊN QUAN
  // ===================================================================
  async deleteCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      throw new Error(`Không tìm thấy chiến dịch email với ID: ${campaignId}`);
    }

    if (campaign.status === EmailCampaignStatus.PROCESSING) {
      throw new Error('Không thể xóa chiến dịch đang trong tiến trình phát tán email!');
    }

    // Xóa chiến dịch và toàn bộ nhật ký phát tán liên quan
    await Promise.all([
      this.campaignModel.findByIdAndDelete(campaignId),
      this.deliveryLogModel.deleteMany({ campaignId }),
    ]);

    this.logger.log(`🗑️ Đã xóa hoàn toàn chiến dịch email "${campaign.title}" (ID: ${campaignId})`);
    return { success: true, message: `Đã xóa thành công chiến dịch "${campaign.title}"` };
  }

  // ===================================================================
  // BƯỚC 1: Chuẩn bị danh sách người nhận — tạo EmailDeliveryLog
  //
  // — Chỉ lọc User có email hợp lệ, đồng ý nhận tin, chưa bị hard bounce
  // — Phân khúc: ALL (Tất cả khách hàng) hoặc VIP (Hội viên Vàng, Bạch Kim, điểm cao)
  // — Dùng upsert $setOnInsert để chống tạo log trùng khi Retry
  // ===================================================================
  async prepareCampaignRecipients(campaign: EmailCampaignDocument): Promise<number> {
    // Xây dựng query lọc người nhận hợp lệ
    const query: Record<string, any> = {
      // Khách hàng đồng ý nhận tin (mặc định chấp nhận nếu chưa có field để tương thích tài khoản cũ)
      'newsletter.isSubscribed': { $ne: false },
      // Email chưa từng bị Hard Bounce (chưa bị Resend báo hỏng)
      'newsletter.isEmailValid': { $ne: false },
      // Email có định dạng chuẩn RFC, không rỗng
      email: {
        $exists: true,
        $ne: '',
        $regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      role: 'user', // Chỉ gửi cho khách hàng mua sắm, không gửi cho nhân viên/admin
    };

    // Phân khúc khách hàng mục tiêu
    if (campaign.targetAudience === TargetAudience.VIP) {
      // Khách hàng VIP: Hạng Gold/Platinum hoặc điểm trọn đời >= 1000 hoặc điểm hiện tại >= 500 hoặc gán nhãn VIP
      query['$or'] = [
        { tier: { $in: ['Gold', 'Platinum', 'VIP', 'Vip', 'gold', 'platinum'] } },
        { targetGroup: 'VIP' },
        { accumulatedPoints: { $gte: 1000 } },
        { points: { $gte: 500 } },
      ];
    }

    const users = await this.userModel
      .find(query)
      .select('_id fullName email newsletter tier points accumulatedPoints')
      .lean();

    if (!users.length) {
      this.logger.warn(`⚠️ Chiến dịch "${campaign.title}": Không tìm thấy người nhận hợp lệ trong tệp ${campaign.targetAudience}`);
      return 0;
    }

    // Tạo batch upsert để chống trùng lặp khi Retry
    const bulkOps = users.map((user) => {
      const token =
        (user as any).newsletter?.unsubscribeToken ||
        crypto.randomBytes(16).toString('hex');
      return {
        updateOne: {
          filter: {
            campaignId: campaign._id,
            email: (user.email as string).toLowerCase(),
          },
          update: {
            $setOnInsert: {
              campaignId: campaign._id,
              userId: user._id,
              email: (user.email as string).toLowerCase(),
              customerName: user.fullName || 'Quý khách',
              unsubscribeToken: token,
              status: DeliveryStatus.PENDING,
              attempts: 0,
            },
          },
          upsert: true,
        },
      };
    });

    await this.deliveryLogModel.bulkWrite(bulkOps, { ordered: false });

    // Đếm tổng số thực tế sau upsert (có thể cao hơn số user hiện tại nếu đã có log cũ)
    const totalCount = await this.deliveryLogModel.countDocuments({
      campaignId: campaign._id,
    });

    // Cập nhật tổng số người nhận vào campaign
    await this.campaignModel.findByIdAndUpdate(campaign._id, {
      'stats.totalRecipients': totalCount,
    });

    this.logger.log(`📋 Chiến dịch "${campaign.title}": Đã chuẩn bị ${totalCount} người nhận`);
    return totalCount;
  }

  // ===================================================================
  // BƯỚC 2: Thực thi gửi email theo lô (Batch Execution)
  //
  // — Khóa chiến dịch bằng Atomic Update để chống Race Condition
  // — Chỉ gửi các email PENDING hoặc FAILED < 3 lần (cho phép Retry)
  // — Chia thành lô 100 người, nghỉ 1 giây giữa các lô
  // ===================================================================
  async executeCampaignSend(campaignId: string): Promise<void> {
    // Khóa chiến dịch bằng Atomic findOneAndUpdate — chống 2 worker chạy trùng
    const campaign = await this.campaignModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(campaignId),
        status: { $in: [EmailCampaignStatus.SCHEDULED, EmailCampaignStatus.PARTIAL_FAILED] },
      },
      { $set: { status: EmailCampaignStatus.PROCESSING, startedAt: new Date() } },
      { new: true },
    );

    if (!campaign) {
      // Đã có tiến trình khác xử lý hoặc trạng thái không hợp lệ — tự dừng
      this.logger.debug(`[Cron] Bỏ qua chiến dịch ${campaignId} — đã xử lý hoặc không hợp lệ`);
      return;
    }

    this.logger.log(`🚀 Bắt đầu gửi chiến dịch: "${campaign.title}" (${campaignId})`);

    // Bước 1: Chuẩn bị danh sách người nhận (upsert — safe for retry)
    await this.prepareCampaignRecipients(campaign);

    // Chỉ lấy email chưa gửi (PENDING) hoặc lỗi chưa quá số lần thử (FAILED < 3)
    const pendingLogs = await this.deliveryLogModel
      .find({
        campaignId: campaign._id,
        status: { $in: [DeliveryStatus.PENDING, DeliveryStatus.FAILED] },
        attempts: { $lt: MAX_RETRY_ATTEMPTS },
      })
      .lean();

    if (!pendingLogs.length) {
      this.logger.log(`✅ Chiến dịch "${campaign.title}": Tất cả email đã được gửi trước đó`);
      campaign.status = EmailCampaignStatus.COMPLETED;
      campaign.completedAt = new Date();
      await campaign.save();
      return;
    }

    const batches = chunkArray(pendingLogs, BATCH_SIZE);
    this.logger.log(
      `📦 Chia thành ${batches.length} lô (${BATCH_SIZE} email/lô) — Tổng: ${pendingLogs.length} email`,
    );

    // ---------------------------------------------------------------
    // Vòng lặp gửi từng lô 100 email
    // ---------------------------------------------------------------
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.log(`📤 Đang gửi lô ${i + 1}/${batches.length} (${batch.length} email)...`);

      // Xây dựng payload email riêng biệt cho từng người nhận (cá nhân hóa)
      const emailPayloads = batch.map((log) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${log.unsubscribeToken}&email=${encodeURIComponent(log.email)}`;

        const htmlContent = buildPromotionEmailHtml({
          customerName: log.customerName,
          preheader: campaign.preheader || campaign.discountSummary,
          bannerUrl: campaign.bannerUrl,
          greetingText: campaign.greetingText,
          mainContentHtml: campaign.mainContentHtml,
          voucherCode: campaign.voucherCode,
          discountSummary: campaign.discountSummary,
          promotionEndDate: campaign.promotionEndDate,
          featuredProducts: campaign.featuredProducts as any[],
          ctaButtonText: campaign.ctaButtonText,
          ctaButtonUrl: campaign.ctaButtonUrl,
          subject: campaign.subject,
          termsAndConditions: (campaign as any).termsAndConditions,
          unsubscribeUrl,
        });

        return {
          from:
            process.env.RESEND_FROM_EMAIL ||
            'ABC Pharmacy <no-reply@abcpharmacy.store>',
          to: [log.email],
          subject: campaign.subject,
          html: htmlContent,
          headers: {
            // Header chuẩn RFC 2369 — giúp Gmail không đánh dấu Spam
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        };
      });

      try {
        // Kiểm tra chế độ Sandbox (dev/demo không có Domain Resend)
        const isSandbox = process.env.RESEND_SANDBOX_MODE === 'true';

        if (isSandbox) {
          // Chế độ Sandbox: Mô phỏng thành công để demo mượt mà
          this.logger.debug(`[Sandbox] Mô phỏng gửi ${batch.length} email thành công`);
          const mockOps = batch.map((log) => ({
            updateOne: {
              filter: { _id: log._id },
              update: {
                $set: {
                  status: DeliveryStatus.SENT,
                  resendMessageId: `sandbox-${Date.now()}-${log._id}`,
                  sentAt: new Date(),
                  lastError: null,
                },
                $inc: { attempts: 1 },
              },
            },
          }));
          await this.deliveryLogModel.bulkWrite(mockOps);
        } else {
          // Production: Gọi Resend Batch API thực sự
          const { data, error } = await this.resend.batch.send(emailPayloads as any);

          if (error) {
            throw new Error(`Resend API Error: ${error.message}`);
          }

          // Cập nhật trạng thái SENT + resendMessageId cho từng email trong lô
          const responseItems = (data as any)?.data || [];
          const successOps = batch.map((log, idx) => ({
            updateOne: {
              filter: { _id: log._id },
              update: {
                $set: {
                  status: DeliveryStatus.SENT,
                  resendMessageId: responseItems[idx]?.id || null,
                  sentAt: new Date(),
                  lastError: null,
                },
                $inc: { attempts: 1 },
              },
            },
          }));
          await this.deliveryLogModel.bulkWrite(successOps);
        }

        this.logger.log(`✅ Lô ${i + 1}: Gửi thành công ${batch.length} email`);
      } catch (err) {
        // Nếu lỗi cả lô (rớt mạng, Rate Limit...) — ghi nhận để Retry sau
        this.logger.error(`❌ Lô ${i + 1}: Lỗi gửi — ${err.message}`);
        await this.deliveryLogModel.updateMany(
          { _id: { $in: batch.map((item) => item._id) } },
          {
            $set: { status: DeliveryStatus.FAILED, lastError: err.message },
            $inc: { attempts: 1 },
          },
        );
      }

      // Nghỉ 1 giây trước lô tiếp theo để tránh Rate Limit Resend
      if (i < batches.length - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // ---------------------------------------------------------------
    // Tổng kết — Cập nhật trạng thái cuối cùng của chiến dịch
    // ---------------------------------------------------------------
    const [sentCount, failedCount] = await Promise.all([
      this.deliveryLogModel.countDocuments({
        campaignId: campaign._id,
        status: DeliveryStatus.SENT,
      }),
      this.deliveryLogModel.countDocuments({
        campaignId: campaign._id,
        status: { $in: [DeliveryStatus.FAILED, DeliveryStatus.PENDING] },
      }),
    ]);

    campaign.stats.sentCount = sentCount;
    campaign.stats.failedCount = failedCount;
    campaign.completedAt = new Date();
    campaign.status =
      failedCount === 0
        ? EmailCampaignStatus.COMPLETED
        : EmailCampaignStatus.PARTIAL_FAILED;

    await campaign.save();

    this.logger.log(
      `🏁 Chiến dịch "${campaign.title}" hoàn tất: ${sentCount} SENT / ${failedCount} FAILED — Status: ${campaign.status}`,
    );
  }

  // ===================================================================
  // Gửi email thử nghiệm (Test Mail) — Cho phép Admin preview bố cục
  // Luôn gửi thực sự (không bị ảnh hưởng bởi SANDBOX_MODE)
  // ===================================================================
  async sendTestEmail(campaignId: string, testEmail: string): Promise<{ success: boolean; messageId?: string }> {
    const campaign = await this.campaignModel.findById(campaignId).lean();

    if (!campaign) {
      throw new Error(`Không tìm thấy chiến dịch với ID: ${campaignId}`);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=test-token&email=${encodeURIComponent(testEmail)}`;

    const htmlContent = buildPromotionEmailHtml({
      customerName: '[TÊN KHÁCH HÀNG MẪU]',
      preheader: campaign.preheader || campaign.discountSummary,
      bannerUrl: campaign.bannerUrl,
      greetingText: campaign.greetingText,
      mainContentHtml: campaign.mainContentHtml,
      voucherCode: campaign.voucherCode,
      discountSummary: campaign.discountSummary,
      promotionEndDate: campaign.promotionEndDate,
      featuredProducts: campaign.featuredProducts as any[],
      ctaButtonText: campaign.ctaButtonText,
      ctaButtonUrl: campaign.ctaButtonUrl,
      subject: campaign.subject,
      termsAndConditions: (campaign as any).termsAndConditions,
      unsubscribeUrl,
    });

    const isSandbox = process.env.RESEND_SANDBOX_MODE === 'true';
    if (isSandbox) {
      this.logger.log(`🧪 [Sandbox] Mô phỏng gửi test email thành công tới ${testEmail}`);
      return { success: true, messageId: `sandbox-test-${Date.now()}` };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL || 'ABC Pharmacy <no-reply@abcpharmacy.store>',
        to: [testEmail],
        subject: `[TEST] ${campaign.subject}`,
        html: htmlContent,
      } as any);

      if (error) {
        this.logger.error(`❌ Gửi test email thất bại: ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`📧 Test email gửi thành công tới ${testEmail} — ID: ${(data as any)?.id}`);
      return { success: true, messageId: (data as any)?.id };
    } catch (err: any) {
      this.logger.error(`❌ Lỗi gửi test email: ${err.message}`);
      throw new Error(`Lỗi Resend Email: ${err.message}`);
    }
  }

  // ===================================================================
  // Xử lý hủy đăng ký nhận email (Unsubscribe) qua token bảo mật
  // Đặt newsletter.isSubscribed = false để loại khỏi mọi chiến dịch sau
  // ===================================================================
  async unsubscribeNewsletter(token: string, email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findOne({
      email: email.toLowerCase(),
      'newsletter.unsubscribeToken': token,
    });

    if (!user) {
      return { success: false, message: 'Token hủy đăng ký không hợp lệ hoặc đã hết hạn.' };
    }

    if (!(user as any).newsletter?.isSubscribed) {
      return { success: true, message: 'Bạn đã hủy đăng ký từ trước. Cảm ơn!' };
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: {
        'newsletter.isSubscribed': false,
        'newsletter.unsubscribedAt': new Date(),
      },
    });

    this.logger.log(`✅ Đã hủy đăng ký email marketing cho: ${email}`);
    return { success: true, message: 'Đã hủy đăng ký nhận email khuyến mãi thành công!' };
  }

  // ===================================================================
  // Xử lý Webhook Resend — Cập nhật trạng thái Hard Bounce
  // Khi email bounce → đặt newsletter.isEmailValid = false để loại khỏi
  // mọi chiến dịch sau, bảo vệ Domain Reputation
  // ===================================================================
  async handleResendWebhook(event: any): Promise<void> {
    const { type, data } = event;

    if (type === 'email.bounced') {
      const bouncedEmail = data?.email_to;
      if (bouncedEmail) {
        await this.userModel.findOneAndUpdate(
          { email: bouncedEmail.toLowerCase() },
          { $set: { 'newsletter.isEmailValid': false } },
        );
        this.logger.warn(`⚠️ Hard Bounce: Đã vô hiệu hóa email ${bouncedEmail}`);
      }
    }

    if (type === 'email.delivered') {
      // Cập nhật trạng thái delivered trong DeliveryLog (nếu cần trace)
      const deliveredEmail = data?.email_to;
      const messageId = data?.email_id;
      if (messageId) {
        await this.deliveryLogModel.findOneAndUpdate(
          { resendMessageId: messageId },
          { $set: { status: DeliveryStatus.SENT } },
        );
      }
      this.logger.debug(`📬 Delivered: ${deliveredEmail}`);
    }
  }
}
