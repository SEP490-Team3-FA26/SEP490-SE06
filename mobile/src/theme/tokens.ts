// tokens.ts - Centralized Design Tokens & Reanimated Motion Physics for ABC Pharmacy Mobile
import { Easing } from 'react-native-reanimated';

// ─── 1. Motion Tokens & Physics Constants (Chuẩn iOS Apple Design System) ──────
export const MotionTokens = {
  // Easing Curves: Chuẩn iOS CoreAnimation / Apple CSS Standard
  // cubic-bezier(0.25, 0.1, 0.25, 1.0) là đường cong kinh điển của Apple (mượt đầu, êm đuôi, không giật sốc)
  timingOpen: {
    duration: 280,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  },
  timingClose: {
    duration: 220,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  },

  // Spring Physics Chuẩn iPhone (UIKit / SwiftUI Interactive Spring)
  // Critically Damped: Không nảy lố, trượt êm tự nhiên theo quán tính
  snappySpring: {
    stiffness: 240,
    damping: 28,
    mass: 1,
    overshootClamping: true,
  },

  // Phản hồi nút bấm chạm nhả kiểu iOS
  buttonSpring: {
    stiffness: 350,
    damping: 26,
    mass: 0.8,
  },

  // Drawer & Bottom Sheet Kéo Thả Chuẩn iOS (Smooth Inertial Slide)
  sheetSpring: {
    stiffness: 220,
    damping: 28,
    mass: 1,
    overshootClamping: true,
  },

  // Staggering tối giản, mượt mà
  stagger: {
    maxItems: 6,
    delayPerItem: 25,
  },

  // Tỷ lệ scale xúc giác nhẹ nhàng
  scale: {
    enterStart: 0.98,
    pressed: 0.97,
    default: 1.0,
  },
};

// ─── 2. Color Palette (Material 3 Medical Swiss Clinical) ────────────────────
export const ColorTokens = {
  // Emerald Primary: Tông ngọc bích y tế
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669', // Primary Brand
    700: '#047857',
    800: '#065F46',
    900: '#064E3B', // Dark Forest
  },

  // Clinical Slate: Tông xám y khoa sang trọng, tương phản cao
  slate: {
    50: '#F8FAFC',  // App Background
    100: '#F1F5F9', // Card Background Nhạt
    200: '#E2E8F0', // Border 1px
    300: '#CBD5E1',
    400: '#94A3B8', // Placeholder / Inactive
    500: '#64748B', // Subtext
    600: '#475569',
    700: '#334155', // Body Text
    800: '#1E293B',
    900: '#0F172A', // Title / Heading Text
  },

  // Sky / Medical Light Blue: Tông xanh dương nhạt chuẩn y tế hiện đại (Pharmacity, Long Châu, An Khang)
  sky: {
    50: '#F0F9FF',  // App Background siêu sáng
    100: '#E0F2FE', // Pill tag / badge / card nhẹ
    200: '#BAE6FD', // Viền thẻ nhạt
    300: '#7DD3FC', // Viền active
    400: '#38BDF8', // Xanh dương tươi sáng
    500: '#0EA5E9', // Xanh dương chủ đạo nút bấm
    600: '#0284C7', // Xanh dương thương hiệu chuẩn Y Tế
    700: '#0369A1', // Xanh dương đậm tiêu đề
    800: '#075985',
    900: '#0C4A6E',
  },

  // Semantic Alerts: Cảnh báo dược học & trạng thái
  semantic: {
    danger: '#DC2626',      // Hết hạn / Khẩn cấp / Cấm bán
    dangerBg: '#FEF2F2',
    dangerBorder: '#FECACA',
    warning: '#D97706',     // Cảnh báo GPP / Tồn thấp / Cận date
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    info: '#0284C7',        // Ca trực / Điểm danh / Hướng dẫn
    infoBg: '#F0F9FF',
    infoBorder: '#BAE6FD',
    success: '#059669',     // Còn hàng / Đã điểm danh / Đã duyệt
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
  },

  // Bề mặt & Nền
  surface: {
    card: '#FFFFFF',
    background: '#F0F9FF',
    overlay: 'rgba(15, 23, 42, 0.45)', // Backdrop mờ
    border: '#E0F2FE',
    divider: '#F1F5F9',
  },
};

// ─── 3. Typography Tokens (Chuẩn y khoa với Tabular Monospace) ───────────────
export const TypographyTokens = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  // Phông số thẳng hàng không giật layout khi số tiền thay đổi
  tabularNums: {
    fontVariant: ['tabular-nums'] as any,
  },
};

// ─── 4. Spacing & Radius Tokens (Hệ thống lưới 4px) ──────────────────────────
export const SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const RadiusTokens = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
};

// ─── 5. Shadows Chuẩn Medical (Mảnh, không lem) ──────────────────────────────
export const ShadowTokens = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
};
