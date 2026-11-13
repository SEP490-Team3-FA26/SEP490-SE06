// env.service.ts - Environment Configuration for React Native
// Ưu tiên đọc từ EXPO_PUBLIC_* env vars (.env) → auto-detect IP từ Metro → fallback localhost
import { NativeModules, Platform } from 'react-native';

// Fallback an toàn cho expo-constants khi chạy trong test runner hoặc môi trường không cài trực tiếp
let Constants: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Constants = require('expo-constants')?.default || require('expo-constants') || {};
} catch {
  Constants = {};
}

class EnvServiceClass {
  private detectedHostIp: string = '';

  constructor() {
    this.detectHost();
  }

  // Tự nhận diện IP máy chủ dev từ Expo/Metro để hỗ trợ mọi wifi, mọi máy
  private detectHost(): void {
    try {
      // 1. Đọc từ Expo Constants hostUri (e.g. "10.0.x.x:8081")
      const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any)?.manifest?.debuggerHost;
      if (hostUri) {
        const host = hostUri.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          this.detectedHostIp = host;
          return;
        }
      }
    } catch (_) { }

    try {
      // 2. Đọc từ Metro scriptURL (hoạt động trên Expo Go thiết bị thật)
      const scriptURL = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL) {
        const address = scriptURL.split('://')[1]?.split('/')[0];
        const host = address?.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          this.detectedHostIp = host;
          return;
        }
      }
    } catch (_) { }

    // 3. Không detect được → để trống, getApiBaseUrl/getAiBaseUrl sẽ dùng .env
    this.detectedHostIp = '';
  }

  public isAndroidEmulator(): boolean {
    if (Platform.OS !== 'android') return false;
    // 1. Check Expo Constants isDevice property
    if (Constants.isDevice === false) return true;

    // 2. Check React Native Platform constants
    const c = Platform.constants as any;
    if (
      c?.Brand?.toLowerCase() === 'google' ||
      c?.Manufacturer?.toLowerCase() === 'google' ||
      c?.Fingerprint?.includes('generic') ||
      c?.Fingerprint?.includes('sdk_gphone') ||
      c?.Model?.toLowerCase().includes('sdk') ||
      c?.Model?.toLowerCase().includes('emulator') ||
      c?.Product?.toLowerCase().includes('sdk')
    ) {
      return true;
    }
    return false;
  }

  public getHostIp(): string {
    if (!this.detectedHostIp) {
      this.detectHost();
    }
    return this.detectedHostIp;
  }

  // Bí danh tương thích ngược an toàn để tránh lỗi undefined is not a function
  public getApiUrl(): string {
    return this.getApiBaseUrl();
  }

  public getApiBaseUrl(): string {
    const envUrl = (process.env.EXPO_PUBLIC_API_URL || process.env.API_URL)?.trim();
    const allowUsbLocalhost = process.env.EXPO_PUBLIC_ALLOW_LOCALHOST_USB === 'true';

    // 1. Tự động chuyển đổi nếu env cũ trỏ vào HTTP thô của VPS hoặc Railway (tránh Android Cleartext block và loại bỏ Railway)
    if (envUrl && (envUrl.includes('103.75.187.86:4000') || envUrl.includes('railway.app') || envUrl.includes('railway'))) {
      return 'https://abcpharmacy.store';
    }

    // 2. Chốt chặn an toàn Production: Bản Release (!__DEV__) không bao giờ được trỏ vào localhost hoặc Railway (trừ khi bật cờ USB adb reverse)
    if (!__DEV__ && !allowUsbLocalhost && (envUrl?.includes('localhost') || envUrl?.includes('127.0.0.1') || envUrl?.includes('railway'))) {
      return 'https://abcpharmacy.store';
    }

    // 3. Ưu tiên số 1: Tên miền HTTPS hoặc URL từ xa cụ thể (hoặc localhost khi bật cờ USB)
    if (envUrl && (allowUsbLocalhost || (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')))) {
      return envUrl;
    }

    // 4. Chế độ Web Local
    if (Platform.OS === 'web') {
      return envUrl || 'http://localhost:4000';
    }

    // 5. Chế độ Android Emulator Local
    if (this.isAndroidEmulator()) {
      return 'http://10.0.2.2:4000';
    }

    // 6. Chế độ Điện thoại thật qua Expo Go Wi-Fi Local (Auto-detect IP máy tính từ Metro)
    const detectedHost = this.getHostIp();
    if (detectedHost) {
      return `http://${detectedHost}:4000`;
    }

    // 7. Mặc định Production Cloud Server nếu không tìm thấy máy chủ dev LAN
    return 'https://abcpharmacy.store';
  }

  public getAiBaseUrl(): string {
    const envUrl = (process.env.EXPO_PUBLIC_AI_URL || process.env.AI_URL)?.trim();
    const allowUsbLocalhost = process.env.EXPO_PUBLIC_ALLOW_LOCALHOST_USB === 'true';

    // 1. Loại bỏ URL Railway hoặc IP VPS HTTP cũ, chuyển hướng sang VPS chuẩn HTTPS
    if (envUrl && (envUrl.includes('103.75.187.86') || envUrl.includes('railway.app') || envUrl.includes('railway'))) {
      return 'https://abcpharmacy.store';
    }

    // 2. Chốt chặn an toàn Production: Bản Release (!__DEV__) không bao giờ được trỏ vào localhost hoặc Railway (trừ khi bật cờ USB adb reverse)
    if (!__DEV__ && !allowUsbLocalhost && (envUrl?.includes('localhost') || envUrl?.includes('127.0.0.1') || envUrl?.includes('railway'))) {
      return 'https://abcpharmacy.store';
    }

    // 3. Ưu tiên số 1: Tên miền HTTPS hoặc URL từ xa cụ thể (hoặc localhost khi bật cờ USB)
    if (envUrl && (allowUsbLocalhost || (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')))) {
      return envUrl;
    }

    // 4. Chế độ Web Local
    if (Platform.OS === 'web') {
      return envUrl || 'http://localhost:8000';
    }

    // 5. Chế độ Android Emulator Local
    if (this.isAndroidEmulator()) {
      return 'http://10.0.2.2:8000';
    }

    // 6. Chế độ Điện thoại thật qua Expo Go Wi-Fi Local (Auto-detect IP máy tính từ Metro)
    const detectedHost = this.getHostIp();
    if (detectedHost) {
      return `http://${detectedHost}:8000`;
    }

    // 7. Mặc định Production Cloud Server nếu không tìm thấy máy chủ dev LAN
    return 'https://abcpharmacy.store';
  }

  // Cung cấp URL dự phòng khi gặp lỗi kết nối mạng
  public getAlternateApiUrl(): string {
    const current = this.getApiBaseUrl();
    if (current.includes('localhost') || current.includes('127.0.0.1')) {
      // Khi debug localhost: nếu localhost qua adb reverse gặp sự cố, thử fallback 10.0.2.2 (máy ảo Android)
      return current.includes('10.0.2.2') ? 'http://localhost:4000' : 'http://10.0.2.2:4000';
    }
    return 'https://abcpharmacy.store';
  }

  // Đọc biến env tùy ý (EXPO_PUBLIC_*)
  public get(key: string, defaultValue?: string): string {
    return (process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? defaultValue) || '';
  }
}

export const EnvService = new EnvServiceClass();
