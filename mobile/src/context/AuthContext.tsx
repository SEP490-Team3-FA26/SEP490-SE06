// AuthContext.tsx - Complete Authentication State Management for Pharma ERP Mobile
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/api.service';
import { SocketService } from '../services/socket.service';
import { UserRole, UserProfile } from '../types/pharmacy.types';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

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
    } catch (err) {
      console.error('Error initializing auth:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, []);

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

  const resetPassword = useCallback(async (email: string, otp: string, newPass: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiService.resetPassword({ email, otp, newPassword: newPass });
      return res.success !== false;
    } catch (err: any) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
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
      login,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
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
      login,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
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
