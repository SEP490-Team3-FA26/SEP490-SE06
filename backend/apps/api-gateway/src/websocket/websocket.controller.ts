import { Controller, Logger, Optional, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AppWebsocketGateway } from './websocket.gateway';
import { NotificationService } from '../notification/notification.service';

@Controller()
export class WebsocketController {
  private readonly logger = new Logger(WebsocketController.name);

  constructor(
    private readonly websocketGateway: AppWebsocketGateway,
    @Optional() private readonly notificationService?: NotificationService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  @EventPattern('broadcast.inventory_updated')
  async handleInventoryUpdated(@Payload() data: any) {
    this.logger.log('📦 Forwarding broadcast.inventory_updated to Socket.IO clients');
    this.websocketGateway.server.emit('inventory_updated', data);

    // Tự động xóa bộ nhớ đệm (Cache Eviction) của API Gateway để dữ liệu Sơ đồ kho & Tồn kho luôn mới nhất
    if (this.cacheManager) {
      try {
        await Promise.all([
          this.cacheManager.del('medicines:warehouse-map'),
          this.cacheManager.del('medicines:dropdown:all'),
          this.cacheManager.del('medicines:dropdown:CENTRAL_WH'),
          this.cacheManager.del('medicines:stats:all'),
          this.cacheManager.del('medicines:stats:CENTRAL_WH'),
          this.cacheManager.del('medicines:expiration_report:all'),
          this.cacheManager.del('medicines:expiration_report:CENTRAL_WH'),
          this.cacheManager.del('medicines:filters:all'),
          this.cacheManager.del('medicines:reserve-batches:CENTRAL_WH'),
          this.cacheManager.del('medicines:reserve-batches:all'),
        ]);
        this.logger.log('🧹 Đã tự động dọn sạch cache API Gateway khi có biến động kho thực tế');
      } catch (e) {}
    }
  }

  @EventPattern('broadcast.dashboard_updated')
  handleDashboardUpdated(@Payload() data: any) {
    this.logger.log('📊 Forwarding broadcast.dashboard_updated to Socket.IO clients');
    this.websocketGateway.server.emit('dashboard_updated', data);
  }

  @EventPattern('notification.new_pr')
  handleNewPRNotification(@Payload() data: any) {
    this.logger.log(`🔔 New PR notification: ${data.prCode} from ${data.branchName}`);
    // Emit to warehouse room only (NOT admin)
    this.websocketGateway.server.to('warehouse').emit('new_pr_notification', {
      type: 'NEW_PR',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.pr_approved')
  handlePRApprovedNotification(@Payload() data: any) {
    this.logger.log(`✅ PR approved notification: ${data.prCode}`);
    // Emit to specific branch
    if (data.branchId) {
      this.websocketGateway.server.to(`branch-${data.branchId}`).emit('pr_approved_notification', {
        type: 'PR_APPROVED',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @EventPattern('notification.pr_rejected')
  handlePRRejectedNotification(@Payload() data: any) {
    this.logger.log(`❌ PR rejected notification: ${data.prCode}`);
    // Emit to specific branch
    if (data.branchId) {
      this.websocketGateway.server.to(`branch-${data.branchId}`).emit('pr_rejected_notification', {
        type: 'PR_REJECTED',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @EventPattern('notification.new_po')
  handleNewPONotification(@Payload() data: any) {
    this.logger.log(`📦 New PO notification: ${data.supplierId || 'Unknown supplier'}`);
    // Emit to admin room ONLY (NOT warehouse)
    this.websocketGateway.server.to('admin').emit('new_po_notification', {
      type: 'NEW_PO',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.grn_completed')
  handleGRNCompletedNotification(@Payload() data: any) {
    this.logger.log(`📥 GRN completed notification: ${data.grnId}`);
    // Emit to admin and warehouse
    this.websocketGateway.server.to('admin').emit('grn_completed_notification', {
      type: 'GRN_COMPLETED',
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.websocketGateway.server.to('warehouse').emit('grn_completed_notification', {
      type: 'GRN_COMPLETED',
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    // Also notify branch if specified
    if (data.branchId) {
      this.websocketGateway.server.to(`branch-${data.branchId}`).emit('grn_completed_notification', {
        type: 'GRN_COMPLETED',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // =========================================================================
  // SỰ KIỆN REALTIME LUỒNG XUẤT KHO TỔNG (In-App Socket.IO & SSE Only)
  // =========================================================================

  @EventPattern('notification.dispatch_created')
  async handleDispatchCreated(@Payload() data: any) {
    const needsPic = Boolean(data?.hasControlledDrugs);
    const targetRooms = needsPic ? ['pic'] : ['admin'];
    const msg = needsPic
      ? `Phiếu xuất kiểm soát đặc biệt ${data?.dispatchCode} đang chờ Dược sĩ PIC duyệt.`
      : `Phiếu xuất kho ${data?.dispatchCode} (${data?.toBranchName || 'Xuất hủy'}) đang chờ Giám đốc duyệt.`;

    try {
      await this.notificationService?.create({
        type: 'DISPATCH_CREATED',
        targetRooms,
        message: msg,
        dispatchOrderId: data?.dispatchOrderId,
        dispatchCode: data?.dispatchCode,
        branchId: data?.toBranchId,
        branchName: data?.toBranchName,
        itemsCount: data?.itemsCount,
        createdBy: data?.createdByName || data?.createdBy,
      });
    } catch (e: any) {
      this.logger.warn(`Không lưu được thông báo DISPATCH_CREATED: ${e?.message}`);
    }

    for (const room of targetRooms) {
      this.websocketGateway.server.to(room).emit('dispatch_order_created', {
        type: 'DISPATCH_CREATED',
        message: msg,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
    this.websocketGateway.server.to('warehouse').emit('dispatch_order_updated', {
      action: 'CREATED',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.dispatch_approved')
  async handleDispatchApproved(@Payload() data: any) {
    const msg = `Phiếu xuất ${data?.dispatchCode} đã được ${data?.approvedByName || 'Quản lý'} phê duyệt. Thủ kho có thể vào kệ nhặt hàng.`;
    try {
      await this.notificationService?.create({
        type: 'DISPATCH_APPROVED',
        targetRooms: ['warehouse'],
        message: msg,
        dispatchOrderId: data?.dispatchOrderId,
        dispatchCode: data?.dispatchCode,
        approvedBy: data?.approvedByName,
      });
    } catch {}

    this.websocketGateway.server.to('warehouse').emit('dispatch_order_approved', {
      type: 'DISPATCH_APPROVED',
      message: msg,
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.websocketGateway.server.to('warehouse').emit('dispatch_order_updated', {
      action: 'APPROVED',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.dispatch_rejected')
  async handleDispatchRejected(@Payload() data: any) {
    const msg = `Phiếu xuất ${data?.dispatchCode} đã bị từ chối: ${data?.reason || 'Không đạt yêu cầu'}`;
    try {
      await this.notificationService?.create({
        type: 'DISPATCH_REJECTED',
        targetRooms: ['warehouse'],
        message: msg,
        dispatchOrderId: data?.dispatchOrderId,
        dispatchCode: data?.dispatchCode,
        rejectionReason: data?.reason,
      });
    } catch {}

    this.websocketGateway.server.to('warehouse').emit('dispatch_order_updated', {
      type: 'DISPATCH_REJECTED',
      action: 'REJECTED',
      message: msg,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.dispatch_updated')
  handleDispatchUpdated(@Payload() data: any) {
    this.websocketGateway.server.to('warehouse').emit('dispatch_order_updated', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.websocketGateway.server.to('admin').emit('dispatch_order_updated', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.dispatch_dispatched')
  async handleDispatchCompleted(@Payload() data: any) {
    const whMsg = `Phiếu xuất ${data?.dispatchCode} đã xác nhận xuất kho thật thành công.`;
    try {
      await this.notificationService?.create({
        type: 'DISPATCH_COMPLETED',
        targetRooms: ['warehouse', 'admin'],
        message: whMsg,
        dispatchOrderId: data?.dispatchOrderId,
        dispatchCode: data?.dispatchCode,
        transferId: data?.stockTransferId,
        transferCode: data?.stockTransferCode,
      });
    } catch {}

    this.websocketGateway.server.to('warehouse').emit('dispatch_order_dispatched', {
      type: 'DISPATCH_COMPLETED',
      message: whMsg,
      ...data,
      timestamp: new Date().toISOString(),
    });

    if (data?.toBranchId && data?.stockTransferCode) {
      const brMsg = `Kho Tổng đã xuất chuyển hàng mã ${data.stockTransferCode}. Khi xe đến hãy quét QR tiếp nhận.`;
      try {
        await this.notificationService?.create({
          type: 'TRANSFER_SHIPPED',
          targetRooms: [`branch-${data.toBranchId}`],
          message: brMsg,
          branchId: data.toBranchId,
          branchName: data.toBranchName,
          transferId: data.stockTransferId,
          transferCode: data.stockTransferCode,
        });
      } catch {}

      this.websocketGateway.server.to(`branch-${data.toBranchId}`).emit('transfer_shipped', {
        type: 'TRANSFER_SHIPPED',
        message: brMsg,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @EventPattern('notification.dispatch_stale')
  async handleDispatchStale(@Payload() data: any) {
    const codes = Array.isArray(data?.dispatchCodes) ? data.dispatchCodes.join(', ') : '';
    const msg = `Cảnh báo phiếu treo > 4 giờ (hàng đang nằm trong giỏ): ${codes}`;
    try {
      await this.notificationService?.create({
        type: 'DISPATCH_STALE',
        targetRooms: ['warehouse'],
        message: msg,
      });
    } catch {}

    this.websocketGateway.server.to('warehouse').emit('dispatch_order_stale_alert', {
      type: 'DISPATCH_STALE',
      message: msg,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.dispatch_error')
  handleDispatchError(@Payload() data: any) {
    if (data?.userId) {
      this.websocketGateway.server.to(`user-${data.userId}`).emit('dispatch_action_rejected', {
        type: 'DISPATCH_ACTION_REJECTED',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
