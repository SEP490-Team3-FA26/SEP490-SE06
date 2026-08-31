import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI } from '../services/authApiService';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export type UserRoleMobile = 'guest' | 'user' | 'customer' | 'organizer' | 'staff' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleMobile;
  avatar?: string | null;
}

type AuthState = {
  role: UserRoleMobile;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextValue = {
  auth: AuthState;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string }>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  verifyResetCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token + user từ AsyncStorage, validate với backend
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const userDataStr = await AsyncStorage.getItem(USER_DATA_KEY);

      if (token) {
        try {
          // Luôn fetch profile mới nhất từ server khi khởi tạo
          const userResponse = await AuthAPI.getMe(token);
          
          const backendRole = (userResponse.role as UserRoleMobile) || 'customer';
          const mappedRole: UserRoleMobile = backendRole === 'customer' ? 'user' : backendRole;

          const updatedUserData: User = {
            id: userResponse._id || userResponse.id,
            email: userResponse.email,
            firstName: userResponse.firstName,
            lastName: userResponse.lastName,
            role: mappedRole,
            avatar: userResponse.avatar,
          };

          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUserData));
          setUser(updatedUserData);
        } catch {
          // Nếu token hết hạn hoặc lỗi, fall back về data local nếu có, hoặc logout
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            setUser(userData);
          } else {
            await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
            setUser(null);
          }
        }
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

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[AuthContext] login() called with email:', email);

      const response = await AuthAPI.login({ email, password });

      console.log('[AuthContext] login() success, response:', response);

      // Map backend role -> mobile role used for navigation
      const backendRole = response.user.role as UserRoleMobile;
      const mappedRole: UserRoleMobile =
        backendRole === 'customer' ? 'user' : backendRole;

      // Save token and user data
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
      
      const userData: User = {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        role: mappedRole,
      };

      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      setUser(userData);

      return true;
    } catch (err: any) {
      console.error('[AuthContext] login() failed:', err);
      setError(err.message || 'Đăng nhập thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; requiresVerification?: boolean; email?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await AuthAPI.register({ firstName, lastName, email, password });

      return {
        success: true,
        requiresVerification: response.requiresEmailVerification,
        email: response.email,
      };
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await AuthAPI.verifyEmail({ email, code });
      return true;
    } catch (err: any) {
      setError(err.message || 'Xác thực email thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await AuthAPI.resendVerification(email);
      return true;
    } catch (err: any) {
      setError(err.message || 'Gửi lại mã thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await AuthAPI.forgotPassword({ email });
      return true;
    } catch (err: any) {
      setError(err.message || 'Yêu cầu đặt lại mật khẩu thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyResetCode = useCallback(async (email: string, code: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await AuthAPI.verifyResetCode({ email, code });
      return true;
    } catch (err: any) {
      setError(err.message || 'Mã xác thực không hợp lệ');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await AuthAPI.resetPassword({ email, code, newPassword });
      return true;
    } catch (err: any) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      setUser(null);

      try {
        await AuthAPI.logout();
      } catch (err) {
        // bỏ qua lỗi logout API, vì token đã xoá local
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      const userResponse = await AuthAPI.getMe(token);
      
      const backendRole = (userResponse.role as UserRoleMobile) || 'customer';
      const mappedRole: UserRoleMobile = backendRole === 'customer' ? 'user' : backendRole;

      const updatedUserData: User = {
        id: userResponse._id || userResponse.id,
        email: userResponse.email,
        firstName: userResponse.firstName,
        lastName: userResponse.lastName,
        role: mappedRole,
        avatar: userResponse.avatar,
      };

      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUserData));
      setUser(updatedUserData);
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  }, []);

  const authState: AuthState = useMemo(() => ({
    role: user?.role || 'guest',
    user,
    isAuthenticated: user !== null,
    isLoading,
  }), [user, isLoading]);

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
      verifyResetCode,
      resetPassword,
      logout,
      refreshUser,
      clearError,
    }),
    [authState, user, isLoading, error, login, register, verifyEmail, resendVerification, forgotPassword, verifyResetCode, resetPassword, logout, refreshUser, clearError]
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
