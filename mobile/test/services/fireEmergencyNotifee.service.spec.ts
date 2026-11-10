/**
 * fireEmergencyNotifee.service.spec.ts - Bộ Kiểm Thử Đơn Vị cho FireEmergencyNotifeeService
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Kích hoạt Notifee Full-Screen Ringing, tạo channel, rung phần cứng, tắt còi, khôi phục khi launch từ Killed.
 * 2. [Boundary Values]: Fallback khi Android 14+ chặn ForegroundService, kích hoạt liên tiếp chống trùng lặp, tắt khi chưa bật.
 * 3. [Abnormal Values]: Payload rỗng, listener ném lỗi ngoại lệ, kiểm tra an toàn khi Notifee/Vibration lỗi.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

const mockCreateChannel = jest.fn().mockResolvedValue('fire_emergency_ring_v8');
const mockDeleteChannel = jest.fn().mockResolvedValue(undefined);
const mockDisplayNotification = jest.fn().mockResolvedValue('fire_emergency_active_alert');
const mockCancelNotification = jest.fn().mockResolvedValue(undefined);
const mockCancelDisplayedNotification = jest.fn().mockResolvedValue(undefined);
const mockStopForegroundService = jest.fn().mockResolvedValue(undefined);
const mockRegisterForegroundService = jest.fn();
const mockOnForegroundEvent = jest.fn();
const mockOnBackgroundEvent = jest.fn();
const mockGetInitialNotification = jest.fn().mockResolvedValue(null);
const mockGetDisplayedNotifications = jest.fn().mockResolvedValue([]);

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    NotifeeApiModule: {},
  },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
}));

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    createChannel: mockCreateChannel,
    deleteChannel: mockDeleteChannel,
    displayNotification: mockDisplayNotification,
    cancelNotification: mockCancelNotification,
    cancelDisplayedNotification: mockCancelDisplayedNotification,
    stopForegroundService: mockStopForegroundService,
    registerForegroundService: mockRegisterForegroundService,
    onForegroundEvent: mockOnForegroundEvent,
    onBackgroundEvent: mockOnBackgroundEvent,
    getInitialNotification: mockGetInitialNotification,
    getDisplayedNotifications: mockGetDisplayedNotifications,
  },
}));

import {
  FireEmergencyNotifeeService,
  FireAlertPayload,
  FIRE_CHANNEL_ID,
  FIRE_NOTIFICATION_ID,
} from '../../src/services/fireEmergencyNotifee.service';
import { Vibration } from 'react-native';

describe('FireEmergencyNotifeeService (Cảnh Báo Hỏa Hoạn Full-Screen APK Android)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockDisplayNotification.mockResolvedValue(FIRE_NOTIFICATION_ID);
    mockGetInitialNotification.mockResolvedValue(null);
    mockGetDisplayedNotifications.mockResolvedValue([]);
    await FireEmergencyNotifeeService.stopAlarm();
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. [Normal Values] Luồng chuẩn thành công
  // =========================================================================
  describe('[Normal Values] - Kích hoạt và dập tắt báo động khẩn cấp trên APK', () => {
    it('Kích hoạt còi báo động thành công: tạo channel ringtone, rung và hiển thị Notifee Full-Screen Call', async () => {
      const payload: FireAlertPayload = {
        title: 'CẢNH BÁO CHÁY KHO GSP',
        body: 'Nhiệt độ cảm biến vượt ngưỡng 60°C',
        deviceId: 'ESP32_ZONE_A',
        temp: '62.5',
        isTest: false,
      };

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload);

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);
      expect(FireEmergencyNotifeeService.getCurrentPayload()).toEqual(payload);
      expect(Vibration.vibrate).toHaveBeenCalledWith([0, 1000, 500, 1000, 500, 1000], true);
      expect(mockCreateChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: FIRE_CHANNEL_ID,
          sound: 'content://settings/system/ringtone',
          bypassDnd: true,
        })
      );
      expect(mockDisplayNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: FIRE_NOTIFICATION_ID,
          title: 'CẢNH BÁO CHÁY KHO GSP',
          android: expect.objectContaining({
            channelId: FIRE_CHANNEL_ID,
            loopSound: true,
            lightUpScreen: true,
            category: 'call',
            sound: 'content://settings/system/ringtone',
            asForegroundService: true,
            actions: [
              { title: 'TẮT CÒI', pressAction: { id: 'stop_alarm' } },
              { title: 'TIẾP NHẬN', pressAction: { id: 'answer_alarm', launchActivity: 'default' } },
            ],
          }),
        })
      );
      expect(FireEmergencyNotifeeService.getCallState()).toBe('RINGING');
    });

    it('Nghe máy / Tiếp nhận (answerAlarm): chuyển trạng thái sang ANSWERED, tắt chuông và rung nhưng vẫn giữ modal chi tiết', async () => {
      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
        title: 'BÁO CHÁY',
        temp: '66.0',
      });
      expect(FireEmergencyNotifeeService.getCallState()).toBe('RINGING');

      await FireEmergencyNotifeeService.answerAlarm();

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);
      expect(FireEmergencyNotifeeService.getCallState()).toBe('ANSWERED');
      expect(Vibration.cancel).toHaveBeenCalled();
      expect(mockStopForegroundService).toHaveBeenCalled();
      expect(mockCancelNotification).toHaveBeenCalledWith(FIRE_NOTIFICATION_ID);
    });

    it('Đăng ký listener nhận đúng payload khi có sự kiện báo cháy kích hoạt', async () => {
      const receivedPayloads: (FireAlertPayload | null)[] = [];
      const unsubscribe = FireEmergencyNotifeeService.subscribe((data) => {
        receivedPayloads.push(data);
      });

      const payload: FireAlertPayload = {
        title: 'HỎA HOẠN KHẨN CẤP',
        body: 'Phát hiện khói tại kho tầng 2',
      };

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload);

      expect(receivedPayloads).toHaveLength(1);
      expect(receivedPayloads[0]?.title).toBe('HỎA HOẠN KHẨN CẤP');

      unsubscribe();
    });

    it('Dập tắt báo động (stopAlarm) thành công: hủy rung, dừng ForegroundService và xóa notification', async () => {
      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm({ title: 'Cháy' });
      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);

      await FireEmergencyNotifeeService.stopAlarm();

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(false);
      expect(FireEmergencyNotifeeService.getCurrentPayload()).toBeNull();
      expect(Vibration.cancel).toHaveBeenCalled();
      expect(mockStopForegroundService).toHaveBeenCalled();
      expect(mockCancelNotification).toHaveBeenCalledWith(FIRE_NOTIFICATION_ID);
    });

    it('Tự động khôi phục màn hình báo cháy khi app được đánh thức từ trạng thái Killed bởi Full-Screen Intent', async () => {
      mockGetInitialNotification.mockResolvedValue({
        notification: {
          id: FIRE_NOTIFICATION_ID,
          title: 'BÁO ĐỘNG HỎA HOẠN',
          data: {
            type: 'FIRE_EMERGENCY',
            deviceId: 'ESP32_KHO_TONG',
            temp: '68.0',
            isTest: 'true',
          },
        },
      });

      await FireEmergencyNotifeeService.checkPendingEmergencyOnLaunch();

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);
      expect(FireEmergencyNotifeeService.getCurrentPayload()).toEqual(
        expect.objectContaining({
          deviceId: 'ESP32_KHO_TONG',
          temp: '68.0',
          isTest: true,
        })
      );
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên và fallback Android 14+
  // =========================================================================
  describe('[Boundary Values] - Chống trùng lặp và fallback ForegroundService', () => {
    it('Tự động fallback sang asForegroundService: false nếu Android 14+ từ chối khởi chạy ForegroundService từ nền', async () => {
      mockDisplayNotification
        .mockRejectedValueOnce(new Error('ForegroundServiceStartNotAllowedException'))
        .mockResolvedValueOnce(FIRE_NOTIFICATION_ID);

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
        title: 'CHÁY KHO',
        temp: '70.0',
      });

      expect(mockDisplayNotification).toHaveBeenCalledTimes(2);
      expect(mockDisplayNotification.mock.calls[0][0].android.asForegroundService).toBe(true);
      expect(mockDisplayNotification.mock.calls[1][0].android.asForegroundService).toBe(false);
    });

    it('Dập tắt báo động khi chưa kích hoạt không phát sinh lỗi ngoại lệ', async () => {
      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(false);

      await expect(FireEmergencyNotifeeService.stopAlarm()).resolves.not.toThrow();
      expect(Vibration.cancel).toHaveBeenCalled();
    });

    it('Kích hoạt báo động lần 2 khi còi đang kêu chỉ cập nhật payload mà không gọi rung đè', async () => {
      const payload1: FireAlertPayload = { title: 'Báo động 1', temp: '50' };
      const payload2: FireAlertPayload = { title: 'Báo động 2 khẩn cấp hơn', temp: '75' };

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload1);
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload2);
      expect(FireEmergencyNotifeeService.getCurrentPayload()?.temp).toBe('75');
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
    });

    it('Khi còi đang reo, một listener mới subscribe lập tức nhận ngay payload hiện tại', async () => {
      const payload: FireAlertPayload = { title: 'Đang cháy!', deviceId: 'ESP_01' };
      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload);

      let immediatePayload: FireAlertPayload | null = null;
      const unsub = FireEmergencyNotifeeService.subscribe((p) => {
        immediatePayload = p;
      });

      expect(immediatePayload).toEqual(
        expect.objectContaining({
          title: 'Đang cháy!',
          deviceId: 'ESP_01',
        })
      );
      unsub();
    });

    it('Không ghi đè trạng thái ANSWERED về lại RINGING khi checkPendingEmergencyOnLaunch chạy lặp', async () => {
      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
        title: 'CHÁY KHO',
        temp: '68.0',
      });
      await FireEmergencyNotifeeService.answerAlarm();
      expect(FireEmergencyNotifeeService.getCallState()).toBe('ANSWERED');

      mockGetInitialNotification.mockResolvedValue({
        notification: {
          id: FIRE_NOTIFICATION_ID,
          title: 'CHÁY KHO',
          data: { type: 'FIRE_EMERGENCY', temp: '68.0' },
        },
      });

      await FireEmergencyNotifeeService.checkPendingEmergencyOnLaunch();
      expect(FireEmergencyNotifeeService.getCallState()).toBe('ANSWERED');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường và phòng vệ
  // =========================================================================
  describe('[Abnormal Values] - Khả năng chịu lỗi và an toàn', () => {
    it('Kích hoạt với payload rỗng {} không gây lỗi và vẫn gán fallback an toàn', async () => {
      await expect(FireEmergencyNotifeeService.triggerFireEmergencyAlarm({})).resolves.not.toThrow();

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);
      expect(FireEmergencyNotifeeService.getCurrentPayload()?.title).toBe('BÁO ĐỘNG HỎA HOẠN KHO TỔNG');
    });

    it('Listener ném lỗi ngoại lệ không làm gián đoạn các listener khác trong danh sách', async () => {
      let listener2Called = false;

      FireEmergencyNotifeeService.subscribe(() => {
        throw new Error('Cố ý ném lỗi trong listener 1');
      });

      FireEmergencyNotifeeService.subscribe(() => {
        listener2Called = true;
      });

      await expect(
        FireEmergencyNotifeeService.triggerFireEmergencyAlarm({ title: 'Test' })
      ).resolves.not.toThrow();

      expect(listener2Called).toBe(true);
    });
  });
});
