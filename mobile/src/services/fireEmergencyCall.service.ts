// fireEmergencyCall.service.ts - Helper an toàn cảnh báo hỏa hoạn
import { Vibration, Platform } from 'react-native';

export interface EmergencyCallParams {
  temp?: string;
  deviceId?: string;
  isTest?: boolean;
}

export class FireEmergencyCallService {
  private static isAlarming = false;

  public static init() {
    // No-op
  }

  public static showEmergencyCall(_params: EmergencyCallParams) {
    if (Platform.OS === 'android' && !this.isAlarming) {
      this.isAlarming = true;
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
    }
  }

  public static stopEmergencyCall() {
    if (this.isAlarming) {
      this.isAlarming = false;
      Vibration.cancel();
    }
  }
}
