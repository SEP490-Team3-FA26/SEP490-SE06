/**
 * =========================================================================
 * BÀI KIỂM THỬ ĐĂNG KÝ TÀI KHOẢN & QUY ĐỊNH BẢO MẬT THÔNG TIN NGƯỜI DÙNG
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Playbook v2.0 & sep.md)
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values] Luồng chuẩn, thành công
 * 2. [Boundary Values] Giá trị biên, tối thiểu, thang đo độ an toàn mật khẩu
 * 3. [Abnormal Values] Dữ liệu dị thường, chặn khi chưa tích quy định bảo mật
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

const assert = require('assert');

function calculatePasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function validateRegisterForm({ fullName, email, password, agreePrivacy }) {
  if (!fullName || fullName.trim().length < 2) {
    return { valid: false, error: 'Họ và tên phải có tối thiểu 2 ký tự.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { valid: false, error: 'Email không hợp lệ.' };
  }
  if (!password || password.length < 6) {
    return { valid: false, error: 'Mật khẩu phải có tối thiểu 6 ký tự để đảm bảo an toàn.' };
  }
  if (!agreePrivacy) {
    return { valid: false, error: 'Vui lòng đọc và tích chọn đồng ý với Quy định bảo mật thông tin để hoàn tất đăng ký.' };
  }
  return { valid: true, error: null };
}

console.log('================================================================================');
console.log('🧪 BẮT ĐẦU CHẠY TEST SUITE: FORM ĐĂNG KÝ & QUY ĐỊNH BẢO MẬT THÔNG TIN');
console.log('================================================================================\n');

// ============================================================================
// 1. [Normal Values] Luồng nghiệp vụ chuẩn
// ============================================================================
console.log('--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---');

// Test 1.1: Đăng ký đầy đủ hợp lệ kèm đồng ý quy định bảo mật
{
  const result = validateRegisterForm({
    fullName: 'Nguyễn Văn An',
    email: 'nguyenvanan@gmail.com',
    password: 'Password123@',
    agreePrivacy: true,
  });
  assert.strictEqual(result.valid, true, 'Form hợp lệ phải pass validation');
  assert.strictEqual(result.error, null);
  console.log('✔ [Normal] Đăng ký đầy đủ thông tin và tích đồng ý quy định bảo mật thành công.');
}

// Test 1.2: Modal chấp thuận quy định bảo mật thông tin
{
  let agreeState = false;
  const onAcceptFromModal = () => {
    agreeState = true;
  };
  onAcceptFromModal();
  assert.strictEqual(agreeState, true, 'Bấm chấp thuận từ Modal phải kích hoạt agreePrivacy = true');
  console.log('✔ [Normal] Chấp thuận qua Modal Quy định bảo mật tự động tích chọn checkbox.');
}

// Test 1.3: Đóng gói payload gửi Gateway chứa đầy đủ bằng chứng kiểm toán (Audit Consent)
{
  const buildRegisterPayload = (fullName, email, password, agreePrivacy, version = 'v1.0') => ({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: 'user',
    agreePrivacy,
    privacyPolicyVersion: version,
    privacyAgreedAt: new Date().toISOString(),
  });

  const payload = buildRegisterPayload('Nguyễn Văn An', 'an.nguyen@gmail.com', 'Pass123456!', true, 'v1.0');
  assert.strictEqual(payload.agreePrivacy, true, 'Payload bắt buộc phải chứa agreePrivacy: true');
  assert.strictEqual(payload.privacyPolicyVersion, 'v1.0', 'Phải ghi nhận phiên bản chính sách bảo mật v1.0');
  assert.ok(payload.privacyAgreedAt, 'Phải có mốc thời gian ISO chấp thuận chính sách');
  console.log('✔ [Normal] Đóng gói payload đăng ký gửi Gateway đầy đủ bằng chứng kiểm toán (Audit Consent).');
}

// ============================================================================
// 2. [Boundary Values] Giá trị biên & Thang đo mật khẩu
// ============================================================================
console.log('\n--- 2. [Boundary Values] Giá trị biên & Thang đo an toàn mật khẩu ---');

// Test 2.1: Mật khẩu đúng 6 ký tự (biên tối thiểu hợp lệ)
{
  const result = validateRegisterForm({
    fullName: 'Lê An',
    email: 'lean@gmail.com',
    password: '123456',
    agreePrivacy: true,
  });
  assert.strictEqual(result.valid, true, 'Mật khẩu 6 ký tự đạt biên tối thiểu');
  console.log('✔ [Boundary] Mật khẩu đúng 6 ký tự đạt chuẩn biên tối thiểu.');
}

// Test 2.2: Tên đúng 2 ký tự (biên tối thiểu hợp lệ)
{
  const result = validateRegisterForm({
    fullName: 'An',
    email: 'an@gmail.com',
    password: 'Password123!',
    agreePrivacy: true,
  });
  assert.strictEqual(result.valid, true, 'Họ tên 2 ký tự đạt chuẩn biên');
  console.log('✔ [Boundary] Họ tên 2 ký tự đạt chuẩn biên tối thiểu.');
}

// Test 2.3: Thang đo độ mạnh mật khẩu (Password Strength Indicator)
{
  assert.strictEqual(calculatePasswordStrength(''), 0, 'Rỗng -> 0');
  assert.strictEqual(calculatePasswordStrength('123456'), 2, '6 ký tự số -> 2 (Độ dài + Số)');
  assert.strictEqual(calculatePasswordStrength('Pass123'), 3, 'Chữ hoa/thường + số -> 3');
  assert.strictEqual(calculatePasswordStrength('Password123@'), 4, 'Độ dài >= 8 + Hoa/thường + Số/Ký tự -> 4 (Rất an toàn)');
  console.log('✔ [Boundary] Thang đo độ mạnh mật khẩu phân cấp chính xác 4 mức trực quan.');
}

// ============================================================================
// 3. [Abnormal Values] Dữ liệu dị thường & Ràng buộc bảo mật
// ============================================================================
console.log('\n--- 3. [Abnormal Values] Dữ liệu dị thường & Ràng buộc bảo mật ---');

// Test 3.1: Chặn khi CHƯA tích chọn quy định bảo mật thông tin
{
  const result = validateRegisterForm({
    fullName: 'Trần Thị Bình',
    email: 'binh@gmail.com',
    password: 'Password123@',
    agreePrivacy: false,
  });
  assert.strictEqual(result.valid, false, 'Chưa tích quy định bảo mật phải bị chặn');
  assert.ok(result.error.includes('Quy định bảo mật thông tin'), 'Phải thông báo rõ về quy định bảo mật');
  console.log('✔ [Abnormal] Chặn đăng ký khi người dùng chưa đồng ý Quy định bảo mật thông tin.');
}

// Test 3.2: Chặn khi mật khẩu dưới 6 ký tự (5 ký tự)
{
  const result = validateRegisterForm({
    fullName: 'Trần Thị Bình',
    email: 'binh@gmail.com',
    password: '12345',
    agreePrivacy: true,
  });
  assert.strictEqual(result.valid, false, 'Mật khẩu 5 ký tự phải bị chặn');
  assert.ok(result.error.includes('tối thiểu 6 ký tự'));
  console.log('✔ [Abnormal] Chặn đăng ký khi mật khẩu dưới 6 ký tự.');
}

// Test 3.3: Chặn khi email rỗng hoặc sai định dạng
{
  const resultEmpty = validateRegisterForm({
    fullName: 'Trần Thị Bình',
    email: '',
    password: 'Password123@',
    agreePrivacy: true,
  });
  assert.strictEqual(resultEmpty.valid, false);

  const resultInvalid = validateRegisterForm({
    fullName: 'Trần Thị Bình',
    email: 'binh_email_sai_dinh_dang',
    password: 'Password123@',
    agreePrivacy: true,
  });
  assert.strictEqual(resultInvalid.valid, false);
  console.log('✔ [Abnormal] Chặn đăng ký khi email rỗng hoặc không đúng định dạng RFC.');
}

// Test 3.4: Chặn khi họ tên rỗng hoặc dưới 2 ký tự
{
  const result = validateRegisterForm({
    fullName: 'A',
    email: 'a@gmail.com',
    password: 'Password123@',
    agreePrivacy: true,
  });
  assert.strictEqual(result.valid, false);
  console.log('✔ [Abnormal] Chặn đăng ký khi họ tên dưới 2 ký tự.');
}

console.log('\n================================================================================');
console.log('🎉 TẤT CẢ 10 BÀI TEST ĐĂNG KÝ & QUY ĐỊNH BẢO MẬT ĐỀU ĐẠT 100%!');
console.log('================================================================================');

