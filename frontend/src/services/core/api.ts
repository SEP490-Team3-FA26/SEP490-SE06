import axios from 'axios';
import { notifyAuthTokenChanged } from '../../utils/authEvents';

const api = axios.create({
  // @ts-ignore
  baseURL: import.meta.env.VITE_API_URL || '', // Resolves to backend URL in prod, or relative in dev
});

// Automatically inject JWT Token to requests if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
      const isAuthRequest = error.config?.url?.includes('/api/auth/login') || error.config?.url?.includes('/api/auth/register');
      const isPublicPath = typeof window !== 'undefined' && (
        window.location.pathname === '/' ||
        window.location.pathname.startsWith('/auth/') ||
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/interactions')
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
