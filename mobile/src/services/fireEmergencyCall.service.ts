// fireEmergencyCall.service.ts - Helper cảnh báo hỏa hoạn
export interface EmergencyCallParams {
  temp?: string;
  deviceId?: string;
  isTest?: boolean;
}

export class FireEmergencyCallService {
  public static init(_onAnswered?: () => void) {
    // No-op
  }

  public static showEmergencyCall(_params: EmergencyCallParams) {
    // No-op
  }

  public static stopEmergencyCall() {
    // No-op
  }
}
