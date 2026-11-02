import { InventoryCheckController } from '../../../apps/api-gateway/src/controllers/inventory-check.controller';
import { ClientKafka } from '@nestjs/microservices';
import { of } from 'rxjs';

/**
 * inventory-check-serialization.spec.ts
 * Bộ kiểm thử đơn vị cho API Gateway InventoryCheckController & Xử Lý Serialization Đa Tầng
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate.
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('InventoryCheckController - Serialization & Plain Object Protection', () => {
  let controller: InventoryCheckController;
  let mockInventoryClient: Partial<ClientKafka>;

  beforeEach(() => {
    mockInventoryClient = {
      emit: jest.fn(),
      send: jest.fn(),
      subscribeToResponseOf: jest.fn(),
    };

    controller = new InventoryCheckController(
      mockInventoryClient as ClientKafka,
    );
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] Luồng lấy chi tiết biên bản kiểm kê chuẩn Plain Object', () => {
    it('TC-IC-NORM-01: Trả về trực tiếp object khi Kafka Microservice gửi Plain JSON Object', async () => {
      const mockCheck = {
        _id: '6ae894f7363b61dd467c51e1',
        checkCode: 'IC-20261102-0003',
        status: 'COMPLETED',
        items: [
          { medicineId: 'med-1', medicineName: 'Salonpas', actualStock: 10, systemStock: 10, difference: 0 },
        ],
        performedBy: 'Thủ kho',
        createdAt: '2026-11-02T13:49:43.536Z',
      };

      (mockInventoryClient.send as jest.Mock).mockReturnValue(of(mockCheck));

      const res = await controller.getCheckById('6ae894f7363b61dd467c51e1');

      expect(res).toBeDefined();
      expect(res.checkCode).toBe('IC-20261102-0003');
      expect(res.status).toBe('COMPLETED');
      expect(res.items.length).toBe(1);
    });

    it('TC-IC-NORM-02: Tự động parse sang Object khi Kafka Microservice trả về chuỗi JSON string hóa', async () => {
      const mockCheckObj = {
        _id: '6ae894f7363b61dd467c51e2',
        checkCode: 'IC-20261102-0004',
        status: 'DRAFT',
        items: [],
      };
      const stringifiedPayload = JSON.stringify(mockCheckObj);

      (mockInventoryClient.send as jest.Mock).mockReturnValue(of(stringifiedPayload));

      const res = await controller.getCheckById('6ae894f7363b61dd467c51e2');

      expect(typeof res).toBe('object');
      expect(res.checkCode).toBe('IC-20261102-0004');
      expect(res.status).toBe('DRAFT');
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên dữ liệu
  // =========================================================================
  describe('[Boundary Values] Giá trị biên dữ liệu biên bản kiểm kê', () => {
    it('TC-IC-BOUND-01: Xử lý an toàn khi biên bản kiểm kê có danh sách items rỗng', async () => {
      const emptyItemsCheck = {
        _id: 'check-empty',
        checkCode: 'IC-EMPTY-001',
        status: 'DRAFT',
        items: [],
      };

      (mockInventoryClient.send as jest.Mock).mockReturnValue(of(emptyItemsCheck));

      const res = await controller.getCheckById('check-empty');
      expect(res.items).toBeDefined();
      expect(res.items.length).toBe(0);
    });

    it('TC-IC-BOUND-02: Xử lý an toàn khi payload trả về chuỗi rỗng', async () => {
      (mockInventoryClient.send as jest.Mock).mockReturnValue(of(''));

      const res = await controller.getCheckById('check-empty-str');
      expect(res).toBe('');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & lỗi parse
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & chuỗi không thể parse', () => {
    it('TC-IC-ABNORM-01: Không làm sập API khi Microservice trả về chuỗi text thô không phải JSON', async () => {
      const rawText = 'Lỗi kết nối MongoDB Replica Set tạm thời';
      (mockInventoryClient.send as jest.Mock).mockReturnValue(of(rawText));

      const res = await controller.getCheckById('check-err');
      expect(res).toBe(rawText);
    });
  });
});

