/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';
import { PurchaseRequisitionController } from '../../../apps/api-gateway/src/controllers/purchase-requisition.controller';

/**
 * purchase-requisition.controller.spec.ts
 * Bộ kiểm thử đơn vị cho PurchaseRequisitionController tại tầng API Gateway
 * 
 * Tuân thủ nghiêm ngặt Test-Coupled Mandate & Fullstack Playbook v2.0:
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * - [Normal Values]: Lấy status counts thành công, lấy chi tiết PR theo ObjectId 24 ký tự hợp lệ.
 * - [Boundary Values]: Gọi status counts kèm hoặc không kèm branchId, phân trang biên.
 * - [Abnormal Values]: ID không đúng định dạng ObjectId 24 ký tự bị chặn 400 Bad Request theo Rule 11.
 */

describe('PurchaseRequisitionController - Gateway Controller Unit Tests', () => {
  let controller: PurchaseRequisitionController;
  let mockKafkaClient: any;
  let mockWebsocketGateway: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockKafkaClient = {
      send: jest.fn(),
      emit: jest.fn(),
      subscribeToResponseOf: jest.fn(),
    };
    mockWebsocketGateway = {
      server: {
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([]) }),
      },
    };
    mockNotificationService = {
      create: jest.fn().mockResolvedValue([{ _id: 'notif-1', createdAt: new Date() }]),
    };

    controller = new PurchaseRequisitionController(
      mockKafkaClient,
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
      mockKafkaClient.send.mockReturnValue(of(mockCounts));

      const result = await controller.getStatusCounts();
      expect(mockKafkaClient.send).toHaveBeenCalledWith('inventory.pr.status_counts', { branchId: undefined });
      expect(result).toEqual(mockCounts);
    });

    it('TC-PR-NORM-02: Lấy chi tiết PR thành công với mã ObjectId 24 ký tự chuẩn hex', async () => {
      const validObjectId = '6a2bc52d446f5ecaa1f508bd';
      const mockPrDetail = { _id: validObjectId, prCode: 'PR-20261113-1305', status: 'SUBMITTED' };
      mockKafkaClient.send.mockReturnValue(of(mockPrDetail));

      const result = await controller.getPurchaseRequisitionById(validObjectId);
      expect(mockKafkaClient.send).toHaveBeenCalledWith('inventory.pr.get_by_id', { id: validObjectId });
      expect(result).toEqual(mockPrDetail);
    });

    it('TC-PR-NORM-03: Lấy danh sách PR có tham số statusFilter', async () => {
      const mockList = [{ _id: '6a2bc52d446f5ecaa1f508bd', status: 'SUBMITTED' }];
      mockKafkaClient.send.mockReturnValue(of(mockList));

      const result = await controller.listPurchaseRequisitions('SUBMITTED', undefined, 100, 1);
      expect(mockKafkaClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: 'SUBMITTED',
        branchId: undefined,
        limit: 100,
        page: 1,
      });
      expect(result).toEqual(mockList);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên & lọc chi nhánh
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên & lọc chi nhánh', () => {
    it('TC-PR-BOUND-01: Lấy thống kê trạng thái có kèm branchId chi nhánh', async () => {
      mockKafkaClient.send.mockReturnValue(of({ SUBMITTED: 5 }));
      const result = await controller.getStatusCounts('BR-001');
      expect(mockKafkaClient.send).toHaveBeenCalledWith('inventory.pr.status_counts', { branchId: 'BR-001' });
      expect(result).toEqual({ SUBMITTED: 5 });
    });

    it('TC-PR-BOUND-02: Lấy danh sách PR với limit biên 100', async () => {
      mockKafkaClient.send.mockReturnValue(of([]));
      await controller.listPurchaseRequisitions(undefined, undefined, 100, undefined);
      expect(mockKafkaClient.send).toHaveBeenCalledWith('inventory.pr.list', {
        status: undefined,
        branchId: undefined,
        limit: 100,
        page: undefined,
      });
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường & Chặn ObjectId sai định dạng (Rule 11)
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường & Kiểm định ObjectId Rule 11', () => {
    it('TC-PR-ABNORM-01: Ném BadRequestException khi ID ngắn hơn 24 ký tự', async () => {
      await expect(controller.getPurchaseRequisitionById('12345')).rejects.toThrow(BadRequestException);
      expect(mockKafkaClient.send).not.toHaveBeenCalled();
    });

    it('TC-PR-ABNORM-02: Ném BadRequestException khi ID chứa ký tự không phải hex', async () => {
      await expect(controller.getPurchaseRequisitionById('6a2bc52d446f5ecaa1f508ZZ')).rejects.toThrow(BadRequestException);
      expect(mockKafkaClient.send).not.toHaveBeenCalled();
    });

    it('TC-PR-ABNORM-03: Ném BadRequestException khi ID là chuỗi rỗng', async () => {
      await expect(controller.getPurchaseRequisitionById('')).rejects.toThrow(BadRequestException);
      expect(mockKafkaClient.send).not.toHaveBeenCalled();
    });
  });
});

