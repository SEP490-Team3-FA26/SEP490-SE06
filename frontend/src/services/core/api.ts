import axios from 'axios';
import { notifyAuthTokenChanged } from '../../utils/authEvents';

import { API_ENDPOINTS } from '../../constants/apiEndpoints';

const api = axios.create({
  // @ts-ignore
  baseURL: import.meta.env.VITE_API_URL || '', // Resolves to backend URL in prod, or relative in dev
});

// Automatically inject JWT Token and Client Session ID to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Đính kèm x-client-session-id để Gateway định danh phiên làm việc phục vụ xác nhận Điều khoản AI & Audit Trail
    let sessionId = localStorage.getItem('abc_client_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      try {
        localStorage.setItem('abc_client_session_id', sessionId);
      } catch (_) {}
    }
    config.headers['x-client-session-id'] = sessionId;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRequest = error.config?.url?.includes(API_ENDPOINTS.AUTH.LOGIN) || error.config?.url?.includes(API_ENDPOINTS.AUTH.REGISTER);
      const isPublicPath = typeof window !== 'undefined' && (
        window.location.pathname === '/' ||
        window.location.pathname.startsWith('/auth/') ||
        window.location.pathname.startsWith('/login')
      );

      // Only perform auto-logout if it's NOT an auth attempt and NOT on a public page
      if (!isAuthRequest && !isPublicPath) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        localStorage.removeItem('branchId');
        localStorage.removeItem('branchName');
        notifyAuthTokenChanged();
        window.location.href = '/auth/login?sessionExpired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
