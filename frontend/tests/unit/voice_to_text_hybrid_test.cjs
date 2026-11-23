// frontend/tests/unit/voice_to_text_hybrid_test.cjs
/**
 * =========================================================================
 * KIỂM THỬ ĐƠN VỊ CƠ CHẾ NHẬN DIỆN GIỌNG NÓI HYBRID (VOICE-TO-TEXT STT)
 * Tuân thủ quy tắc kẹp bài test bắt buộc (Test-Coupled Mandate)
 * Đầy đủ 3 nhóm chuẩn Guideline:
 *   1. [Normal Values]: Luồng Web Speech trên Chrome & Whisper AI Backend
 *   2. [Boundary Values]: Ranh giới dung lượng file âm thanh, khoảng trắng, ghép chuỗi
 *   3. [Abnormal Values]: Brave chặn Google Speech, từ chối quyền Mic, ngoại lệ mạng
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

const assert = require('assert');

// 1. Hàm thuần ghép chuỗi văn bản nhận diện giọng nói
function combineTranscript(baseText, newTranscript) {
  const base = (baseText || "").trim();
  const transcript = (newTranscript || "").trim();
  if (!base) return transcript;
  if (!transcript) return base;
  return `${base} ${transcript}`;
}

// 2. Hàm thuần xác định xem có cần kích hoạt tầng Whisper AI Backend hay không
function shouldFallbackToWhisper(hasWebSpeechResult, audioBlobSize, minAudioSize = 500) {
  // Nếu Web Speech API đã nhận diện thành công trên trình duyệt (như Chrome), không cần gọi Whisper Backend
  if (hasWebSpeechResult) return false;
  // Nếu Web Speech không có kết quả (Brave, Firefox, Safari) và dung lượng file ghi âm đủ lớn (> 500 bytes)
  if (audioBlobSize > minAudioSize) return true;
  return false;
}

// 3. Hàm thuần xác định thông điệp lỗi Microphone / Voice Input
function getVoiceErrorMessage(errorCode) {
  switch (errorCode) {
    case 'not-allowed':
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return "Vui lòng cấp quyền truy cập Microphone trong trình duyệt.";
    case 'no-speech':
      return null; // Không cần báo lỗi ồn ào khi người dùng tạm thời chưa nói
    case 'audio-too-small':
      return "Không nhận diện được giọng nói. Vui lòng nói to và thử lại.";
    case 'network-stt-failed':
      return "Không thể xử lý âm thanh từ máy chủ AI.";
    case 'unsupported-browser':
      return "Trình duyệt không hỗ trợ microphone hoặc ghi âm.";
    default:
      return "Không nhận diện được giọng nói. Vui lòng thử lại.";
  }
}

// 4. Hàm thuần chuẩn hóa kết quả phản hồi từ Backend AI Whisper
function parseTranscribeResponse(response) {
  if (!response) return "";
  if (typeof response === "string") return response.trim();
  const text = response.text || response.transcribed_text || "";
  return text.trim();
}

console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ VOICE-TO-TEXT HYBRID...\n");

// =========================================================================
// NHÓM 1: [Normal Values] - Luồng nghiệp vụ chuẩn
// =========================================================================
console.log("--- 1. [Normal Values] Luồng hoạt động chuẩn ---");

// Test 1.1: Ghép chuỗi văn bản nói tiếp vào nội dung có sẵn
const normalText = combineTranscript("Tôi muốn mua", "thuốc cảm Panadol");
assert.strictEqual(normalText, "Tôi muốn mua thuốc cảm Panadol", "Test 1.1 Thất bại: Ghép chuỗi văn bản không chính xác");
console.log("  ✅ Test 1.1: Ghép nối câu nói vào văn bản có sẵn thành công");

// Test 1.2: Fallback sang Whisper khi Web Speech không có kết quả (trên Brave)
const needWhisperOnBrave = shouldFallbackToWhisper(false, 3500); // 3.5KB âm thanh
assert.strictEqual(needWhisperOnBrave, true, "Test 1.2 Thất bại: Phải kích hoạt Whisper khi Web Speech rỗng");
console.log("  ✅ Test 1.2: Tự động kích hoạt tầng Whisper AI khi chạy trên Brave");

// Test 1.3: Không gọi Whisper khi Web Speech đã bóc tách thành công (trên Chrome)
const skipWhisperOnChrome = shouldFallbackToWhisper(true, 3500);
assert.strictEqual(skipWhisperOnChrome, false, "Test 1.3 Thất bại: Không được gọi Whisper khi đã có kết quả Web Speech");
console.log("  ✅ Test 1.3: Bỏ qua Whisper giúp tiết kiệm tài nguyên khi Chrome đã nhận diện");

// Test 1.4: Phân tích kết quả trả về từ Groq Whisper STT API
const apiResult = parseTranscribeResponse({ success: true, text: "Bé 3 tuổi bị sốt nhẹ ho khan" });
assert.strictEqual(apiResult, "Bé 3 tuổi bị sốt nhẹ ho khan", "Test 1.4 Thất bại: Parse kết quả API sai");
console.log("  ✅ Test 1.4: Chuẩn hóa kết quả trả về từ Backend AI Whisper thành công");

// =========================================================================
// NHÓM 2: [Boundary Values] - Ranh giới dung lượng, khoảng trắng, biên
// =========================================================================
console.log("\n--- 2. [Boundary Values] Kiểm tra giá trị biên & Ranh giới ---");

// Test 2.1: Bắt đầu khi ô tìm kiếm/nhập liệu rỗng (không có khoảng trắng thừa phía trước)
const textFromEmpty = combineTranscript("", "Panadol Extra");
assert.strictEqual(textFromEmpty, "Panadol Extra", "Test 2.1 Thất bại: Chuỗi bắt đầu rỗng bị thừa khoảng trắng");
console.log("  ✅ Test 2.1: Nhận diện khi ô nhập ban đầu rỗng không bị thừa khoảng trắng");

// Test 2.2: Xử lý khoảng trắng thừa đầu và cuối ở cả 2 vế
const textWithSpaces = combineTranscript("   Men tiêu hóa   ", "   BioGaia   ");
assert.strictEqual(textWithSpaces, "Men tiêu hóa BioGaia", "Test 2.2 Thất bại: Không cắt tỉa khoảng trắng chuẩn xác");
console.log("  ✅ Test 2.2: Tự động loại bỏ khoảng trắng thừa giữa các từ");

// Test 2.3: Ranh giới kích thước âm thanh biên (500 bytes)
assert.strictEqual(shouldFallbackToWhisper(false, 501), true, "Test 2.3a Thất bại: 501 bytes phải cho phép gửi");
assert.strictEqual(shouldFallbackToWhisper(false, 500), false, "Test 2.3b Thất bại: 500 bytes biên không được gửi");
assert.strictEqual(shouldFallbackToWhisper(false, 499), false, "Test 2.3c Thất bại: 499 bytes không được gửi");
console.log("  ✅ Test 2.3: Ranh giới âm thanh 500 bytes ngăn ngừa gửi gói tin rỗng không có tiếng nói");

// Test 2.4: Transcript rỗng từ Web Speech không làm thay đổi văn bản gốc
const textUnchanged = combineTranscript("Vitamin C 1000mg", "");
assert.strictEqual(textUnchanged, "Vitamin C 1000mg", "Test 2.4 Thất bại: Transcript rỗng làm mất text cũ");
console.log("  ✅ Test 2.4: Bảo toàn văn bản cũ khi người dùng không phát ra âm thanh");

// =========================================================================
// NHÓM 3: [Abnormal Values] - Dị thường, lỗi quyền, chặn kết nối
// =========================================================================
console.log("\n--- 3. [Abnormal Values] Dữ liệu dị thường & Ngoại lệ hệ thống ---");

// Test 3.1: Người dùng bấm Block quyền microphone trong trình duyệt
const notAllowedMsg = getVoiceErrorMessage("NotAllowedError");
assert.strictEqual(notAllowedMsg, "Vui lòng cấp quyền truy cập Microphone trong trình duyệt.");
console.log("  ✅ Test 3.1: Bắt lỗi từ chối quyền microphone và hướng dẫn rõ ràng");

// Test 3.2: Lỗi 'no-speech' không hiển thị cảnh báo đỏ gây khó chịu
const noSpeechMsg = getVoiceErrorMessage("no-speech");
assert.strictEqual(noSpeechMsg, null);
console.log("  ✅ Test 3.2: Im lặng với lỗi no-speech tránh spam popup cảnh báo");

// Test 3.3: Lỗi âm thanh quá nhỏ / chỉ có tiếng rè
const smallAudioMsg = getVoiceErrorMessage("audio-too-small");
assert.strictEqual(smallAudioMsg, "Không nhận diện được giọng nói. Vui lòng nói to và thử lại.");
console.log("  ✅ Test 3.3: Nhắc nhở người dùng nói to và rõ hơn khi chỉ có tạp âm");

// Test 3.4: Trình duyệt cổ hoặc Webview không hỗ trợ getUserMedia
const unsupportedMsg = getVoiceErrorMessage("unsupported-browser");
assert.strictEqual(unsupportedMsg, "Trình duyệt không hỗ trợ microphone hoặc ghi âm.");
console.log("  ✅ Test 3.4: Bắt ngoại lệ trình duyệt không hỗ trợ API âm thanh");

// Test 3.5: Parse dữ liệu phản hồi Backend AI bị null/undefined/sai cấu trúc
assert.strictEqual(parseTranscribeResponse(null), "");
assert.strictEqual(parseTranscribeResponse({}), "");
assert.strictEqual(parseTranscribeResponse({ text: "   " }), "");
console.log("  ✅ Test 3.5: Phòng vệ an toàn với dữ liệu backend bất thường (Fail-safe)");

console.log("\n🎉 TẤT CẢ 13/13 BÀI KIỂM THỬ VOICE-TO-TEXT HYBRID ĐÃ VƯỢT QUA 100%!");
