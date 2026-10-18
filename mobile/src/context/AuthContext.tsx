// AuthContext.tsx - Complete Authentication State Management for Pharma ERP Mobile
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ApiService } from '../services/api.service';
import { authApiService } from '../services/authApiService';
import { SocketService } from '../services/socket.service';
import { BiometricService, SavedBiometricUser } from '../services/biometric.service';
import { UserRole, UserProfile } from '../types/pharmacy.types';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const PUSH_TOKEN_KEY = 'device_push_token';

const syncPushTokenToServer = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }

    let token = '';
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = typeof deviceToken.data === 'string' ? deviceToken.data : String(deviceToken.data);
    } catch {
      const expoToken = await Notifications.getExpoPushTokenAsync();
      token = expoToken.data;
    }

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await ApiService.registerDeviceToken(token, Platform.OS);
    }
  } catch (err) {
    console.warn('Sync push token warning:', err);
  }
};

const unregisterPushTokenFromServer = async () => {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await ApiService.unregisterDeviceToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (err) {
    console.warn('Unregister push token warning:', err);
  }
};

export type UserRoleMobile =
  | 'admin'
  | 'headBranch'
  | 'director'
  | 'warehouse'
  | 'branch'
  | 'pharmacist'
  | 'customer'
  | 'user'
  | 'guest';

