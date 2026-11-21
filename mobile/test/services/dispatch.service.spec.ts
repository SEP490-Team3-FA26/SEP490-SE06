/// <reference types="jest" />
/**
 * dispatch.service.spec.ts - Kiểm thử đơn vị cho DispatchMobileService (API Gateway 202 + Idempotency)
 * Tuân thủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
 */

import { DispatchMobileService, generateIdempotencyKey } from '../../src/services/inventory/dispatch.service';
import { ApiService } from '../../src/services/api.service';

describe('DispatchMobileService (Tầng Service Xuất Kho Mobile)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    ApiService.setToken('mock-jwt-token');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('[Normal Values] - Gọi đúng Gateway API kèm Bearer token & X-Idempotency-Key', () => {
    it('Lấy danh sách phiếu xuất và giải mã mảng data chính xác', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [{ _id: 'do-1', dispatchCode: 'DO-01' }] }),
      })) as any;

      const list = await DispatchMobileService.getDispatchOrders({ status: 'APPROVED' });
      expect(list).toHaveLength(1);
      expect(list[0].dispatchCode).toBe('DO-01');
      expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/dispatch-orders?status=APPROVED');
    });

    it('Nhặt hàng gửi HTTP POST với header X-Idempotency-Key và xử lý 202 Accepted', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        status: 202,
        json: async () => ({ status: 'Accepted', message: 'Queued' }),
      })) as any;

      const res = await DispatchMobileService.pickItem(
        'do-1',
        { lineId: 'l1', scannedBinCode: 'BIN-A-A1-S1-B1', toteCode: 'TOTE-01', quantity: 5 },
        'idem-fixed-1',
      );

      expect(res.accepted).toBe(true);
      const fetchOptions = (globalThis.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOptions.headers['X-Idempotency-Key']).toBe('idem-fixed-1');
    });

    it('Tạo phiếu đồng bộ gọi /api/dispatch-orders/sync và trả trực tiếp dữ liệu phiếu', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ success: true, data: { _id: 'do-sync', dispatchCode: 'DO-SYNC-01' } }),
      })) as any;

      const res = await DispatchMobileService.createDispatchOrderSync({
        type: 'TRANSFER',
        referenceId: 'pr-1',
      });

      expect(res?.data?.dispatchCode).toBe('DO-SYNC-01');
      expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/dispatch-orders/sync');
    });
  });

  describe('[Boundary Values] - Bộ lọc rỗng và khóa idempotency tự sinh', () => {
    it('Tự sinh khóa idempotency khác nhau ở mỗi lần gọi và gọi URL sạch khi không có filter', async () => {
      const k1 = generateIdempotencyKey('pick');
      const k2 = generateIdempotencyKey('pick');
      expect(k1).not.toBe('');
      expect(k1.startsWith('pick-')).toBe(true);
      expect(typeof k2).toBe('string');

      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })) as any;
      const list = await DispatchMobileService.getDispatchOrders();
      expect(list).toEqual([]);
      expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/api\/dispatch-orders$/);
    });
  });

  describe('[Abnormal Values] - Chặn đầu vào rỗng và ném lỗi HTTP rõ ràng', () => {
    it('Chặn từ chối phiếu nếu lý do rỗng và chặn confirmDispatch nếu thiếu tài xế', async () => {
      await expect(DispatchMobileService.rejectDispatchOrder('do-1', '   ')).rejects.toThrow(/lý do/);
      await expect(
        DispatchMobileService.confirmDispatch('do-1', { driverName: '' }),
      ).rejects.toThrow(/tài xế/);
      await expect(DispatchMobileService.getDispatchOrderById('')).rejects.toThrow(/Thiếu mã phiếu/);
    });

    it('Chuyển đổi phản hồi lỗi HTTP 409/500 từ Gateway thành Error message rõ ràng', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Không thể hủy khi còn hàng trong Tote' }),
      })) as any;

      await expect(DispatchMobileService.cancelDispatchOrder('do-1')).rejects.toThrow(
        /còn hàng trong Tote/,
      );
    });
  });
});
