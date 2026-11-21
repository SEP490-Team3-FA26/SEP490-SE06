import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  OnModuleInit,
  Optional,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AuditLogAction } from '../decorators/audit-log.decorator';

/**
 * API Gateway Controller cho Luồng Xuất Kho Tổng (DispatchOrder).
 * Tuân thủ chuẩn Playbook v2.0:
 * - Tác vụ Ghi (POST): emit Kafka -> HTTP 202 Accepted + Xóa Cache Redis.
 * - Tác vụ Đọc (GET): send Kafka -> HTTP 200 OK + Redis Cache-Aside.
 */
@ApiTags('🚚 Dispatch Orders (Xuất Kho Tổng)')
@ApiBearerAuth()
@Controller('api/dispatch-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DispatchOrderController implements OnModuleInit {
  private readonly logger = new Logger(DispatchOrderController.name);
  private readonly CACHE_TTL = 300000; // 5 phút (mili-giây)

  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Optional() @Inject('KAFKA_SERVICE') private readonly kafkaClient?: ClientKafka,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'dispatch.order.get.all',
      'dispatch.order.get.by.id',
    ]);
  }

  /**
   * Trích xuất thông tin diễn viên đang thao tác từ JWT request;
   * khi duyệt/từ chối sẽ đối chiếu thêm cờ isBranchPIC từ Auth Service để bảo đảm chính xác tuyệt đối.
   */
  private async buildActorContext(req: any, verifyPicFromAuth = false) {
    const user = req?.user || {};
    const userId = String(user.sub || user._id || user.id || '');
    let isBranchPIC = Boolean(user.isBranchPIC);

    if (
      verifyPicFromAuth &&
      String(user.role || '').toLowerCase() === 'pharmacist' &&
      this.kafkaClient &&
      userId
    ) {
      try {
        const freshUser = await sendKafkaMessage(this.kafkaClient, 'auth.get.user.by.id', userId);
        if (freshUser && typeof freshUser === 'object' && !freshUser.error) {
          isBranchPIC = Boolean(freshUser.isBranchPIC);
        }
      } catch (err: any) {
        this.logger.warn(`[DispatchGateway] Không thể xác minh lại isBranchPIC qua Kafka: ${err?.message}`);
      }
    }

    return {
      userId,
      fullName: user.fullName || user.email || 'Nhân viên',
      role: String(user.role || ''),
      isBranchPIC,
    };
  }

  private async invalidateDispatchCaches(id?: string): Promise<void> {
    if (!this.cacheManager) return;
    const keys = ['dispatch:orders:list:ALL'];
    if (id) keys.push(`dispatch:orders:detail:${id}`);
    await Promise.all(
      keys.map((k) =>
        this.cacheManager!.del(k).catch(() => undefined),
      ),
    );
  }

  // =========================================================================
  // READ OPERATIONS (GET -> 200 OK + Redis Cache-Aside)
  // =========================================================================

  @Get()
  @Roles('warehouse', 'director', 'head_branch', 'pharmacist', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách phiếu xuất kho (lọc theo trạng thái, loại phiếu, cờ treo)' })
  async listDispatchOrders(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('isStale') isStale?: string,
    @Query('hasControlledDrugs') hasControlledDrugs?: string,
    @Query('toBranchId') toBranchId?: string,
    @Query('search') search?: string,
  ) {
    const hasFilter = Boolean(status || type || isStale || hasControlledDrugs || toBranchId || search);
    const cacheKey = 'dispatch:orders:list:ALL';

    if (!hasFilter && this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch {}
    }

    const result = await sendKafkaMessage(this.inventoryClient, 'dispatch.order.get.all', {
      status,
      type,
      isStale,
      hasControlledDrugs,
      toBranchId,
      search,
    });

    if (!hasFilter && this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 15000); // Cache ngắn 15s cho danh sách mặc định
      } catch {}
    }
    return result;
  }

  @Get(':id')
  @Roles('warehouse', 'director', 'head_branch', 'pharmacist', 'admin')
  @ApiOperation({ summary: 'Xem chi tiết phiếu xuất kho theo ID hoặc mã phiếu (Cache-Aside Redis)' })
  async getDispatchOrderById(@Param('id') id: string) {
    const cacheKey = `dispatch:orders:detail:${id}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch {}
    }

    const result = await sendKafkaMessage(this.inventoryClient, 'dispatch.order.get.by.id', { id });
    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      } catch {}
    }
    return result;
  }

  // =========================================================================
  // WRITE OPERATIONS (POST -> emit Kafka -> 202 Accepted)
  // =========================================================================

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('warehouse')
  @AuditLogAction({
    actionCode: 'DISPATCH_ORDER_CREATE',
    actionName: 'Tạo phiếu xuất kho chờ duyệt',
    module: 'Dispatch',
    eventType: 'CREATE',
    entityType: 'DispatchOrder',
  })
  @ApiOperation({ summary: 'Tạo phiếu xuất kho mới (TRANSFER từ PR hoặc DISPOSE) — Async Kafka 202' })
  async createDispatchOrder(@Body() dto: any, @Req() req: any) {
    const actor = await this.buildActorContext(req);
    this.inventoryClient.emit(
      'dispatch.order.event.create',
      JSON.stringify({ ...dto, actor }),
    );
    await this.invalidateDispatchCaches();
    return {
      status: 'Accepted',
      message: 'Yêu cầu lập phiếu xuất kho đã được tiếp nhận và đang xử lý qua Kafka.',
    };
  }

  @Post('sync')
  @HttpCode(HttpStatus.CREATED)
  @Roles('warehouse')
  @AuditLogAction({
    actionCode: 'DISPATCH_ORDER_CREATE',
    actionName: 'Tạo phiếu xuất kho chờ duyệt (đối soát tồn kho tức thì)',
    module: 'Dispatch',
    eventType: 'CREATE',
    entityType: 'DispatchOrder',
  })
  @ApiOperation({ summary: 'Tạo phiếu xuất kho đồng bộ kèm kiểm tra tồn khả dụng ngay lập tức' })
  async createDispatchOrderSync(@Body() dto: any, @Req() req: any) {
    const actor = await this.buildActorContext(req);
    const result = await sendKafkaMessage(this.inventoryClient, 'dispatch.order.create', {
      ...dto,
      actor,
    });
    await this.invalidateDispatchCaches();
    return result;
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('director', 'head_branch', 'pharmacist')
  @AuditLogAction({
    actionCode: 'DISPATCH_ORDER_APPROVE',
    actionName: 'Phê duyệt phiếu xuất kho',
    module: 'Dispatch',
    eventType: 'APPROVE',
    entityType: 'DispatchOrder',
  })
  @ApiOperation({ summary: 'Phê duyệt phiếu xuất kho (Kiểm soát 2 người: Giám đốc / Dược sĩ PIC)' })
  async approveDispatchOrder(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req, true);
    this.inventoryClient.emit(
      'dispatch.order.event.approve',
      JSON.stringify({ id, note: body?.note || '', actor }),
    );
    await this.invalidateDispatchCaches(id);
    return {
      status: 'Accepted',
      message: 'Yêu cầu phê duyệt phiếu xuất kho đã được gửi vào hàng đợi xử lý.',
    };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('director', 'head_branch', 'pharmacist')
  @AuditLogAction({
    actionCode: 'DISPATCH_ORDER_REJECT',
    actionName: 'Từ chối phiếu xuất kho',
    module: 'Dispatch',
    eventType: 'REJECT',
    entityType: 'DispatchOrder',
  })
  @ApiOperation({ summary: 'Từ chối phiếu xuất kho (bắt buộc kèm lý do)' })
  async rejectDispatchOrder(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req, true);
    this.inventoryClient.emit(
      'dispatch.order.event.reject',
      JSON.stringify({ id, reason: body?.reason || '', actor }),
    );
    await this.invalidateDispatchCaches(id);
    return {
      status: 'Accepted',
      message: 'Yêu cầu từ chối phiếu xuất kho đang được xử lý.',
    };
  }

  @Post(':id/pick-item')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('warehouse')
  @ApiOperation({ summary: 'Nhặt hàng vào giỏ Tote và giữ chỗ tạm thời (reservedQty +=)' })
  async pickItem(
    @Param('id') dispatchOrderId: string,
    @Body() body: any,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req);
    this.inventoryClient.emit(
      'dispatch.order.event.pick_item',
      JSON.stringify({
        ...body,
        dispatchOrderId,
        idempotencyKey: idempotencyKey || body?.idempotencyKey,
        actor,
      }),
    );
    await this.invalidateDispatchCaches(dispatchOrderId);
    return {
      status: 'Accepted',
      message: 'Đã tiếp nhận thao tác quét nhặt giữ chỗ hàng vào giỏ.',
    };
  }

  @Post(':id/return-item')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('warehouse')
  @ApiOperation({ summary: 'Trả hàng đã nhặt theo 3 kết cục: RESTOCK / DAMAGED / QUARANTINE' })
  async returnItem(
    @Param('id') dispatchOrderId: string,
    @Body() body: any,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req);
    this.inventoryClient.emit(
      'dispatch.order.event.return_item',
      JSON.stringify({
        ...body,
        dispatchOrderId,
        idempotencyKey: idempotencyKey || body?.idempotencyKey,
        actor,
      }),
    );
    await this.invalidateDispatchCaches(dispatchOrderId);
    return {
      status: 'Accepted',
      message: 'Đã tiếp nhận yêu cầu hoàn trả hàng về khay / xử lý hỏng.',
    };
  }

  @Post(':id/shortage')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('warehouse')
  @ApiOperation({ summary: 'Báo thiếu thuốc trên kệ và tự tạo đề xuất bổ sung DRAFT' })
  async markShortage(
    @Param('id') dispatchOrderId: string,
    @Body() body: { lineId: string; reason?: string },
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req);
    this.inventoryClient.emit(
      'dispatch.order.event.shortage',
      JSON.stringify({ ...body, dispatchOrderId, actor }),
    );
    await this.invalidateDispatchCaches(dispatchOrderId);
    return {
      status: 'Accepted',
      message: 'Đã tiếp nhận ghi nhận thiếu hàng.',
    };
  }

  @Post(':id/stage')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('warehouse')
  @ApiOperation({ summary: 'Tập kết giỏ gom hàng (Tote) tại khu bàn giao xuất kho' })
  async stageDispatchOrder(
    @Param('id') dispatchOrderId: string,
    @Body() body: { toteCode: string },
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req);
    this.inventoryClient.emit(
      'dispatch.order.event.stage',
      JSON.stringify({ ...body, dispatchOrderId, actor }),
    );
    await this.invalidateDispatchCaches(dispatchOrderId);
    return {
      status: 'Accepted',
      message: 'Đã tiếp nhận yêu cầu tập kết giỏ tại khu bàn giao.',
    };
  }

  @Post(':id/dispatch')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('warehouse')
  @AuditLogAction({
    actionCode: 'DISPATCH_ORDER_CONFIRM',
    actionName: 'Xác nhận xuất kho trừ tồn thật',
    module: 'Dispatch',
    eventType: 'EXPORT',
    entityType: 'DispatchOrder',
  })
  @ApiOperation({ summary: 'Xác nhận xuất kho (Giai đoạn 2: Trừ kho thật, giải phóng Tote, tạo StockTransfer)' })
  async confirmDispatch(
    @Param('id') dispatchOrderId: string,
    @Body() body: any,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req);
    this.inventoryClient.emit(
      'dispatch.order.event.dispatch',
      JSON.stringify({
        ...body,
        dispatchOrderId,
        idempotencyKey: idempotencyKey || body?.idempotencyKey,
        actor,
      }),
    );
    await this.invalidateDispatchCaches(dispatchOrderId);
    if (this.cacheManager) {
      await this.cacheManager.del('medicines:warehouse-map').catch(() => undefined);
    }
    return {
      status: 'Accepted',
      message: 'Đã tiếp nhận lệnh xác nhận xuất kho thật.',
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('warehouse', 'director', 'head_branch')
  @ApiOperation({ summary: 'Hủy phiếu xuất kho (chỉ cho phép khi totalPicked === 0)' })
  async cancelDispatchOrder(
    @Param('id') dispatchOrderId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const actor = await this.buildActorContext(req);
    this.inventoryClient.emit(
      'dispatch.order.event.cancel',
      JSON.stringify({ dispatchOrderId, reason: body?.reason || '', actor }),
    );
    await this.invalidateDispatchCaches(dispatchOrderId);
    return {
      status: 'Accepted',
      message: 'Đã tiếp nhận yêu cầu hủy phiếu xuất kho.',
    };
  }
}
