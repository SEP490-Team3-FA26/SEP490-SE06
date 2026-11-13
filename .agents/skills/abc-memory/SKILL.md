---
name: abc-memory
description: Quy trình phân tích Business Flow, kiến trúc kỹ thuật và lập kế hoạch kiểm thử E2E chuẩn hóa cho dự án WDP301/SEP490 trước khi bắt tay thực hiện bất kỳ task nào. Tự động khởi tạo thư mục và ghi chép tài liệu phân tích vào /Users/tranhongphuoc/memory-WDP/memorry/<TASK_NAME>/business-flow.md theo đúng template mẫu chuẩn, đảm bảo tuân thủ Fullstack Playbook v2.0 và Test-Coupled Mandate. Kích hoạt khi gõ /abc-memory hoặc khi chuẩn bị bắt đầu một task mới.
---

# Quy Trình Thiết Lập Ký Ức Kỹ Thuật & Nghiệp Vụ (`/abc-memory`)

> **Triết lý cốt lõi**: *"Think & Plan First, Code Second"* - Tuyệt đối không bắt tay vào viết code, sửa logic hoặc can thiệp database khi chưa phân tích thấu đáo bối cảnh nghiệp vụ, nguyên nhân gốc rễ, luồng kiến trúc kỹ thuật và kế hoạch kiểm thử E2E.

Mọi tài liệu phân tích kỹ thuật bắt buộc phải được lưu trữ tập trung tại:
📂 `/Users/tranhongphuoc/memory-WDP/memorry/<TASK_NAME>/business-flow.md`

---

## 1. Quy Trình Kích Hoạt & Thực Thi Tự Động

Khi người dùng gõ `/abc-memory` hoặc yêu cầu phân tích task trước khi làm, Agent thực hiện 5 bước tuần tự:

### Bước 1: Nhận diện Task & Bối cảnh
- Xác định mã Task thông qua:
  1. Thư mục đã tạo sẵn trong `/Users/tranhongphuoc/memory-WDP/memorry/` (ví dụ `WDP-MOBILE-GET-MEDICINE`).
  2. Tên git branch hiện tại (`git branch --show-current`, ví dụ `fix/mobile-get-medicine` -> `WDP-MOBILE-GET-MEDICINE`).
  3. Lệnh hoặc mô tả trực tiếp từ người dùng.
- Kiểm tra và tự động tạo thư mục nếu chưa có:
  ```bash
  mkdir -p /Users/tranhongphuoc/memory-WDP/memorry/<TASK_NAME>
  ```

### Bước 2: Khảo sát Hiện Trạng & Thu Thập Dữ Liệu
- Kiểm tra các thay đổi mã nguồn đang có (`git status`, `git diff`).
- Đọc các Controller, Service, Schema, Screen UI và file test liên quan.
- Xác định các Bounded Context bị ảnh hưởng (API Gateway, Microservices, Kafka topics, Redis caching, Mobile Expo, Web React).

### Bước 3: Phân Tích & Soạn Thảo Tài Liệu Theo Template Chuẩn
- Soạn thảo tài liệu toàn diện theo đúng cấu trúc chuẩn 9 phần (chi tiết tại Mục 2 bên dưới).
- Phân tích kỹ thuật chuyên sâu:
  - Chỉ rõ hiện tượng và nguyên nhân gốc rễ (Root Cause Analysis).
  - Lập bảng danh mục User Stories bao phủ các kịch bản thực tế & biên giới (Edge cases).
  - Phác họa luồng kiến trúc dữ liệu 3 tầng (Client -> Gateway -> Kafka -> Microservice -> Database/Cache).
  - Thiết kế Ma trận kiểm thử E2E chi tiết kèm lệnh chạy test tự động.
  - Đối chiếu 100% tuân thủ Fullstack Playbook v2.0 và Test-Coupled Mandate (3 nhóm giá trị: Normal, Boundary, Abnormal).

### Bước 4: Lưu Trữ File
- Ghi nội dung vào `/Users/tranhongphuoc/memory-WDP/memorry/<TASK_NAME>/business-flow.md`.
- Đảm bảo file được định dạng Markdown chuẩn, không lỗi chính tả, chú thích rõ ràng.

### Bước 5: Báo Cáo & Xác Nhận Với Người Dùng
- Báo cáo tóm tắt các điểm then chốt đã hoàn thiện.
- Dẫn link trực tiếp tới file `business-flow.md` vừa tạo để người dùng review trước khi tiến hành code.

