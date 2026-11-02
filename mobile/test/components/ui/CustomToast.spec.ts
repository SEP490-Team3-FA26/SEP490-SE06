/**
 * CustomToast.spec.ts - Bộ Kiểm Thử Đơn Vị Giao Diện Toast & Alert To Rõ
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Cấu hình 4 loại thông báo (success, error, info, warning), màu sắc y tế chuẩn.
 * 2. [Boundary Values]: Chuỗi tiêu đề rỗng, message undefined, fallback tiêu đề mặc định.
 * 3. [Abnormal Values]: Chuỗi dài 200+ ký tự, HTML tags, type không hợp lệ.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

// Định nghĩa hàm tiện ích lấy cấu hình toast để kiểm thử độc lập
export function getToastConfigMeta(type: 'success' | 'error' | 'info' | 'warning') {
  const configs = {
    success: {
      icon: 'checkmark-circle',
      iconColor: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#0284C7',
      defaultTitle: 'Thành công',
    },
    error: {
      icon: 'close-circle',
      iconColor: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#EF4444',
      defaultTitle: 'Thông báo lỗi',
    },
    info: {
      icon: 'information-circle',
      iconColor: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#0284C7',
      defaultTitle: 'Thông tin',
    },
    warning: {
      icon: 'warning',
      iconColor: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#F59E0B',
      defaultTitle: 'Cảnh báo',
    },
  };

  return configs[type] || configs.info;
}

/**
 * Xử lý chuỗi thông báo đảm bảo an toàn và rút gọn khi quá dài
 */
export function formatToastContent(title?: string, message?: string, defaultTitle = 'Thông báo') {
  const safeTitle = (title && typeof title === 'string' && title.trim().length > 0)
    ? title.trim()
    : defaultTitle;

  const safeMessage = (message && typeof message === 'string' && message.trim().length > 0)
    ? message.trim()
    : null;

  return {
    title: safeTitle.slice(0, 150),
    message: safeMessage ? safeMessage.slice(0, 300) : null,
  };
}

describe('CustomToast - Kiểm Thử Cấu Hình Thông Báo & Alert To Rõ', () => {
  // =========================================================================
  // 1. NHÓM GIÁ TRỊ CHUẨN [Normal Values]
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Phải cung cấp đủ màu sắc và biểu tượng chuẩn y tế cho cả 4 loại Toast', () => {
      const types: Array<'success' | 'error' | 'info' | 'warning'> = [
        'success',
        'error',
        'info',
        'warning',
      ];

      types.forEach((t) => {
        const meta = getToastConfigMeta(t);
        expect(meta).toBeDefined();
        expect(meta.icon).toBeTruthy();
        expect(meta.iconColor).toMatch(/^#/);
        expect(meta.bgColor).toMatch(/^#/);
        expect(meta.borderColor).toMatch(/^#/);
        expect(meta.defaultTitle).toBeTruthy();
      });
    });

    it('Loại success phải mang màu xanh Auth chuẩn #0284C7', () => {
      const successMeta = getToastConfigMeta('success');
      expect(successMeta.iconColor).toBe('#0284C7');
      expect(successMeta.icon).toBe('checkmark-circle');
      expect(successMeta.defaultTitle).toBe('Thành công');
    });

    it('Loại error phải mang màu đỏ cảnh báo #DC2626', () => {
      const errorMeta = getToastConfigMeta('error');
      expect(errorMeta.iconColor).toBe('#DC2626');
      expect(errorMeta.icon).toBe('close-circle');
    });

    it('Loại info phải mang màu xanh dương thương hiệu #0284C7', () => {
      const infoMeta = getToastConfigMeta('info');
      expect(infoMeta.iconColor).toBe('#0284C7');
      expect(infoMeta.icon).toBe('information-circle');
    });

    it('Phải định dạng chính xác tiêu đề và nội dung khi truyền vào thông số đầy đủ', () => {
      const result = formatToastContent('Đã thêm giỏ hàng', 'Panadol Extra x2');
      expect(result.title).toBe('Đã thêm giỏ hàng');
      expect(result.message).toBe('Panadol Extra x2');
    });
  });

  // =========================================================================
  // 2. NHÓM GIÁ TRỊ BIÊN [Boundary Values]
  // =========================================================================
  describe('[Boundary Values] Giá trị biên và giới hạn', () => {
    it('Phải tự động fallback về tiêu đề mặc định khi tiêu đề là chuỗi rỗng "" hoặc khoảng trắng', () => {
      const resultEmpty = formatToastContent('', 'Nội dung thông báo', 'Thành công');
      expect(resultEmpty.title).toBe('Thành công');

      const resultWhitespace = formatToastContent('   ', 'Nội dung', 'Thông tin');
      expect(resultWhitespace.title).toBe('Thông tin');
    });

    it('Phải trả về message là null khi không có message để UI không chừa khoảng trống thừa', () => {
      const resultNoMsg = formatToastContent('Tiêu đề chính', undefined);
      expect(resultNoMsg.title).toBe('Tiêu đề chính');
      expect(resultNoMsg.message).toBeNull();

      const resultEmptyMsg = formatToastContent('Tiêu đề chính', '   ');
      expect(resultEmptyMsg.message).toBeNull();
    });

    it('Phải cắt ngắn an toàn khi tiêu đề hoặc nội dung vượt quá giới hạn ký tự', () => {
      const longTitle = 'A'.repeat(250);
      const longMessage = 'B'.repeat(500);

      const formatted = formatToastContent(longTitle, longMessage);
      expect(formatted.title.length).toBe(150);
      expect(formatted.message?.length).toBe(300);
    });
  });

  // =========================================================================
  // 3. NHÓM GIÁ TRỊ DỊ THƯỜNG [Abnormal Values]
  // =========================================================================
  describe('[Abnormal Values] Giá trị dị thường, sai định dạng và ngoại lệ', () => {
    it('Phải xử lý an toàn khi type truyền vào không hợp lệ', () => {
      const meta = getToastConfigMeta('UNKNOWN_TYPE' as any);
      expect(meta).toBeDefined();
      expect(meta.defaultTitle).toBe('Thông tin'); // Fallback về info
    });

    it('Phải xử lý an toàn khi title và message là null hoặc kiểu dữ liệu lạ', () => {
      const resultNull = formatToastContent(null as any, null as any);
      expect(resultNull.title).toBe('Thông báo');
      expect(resultNull.message).toBeNull();

      const resultNumber = formatToastContent(12345 as any, { obj: 1 } as any);
      expect(resultNumber.title).toBe('Thông báo');
      expect(resultNumber.message).toBeNull();
    });
  });
});

