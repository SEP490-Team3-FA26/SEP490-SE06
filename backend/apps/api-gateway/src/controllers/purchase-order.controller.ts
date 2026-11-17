import { Controller, Post, Get, Query, Param, Body, Inject, OnModuleInit, UseGuards, BadRequestException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { AutoRoutePoDto, ApprovePayPoDto, RejectPoDeliveryDto, ReceivePoDto } from '../dto/purchase-order.dto';

@Controller('api/purchase-orders')
export class PurchaseOrderController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.po.auto_route',
      'inventory.po.approve_pay',
      'inventory.po.reject_delivery',
      'inventory.po.list',
      'inventory.po.get_by_id',
      'inventory.po.receive',
    ]);
  }

  @Post('auto-route')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction({
    actionCode: 'PO_AUTO_ROUTE',
    actionName: 'Tạo đơn đặt hàng NCC tự động',
    module: 'Purchase',
    eventType: 'CREATE',
    entityType: 'PurchaseOrder',
  })
  async createAutoRoutedPurchaseOrders(@Body() data: AutoRoutePoDto) {
    // ValidationPipe transforms the request body into an AutoRoutePoDto instance.
    // Convert it back to a plain object so ClientKafka serializes it as JSON
    // instead of the string "[object Object]".
    const payload = {
      items: data.items,
      prIds: data.prIds,
      ...(data.createdBy ? { createdBy: data.createdBy } : {}),
    };

    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.po.auto_route', payload);
    
    console.log('📦 PO Created - Full Result:', JSON.stringify(result, null, 2));
    
    // Handle nested response
    const poData = result.data || result;
    
    // Emit notification to admin ONLY (not warehouse)
    // Warehouse tạo PO → Admin nhận notification
    if (this.websocketGateway.server && poData) {
      // Handle both single PO and array of POs
      const pos = Array.isArray(poData) ? poData : (poData.pos || poData.poIds || [poData]);
      
      pos.forEach((po: any) => {
        console.log('📦 PO Items:', po.items);
        console.log('📦 Items Count:', po.items?.length);
        
        const itemsCount = po.items?.length || 0;
        
        const notificationPayload = {
          type: 'NEW_PO',
          poId: typeof po === 'string' ? po : (po._id || po.id),
          supplierId: po.supplierId,
          supplierName: po.supplierName || 'Nhà cung cấp',
          itemsCount: itemsCount,
          totalAmount: po.totalAmount || 0,
          linkedPrId: po.linkedPrId,
          message: `Đơn đặt hàng mới đã được tạo cho ${po.supplierName || 'nhà cung cấp'} (${itemsCount} sản phẩm)`,
          timestamp: new Date().toISOString(),
        };
        
        console.log('📦 Emitting NEW_PO notification to ADMIN only:', notificationPayload);
        // Chỉ gửi cho admin, KHÔNG gửi warehouse
        this.websocketGateway.server.to('admin').emit('new_po_notification', notificationPayload);
        
        // Persist to DB
        this.notificationService.create({
          type: 'NEW_PO',
          targetRooms: ['admin'],
          message: notificationPayload.message,
          poId: notificationPayload.poId,
          supplierName: notificationPayload.supplierName,
          itemsCount: notificationPayload.itemsCount,
          totalAmount: notificationPayload.totalAmount,
        }).catch(err => console.error('Failed to persist NEW_PO notification:', err));
      });
    }
    
    return result;
  }

  @Post('approve-pay')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction({
    actionCode: 'PO_APPROVE_PAY',
    actionName: 'Phê duyệt và thanh toán đơn đặt hàng',
    module: 'Purchase',
    eventType: 'APPROVE',
    entityType: 'PurchaseOrder',
  })
  async approveAndPayPurchaseOrder(@Body() data: ApprovePayPoDto) {
    const payload = {
      poId: data.poId,
      action: data.action,
      ...(data.approvedBy ? { approvedBy: data.approvedBy } : {}),
      ...(data.rejectionReason ? { rejectionReason: data.rejectionReason } : {}),
      ...(data.paymentType ? { paymentType: data.paymentType } : {}),
    };

    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.approve_pay', payload);
  }

  @Post('reject-delivery')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction({
    actionCode: 'PO_REJECT_DELIVERY',
    actionName: 'Từ chối nhận hàng đơn đặt hàng',
    module: 'Purchase',
    eventType: 'REJECT',
    entityType: 'PurchaseOrder',
  })
  async rejectPurchaseOrderDelivery(@Body() data: RejectPoDeliveryDto) {
    const payload = {
      poId: data.poId,
      ...(data.reason ? { reason: data.reason } : {}),
    };

    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.reject_delivery', payload);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async listPurchaseOrders(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.list', {
      status,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getPurchaseOrderById(@Param('id') id: string) {
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestException('Mã đơn hàng PO không được để trống');
    }
    const cleanId = id.trim();
    // Chấp nhận MongoDB ObjectId 24 ký tự hex hoặc mã định danh PO (PO-..., #..., hoặc mã ngắn)
    const isValidId = /^[0-9a-fA-F]{24}$/.test(cleanId) || /^[a-zA-Z0-9#_-]{3,50}$/.test(cleanId);
    if (!isValidId) {
      throw new BadRequestException('Định dạng mã đơn PO không hợp lệ');
    }
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.get_by_id', { id: cleanId });
  }

  @Post(':id/receive')
  @UseGuards(JwtAuthGuard)
  async receivePurchaseOrder(@Param('id') id: string, @Body() data: ReceivePoDto) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.receive', {
      id,
      receivedBy: data.receivedBy,
    });
  }
}
