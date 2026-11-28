/// <reference types="jest" />
/**
 * Bộ kiểm thử đơn vị cho DispatchOrderController (API Gateway: Kafka emit 202 + Redis Cache-Aside + Auth PIC)
 * Đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
 */

import { DispatchOrderController } from '../../../apps/api-gateway/src/controllers/dispatch-order.controller';

describe('DispatchOrderController (API Gateway)', () => {
  const buildController = (overrides: { cachedDetail?: any; authUser?: any } = {}) => {
    const inventoryClient: any = {
      emit: jest.fn(),
      send: jest.fn(),
      subscribeToResponseOf: jest.fn(),
    };
    const kafkaClient: any = {
      send: jest.fn(),
    };
    const cacheManager: any = {
      get: jest.fn(async (key: string) => {
        if (key.startsWith('dispatch:orders:detail:')) return overrides.cachedDetail ?? null;
        return null;
      }),
      set: jest.fn(async () => undefined),
      del: jest.fn(async () => undefined),
    };

    const controller = new DispatchOrderController(inventoryClient, kafkaClient, cacheManager);
    return { controller, inventoryClient, kafkaClient, cacheManager };
  };

  describe('1. [Normal Values] Giao tiếp Kafka 202 cho Ghi và Redis Cache-Aside cho Đọc', () => {
    it('Tạo phiếu xuất phát event Kafka dispatch.order.event.create và trả về 202 Accepted', async () => {
      const { controller, inventoryClient, cacheManager } = buildController();
      const res = await controller.createDispatchOrder(
        { type: 'TRANSFER', referenceId: 'pr-1' },
        { user: { sub: 'wh-1', fullName: 'Thủ kho A', role: 'warehouse' } },
      );

      expect(res.status).toBe('Accepted');
      expect(inventoryClient.emit).toHaveBeenCalledWith(
        'dispatch.order.event.create',
        expect.stringContaining('wh-1'),
      );
      expect(cacheManager.del).toHaveBeenCalledWith('dispatch:orders:list:ALL');
    });

    it('Tạo phiếu xuất đồng bộ qua createDispatchOrderSync gọi sendKafkaMessage và trả dữ liệu ngay', async () => {
      const { controller, inventoryClient, cacheManager } = buildController();
      const { of } = require('rxjs');
      inventoryClient.send.mockReturnValueOnce(
        of({ success: true, data: { _id: 'do-sync-1', dispatchCode: 'DO-20261112-0001' } }),
      );

      const res: any = await controller.createDispatchOrderSync(
        { type: 'TRANSFER', referenceId: 'pr-1' },
        { user: { sub: 'wh-1', fullName: 'Thủ kho A', role: 'warehouse' } },
      );

      expect(res.success).toBe(true);
      expect(res.data.dispatchCode).toBe('DO-20261112-0001');
      expect(inventoryClient.send).toHaveBeenCalledWith(
        'dispatch.order.create',
        expect.objectContaining({ type: 'TRANSFER', referenceId: 'pr-1' }),
      );
      expect(cacheManager.del).toHaveBeenCalledWith('dispatch:orders:list:ALL');
    });

    it('Nhặt hàng chuyển tiếp X-Idempotency-Key và xóa cache chi tiết phiếu', async () => {
      const { controller, inventoryClient, cacheManager } = buildController();
      const res = await controller.pickItem(
        'do-1',
        { lineId: 'l1', quantity: 5, scannedBinCode: 'BIN-A-A1-S1-B1', toteCode: 'TOTE-01' },
        'idem-123',
        { user: { sub: 'wh-1', fullName: 'Thủ kho', role: 'warehouse' } },
      );

      expect(res.status).toBe('Accepted');
      expect(inventoryClient.emit).toHaveBeenCalledWith(
        'dispatch.order.event.pick_item',
        expect.stringContaining('idem-123'),
      );
      expect(cacheManager.del).toHaveBeenCalledWith('dispatch:orders:detail:do-1');
    });

    it('Đọc chi tiết phiếu tận dụng Redis Cache Hit khi có sẵn dữ liệu', async () => {
      const cached = { success: true, data: { _id: 'do-99', dispatchCode: 'DO-99' } };
      const { controller, inventoryClient } = buildController({ cachedDetail: cached });

      const res = await controller.getDispatchOrderById('do-99');
      expect(res).toEqual(cached);
      expect(inventoryClient.send).not.toHaveBeenCalled();
    });
  });

  describe('2. [Boundary Values] Thiếu cacheManager hoặc thiếu X-Idempotency-Key ở header', () => {
    it('Hoạt động an toàn ngay cả khi Redis cacheManager chưa sẵn sàng và fallback idempotencyKey từ body', async () => {
      const inventoryClient: any = { emit: jest.fn(), subscribeToResponseOf: jest.fn() };
      const controller = new DispatchOrderController(inventoryClient, undefined, undefined);

      const res = await controller.pickItem(
        'do-2',
        { lineId: 'l1', quantity: 1, idempotencyKey: 'body-key' },
        undefined,
        { user: { sub: 'wh-2', role: 'warehouse' } },
      );

      expect(res.status).toBe('Accepted');
      expect(inventoryClient.emit).toHaveBeenCalledWith(
        'dispatch.order.event.pick_item',
        expect.stringContaining('body-key'),
      );
    });
  });

  describe('3. [Abnormal Values] Lỗi kết nối Redis hoặc Auth Service khi duyệt phiếu', () => {
    it('Phê duyệt vẫn gửi event an toàn khi Redis báo lỗi và Auth Kafka lookup bị timeout', async () => {
      const { controller, inventoryClient, cacheManager, kafkaClient } = buildController();
      cacheManager.del.mockRejectedValueOnce(new Error('Redis disconnected'));
      kafkaClient.send.mockImplementationOnce(() => {
        throw new Error('Auth service down');
      });

      const res = await controller.approveDispatchOrder(
        'do-5',
        { note: 'Duyệt' },
        { user: { sub: 'pic-1', role: 'pharmacist', isBranchPIC: true } },
      );

      expect(res.status).toBe('Accepted');
      expect(inventoryClient.emit).toHaveBeenCalledWith(
        'dispatch.order.event.approve',
        expect.stringContaining('"isBranchPIC":true'),
      );
    });
  });
});
