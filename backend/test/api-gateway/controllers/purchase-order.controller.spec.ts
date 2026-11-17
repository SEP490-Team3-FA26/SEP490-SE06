import { BadRequestException } from '@nestjs/common';
import { PurchaseOrderController } from '../../../apps/api-gateway/src/controllers/purchase-order.controller';
import { ClientKafka } from '@nestjs/microservices';
import { AppWebsocketGateway } from '../../../apps/api-gateway/src/websocket/websocket.gateway';
import { NotificationService } from '../../../apps/api-gateway/src/notification/notification.service';
import { of } from 'rxjs';

/**
 * purchase-order.controller.spec.ts
 * Bộ kiểm thử đơn vị cho PurchaseOrderController trên API Gateway
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code).
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('PurchaseOrderController', () => {
  let controller: PurchaseOrderController;
  let mockInventoryClient: Partial<ClientKafka>;
  let mockWebsocketGateway: Partial<AppWebsocketGateway>;
  let mockNotificationService: Partial<NotificationService>;

  beforeEach(() => {
    mockInventoryClient = {
      emit: jest.fn(),
      send: jest.fn().mockImplementation((topic: string, data: any) => {
        if (topic === 'inventory.po.get_by_id') {
          return of({
            _id: data.id,
            poCode: 'PO-A05944',
            status: 'RECEIVING',
            items: [{ medicineId: 'med-01', medicineName: 'Homtamin Ginseng', quantity: 274 }],
          });
        }
        if (topic === 'inventory.po.list') {
          return of([
            { _id: '6af6f744caefa79c40a05944', poCode: 'PO-A05944', status: 'RECEIVING' },
            { _id: '6af6f744caefa79c40a05945', poCode: 'PO-A05945', status: 'SHIPPING' },
          ]);
        }
        return of({ success: true });
      }),
    };

    mockWebsocketGateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
        emit: jest.fn(),
      } as any,
    };

    mockNotificationService = {
      create: jest.fn().mockResolvedValue({}),
    } as any;

    controller = new PurchaseOrderController(
      mockInventoryClient as ClientKafka,
      mockWebsocketGateway as AppWebsocketGateway,
      mockNotificationService as NotificationService,
    );
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] Luồng truy xuất danh sách và chi tiết đơn đặt hàng PO', () => {
    it('TC-PO-CTRL-NORM-01: listPurchaseOrders gọi Kafka inventory.po.list với bộ lọc status và phân trang', async () => {
      const res = await controller.listPurchaseOrders('RECEIVING,SHIPPING', 100, 1);

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.po.list', {
        status: 'RECEIVING,SHIPPING',
        limit: 100,
        page: 1,
      });
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(2);
      expect(res[0].status).toBe('RECEIVING');
    });

    it('TC-PO-CTRL-NORM-02: getPurchaseOrderById tra cứu thành công đơn PO theo mã ObjectId 24 ký tự', async () => {
      const validObjectId = '6af6f744caefa79c40a05944';
      const res = await controller.getPurchaseOrderById(validObjectId);

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.po.get_by_id', {
        id: validObjectId,
      });
      expect(res).toBeDefined();
      expect(res._id).toBe(validObjectId);
      expect(res.poCode).toBe('PO-A05944');
    });

    it('TC-PO-CTRL-NORM-03: getPurchaseOrderById tra cứu thành công đơn PO theo mã ký hiệu PO chuẩn', async () => {
      const poCode = 'PO-RFQ-20261116-0010';
      const res = await controller.getPurchaseOrderById(poCode);

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.po.get_by_id', {
        id: poCode,
      });
      expect(res).toBeDefined();
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên, tham số mặc định, mã rút gọn
  // =========================================================================
  describe('[Boundary Values] Các trường hợp tham số biên và mã quét rút gọn', () => {
    it('TC-PO-CTRL-BOUND-01: listPurchaseOrders khi không truyền tham số vẫn xử lý an toàn không lỗi', async () => {
      const res = await controller.listPurchaseOrders();

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.po.list', {
        status: undefined,
        limit: undefined,
        page: undefined,
      });
      expect(Array.isArray(res)).toBe(true);
    });

    it('TC-PO-CTRL-BOUND-02: getPurchaseOrderById hỗ trợ mã PO rút gọn 6 ký tự hex từ QR code', async () => {
      const shortCode = 'A05944';
      const res = await controller.getPurchaseOrderById(shortCode);

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.po.get_by_id', {
        id: shortCode,
      });
      expect(res).toBeDefined();
    });

    it('TC-PO-CTRL-BOUND-03: getPurchaseOrderById tự động loại bỏ khoảng trắng dư thừa ở hai đầu mã quét', async () => {
      const paddedId = '  6af6f744caefa79c40a05944  ';
      const res = await controller.getPurchaseOrderById(paddedId);

      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.po.get_by_id', {
        id: '6af6f744caefa79c40a05944',
      });
      expect(res).toBeDefined();
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, rỗng, tấn công injection
  // =========================================================================
  describe('[Abnormal Values] Xử lý ngoại lệ dữ liệu rỗng và sai định dạng', () => {
    it('TC-PO-CTRL-ABNORM-01: Ném BadRequestException khi id rỗng hoặc toàn khoảng trắng', async () => {
      await expect(controller.getPurchaseOrderById('')).rejects.toThrow(BadRequestException);
      await expect(controller.getPurchaseOrderById('   ')).rejects.toThrow(BadRequestException);
    });

    it('TC-PO-CTRL-ABNORM-02: Ném BadRequestException khi id chứa ký tự đặc biệt nguy hiểm hoặc injection', async () => {
      await expect(controller.getPurchaseOrderById('<script>alert(1)</script>')).rejects.toThrow(BadRequestException);
      await expect(controller.getPurchaseOrderById("'; DROP TABLE orders; --")).rejects.toThrow(BadRequestException);
    });
  });
});
