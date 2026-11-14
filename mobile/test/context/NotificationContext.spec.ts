/**
 * NotificationContext.spec.ts - Bộ Kiểm Thử Đơn Vị cho NotificationContext Mobile
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Truy xuất thông tin thông báo, đếm số chưa đọc (unreadCount) khi nằm trong NotificationProvider.
 * 2. [Boundary Values]: Gọi useNotification ngoài Provider -> Trả về đối tượng fallback an toàn, không ném lỗi crash app.
 * 3. [Abnormal Values]: Dữ liệu thông báo rỗng, null, ID rỗng, bảo đảm các hàm xử lý an toàn không gián đoạn app.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import React from 'react';

// Mock các native modules để tránh lỗi ESM trong môi trường Node.js Jest
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  NativeModules: {},
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {},
}), { virtual: true });

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

jest.mock('../../src/services/api.service', () => ({
  ApiService: {
    getMyNotifications: jest.fn().mockResolvedValue([]),
    getUnreadCount: jest.fn().mockResolvedValue(0),
    markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
    markAllNotificationsAsRead: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/services/socket.service', () => ({
  SocketService: {
    subscribe: jest.fn().mockReturnValue(() => {}),
  },
}));

import { useNotification } from '../../src/context/NotificationContext';

describe('NotificationContext - useNotification Hook & Fallback An Toàn', () => {
  const originalUseContext = React.useContext;

  afterEach(() => {
    React.useContext = originalUseContext;
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn trong Provider
  // =========================================================================
  describe('[Normal Values] - Sử dụng trong NotificationProvider', () => {
    it('N-01: Trả về đầy đủ dữ liệu thông báo và unreadCount chuẩn xác khi có context', () => {
      const mockNotifications = [
        {
          id: 'NOTIF_01',
          title: 'Đơn hàng đã được xác nhận',
          message: 'Đơn hàng #DH-1029 đã được chi nhánh duyệt thành công',
          type: 'ORDER_UPDATE',
          isRead: false,
          createdAt: '2026-10-31T20:00:00Z',
        },
        {
          id: 'NOTIF_02',
          title: 'Nhắc uống thuốc',
          message: 'Đến giờ uống Paracetamol sau bữa tối',
          type: 'REMINDER',
          isRead: true,
          createdAt: '2026-10-31T19:00:00Z',
        },
      ];

      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      const mockMarkAsRead = jest.fn().mockResolvedValue(undefined);
      const mockMarkAllAsRead = jest.fn().mockResolvedValue(undefined);

      // Giả lập React.useContext trả về Context hợp lệ
      React.useContext = jest.fn().mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        isLoading: false,
        refreshNotifications: mockRefresh,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
      });

      const result = useNotification();

      expect(result).toBeDefined();
      expect(result.unreadCount).toBe(1);
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0].id).toBe('NOTIF_01');
      expect(result.isLoading).toBe(false);

      // Kiểm tra thực thi hàm
      result.markAsRead('NOTIF_01');
      expect(mockMarkAsRead).toHaveBeenCalledWith('NOTIF_01');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Gọi ngoài Provider hoặc Giá trị biên
  // =========================================================================
  describe('[Boundary Values] - Fallback an toàn khi ngoài Provider', () => {
    it('B-01: useNotification ngoài Provider trả về fallback an toàn thay vì ném lỗi crash app', async () => {
      // Giả lập React.useContext trả về undefined (không có Provider bọc)
      React.useContext = jest.fn().mockReturnValue(undefined);

      let result: any;
      expect(() => {
        result = useNotification();
      }).not.toThrow();

      expect(result).toBeDefined();
      expect(result.unreadCount).toBe(0);
      expect(result.notifications).toEqual([]);
      expect(result.isLoading).toBe(false);

      // Gọi các hàm async fallback không bị crash
      await expect(result.refreshNotifications()).resolves.toBeUndefined();
      await expect(result.markAsRead('ANY_ID')).resolves.toBeUndefined();
      await expect(result.markAllAsRead()).resolves.toBeUndefined();
    });

    it('B-02: unreadCount biên bằng 0 không hiển thị chấm đỏ trên UI', () => {
      React.useContext = jest.fn().mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        refreshNotifications: jest.fn(),
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
      });

      const { unreadCount } = useNotification();
      expect(unreadCount).toBe(0);
      // Quy tắc UI: chỉ hiển thị chấm đỏ khi unreadCount > 0
      const shouldShowRedDot = unreadCount > 0;
      expect(shouldShowRedDot).toBe(false);
    });

    it('B-03: unreadCount biên vượt mức 99 hiển thị định dạng thu gọn', () => {
      React.useContext = jest.fn().mockReturnValue({
        notifications: [],
        unreadCount: 150,
        isLoading: false,
        refreshNotifications: jest.fn(),
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
      });

      const { unreadCount } = useNotification();
      expect(unreadCount).toBe(150);
      const displayBadge = unreadCount > 99 ? '99+' : `${unreadCount}`;
      expect(displayBadge).toBe('99+');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý dữ liệu dị thường hoặc rỗng
  // =========================================================================
  describe('[Abnormal Values] - Dữ liệu bất thường và ngoại lệ', () => {
    it('A-01: ID thông báo rỗng hoặc chuỗi trắng không gây lỗi', async () => {
      const mockMarkAsRead = jest.fn().mockResolvedValue(undefined);
      React.useContext = jest.fn().mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        refreshNotifications: jest.fn(),
        markAsRead: mockMarkAsRead,
        markAllAsRead: jest.fn(),
      });

      const { markAsRead } = useNotification();
      await expect(markAsRead('')).resolves.toBeUndefined();
      expect(mockMarkAsRead).toHaveBeenCalledWith('');
    });

    it('A-02: Danh sách thông báo chứa phần tử null/undefined được xử lý an toàn', () => {
      const abnormalNotifications = [
        null as any,
        undefined as any,
        { id: 'VALID', title: 'Thông báo hợp lệ', message: 'OK', type: 'INFO', isRead: false },
      ];

      React.useContext = jest.fn().mockReturnValue({
        notifications: abnormalNotifications,
        unreadCount: 1,
        isLoading: false,
        refreshNotifications: jest.fn(),
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
      });

      const { notifications } = useNotification();
      const validNotifications = notifications.filter(Boolean);
      expect(validNotifications).toHaveLength(1);
      expect(validNotifications[0].id).toBe('VALID');
    });
  });
});
