// env.service.ts - Environment Configuration for React Native
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

class EnvServiceClass {
  private config: Record<string, string> = {
    API_URL: 'http://10.0.15.26:4000',
    AI_URL: 'http://10.0.15.26:8000',
    INTERNAL_TOKEN: 'wdp301-super-secret-key-change-in-production',
  };

  private detectedHostIp: string = '';

  constructor() {
    this.detectHost();
  }

  private detectHost(): void {
    try {
      // 1. Try Expo Constants hostUri (e.g. 10.0.15.26:8081)
      const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost;
      if (hostUri) {
        const host = hostUri.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          this.detectedHostIp = host;
          console.log(`📡 [EnvService] Nhận diện IP máy chủ từ Expo hostUri: ${host}`);
          return;
        }
      }
    } catch (_) {}

    try {
      // 2. On real devices running Expo Go, Metro bundler loads from host PC's Wi-Fi LAN IP
      const scriptURL = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL) {
        const address = scriptURL.split('://')[1]?.split('/')[0];
        const host = address?.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          this.detectedHostIp = host;
          console.log(`📡 [EnvService] Nhận diện IP máy tính chủ từ Metro scriptURL: ${host}`);
          return;
        }
      }
    } catch (_) {}

    if (!this.detectedHostIp) {
      this.detectedHostIp = '10.0.15.26';
    }
  }

  public get(key: string, defaultValue?: string): string {
    return this.config[key] || defaultValue || '';
  }

  public set(key: string, value: string): void {
    this.config[key] = value;
  }

  public getHostIp(): string {
    if (!this.detectedHostIp) {
      this.detectHost();
    }
    return this.detectedHostIp || '10.0.15.26';
  }

  public getApiBaseUrl(): string {
    if (Platform.OS === 'web') {
      return 'http://localhost:4000';
    }
    const host = this.getHostIp();
    if (Platform.OS === 'android' && host === 'localhost') {
      return 'http://10.0.2.2:4000';
    }
    return `http://${host}:4000`;
  }

  public getAiBaseUrl(): string {
    if (Platform.OS === 'web') {
      return 'http://localhost:8000';
    }
    const host = this.getHostIp();
    if (Platform.OS === 'android' && host === 'localhost') {
      return 'http://10.0.2.2:8000';
    }
    return `http://${host}:8000`;
  }
}

export const EnvService = new EnvServiceClass();
