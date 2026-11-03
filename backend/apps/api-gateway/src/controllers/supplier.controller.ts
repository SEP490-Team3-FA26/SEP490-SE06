import { Controller, Get, Post, Put, Delete, Body, Param, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('🏢 Suppliers')
@ApiBearerAuth()
@Controller('api/suppliers')
@UseGuards(JwtAuthGuard)
export class SupplierController implements OnModuleInit {
  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.supplierClient, [
      'supplier.get_all',
      'supplier.get_by_id',
      'supplier.create',
      'supplier.update',
      'supplier.delete',
    ]);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả nhà cung cấp GDP' })
  async getAllSuppliers() {
    return await sendKafkaMessage(this.supplierClient, 'supplier.get_all', {});
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết nhà cung cấp theo ID' })
  async getSupplierById(@Param('id') id: string) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.get_by_id', { id });
  }

  @Post()
  @ApiOperation({ summary: 'Tạo nhà cung cấp mới' })
  @AuditLogAction({
    actionCode: 'SUPPLIER_CREATE',
    actionName: 'Tạo nhà cung cấp',
    module: 'Supplier',
    eventType: 'CREATE',
    entityType: 'Supplier',
  })
  async createSupplier(@Body() data: any) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.create', data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhà cung cấp' })
  @AuditLogAction({
    actionCode: 'SUPPLIER_UPDATE',
    actionName: 'Cập nhật nhà cung cấp',
    module: 'Supplier',
    eventType: 'UPDATE',
    entityType: 'Supplier',
  })
  async updateSupplier(@Param('id') id: string, @Body() data: any) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.update', { id, data });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhà cung cấp' })
  @AuditLogAction({
    actionCode: 'SUPPLIER_DELETE',
    actionName: 'Xóa nhà cung cấp',
    module: 'Supplier',
    eventType: 'DELETE',
    entityType: 'Supplier',
  })
  async deleteSupplier(@Param('id') id: string) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.delete', { id });
  }
}
