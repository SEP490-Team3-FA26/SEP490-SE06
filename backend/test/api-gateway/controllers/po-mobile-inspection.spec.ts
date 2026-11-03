import { GoodsReceiptController } from '../../../apps/api-gateway/src/controllers/goods-receipt.controller';
import { ClientKafka } from '@nestjs/microservices';
import { Cache } from 'cache-manager';
import { AppWebsocketGateway } from '../../../apps/api-gateway/src/websocket/websocket.gateway';
import { NotificationService } from '../../../apps/api-gateway/src/notification/notification.service';

/**
 * po-mobile-inspection.spec.ts
 * Bộ kiểm thử đơn vị cho API Đồng Bộ Kiểm Đếm PO Liên Thiết Bị (Mobile <-> PC)
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code).
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('GoodsReceiptController - PO Mobile Inspection Sync', () => {
  let controller: GoodsReceiptController;
  let mockInventoryClient: Partial<ClientKafka>;
  let mockCacheManager: Partial<Cache>;
  let mockWebsocketGateway: Partial<AppWebsocketGateway>;
  let mockNotificationService: Partial<NotificationService>;
  let memoryStore: Record<string, any>;

  beforeEach(() => {
    memoryStore = {};

    mockInventoryClient = {
      emit: jest.fn(),
      send: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn().mockImplementation((key: string) => Promise.resolve(memoryStore[key] || null)),
      set: jest.fn().mockImplementation((key: string, val: any) => {
        memoryStore[key] = val;
        return Promise.resolve();
      }),
      del: jest.fn().mockImplementation((key: string) => {
        delete memoryStore[key];
        return Promise.resolve();
      }),
    };

    mockWebsocketGateway = {
      server: {
        emit: jest.fn(),
      } as any,
    };

    mockNotificationService = {} as any;

    controller = new GoodsReceiptController(
      mockInventoryClient as ClientKafka,
      mockWebsocketGateway as AppWebsocketGateway,
      mockCacheManager as Cache,
      mockNotificationService as NotificationService,
    );
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] Luồng lưu và truy xuất kiểm đếm PO từ Mobile', () => {
    it('TC-PO-INSP-NORM-01: Lưu thành công kết quả kiểm đếm Mobile cho đơn PO vào Cache và phát WebSocket', async () => {
      const poId = 'PO-2026-001';
      const inspectionData = {
        poId,
        status: 'INSPECTING',
        items: [
          { _id: 'item-1', medicineName: 'Efferalgan 500mg', expectedQty: 100, actualQty: 100, batchNo: 'B001' },
        ],
      };

      const res = await controller.savePoMobileInspection(poId, inspectionData);

      expect(res.success).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `po_inspection:${poId}`,
        inspectionData,
        86400000,
      );
      expect(mockWebsocketGateway.server?.emit).toHaveBeenCalledWith(
        `po_inspection_updated:${poId}`,
        inspectionData,
      );
    });

    it('TC-PO-INSP-NORM-02: Máy tính kho lấy thành công dữ liệu kiểm đếm Mobile đã lưu', async () => {
      const poId = 'PO-2026-002';
      const inspectionData = {
        poId,
        status: 'COMPLETED',
        items: [
          { _id: 'item-2', medicineName: 'Amoxicillin 500mg', expectedQty: 50, actualQty: 50 },
        ],
      };
      await controller.savePoMobileInspection(poId, inspectionData);

      const res = await controller.getPoMobileInspection(poId);

      expect(res.success).toBe(true);
      expect(res.data).toEqual(inspectionData);
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên độ dài danh sách
  // =========================================================================
  describe('[Boundary Values] Giá trị biên dữ liệu kiểm đếm', () => {
    it('TC-PO-INSP-BOUND-01: Cho phép lưu phiên kiểm đếm với danh sách mặt hàng rỗng ban đầu', async () => {
      const poId = 'PO-EMPTY-001';
      const emptyData = { poId, status: 'INSPECTING', items: [] };

      const res = await controller.savePoMobileInspection(poId, emptyData);
      expect(res.success).toBe(true);

      const fetchRes = await controller.getPoMobileInspection(poId);
      expect((fetchRes.data as any).items).toHaveLength(0);
    });

    it('TC-PO-INSP-BOUND-02: Cho phép lưu phiên kiểm đếm số lượng lớn mặt hàng (50+ items)', async () => {
      const poId = 'PO-LARGE-001';
      const largeItems = Array.from({ length: 50 }, (_, i) => ({
        _id: `item-${i}`,
        medicineName: `Thuốc #${i}`,
        expectedQty: 100,
        actualQty: 100,
      }));
      const largeData = { poId, status: 'INSPECTING', items: largeItems };

      const res = await controller.savePoMobileInspection(poId, largeData);
      expect(res.success).toBe(true);

      const fetchRes = await controller.getPoMobileInspection(poId);
      expect((fetchRes.data as any).items).toHaveLength(50);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & trường hợp không tìm thấy
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & không tồn tại', () => {
    it('TC-PO-INSP-ABNORM-01: Trả về success false khi truy vấn đơn PO chưa từng được kiểm đếm', async () => {
      const nonExistentPoId = 'PO-NOT-FOUND-999';

      const res = await controller.getPoMobileInspection(nonExistentPoId);

      expect(res.success).toBe(false);
      expect(res.message).toContain('Chưa có dữ liệu kiểm đếm Mobile');
    });
  });
});