type AuthState = {
  role: UserRoleMobile;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextValue = {
  auth: AuthState;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Sinh trắc học (Android BiometricPrompt)
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  savedBiometricUser: SavedBiometricUser | null;
  checkBiometricState: () => Promise<void>;
  toggleBiometrics: (enable: boolean) => Promise<{ success: boolean; message?: string }>;
  loginWithBiometrics: () => Promise<{ success: boolean; user?: UserProfile; role?: string; message?: string }>;

  // Actions
  login: (emailOrPhone: string, password: string) => Promise<{ success: boolean; user?: UserProfile; role?: string; message?: string }>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    gender?: string;
  }) => Promise<{ success: boolean; requiresEmailVerification?: boolean; message?: string }>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  verifyResetCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (email: string, otp: string, newPass: string) => Promise<boolean>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái Sinh trắc học (Android BiometricPrompt & Keystore)
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);
  const [savedBiometricUser, setSavedBiometricUser] = useState<SavedBiometricUser | null>(null);

  const checkBiometricState = useCallback(async () => {
    try {
      const support = await BiometricService.checkHardwareSupport();
      setIsBiometricSupported(support.hasHardware && support.isEnrolled);

      const enabled = await BiometricService.isBiometricEnabled();
      setIsBiometricEnabled(enabled);

      if (enabled) {
        const { user: savedUser } = await BiometricService.getSavedBiometricCredentials();
        setSavedBiometricUser(savedUser);
      } else {
        setSavedBiometricUser(null);
      }
    } catch (err) {
      console.warn('[AuthContext] Lỗi kiểm tra trạng thái sinh trắc học:', err);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      await ApiService.initToken();
      const token = ApiService.getToken();
      const cachedUserStr = await AsyncStorage.getItem(USER_DATA_KEY);

      if (token) {
        SocketService.initSocket(token);
        try {
          const profile = await ApiService.getProfile(token);
          if (profile) {
            setUser(profile);
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(profile));
          } else if (cachedUserStr) {
            setUser(JSON.parse(cachedUserStr));
          }
        } catch {
          if (cachedUserStr) {
            setUser(JSON.parse(cachedUserStr));
          } else {
            await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
            ApiService.setToken('');
            setUser(null);
          }
        }
      } else if (cachedUserStr) {
        setUser(JSON.parse(cachedUserStr));
      }

      // Khởi tạo kiểm tra phần cứng và trạng thái sinh trắc học
      await checkBiometricState();
    } catch (err) {
      console.error('Error initializing auth:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [checkBiometricState]);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await ApiService.login(emailOrPhone, password);

      const token = res.accessToken || res.token;
      if (!token) {
        throw new Error(res.message || 'Đăng nhập không thành công');
      }

      ApiService.setToken(token);
      SocketService.initSocket(token);

      const userProfile: UserProfile = res.user || {
        id: res.id || res._id || 'user_1',
        name: res.name || emailOrPhone.split('@')[0],
        email: emailOrPhone.includes('@') ? emailOrPhone : (res.email || ''),
        phone: !emailOrPhone.includes('@') ? emailOrPhone : (res.phone || ''),
        role: res.role || UserRole.CUSTOMER,
        branchId: res.branchId,
        branchName: res.branchName,
      };

      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userProfile));
      setUser(userProfile);
      void syncPushTokenToServer();

      // Cập nhật trạng thái sinh trắc học sau khi đăng nhập
      try {
        void checkBiometricState();
      } catch (bioErr) {
        console.warn('[AuthContext] Lỗi kiểm tra sinh trắc học:', bioErr);
      }

      return {
        success: true,
        user: userProfile,
        role: userProfile.role,
      };
    } catch (err: any) {
      const msg = err.message || 'Đăng nhập thất bại';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, [checkBiometricState]);

  const register = useCallback(async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    gender?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiService.register(data);
      return {
        success: res.success !== false,
        requiresEmailVerification: res.requiresEmailVerification ?? true,
        message: res.message,
      };
    } catch (err: any) {
      const msg = err.message || 'Đăng ký thất bại';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiService.verifyEmail(email, code);
      return res.success !== false;
    } catch (err: any) {
      setError(err.message || 'Xác thực thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      const res = await ApiService.resendVerification(email);
      return res.success !== false;
    } catch {
      return false;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiService.forgotPassword(email);
      return res.success !== false;
    } catch (err: any) {
      setError(err.message || 'Gửi mã xác nhận thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyResetCode = useCallback(async (email: string, code: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await authApiService.verifyResetCode({ email, code });
      return !!res;
    } catch (err: any) {
      setError(err.message || 'Mã xác thực không hợp lệ');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string, otp: string, newPass: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiService.resetPassword({ email, otp, newPassword: newPass });
      if (res.success !== false) {
        // Hủy bỏ token sinh trắc học cũ trong Keystore vì mật khẩu tài khoản đã thay đổi
        await BiometricService.disableBiometrics();
        await checkBiometricState();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkBiometricState]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    try {
      const res = await ApiService.updateProfile(data);
      if (res) {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const toggleBiometrics = useCallback(
    async (enable: boolean): Promise<{ success: boolean; message?: string }> => {
      try {
        if (!enable) {
          const id = user?.email || user?.phone || savedBiometricUser?.userIdentifier;
          await BiometricService.disableBiometrics(id);
          setIsBiometricEnabled(false);
          setSavedBiometricUser(null);
          return { success: true };
        }

        const support = await BiometricService.checkHardwareSupport();
        if (!support.hasHardware) {
          return { success: false, message: 'Thiết bị không hỗ trợ phần cứng sinh trắc học' };
        }
        if (!support.isEnrolled) {
          return {
            success: false,
            message: 'Vui lòng cài đặt bảo mật vân tay hoặc khuôn mặt trên thiết bị Android trước',
          };
        }

        let currentUser = user;
        if (!currentUser) {
          const cachedUserStr = await AsyncStorage.getItem(USER_DATA_KEY);
          if (cachedUserStr) {
            try {
              currentUser = JSON.parse(cachedUserStr);
            } catch {}
          }
        }

        if (!currentUser) {
          return { success: false, message: 'Vui lòng đăng nhập trước khi kích hoạt sinh trắc học' };
        }

        // Đăng ký cặp khóa RSA 2048-bit trực tiếp trong Android Keystore TEE và gửi Public Key lên Server
        const currentIdentifier = currentUser.email || currentUser.phone || 'Tài khoản';
        const res = await BiometricService.enableBiometricsFido2({
          userIdentifier: currentIdentifier,
          userName: currentUser.name,
          role: currentUser.role,
        });

        if (res.success) {
          setIsBiometricEnabled(true);
          setSavedBiometricUser({
            userIdentifier: currentIdentifier,
            userName: currentUser.name,
            role: currentUser.role,
          });
          return { success: true };
        }

        return { success: false, message: res.message || 'Không thể đăng ký khóa với máy chủ' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Lỗi thiết lập sinh trắc học' };
      }
    },
    [user, savedBiometricUser]
  );

  const loginWithBiometrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const isBioActive = await BiometricService.isBiometricEnabled();
      if (!isBioActive) {
        return { success: false, message: 'Chưa kích hoạt sinh trắc học trên thiết bị này' };
      }

      const { user: savedUser } = await BiometricService.getSavedBiometricCredentials();
      if (!savedUser || !savedUser.userIdentifier) {
        return { success: false, message: 'Không tìm thấy thông tin tài khoản đã liên kết sinh trắc học' };
      }

      const deviceId = await BiometricService.getOrCreateDeviceId();

      // BƯỚC 1: Lấy Challenge Nonce (thời hạn 60s) từ Backend Gateway & Redis
      let challengeRes: any;
      try {
        challengeRes = await ApiService.getBiometricChallenge(savedUser.userIdentifier, deviceId);
      } catch (chalErr: any) {
        return {
          success: false,
          message: chalErr?.message || 'Không thể lấy mã thử thách xác thực từ máy chủ',
        };
      }

      // BƯỚC 2: Ký số nguyên tử 1 bước (BiometricPrompt mở TEE và ký SHA256withRSA)
      const promptTitle = savedUser?.userName
        ? `Đăng nhập cho ${savedUser.userName}`
        : 'Xác thực sinh trắc học cho ABC Pharmacy';

      let signature = '';
      try {
        signature = await BiometricService.signChallenge(challengeRes.challenge, promptTitle);
      } catch (signErr: any) {
        if (signErr?.message === 'HỦY_BỎ') {
          return { success: false, message: 'Đã hủy xác thực sinh trắc học' };
        }
        return {
          success: false,
          message: signErr?.message || 'Xác thực sinh trắc học thất bại',
        };
      }

      // BƯỚC 3: Gửi chữ ký số về Backend Gateway để kiểm tra với Public Key và cấp JWT Token
      let verifyRes: any;
      try {
        verifyRes = await ApiService.verifyBiometricSignature({
          emailOrPhone: savedUser.userIdentifier,
          deviceId,
          challenge: challengeRes.challenge,
          signature,
        });
      } catch (verifyErr: any) {
        return {
          success: false,
          message: verifyErr?.message || 'Chữ ký sinh trắc học không hợp lệ',
        };
      }

      const token = verifyRes.token || verifyRes.accessToken || verifyRes.access_token;
      if (!token) {
        return {
          success: false,
          message: 'Không nhận được mã phiên đăng nhập từ máy chủ',
        };
      }

      const userProfile: UserProfile = verifyRes.user || {
        id: verifyRes.id || verifyRes._id || 'user_1',
        name: verifyRes.fullName || verifyRes.name || savedUser.userName || 'Người dùng',
        email: savedUser.userIdentifier.includes('@') ? savedUser.userIdentifier : '',
        phone: !savedUser.userIdentifier.includes('@') ? savedUser.userIdentifier : '',
        role: verifyRes.role || savedUser.role || UserRole.CUSTOMER,
        branchId: verifyRes.branchId,
        branchName: verifyRes.branchName,
      };

      // Đăng nhập thành công
      ApiService.setToken(token);
      SocketService.initSocket(token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userProfile));
      setUser(userProfile);
      void syncPushTokenToServer();

      return {
        success: true,
        user: userProfile,
        role: userProfile.role,
      };
    } catch (err: any) {
      const msg = err?.message || 'Đăng nhập sinh trắc học thất bại';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, [checkBiometricState]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await unregisterPushTokenFromServer();
      SocketService.disconnect();
      ApiService.setToken('');
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await ApiService.getProfile();
      if (profile) {
        setUser(profile);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(profile));
      }
    } catch (err) {
      console.error('Error refreshing user profile:', err);
    }
  }, []);

  const authState: AuthState = useMemo(() => {
    const role = (user?.role as UserRoleMobile) || 'guest';
    return {
      role,
      user,
      isAuthenticated: user !== null,
      isLoading,
    };
  }, [user, isLoading]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth: authState,
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      isBiometricSupported,
      isBiometricEnabled,
      savedBiometricUser,
      checkBiometricState,
      toggleBiometrics,
      loginWithBiometrics,
      login,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
      verifyResetCode,
      resetPassword,
      updateProfile,
      logout,
      refreshUser,
      clearError,
    }),
    [
      authState,
      user,
      isLoading,
      error,
      isBiometricSupported,
      isBiometricEnabled,
      savedBiometricUser,
      checkBiometricState,
      toggleBiometrics,
      loginWithBiometrics,
      login,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
      verifyResetCode,
      resetPassword,
      updateProfile,
      logout,
      refreshUser,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
