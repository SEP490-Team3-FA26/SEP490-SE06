// fireEmergencyNotifee.service.ts - Dịch vụ cảnh báo khẩn cấp hỏa hoạn In-App chuẩn Rule 6
// Tuân thủ Quy tắc Bất biến: Không sử dụng thông báo ngoài hệ điều hành / Google FCM
// Kích hoạt rung phần cứng, hiển thị Full-Screen Modal khẩn cấp trên màn hình
import { Platform, Vibration } from 'react-native';

export interface FireAlertPayload {
  title?: string;
  body?: string;
  deviceId?: string;
  temp?: string;
  isTest?: boolean;
}

class FireEmergencyManager {
  private isAlarmActive: boolean = false;
  private alertListeners: Set<(payload: FireAlertPayload | null) => void> = new Set();
  private currentPayload: FireAlertPayload | null = null;

  // Khởi tạo các kênh (No-op để tương thích API cũ)
  public async initChannels(): Promise<void> {
    return Promise.resolve();
  }

  // Kích hoạt còi báo động hỏa hoạn In-App (Full-Screen Modal + Rung dồn dập)
  public async triggerFireEmergencyAlarm(payload: FireAlertPayload): Promise<void> {
    if (this.isAlarmActive) {
      this.currentPayload = payload;
      this.notifyListeners(payload);
      return;
    }

    this.isAlarmActive = true;
    this.currentPayload = payload;
    this.notifyListeners(payload);

    // Kích hoạt rung dồn dập cảnh báo khẩn cấp
    try {
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
    } catch (e) {
      console.warn('Vibration error:', e);
    }
  }

  // Tắt còi báo động và dừng rung
  public async stopAlarm(): Promise<void> {
    this.isAlarmActive = false;
    this.currentPayload = null;
    this.notifyListeners(null);

    try {
      Vibration.cancel();
    } catch (_) {}
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
}

export const FireEmergencyNotifeeService = new FireEmergencyManager();
export default FireEmergencyNotifeeService;
