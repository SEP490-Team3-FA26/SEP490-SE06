// env.service.ts - Environment Configuration for React Native
import { Platform } from 'react-native';

class EnvServiceClass {
  private config: Record<string, string> = {
    API_URL: 'http://localhost:4000',
    AI_URL: 'http://localhost:8000',
    INTERNAL_TOKEN: 'wdp301-super-secret-key-change-in-production',
  };

  public get(key: string, defaultValue?: string): string {
    return this.config[key] || defaultValue || '';
  }

  public set(key: string, value: string): void {
    this.config[key] = value;
  }

  public getApiBaseUrl(): string {
    const raw = this.config.API_URL || 'http://localhost:4000';
    if (Platform.OS === 'android') {
      return raw.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return raw;
  }

  public getAiBaseUrl(): string {
    const raw = this.config.AI_URL || 'http://localhost:8000';
    if (Platform.OS === 'android') {
      return raw.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return raw;
  }
}

export const EnvService = new EnvServiceClass();
