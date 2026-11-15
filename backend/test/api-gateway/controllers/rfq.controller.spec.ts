/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common';
import { RfqController } from '../../../apps/api-gateway/src/controllers/rfq.controller';
import { ClientKafka } from '@nestjs/microservices';
import { AppWebsocketGateway } from '../../../apps/api-gateway/src/websocket/websocket.gateway';
import { of } from 'rxjs';

/**
 * rfq.controller.spec.ts
 * Bộ kiểm thử đơn vị cho Controller Quản Trị Yêu Cầu Báo Giá (RFQ Controller)
 * Tuân thủ chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code).
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('RfqController - Procurement & Supplier Quotation Gateway', () => {
  let controller: RfqController;
  let mockInventoryClient: Partial<ClientKafka>;
  let mockWebsocketGateway: Partial<AppWebsocketGateway>;
  let mockServer: any;

  beforeEach(() => {
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    mockInventoryClient = {
      send: jest.fn().mockImplementation((pattern: string, data: any) => {
        if (pattern === 'inventory.rfq.get_by_id') {
          return of({
            _id: data,
            rfqCode: 'RFQ-202611-001',
            title: 'Chào giá thuốc kháng sinh đợt 1',
            status: 'SENT',
            quotations: [],
          });
        }
        if (pattern === 'inventory.rfq.list') {
          return of([
            { _id: 'rfq-1', rfqCode: 'RFQ-001', status: 'DRAFT' },
          ]);
        }
        if (pattern === 'inventory.rfq.create') {
          return of({
            _id: 'new-rfq-1',
            ...data,
            status: 'DRAFT',
          });
        }
        if (pattern === 'inventory.rfq.send') {
          return of({ success: true, status: 'SENT' });
        }
        if (pattern === 'inventory.rfq.submit_quote') {
          return of({ success: true });
        }
        if (pattern === 'inventory.rfq.award') {
          return of({ success: true, po: { _id: 'PO-NEW-001' } });
        }
        return of({});
      }),
      emit: jest.fn(),
      subscribeToResponseOf: jest.fn(),
    };

    mockWebsocketGateway = {
      server: mockServer,
    };

    controller = new RfqController(
      mockInventoryClient as ClientKafka,
      mockWebsocketGateway as AppWebsocketGateway,
    );
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng nghiệp vụ RFQ chuẩn & thành công', () => {
    it('TC-RFQ-NORM-01: Lấy chi tiết RFQ thành công với ID hợp lệ', async () => {
      const validId = '6af6f99bcaefa79c40a064c2';
      const res = await controller.getRfqById(validId);

      expect(res).toBeDefined();
      expect(res._id).toBe(validId);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.rfq.get_by_id', validId);
    });

    it('TC-RFQ-NORM-02: Tạo mới RFQ thành công và gán thông tin người tạo', async () => {
      const payload = {
        title: 'Đợt chào giá Quý 4',
        deadline: '2026-12-31',
        items: [{ medicineId: 'med-1', quantityRequested: 500 }],
      };
      const mockReq = {
        user: { id: 'USER-01', name: 'Nguyễn Văn Thu Mua', branchId: 'CENTRAL_WH' },
      };

      const res = await controller.createRfq(payload, mockReq);
      expect(res._id).toBe('new-rfq-1');
      expect(mockInventoryClient.send).toHaveBeenCalledWith(
        'inventory.rfq.create',
        expect.objectContaining({
          title: 'Đợt chào giá Quý 4',
          createdBy: 'USER-01',
          createdByName: 'Nguyễn Văn Thu Mua',
        }),
      );
    });

    it('TC-RFQ-NORM-03: Gửi RFQ đồng loạt qua email/portal và phát thông báo WebSocket đến admin', async () => {
      const rfqId = '6af6f99bcaefa79c40a064c2';
      const res = await controller.sendRfq(rfqId);

      expect(res.success).toBe(true);
      expect(mockWebsocketGateway.server?.to).toHaveBeenCalledWith('admin');
      expect(mockServer.emit).toHaveBeenCalledWith('rfq_sent', { rfqId });
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên, bộ lọc rỗng, chọn thầu
  // =========================================================================
  describe('2. [Boundary Values] Mốc biên bộ lọc & chọn thầu', () => {
    it('TC-RFQ-BOUND-01: Lấy danh sách RFQ không truyền tham số lọc (lấy toàn bộ)', async () => {
      const res = await controller.listRfqs(undefined, undefined);
      expect(Array.isArray(res)).toBe(true);
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.rfq.list', {
        status: undefined,
        branchId: undefined,
      });
    });

    it('TC-RFQ-BOUND-02: Nộp bảng chào giá của NCC và phát sự kiện realtime rfq_quote_submitted', async () => {
      const rfqId = '6af6f99bcaefa79c40a064c2';
      const quoteDto = {
        supplierId: 'SUPP-001',
        supplierName: 'Dược Hậu Giang',
        items: [{ medicineId: 'med-1', quotedPrice: 32000 }],
      };

      const res = await controller.submitQuotation(rfqId, quoteDto);
      expect(res.success).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'rfq_quote_submitted',
        expect.objectContaining({
          rfqId,
          supplierId: 'SUPP-001',
        }),
      );
    });

    it('TC-RFQ-BOUND-03: Chọn thầu NCC thành công và phát thông báo rfq_awarded', async () => {
      const rfqId = '6af6f99bcaefa79c40a064c2';
      const awardDto = { quotationId: 'Q-01', supplierId: 'SUPP-001', reason: 'Giá tốt nhất' };
      const mockReq = { user: { id: 'DIRECTOR-01', name: 'Ban Giám Đốc' } };

      const res = await controller.awardRfq(rfqId, awardDto, mockReq);
      expect(res.success).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith('rfq_awarded', {
        rfqId,
        poId: 'PO-NEW-001',
      });
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Xử lý chuỗi 'undefined', 'null', ID rỗng chống lỗi 500
  // =========================================================================
  describe('3. [Abnormal Values] Chặn triệt để chuỗi "undefined" và ID dị thường', () => {
    it('TC-RFQ-ABNORM-01: Chặn chuỗi "undefined" và ném BadRequestException thay vì để lọt gây lỗi 500', async () => {
      await expect(controller.getRfqById('undefined')).rejects.toThrow(BadRequestException);
      await expect(controller.sendRfq('undefined')).rejects.toThrow(BadRequestException);
      await expect(controller.submitQuotation('undefined', {})).rejects.toThrow(BadRequestException);
      await expect(controller.awardRfq('undefined', {} as any, {})).rejects.toThrow(BadRequestException);
    });

    it('TC-RFQ-ABNORM-02: Chặn chuỗi "null", rỗng hoặc chỉ toàn khoảng trắng', async () => {
      await expect(controller.getRfqById('null')).rejects.toThrow(BadRequestException);
      await expect(controller.getRfqById('')).rejects.toThrow(BadRequestException);
      await expect(controller.getRfqById('   ')).rejects.toThrow(BadRequestException);
    });
  });
});
