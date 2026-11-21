import { Controller, Get, Inject, OnModuleInit, Query, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

/**
 * API Gateway Controller quản lý danh sách Giỏ gom hàng (Tote) tại Kho Tổng
 */
@ApiTags('🧺 Totes (Giỏ Gom Hàng)')
@ApiBearerAuth()
@Controller('api/totes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ToteController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, ['tote.get.all']);
  }

  @Get()
  @Roles('warehouse', 'director', 'head_branch', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách các giỏ gom hàng (TOTE-01..10) và trạng thái chiếm dụng' })
  async listTotes(@Query('status') status?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'tote.get.all', { status });
  }
}
