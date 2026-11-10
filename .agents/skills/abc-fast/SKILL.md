---
name: abc-fast
description: Chế độ thực thi siêu tốc & tối ưu token context (Zero-Fluff Fast Mode) cho dự án WDP301/SEP490. Cắt giảm 75-85% token tiêu thụ, phản hồi tức thì dưới 15 dòng, định vị chính xác qua micro-search, chỉnh sửa phẫu thuật qua edit_file, kẹp test 3 nhóm giá trị chuẩn, kiểm chứng siêu tốc không tràn log (verify-fast.sh), bảo toàn 100% quy tắc dự án (Kafka 202, Redis Cache-Aside, Zero Mock Data, Comment tiếng Việt 100%). Kích hoạt khi gõ /abc-fast hoặc khi cần giải phóng context tăng tốc AI.
---

# WDP301 / SEP490 Fast Mode — High Velocity & Token Efficiency

Skill này kích hoạt **Chế độ thực thi siêu tốc (Fast Mode)** cho toàn bộ dự án **WDP301 / SEP490** (Backend NestJS Microservices, Frontend React 19 Web, Mobile Expo). 

**Mục tiêu cốt lõi:** Cắt giảm **75-85% token tiêu thụ**, giải phóng cửa sổ ngữ cảnh (Context Window) để AI không bị quá tải, phản hồi tức thì, đi thẳng vào việc, loại bỏ hoàn toàn các bước rườm rà.

---

## 1. Triết Lý 4 KHÔNG & 4 CÓ (Zero-Fluff Core Principles)

- ❌ **KHÔNG văn hoa, chào hỏi, nhắc lại câu hỏi**: Tuyệt đối không viết *"Chào bạn..."*, không giải thích lý thuyết thừa thãi, không tóm tắt lại nội dung file vừa sửa.
- ❌ **KHÔNG đọc tràn lan (Anti-Context Bloat)**: Cấm dùng `read_file` đọc cả file 300-1000 dòng nếu chỉ cần xem một hàm/endpoint. Bắt buộc dùng `StartLine` và `EndLine` khoanh vùng 30-60 dòng. Cấm search mù mờ toàn bộ workspace (luôn loại trừ `node_modules`, `dist`, `.expo`, `.git`).
- ❌ **KHÔNG in log rác ra context**: Tuyệt đối không chạy full build/test thô xuất ra hàng trăm dòng log thành công vào context. Bắt buộc dùng script `verify-fast.sh` bóp nghẹt log thừa, chỉ hiển thị lỗi nếu có.
- ❌ **KHÔNG gọi subagent hay lập plan rườm rà**: Xử lý trực tiếp, tuần tự và dứt điểm tại chỗ cho các task đơn lẻ/bug fix để triệt tiêu độ trễ và token fan-out.
- ✅ **CÓ định vị vi mô (Micro-Search & Slicing)**: Dùng grep nhắm đích thư mục con (`backend/apps/api-gateway/`, `backend/apps/*-service/`, `frontend/src/services/`, `mobile/src/screens/`), đọc đúng lát cắt cần sửa.
- ✅ **CÓ phẫu thuật code tối thiểu (Surgical Patch)**: Luôn dùng `edit_file` sửa đúng vùng code 5-30 dòng. Không ghi đè lại toàn bộ file bằng `write_file`.
- ✅ **CÓ kiểm chứng siêu tốc tinh gọn**: Dùng helper script `verify-fast.sh` để kiểm tra test rules, syntax hoặc targeted unit test chỉ trong 2-4 giây với output dưới 5 dòng.
- ✅ **CÓ bảo toàn 100% Invariants của WDP301**: Tốc độ tối đa nhưng không bao giờ phá vỡ các quy tắc kiến trúc sống còn.

---

## 2. Các Ranh Giới Bất Biến Của WDP301 / SEP490 (Invariants)

Dù ở tốc độ cao nhất, Agent **BẮT BUỘC** tuân thủ 100% các quy định sau:

1. 🔴 **COMMENT CODE BẰNG TIẾNG VIỆT 100%**: Mọi chú thích (`//`, `/* */`, JSDoc) phải viết bằng Tiếng Việt theo quy chuẩn dự án y tế/dược phẩm.
2. 🔴 **CHÍNH SÁCH ZERO MOCK DATA**: Tuyệt đối không hardcode mảng dữ liệu giả lập (`mock... = [...]`) trong Controller hoặc Service production.
3. 🔴 **TEST-COUPLED MANDATE (KẸP TEST BẮT BUỘC)**: Mọi Service/Controller mới phải kẹp bài test `*.spec.ts` tương ứng chia đủ 3 nhóm giá trị:
   - `[Normal Values]`: Luồng nghiệp vụ chuẩn, thành công.
   - `[Boundary Values]`: Giá trị biên, tối thiểu, tối đa, 0, 1 đơn vị, idempotency.
   - `[Abnormal Values]`: Ngoại lệ, dữ liệu rỗng, sai định dạng, tấn công giả mạo.
