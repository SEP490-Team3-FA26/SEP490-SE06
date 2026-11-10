// fireEmergencyNotifee.service.ts - Dịch vụ báo động khẩn cấp mức Cuộc gọi đến (Messenger/Zalo CallStyle) trên Android APK
// Kết hợp Notifee CallStyle.forIncomingCall + Full-Screen Intent + Ringtone lặp liên tục (FLAG_INSISTENT) + Foreground Service
import { NativeModules, Platform, Vibration } from 'react-native';

export const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
};

export const AndroidVisibility = {
  PRIVATE: 0,
  PUBLIC: 1,
  SECRET: -1,
};

export const AndroidCategory = {
  ALARM: 'alarm',
  CALL: 'call',
  ERR: 'err',
  EVENT: 'event',
  MSG: 'msg',
  REMINDER: 'reminder',
  SERVICE: 'service',
  STATUS: 'status',
};

export const EventType = {
  UNKNOWN: -1,
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
  TRIGGER_NOTIFICATION_CREATED: 7,
};

export const FIRE_CHANNEL_ID = 'fire_emergency_ring_v8';
export const FIRE_NOTIFICATION_ID = 'fire_emergency_active_alert';

export type EmergencyCallState = 'RINGING' | 'ANSWERED';

export interface FireAlertPayload {
  title?: string;
  body?: string;
  deviceId?: string;
  temp?: string;
  isTest?: boolean;
}

// Safe Lazy Loader cho Notifee (Tránh crash trong Jest hoặc môi trường không có NativeModule)
let notifeeInstance: any = null;
function getNotifee(): any {
  if (Platform.OS !== 'android') return null;
  if (!NativeModules || (!NativeModules.NotifeeApiModule && !(NativeModules as any).Notifee)) {
    return null;
  }
  if (!notifeeInstance) {
    try {
      const mod = require('react-native-notify-kit');
      notifeeInstance = mod.default || mod;
    } catch {
      notifeeInstance = null;
    }
  }
  return notifeeInstance;
}

class FireEmergencyNotifeeManager {
  private isAlarmActive: boolean = false;
  private currentCallState: EmergencyCallState = 'RINGING';
  private lastTriggerAtMs: number = 0;
  private alertListeners: Set<(payload: FireAlertPayload | null) => void> = new Set();
  private currentPayload: FireAlertPayload | null = null;
  private handlersRegistered: boolean = false;

  constructor() {
    this.registerEventHandlers();
  }

  // Khởi tạo các notification channel khẩn cấp mức cao nhất (Ringtone + Bypass DND + Lockscreen Public)
  public async initChannels(): Promise<void> {
    const notifee = getNotifee();
    if (!notifee) return;

    try {
      // Dọn dẹp các channel cũ để tránh Android cache cấu hình cũ
      await notifee.deleteChannel('fire_emergency_ringtone_v7').catch(() => {});
      await notifee.deleteChannel('fire_emergency_siren_v6').catch(() => {});
      await notifee.deleteChannel('fire_emergency_alarm_v5').catch(() => {});
      await notifee.deleteChannel('fire_emergency_call_v4').catch(() => {});

      await notifee.createChannel({
        id: FIRE_CHANNEL_ID,
        name: 'Báo Động Hỏa Hoạn Khẩn Cấp (Đổ Chuông)',
        importance: AndroidImportance.HIGH,
        sound: 'content://settings/system/ringtone',
        vibration: true,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        bypassDnd: true,
        lights: true,
        lightColor: '#DC2626',
        visibility: AndroidVisibility.PUBLIC,
      });
    } catch (err) {
      console.warn('Lỗi khởi tạo Notifee channel:', err);
    }
  }

