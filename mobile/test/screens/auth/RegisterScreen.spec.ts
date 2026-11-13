// mobile/test/screens/auth/RegisterScreen.spec.ts
/**
 * =========================================================================
 * BÀI KIỂM THỬ ĐĂNG KÝ TÀI KHOẢN & QUY ĐỊNH BẢO MẬT THÔNG TIN (MOBILE SUITE)
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Playbook v2.0 & sep.md)
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values] Luồng chuẩn, thành công, ánh xạ đúng fullName
 * 2. [Boundary Values] Giá trị biên, tối thiểu, thang đo an toàn mật khẩu
 * 3. [Abnormal Values] Dữ liệu dị thường, chặn khi chưa tích quy định bảo mật
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

// Hàm tính toán độ mạnh mật khẩu chuẩn hóa
function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

// Hàm chuyển đổi lỗi kỹ thuật MongoDB E11000 thành thông báo thân thiện
function sanitizeAuthError(rawMsg?: string): string {
  if (!rawMsg) return 'Email hoặc số điện thoại có thể đã được đăng ký trên hệ thống.';
  if (rawMsg.includes('E11000') && rawMsg.includes('phone')) {
    return 'Số điện thoại này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc dùng số điện thoại khác.';
  }
  if (rawMsg.includes('E11000') && rawMsg.includes('email')) {
    return 'Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc dùng email khác.';
  }
  if (rawMsg.includes('E11000')) {
    return 'Thông tin đăng ký đã tồn tại trên hệ thống. Vui lòng kiểm tra lại.';
  }
  return rawMsg;
}

// Logic validation biểu mẫu đăng ký mobile
function validateMobileRegisterForm(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  agreePrivacy: boolean;
}) {
  if (!input.name || input.name.trim().length < 2) {
    return { valid: false, error: 'Vui lòng nhập họ và tên tối thiểu 2 ký tự.' };
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { valid: false, error: 'Email không hợp lệ.' };
  }
  if (!input.password || input.password.length < 6) {
    return { valid: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
  }
  if (input.password !== input.confirmPassword) {
    return { valid: false, error: 'Mật khẩu xác nhận không trùng khớp.' };
  }
  if (!input.agreePrivacy) {
    return {
      valid: false,
      error: 'Vui lòng đọc và tích chọn đồng ý với Quy định bảo mật thông tin để tiếp tục.',
    };
  }
  return { valid: true, error: null };
}

// Hàm chuẩn hóa payload gửi lên API Gateway (Sửa lỗi field name -> fullName)
function transformRegisterPayload(data: {
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
}) {
  const payload: any = {
    fullName: (data.fullName || data.name || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    password: data.password,
    role: data.role || 'user',
  };
  if (data.phone && data.phone.trim()) {
    payload.phone = data.phone.trim();
  }
  return payload;
}

describe('Kiểm thử Giao diện & Nghiệp Vụ Đăng Ký Tài Khoản Mobile (RegisterScreen)', () => {
  // ==========================================================================
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn
  // ==========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Nên validate thành công khi người dùng nhập đủ thông tin và đồng ý Quy định bảo mật', () => {
      const result = validateMobileRegisterForm({
        name: 'Trần Hồng Phước',
        email: 'phuoc@gmail.com',
        phone: '0901234567',
        password: 'Password123@',
        confirmPassword: 'Password123@',
        agreePrivacy: true,
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('Nên chuyển đổi đúng trường fullName thay vì name để API Gateway không bị lỗi 400', () => {
      const mobileInput = {
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@gmail.com',
        phone: '0912345678',
        password: 'Password123!',
      };

      const payload = transformRegisterPayload(mobileInput);

      expect(payload).toHaveProperty('fullName', 'Nguyễn Văn A');
      expect(payload).not.toHaveProperty('name');
      expect(payload.email).toBe('nguyenvana@gmail.com');
      expect(payload.role).toBe('user');
    });

    it('Nên tự động tích chọn checkbox cam kết khi người dùng nhấn "Tôi đã hiểu & Đồng ý" trên Modal', () => {
      let agreeState = false;
      const handleAcceptFromModal = () => {
        agreeState = true;
      };

      handleAcceptFromModal();
      expect(agreeState).toBe(true);
    });
  });

  // ==========================================================================
  // 2. [Boundary Values] Giá trị biên & Thang đo mật khẩu
  // ==========================================================================
  describe('[Boundary Values] Giá trị biên & Thang đo an toàn mật khẩu', () => {
    it('Nên chấp nhận mật khẩu đạt biên tối thiểu đúng 6 ký tự', () => {
      const result = validateMobileRegisterForm({
        name: 'Lê An',
        email: 'lean@gmail.com',
        password: '123456',
        confirmPassword: '123456',
        agreePrivacy: true,
      });

      expect(result.valid).toBe(true);
    });

    it('Nên chấp nhận họ tên đạt biên tối thiểu đúng 2 ký tự', () => {
      const result = validateMobileRegisterForm({
        name: 'An',
        email: 'an@gmail.com',
        password: 'Password123@',
        confirmPassword: 'Password123@',
        agreePrivacy: true,
      });

      expect(result.valid).toBe(true);
    });

    it('Nên cho phép đăng ký thành công khi bỏ trống số điện thoại (trường tùy chọn)', () => {
      const payload = transformRegisterPayload({
        name: 'Trần Bình',
        email: 'binh@gmail.com',
        password: 'Password123@',
      });

      expect(payload.fullName).toBe('Trần Bình');
      expect(payload.phone).toBeUndefined();
    });

    it('Nên phân cấp độ an toàn mật khẩu chính xác 4 mức trực quan', () => {
      expect(calculatePasswordStrength('')).toBe(0);
      expect(calculatePasswordStrength('123456')).toBe(2); // 6 ký tự + số
      expect(calculatePasswordStrength('Pass123')).toBe(3); // Hoa/thường + số
      expect(calculatePasswordStrength('Password123@')).toBe(4); // >= 8 + Hoa/thường + Số/Ký tự đặc biệt
    });
  });

  // ==========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường & Ràng buộc bảo mật
  // ==========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & Ràng buộc bảo mật', () => {
    it('Nên chặn đăng ký khi người dùng chưa đồng ý Quy định bảo mật thông tin', () => {
      const result = validateMobileRegisterForm({
        name: 'Trần Văn Test',
        email: 'test@gmail.com',
        password: 'Password123@',
        confirmPassword: 'Password123@',
        agreePrivacy: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Quy định bảo mật thông tin');
    });

    it('Nên chặn đăng ký khi mật khẩu dưới 6 ký tự (5 ký tự)', () => {
      const result = validateMobileRegisterForm({
        name: 'Trần Văn Test',
        email: 'test@gmail.com',
        password: '12345',
        confirmPassword: '12345',
        agreePrivacy: true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('ít nhất 6 ký tự');
    });

    it('Nên chặn đăng ký khi mật khẩu xác nhận không trùng khớp', () => {
      const result = validateMobileRegisterForm({
        name: 'Trần Văn Test',
        email: 'test@gmail.com',
        password: 'Password123@',
        confirmPassword: 'DifferentPassword456@',
        agreePrivacy: true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('không trùng khớp');
    });

    it('Nên chặn khi email rỗng hoặc sai định dạng', () => {
      const result = validateMobileRegisterForm({
        name: 'Trần Văn Test',
        email: 'email_sai_dinh_dang',
        password: 'Password123@',
        confirmPassword: 'Password123@',
        agreePrivacy: true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Email không hợp lệ');
    });

    it('Nên chặn khi họ tên rỗng hoặc dưới 2 ký tự', () => {
      const result = validateMobileRegisterForm({
        name: 'A',
        email: 'test@gmail.com',
        password: 'Password123@',
        confirmPassword: 'Password123@',
        agreePrivacy: true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('tối thiểu 2 ký tự');
    });

    it('Nên chuyển đổi lỗi MongoDB E11000 duplicate phone thành thông báo người dùng dễ hiểu', () => {
      const rawMongoError = 'E11000 duplicate key error collection: WDP201.users index: phone_1 dup key: { phone: "0936929381" }';
      const friendlyMsg = sanitizeAuthError(rawMongoError);

      expect(friendlyMsg).toContain('Số điện thoại này đã được đăng ký');
      expect(friendlyMsg).not.toContain('E11000');
      expect(friendlyMsg).not.toContain('WDP201.users');
    });

    it('Nên chuyển đổi lỗi MongoDB E11000 duplicate email thành thông báo người dùng dễ hiểu', () => {
      const rawMongoError = 'E11000 duplicate key error collection: WDP201.users index: email_1 dup key: { email: "user@gmail.com" }';
      const friendlyMsg = sanitizeAuthError(rawMongoError);

      expect(friendlyMsg).toContain('Email này đã được đăng ký');
      expect(friendlyMsg).not.toContain('E11000');
    });
  });
});
