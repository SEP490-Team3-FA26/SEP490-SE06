---
name: abc-drawio
description: >-
  Tự động hóa thiết kế, sinh mã và kiểm tra chuẩn định dạng sơ đồ kiến trúc Draw.io (.drawio)
  cho hệ thống WDP301: Package Diagram (Backend, Frontend, Mobile), Sequence Diagram, Use Case,
  Class Diagram, và Screenflow Diagram. Tuân thủ bảng màu chuẩn, cấu trúc mxGraphModel,
  stereotypes UML, và tự động kiểm tra cú pháp XML.
---

# Draw.io Architecture & Diagramming Skill (`abc-drawio`)

Kỹ năng này cung cấp giải pháp toàn diện cho việc tự động hóa thiết kế, sinh mã nguồn XML chuẩn, cập nhật và kiểm thử các sơ đồ kiến trúc phần mềm định dạng **Draw.io (`.drawio`)** cho toàn bộ hệ thống monorepo WDP301.

---

## 1. Mục Đích & Phạm Vi Áp Dụng (When to Use)

Kích hoạt kỹ năng này khi:
1. Người dùng gõ lệnh `/abc-drawio` trong thanh chat.
2. Người dùng yêu cầu vẽ hoặc cập nhật sơ đồ:
   - **Package Diagram** (Backend Microservices, React Web Frontend, React Native Expo Mobile).
   - **Sequence Diagram** (Luồng xác thực, Đặt hàng VietQR PayOS, Nhập kho GRN, Kiểm kê GSP).
   - **Use Case Diagram** (Theo Actor: Branch Manager, Pharmacist, Warehouse, Admin; theo Module: Procurement, Marketing).
   - **Screenflow Diagram** (Luồng chuyển màn hình Web & Mobile).
   - **System Class Diagram** (Cấu trúc Domain Models, DTOs, Schemas).
3. Cần kiểm tra cú pháp XML (syntax, duplicate ID, dangling edges) của bất kỳ file `.drawio` nào trong thư mục `docs/`.

---

## 2. Quy Chuẩn Màu Sắc & Kiểu Dáng (Design Tokens & Color Palette)

