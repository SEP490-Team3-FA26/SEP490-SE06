// env.service.ts - Environment Configuration for React Native
// Ưu tiên đọc từ EXPO_PUBLIC_* env vars (.env) → auto-detect IP từ Metro → fallback localhost
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

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
          console.log(`📡 [EnvService] Detected host from Expo hostUri: ${host}`);
          return;
        }
      }
    } catch (_) {}

    try {
      // 2. Đọc từ Metro scriptURL (hoạt động trên Expo Go thiết bị thật)
      const scriptURL = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL) {
        const address = scriptURL.split('://')[1]?.split('/')[0];
        const host = address?.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          this.detectedHostIp = host;
          console.log(`📡 [EnvService] Detected host from Metro scriptURL: ${host}`);
          return;
        }
      }
    } catch (_) {}

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

  public getApiBaseUrl(): string {
    if (Platform.OS === 'web') {
      return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
    }

    // Ưu tiên 1: Nếu là Android Emulator → luôn dùng 10.0.2.2 để kết nối trực tiếp vào host PC
    if (this.isAndroidEmulator()) {
      return 'http://10.0.2.2:4000';
    }

    // Ưu tiên 2: IP tự detect từ Metro (thiết bị thật qua Wi-Fi)
    const detectedHost = this.getHostIp();
    if (detectedHost) {
      return `http://${detectedHost}:4000`;
    }

    // Ưu tiên 3: đọc từ EXPO_PUBLIC_API_URL trong .env
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
      if (Platform.OS === 'android' && envUrl.includes('localhost')) {
        return envUrl.replace('localhost', '10.0.2.2');
      }
      return envUrl;
    }

    // Ưu tiên 4: Android emulator mặc định
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4000';
    }

    return 'http://localhost:4000';
  }

  public getAiBaseUrl(): string {
    if (Platform.OS === 'web') {
      return process.env.EXPO_PUBLIC_AI_URL || 'http://localhost:8000';
    }

    // Ưu tiên 1: Android Emulator → 10.0.2.2
    if (this.isAndroidEmulator()) {
      return 'http://10.0.2.2:8000';
    }

    // Ưu tiên 2: Thiết bị thật qua IP Metro
    const detectedHost = this.getHostIp();
    if (detectedHost) {
      return `http://${detectedHost}:8000`;
    }

    const envUrl = process.env.EXPO_PUBLIC_AI_URL;
    if (envUrl) {
      if (Platform.OS === 'android' && envUrl.includes('localhost')) {
        return envUrl.replace('localhost', '10.0.2.2');
      }
      return envUrl;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }

    return 'http://localhost:8000';
  }

  // Cung cấp URL dự phòng khi gặp lỗi kết nối mạng (10.0.2.2 <-> LAN IP)
  public getAlternateApiUrl(): string {
    if (Platform.OS === 'android') {
      const current = this.getApiBaseUrl();
      if (current.includes('10.0.2.2')) {
        const host = this.getHostIp();
        return host ? `http://${host}:4000` : 'http://127.0.0.1:4000';
      } else {
        return 'http://10.0.2.2:4000';
      }
    }
    return '';
  }

  // Đọc biến env tùy ý (EXPO_PUBLIC_*)
  public get(key: string, defaultValue?: string): string {
    return (process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? defaultValue) || '';
  }
}

export const EnvService = new EnvServiceClass();
