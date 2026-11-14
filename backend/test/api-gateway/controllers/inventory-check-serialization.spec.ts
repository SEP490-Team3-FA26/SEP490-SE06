import { InventoryCheckController } from '../../../apps/api-gateway/src/controllers/inventory-check.controller';
import { ClientKafka } from '@nestjs/microservices';
import { BadRequestException } from '@nestjs/common';
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

    it('TC-IC-NORM-03: Admin hoặc Director truyền branchId qua query param được Gateway định tuyến chính xác về chi nhánh tương ứng', async () => {
      (mockInventoryClient.send as jest.Mock).mockReturnValue(of([]));

      await controller.listChecks(
        { user: { role: 'admin', sub: 'admin-01', email: 'admin@abc.com' } },
        'BR-002',
      );

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.check.list', {
        branchId: 'BR-002',
      });
    });

    it('TC-IC-NORM-04: Cập nhật biên bản kiểm kê ở trạng thái nháp (DRAFT) chuyển tiếp chính xác sang Kafka inventory.check.update', async () => {
      const updateData = {
        items: [{ medicineId: 'med-1', batchNo: 'B01', actualStock: 5, reason: 'Hao hụt' }],
        notes: 'Cập nhật lại số đếm',
      };
      (mockInventoryClient.send as jest.Mock).mockReturnValue(of({ success: true }));

      await controller.updateCheck(
        'check-123',
        updateData,
        { user: { role: 'warehouse', sub: 'wh-01', email: 'wh@abc.com', fullName: 'Thủ kho A' } },
      );

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.check.update', {
        id: 'check-123',
        items: updateData.items,
        notes: updateData.notes,
        branchId: 'CENTRAL_WH',
        performedBy: 'Thủ kho A',
      });
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

    it('TC-IC-BOUND-03: Admin hoặc Director không truyền queryBranchId sẽ mặc định lấy kho tổng CENTRAL_WH', async () => {
      (mockInventoryClient.send as jest.Mock).mockReturnValue(of([]));

      await controller.listChecks(
        { user: { role: 'director', sub: 'dir-01', email: 'director@abc.com' } },
        '   ',
      );

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.check.list', {
        branchId: 'CENTRAL_WH',
      });
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

    it('TC-IC-ABNORM-02: Tài khoản role branch nhưng chưa được gán branchId hợp lệ sẽ ném BadRequestException', async () => {
      await expect(
        controller.listChecks({
          user: { role: 'branch', sub: 'b-01', email: 'staff@abc.com', branchId: '' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