Mọi sơ đồ `.drawio` sinh ra phải tương thích 100% với **Draw.io Desktop (Electron)**, **VS Code Draw.io Extension**, và [app.diagrams.net](https://app.diagrams.net). Tuân thủ nghiêm ngặt bảng màu chuẩn của dự án WDP301:

| Thành phần kiến trúc | Shape / Type | Nền (fillColor) | Viền (strokeColor) | Chữ (fontColor) | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Main Container** | `swimlane` | `#dae8fc` | `#6c8ebf` | `#333333` | Vùng bao ứng dụng (Web, Mobile Client, Microservices) |
| **Entry & Routing** | `shape=folder` | `#fff2cc` | `#d6b656` | `#333333` | Entry point (`App.tsx`, `index.ts`), Navigators, External Pay |
| **State & Context** | `shape=folder` | `#dae8fc` | `#6c8ebf` | `#333333` | AuthContext, NotificationContext, TimerContext, Redux |
| **Screens / Pages** | `shape=folder` | `#d5e8d4` | `#82b366` | `#333333` | Màn hình chức năng phân quyền theo role (auth, customer, warehouse...) |
| **Components / UI** | `shape=folder` | `#e1d5e7` | `#9673a6` | `#333333` | UI library, Card, Modal, Barcode Scanner, Warehouse Shelf |
| **Services / Gateway** | `shape=folder` | `#ffe6cc` | `#d79b00` | `#333333` | Service gọi API, HTTP REST Gateway, PayOS, Socket.IO |
| **Utils / Types / DB** | `shape=folder` | `#f5f5f5` | `#666666` | `#333333` | Helpers, AsyncStorage, TypeScript Types, MongoDB, Redis |
| **Infrastructure** | `swimlane` | `#647687` | `#314354` | `#ffffff` | Cụm hạ tầng Cloud (AWS, Docker, Kubernetes, Kafka) |

---

## 3. Cấu Trúc Khung Mẫu XML Chuẩn (Standard Draw.io Template)

Tất cả các file `.drawio` phải có cấu trúc XML chuẩn sau:

```xml
<mxfile host="Electron">
  <diagram name="Diagram-Name" id="unique-diagram-id">
    <mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1150" pageHeight="780" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- Tiêu đề sơ đồ -->
        <mxCell id="2" parent="1" style="text;html=1;align=center;verticalAlign=top;fontSize=15;fontStyle=1;strokeColor=none;fillColor=none;whiteSpace=wrap;" value="<b>Tiêu Đề Sơ Đồ</b><hr>" vertex="1">
          <mxGeometry height="32" width="1050" x="40" y="20" as="geometry" />
        </mxCell>
        <!-- Các phần tử vertex và edge -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### Quy chuẩn đường liên kết UML (Edges & Stereotypes)
* Kiểu đường: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;endArrow=open;endFill=0;fontSize=9;labelBackgroundColor=#ffffff;`
* Stereotypes thông dụng:
  - `«route»`: Điều hướng màn hình.
  - `«consume»`: Đọc trạng thái từ Context / State Store.
  - `«render»`: Hiển thị Component / UI widget.
  - `«call»`: Gọi hàm dịch vụ hoặc HTTP REST Endpoint.
  - `«use»` / `«import»`: Nhập thư viện, module, hoặc types.
  - `«message»`: Giao tiếp hàng đợi thông điệp (Kafka broker).
  - `«hardware»`: Tương tác phần cứng thiết bị (Camera, Biometrics, Push Notification).
  - `«pay»`: Giao dịch cổng thanh toán bên thứ ba (VietQR PayOS).

---

## 4. Quy Chuẩn Sơ Đồ Trình Tự & Sơ Đồ Lớp (Sequence & Class Diagram Standards)

### 4.1. Quy Chuẩn Sequence Diagram (6-Lifeline Message-Driven Architecture)
Mọi sơ đồ Sequence Diagram trong WDP301 đều tuân thủ kiến trúc phân tầng chuẩn 6 Lifelines theo trục hoành:
1. **Actor** (`x=40`): Người dùng hoặc thiết bị kích hoạt (Customer, Pharmacist, Warehouse Specialist, Shipper, IoT Sensor, Cron).
2. **Client UI** (`x=220`): Ứng dụng giao diện (React 19 Web Portal, React Native Expo Mobile App, POS Terminal, Shipper Scanner).
3. **API Gateway** (`x=400`): NestJS API Gateway (JWT Guard, RBAC, ValidationPipe, Rate Limiter, Reverse Proxy).
4. **Kafka Broker** (`x=580`): Message Bus phân tán (`emit()` cho Event-Driven async, `send()` cho Request-Response sync).
5. **Microservice** (`x=760`): Dịch vụ nghiệp vụ độc lập (`auth-service`, `user-service`, `inventory-service`, `orders-service`, `supplier-service`, `finance-service`, `reports-service`, `ai-service`).
6. **Data Store** (`x=940`): Cơ sở dữ liệu và Cache (`MongoDB Database`, `Redis Cache`, `AWS S3`, `Gemini AI Engine`).

> [!CAUTION]
> **Quy định bất biến khi sinh XML Sequence Diagram:**
> Không được đặt thuộc tính `y="..."` bên trong thẻ `<mxGeometry relative="1" as="geometry">` của cạnh nối (Edge). Thuộc tính `y` trên geometry sẽ làm lệch tọa độ nhãn văn bản (label displacement). Tọa độ dọc của mũi tên chỉ được xác định tại `sourcePoint` và `targetPoint` (`<mxPoint x="..." y="..." as="sourcePoint" />`).

### 4.2. Quy Chuẩn Class Diagram (Domain-Driven Stereotypes)
Mỗi Use Case được mô hình hóa bằng 4 - 5 lớp bơi (Swimlane Classes) sắp xếp trên lưới 2 hàng x 3 cột:
- **`<<DTO>>`** (Màu hồng đào `#f8cecc` / viền `#b85450`): Data Transfer Object với phương thức xác thực `validate()`.
- **`<<Controller>>`** (Màu tím nhạt `#e1d5e7` / viền `#9673a6`): NestJS Controller tiếp nhận HTTP Request và điều phối Kafka Client.
- **`<<Service>>`** (Màu xanh dương `#dae8fc` / viền `#6c8ebf`): Domain Service xử lý logic nghiệp vụ và giao dịch dữ liệu.
- **`<<Entity>>` / `<<Schema>>`** (Màu xanh lá `#d5e8d4` / viền `#82b366`): Mongoose Document Schema lưu trữ thực thể cơ sở dữ liệu.
- **`<<Secondary>>`** (Màu vàng nhạt `#fff2cc` / viền `#d6b656`): Dịch vụ phụ trợ, Cache Redis, SQS Email Worker, hoặc tích hợp AI.

> [!IMPORTANT]
> Tất cả các thẻ HTML bên trong thuộc tính `value="..."` của XML Draw.io bắt buộc phải được mã hóa thực thể (HTML entity escaped):
> - Đường kẻ ngăn cách thuộc tính và phương thức: `&lt;hr/&gt;`
> - Ngắt dòng: `&lt;br/&gt;`
> - Dấu ngoặc nhọn TypeScript generics: `&lt;` và `&gt;` (ví dụ `Promise&lt;Order&gt;`, `Model&lt;MedicineBatch&gt;`).

---

## 5. Quy Trình Xuất Hình Ảnh Độ Phân Giải Cao (Fast Headless Diagrams.net Native Export)

Để sinh hình ảnh PNG sắc nét (300 DPI, Retina scale 2x) từ file `.drawio` phục vụ báo cáo tốt nghiệp và tài liệu kỹ thuật mà **không bị cắt xén mép viền (Zero-clipping)**:
1. Sử dụng Playwright tương tác với `https://viewer.diagrams.net/?embed=1&proto=json&spin=1` thông qua giao thức `postMessage`.
2. Áp dụng cơ chế **Native Canvas Export**:
   - Tải Viewer một lần duy nhất (`Single-Page Reuse`).
   - Nạp XML qua sự kiện `action: 'load'`.
   - Gửi yêu cầu trích xuất native:
     ```javascript
     frame.contentWindow.postMessage(JSON.stringify({
         action: 'export',
         format: 'png',
         border: 20,
         scale: 2
     }), '*');
     ```
   - Nhận chuỗi `data:image/png;base64,...` trực tiếp từ sự kiện `export`.
3. Ưu điểm vượt trội:
   - **Tự động tính toán vùng bao chính xác 100%**: Không cần hardcode tọa độ `clip_rect`, loại bỏ hoàn toàn hiện tượng bị mất lifeline bên phải hoặc thông điệp ở đáy.
   - **Đệm đều 20px (border)**: Giúp hình vẽ cân đối, cách đều lề tài liệu.
   - **Độ nét 2x**: Đảm bảo đọc rõ từng thuộc tính phương thức và chữ số.
   - **Tốc độ cực nhanh**: Chỉ mất ~0.4s/sơ đồ (sinh toàn bộ 102 sơ đồ chỉ trong ~45 giây).

---

## 6. Công Cụ Kiểm Tra Cú Pháp Tự Động (Validation Tool)

Mỗi khi tạo mới hoặc chỉnh sửa file `.drawio`, **bắt buộc** chạy script kiểm tra:

```bash
python3 .agents/skills/abc-drawio/scripts/drawio_validator.py <đường_dẫn_file.drawio>
```

Script sẽ tự động:
1. Phân tích cú pháp XML (`xml.etree.ElementTree`).
2. Phát hiện các ID trùng lặp (`duplicate cell IDs`).
3. Phát hiện các đường liên kết đứt gãy (`dangling edge source/target`).
4. Thống kê tổng số lượng phần tử (`Total vertices`, `Total edges`).

---

## 7. Quy Chuẩn Thư Mục Lưu Trữ Trong Dự Án (`docs/`)

| Loại sơ đồ | Thư mục lưu trữ quy ước | Tên file quy chuẩn |
| :--- | :--- | :--- |
| **Package Diagram** | `docs/uml/` | `be-uml.drawio`, `fe-uml.drawio`, `mobile-uml.drawio` |
| **Sequence Diagram**| `docs/sequence_diagrams/` | `<feature>_sequence_diagram.drawio` |
| **Use Case Diagram**| `docs/usecase/by_actor/` & `by_module/` | `uc_actor_<role>.drawio`, `uc_module_<domain>.drawio` |
| **Class Diagram**   | `docs/class_diagrams/` | `UC-XX_<Feature>_ClassDiagram.drawio` |
| **Screenflow**      | `docs/screenflow diagram/` | `<role>_screenflow_diagram.drawio` |

---

## 8. Quy Trình Phản Hồi Cho Người Dùng (Dual Output Standard)

Khi thực hiện yêu cầu vẽ sơ đồ:
1. **Ghi trực tiếp file `.drawio`** vào đúng thư mục đích trong `docs/`.
2. **Chạy script kiểm tra cú pháp** để đảm bảo file mở được 100% không lỗi.
3. **Cung cấp sơ đồ Mermaid tương đương** trong câu trả lời hoặc file báo cáo để người dùng có thể xem trước trực quan ngay lập tức trong cửa sổ chat hoặc trình duyệt Markdown.

