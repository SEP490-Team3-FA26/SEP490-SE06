// fireEmergencyCall.service.ts - Quản lý cuộc gọi toàn màn hình báo động hỏa hoạn
import { Platform } from 'react-native';
import RNNotificationCall from 'react-native-full-screen-notification-incoming-call';

export interface EmergencyCallParams {
  temp?: string;
  deviceId?: string;
  isTest?: boolean;
}

export class FireEmergencyCallService {
  private static isInitialized = false;

  public static init(onAnswered?: () => void) {
    if (this.isInitialized || Platform.OS !== 'android') return;
    this.isInitialized = true;

    try {
      RNNotificationCall.addEventListener('answer', () => {
        console.log('[FireCall] Thủ kho đã bấm TIẾP NHẬN SỰ CỐ');
        RNNotificationCall.backToApp();
        RNNotificationCall.hideNotification();
        if (onAnswered) onAnswered();
      });

      RNNotificationCall.addEventListener('endCall', () => {
        console.log('[FireCall] Thủ kho đã bấm TẮT BÁO ĐỘNG');
        RNNotificationCall.hideNotification();
      });
    } catch (err) {
      console.warn('[FireCall] Lỗi khởi tạo event listener:', err);
    }
  }

  public static showEmergencyCall(params: EmergencyCallParams) {
    if (Platform.OS !== 'android') return;

    try {
      const callUuid = `fire_${Date.now()}`;
      const title = params.isTest
        ? 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG (TEST)'
        : 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG';
      const body = `Nhiệt độ kho ${params.temp || '65.0'}°C vượt ngưỡng nguy cấp! Trạm: ${params.deviceId || 'Kho Tổng GSP'}`;

      RNNotificationCall.displayNotification(
        callUuid,
        null,
        60000, // Đổ chuông 60 giây
        {
          channelId: 'fire_emergency_call_v4',
          channelName: 'Báo Động Hỏa Hoạn (Cuộc Gọi)',
          notificationIcon: 'ic_launcher',
          notificationTitle: title,
          notificationBody: body,
          answerText: 'TIẾP NHẬN SỰ CỐ',
          declineText: 'TẮT BÁO ĐỘNG',
          notificationColor: '#DC2626',
          notificationSound: 'alarm_gentle',
        }
      );
    } catch (err) {
      console.warn('[FireCall] Lỗi hiển thị full screen call:', err);
    }
  }

  public static stopEmergencyCall() {
    if (Platform.OS === 'android') {
      try {
        RNNotificationCall.hideNotification();
      } catch (err) {
        console.warn('[FireCall] Lỗi dừng call:', err);
      }
    }
  }
}
