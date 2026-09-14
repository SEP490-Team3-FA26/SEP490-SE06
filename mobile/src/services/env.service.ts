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

    // Ưu tiên 1: IP tự detect từ Metro (đổi wifi vẫn chạy tự động)
    const detectedHost = this.getHostIp();
    if (detectedHost) {
      return `http://${detectedHost}:4000`;
    }

    // Ưu tiên 2: đọc từ EXPO_PUBLIC_API_URL trong .env
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
      if (Platform.OS === 'android' && envUrl.includes('localhost')) {
        return envUrl.replace('localhost', '10.0.2.2');
      }
      return envUrl;
    }

    // Ưu tiên 3: Android emulator mặc định
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4000';
    }

    return 'http://localhost:4000';
  }

  public getAiBaseUrl(): string {
    if (Platform.OS === 'web') {
      return process.env.EXPO_PUBLIC_AI_URL || 'http://localhost:8000';
    }

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

  // Đọc biến env tùy ý (EXPO_PUBLIC_*)
  public get(key: string, defaultValue?: string): string {
    return (process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? defaultValue) || '';
  }
}

export const EnvService = new EnvServiceClass();
