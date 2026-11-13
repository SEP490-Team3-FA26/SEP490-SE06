import { BadRequestException, Controller, Get, Post, Param, Body, Inject, OnModuleInit, Optional, Req, UseGuards } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

interface InventoryCheckRequest {
  user: { role: string; branchId?: string; sub: string; fullName?: string; email: string };
}

@ApiTags('📋 Inventory Checks')
@Controller('api/inventory-checks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'director', 'warehouse', 'branch', 'head_branch')
export class InventoryCheckController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.check.create',
      'inventory.check.list',
      'inventory.check.get_by_id',
      'inventory.check.complete',
      'inventory.check.batches',
    ]);
  }

  private branchFor(req?: InventoryCheckRequest) {
    const role = (req?.user?.role || '').toLowerCase();
    if (role !== 'branch' && role !== 'head_branch') return 'CENTRAL_WH';
    const branchId = req?.user?.branchId;
    if (!branchId || branchId === 'CENTRAL_WH') {
      throw new BadRequestException('Tài khoản chưa được gán chi nhánh kiểm kê');
    }
    return branchId;
  }

  @Post()
  @ApiOperation({ summary: 'Lưu biên bản kiểm kê kho ở trạng thái nháp' })
  @AuditLogAction({
    actionCode: 'INVENTORY_CHECK_CREATE',
    actionName: 'Tạo biên bản kiểm kê kho',
    module: 'Inventory',
    eventType: 'CREATE',
    entityType: 'InventoryCheck',
  })
  async createCheck(@Body() data: any, @Req() req: InventoryCheckRequest) {
    if (data?.status && data.status !== 'DRAFT') {
      throw new BadRequestException('Lưu nháp và mở biên bản để phê duyệt');
    }
    return sendKafkaMessage(this.inventoryClient, 'inventory.check.create', {
      items: data?.items,
      notes: data?.notes,
      branchId: this.branchFor(req),
      performedBy: req.user.fullName || req.user.email,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách biên bản kiểm kê kho' })
  async listChecks(@Req() req: InventoryCheckRequest) {
    return sendKafkaMessage(this.inventoryClient, 'inventory.check.list', { branchId: this.branchFor(req) });
  }

  @Get('batches')
  async listBatches(@Req() req: InventoryCheckRequest) {
    return sendKafkaMessage(this.inventoryClient, 'inventory.check.batches', { branchId: this.branchFor(req) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết biên bản kiểm kê kho' })
  async getCheckById(@Param('id') id: string, @Req() req?: InventoryCheckRequest) {
    const res = await sendKafkaMessage(this.inventoryClient, 'inventory.check.get_by_id', { id, branchId: this.branchFor(req) });
    if (typeof res === 'string') {
      try {
        return JSON.parse(res);
      } catch {
        return res;
      }
    }
    return res;
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Hoàn tất biên bản kiểm kê kho và điều chỉnh số lượng tồn kho' })
  @AuditLogAction({
    actionCode: 'INVENTORY_CHECK_COMPLETE',
    actionName: 'Hoàn tất biên bản kiểm kê kho',
    module: 'Inventory',
    eventType: 'APPROVE',
    entityType: 'InventoryCheck',
  })
  async completeCheck(@Param('id') id: string, @Req() req: InventoryCheckRequest) {
    const branchId = this.branchFor(req);
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.check.complete', {
      id, branchId, approvedBy: req.user.sub,
    });
    if (this.cache) {
      await Promise.allSettled(['all', branchId].flatMap(scope =>
        ['dropdown', 'stats', 'expiration_report'].map(name => this.cache!.del(`medicines:${name}:${scope}`)),
      ));
    }
    return result;
  }
}
