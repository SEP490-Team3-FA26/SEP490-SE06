/**
 * env.service.spec.ts - Bộ Kiểm Thử Đơn Vị cho EnvService Mobile
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Cấu hình URL chuẩn VPS https://abcpharmacy.store, biến EXPO_PUBLIC_* hợp lệ.
 * 2. [Boundary Values]: Biến môi trường rỗng, undefined, chế độ Web, chế độ Android Emulator, fallback mặc định.
 * 3. [Abnormal Values]: URL Railway (chặn đứng mọi tên miền *.railway.app), IP VPS HTTP cũ, localhost trong bản Release.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

// Khai báo biến toàn cục môi trường React Native
declare let __DEV__: boolean;

// Khởi tạo mock cho react-native và expo-constants trước khi import service
const mockPlatform = {
  OS: 'android',
  constants: {},
};

const mockConstants = {
  expoConfig: { hostUri: undefined as string | undefined },
  manifest: { debuggerHost: undefined as string | undefined },
  isDevice: true,
};

const mockNativeModules = {
  SourceCode: { scriptURL: undefined as string | undefined },
};

jest.mock('react-native', () => ({
  Platform: mockPlatform,
  NativeModules: mockNativeModules,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: mockConstants,
}));

import { EnvService } from '../../src/services/env.service';

describe('EnvService - Cấu hình Môi trường & Chặn URL Railway/Cũ', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.API_URL;
    delete process.env.EXPO_PUBLIC_AI_URL;
    delete process.env.AI_URL;
    (globalThis as any).__DEV__ = true;
    mockPlatform.OS = 'android';
    mockPlatform.constants = {};
    mockConstants.isDevice = true;
    mockConstants.expoConfig.hostUri = undefined;
    mockNativeModules.SourceCode.scriptURL = undefined;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng chuẩn - Đọc URL hợp lệ từ biến môi trường
  // =========================================================================
  describe('[Normal Values] - Cấu hình URL hợp lệ chuẩn VPS', () => {
    it('1.1. Trả về đúng domain VPS chính thức https://abcpharmacy.store khi cấu hình EXPO_PUBLIC_API_URL', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://abcpharmacy.store';

      const apiUrl = EnvService.getApiBaseUrl();
      expect(apiUrl).toBe('https://abcpharmacy.store');
    });

    it('1.2. Trả về đúng domain VPS chính thức https://abcpharmacy.store khi cấu hình EXPO_PUBLIC_AI_URL', () => {
      process.env.EXPO_PUBLIC_AI_URL = 'https://abcpharmacy.store';

      const aiUrl = EnvService.getAiBaseUrl();
      expect(aiUrl).toBe('https://abcpharmacy.store');
    });

    it('1.3. Đọc biến môi trường tùy chỉnh qua hàm get(key) thành công', () => {
      process.env.EXPO_PUBLIC_CUSTOM_KEY = 'test_value_123';

      const result = EnvService.get('CUSTOM_KEY');
      expect(result).toBe('test_value_123');
    });

    it('1.4. Trả về fallback VPS khi gọi getAlternateApiUrl trong môi trường remote', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://abcpharmacy.store';

      const altUrl = EnvService.getAlternateApiUrl();
      expect(altUrl).toBe('https://abcpharmacy.store');
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên, rỗng, không xác định, chuyển đổi môi trường
  // =========================================================================
  describe('[Boundary Values] - Biên rỗng, Web local, Android Emulator', () => {
    it('2.1. Tự động fallback về VPS https://abcpharmacy.store khi không có bất kỳ biến env nào', () => {
      const apiUrl = EnvService.getApiBaseUrl();
      const aiUrl = EnvService.getAiBaseUrl();

      expect(apiUrl).toBe('https://abcpharmacy.store');
      expect(aiUrl).toBe('https://abcpharmacy.store');
    });

    it('2.2. Trả về giá trị mặc định defaultValue khi key env không tồn tại', () => {
      const val = EnvService.get('NON_EXISTENT_KEY', 'default_fallback');
      expect(val).toBe('default_fallback');
    });

    it('2.3. Hỗ trợ nền tảng Web: trả về localhost:4000 và localhost:8000 khi env rỗng', () => {
      mockPlatform.OS = 'web';

      const apiUrl = EnvService.getApiBaseUrl();
      const aiUrl = EnvService.getAiBaseUrl();

      expect(apiUrl).toBe('http://localhost:4000');
      expect(aiUrl).toBe('http://localhost:8000');
    });

    it('2.4. Hỗ trợ máy ảo Android Emulator: trả về IP 10.0.2.2 khi phát hiện emulator', () => {
      mockPlatform.OS = 'android';
      mockConstants.isDevice = false; // Máy ảo

      const apiUrl = EnvService.getApiBaseUrl();
      const aiUrl = EnvService.getAiBaseUrl();

      expect(apiUrl).toBe('http://10.0.2.2:4000');
      expect(aiUrl).toBe('http://10.0.2.2:8000');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, chặn URL Railway và IP HTTP cũ
  // =========================================================================
  describe('[Abnormal Values] - Tự động loại bỏ Railway & chuẩn hóa sang VPS', () => {
    it('3.1. Chặn đứng URL Railway https://ai-service-v1-production.up.railway.app và chuyển về VPS', () => {
      process.env.EXPO_PUBLIC_AI_URL = 'https://ai-service-v1-production.up.railway.app';

      const aiUrl = EnvService.getAiBaseUrl();
      expect(aiUrl).toBe('https://abcpharmacy.store');
      expect(aiUrl).not.toContain('railway');
    });

    it('3.2. Chặn đứng bất kỳ domain *.railway.app nào trong EXPO_PUBLIC_API_URL', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://gateway-production.up.railway.app';

      const apiUrl = EnvService.getApiBaseUrl();
      expect(apiUrl).toBe('https://abcpharmacy.store');
      expect(apiUrl).not.toContain('railway');
    });

    it('3.3. Tự động chuyển đổi IP VPS HTTP cũ 103.75.187.86 sang HTTPS abcpharmacy.store để tránh Cleartext block', () => {
      process.env.EXPO_PUBLIC_API_URL = 'http://103.75.187.86:4000';
      process.env.EXPO_PUBLIC_AI_URL = 'http://103.75.187.86:8000';

      const apiUrl = EnvService.getApiBaseUrl();
      const aiUrl = EnvService.getAiBaseUrl();

      expect(apiUrl).toBe('https://abcpharmacy.store');
      expect(aiUrl).toBe('https://abcpharmacy.store');
    });

    it('3.4. Chốt chặn an toàn Production (!__DEV__): Chặn tuyệt đối localhost và chuyển về VPS', () => {
      (globalThis as any).__DEV__ = false; // Chế độ Release / Production
      process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000';
      process.env.EXPO_PUBLIC_AI_URL = 'http://127.0.0.1:8000';

      const apiUrl = EnvService.getApiBaseUrl();
      const aiUrl = EnvService.getAiBaseUrl();

      expect(apiUrl).toBe('https://abcpharmacy.store');
      expect(aiUrl).toBe('https://abcpharmacy.store');
    });

    it('3.5. Chốt chặn an toàn Production (!__DEV__): Chặn Railway trong Release build và chuyển về VPS', () => {
      (globalThis as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_AI_URL = 'https://ai-service-v1-production.up.railway.app';

      const aiUrl = EnvService.getAiBaseUrl();
      expect(aiUrl).toBe('https://abcpharmacy.store');
    });
  });
});
