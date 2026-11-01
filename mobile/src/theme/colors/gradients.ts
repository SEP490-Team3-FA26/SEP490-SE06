/**
 * Bộ Sưu Tập Dải Chuyển Màu Chuẩn Nhận Diện (Brand Gradients System)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import { palette } from './palette';

export const gradients = {
  // ─── Headers & Banners Theo Phân Hệ ───
  // Header Khách hàng (Ocean Sky Blue Gradient)
  customerHeader: [palette.sky[700], palette.sky[600], palette.sky[500]] as const, // ['#0369A1', '#0284C7', '#0EA5E9']

  // Header Dược sĩ (Medical Emerald Gradient)
  pharmacistHeader: [palette.emerald[800], palette.emerald[600], palette.emerald[500]] as const, // ['#065F46', '#059669', '#10B981']

  // Header Thủ kho (Industrial Indigo Gradient)
  warehouseHeader: [palette.indigo[800], palette.indigo[600], palette.indigo[500]] as const, // ['#3730A3', '#4F46E5', '#6366F1']

  // Nút AI Floating Center & Tư Vấn
  aiAssistant: [palette.sky[600], palette.sky[400]] as const, // ['#0284C7', '#38BDF8']

  // ─── Thẻ Hội Viên ABC Pharmacy Club (Loyalty VIP Card Tiers) ───
  loyaltyBronze: [palette.sky[800], palette.sky[600], palette.sky[500]] as const,   // ['#075985', '#0284C7', '#0EA5E9']
  loyaltySilver: [palette.slate[700], palette.slate[600], palette.slate[500]] as const, // ['#334155', '#475569', '#64748B']
  loyaltyGold: [palette.amber[900], palette.amber[700], palette.amber[500]] as const,   // ['#78350F', '#B45309', '#D97706']
  loyaltyDiamond: ['#1E1B4B', '#4338CA', palette.sky[600]] as const, // Tím chàm pha xanh biển kim cương

  // Nút bấm & Điểm nhấn đặc biệt
  primaryAction: [palette.sky[600], palette.sky[500]] as const,
  dangerAction: [palette.rose[600], palette.rose[500]] as const,
  successAction: [palette.emerald[600], palette.emerald[500]] as const,
};

