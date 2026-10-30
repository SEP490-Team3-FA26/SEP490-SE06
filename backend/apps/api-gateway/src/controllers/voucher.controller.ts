import { Controller, Post, Get, Put, Delete, Body, Param, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { CreateVoucherDto, UpdateVoucherDto } from '../dto/voucher.dto';

@ApiTags('🎟️ Vouchers')
@Controller('api/vouchers')
@ApiBearerAuth()
export class VoucherController implements OnModuleInit {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.orderClient, [
      'vouchers.create',
      'vouchers.update',
      'vouchers.delete',
      'vouchers.list',
      'vouchers.validate',
      'vouchers.claim',
      'vouchers.audit.flags',
      'voucher.event.rule_update',
    ]);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing', 'branch')
  @ApiOperation({ summary: 'Tạo voucher khuyến mãi mới' })
  @AuditLogAction({
    actionCode: 'VOUCHER_CREATE',
    actionName: 'Tạo Voucher khuyến mãi',
    module: 'Voucher',
    eventType: 'CREATE',
    entityType: 'Voucher',
  })
  async createVoucher(@Body() data: CreateVoucherDto) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.create', data);
  }

  // Thiết lập quy tắc Voucher theo điều kiện (Mua X tặng Y)
  @Post('advanced-rules')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction({
    actionCode: 'VOUCHER_ADVANCED_RULES_CREATE',
    actionName: 'Thiết lập quy tắc Voucher nâng cao (Mua X tặng Y)',
    module: 'Voucher',
    eventType: 'CREATE',
    entityType: 'Voucher',
  })
  @ApiOperation({ summary: 'Tạo mã giảm giá theo điều kiện (Mua X tặng Y)' })
  async createAdvancedRules(@Body() data: any) {
    return await sendKafkaMessage(this.orderClient, 'voucher.event.rule_update', data);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách voucher khuyến mãi' })
  async listVouchers() {
    return await sendKafkaMessage(this.orderClient, 'vouchers.list', {});
  }

  // 🛡️ Kiểm soát truy cập: Chỉ Quản trị viên (admin) hoặc Giám đốc (director) mới được xem danh sách kiểm toán nghi vấn
  @Get('audit-flags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director')
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng bị gắn cờ kiểm toán voucher (Chỉ Admin / Giám đốc)' })
  async getVoucherAuditFlags() {
    return await sendKafkaMessage(this.orderClient, 'vouchers.audit.flags', {});
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing', 'branch')
  @ApiOperation({ summary: 'Cập nhật voucher khuyến mãi' })
  @AuditLogAction({
    actionCode: 'VOUCHER_UPDATE',
    actionName: 'Cập nhật Voucher khuyến mãi',
    module: 'Voucher',
    eventType: 'UPDATE',
    entityType: 'Voucher',
  })
  async updateVoucher(@Param('id') id: string, @Body() payload: UpdateVoucherDto) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.update', { id, payload });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Xóa voucher khuyến mãi' })
  @AuditLogAction({
    actionCode: 'VOUCHER_DELETE',
    actionName: 'Xóa Voucher khuyến mãi',
    module: 'Voucher',
    eventType: 'DELETE',
    entityType: 'Voucher',
  })
  async deleteVoucher(@Param('id') id: string) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.delete', { id });
  }

  @Post('validate')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Kiểm tra và tính toán giảm giá của Voucher (Đơn hàng, Mua X tặng Y)' })
  async validateVoucher(@Body() data: { code: string; subtotal: number; items?: any[]; branchId?: string }) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.validate', data);
  }

}
