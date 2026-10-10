import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
} from 'react-native-notify-kit';
import { Platform, Vibration } from 'react-native';

export interface FireAlertPayload {
  title?: string;
  body?: string;
  deviceId?: string;
  temp?: string;
  isTest?: boolean;
}

class FireEmergencyNotifeeManager {
  private isAlarmActive: boolean = false;
  private activeNotificationId: string | null = null;
  private alertListeners: Set<(payload: FireAlertPayload | null) => void> = new Set();
  private currentPayload: FireAlertPayload | null = null;

  constructor() {
    this.registerEventHandlers();
  }

  // Khởi tạo các notification channel khẩn cấp với mức ưu tiên cao nhất
  public async initChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const channelConfig = {
        name: 'Báo Động Hỏa Hoạn Khẩn Cấp',
        importance: AndroidImportance.HIGH,
        sound: 'alarm_gentle',
        vibration: true,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        bypassDnd: true,
        lights: true,
        lightColor: '#DC2626',
      };

      // Đăng ký cả 3 ID kênh để tương thích mọi phiên bản
      await notifee.createChannel({ id: 'fire_emergency_siren_v6', ...channelConfig });
      await notifee.createChannel({ id: 'fire_emergency_alarm_v5', ...channelConfig });
      await notifee.createChannel({ id: 'fire_emergency_call_v4', ...channelConfig });
    } catch (err) {
      console.warn('Lỗi khởi tạo notifee channel:', err);
    }
  }

  // Kích hoạt còi báo động hỏa hoạn toàn màn hình (Full-Screen Alert + Loop Sound + Foreground Service)
  public async triggerFireEmergencyAlarm(payload: FireAlertPayload): Promise<void> {
    this.isAlarmActive = true;
    this.currentPayload = payload;
    this.notifyListeners(payload);

    // Kích hoạt rung dồn dập
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
    }

    const title = payload.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG';
    const body =
      payload.body ||
      `KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP TẠI TRẠM ${payload.deviceId || 'ESP32'} (${payload.temp || '65.0'}°C)!`;

    try {
      await this.initChannels();

      const notificationId = await notifee.displayNotification({
        id: 'fire_emergency_active_alert',
        title,
        body,
        data: {
          type: 'FIRE_EMERGENCY',
          deviceId: payload.deviceId || '',
          temp: payload.temp || '',
        },
        android: {
          channelId: 'fire_emergency_siren_v6',
          asForegroundService: true, // Chạy dưới dạng Foreground Service (không bị OS kill)
          lightUpScreen: true, // Bật sáng màn hình khi có thông báo
          category: AndroidCategory.CALL, // Phân loại mức cuộc gọi đến khẩn cấp
          importance: AndroidImportance.HIGH,
          loopSound: true, // Lặp âm thanh còi hú liên tục không ngừng
          sound: 'alarm_gentle',
          fullScreenAction: {
            id: 'default',
            launchActivity: 'default',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          actions: [
            {
              title: 'ĐÃ TIẾP NHẬN SỰ CỐ (TẮT CÒI)',
              pressAction: {
                id: 'stop_alarm',
              },
            },
          ],
        },
      });

      this.activeNotificationId = notificationId;
    } catch (err) {
      console.warn('Lỗi hiển thị notifee full-screen notification:', err);
    }
  }

  // Tắt còi báo động và giải phóng Foreground Service
  public async stopAlarm(): Promise<void> {
    this.isAlarmActive = false;
    this.currentPayload = null;
    this.notifyListeners(null);

    Vibration.cancel();

    try {
      if (Platform.OS === 'android') {
        await notifee.stopForegroundService();
      }
      if (this.activeNotificationId) {
        await notifee.cancelNotification(this.activeNotificationId);
        this.activeNotificationId = null;
      }
      await notifee.cancelNotification('fire_emergency_active_alert');
    } catch (err) {
      console.warn('Lỗi dừng notifee alarm:', err);
    }
  }

  public getIsAlarmActive(): boolean {
    return this.isAlarmActive;
  }

  public getCurrentPayload(): FireAlertPayload | null {
    return this.currentPayload;
  }

  public subscribe(listener: (payload: FireAlertPayload | null) => void): () => void {
    this.alertListeners.add(listener);
    if (this.isAlarmActive && this.currentPayload) {
      listener(this.currentPayload);
    }
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  private notifyListeners(payload: FireAlertPayload | null): void {
    this.alertListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.warn('Listener error:', e);
      }
    });
  }

  private registerEventHandlers(): void {
    // Đăng ký Foreground Service duy trì còi hú
    notifee.registerForegroundService(() => {
      return new Promise(() => {
        // Giữ Promise pending để Foreground Service sống liên tục cho đến khi stopAlarm được gọi
      });
    });

    // Lắng nghe khi người dùng tương tác với notification khi app đang mở
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop_alarm') {
        this.stopAlarm();
      }
    });

    // Lắng nghe khi người dùng tương tác khi app chạy ngầm / tắt
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop_alarm') {
        await this.stopAlarm();
      }
    });
  }
}

export const FireEmergencyNotifeeService = new FireEmergencyNotifeeManager();
