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
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('📦 RFQ - Yêu cầu báo giá NCC')
@Controller('api/rfqs')
@UseGuards(JwtAuthGuard)
export class RfqController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.rfq.create',
      'inventory.rfq.list',
      'inventory.rfq.get_by_id',
      'inventory.rfq.send',
      'inventory.rfq.submit_quote',
      'inventory.rfq.award',
    ]);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo Yêu cầu báo giá (RFQ) mới' })
  @AuditLogAction({
    actionCode: 'RFQ_CREATE',
    actionName: 'Tạo Yêu cầu báo giá NCC',
    module: 'Procurement',
    eventType: 'CREATE',
    entityType: 'RequestForQuotation',
  })
  async createRfq(@Body() body: any, @Req() req: any) {
    const payload = {
      ...body,
      createdBy: req.user?.id || req.user?._id || 'ADMIN',
      createdByName: req.user?.name || req.user?.username || 'Quản lý thu mua',
      branchId: req.user?.branchId || 'CENTRAL_WH',
    };
    return await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.create', payload);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách RFQ' })
  async listRfqs(@Query('status') status?: string, @Query('branchId') branchId?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.list', {
      status,
      branchId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết RFQ và ma trận so sánh bảng báo giá' })
  async getRfqById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.get_by_id', id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Gửi RFQ đồng loạt qua email/portal cho các NCC' })
  @AuditLogAction({
    actionCode: 'RFQ_SEND_BULK',
    actionName: 'Gửi RFQ hàng loạt cho NCC',
    module: 'Procurement',
    eventType: 'UPDATE',
    entityType: 'RequestForQuotation',
  })
  async sendRfq(@Param('id') id: string) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.send', id);
    if (this.websocketGateway?.server) {
      this.websocketGateway.server.to('admin').emit('rfq_sent', { rfqId: id });
    }
    return result;
  }

  @Post(':id/quotations')
  @ApiOperation({ summary: 'Nộp/nhập bảng chào giá của Nhà cung cấp' })
  @AuditLogAction({
    actionCode: 'RFQ_SUBMIT_QUOTE',
    actionName: 'Ghi nhận báo giá NCC',
    module: 'Procurement',
    eventType: 'CREATE',
    entityType: 'SupplierQuotation',
  })
  async submitQuotation(@Param('id') id: string, @Body() quotationDto: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.submit_quote', {
      id,
      quotation: quotationDto,
    });
  }

  @Post(':id/award')
  @ApiOperation({ summary: 'Chọn thầu NCC và tự động phát hành đơn đặt hàng PO' })
  @AuditLogAction({
    actionCode: 'RFQ_AWARD',
    actionName: 'Chọn thầu RFQ & Sinh PO tự động',
    module: 'Procurement',
    eventType: 'UPDATE',
    entityType: 'RequestForQuotation',
  })
  async awardRfq(
    @Param('id') id: string,
    @Body() body: { quotationId: string; supplierId: string; reason?: string },
    @Req() req: any,
  ) {
    const awardPayload = {
      ...body,
      createdBy: req.user?.id || req.user?._id || 'ADMIN',
    };
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.award', {
      id,
      award: awardPayload,
    });

    if (this.websocketGateway?.server) {
      this.websocketGateway.server.to('admin').emit('rfq_awarded', {
        rfqId: id,
        poId: result?.po?._id,
      });
    }
    return result;
  }
}
