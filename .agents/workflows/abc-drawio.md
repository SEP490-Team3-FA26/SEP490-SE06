---
description: "Tự động thiết kế, sinh mã nguồn XML chuẩn và kiểm tra sơ đồ kiến trúc Draw.io (.drawio) cho hệ thống WDP301"
---

# Draw.io Architecture Workflow (`/abc-drawio`)

Quy trình tự động hóa thiết kế và chuẩn hóa sơ đồ kiến trúc phần mềm Draw.io:

---

## 1. Các Bước Thực Hiện (Execution Steps)

Khi người dùng gõ lệnh `/abc-drawio`, Agent sẽ thực hiện theo 6 bước chuẩn:

1. **Xác định loại sơ đồ và ngữ cảnh (Diagram Context)**:
   - Phân loại: Package Diagram, Sequence Diagram, Use Case, Class Diagram, hoặc Screenflow.
   - Xác định phân hệ: Mobile App (`mobile/`), Web Frontend (`frontend/`), Backend Microservices (`backend/`), hoặc Liên kết toàn hệ thống.

2. **Quét dữ liệu thực tế từ mã nguồn (Ground-Truth Inspection)**:
   - Duyệt cấu trúc thư mục, màn hình, services, controllers, và endpoints thực tế trong codebase để đảm bảo các package phản ánh chính xác 100% hiện trạng dự án.

3. **Áp dụng bảng màu & Quy chuẩn hình học WDP301**:
   - Sử dụng chuẩn hình khối `shape=folder` cho UML Package, `swimlane` cho nhóm phân hệ.
   - Bảng màu: Vàng (`#fff2cc` - Entry/Routing), Xanh dương (`#dae8fc` - Context/Container), Xanh lá (`#d5e8d4` - Screens/Pages), Tím (`#e1d5e7` - Components), Cam (`#ffe6cc` - Services/Gateways), Xám (`#f5f5f5` - Utils/Hardware/DB).
   - Tọa độ và kích thước tính toán logic, tránh đè chéo các node và bo góc đường nối `edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1;`.

4. **Ghi trực tiếp file `.drawio` vào thư mục `docs/`**:
   - Thư mục lưu trữ:
     - `docs/uml/` (Package Diagrams: `be-uml.drawio`, `fe-uml.drawio`, `mobile-uml.drawio`)
     - `docs/sequence_diagrams/`
     - `docs/usecase/`
     - `docs/screenflow diagram/`

5. **Chạy script kiểm tra cú pháp tự động (XML Validation)**:
   - Thực thi trình kiểm tra tính toàn vẹn:
     ```bash
     python3 .agents/skills/abc-drawio/scripts/drawio_validator.py <đường_dẫn_file.drawio>
     ```
   - Đảm bảo 0 lỗi XML parser, không trùng lặp ID, và không đứt gãy edge references.

6. **Hiển thị trực quan (Dual Output)**:
   - Tạo Mermaid Diagram tương ứng để người dùng xem trước tức thì trên Markdown.
   - Hướng dẫn mở trực tiếp file `.drawio` bằng VS Code Draw.io Extension hoặc Draw.io Desktop.
