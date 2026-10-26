import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as cron from 'node-cron';

import {
  EmailCampaign,
  EmailCampaignDocument,
  EmailCampaignStatus,
} from './schemas/email-campaign.schema';
import { EmailMarketingService } from './email-marketing.service';

// ===================================================================
// Dịch vụ Cron Job tự động quét và phát tán chiến dịch email
//
// — Chạy định kỳ mỗi 1 phút theo đúng múi giờ Việt Nam (Asia/Ho_Chi_Minh)
// — Quét EmailCampaign có status=SCHEDULED && scheduledAt <= NOW
// — Gọi executeCampaignSend() để bắt đầu gửi email
// — Cơ chế Atomic Lock trong executeCampaignSend() chống race condition
//   khi Cron Job chạy vượt qua 1 phút (chiến dịch gửi nhiều hơn 1 phút)
// ===================================================================
@Injectable()
export class NewsletterCronService implements OnModuleInit {
  private readonly logger = new Logger(NewsletterCronService.name);

  constructor(
    @InjectModel(EmailCampaign.name)
    private readonly campaignModel: Model<EmailCampaignDocument>,

    private readonly emailMarketingService: EmailMarketingService,
  ) {}

  // Khởi động Cron Job khi module được load
  onModuleInit() {
    this.startNewsletterScheduler();
  }

  // ===================================================================
  // Khởi động bộ lập lịch tự động phát tán email
  // ===================================================================
  private startNewsletterScheduler() {
    // Chạy mỗi phút 1 lần — Chuẩn múi giờ Việt Nam để đảm bảo gửi đúng giờ
    cron.schedule(
      '* * * * *',
      async () => {
        try {
          const now = new Date();

          // Quét tất cả chiến dịch đã đến thời điểm phát tán
          const dueCampaigns = await this.campaignModel
            .find({
              status: EmailCampaignStatus.SCHEDULED,
              scheduledAt: { $lte: now },
            })
            .select('_id title scheduledAt')
            .lean();

          if (!dueCampaigns.length) {
            return; // Không có chiến dịch nào cần gửi — thoát yên lặng
          }

          this.logger.log(
            `[Cron] Tìm thấy ${dueCampaigns.length} chiến dịch cần phát tán lúc ${now.toLocaleString('vi-VN')}`,
          );

          // Xử lý từng chiến dịch đến lịch (không chạy song song để tránh quá tải Resend)
          for (const camp of dueCampaigns) {
            this.logger.log(`[Cron] Bắt đầu phát tán: "${camp.title}" (${camp._id})`);
            // Không dùng await ở đây vì executeCampaignSend là tác vụ dài
            // Atomic Lock bên trong sẽ ngăn các Cron Job trùng lặp
            this.emailMarketingService
              .executeCampaignSend(camp._id.toString())
              .catch((err) => {
                this.logger.error(
                  `[Cron] Lỗi khi phát tán chiến dịch "${camp.title}": ${err.message}`,
                );
              });
          }
        } catch (error) {
          this.logger.error(`[Cron] Lỗi hệ thống Scheduler: ${error.message}`);
        }
      },
      {
        // Múi giờ Việt Nam — Server Cloud (AWS/Railway/Render) thường chạy UTC
        // Cần cấu hình rõ ràng để scheduledAt 08:00 SA là đúng 08:00 SA giờ VN
        timezone: 'Asia/Ho_Chi_Minh',
      },
    );

    this.logger.log(
      '⏰ [Newsletter Cron] Đã khởi động Scheduler — Chạy mỗi 1 phút (Asia/Ho_Chi_Minh)',
    );
  }
}
