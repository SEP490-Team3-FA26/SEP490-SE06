import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  OnModuleInit,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('📢 Marketing Campaigns & ROI')
@Controller('api/marketing/campaigns')
@UseGuards(JwtAuthGuard)
export class MarketingCampaignController implements OnModuleInit {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Subscribe reply topics cho Marketing Campaign (orders-service)
    await subscribeToKafkaTopics(this.orderClient, [
      'orders.campaign.create',
      'orders.campaign.list',
      'orders.campaign.get_by_id',
      'orders.campaign.add_cost',
      'orders.campaign.analytics',
    ]);

    // Subscribe reply topics cho Email Newsletter (user-service)
    await subscribeToKafkaTopics(this.userClient, [
      'email.campaign.create',
      'email.campaign.update',
      'email.campaign.get.all',
      'email.campaign.get.by.id',
      'email.campaign.send_test',
      'email.campaign.stats',
      'email.campaign.cancel',
      'email.campaign.delete',
      'email.newsletter.unsubscribe',
    ]);
  }

  // ===================================================================
  // MARKETING CAMPAIGN (ROI Tracking — orders-service)
  // ===================================================================

  @Post()
  @ApiOperation({ summary: 'Tạo chiến dịch Marketing mới' })
  @AuditLogAction({
    actionCode: 'CAMPAIGN_CREATE',
    actionName: 'Tạo chiến dịch Marketing',
    module: 'Marketing',
    eventType: 'CREATE',
    entityType: 'MarketingCampaign',
  })
  async createCampaign(@Body() body: any) {
    return await sendKafkaMessage(this.orderClient, 'orders.campaign.create', body);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chiến dịch Marketing' })
  async listCampaigns(@Query('status') status?: string) {
    return await sendKafkaMessage(this.orderClient, 'orders.campaign.list', { status });
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Báo cáo tổng hợp hiệu quả Marketing ROI & ROAS toàn chuỗi' })
  async getMarketingRoiAnalytics() {
    return await sendKafkaMessage(this.orderClient, 'orders.campaign.analytics', {});
  }

  // ===================================================================
  // EMAIL NEWSLETTER CAMPAIGN (Gửi Email Marketing — user-service)
  // Phải đặt TRƯỚC @Get(':id') để tránh Express nhận nhầm 'email' thành param :id
  // ===================================================================

  /**
   * Tạo chiến dịch Email Marketing mới
   * Admin đặt lịch gửi theo ngày bắt đầu khuyến mãi
   */
  @Post('email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo chiến dịch Email Newsletter mới (DRAFT/SCHEDULED)' })
  @AuditLogAction({
    actionCode: 'EMAIL_CAMPAIGN_CREATE',
    actionName: 'Tạo chiến dịch Email Newsletter',
    module: 'Marketing',
    eventType: 'CREATE',
    entityType: 'EmailCampaign',
  })
  async createEmailCampaign(@Body() body: any, @Req() req: any) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.create', {
      dto: body,
      createdBy: req.user?.userId || req.user?.sub,
    });
  }

  /**
   * Cập nhật thông tin chiến dịch Email Newsletter
   */
  @Put('email/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật chiến dịch Email Newsletter' })
  @AuditLogAction({
    actionCode: 'EMAIL_CAMPAIGN_UPDATE',
    actionName: 'Cập nhật chiến dịch Email Newsletter',
    module: 'Marketing',
    eventType: 'UPDATE',
    entityType: 'EmailCampaign',
  })
  async updateEmailCampaign(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.update', {
      id,
      dto: body,
    });
  }

  /**
   * Lấy danh sách chiến dịch Email Newsletter
   * Có thể lọc theo trạng thái: DRAFT, SCHEDULED, PROCESSING, COMPLETED...
   */
  @Get('email')
  @ApiOperation({ summary: 'Danh sách chiến dịch Email Newsletter' })
  async listEmailCampaigns(@Query('status') status?: string) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.get.all', { status });
  }

  /**
   * Lấy chi tiết 1 chiến dịch Email Newsletter
   */
  @Get('email/:id')
  @ApiOperation({ summary: 'Chi tiết chiến dịch Email Newsletter' })
  async getEmailCampaignById(@Param('id') id: string) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.get.by.id', { id });
  }

  /**
   * Lấy thống kê tiến độ gửi Real-time của chiến dịch
   * Frontend dùng để hiển thị Progress Bar và số liệu chạy số
   */
  @Get('email/:id/stats')
  @ApiOperation({ summary: 'Thống kê tiến độ gửi email (Real-time)' })
  async getEmailCampaignStats(@Param('id') id: string) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.stats', { campaignId: id });
  }

  /**
   * Gửi email thử nghiệm tới 1 địa chỉ bất kỳ
   * Admin kiểm tra giao diện email trước khi lên lịch chính thức
   */
  @Post('email/:id/send-test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi email test cho Admin kiểm tra giao diện' })
  async sendTestEmail(
    @Param('id') id: string,
    @Body() body: { testEmail: string },
  ) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.send_test', {
      campaignId: id,
      testEmail: body.testEmail,
    });
  }

  /**
   * Kích hoạt gửi ngay hoặc Retry chiến dịch bị PARTIAL_FAILED
   * Trả về 202 ACCEPTED (bất đồng bộ) — Kafka event trigger thực thi ngay
   */
  @Post('email/:id/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Kích hoạt / Retry gửi email chiến dịch (Async)' })
  @AuditLogAction({
    actionCode: 'EMAIL_CAMPAIGN_TRIGGER',
    actionName: 'Kích hoạt gửi Email Newsletter',
    module: 'Marketing',
    eventType: 'UPDATE',
    entityType: 'EmailCampaign',
  })
  async triggerEmailCampaign(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    // Emit event bất đồng bộ — user-service lắng nghe và gửi ngay
    this.userClient.emit('email.campaign.event.trigger', { campaignId: id });
    return {
      status: 'Accepted',
      message: 'Yêu cầu kích hoạt chiến dịch email đã được tiếp nhận. Hệ thống đang xử lý ngầm!',
    };
  }

  /**
   * Hủy lịch phát tán chiến dịch email (SCHEDULED -> CANCELLED)
   */
  @Post('email/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy lịch gửi chiến dịch Email' })
  @AuditLogAction({
    actionCode: 'EMAIL_CAMPAIGN_CANCEL',
    actionName: 'Hủy lịch gửi Email Newsletter',
    module: 'Marketing',
    eventType: 'UPDATE',
    entityType: 'EmailCampaign',
  })
  async cancelEmailCampaign(@Param('id') id: string) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.cancel', { id });
  }

  /**
   * Xóa chiến dịch Email Newsletter và nhật ký phát tán
   */
  @Delete('email/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa chiến dịch Email Newsletter' })
  @AuditLogAction({
    actionCode: 'EMAIL_CAMPAIGN_DELETE',
    actionName: 'Xóa chiến dịch Email Newsletter',
    module: 'Marketing',
    eventType: 'DELETE',
    entityType: 'EmailCampaign',
  })
  async deleteEmailCampaign(@Param('id') id: string) {
    return await sendKafkaMessage(this.userClient, 'email.campaign.delete', { id });
  }

  // ===================================================================
  // MARKETING CAMPAIGN CHI TIẾT & CHI PHÍ (Tham số động :id phải đặt sau)
  // ===================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chiến dịch Marketing' })
  async getCampaignById(@Param('id') id: string) {
    return await sendKafkaMessage(this.orderClient, 'orders.campaign.get_by_id', id);
  }

  @Post(':id/costs')
  @ApiOperation({ summary: 'Hạch toán chi phí phát sinh cho chiến dịch' })
  @AuditLogAction({
    actionCode: 'CAMPAIGN_ADD_COST',
    actionName: 'Hạch toán chi phí Marketing',
    module: 'Marketing',
    eventType: 'UPDATE',
    entityType: 'MarketingCampaign',
  })
  async addCampaignCost(@Param('id') id: string, @Body() costDto: any) {
    return await sendKafkaMessage(this.orderClient, 'orders.campaign.add_cost', {
      id,
      cost: costDto,
    });
  }
}
