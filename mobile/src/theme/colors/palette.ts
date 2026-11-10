/**
 * Bảng màu cơ sở chuẩn Material 3 & Y Tế Hiện Đại (Medical Clinical Base Palette)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

export const palette = {
  // Tông Xanh Nước Biển (Ocean / Sky Blue) - Nhận diện chính của Khách Hàng (Customer)
  sky: {
    50: '#F0F9FF',  // Nền ứng dụng siêu sáng, card nhẹ
    100: '#E0F2FE', // Badge nhạt, tag phân loại
    200: '#BAE6FD', // Viền thẻ mặc định, viền ngăn cách
    300: '#7DD3FC', // Viền hover/focus nhẹ
    400: '#38BDF8', // Xanh biển tươi sáng, highlight
    500: '#0EA5E9', // Nút bấm phụ, icon điểm nhấn
    600: '#0284C7', // XANH THƯƠNG HIỆU CHỦ ĐẠO (Brand Primary)
    700: '#0369A1', // Xanh biển đậm tiêu đề Header
    800: '#075985', // Xanh biển siêu đậm, nền thẻ VIP
    900: '#0C4A6E', // Chữ tương phản tối đa
  },

  // Tông Xanh Ngọc Đồng Bộ Sang Xanh Auth (Medical Emerald -> Auth Sky Blue) - Dành riêng cho Dược Sĩ (Pharmacist)
  emerald: {
    50: '#F0F9FF',  // Nền đơn thuốc, ca trực (Ánh xạ chuẩn Tone Xanh Auth)
    100: '#E0F2FE', // Badge trạng thái dược sĩ
    200: '#BAE6FD', // Viền toa thuốc an toàn
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Trạng thái thành công / đã duyệt
    600: '#0284C7', // Xanh chủ đạo của Dược Sĩ (Đồng bộ Xanh Auth)
    700: '#0369A1', // Tiêu đề nghiệp vụ bán thuốc
    800: '#075985', // Header Dược sĩ
    900: '#0C4A6E', // Tương phản tối đa
  },

  // Tông Chàm / Tím Công Nghiệp (Industrial Indigo) - Dành riêng cho Thủ Kho (Warehouse)
  indigo: {
    50: '#EEF2FF',  // Nền phiếu nhập kho, pallet
    100: '#E0E7FF', // Badge lô hàng GSP
    200: '#C7D2FE', // Viền thẻ vị trí kho
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5', // Màu chủ đạo Thủ kho
    700: '#4338CA', // Header kiểm kê kho
    800: '#3730A3', // Nền bảng điều khiển kho
    900: '#312E81',
  },

  // Tông Xám Y Khoa Sang Trọng (Clinical Slate) - Nền tảng trung tính (Neutrals)
  slate: {
    50: '#F8FAFC',  // Nền thẻ Card / Nền trang tổng quan
    100: '#F1F5F9', // Nền input, nút thứ cấp, divider
    200: '#E2E8F0', // Border chuẩn 1px
    300: '#CBD5E1', // Border phụ
    400: '#94A3B8', // Placeholder / Icon vô hiệu
    500: '#64748B', // Phụ đề (Subtitle), thông số phụ
    600: '#475569', // Nội dung mô tả chi tiết
    700: '#334155', // Thân văn bản chính (Body Text)
    800: '#1E293B', // Tiêu đề thẻ con (Card Title)
    900: '#0F172A', // Tiêu đề lớn (Main Heading)
  },

  // Tông Hổ Phách Cảnh Báo (Amber) - Cận hạn, Thuốc kê đơn Rx, Thiếu hàng
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706', // Cảnh báo tiêu chuẩn
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Tông Đỏ Y Tế Khẩn Cấp (Medical Rose / Red) - Dị ứng, Thu hồi thuốc, Lỗi nghiêm trọng
  rose: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626', // Màu đỏ cảnh báo khẩn cấp
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Tông Tím Chống Chỉ Định (Purple) - Tương tác thuốc độc hại
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
  },

  // Tông Xanh Lạnh Dây Chuyền Lạnh GSP (Cold Chain Cyan) - 2°C đến 8°C
  cyan: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
  },
};

export default palette;

