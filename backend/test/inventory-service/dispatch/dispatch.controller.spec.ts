/// <reference types="jest" />
/**
 * Bộ kiểm thử đơn vị cho DispatchController (Microservice Kafka Consumer)
 * Đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values]
 */

import { RpcException } from '@nestjs/microservices';
import { DispatchController } from '../../../apps/inventory-service/src/dispatch/dispatch.controller';

describe('DispatchController (Microservice Kafka Handler)', () => {
  const buildController = () => {
    const mockService: any = {
      listDispatchOrders: jest.fn(async () => ({ success: true, data: [] })),
      getDispatchOrderById: jest.fn(async (id: string) => ({ success: true, data: { _id: id } })),
      listTotes: jest.fn(async () => ({ success: true, data: [] })),
      createDispatchOrder: jest.fn(async () => ({ success: true, data: { dispatchCode: 'DO-01' } })),
      approveDispatchOrder: jest.fn(async () => ({ success: true })),
      rejectDispatchOrder: jest.fn(async () => ({ success: true })),
      pickItem: jest.fn(async () => ({ success: true })),
      returnItem: jest.fn(async () => ({ success: true })),
      markShortage: jest.fn(async () => ({ success: true })),
      stageDispatchOrder: jest.fn(async () => ({ success: true })),
      confirmDispatch: jest.fn(async () => ({ success: true })),
      cancelDispatchOrder: jest.fn(async () => ({ success: true })),
      notifyAsyncActionFailure: jest.fn(),
    };
    const controller = new DispatchController(mockService);
    return { controller, mockService };
  };

  describe('1. [Normal Values] Xử lý các message đọc và event ghi chuẩn JSON', () => {
    it('listDispatchOrders và getDispatchOrderById trả về dữ liệu đúng từ DispatchService', async () => {
      const { controller, mockService } = buildController();
      await controller.listDispatchOrders({ status: 'APPROVED' });
      expect(mockService.listDispatchOrders).toHaveBeenCalledWith({ status: 'APPROVED' });

      const detail = await controller.getDispatchOrderById(JSON.stringify({ id: 'do-123' }));
      expect(mockService.getDispatchOrderById).toHaveBeenCalledWith('do-123');
      expect(detail.data._id).toBe('do-123');
    });

    it('handlePickItemEvent parse chuỗi JSON và gọi DispatchService.pickItem', async () => {
      const { controller, mockService } = buildController();
      await controller.handlePickItemEvent(
        JSON.stringify({ dispatchOrderId: 'do-1', lineId: 'l1', quantity: 5 }),
      );
      expect(mockService.pickItem).toHaveBeenCalledWith({
        dispatchOrderId: 'do-1',
        lineId: 'l1',
        quantity: 5,
      });
    });
  });

  describe('2. [Boundary Values] Payload rỗng hoặc chuỗi id thô', () => {
    it('Xử lý được payload undefined khi gọi listTotes và getDispatchOrderById dạng chuỗi id', async () => {
      const { controller, mockService } = buildController();
      await controller.listTotes(undefined);
      expect(mockService.listTotes).toHaveBeenCalledWith(undefined);

      await controller.getDispatchOrderById('DO-20261111-0001');
      expect(mockService.getDispatchOrderById).toHaveBeenCalledWith('DO-20261111-0001');
    });
  });

  describe('3. [Abnormal Values] Lỗi service hoặc chuỗi JSON hỏng', () => {
    it('Bắn RpcException khi truy vấn chi tiết thất bại và gọi notifyAsyncActionFailure khi event lỗi', async () => {
      const { controller, mockService } = buildController();
      mockService.getDispatchOrderById.mockRejectedValueOnce(new Error('Not found'));

      await expect(controller.getDispatchOrderById('bad-id')).rejects.toThrow(RpcException);

      mockService.approveDispatchOrder.mockRejectedValueOnce(new Error('Không có quyền duyệt'));
      await controller.handleApproveEvent(
        JSON.stringify({ id: 'do-9', actor: { userId: 'u1' } }),
      );
      expect(mockService.notifyAsyncActionFailure).toHaveBeenCalledWith(
        'u1',
        'APPROVE_DISPATCH',
        'do-9',
        'Không có quyền duyệt',
      );
    });
  });
});