4. 🔴 **KAFKA EVENT-DRIVEN & REDIS CACHE-ASIDE**:
   - Tác vụ Ghi (Create/Update/Delete) trả về **HTTP 202 ACCEPTED** qua Kafka.
   - Tác vụ Đọc (Read) áp dụng Cache-Aside: Đọc Redis -> Miss gọi DB -> Lưu Redis.
   - Cập nhật/Xóa phải Evict Redis Cache tương ứng.
5. 🔴 **API GATEWAY BOUNDED CONTEXT**: Mọi endpoint Gateway phải có tiền tố `/api/...` (VD: `/api/medicines`, `/api/quotas`).
6. 🔴 **CẤM THÔNG BÁO GOOGLE / OS / TRÌNH DUYỆT**: Tuyệt đối không dùng Web Notification API, native OS push, FCM. Chỉ dùng thông báo in-app nội bộ (Socket.IO, Toast, Dropdown).
7. 🔴 **GIT AN TOÀN & BẢO MẬT**: Tuyệt đối không tự ý push code lên Git. Dừng lại ở kiểm tra hoặc `git status` để người dùng chủ động review.

---

## 3. Quy Trình 4 Bước Thần Tốc (Fast 4-Step Loop)

```text
[1. Micro-Search & Slicing] ──► [2. Surgical Patch] ──► [3. Fast Test-Couple] ──► [4. Fast Verify & Output]
    Grep nhắm đích thư mục          edit_file targeted       Kẹp test 3 nhóm giá trị    verify-fast.sh (lọc log)
    Chỉ đọc 30-60 dòng code         sửa đúng khối 5-30 dòng   (Normal, Boundary, Abnorm) Output < 15 dòng
```

### Bước 1: Micro-Search & Slicing (Tìm kiếm vi mô)
- Grep chính xác file hoặc tên hàm trong thư mục hẹp (VD: `backend/apps/inventory-service/src/...`).
- Xác định số dòng và chỉ dùng `read_file` với `StartLine: N-10` và `EndLine: N+50`.

### Bước 2: Surgical Patch (Phẫu thuật mã nguồn)
- Dùng `edit_file` thay thế chính xác block code cần sửa.
- Giữ nguyên các comment tiếng Việt và logic xung quanh, không làm thay đổi các file không liên quan.

### Bước 3: Fast Test-Couple (Kẹp bài test chuẩn hóa nếu có code mới)
- Nếu tạo Service/Controller mới hoặc thêm method nghiệp vụ mới: Kẹp ngay test case với đủ 3 nhóm `[Normal Values]`, `[Boundary Values]`, `[Abnormal Values]` (xem mẫu tại `references/fast-rules.md`).

### Bước 4: Fast Verify & Output (Kiểm chứng siêu tốc & Báo cáo)
- Chạy kiểm tra siêu tốc bằng script helper (không tràn log vào context):
  ```bash
  # Kiểm tra Test Rules & Architecture (1s):
  ./.agents/skills/abc-fast/scripts/verify-fast.sh rules

  # Hoặc kiểm tra nhanh combo Rules + Syntax:
  ./.agents/skills/abc-fast/scripts/verify-fast.sh quick

  # Hoặc chạy test nhắm đích file vừa sửa:
  ./.agents/skills/abc-fast/scripts/verify-fast.sh test [TênFileSpec]
  ```
- Trả lời người dùng theo **Compact Output Format** dưới đây.

---

## 4. Định Dạng Phản Hồi Chuẩn (Compact Output Format)

Mọi phản hồi trong chế độ Fast Mode bắt buộc phải ngắn gọn, súc tích (dưới 15 dòng):

```markdown
🎯 **Kết quả**: [1 câu mô tả chính xác việc đã xử lý]

📁 **File thay đổi**:
- [`FileName.ts:45-60`](file:///path/to/FileName.ts#L45-L60): [Tóm tắt thay đổi trong 1 dòng]

🧪 **Kiểm chứng**:
- Test Rules: ✅ Pass (6/7 quy tắc, 0 lỗi)
- Syntax & Null-Safety: ✅ Pass
- Targeted Test: ✅ Pass (hoặc: Không đổi logic test)

💡 **Lưu ý**: [Chỉ ghi 1 dòng nếu có rủi ro hoặc điểm cần user lưu ý, còn lại bỏ qua]
```
