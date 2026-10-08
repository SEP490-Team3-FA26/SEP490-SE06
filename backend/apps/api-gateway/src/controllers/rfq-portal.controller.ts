import { Controller, Get, Post, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';

@ApiTags('🌐 Public RFQ Supplier Portal (Magic Link)')
@Controller('api/rfq-portal')
export class RfqPortalController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.rfq.get_by_token',
      'inventory.rfq.submit_by_token',
    ]);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Lấy thông tin RFQ dành cho NCC qua Token định danh (Không cần đăng nhập)' })
  async getRfqByToken(@Param('token') token: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.get_by_token', { token });
  }

  @Post(':token/quote')
  @ApiOperation({ summary: 'NCC nộp bảng báo giá trực tiếp qua Token định danh' })
  async submitQuoteByToken(@Param('token') token: string, @Body() body: any) {
    const res = await sendKafkaMessage(this.inventoryClient, 'inventory.rfq.submit_by_token', {
      token,
      quotation: body,
    });

    // Phát sự kiện realtime cho ban quản trị / thu mua
    try {
      this.websocketGateway.server.emit('rfq_quote_submitted', {
        token,
        timestamp: new Date(),
      });
    } catch (err) {
      // Ignored if socket fails
    }

    return res;
  }
}