  // Kích hoạt cuộc gọi báo động hỏa hoạn (Pop-up CallStyle 2 nút Đỏ/Xanh + Full-Screen Call UI + Loop Ringtone)
  public async triggerFireEmergencyAlarm(payload: FireAlertPayload): Promise<void> {
    const normalizedPayload: FireAlertPayload = {
      title: payload.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
      body: payload.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!',
      deviceId: payload.deviceId || 'KHO-TONG-GSP',
      temp: payload.temp || 'N/A',
      isTest: Boolean(payload.isTest),
    };

    const now = Date.now();
    // Nếu 2 sự kiện kích hoạt trùng nhau trong vòng 1.5s khi còi đang kêu -> chỉ cập nhật payload, tránh gọi rung/notification đè
    if (this.isAlarmActive && now - this.lastTriggerAtMs < 1500) {
      this.currentPayload = normalizedPayload;
      this.notifyListeners(normalizedPayload);
      return;
    }

    this.isAlarmActive = true;
    this.currentCallState = 'RINGING';
    this.lastTriggerAtMs = now;
    this.currentPayload = normalizedPayload;
    this.notifyListeners(normalizedPayload);

    // Kích hoạt rung dồn dập phần cứng
    try {
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
    } catch (e) {
      console.warn('Vibration error:', e);
    }

    const notifee = getNotifee();
    if (!notifee) return;

    this.registerEventHandlers();

    const title = normalizedPayload.title!;
    const body = `Nhiệt độ ${normalizedPayload.temp}°C • Trạm ${normalizedPayload.deviceId}`;
    const notificationData = {
      type: 'FIRE_EMERGENCY',
      title,
      body: normalizedPayload.body!,
      deviceId: String(normalizedPayload.deviceId || ''),
      temp: String(normalizedPayload.temp || ''),
      isTest: String(Boolean(normalizedPayload.isTest)),
    };

    const baseAndroidConfig = {
      channelId: FIRE_CHANNEL_ID,
      lightUpScreen: true,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      loopSound: true, // Bật FLAG_INSISTENT để réo chuông liên tục không dứt như cuộc gọi đến
      sound: 'content://settings/system/ringtone',
      ongoing: true,
      autoCancel: false,
      color: '#DC2626',
      fullScreenAction: {
        id: 'default',
        launchActivity: 'default',
      },
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      // 2 actions tương ứng với NotificationCompat.CallStyle.forIncomingCall(caller, declineIntent, answerIntent)
      actions: [
        {
          title: 'TẮT CÒI',
          pressAction: {
            id: 'stop_alarm',
          },
        },
        {
          title: 'TIẾP NHẬN',
          pressAction: {
            id: 'answer_alarm',
            launchActivity: 'default',
          },
        },
      ],
    };

    try {
      await this.initChannels();

      // Hiển thị dạng Foreground Service + CallStyle.forIncomingCall
      try {
        await notifee.displayNotification({
          id: FIRE_NOTIFICATION_ID,
          title,
          subtitle: 'Kho Tổng GSP • ABC Pharmacy',
          body,
          data: notificationData,
          android: {
            ...baseAndroidConfig,
            asForegroundService: true,
          },
        });
      } catch (fgsErr) {
        // Fallback nếu Android 14+ hạn chế khởi chạy Foreground Service từ background
        console.warn('ForegroundService fallback to high-priority full-screen notification:', fgsErr);
        await notifee.displayNotification({
          id: FIRE_NOTIFICATION_ID,
          title,
          subtitle: 'Kho Tổng GSP • ABC Pharmacy',
          body,
          data: notificationData,
          android: {
            ...baseAndroidConfig,
            asForegroundService: false,
          },
        });
      }
    } catch (err) {
      console.warn('Lỗi hiển thị Notifee full-screen notification:', err);
    }
  }

