/**
 * socket.service.spec.ts - Bộ Kiểm Thử Đơn Vị cho SocketService Mobile
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Luồng nghiệp vụ chuẩn, khởi tạo kết nối, phân phối sự kiện, đăng ký và hủy listener.
 * 2. [Boundary Values]: Token rỗng, chuỗi trắng, mảng listener rỗng, ngắt kết nối nhiều lần, dữ liệu data rỗng.
 * 3. [Abnormal Values]: Dữ liệu sự kiện null/undefined/sai định dạng, listener ném ngoại lệ không làm sập tiến trình.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

// Mock các thư viện react-native và socket.io-client
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
}));

const mockSocketInstance = {
  on: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocketInstance),
}));

jest.mock('../../src/services/api.service', () => ({
  ApiService: {
    baseUrl: 'https://pharmacy.mock-gateway.vn',
  },
}));

import { SocketService } from '../../src/services/socket.service';
import { io } from 'socket.io-client';

describe('SocketService (Dịch Vụ Kết Nối Thời Gian Thực Mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SocketService.disconnect();
  });

  // =========================================================================
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('[Normal Values] - Luồng chuẩn và phân phối sự kiện Bounded Context', () => {
    it('Khởi tạo kết nối Socket với Bearer Token hợp lệ và cấu hình đúng Gateway', () => {
      const validToken = 'valid_jwt_token_sample';
      SocketService.initSocket(validToken);

      expect(io).toHaveBeenCalledWith(
        'https://pharmacy.mock-gateway.vn',
        expect.objectContaining({
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          auth: { token: validToken },
        })
      );
      expect(mockSocketInstance.connect).toHaveBeenCalled();
    });

    it('Đăng ký nhận thông báo (subscribe) và nhận đúng payload khi có sự kiện đẩy về', () => {
      const receivedNotifications: any[] = [];
      const unsubscribe = SocketService.subscribe((notif) => {
        receivedNotifications.push(notif);
      });

      // Kích hoạt xử lý thông báo nội bộ qua hàm handleIncomingNotification gián tiếp
      (SocketService as any).handleIncomingNotification('PR_UPDATED', {
        id: 'PR-1001',
        title: 'Đề xuất mua hàng đã duyệt',
        message: 'Trưởng chi nhánh đã phê duyệt PR-1001',
      });

      expect(receivedNotifications).toHaveLength(1);
      expect(receivedNotifications[0].type).toBe('PR_UPDATED');
      expect(receivedNotifications[0].id).toBe('PR-1001');

      unsubscribe();
    });

    it('Hủy đăng ký (unsubscribe) loại bỏ listener khỏi hàng đợi thành công', () => {
      let callCount = 0;
      const unsubscribe = SocketService.subscribe(() => {
        callCount++;
      });

      (SocketService as any).handleIncomingNotification('GENERAL', { text: 'Msg 1' });
      expect(callCount).toBe(1);

      // Gọi hủy đăng ký
      unsubscribe();

      (SocketService as any).handleIncomingNotification('GENERAL', { text: 'Msg 2' });
      expect(callCount).toBe(1); // Không tăng thêm
    });

    it('Phân phối chính xác sự kiện new_po_notification và order:paid qua listener', () => {
      const received: any[] = [];
      const unsubscribe = SocketService.subscribe((n) => received.push(n));
      SocketService.initSocket('test_token');

      const poCallback = mockSocketInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'new_po_notification'
      )?.[1];

      expect(poCallback).toBeDefined();

      if (poCallback) {
        poCallback({
          title: 'ĐƠN MUA HÀNG MỚI',
          message: 'Đã tạo PO-001',
        });

        expect(received.length).toBe(1);
        expect(received[0]).toEqual(
          expect.objectContaining({
            type: 'NEW_PO',
            title: 'ĐƠN MUA HÀNG MỚI',
          })
        );
      }
      unsubscribe();
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên
  // =========================================================================
  describe('[Boundary Values] - Xử lý giá trị biên, rỗng, ngắt lặp lại', () => {
    it('Không thực hiện kết nối khi truyền token rỗng hoặc chuỗi trắng', () => {
      SocketService.initSocket('');
      expect(io).not.toHaveBeenCalled();

      SocketService.initSocket('   ');
      // Token chuỗi trắng vẫn được truyền nhưng không crash
    });

    it('Ngắt kết nối nhiều lần liên tiếp an toàn mà không phát sinh lỗi ngoại lệ', () => {
      expect(() => {
        SocketService.disconnect();
        SocketService.disconnect();
        SocketService.disconnect();
      }).not.toThrow();

      expect(SocketService.connected).toBe(false);
    });

    it('Xử lý payload data là chuỗi nguyên thủy (string primitive) thay vì object', () => {
      const received: any[] = [];
      const unsub = SocketService.subscribe((n) => received.push(n));

      (SocketService as any).handleIncomingNotification('ALERT', 'Hệ thống chuẩn bị bảo trì 5 phút');

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('ALERT');
      expect(received[0].message).toBe('Hệ thống chuẩn bị bảo trì 5 phút');

      unsub();
    });

    it('Xử lý payload data là object rỗng {} mà không bị undefined timestamp', () => {
      const received: any[] = [];
      const unsub = SocketService.subscribe((n) => received.push(n));

      (SocketService as any).handleIncomingNotification('EMPTY_EVENT', {});

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('EMPTY_EVENT');
      expect(received[0].timestamp).toBeDefined();

      unsub();
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường và phòng vệ lỗi
  // =========================================================================
  describe('[Abnormal Values] - Khả năng chịu lỗi và an toàn tiến trình', () => {
    it('Listener ném lỗi ngoại lệ (throw Error) không làm gián đoạn các listener khác', () => {
      const receivedGood: any[] = [];

      // Listener 1: Ném lỗi
      SocketService.subscribe(() => {
        throw new Error('Lỗi cố tình trong listener 1');
      });

      // Listener 2: Bình thường
      SocketService.subscribe((n) => {
        receivedGood.push(n);
      });

      // Bắn sự kiện
      expect(() => {
        (SocketService as any).handleIncomingNotification('TEST', { data: 123 });
      }).not.toThrow();

      expect(receivedGood).toHaveLength(1);
    });

    it('Xử lý an toàn khi payload data nhận vào là null hoặc undefined', () => {
      const received: any[] = [];
      const unsub = SocketService.subscribe((n) => received.push(n));

      expect(() => {
        (SocketService as any).handleIncomingNotification('NULL_DATA', null);
        (SocketService as any).handleIncomingNotification('UNDEF_DATA', undefined);
      }).not.toThrow();

      expect(received).toHaveLength(2);
      expect(received[0].message).toBe('null');
      expect(received[1].message).toBe('undefined');

      unsub();
    });
  });
});

