import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Inject,
  OnModuleInit,
  UseGuards,
  Req,
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
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.orderClient, [
      'orders.campaign.create',
      'orders.campaign.list',
      'orders.campaign.get_by_id',
      'orders.campaign.add_cost',
      'orders.campaign.analytics',
    ]);
  }

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
