/// <reference types="jest" />
/**
 * Bộ kiểm thử đơn vị cho PurchaseRequisitionController (API Gateway)
 * Bao phủ đầy đủ 3 nhóm giá trị chuẩn theo Fullstack Playbook v2.0 & Test-Coupled Mandate:
 * 1. [Normal Values]: Lấy danh sách, thống kê số lượng theo trạng thái, lấy chi tiết PR hợp lệ
 * 2. [Boundary Values]: Phân trang biên, danh sách rỗng, không truyền tham số filter, giới hạn trần limit 100
 * 3. [Abnormal Values]: ID không đúng chuẩn ObjectId 24 ký tự (Rule 11), chuỗi rỗng, lỗi từ microservice Kafka
 */

import { PurchaseRequisitionController } from '../../../apps/api-gateway/src/controllers/purchase-requisition.controller';
import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('PurchaseRequisitionController (API Gateway)', () => {
  let controller: PurchaseRequisitionController;
  let mockInventoryClient: any;
  let mockWebsocketGateway: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockInventoryClient = {
      send: jest.fn(),
      emit: jest.fn(),
      subscribeToResponseOf: jest.fn(),
    };
    mockWebsocketGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        in: jest.fn().mockReturnValue({
          fetchSockets: jest.fn().mockResolvedValue([]),
        }),
      },
    };
    mockNotificationService = {
      create: jest.fn().mockResolvedValue([{ _id: 'notif-1', createdAt: new Date().toISOString() }]),
    };

    controller = new PurchaseRequisitionController(
      mockInventoryClient,
      mockWebsocketGateway,
      mockNotificationService,
    );
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng nghiệp vụ chuẩn & thành công', () => {
    it('TC-PR-NORM-01: Lấy thành công thống kê trạng thái PR từ Kafka', async () => {
      const mockCounts = {
        SUBMITTED: 98,
        SHIPPING: 4,
        COMPLETED: 11,
        OUT_OF_STOCK: 2,
        REJECTED: 0,
      };
      mockInventoryClient.send.mockReturnValue(of(mockCounts));

      const result = await controller.getStatusCounts();
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.status_counts', { branchId: undefined });
      expect(result).toEqual(mockCounts);
    });

    it('TC-PR-NORM-02: Lấy chi tiết PR thành công với mã ObjectId 24 ký tự chuẩn hex', async () => {
      const validObjectId = '6a2bc52d446f5ecaa1f508bd';
      const mockPrDetail = { _id: validObjectId, prCode: 'PR-20261113-1305', status: 'SUBMITTED' };
      mockInventoryClient.send.mockReturnValue(of(mockPrDetail));

      const result = await controller.getPurchaseRequisitionById(validObjectId);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.get_by_id', { id: validObjectId });
      expect(result).toEqual(mockPrDetail);
    });

    it('TC-PR-NORM-03: Lấy danh sách PR có tham số statusFilter', async () => {
      const mockList = [{ _id: '6a2bc52d446f5ecaa1f508bd', status: 'SUBMITTED' }];
      mockInventoryClient.send.mockReturnValue(of(mockList));

      const result = await controller.listPurchaseRequisitions('SUBMITTED', undefined, 100, 1);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: 'SUBMITTED',
        branchId: undefined,
        limit: 100,
        page: 1,
      });
      expect(result).toEqual(mockList);
    });

    it('TC-PR-NORM-04: Tự động gán branchId của Quản lý chi nhánh khi không truyền branchId', async () => {
      mockInventoryClient.send.mockReturnValue(of([]));
      const req = { user: { role: 'BRANCH_MANAGER', branchId: 'BR-001' } };
      await controller.listPurchaseRequisitions(undefined, undefined, undefined, undefined, req);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: undefined,
        branchId: 'BR-001',
        limit: 100,
        page: undefined,
      });
    });

    it('TC-PR-NORM-05: KHÔNG tự động gán branchId khi role là warehouse hoặc CENTRAL_WH (Xem toàn chuỗi)', async () => {
      mockInventoryClient.send.mockReturnValue(of([]));
      const reqWarehouse = { user: { role: 'warehouse', branchId: 'CENTRAL_WH' } };
      await controller.listPurchaseRequisitions(undefined, undefined, undefined, undefined, reqWarehouse);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: undefined,
        branchId: undefined,
        limit: 100,
        page: undefined,
      });

      const reqAdmin = { user: { role: 'admin', branchId: 'CENTRAL_WH' } };
      await controller.listPurchaseRequisitions(undefined, undefined, undefined, undefined, reqAdmin);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: undefined,
        branchId: undefined,
        limit: 100,
        page: undefined,
      });
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên & lọc chi nhánh
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên & lọc chi nhánh', () => {
    it('TC-PR-BOUND-01: Lấy thống kê trạng thái có kèm branchId chi nhánh', async () => {
      mockInventoryClient.send.mockReturnValue(of({ SUBMITTED: 5 }));
      const result = await controller.getStatusCounts('BR-001');
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.status_counts', { branchId: 'BR-001' });
      expect(result).toEqual({ SUBMITTED: 5 });
    });

    it('TC-PR-BOUND-02: Lấy danh sách PR với limit biên 100', async () => {
      mockInventoryClient.send.mockReturnValue(of([]));
      await controller.listPurchaseRequisitions(undefined, undefined, 100, undefined);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: undefined,
        branchId: undefined,
        limit: 100,
        page: undefined,
      });
    });

    it('TC-PR-BOUND-03: Gọi list không truyền tham số lọc, mặc định nhận mảng rỗng', async () => {
      mockInventoryClient.send.mockReturnValueOnce(of([]));
      const res = await controller.listPurchaseRequisitions();
      expect(res).toEqual([]);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: undefined,
        branchId: undefined,
        limit: 100,
        page: undefined,
      });
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường & Kiểm định ObjectId Rule 11
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường & Kiểm định ObjectId Rule 11', () => {
    it('TC-PR-ABNORM-01: Ném BadRequestException khi ID ngắn hơn 24 ký tự', async () => {
      await expect(controller.getPurchaseRequisitionById('12345')).rejects.toThrow(BadRequestException);
      expect(mockInventoryClient.send).not.toHaveBeenCalled();
    });

    it('TC-PR-ABNORM-02: Ném BadRequestException khi ID chứa ký tự không phải hex', async () => {
      await expect(controller.getPurchaseRequisitionById('6a2bc52d446f5ecaa1f508ZZ')).rejects.toThrow(BadRequestException);
      expect(mockInventoryClient.send).not.toHaveBeenCalled();
    });

    it('TC-PR-ABNORM-03: Ném BadRequestException khi ID là chuỗi rỗng', async () => {
      await expect(controller.getPurchaseRequisitionById('')).rejects.toThrow(BadRequestException);
      expect(mockInventoryClient.send).not.toHaveBeenCalled();
    });

    it('TC-PR-ABNORM-04: Chuyển tiếp lỗi khi Kafka inventory client ném lỗi ngoại lệ', async () => {
      const validId = '6a1f195c9d723929bb2c6a99';
      mockInventoryClient.send.mockReturnValueOnce(throwError(() => new Error('Kafka Timeout')));

      await expect(controller.getPurchaseRequisitionById(validId)).rejects.toThrow('Kafka Timeout');
    });
  });
});
