/**
 * Bộ Cấu Hình Màu Sắc Tailwind Độc Lập Cho Ứng Dụng WDP301 Mobile (CommonJS)
 * Phục vụ trực tiếp cho tailwind.config.js & NativeWind
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

module.exports = {
  // ─── 1. Thang Màu Cơ Bản (Base Palettes) ───
  sky: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },
  emerald: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  rose: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // ─── 2. Nhóm Màu Theo Phân Hệ Role (Role Presets - Đồng Bộ Xanh Auth) ───
  // Sử dụng: bg-customer-primary, text-customer-primary, bg-customer-surface, border-customer-border
  customer: {
    DEFAULT: '#0284C7',
    primary: '#0284C7',
    dark: '#0369A1',
    light: '#0EA5E9',
    surface: '#F0F9FF',
    card: '#FFFFFF',
    border: '#BAE6FD',
    active: '#7DD3FC',
    text: '#0C4A6E',
    subtext: '#64748B',
    badge: '#E0F2FE',
    badgeText: '#0369A1',
    accent: '#38BDF8',
  },
  // Sử dụng: bg-pharmacist-primary, text-pharmacist-primary (Đồng bộ Xanh Auth)
  pharmacist: {
    DEFAULT: '#0284C7',
    primary: '#0284C7',
    dark: '#075985',
    light: '#38BDF8',
    surface: '#F0F9FF',
    card: '#FFFFFF',
    border: '#BAE6FD',
    text: '#0C4A6E',
    badge: '#E0F2FE',
    badgeText: '#0369A1',
  },
  // Sử dụng: bg-warehouse-primary, text-warehouse-primary (Đồng bộ Xanh Auth)
  warehouse: {
    DEFAULT: '#0369A1',
    primary: '#0369A1',
    dark: '#0C4A6E',
    light: '#0EA5E9',
    surface: '#F0F9FF',
    card: '#FFFFFF',
    border: '#BAE6FD',
    text: '#0C4A6E',
    badge: '#E0F2FE',
    badgeText: '#0369A1',
  },
  // Sử dụng: bg-admin-primary, text-admin-primary
  admin: {
    DEFAULT: '#075985',
    primary: '#075985',
    dark: '#0C4A6E',
    light: '#0284C7',
    surface: '#F0F9FF',
    card: '#FFFFFF',
    border: '#BAE6FD',
    text: '#0F172A',
    badge: '#E0F2FE',
    badgeText: '#0369A1',
  },

  // ─── 3. Nhóm Màu Ngữ Nghĩa Y Tế (Medical Clinical Tokens) ───
  // Sử dụng: bg-medical-rx, text-medical-rx, bg-medical-allergy, text-medical-allergy
  medical: {
    rx: {
      DEFAULT: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      badge: '#FEF3C7',
    },
    otc: {
      DEFAULT: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      text: '#075985',
      badge: '#E0F2FE',
    },
    allergy: {
      DEFAULT: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
      badge: '#FEE2E2',
    },
    contraindication: {
      DEFAULT: '#9333EA',
      bg: '#FAF5FF',
      border: '#E9D5FF',
      text: '#6B21A8',
    },
    cold: {
      DEFAULT: '#0891B2',
      bg: '#ECFEFF',
      border: '#A5F3FC',
      text: '#155E75',
    },
    nearExpiry: {
      DEFAULT: '#F59E0B',
      bg: '#FFFBEB',
      border: '#FCD34D',
      text: '#78350F',
    },
  },

  // ─── 4. Nhóm Trạng Thái Ngữ Nghĩa (Status Tokens) ───
  // Sử dụng: bg-status-success, text-status-danger
  status: {
    success: {
      DEFAULT: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      text: '#0369A1',
    },
    warning: {
      DEFAULT: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
    },
    danger: {
      DEFAULT: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
    },
    info: {
      DEFAULT: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      text: '#075985',
    },
  },
};
