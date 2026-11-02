import { BadRequestException } from '@nestjs/common';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';
import { JwtService } from '@nestjs/jwt';

/**
 * pos-scanner-bridge.spec.ts
 * Bộ kiểm thử đơn vị cho Cầu Nối Súng Quét Barcode Wi-Fi (Mobile Scanner Bridge)
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code).
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('SseController - POS Scanner Bridge (Súng quét Barcode Wi-Fi)', () => {
  let controller: SseController;
  let mockSseService: Partial<SseService>;
  let mockJwtService: Partial<JwtService>;

  beforeEach(() => {
    mockSseService = {
      emit: jest.fn(),
      registerClient: jest.fn(),
      clientDisconnected: jest.fn(),
    };
    mockJwtService = {
      verify: jest.fn(),
    };
    controller = new SseController(
      mockSseService as SseService,
      mockJwtService as JwtService
    );
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] Luồng truyền mã vạch chuẩn qua Wi-Fi', () => {
    it('TC-POS-NORM-01: Truyền thành công mã vạch EAN-13 từ điện thoại tới Web POS', () => {
      const payload = {
        sessionId: 'POS-SES-1001',
        barcode: '8935006530010',
        deviceName: 'iPhone 15 Pro Max (Wi-Fi Camera)',
        branchId: 'BRANCH-HN-01',
      };

      const res = controller.bridgePosScanner(payload);

      expect(res.success).toBe(true);
      expect(res.barcode).toBe('8935006530010');
      expect(res.sessionId).toBe('POS-SES-1001');
      expect(mockSseService.emit).toHaveBeenCalledWith(
        'pos.barcode_received',
        expect.objectContaining({
          sessionId: 'POS-SES-1001',
          barcode: '8935006530010',
          deviceName: 'iPhone 15 Pro Max (Wi-Fi Camera)',
        })
      );
    });

    it('TC-POS-NORM-02: Tự động gán deviceName mặc định khi không truyền tên thiết bị', () => {
      const payload = {
        sessionId: 'POS-SES-2002',
        barcode: '3400932567577', // Efferalgan 500mg
      };

      const res = controller.bridgePosScanner(payload);

      expect(res.success).toBe(true);
      expect(mockSseService.emit).toHaveBeenCalledWith(
        'pos.barcode_received',
        expect.objectContaining({
          deviceName: 'Súng Quét Wi-Fi (Điện Thoại)',
        })
      );
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên độ dài, định dạng mã đặc biệt
  // =========================================================================
  describe('[Boundary Values] Giá trị biên độ dài và định dạng mã vạch', () => {
    it('TC-POS-BOUND-01: Chấp nhận mã vạch có độ dài tối thiểu 3 ký tự (Mã SKU nội bộ ngắn)', () => {
      const payload = {
        sessionId: 'POS-SES-3003',
        barcode: 'A01',
      };

      const res = controller.bridgePosScanner(payload);
      expect(res.success).toBe(true);
      expect(res.barcode).toBe('A01');
    });

    it('TC-POS-BOUND-02: Chấp nhận mã vạch dài chuẩn GS1-128 lên đến 48 ký tự', () => {
      const longBarcode = '01089350065300101726123110LOT2026A21SER9876543210';
      const payload = {
        sessionId: 'POS-SES-4004',
        barcode: longBarcode,
      };

      const res = controller.bridgePosScanner(payload);
      expect(res.success).toBe(true);
      expect(res.barcode).toBe(longBarcode);
    });

    it('TC-POS-BOUND-03: Tự động cắt tỉa khoảng trắng (trim) ở hai đầu mã vạch và sessionId', () => {
      const payload = {
        sessionId: '   POS-SES-TRIM   ',
        barcode: '   8935006530022   ',
      };

      const res = controller.bridgePosScanner(payload);
      expect(res.sessionId).toBe('POS-SES-TRIM');
      expect(res.barcode).toBe('8935006530022');
    });

    it('TC-POS-BOUND-04: Chấp nhận mã QR đơn hàng y tế chứa dấu hai chấm và gạch chéo (VD: ABC_ORDER:ORD-12345/VN)', () => {
      const qrPayload = {
        sessionId: 'POS-SES-QR01',
        barcode: 'ABC_ORDER:ORD-12345/VN',
      };
      const res = controller.bridgePosScanner(qrPayload);
      expect(res.success).toBe(true);
      expect(res.barcode).toBe('ABC_ORDER:ORD-12345/VN');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, rỗng, sai định dạng
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & ngoại lệ', () => {
    it('TC-POS-ABNORM-01: Ném lỗi BadRequestException khi mã vạch rỗng', () => {
      expect(() => {
        controller.bridgePosScanner({
          sessionId: 'POS-SES-5005',
          barcode: '',
        });
      }).toThrow(BadRequestException);
    });

    it('TC-POS-ABNORM-02: Ném lỗi BadRequestException khi mã vạch chỉ chứa toàn khoảng trắng', () => {
      expect(() => {
        controller.bridgePosScanner({
          sessionId: 'POS-SES-5005',
          barcode: '     ',
        });
      }).toThrow(BadRequestException);
    });

    it('TC-POS-ABNORM-03: Ném lỗi BadRequestException khi thiếu sessionId', () => {
      expect(() => {
        controller.bridgePosScanner({
          sessionId: '',
          barcode: '8935006530010',
        });
      }).toThrow(BadRequestException);
    });

    it('TC-POS-ABNORM-04: Ném lỗi BadRequestException khi truyền payload rỗng hoặc null', () => {
      expect(() => {
        controller.bridgePosScanner(null as any);
      }).toThrow(BadRequestException);
    });
  });
});
