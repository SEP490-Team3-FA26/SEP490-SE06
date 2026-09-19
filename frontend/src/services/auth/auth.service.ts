import api from '../core/api';
import { notifyAuthTokenChanged } from '../../utils/authEvents';

const PENDING_EMAIL_KEY = "pendingVerificationEmail";
const SESSION_COOKIE_KEY = "abc_session_active";

// Enforce browser-session lifecycle:
// If the browser was completely closed and reopened, session cookies are discarded by the browser.
// We detect this and automatically purge stale localStorage authentication.
function enforceBrowserSession(): void {
  try {
    const hasToken = !!localStorage.getItem("token");
    if (hasToken) {
      const hasCookie = document.cookie.split(";").some((item) => item.trim().startsWith(`${SESSION_COOKIE_KEY}=`));
      if (!hasCookie) {
        // Browser was closed and restarted -> clear session
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        localStorage.removeItem("branchId");
        localStorage.removeItem("branchName");
      }
    }
  } catch (err) {
    console.warn("Session check error:", err);
  }
}

// Run check on script initialization
enforceBrowserSession();

export const authService = {
  getPendingEmail(): string {
    return localStorage.getItem(PENDING_EMAIL_KEY) || "";
  },

  setPendingEmail(email: string): void {
    localStorage.setItem(PENDING_EMAIL_KEY, email);
  },

  clearPendingEmail(): void {
    localStorage.removeItem(PENDING_EMAIL_KEY);
  },

  getCurrentUser(): any {
    try {
      enforceBrowserSession();
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setSession(token: string, user: any): void {
    // Set a session cookie without expires/max-age (browser deletes it when closed)
    document.cookie = `${SESSION_COOKIE_KEY}=1; path=/; SameSite=Lax`;

    localStorage.setItem("token", token);
    localStorage.setItem("userRole", user?.role || "user");
    localStorage.setItem("user", JSON.stringify(user || {}));
    if (user?.branchId) {
      localStorage.setItem("branchId", user.branchId);
    }
    if (user?.branchName) {
      localStorage.setItem("branchName", user.branchName);
    }
    notifyAuthTokenChanged();
  },

  clearSession(): void {
    // Expire the session cookie immediately
    document.cookie = `${SESSION_COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("user");
    localStorage.removeItem("branchId");
    localStorage.removeItem("branchName");
    notifyAuthTokenChanged();
  },

  async login(email: string, password: string) {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const data = response.data;
      if (data?.access_token && data?.user) {
        this.setSession(data.access_token, data.user);
      }
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.';
      throw new Error(msg);
    }
  },

  async register(fullName: string, email: string, password: string) {
    try {
      const response = await api.post('/api/auth/register', { fullName, email, password, role: 'user' });
      const data = response.data;
      if (data?.access_token && data?.user) {
        this.setSession(data.access_token, data.user);
      }
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      throw new Error(msg);
    }
  },

  async logout() {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Lỗi khi gọi API logout:', err);
    } finally {
      this.clearSession();
    }
  },

  async getProfile() {
    try {
      const response = await api.get('/api/auth/profile');
      if (response.data) {
        localStorage.setItem("user", JSON.stringify(response.data));
      }
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể lấy thông tin người dùng';
      throw new Error(msg);
    }
  },

  async verifyEmail(email: string, token: string) {
    try {
      const response = await api.post('/api/auth/verify-email', { email, token });
      this.clearPendingEmail();
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Xác thực tài khoản thất bại';
      throw new Error(msg);
    }
  },

  async resendVerification(email: string) {
    try {
      const response = await api.post('/api/auth/resend-verification', { email });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể gửi lại mã OTP';
      throw new Error(msg);
    }
  },

  async forgotPassword(email: string) {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu';
      throw new Error(msg);
    }
  },

  async resetPassword(email: string, token: string, newPassword: string) {
    try {
      const response = await api.post('/api/auth/reset-password', { email, token, newPassword });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đặt lại mật khẩu thất bại';
      throw new Error(msg);
    }
  }
};
