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
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

    // 1. Ưu tiên số 1: Nếu cấu hình Server từ xa (VD: http://103.75.187.86:4000 hoặc domain https://...)
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    // 2. Chế độ Web Local
    if (Platform.OS === 'web') {
      return envUrl || 'http://localhost:4000';
    }

    // 3. Chế độ Android Emulator Local
    if (this.isAndroidEmulator()) {
      return 'http://10.0.2.2:4000';
    }

    // 4. Chế độ Điện thoại thật qua Wi-Fi Local (Auto-detect IP máy tính từ Metro)
    const detectedHost = this.getHostIp();
    if (detectedHost) {
      return `http://${detectedHost}:4000`;
    }

    if (envUrl) {
      if (Platform.OS === 'android' && envUrl.includes('localhost')) {
        return envUrl.replace('localhost', '10.0.2.2');
      }
      return envUrl;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4000';
    }

    return 'http://localhost:4000';
  }

  public getAiBaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_AI_URL?.trim();

    // 1. Ưu tiên số 1: Nếu cấu hình AI Server từ xa (VD: http://103.75.187.86:8000)
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    // 2. Chế độ Web Local
    if (Platform.OS === 'web') {
      return envUrl || 'http://localhost:8000';
    }

    // 3. Chế độ Android Emulator Local
    if (this.isAndroidEmulator()) {
      return 'http://10.0.2.2:8000';
    }

    // 4. Chế độ Điện thoại thật qua Wi-Fi Local
    const detectedHost = this.getHostIp();
    if (detectedHost) {
      return `http://${detectedHost}:8000`;
    }

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
