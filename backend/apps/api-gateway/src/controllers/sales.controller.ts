import { Controller, Post, Get, Body, Param, Query, Inject, OnModuleInit, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('api/sales')
@UseGuards(OptionalJwtAuthGuard)
export class SalesController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.sale.create',
      'inventory.sale.list',
      'inventory.sale.get',
      'inventory.sale.return',
      'inventory.sale.exchange',
    ]);
    await subscribeToKafkaTopics(this.userClient, [
      'hr.attendance.verify_active_shift',
    ]);
  }

  @Post()
  @AuditLogAction({
    actionCode: 'SALES_CREATE',
    actionName: 'Bán lẻ thuốc tại quầy',
    module: 'Sales',
    eventType: 'CREATE',
    entityType: 'SalesOrder',
  })
  async createSalesOrder(@Body() data: any, @Req() req: any) {
    if (req.user) {
      // Ghi đè tuyệt đối từ JWT claims để chống Parameter Tampering / trục lợi hoa hồng (T-SEC-02)
      data.soldBy = req.user.fullName || data.soldBy;
      data.pharmacistId = req.user.sub;
      if (['pharmacist', 'branch'].includes(req.user.role) && req.user.branchId) {
        data.branchId = req.user.branchId;
      }
    }

    // Chốt chặn ca trực và điểm danh cho Dược sĩ (POS Shift Guard)
    if (req.user?.role === 'pharmacist') {
      const shiftVerification: any = await sendKafkaMessage(this.userClient, 'hr.attendance.verify_active_shift', {
        pharmacistId: req.user.sub,
        branchId: req.user.branchId || data.branchId,
      });
      if (!shiftVerification?.allowed) {
        throw new ForbiddenException(
          shiftVerification?.reason ||
            'Dược sĩ chưa đến ca làm việc hoặc chưa điểm danh ca trực hôm nay qua ứng dụng di động. Không thể thực hiện bán hàng!',
        );
      }
    }

    if (data.type === 'PRESCRIPTION') {
      if (!req.user?.sub) {
        throw new RpcException({ message: 'Chỉ dược sĩ đã đăng nhập mới được duyệt đơn kê đơn', statusCode: 403 });
      }
      data.approvedBy = req.user.sub;
      data.approvedAt = new Date().toISOString();
    }
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.sale.create', data);
    
    // Evict seasonal analysis cache on sales changes
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const branch = data.branchId || 'all';
      await this.cacheManager.del(`reports:seasonal-analysis:${branch}:${currentMonth}`);
      await this.cacheManager.del(`reports:seasonal-analysis:all:${currentMonth}`);
      console.log(`🗑️ [Cache Evict] Evicted seasonal analysis cache for branch ${branch}`);
    } catch (err) {
      console.error('Lỗi xóa cache trong SalesController:', err);
    }

    return result;
  }

  @Get()
  async listSalesOrders(@Query('search') search?: string, @Query('type') type?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.list', { search, type });
  }

  @Get(':id')
  async getSalesOrderById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.get', { id });
  }

  @Post('return')
  async processReturn(@Body() data: any, @Req() req: any) {
    if (req.user?.fullName && !data.soldBy) data.soldBy = req.user.fullName;
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.return', data);
  }

  @Post('exchange')
  async processExchange(@Body() data: any, @Req() req: any) {
    if (req.user?.fullName && !data.soldBy) data.soldBy = req.user.fullName;
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.exchange', data);
  }
}
