import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { DispatchService } from './dispatch.service';

/**
 * Controller Microservice lắng nghe toàn bộ Kafka topics của luồng Xuất Kho Tổng (DispatchOrder & Tote).
 * Tuân thủ chuẩn Playbook v2.0:
 * - EventPattern: Các tác vụ ghi (create, approve, reject, pick, return, shortage, stage, dispatch, cancel)
 * - MessagePattern: Các tác vụ đọc đồng bộ (get.all, get.by.id, tote.get.all)
 */
@Controller()
export class DispatchController {
  private readonly logger = new Logger(DispatchController.name);

  constructor(private readonly dispatchService: DispatchService) {}

  private parsePayload<T = any>(raw: T | string): T {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return raw as unknown as T;
      }
    }
    return raw;
  }

  // =========================================================================
  // READ MESSAGES (Request-Response via send())
  // =========================================================================

  @MessagePattern('dispatch.order.get.all')
  async listDispatchOrders(@Payload() raw: any) {
    try {
      const query = this.parsePayload(raw || {});
      return await this.dispatchService.listDispatchOrders(query);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error?.message || 'Lỗi khi lấy danh sách phiếu xuất kho');
    }
  }

  @MessagePattern('dispatch.order.get.by.id')
  async getDispatchOrderById(@Payload() raw: any) {
    try {
      const data = this.parsePayload(raw);
      const id = typeof data === 'string' ? data : data?.id;
      return await this.dispatchService.getDispatchOrderById(id);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error?.message || 'Lỗi khi lấy chi tiết phiếu xuất kho');
    }
  }

  @MessagePattern('tote.get.all')
  async listTotes(@Payload() raw: any) {
    try {
      const data = this.parsePayload(raw || {});
      return await this.dispatchService.listTotes(data?.status);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error?.message || 'Lỗi khi lấy danh sách giỏ gom hàng (Tote)');
    }
  }

  // =========================================================================
  // WRITE EVENTS (Event-Driven via emit()) & SYNC ALTERNATIVES
  // =========================================================================

  @EventPattern('dispatch.order.event.create')
  async handleCreateEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.createDispatchOrder(data);
    } catch (error: any) {
      const msg = error?.getError?.()?.message || error?.message || 'Lỗi khi tạo phiếu xuất kho';
      this.logger.warn(`[DispatchMS] Tạo phiếu bất đồng bộ thất bại: ${msg}`);
      this.dispatchService.notifyAsyncActionFailure(data?.actor?.userId, 'CREATE_DISPATCH', '', msg);
    }
  }

  @MessagePattern('dispatch.order.create')
  async handleCreateSync(@Payload() raw: any) {
    try {
      return await this.dispatchService.createDispatchOrder(this.parsePayload(raw));
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error?.message || 'Lỗi khi tạo phiếu xuất kho');
    }
  }

  @EventPattern('dispatch.order.event.approve')
  async handleApproveEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.approveDispatchOrder(data);
    } catch (error: any) {
      const msg = error?.getError?.()?.message || error?.message || 'Lỗi khi duyệt phiếu xuất kho';
      this.dispatchService.notifyAsyncActionFailure(data?.actor?.userId, 'APPROVE_DISPATCH', data?.id || '', msg);
    }
  }

  @EventPattern('dispatch.order.event.reject')
  async handleRejectEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.rejectDispatchOrder(data);
    } catch (error: any) {
      const msg = error?.getError?.()?.message || error?.message || 'Lỗi khi từ chối phiếu xuất kho';
      this.dispatchService.notifyAsyncActionFailure(data?.actor?.userId, 'REJECT_DISPATCH', data?.id || '', msg);
    }
  }

  @EventPattern('dispatch.order.event.pick_item')
  async handlePickItemEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.pickItem(data);
    } catch {
      // Dịch vụ pickItem đã chủ động phát lỗi về phòng user qua Kafka nếu transaction fail
      return null;
    }
  }

  @EventPattern('dispatch.order.event.return_item')
  async handleReturnItemEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.returnItem(data);
    } catch {
      return null;
    }
  }

  @EventPattern('dispatch.order.event.shortage')
  async handleShortageEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.markShortage(data);
    } catch (error: any) {
      const msg = error?.getError?.()?.message || error?.message || 'Lỗi khi báo thiếu hàng';
      this.dispatchService.notifyAsyncActionFailure(
        data?.actor?.userId,
        'SHORTAGE',
        data?.dispatchOrderId || '',
        msg,
      );
    }
  }

  @EventPattern('dispatch.order.event.stage')
  async handleStageEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.stageDispatchOrder(data);
    } catch (error: any) {
      const msg = error?.getError?.()?.message || error?.message || 'Lỗi khi tập kết giỏ hàng';
      this.dispatchService.notifyAsyncActionFailure(
        data?.actor?.userId,
        'STAGE',
        data?.dispatchOrderId || '',
        msg,
      );
    }
  }

  @EventPattern('dispatch.order.event.dispatch')
  async handleConfirmDispatchEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.confirmDispatch(data);
    } catch {
      return null;
    }
  }

  @EventPattern('dispatch.order.event.cancel')
  async handleCancelEvent(@Payload() raw: any) {
    const data = this.parsePayload(raw);
    try {
      return await this.dispatchService.cancelDispatchOrder(data);
    } catch (error: any) {
      const msg = error?.getError?.()?.message || error?.message || 'Lỗi khi hủy phiếu xuất kho';
      this.dispatchService.notifyAsyncActionFailure(
        data?.actor?.userId,
        'CANCEL',
        data?.dispatchOrderId || '',
        msg,
      );
    }
  }
}
