import {
  Controller,
  Post,
  Get,
  Inject,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { sendKafkaMessage } from '../common/kafka.helper';

/**
 * Controller công khai (Không cần xác thực JWT) cho 2 endpoint:
 * 1. Hủy đăng ký nhận email marketing (Unsubscribe 1-click từ link trong email)
 * 2. Nhận Webhook sự kiện từ Resend (bounced, delivered, complained)
 */
@ApiTags('📧 Email Newsletter (Public)')
@Controller('api/public/newsletter')
export class EmailNewsletterController {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
  ) {}

  /**
   * Endpoint hủy đăng ký nhận email marketing (Unsubscribe)
   * Khách hàng bấm link trong footer email → trỏ tới endpoint này
   * Link mẫu: /api/public/newsletter/unsubscribe?token=xxx&email=user@example.com
   */
  @Get('unsubscribe')
  @ApiOperation({
    summary: 'Hủy đăng ký nhận email marketing (1-click từ link trong email)',
  })
  async unsubscribe(
    @Query('token') token: string,
    @Query('email') email: string,
  ) {
    if (!token || !email) {
      return {
        success: false,
        message: 'Link hủy đăng ký không hợp lệ. Vui lòng thử lại.',
      };
    }

    return await sendKafkaMessage(this.userClient, 'email.newsletter.unsubscribe', {
      token,
      email: decodeURIComponent(email),
    });
  }

  /**
   * Endpoint nhận Webhook từ Resend
   * Xử lý các sự kiện: email.bounced (Hard Bounce → vô hiệu hóa email),
   *                     email.delivered, email.complained
   * Cần đăng ký URL này trong Dashboard của Resend
   */
  @Post('webhook/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook Resend nhận sự kiện email (bounced/delivered/complained)',
  })
  async resendWebhook(@Body() event: any) {
    // Emit bất đồng bộ — không cần chờ kết quả
    this.userClient.emit('email.resend.webhook', event);
    return { received: true };
  }
}
