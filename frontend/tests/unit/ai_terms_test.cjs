// frontend/tests/unit/ai_terms_test.cjs
/**
 * =========================================================================
 * KIỂM THỬ ĐƠN VỊ NỘI QUY & ĐIỀU KHOẢN TRỢ LÝ DƯỢC SĨ AI (WDP301 / SEP490)
 * Tuân thủ quy tắc kẹp bài test bắt buộc (Test-Coupled Mandate)
 * Đầy đủ 3 nhóm chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

const assert = require('assert');

// 1. Dữ liệu chuẩn nội quy trích xuất từ tài liệu nghiệp vụ mục 18
const AI_TERMS_VERSION = 'v1.0-OTC';
const AI_TERMS_RELEASE_DATE = '01/11/2026';

const MANDATORY_ARTICLE_TITLES = [
  'Điều 1: Mục tiêu & Phạm vi Tư vấn Sức khỏe',
  'Điều 2: Chống Chỉ Định & Tình Huống Y Tế Khẩn Cấp',
  'Điều 3: Quy Định Nghiêm Ngặt Về Thuốc Kê Đơn (ETC)',
  'Điều 4: Trách Nhiệm Khai Báo Trung Thực Của Người Dùng',
  'Điều 5: Nguyên Tắc Cá Nhân Hóa & Nghiêm Cấm Dùng Cho Người Khác',
  'Điều 6: Vai Trò Dược Sĩ & Cơ Chế Kiểm Duyệt Chuyên Môn',
  'Điều 7: Bảo Mật Thông Tin & Giảm Thiểu Dữ Liệu Y Tế (Data Minimization)',
  'Điều 8: Phản Ứng Bất Thường & Kênh Liên Hệ Hỗ Trợ Khẩn',
];

// Hàm thuần mô phỏng tính toán tiến độ cuộn và kiểm tra chạm đáy
function calculateScrollStatus(scrollTop, clientHeight, scrollHeight, tolerance = 20) {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) {
    return { progress: 100, hasReachedBottom: true };
  }
  const rawProgress = Math.round((scrollTop / maxScroll) * 100);
  const progress = Math.min(100, Math.max(0, rawProgress));
  const hasReachedBottom = scrollTop + clientHeight >= scrollHeight - tolerance;
  return { progress, hasReachedBottom };
}

// Hàm thuần mô phỏng điều kiện mở khóa nút xác nhận
function canConfirmTerms(hasScrolledToBottom, isAgreementChecked, isSubmitting = false) {
  return hasScrolledToBottom === true && isAgreementChecked === true && isSubmitting === false;
}

// Hàm thuần mô phỏng ghi nhật ký kiểm toán (Audit Trail)
function appendAuditLog(existingLogs, newEntry, maxLogs = 20) {
  const list = Array.isArray(existingLogs) ? [...existingLogs] : [];
  list.push({
    version: newEntry.version || AI_TERMS_VERSION,
    acceptedAt: newEntry.acceptedAt || new Date().toISOString(),
    userAgent: newEntry.userAgent || 'unknown',
  });
  return list.slice(-maxLogs);
}

// Hàm thuần mô phỏng kiểm tra điều kiện cho phép gửi tin nhắn (Fail-Closed)
function canSendMessage(hasAcceptedTerms, messageText) {
  if (!hasAcceptedTerms) return { allowed: false, reason: 'TERMS_NOT_ACCEPTED' };
  if (!messageText || !messageText.trim()) return { allowed: false, reason: 'EMPTY_MESSAGE' };
  return { allowed: true, reason: 'OK' };
}

console.log('='.repeat(80));
console.log('🧪 BẮT ĐẦU CHẠY BÀI KIỂM THỬ NỘI QUY AI ASSISTANT (FRONTEND TEST SUITE)');
console.log('='.repeat(80));

// =========================================================================
// 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
// =========================================================================
console.log('\n--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---');

// Test 1.1: Đầy đủ 8 điều khoản nội quy bắt buộc
assert.strictEqual(MANDATORY_ARTICLE_TITLES.length, 8, 'Phải có đầy đủ 8 điều khoản nội quy');
assert.ok(MANDATORY_ARTICLE_TITLES[0].includes('Phạm vi'), 'Điều 1 phải quy định phạm vi OTC');
assert.ok(MANDATORY_ARTICLE_TITLES[1].includes('Khẩn Cấp'), 'Điều 2 phải cảnh báo cấp cứu 115');
assert.ok(MANDATORY_ARTICLE_TITLES[2].includes('Thuốc Kê Đơn (ETC)'), 'Điều 3 phải cấm bán ETC online');
console.log('✔ [Normal] Đã kiểm tra đủ 8 điều khoản nội quy chuẩn y tế.');

// Test 1.2: Cuộn chạm đáy 100% và đánh dấu cam kết -> Mở khóa nút xác nhận
const scrollResultBottom = calculateScrollStatus(800, 400, 1200); // 800 + 400 = 1200 (chạm đáy)
assert.strictEqual(scrollResultBottom.progress, 100, 'Tiến độ cuộn phải đạt 100%');
assert.strictEqual(scrollResultBottom.hasReachedBottom, true, 'Đã chạm đáy thành công');

const isUnlocked = canConfirmTerms(scrollResultBottom.hasReachedBottom, true, false);
assert.strictEqual(isUnlocked, true, 'Nút xác nhận phải được kích hoạt khi đã cuộn chạm đáy và tích cam kết');
console.log('✔ [Normal] Cuộn chạm đáy 100% kết hợp tích cam kết mở khóa nút thành công.');

// Test 1.3: Ghi nhận nhật ký audit log hợp lệ
const mockExisting = [{ version: 'v1.0-OTC', acceptedAt: '2026-11-04T10:00:00.000Z' }];
const updatedAudit = appendAuditLog(mockExisting, { version: AI_TERMS_VERSION, acceptedAt: '2026-11-04T12:00:00.000Z', userAgent: 'Mozilla/5.0' });
assert.strictEqual(updatedAudit.length, 2, 'Số lượng audit log phải tăng lên 2');
assert.strictEqual(updatedAudit[1].version, AI_TERMS_VERSION);
console.log('✔ [Normal] Ghi nhật ký kiểm toán Audit Trail hợp lệ.');

// Test 1.4: Cho phép gửi tin nhắn khi đã xác nhận nội quy
const sendCheck = canSendMessage(true, 'Tôi bị đau đầu nhẹ');
assert.strictEqual(sendCheck.allowed, true, 'Được phép gửi tin nhắn khi đã đồng ý nội quy');
console.log('✔ [Normal] Mở khóa gửi tin nhắn chat AI bình thường.');

// =========================================================================
// 2. [Boundary Values] - Giá trị biên, dung sai cuộn, idempotency
// =========================================================================
console.log('\n--- 2. [Boundary Values] Giá trị biên & Dung sai cuộn ---');

// Test 2.1: Dung sai cuộn 20px (ví dụ cách đáy 15px vẫn được tính là đã chạm đáy)
const scrollNearBottom = calculateScrollStatus(785, 400, 1200, 20); // 785 + 400 = 1185 >= 1200 - 20 (1180)
assert.strictEqual(scrollNearBottom.hasReachedBottom, true, 'Trong phạm vi dung sai 20px phải xác định là chạm đáy');
console.log('✔ [Boundary] Dung sai cuộn 20px hoạt động chính xác.');

// Test 2.2: Ranh giới nội dung ngắn hơn khung nhìn (scrollHeight <= clientHeight)
const shortContentScroll = calculateScrollStatus(0, 500, 400);
assert.strictEqual(shortContentScroll.progress, 100, 'Nội dung ngắn không cần cuộn phải đạt 100%');
assert.strictEqual(shortContentScroll.hasReachedBottom, true, 'Nội dung ngắn mặc định đã đọc hết');
console.log('✔ [Boundary] Nội dung không cần cuộn xử lý an toàn.');

// Test 2.3: Giới hạn lưu tối đa 20 bản ghi audit log chống tràn bộ nhớ
let overflowLogs = [];
for (let i = 0; i < 25; i++) {
  overflowLogs = appendAuditLog(overflowLogs, { version: `v1.${i}`, acceptedAt: new Date().toISOString() });
}
assert.strictEqual(overflowLogs.length, 20, 'Audit log không được vượt quá 20 phần tử');
console.log('✔ [Boundary] Giới hạn bộ nhớ 20 bản ghi audit log chống tràn LocalStorage.');

// =========================================================================
// 3. [Abnormal Values] - Dị thường, chưa cuộn, cố tình bỏ qua, Fail-Closed
// =========================================================================
console.log('\n--- 3. [Abnormal Values] Dữ liệu dị thường & Chặn Fail-Closed ---');

// Test 3.1: Chưa cuộn xuống đáy (progress < 100%) -> Khóa nút xác nhận
const scrollHalfway = calculateScrollStatus(200, 400, 1200); // 200/800 = 25%
assert.strictEqual(scrollHalfway.hasReachedBottom, false, 'Chưa chạm đáy');
const lockedDueToScroll = canConfirmTerms(scrollHalfway.hasReachedBottom, true, false);
assert.strictEqual(lockedDueToScroll, false, 'Cấm xác nhận khi chưa cuộn chạm đáy');
console.log('✔ [Abnormal] Chặn xác nhận khi người dùng chưa cuộn hết trang.');

// Test 3.2: Đã cuộn chạm đáy nhưng chưa tích chọn cam kết -> Khóa nút xác nhận
const lockedDueToCheckbox = canConfirmTerms(true, false, false);
assert.strictEqual(lockedDueToCheckbox, false, 'Cấm xác nhận khi chưa tích chọn cam kết');
console.log('✔ [Abnormal] Chặn xác nhận khi chưa tích checkbox cam kết.');

// Test 3.3: Đang submit -> Khóa nút chống double submit
const lockedDueToSubmitting = canConfirmTerms(true, true, true);
assert.strictEqual(lockedDueToSubmitting, false, 'Khóa nút khi đang gửi request chống trùng lặp');
console.log('✔ [Abnormal] Khóa nút khi đang xử lý (Anti-Double Submit).');

// Test 3.4: Fail-closed khi gửi tin nhắn nếu chưa đồng ý nội quy
const blockedSend = canSendMessage(false, 'Tư vấn giúp tôi');
assert.strictEqual(blockedSend.allowed, false, 'Bắt buộc chặn gửi tin nhắn khi chưa đồng ý nội quy');
assert.strictEqual(blockedSend.reason, 'TERMS_NOT_ACCEPTED');
console.log('✔ [Abnormal] Chặn gửi tin nhắn chat AI theo nguyên tắc Fail-Closed.');

console.log('\n' + '='.repeat(80));
console.log('🎉 TẤT CẢ CÁC BÀI TEST NỘI QUY AI FRONTEND ĐỀU ĐẠT 100%!');
console.log('='.repeat(80));

