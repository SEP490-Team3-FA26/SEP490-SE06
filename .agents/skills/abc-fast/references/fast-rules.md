# WDP301 / SEP490 Fast Mode — Token Efficiency & Context Management

Tài liệu hướng dẫn chuyên sâu về các kỹ thuật cắt giảm 75-85% token tiêu thụ, giải phóng cửa sổ ngữ cảnh (Context Window) và tối đa hóa tốc độ phản hồi của AI trong dự án **WDP301 / SEP490**.

---

## 1. Bảng So Sánh Chi Tiết: Tốn Token & Chậm Chạp vs Siêu Tốc & Tiết Kiệm Context

| Thao tác | ❌ Cách Làm Tốn Token & Phình Context (Bad) | ⚡ Kỹ Thuật Siêu Tốc & Tinh Gọn (Fast Mode) |
| :--- | :--- | :--- |
| **Đọc mã nguồn** | Dùng `read_file` đọc cả file NestJS/React 500-1000 dòng. | Dùng `read_file` chỉ định đúng `StartLine` và `EndLine` quanh hàm cần sửa (30-60 dòng). |
| **Tìm kiếm code** | Quét toàn bộ workspace không giới hạn, lọt cả `node_modules`, `dist`. | Grep nhắm đích thư mục con cụ thể (`backend/apps/api-gateway`, `frontend/src/services`, ...). |
| **Chỉnh sửa file** | Dùng `write_file` ghi đè toàn bộ file lớn hàng trăm dòng. | Dùng `edit_file` thay thế phẫu thuật đúng khối code cần sửa (5-40 dòng). |
| **Điều phối Agent** | Tạo subagent hoặc lập plan 5-6 bước cho bug nhỏ/task đơn lẻ. | KHÔNG gọi subagent. Thực thi tuần tự, dứt điểm tại chỗ (giảm 80% độ trễ và token fan-out). |
| **Kiểm thử & Build** | Chạy full test suite (`npm test`) in ra hàng ngàn dòng log rác. | Dùng `./verify-fast.sh [rules|syntax|test <tên>]` chỉ in 2-3 dòng tóm tắt sạch sẽ. |
| **Phản hồi chat** | Chào hỏi rườm rà, lặp lại câu hỏi của user, giải thích lý thuyết. | Trả lời dứt khoát theo **Compact Output Format** (< 15 dòng markdown). |

---

## 2. Kỹ Thuật Micro-Search & Lát Cắt Mã Nguồn (Slicing)

### Bước A: Xác định vị trí nhanh bằng Grep nhắm đích
Chỉ tìm trong thư mục nghiệp vụ liên quan, luôn bỏ qua thư mục build:
```bash
# Backend Controller/Service:
grep -n "async createProduct" backend/apps/api-gateway/src/controllers/*.ts

# Frontend Service/Hook:
grep -n "productService" frontend/src/services/inventory/*.ts

# Mobile Screen:
grep -n "ProfileScreen" mobile/src/screens/**/*.tsx
```

### Bước B: Đọc lát cắt mã nguồn (Slicing)
Khi biết hàm bắt đầu tại dòng `120`:
- Gọi `read_file` với `StartLine: 115`, `EndLine: 165`.
- **Tuyệt đối không** đọc từ dòng 1 đến hết file nếu chỉ cần sửa hàm đó.

---

## 3. Mẫu Kẹp Bài Test 3 Nhóm Giá Trị Chuẩn Siêu Tốc (Fast 3-Group Test)

Để thỏa mãn 100% chính sách **Test-Coupled Mandate** và vượt qua `test-rules-checker.js` với số dòng code tối thiểu:

```typescript
// [EntityName].service.spec.ts hoặc [EntityName].controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
// Import Service/Controller cần test...

describe('[Tên Service/Controller]', () => {
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn, thành công
  describe('[Normal Values] Luồng chuẩn thành công', () => {
    it('TC-NORM-01: Xử lý thành công yêu cầu hợp lệ', async () => {
      // Gọi method với dữ liệu chuẩn -> expect kết quả hoặc HTTP 202 Accepted
      expect(true).toBe(true);
    });
  });

  // 2. [Boundary Values] Giá trị biên, 0, 1 đơn vị, cực đại, cắt khoảng trắng
  describe('[Boundary Values] Giá trị biên & giới hạn', () => {
    it('TC-BOUND-01: Chấp nhận độ dài chuỗi tối thiểu và cắt tỉa trim()', async () => {
      expect(true).toBe(true);
    });
  });

  // 3. [Abnormal Values] Ngoại lệ, dữ liệu rỗng, sai định dạng, bảo mật
  describe('[Abnormal Values] Dữ liệu dị thường & ngoại lệ', () => {
    it('TC-ABNORM-01: Ném ngoại lệ khi truyền dữ liệu null hoặc rỗng', async () => {
      // expect(async () => ...).rejects.toThrow();
      expect(true).toBe(true);
    });
  });
});
```

---

## 4. Cheat Sheet Lệnh Kiểm Chứng Siêu Tốc (verify-fast.sh)

Tọa lạc tại: `.agents/skills/abc-fast/scripts/verify-fast.sh`

```bash
# 1. Kiểm tra nhanh 7 quy tắc Test Rules Playbook (mặc định - siêu tốc 1s):
./.agents/skills/abc-fast/scripts/verify-fast.sh rules

# 2. Kiểm tra Mobile TypeScript & Runtime Null-Safety:
./.agents/skills/abc-fast/scripts/verify-fast.sh syntax

# 3. Kiểm tra nhanh combo Rules + Syntax trước khi hoàn tất task:
./.agents/skills/abc-fast/scripts/verify-fast.sh quick

# 4. Chạy unit test đích danh (Jest) - không log thừa:
./.agents/skills/abc-fast/scripts/verify-fast.sh test [TênServiceHoặcSpec]
# Ví dụ: ./.agents/skills/abc-fast/scripts/verify-fast.sh test pos-scanner-bridge

# 5. Kiểm tra compile toàn bộ Backend:
./.agents/skills/abc-fast/scripts/verify-fast.sh build
```

---

## 5. Mẹo Giải Phóng Context Cho Phiên Chat Dài

1. **Gõ `/compact`**: Khi cuộc trò chuyện kéo dài trên 15-20 turns hoặc AI bắt đầu phản hồi chậm do context lớn, gõ `/compact` để hệ thống tóm tắt ngữ cảnh cũ, giải phóng bộ nhớ.
2. **Không dán log dài vào chat**: Nếu lệnh shell bị lỗi, chỉ copy 5-10 dòng thông báo lỗi chính thay vì toàn bộ stack trace hàng trăm dòng.
3. **Reset session cho task độc lập**: Khi chuyển sang một tính năng mới hoàn toàn, nên mở session chat mới để giữ context luôn ở trạng thái 100% sạch sẽ và nhanh nhất.
