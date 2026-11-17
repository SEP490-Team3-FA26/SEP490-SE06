import { Controller, Post, Get, Patch, Query, Param, Body, Inject, OnModuleInit, UseGuards, Delete, Req, BadRequestException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@Controller('api/purchase-requisitions')
@UseGuards(JwtAuthGuard)
export class PurchaseRequisitionController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.pr.create',
      'inventory.pr.list',
      'inventory.pr.status_counts',
      'inventory.pr.get_by_id',
      'inventory.pr.process_urgent',
      'inventory.pr.update_status',
      'inventory.pr.update',
      'inventory.pr.delete',
    ]);
  }

  /**
   * BƯỚC 1: Chi nhánh tạo yêu cầu mua hàng (PR)
   */
  @Post()
  @AuditLogAction({
    actionCode: 'PR_CREATE',
    actionName: 'Tạo yêu cầu mua hàng',
    module: 'Purchase',
    eventType: 'CREATE',
    entityType: 'PurchaseRequisition',
  })
  async createPurchaseRequisition(@Body() data: any, @Req() req: any) {
    if (req.user && req.user.branchId) {
      data.branchId = req.user.branchId;
    }
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.pr.create', data);

    console.log('📋 PR Created - Full Result:', JSON.stringify(result, null, 2));

    // Emit notification to admin room
    if (result && this.websocketGateway.server) {
      // Handle nested response structure (result.data or result directly)
      const prData = result.data || result;

      let notificationPayload: any = {
        type: 'NEW_PR',
        prId: prData._id || prData.id,
        prCode: prData.prCode || 'PR-UNKNOWN',
        branchName: prData.branchName || data.branchName || 'Chi nhánh không rõ',
        branchId: prData.branchId || data.branchId,
        itemsCount: prData.items?.length || data.items?.length || 0,
        createdAt: prData.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || prData.createdBy || 'Chi nhánh',
        message: `${prData.branchName || data.branchName || 'Chi nhánh'} vừa tạo yêu cầu nhập hàng ${prData.prCode || 'PR-???'}`,
        timestamp: new Date().toISOString(),
      };
      
      console.log('🔔 Emitting NEW_PR notification to WAREHOUSE:', notificationPayload);
      
      // Check how many clients in warehouse room
      const warehouseClients = await this.websocketGateway.server.in('warehouse').fetchSockets();
      console.log(`📊 Warehouse room has ${warehouseClients.length} connected clients`);
      
      try {
        const [savedNotification] = await this.notificationService.create({
          type: 'NEW_PR',
          targetRooms: ['warehouse'],
          message: notificationPayload.message,
          prId: notificationPayload.prId,
          prCode: notificationPayload.prCode,
          branchId: notificationPayload.branchId,
          branchName: notificationPayload.branchName,
          itemsCount: notificationPayload.itemsCount,
          createdBy: notificationPayload.createdBy,
        });

        notificationPayload = {
          ...notificationPayload,
          _id: (savedNotification as any)._id,
          id: (savedNotification as any)._id,
          createdAt: (savedNotification as any).createdAt,
          read: false,
        };
      } catch (err) {
        console.error('Failed to persist NEW_PR notification:', err);
      }
      
      // Chỉ gửi cho warehouse, không gửi admin
      this.websocketGateway.server.to('warehouse').emit('new_pr_notification', notificationPayload);
      
      console.log('✅ Notification emitted to warehouse room');
    }

    return result;
  }

  /**
   * Danh sách PR (filter bằng ?status=SUBMITTED hoặc ?branchId=xxx)
   */
  @Get()
  async listPurchaseRequisitions(
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.list', {
      status,
      branchId,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });
  }

  /**
   * Thống kê số lượng PR theo từng trạng thái (phục vụ hiển thị badge sub-tab)
   * Khai báo trước route động @Get(':id') theo Rule 11
   */
  @Get('status-counts')
  async getStatusCounts(@Query('branchId') branchId?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.status_counts', { branchId });
  }

  /**
   * Chi tiết PR theo ID (kiểm tra định dạng ObjectId 24 ký tự theo Rule 11)
   */
  @Get(':id')
  async getPurchaseRequisitionById(@Param('id') id: string) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Mã định danh PR không đúng định dạng ObjectId 24 ký tự');
    }
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.get_by_id', { id });
  }



  @Post('process-urgent')
  @AuditLogAction({
    actionCode: 'PR_PROCESS_URGENT',
    actionName: 'Xử lý yêu cầu mua hàng khẩn cấp',
    module: 'Purchase',
    eventType: 'APPROVE',
    entityType: 'PurchaseRequisition',
  })
  async processUrgentPurchaseRequisitions(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.process_urgent', data);
  }

  @Patch(':id/status')
  async updatePurchaseRequisitionStatus(@Param('id') id: string, @Body() data: { status: string, rejectionReason?: string, approvedBy?: string }) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.pr.update_status', { id, status: data.status });

    // Broadcast real-time event to all connected frontend clients
    if (this.websocketGateway.server) {
      this.websocketGateway.server.emit('pr_updated', { id, status: data.status });
      
      const prData = result.data || result;
      // Emit targeted notifications based on status
      if (data.status === 'APPROVED' && prData.branchId) {
        let notificationPayload: any = {
          type: 'PR_APPROVED',
          prId: prData._id || id,
          prCode: prData.prCode || 'PR-???',
          branchId: prData.branchId,
          branchName: prData.branchName || 'Chi nhánh',
          message: `Yêu cầu nhập hàng ${prData.prCode || 'PR-???'} đã được phê duyệt`,
          approvedBy: data.approvedBy || 'Admin',
          timestamp: new Date().toISOString(),
        };
        
        console.log('✅ Emitting PR approved notification:', notificationPayload);
        try {
          const [savedNotification] = await this.notificationService.create({
            type: 'PR_APPROVED',
            targetRooms: [`branch-${prData.branchId}`],
            message: notificationPayload.message,
            prId: notificationPayload.prId,
            prCode: notificationPayload.prCode,
            branchId: notificationPayload.branchId,
            branchName: notificationPayload.branchName,
            approvedBy: notificationPayload.approvedBy,
          });

          notificationPayload = {
            ...notificationPayload,
            _id: (savedNotification as any)._id,
            id: (savedNotification as any)._id,
            createdAt: (savedNotification as any).createdAt,
            read: false,
          };
        } catch (err) {
          console.error('Failed to persist PR_APPROVED notification:', err);
        }

        this.websocketGateway.server.to(`branch-${prData.branchId}`).emit('pr_approved_notification', notificationPayload);
      }
      
      if (data.status === 'REJECTED' && prData.branchId) {
        let notificationPayload: any = {
          type: 'PR_REJECTED',
          prId: prData._id || id,
          prCode: prData.prCode || 'PR-???',
          branchId: prData.branchId,
          branchName: prData.branchName || 'Chi nhánh',
          message: `Yêu cầu nhập hàng ${prData.prCode || 'PR-???'} bị từ chối${data.rejectionReason ? `: ${data.rejectionReason}` : ''}`,
          rejectionReason: data.rejectionReason || 'Không có lý do cụ thể',
          timestamp: new Date().toISOString(),
        };
        
        console.log('❌ Emitting PR rejected notification:', notificationPayload);
        try {
          const [savedNotification] = await this.notificationService.create({
            type: 'PR_REJECTED',
            targetRooms: [`branch-${prData.branchId}`],
            message: notificationPayload.message,
            prId: notificationPayload.prId,
            prCode: notificationPayload.prCode,
            branchId: notificationPayload.branchId,
            branchName: notificationPayload.branchName,
            rejectionReason: notificationPayload.rejectionReason,
          });

          notificationPayload = {
            ...notificationPayload,
            _id: (savedNotification as any)._id,
            id: (savedNotification as any)._id,
            createdAt: (savedNotification as any).createdAt,
            read: false,
          };
        } catch (err) {
          console.error('Failed to persist PR_REJECTED notification:', err);
        }

        this.websocketGateway.server.to(`branch-${prData.branchId}`).emit('pr_rejected_notification', notificationPayload);
      }
    }

    return result;
  }

  @Patch(':id')
  async updatePurchaseRequisition(@Param('id') id: string, @Body() data: any) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.pr.update', { id, ...data });

    if (this.websocketGateway.server) {
      this.websocketGateway.server.emit('pr_updated', { id });
    }

    return result;
  }

  @Delete(':id')
  async deletePurchaseRequisition(@Param('id') id: string) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.pr.delete', { id });

    if (this.websocketGateway.server) {
      this.websocketGateway.server.emit('pr_updated', { id });
    }

    return result;
  }
}
