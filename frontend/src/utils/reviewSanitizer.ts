// reviewSanitizer.ts - Bộ lọc chuẩn hóa hiển thị thông tin khách hàng đánh giá (UC-77)
// Tuân thủ chính sách bảo mật thông tin & giao diện người dùng chuẩn chuỗi nhà thuốc Long Châu

/**
 * Chuẩn hóa họ tên người đánh giá:
 * - Loại bỏ tiền tố đánh số thử nghiệm (ví dụ: "001. Phùng Cẩm Uyên" -> "Phùng Cẩm Uyên")
 * - Loại bỏ hậu tố vai trò mặc định (ví dụ: "Nguyễn Văn An (Khách Hàng)" -> "Nguyễn Văn An")
 * - Chuyển đổi tên quá ngắn hoặc nickname test (như "ok", ".") thành tên mặc định trang nhã
 */
export function sanitizeReviewerName(name?: string | null): string {
  if (!name || typeof name !== 'string') {
    return 'Khách hàng ẩn danh';
  }

  // Cắt tỉa khoảng trắng 2 đầu
  let cleaned = name.trim();
  if (!cleaned) {
    return 'Khách hàng ẩn danh';
  }

  // Loại bỏ số thứ tự ở đầu dạng "001. ", "02 - ", "1. ", "003 "
  cleaned = cleaned.replace(/^\d+[\.\s\-–_:]+/, '').trim();

  // Loại bỏ hậu tố ghi chú vai trò (ví dụ: "(Khách Hàng)", "(Customer)", "[User]")
  cleaned = cleaned.replace(/\s*[\(\[][^()\[\]]*(khách\s*hàng|customer|user)[^()\[\]]*[\)\]]/gi, '').trim();

  if (!cleaned) {
    return 'Khách hàng ẩn danh';
  }

  // Nếu tên sau khi lọc còn quá ngắn (<= 2 ký tự như "ok", "a", "..") thì hiển thị trang nhã
  if (cleaned.length <= 2) {
    return 'Khách hàng ABC';
  }

  return cleaned || 'Khách hàng ẩn danh';
}

/**
 * Ẩn các chữ số ở giữa số điện thoại nhằm bảo mật danh tính khách hàng (Data Masking)
 * - Số 10 chữ số (chuẩn VN): "0936929381" -> "093****381"
 * - Số >= 10 chữ số: Giữ 3 số đầu và 3 số cuối (ví dụ "+84 0936 929 381" -> "840****381")
 * - Số 9 chữ số (dữ liệu test hệ thống): "097100001" -> "097****01"
 * - Chuỗi không hợp lệ hoặc ít hơn 7 chữ số: Trả về chuỗi rỗng
 */
export function maskReviewerPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Chỉ giữ lại các chữ số
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 7) {
    return '';
  }

  if (digits.length >= 10) {
    return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
  }

  // Trường hợp số điện thoại 9 số hoặc ngắn hơn 10
  const prefix = digits.slice(0, 3);
  const suffix = digits.slice(-2);
  return `${prefix}****${suffix}`;
}
