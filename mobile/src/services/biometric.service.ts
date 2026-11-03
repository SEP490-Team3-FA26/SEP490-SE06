// biometric.service.ts - Dịch vụ Xác thực Sinh trắc học Phần cứng TEE (Hardware-backed Keystore / RSA 2048-bit FIDO2)
import ReactNativeBiometrics from 'react-native-biometrics';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ApiService } from './api.service';

const KEY_DEVICE_ID = 'abc_secure_device_id';
const KEY_BIOMETRIC_USER = 'abc_secure_biometric_user';
const KEY_BIOMETRIC_ENABLED = 'abc_biometric_enabled';

// Khởi tạo instance kết nối trực tiếp với Android Keystore / iOS Secure Enclave
const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

export interface BiometricSupportInfo {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType?: string;
  hasFingerprint: boolean;
  hasFacialRecognition: boolean;
}

export interface SavedBiometricUser {
  userIdentifier: string; // Email hoặc số điện thoại
  userName?: string;
  role?: string;
  deviceId?: string;
}

export class BiometricService {
  /**
   * Lấy hoặc tạo mới Device ID duy nhất định danh thiết bị
   */
  public static async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(KEY_DEVICE_ID);
      if (!deviceId) {
        deviceId = await AsyncStorage.getItem(KEY_DEVICE_ID);
      }
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        await SecureStore.setItemAsync(KEY_DEVICE_ID, deviceId);
        await AsyncStorage.setItem(KEY_DEVICE_ID, deviceId);
      }
      return deviceId;
    } catch {
      return 'dev_default_android';
    }
  }

  /**
   * Kiểm tra phần cứng thiết bị có hỗ trợ cảm biến sinh trắc học không
   */
  public static async checkHardwareSupport(): Promise<BiometricSupportInfo> {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return {
        hasHardware: available,
        isEnrolled: available,
        biometryType,
        hasFingerprint: available,
        hasFacialRecognition: available && biometryType === 'FaceID',
      };
    } catch (err) {
      console.warn('[BiometricService] Lỗi khi kiểm tra cảm biến sinh trắc học:', err);
      return {
        hasHardware: false,
        isEnrolled: false,
        hasFingerprint: false,
        hasFacialRecognition: false,
      };
    }
  }

  /**
   * Kiểm tra người dùng đã kích hoạt tính năng đăng nhập sinh trắc học phần cứng chưa
   */
  public static async isBiometricEnabled(userIdentifier?: string): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(KEY_BIOMETRIC_ENABLED);
      if (enabled !== 'true') return false;

      const userStr = await SecureStore.getItemAsync(KEY_BIOMETRIC_USER);
      if (!userStr) return false;

      const savedUser = JSON.parse(userStr) as SavedBiometricUser;
      if (userIdentifier) {
        const id1 = userIdentifier.trim().toLowerCase();
        const id2 = (savedUser.userIdentifier || '').trim().toLowerCase();
        if (id1 !== id2) return false;
      }

      // Xác minh sự tồn tại của khóa RSA trong Android Keystore TEE
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      return keysExist;
    } catch {
      return false;
    }
  }

  /**
   * Kích hoạt Sinh trắc học & Tạo cặp khóa RSA 2048-bit trực tiếp trong Android Keystore TEE
   * Private Key vĩnh viễn không bao giờ rời khỏi chip phần cứng an toàn
   */
  public static async enableBiometricsFido2(
    userData: SavedBiometricUser
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const cleanId = userData.userIdentifier.trim().toLowerCase();
      const deviceId = await this.getOrCreateDeviceId();

      // 1. Kiểm tra cảm biến phần cứng
      const support = await this.checkHardwareSupport();
      if (!support.hasHardware) {
        return { success: false, message: 'Thiết bị không hỗ trợ cảm biến sinh trắc học phần cứng' };
      }

      // 2. Làm sạch trạng thái khóa cũ trong Android Keystore
      await rnBiometrics.deleteKeys();

      // 3. Sinh cặp khóa RSA 2048-bit trong chip phần cứng an toàn (TEE / StrongBox)
      const { publicKey } = await rnBiometrics.createKeys();
      if (!publicKey) {
        return { success: false, message: 'Không thể sinh cặp khóa bảo mật phần cứng' };
      }

      // 4. Chuẩn hóa Khóa Công Khai (Public Key) sang định dạng PEM RFC 7468 (ngắt dòng mỗi 64 ký tự)
      const formattedBody = publicKey.replace(/(.{64})/g, '$1\n').trim();
      const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${formattedBody}\n-----END PUBLIC KEY-----`;

      // 5. Đăng ký Khóa Công Khai lên Backend API Gateway
      const deviceName = `${Platform.OS === 'android' ? 'Android' : 'iOS'} (${userData.userName || 'Thiết bị'}) [Hardware Keystore]`;
      await ApiService.registerBiometricDevice({
        deviceId,
        deviceName,
        publicKey: publicKeyPem,
      });

      // 6. Lưu metadata trạng thái kích hoạt (TUYỆT ĐỐI KHÔNG LƯU PRIVATE KEY)
      const savedData: SavedBiometricUser = {
        ...userData,
        userIdentifier: cleanId,
        deviceId,
      };
      await SecureStore.setItemAsync(KEY_BIOMETRIC_USER, JSON.stringify(savedData));
      await AsyncStorage.setItem(KEY_BIOMETRIC_ENABLED, 'true');

      return { success: true };
    } catch (err: any) {
      console.error('[BiometricService] Lỗi kích hoạt FIDO2 phần cứng:', err);
      return { success: false, message: err?.message || 'Không thể đăng ký thiết bị với máy chủ' };
    }
  }

  /**
   * Ký số lên Challenge Nonce bằng Chip Phần Cứng An Toàn (Nguyên tử 1 bước kèm BiometricPrompt)
   * Tự động mở popup vân tay hệ thống và tính toán chữ ký số RSA-SHA256 bên trong TEE
   */
  public static async signChallenge(
    challenge: string,
    promptMessage = 'Xác thực sinh trắc học để đăng nhập ABC Pharmacy'
  ): Promise<string> {
    const { keysExist } = await rnBiometrics.biometricKeysExist();
    if (!keysExist) {
      throw new Error('Không tìm thấy khóa bảo mật phần cứng trên thiết bị. Vui lòng đăng ký lại sinh trắc học.');
    }

    const { success, signature, error } = await rnBiometrics.createSignature({
      promptMessage,
      payload: challenge,
      cancelButtonText: 'Hủy',
    });

    if (!success || !signature) {
      if (error === 'User cancellation' || error === 'User canceled' || error?.includes('cancel')) {
        throw new Error('HỦY_BỎ');
      }
      throw new Error(error || 'Xác thực sinh trắc học thất bại');
    }

    return signature; // Chuỗi Base64 chữ ký RSA-SHA256 do chip TEE xuất ra
  }

  /**
   * Vô hiệu hóa và xóa khóa khỏi Android Keystore TEE và Backend
   */
  public static async disableBiometrics(userIdentifier?: string): Promise<void> {
    try {
      const deviceId = await this.getOrCreateDeviceId();

      // Xóa khóa bảo mật trong phần cứng Android Keystore
      await rnBiometrics.deleteKeys();

      // Báo máy chủ thu hồi thiết bị
      try {
        await ApiService.revokeBiometricDevice(deviceId);
      } catch (revokeErr) {
        console.warn('[BiometricService] Bỏ qua lỗi hủy thiết bị trên backend:', revokeErr);
      }

      await SecureStore.deleteItemAsync(KEY_BIOMETRIC_USER);
      await AsyncStorage.setItem(KEY_BIOMETRIC_ENABLED, 'false');
    } catch (err) {
      console.warn('[BiometricService] Lỗi khi xóa dữ liệu sinh trắc học:', err);
    }
  }

  /**
   * Lấy thông tin tài khoản đã kích hoạt sinh trắc học từ thiết bị
   */
  public static async getSavedBiometricCredentials(): Promise<{
    user: SavedBiometricUser | null;
  }> {
    try {
      const isEnabled = await AsyncStorage.getItem(KEY_BIOMETRIC_ENABLED);
      if (isEnabled !== 'true') {
        return { user: null };
      }

      const userStr = await SecureStore.getItemAsync(KEY_BIOMETRIC_USER);
      const user = userStr ? (JSON.parse(userStr) as SavedBiometricUser) : null;

      return { user };
    } catch {
      return { user: null };
    }
  }
}
