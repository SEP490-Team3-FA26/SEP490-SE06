/**
 * Bảng màu Ngữ Nghĩa Y Tế & Cảnh Báo Dược Học (Medical & Clinical Semantic Tokens)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import { palette } from './palette';

export const medical = {
  // ─── 1. Thuốc Kê Đơn (Rx - Prescription Only) ───
  // Bắt buộc có đơn bác sĩ, kiểm soát nghiêm ngặt theo quy định Bộ Y Tế
  rx: {
    main: palette.amber[600],       // #D97706
    bg: palette.amber[50],          // #FFFBEB
    border: palette.amber[200],     // #FDE68A
    text: palette.amber[800],       // #92400E
    badgeBg: palette.amber[100],    // #FEF3C7
  },

  // ─── 2. Thuốc Không Kê Đơn (OTC - Over The Counter) ───
  // Bán tự do, an toàn điều trị triệu chứng thông thường
  otc: {
    main: palette.sky[600],         // #0284C7
    bg: palette.sky[50],            // #F0F9FF
    border: palette.sky[200],       // #BAE6FD
    text: palette.sky[800],         // #075985
    badgeBg: palette.sky[100],      // #E0F2FE
  },

  // ─── 3. Cảnh Báo Dị Ứng Thuốc (Allergy Clinical Alert) ───
  // Cảnh báo đỏ khẩn cấp khi người bệnh dị ứng hoạt chất (Penicillin, NSAIDs...)
  allergy: {
    main: palette.rose[600],        // #DC2626
    bg: palette.rose[50],           // #FEF2F2
    border: palette.rose[200],      // #FECACA
    text: palette.rose[800],        // #991B1B
    badgeBg: palette.rose[100],     // #FEE2E2
  },

  // ─── 4. Chống Chỉ Định Tuyệt Đối (Contraindication Alert) ───
  // Nguy cơ tương tác thuốc nguy hiểm tính mạng
  contraindication: {
    main: palette.purple[600],      // #9333EA
    bg: palette.purple[50],         // #FAF5FF
    border: palette.purple[200],    // #E9D5FF
    text: palette.purple[800],      // #6B21A8
  },

  // ─── 5. Dây Chuyền Lạnh GSP (Cold Chain Storage 2°C - 8°C) ───
  // Vắc xin, Sinh phẩm, Insulin cần giám sát nhiệt độ IoT liên tục
  coldChain: {
    main: palette.cyan[600],        // #0891B2
    bg: palette.cyan[50],           // #ECFEFF
    border: palette.cyan[200],      // #A5F3FC
    text: palette.cyan[800],        // #155E75
  },

  // ─── 6. Cận Date / Cận Hạn Sử Dụng (Near Expiry Alert) ───
  nearExpiry: {
    main: palette.amber[500],       // #F59E0B
    bg: palette.amber[50],
    border: palette.amber[300],
    text: palette.amber[900],
  },
};

export default medical;

