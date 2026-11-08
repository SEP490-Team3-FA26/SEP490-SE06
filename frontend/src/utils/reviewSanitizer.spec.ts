// reviewSanitizer.spec.ts - Bộ kiểm thử đơn vị cho hàm chuẩn hóa tên & che số điện thoại review
import { describe, it, expect } from 'vitest';
import { sanitizeReviewerName, maskReviewerPhone } from './reviewSanitizer';

describe('reviewSanitizer - Kiểm thử chuẩn hóa hiển thị người dùng đánh giá', () => {
  // =========================================================================
  // 1. [Normal Values]: Dữ liệu thông thường, luồng chuẩn
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Loại bỏ tiền tố số thứ tự khỏi tên người đánh giá', () => {
      expect(sanitizeReviewerName('001. Phùng Cẩm Uyên')).toBe('Phùng Cẩm Uyên');
      expect(sanitizeReviewerName('002. Vũ Phương Hà')).toBe('Vũ Phương Hà');
      expect(sanitizeReviewerName('003. Lý Lan Vy')).toBe('Lý Lan Vy');
      expect(sanitizeReviewerName('005. Đỗ Thảo Trâm')).toBe('Đỗ Thảo Trâm');
    });

    it('Loại bỏ hậu tố vai trò khách hàng trong ngoặc đơn', () => {
      expect(sanitizeReviewerName('Nguyễn Văn An (Khách Hàng)')).toBe('Nguyễn Văn An');
      expect(sanitizeReviewerName('Trần Thị Bích (Customer)')).toBe('Trần Thị Bích');
      expect(sanitizeReviewerName('Lê Hoàng Nam [User]')).toBe('Lê Hoàng Nam');
    });

    it('Giữ nguyên tên người dùng bình thường không chứa tiền tố hoặc hậu tố', () => {
      expect(sanitizeReviewerName('Le Hoang Nam')).toBe('Le Hoang Nam');
      expect(sanitizeReviewerName('Tran Thi Bich')).toBe('Tran Thi Bich');
      expect(sanitizeReviewerName('Nguyễn Văn An')).toBe('Nguyễn Văn An');
    });

    it('Che 4 số giữa của số điện thoại 10 số chuẩn Việt Nam', () => {
      expect(maskReviewerPhone('0936929381')).toBe('093****381');
      expect(maskReviewerPhone('0918000102')).toBe('091****102');
      expect(maskReviewerPhone('0987654321')).toBe('098****321');
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên, độ dài tối thiểu, số lượng chữ số khác biệt
  // =========================================================================
  describe('[Boundary Values] Giá trị biên & độ dài tối thiểu', () => {
    it('Xử lý số điện thoại test có độ dài 9 chữ số', () => {
      expect(maskReviewerPhone('097100001')).toBe('097****01');
      expect(maskReviewerPhone('097100005')).toBe('097****05');
    });

    it('Xử lý số điện thoại quốc tế hoặc 11 chữ số biên', () => {
      expect(maskReviewerPhone('01234567890')).toBe('012****890');
    });

    it('Thay thế tên quá ngắn biên (dưới hoặc bằng 2 ký tự) thành tên hiển thị trang nhã', () => {
      expect(sanitizeReviewerName('ok')).toBe('Khách hàng ABC');
      expect(sanitizeReviewerName('a')).toBe('Khách hàng ABC');
      expect(sanitizeReviewerName('..')).toBe('Khách hàng ABC');
    });

    it('Xử lý tiền tố dạng dấu gạch nối hoặc khoảng trắng biên', () => {
      expect(sanitizeReviewerName('10 - Nguyễn Thị Mai')).toBe('Nguyễn Thị Mai');
      expect(sanitizeReviewerName('99: Phạm Tuấn')).toBe('Phạm Tuấn');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, rỗng, sai định dạng, kiểu dữ liệu lạ
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường, rỗng, ngoại lệ', () => {
    it('Xử lý tên là null, undefined hoặc chuỗi rỗng', () => {
      expect(sanitizeReviewerName(null)).toBe('Khách hàng ẩn danh');
      expect(sanitizeReviewerName(undefined)).toBe('Khách hàng ẩn danh');
      expect(sanitizeReviewerName('')).toBe('Khách hàng ẩn danh');
      expect(sanitizeReviewerName('   ')).toBe('Khách hàng ẩn danh');
    });

    it('Xử lý số điện thoại là null, undefined hoặc ít hơn 7 chữ số', () => {
      expect(maskReviewerPhone(null)).toBe('');
      expect(maskReviewerPhone(undefined)).toBe('');
      expect(maskReviewerPhone('')).toBe('');
      expect(maskReviewerPhone('12345')).toBe('');
      expect(maskReviewerPhone('abcxyz')).toBe('');
    });

    it('Xử lý số điện thoại chứa ký tự đặc biệt hoặc khoảng cách rải rác', () => {
      expect(maskReviewerPhone('093-692-9381')).toBe('093****381');
      expect(maskReviewerPhone('+84 0936 929 381')).toBe('840****381');
    });
  });
});
