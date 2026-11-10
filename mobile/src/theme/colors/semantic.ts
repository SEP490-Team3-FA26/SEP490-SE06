/**
 * Trạng Thái Ngữ Nghĩa Hệ Thống (Semantic Status Tokens)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import { palette } from './palette';

export const semantic = {
  // Thành công / Đã duyệt / Còn hàng / Đã thanh toán (Chuyển 100% sang tone Xanh Auth)
  success: {
    main: '#0284C7',                  // #0284C7 (Auth Blue Chủ Đạo)
    bg: '#F0F9FF',                    // #F0F9FF (Nền Xanh Siêu Sáng)
    border: '#BAE6FD',                // #BAE6FD (Viền Xanh Nhạt)
    text: '#0369A1',                  // #0369A1 (Chữ Xanh Biển Đậm)
  },

  // Cảnh báo / Đang chờ duyệt / Tồn kho thấp
  warning: {
    main: palette.amber[600],         // #D97706
    bg: palette.amber[50],            // #FFFBEB
    border: palette.amber[200],       // #FDE68A
    text: palette.amber[800],         // #92400E
  },

  // Nguy hiểm / Lỗi / Hủy đơn / Hết hàng
  danger: {
    main: palette.rose[600],          // #DC2626
    bg: palette.rose[50],             // #FEF2F2
    border: palette.rose[200],        // #FECACA
    text: palette.rose[800],          // #991B1B
  },

  // Thông tin / Hướng dẫn / Thông báo mới
  info: {
    main: palette.sky[600],           // #0284C7
    bg: palette.sky[50],              // #F0F9FF
    border: palette.sky[200],         // #BAE6FD
    text: palette.sky[800],           // #075985
  },
};

export default semantic;