---

## 2. Cấu Trúc Template Chuẩn Hóa Bắt Buộc

Tài liệu `business-flow.md` cho mỗi task bắt buộc phải tuân theo cấu trúc chuẩn sau:

```markdown
# Business Flow, Phân Tích Kỹ Thuật & Kế Hoạch E2E: <MÃ_TASK>

> **Mã Ticket**: <MÃ_TASK> (Parent/Epic: <MÃ_EPIC_NẾU_CÓ>)
> **Tiêu Đề**: <Tên tiêu đề mô tả rõ ràng nghiệp vụ>
> **Repository liên quan**: <Danh sách các repo/package: backend (api-gateway, ms), mobile, web...>
> **Ngày rà soát**: <YYYY-MM-DD>
> **Trạng thái**: <Mô tả ngắn trạng thái hiện tại>

---

## 1. Bối Cảnh Nghiệp Vụ & Yêu Cầu (Problem & What We Want)
### 1.1. Vấn đề thực tế (Problem)
### 1.2. Mục tiêu mong muốn (What We Want)
### 1.3. Tiêu chí nghiệm thu (Acceptance Criteria)

---

## 2. Phân Tích Nguyên Nhân Kỹ Thuật (Root Cause Analysis)
### 2.1. Hiện tượng thực tế & Cơ chế phát sinh sự cố
### 2.2. Phân tích nguyên nhân cốt lõi (Root Cause)
### 2.3. Giải pháp xử lý triệt để

---

## 3. Danh Mục User Stories Đã Cover (Detailed User Stories & Edge Cases)
| Mã US | Tên User Story | Kịch Bản & Mô Tả | Kết Quả Mong Đợi |
| :--- | :--- | :--- | :--- |
| **US-01** | ... | ... | ... |

---

## 4. Kiến Trúc Kỹ Thuật & Luồng Dữ Liệu (Technical Architecture & Data Flow)
### 4.1. Kiến Trúc Backend (API Gateway, Kafka Topics, Microservices, Caching)
### 4.2. Kiến Trúc Frontend / Mobile (State, Screenflow, Caching, Offline-First)
### 4.3. Mô hình Dữ liệu & Cơ chế Bảo mật (SSRF, DoS, RBAC, Validation)

---

## 5. Kế Hoạch Kiểm Thử End-to-End (E2E Test Plan)
### 5.1. Ma trận kịch bản kiểm thử (Test Matrix: Scenario ID, Mục Tiêu, Preconditions, Steps, Expected Outcomes)
### 5.2. Các câu lệnh kiểm chứng tự động (Unit test, Integration test, Typecheck)

---

## 6. Rà Soát Quy Tắc Bắt Buộc (Compliance Verification)
- [ ] Tuân thủ Fullstack Playbook v2.0 (.agents/rules/trienkhaitaskmoi.md)
- [ ] Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate: Normal, Boundary, Abnormal)
- [ ] Chú thích mã nguồn 100% Tiếng Việt
- [ ] Chính sách Zero Mock Data (Dữ liệu thật từ Database/Cache)
- [ ] Cấm thông báo Google/OS, chỉ dùng In-app notifications qua Socket.IO

---

## 7. Tối Ưu Hiệu Năng & Fallback Dự Phòng (Performance & Resilience)

---

## 8. Giải Pháp Cho Các Trường Hợp Ngoại Lệ & Edge Cases

---

## 9. Kết Luận & Kế Hoạch Triển Khai Tiếp Theo
```

---

## 3. Checklist Kiểm Tra Chất Lượng Trước Khi Bắt Đầu Code

1. [x] Thư mục task trong `/Users/tranhongphuoc/memory-WDP/memorry/<TASK_NAME>` đã được tạo.
2. [x] File `business-flow.md` đã có đầy đủ 9 mục nội dung phân tích sâu sắc.
3. [x] Đã xác định rõ các Bounded Context, Topic Kafka, Endpoint API Gateway.
4. [x] Đã thiết kế sẵn bài test kẹp kèm với 3 nhóm giá trị chuẩn (`[Normal Values]`, `[Boundary Values]`, `[Abnormal Values]`).
5. [x] Người dùng đã xác nhận hoặc nắm rõ định hướng kiến trúc.

