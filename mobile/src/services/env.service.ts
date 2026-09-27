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

    // 1. Tự động chuyển đổi nếu env cũ trỏ vào HTTP thô của VPS (tránh Android Cleartext block)
    if (envUrl && envUrl.includes('103.75.187.86:4000')) {
      return 'https://abcpharmacy.store';
    }

    // 2. Ưu tiên số 1: Tên miền HTTPS hoặc URL từ xa
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    // 3. Chế độ Web Local
    if (Platform.OS === 'web') {
      return envUrl || 'https://abcpharmacy.store';
    }

    // 4. Mặc định Production Cloud Server
    return 'https://abcpharmacy.store';
  }

  public getAiBaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_AI_URL?.trim();

    if (envUrl && envUrl.includes('103.75.187.86')) {
      return 'https://abcpharmacy.store';
    }

    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    return 'https://abcpharmacy.store';
  }

  // Cung cấp URL dự phòng khi gặp lỗi kết nối mạng (luôn dùng HTTPS an toàn)
  public getAlternateApiUrl(): string {
    return 'https://abcpharmacy.store';
  }

  // Đọc biến env tùy ý (EXPO_PUBLIC_*)
  public get(key: string, defaultValue?: string): string {
    return (process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? defaultValue) || '';
  }
}

export const EnvService = new EnvServiceClass();