  // Kiểm tra và mở trang cấp quyền Full-Screen Intent trên Android 14+ nếu hệ điều hành chưa cấp mặc định
  public async ensureFullScreenIntentPermission(): Promise<void> {
    const notifee = getNotifee();
    if (!notifee) return;
    try {
      if (typeof notifee.getNotificationSettings === 'function') {
        const settings = await notifee.getNotificationSettings();
        if (settings?.android?.fullScreenIntent === 0) {
          const { Linking } = require('react-native');
          if (Linking && typeof Linking.sendIntent === 'function') {
            await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT', [
              { key: 'android.provider.extra.APP_PACKAGE', value: 'com.abcpharmacy.mobile' },
            ]).catch(() => {});
          }
        }
      }
    } catch {
      // Bỏ qua trên thiết bị Android < 14 hoặc môi trường test
    }
  }

  // Kiểm tra khi app mới khởi động (từ trạng thái Killed qua Full-Screen Intent hoặc bấm thông báo)
  public async checkPendingEmergencyOnLaunch(): Promise<void> {
    const notifee = getNotifee();
    if (!notifee) return;

    // Nếu người dùng đã nghe máy (ANSWERED), không ghi đè lại trạng thái RINGING từ timer trễ
    if (this.isAlarmActive && this.currentCallState === 'ANSWERED') {
      return;
    }

    try {
      // 1. Kiểm tra notification khởi chạy app (Initial Notification)
      if (typeof notifee.getInitialNotification === 'function') {
        const initial = await notifee.getInitialNotification();
        const data = initial?.notification?.data;
        const pressId = initial?.pressAction?.id;
        if (data?.type === 'FIRE_EMERGENCY' || initial?.notification?.id === FIRE_NOTIFICATION_ID) {
          if (pressId === 'stop_alarm' || pressId === 'decline_alarm') {
            await this.stopAlarm();
            return;
          }
          const targetState: EmergencyCallState = pressId === 'answer_alarm' ? 'ANSWERED' : 'RINGING';
          this.restoreAlarmStateFromData(data, initial?.notification, targetState);
          if (targetState === 'ANSWERED') {
            await this.answerAlarm();
          }
          return;
        }
      }

      // 2. Kiểm tra danh sách thông báo đang hiển thị trên thanh trạng thái
      if (typeof notifee.getDisplayedNotifications === 'function') {
        const displayed = await notifee.getDisplayedNotifications();
        const activeFire = displayed?.find(
          (item: any) =>
            item?.id === FIRE_NOTIFICATION_ID || item?.notification?.data?.type === 'FIRE_EMERGENCY'
        );
        if (activeFire) {
          this.restoreAlarmStateFromData(activeFire?.notification?.data, activeFire?.notification, 'RINGING');
        }
      }
    } catch (err) {
      console.warn('checkPendingEmergencyOnLaunch warning:', err);
    }
  }

  private restoreAlarmStateFromData(
    data: any,
    notification?: any,
    callState: EmergencyCallState = 'RINGING'
  ): void {
    const payload: FireAlertPayload = {
      title: String(data?.title || notification?.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG'),
      body: String(data?.body || notification?.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!'),
      deviceId: String(data?.deviceId || 'KHO-TONG-GSP'),
      temp: String(data?.temp || 'N/A'),
      isTest: data?.isTest === 'true' || data?.isTest === true,
    };

    this.isAlarmActive = true;
    this.currentCallState = callState;
    this.currentPayload = payload;
    this.notifyListeners(payload);
  }

  // Nghe máy / Tiếp nhận cuộc gọi báo cháy: dừng còi hú và rung để Thủ kho đọc hướng dẫn xử lý sự cố
  public async answerAlarm(): Promise<void> {
    this.currentCallState = 'ANSWERED';
    if (this.currentPayload) {
      this.notifyListeners({ ...this.currentPayload });
    }

    try {
      Vibration.cancel();
    } catch (_) {}

    const notifee = getNotifee();
    if (!notifee) return;

    try {
      await notifee.stopForegroundService().catch(() => {});
      await notifee.cancelNotification(FIRE_NOTIFICATION_ID).catch(() => {});
      await notifee.cancelDisplayedNotification(FIRE_NOTIFICATION_ID).catch(() => {});
    } catch (err) {
      console.warn('Lỗi tắt chuông khi answerAlarm:', err);
    }
  }

  // Tắt còi báo động, dừng chuông réo, dừng rung, đóng màn hình cuộc gọi và giải phóng Foreground Service
  public async stopAlarm(): Promise<void> {
    this.isAlarmActive = false;
    this.currentCallState = 'RINGING';
    this.lastTriggerAtMs = 0;
    this.currentPayload = null;
    this.notifyListeners(null);

    try {
      Vibration.cancel();
    } catch (_) {}

    const notifee = getNotifee();
    if (!notifee) return;

    try {
      await notifee.stopForegroundService().catch(() => {});
      await notifee.cancelNotification(FIRE_NOTIFICATION_ID).catch(() => {});
      await notifee.cancelDisplayedNotification(FIRE_NOTIFICATION_ID).catch(() => {});
    } catch (err) {
      console.warn('Lỗi dừng Notifee alarm:', err);
    }
  }

  public getIsAlarmActive(): boolean {
    return this.isAlarmActive;
  }

  public getCallState(): EmergencyCallState {
    return this.currentCallState;
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
    if (this.handlersRegistered) return;
    const notifee = getNotifee();
    if (!notifee) return;

    this.handlersRegistered = true;

    try {
      // Giữ Foreground Service sống liên tục cho đến khi stopForegroundService được gọi
      notifee.registerForegroundService(() => {
        return new Promise(() => {});
      });

      // Xử lý tương tác khi app đang chạy foreground
      notifee.onForegroundEvent(({ type, detail }: any) => {
        const pressId = detail?.pressAction?.id;
        const isFireNotif =
          detail?.notification?.id === FIRE_NOTIFICATION_ID ||
          detail?.notification?.data?.type === 'FIRE_EMERGENCY';

        if (
          (type === EventType.ACTION_PRESS && (pressId === 'stop_alarm' || pressId === 'decline_alarm')) ||
          (type === EventType.DISMISSED && isFireNotif)
        ) {
          this.stopAlarm();
        } else if (type === EventType.ACTION_PRESS && pressId === 'answer_alarm') {
          this.restoreAlarmStateFromData(detail?.notification?.data, detail?.notification, 'ANSWERED');
          this.answerAlarm();
        } else if ((type === EventType.PRESS || type === EventType.DELIVERED) && isFireNotif) {
          this.restoreAlarmStateFromData(
            detail?.notification?.data,
            detail?.notification,
            this.currentCallState
          );
        }
      });

      // Xử lý tương tác trực tiếp từ thanh thông báo khi app chạy ngầm / đang tắt
      notifee.onBackgroundEvent(async ({ type, detail }: any) => {
        const pressId = detail?.pressAction?.id;
        const isFireNotif =
          detail?.notification?.id === FIRE_NOTIFICATION_ID ||
          detail?.notification?.data?.type === 'FIRE_EMERGENCY';

        if (
          (type === EventType.ACTION_PRESS && (pressId === 'stop_alarm' || pressId === 'decline_alarm')) ||
          (type === EventType.DISMISSED && isFireNotif)
        ) {
          await this.stopAlarm();
        } else if (type === EventType.ACTION_PRESS && pressId === 'answer_alarm') {
          this.restoreAlarmStateFromData(detail?.notification?.data, detail?.notification, 'ANSWERED');
          await this.answerAlarm();
        }
      });
    } catch (err) {
      console.warn('Không thể đăng ký Notifee event handler native:', err);
    }
  }
}

export const FireEmergencyNotifeeService = new FireEmergencyNotifeeManager();
export default FireEmergencyNotifeeService;
