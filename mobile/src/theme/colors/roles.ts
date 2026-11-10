/**
 * Phân hệ màu sắc theo Vai trò Người Dùng (Role-Based Design Tokens)
 * Đồng bộ màu sắc toàn bộ ứng dụng Mobile thành tone Xanh Nhận Diện Auth (Sky / Medical Blue)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import { palette } from './palette';

export const roles = {
  // ─── 1. Khách Hàng (Customer / User) - Tone Xanh Nước Biển Ngoại Cùng ───
  customer: {
    primary: palette.sky[600],       // #0284C7 - Màu nhận diện chính
    primaryDark: palette.sky[700],   // #0369A1 - Nền thanh Header, chữ đậm
    primaryLight: palette.sky[500],  // #0EA5E9 - Nút tương tác nhanh
    surface: palette.sky[50],        // #F0F9FF - Nền màn hình Khách hàng
    card: '#FFFFFF',                 // Nền thẻ trắng tinh khiết
    border: palette.sky[200],        // #BAE6FD - Viền thẻ & ô nhập
    borderActive: palette.sky[300],  // #7DD3FC - Viền trạng thái chọn
    text: palette.sky[900],          // #0C4A6E - Tiêu đề tương phản cao
    subtext: palette.slate[500],     // #64748B - Chú thích phụ
    badge: palette.sky[100],         // #E0F2FE - Nền badge phân loại
    badgeText: palette.sky[700],     // #0369A1 - Chữ badge
    accent: palette.sky[400],        // #38BDF8 - Điểm nhấn biểu tượng
  },

  // ─── 2. Dược Sĩ Lâm Sàng & Bán Lẻ (Pharmacist) - Tone Xanh Y Tế Đồng Bộ Auth ───
  pharmacist: {
    primary: palette.sky[600],       // #0284C7 - Đồng bộ nhận diện xanh Auth
    primaryDark: palette.sky[800],   // #075985 - Header quầy thuốc
    primaryLight: palette.sky[400],  // #38BDF8 - Nút hoàn tất đơn
    surface: palette.sky[50],        // #F0F9FF - Nền đơn bán lẻ POS
    card: '#FFFFFF',
    border: palette.sky[200],        // #BAE6FD - Viền kê đơn an toàn
    text: palette.sky[900],          // #0C4A6E
    badge: palette.sky[100],         // #E0F2FE
    badgeText: palette.sky[700],     // #0369A1
  },

  // ─── 3. Nhân Viên Thủ Kho GSP (Warehouse Staff) - Tone Xanh Chàm Đồng Bộ ───
  warehouse: {
    primary: palette.sky[700],       // #0369A1 - Tone xanh kho dược chuẩn GSP
    primaryDark: palette.sky[900],   // #0C4A6E - Header kiểm kê, chuyển kho
    primaryLight: palette.sky[500],  // #0EA5E9
    surface: palette.sky[50],        // #F0F9FF - Nền sơ đồ kho GSP
    card: '#FFFFFF',
    border: palette.sky[200],        // #BAE6FD - Viền pallet, ô kệ
    text: palette.sky[900],          // #0C4A6E
    badge: palette.sky[100],         // #E0F2FE
    badgeText: palette.sky[700],     // #0369A1
  },

  // ─── 4. Quản Trị Viên Chuỗi (Chain Admin / Manager) - Tone Xanh Đậm Quyền Lực ───
  admin: {
    primary: palette.sky[800],       // #075985 - Màu nhận diện chính
    primaryDark: palette.sky[900],   // #0C4A6E - Nền thanh quản trị
    primaryLight: palette.sky[600],  // #0284C7
    surface: palette.sky[50],        // #F0F9FF
    card: '#FFFFFF',
    border: palette.sky[200],        // #BAE6FD
    text: palette.slate[900],
    badge: palette.sky[100],
    badgeText: palette.sky[700],
  },
};

export default roles;
