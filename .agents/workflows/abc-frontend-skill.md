---
description: "Quy trình phát triển Frontend toàn diện chuẩn hóa 4 trụ cột: UI Architecture, UI Design, UI Component, và UI QA cho Web React 19 và Mobile Expo"
---

# Frontend Development Workflow (`/abc-frontend-skill`)

Quy trình tự động hóa và chuẩn mực phát triển giao diện người dùng (Frontend Web & Mobile) toàn diện cho dự án WDP301, tích hợp chặt chẽ 4 trụ cột chuyên sâu:

---

## 1. Các Bước Thực Hiện Chuẩn (Execution Steps)

Khi người dùng gõ lệnh `/abc-frontend-skill` (hoặc yêu cầu phát triển UI), Agent sẽ tự động thực thi tuần tự theo 6 bước:

### Bước 1: Phân Loại Yêu Cầu & Bounded Context
- Xác định môi trường mục tiêu: **Web** (`frontend/`) hoặc **Mobile** (`mobile/`).
- Xác định Domain nghiệp vụ theo Playbook v2.0:
  - `inventory`: Thuốc, lô hàng, kiểm kê, chuyển kho, sơ đồ kho GSP 2D/3D.
  - `purchase`: Hạn mức (Quotas), NCC (Suppliers), Đơn đề xuất (PR), Đặt hàng (PO), Nhập kho (GRN).
  - `sales`: Đơn hàng, PayOS VietQR, giỏ hàng POS, voucher, đơn thuốc AI.
  - `admin` / `hr`: Quản lý nhân sự, chi nhánh, phân ca, duyệt đổi ca.
- Xác định trụ cột trọng tâm của yêu cầu:
  - `FE-ARCH`: Kiến trúc 3 tầng, tích hợp Kafka 202, kết nối Gateway, WebSockets.
  - `FE-DESIGN`: Hệ thống Design Tokens y tế, bố cục responsive, animations.
  - `FE-COMPONENT`: Xây dựng các Atomic Components tái sử dụng, bảng biểu ERP, POS cart.
  - `FE-QA`: Viết test Playwright, audit a11y, kiểm tra lỗi responsive và anti-defect checklist.

### Bước 2: Thiết Lập & Kiểm Tra Kiến Trúc 3 Tầng (`FE-ARCH`)
- **Tầng 1 - Service:** Tạo hoặc cập nhật file trong `frontend/src/services/<domain>/<name>.service.ts`.
  - Chỉ gọi qua Gateway `/api/...`.
  - Định nghĩa interface TypeScript chặt chẽ cho request và response.
- **Tầng 2 - Custom Hook:** Tạo hoặc cập nhật file trong `frontend/src/hooks/use<Feature>.ts`.
  - Quản lý `loading`, `submitting`, `error`.
  - Tích hợp **Delayed Re-fetch (1000ms)** cho các thao tác Ghi (Kafka 202 Accepted).
  - Hỗ trợ **Optimistic UI** khi xóa hoặc chuyển đổi trạng thái tức thì.
- **Tầng 3 - Component / Page:** Tạo trong `frontend/src/components/` hoặc `frontend/src/pages/`.
  - Tuyệt đối không gọi Axios hoặc fetch trực tiếp.
  - Chỉ tiêu thụ dữ liệu và hàm xử lý từ Custom Hook.

### Bước 3: Áp Dụng Design Tokens & Trải Nghiệm Người Dùng (`FE-DESIGN`)
- Sử dụng bảng màu y tế chuẩn:
  - Emerald (`#059669` / `#10b981`) cho nút chính và trạng thái Active/Success.
  - Teal (`#0d9488`) cho thông tin dược phẩm.
  - Sky Blue (`#0284c7` / `#38bdf8`) cho chuỗi lạnh GSP (`2°C - 8°C`).
  - Slate (`#0f172a` ➔ `#f8fafc`) cho text, viền, và nền bảng.
- Định dạng tiền tệ và mã vạch Barcode GS1 bằng font số đơn cách không giật layout: `font-mono tabular-nums font-semibold`.
- Đảm bảo bo góc chuẩn `rounded-xl` (Card/Modal) và `rounded-lg` (Input/Button).
- Tích hợp Skeleton Loading mượt mà khi dữ liệu đang tải.

### Bước 4: Lập Trình Linh Kiện & Chú Thích Mã Nguồn (`FE-COMPONENT`)
- Cấu trúc linh kiện rõ ràng, phân rã nhỏ thành Atoms/Molecules nếu tái sử dụng nhiều lần.
- Đảm bảo không sử dụng kiểu dữ liệu `any`.
- Thêm `aria-label` cho tất cả các nút bấm dạng Icon đơn độc.
- Gắn kết `id` của `<input>` với `htmlFor` của `<label>`.
- **QUY TẮC BẮT BUỘC:** Toàn bộ code comments (`//`, `/* */`) **phải viết bằng Tiếng Anh 100%**.

### Bước 5: Kiểm Định Tự Động & Thẩm Tra Lỗi (`FE-QA`)
- Chạy công cụ kiểm tra tự động:
  ```bash
  python3 .agents/skills/abc-frontend-skill/scripts/fe_validator.py frontend/src
  python3 .agents/skills/abc-frontend-skill/scripts/qa_auditor.py frontend/src
  ```
- Kiểm tra tính hợp lệ TypeScript:
  ```bash
  cd frontend && npm run lint
  ```
- Đối chiếu với **15-Point Anti-Defect Checklist** trước khi hoàn tất.

### Bước 6: Dừng Lại Tại Git Status (Tuân Thủ Quy Tắc An Toàn)
- Tuyệt đối **không** tự ý chạy `git commit` hay `git push`.
- Chạy `git status` để hiển thị danh sách các file đã cập nhật và dừng lại, bàn giao để lập trình viên tự kiểm tra và tự push.
- Mọi lệnh Git đặc biệt phải hỏi ý kiến xác nhận từ người dùng.
