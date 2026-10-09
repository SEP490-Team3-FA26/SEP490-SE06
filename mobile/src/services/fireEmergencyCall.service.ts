// fireEmergencyCall.service.ts - Quản lý cuộc gọi báo động hỏa hoạn native bằng RNCallKeep
import { Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';

export interface EmergencyCallParams {
  temp?: string;
  deviceId?: string;
  isTest?: boolean;
}

export class FireEmergencyCallService {
  private static isInitialized = false;
  private static activeCallUUID: string | null = null;

  public static async init() {
    if (this.isInitialized || Platform.OS !== 'android') return;
    this.isInitialized = true;

    try {
      await RNCallKeep.setup({
        ios: {
          appName: 'VinaPharmacy',
          supportsVideo: false,
        },
        android: {
          alertTitle: 'Cấp quyền cuộc gọi báo động',
          alertDescription: 'Ứng dụng cần quyền quản lý cuộc gọi để kích hoạt báo động hỏa hoạn khi phát hiện sự cố khẩn cấp',
          cancelButton: 'Hủy',
          okButton: 'Đồng ý',
          imageName: 'icon',
          additionalPermissions: [],
          selfManaged: false,
          foregroundService: {
            channelId: 'fire_emergency_siren_v6',
            channelName: 'Báo Động Hỏa Hoạn Khẩn Cấp',
            notificationTitle: 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
            notificationIcon: 'icon',
          },
        },
      });

      RNCallKeep.registerPhoneAccount({
        ios: { appName: 'VinaPharmacy' },
        android: {
          alertTitle: 'Cấp quyền cuộc gọi báo động',
          alertDescription: 'Ứng dụng cần quyền quản lý cuộc gọi để kích hoạt báo động hỏa hoạn khi phát hiện sự cố khẩn cấp',
          cancelButton: 'Hủy',
          okButton: 'Đồng ý',
          additionalPermissions: [],
        },
      });

      RNCallKeep.registerAndroidEvents();

      RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
        console.log('[FireCall] Thủ kho đã bấm TIẾP NHẬN SỰ CỐ:', callUUID);
        this.stopEmergencyCall();
        RNCallKeep.backToForeground();
      });

      RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
        console.log('[FireCall] Thủ kho đã bấm TẮT BÁO ĐỘNG:', callUUID);
        this.stopEmergencyCall();
      });

      console.log('[FireCall] CallKeep đã khởi tạo thành công');
    } catch (err) {
      console.warn('[FireCall] Lỗi khởi tạo CallKeep:', err);
    }
  }

  public static showEmergencyCall(params: EmergencyCallParams) {
    if (Platform.OS !== 'android') return;

    try {
      const callUUID = `fire-${Date.now()}`;
      this.activeCallUUID = callUUID;
      const title = params.isTest
        ? 'BÁO ĐỘNG HỎA HOẠN (TEST)'
        : 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG';
      const handle = `Nhiệt độ ${params.temp || '65.0'}°C | Trạm ${params.deviceId || 'Kho Tổng GSP'}`;

      RNCallKeep.displayIncomingCall(
        callUUID,
        handle,
        title,
        'generic',
        false
      );
      console.log('[FireCall] Đã kích hoạt cuộc gọi khẩn cấp:', callUUID);
    } catch (err) {
      console.warn('[FireCall] Lỗi hiển thị cuộc gọi khẩn cấp:', err);
    }
  }

  public static stopEmergencyCall() {
    if (this.activeCallUUID && Platform.OS === 'android') {
      try {
        RNCallKeep.endCall(this.activeCallUUID);
      } catch (err) {
        console.warn('[FireCall] Lỗi dừng cuộc gọi:', err);
      }
      this.activeCallUUID = null;
    }
  }
}
