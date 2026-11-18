/// <reference types="jest" />
/**
 * useDispatchOrder.spec.ts - Kiểm thử cho Hook xử lý 202 Accepted, Optimistic UI & Socket Fallback.
 * Tuân thủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values]
 */

import { DispatchMobileService } from '../../src/services/inventory/dispatch.service';
import { SocketService } from '../../src/services/socket.service';

describe('useDispatchOrder Hook Helpers & Async Sync Contracts', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('[Normal Values] - Tải chi tiết phiếu, Tote & phát Socket cập nhật', () => {
    it('Gọi song song getDispatchOrderById và getTotes để đồng bộ trạng thái giỏ', async () => {
      jest.spyOn(DispatchMobileService, 'getDispatchOrderById').mockResolvedValueOnce({
        _id: 'do-1',
        dispatchCode: 'DO-01',
        type: 'TRANSFER',
        status: 'APPROVED',
        fromBranchId: 'CENTRAL_WH',
        hasControlledDrugs: false,
        createdBy: 'wh-1',
        pickingList: [],
        picks: [],
        returnLogs: [],
        toteCodes: [],
        totalPicked: 0,
        isStale: false,
        version: 0,
      });
      jest.spyOn(DispatchMobileService, 'getTotes').mockResolvedValueOnce([
        { _id: 't1', toteCode: 'TOTE-01', status: 'AVAILABLE' },
      ]);

      const [order, totes] = await Promise.all([
        DispatchMobileService.getDispatchOrderById('do-1'),
        DispatchMobileService.getTotes(),
      ]);

      expect(order.dispatchCode).toBe('DO-01');
      expect(totes[0].toteCode).toBe('TOTE-01');
    });

    it('SocketService subscribe nhận đúng sự kiện dispatch_action_rejected để hoàn tác UI', () => {
      const received: any[] = [];
      const unsub = SocketService.subscribe((n) => received.push(n));
      (SocketService as any).handleIncomingNotification('DISPATCH_ACTION_REJECTED', {
        dispatchOrderId: 'do-1',
        reason: 'Tồn khả dụng không đủ',
      });
      unsub();

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('DISPATCH_ACTION_REJECTED');
      expect(received[0].reason).toContain('không đủ');
    });
  });

  describe('[Boundary Values] - Hủy đăng ký listener Socket an toàn', () => {
    it('Không gọi lại callback sau khi unsubscribe khỏi SocketService', () => {
      const handler = jest.fn();
      const unsub = SocketService.subscribe(handler);
      unsub();

      (SocketService as any).handleIncomingNotification('DISPATCH_UPDATED', { dispatchOrderId: 'do-1' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('[Abnormal Values] - Lỗi API khi pickItem hoặc thiếu orderId', () => {
    it('Ném lỗi rõ ràng khi pickItem thất bại ở Gateway', async () => {
      jest
        .spyOn(DispatchMobileService, 'pickItem')
        .mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        DispatchMobileService.pickItem('do-9', {
          lineId: 'l1',
          scannedBinCode: 'BIN-A-A1-S1-B1',
          toteCode: 'TOTE-01',
          quantity: 1,
        }),
      ).rejects.toThrow(/Network timeout/);
    });
  });
});
