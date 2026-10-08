# KẾ HOẠCH TRIỂN KHAI & BÁO CÁO HOÀN TẤT: SCRUM-92 (UC-67 & UC-72, UC-68 / UC-104)

> **Mã Ticket Jira**: `SCRUM-92`  
> **Tên Task**: Quản lý dòng tiền chi nhánh (theo Ca / Ngày / Tháng) & Két tiền, lập Phiếu chi nhà cung cấp GDP  
> **URI triển khai**: `https://abcpharmacy.store/branch/finance` & `/admin/finance`  
> **Nhánh Git**: `feat/SCRUM-92-UC-68-UC-72`  
> **Trạng thái**: ✅ **ĐÃ TRIỂN KHAI HOÀN TẤT & BUILD PASS 100%**  

---

## 1. Tổng Quan Nghiệp Vụ & Đính Chính Mã Use Case (Mapping Summary)

| Mã Use Case | Tên Nghiệp Vụ | Phân Hệ | Actor | Trạng Thái Triển Khai |
| :--- | :--- | :--- | :--- | :--- |
| **UC-67** | **Branch Cash Drawer Management** (Quản lý két tiền chi nhánh) | Finance & Sales | Dược sĩ, Quản lý chi nhánh | ✅ **Hoàn tất**: Quản lý số dư đầu ca (Opening Float 5M), kiểm đếm tiền mặt quầy POS, trừ chi phí vặt & cân đối két tiền. |
| **UC-72** | **Branch & Chain Cash Flow Analysis** (Báo cáo dòng tiền chi nhánh & toàn chuỗi) | Finance & Accounting | Quản lý chi nhánh, Giám đốc tài chính | ✅ **Hoàn tất**: Báo cáo đa chiều **Theo Ca / Theo Ngày / Theo Tháng**, 4 thẻ KPI chỉ số tài chính, định dạng **List View + Accordion / Dropdown rows**. |
| **UC-104** *(UC-68 cũ)* | **Supplier Payment Voucher Settlement** (Lập phiếu chi NCC & đối tác) | Procurement & Finance | Kế toán, Quản lý chi nhánh | ✅ **Hoàn tất**: Modal lập phiếu chi NCC GDP (DHG Pharma, Mekophar, Imexpharm...), liên kết mã PO, chọn chuyển khoản / tiền mặt quầy. |

---

## 2. Kiến Trúc Kỹ Thuật (Architecture & Implementation)

### 2.1. Backend Microservices (`orders-service` & `api-gateway`)
1. **Schema Mongoose**:
   - `backend/apps/orders-service/src/schemas/payment-voucher.schema.ts`: Lưu trữ thực thể `PaymentVoucher` (voucherCode, branchId, recipientType, supplierId, purchaseOrderId, amount, paymentMethod, status, description, notes, createdBy, transactionDate).
2. **Module & Service**:
   - `backend/apps/orders-service/src/orders-service.module.ts`: Đăng ký `PaymentVoucher` Schema.
   - `backend/apps/orders-service/src/orders-service.service.ts`:
     - `createPaymentVoucher(dto)`: Tự sinh mã `PV-YYYY-XXXX`, ghi nhận phiếu chi vào MongoDB.
     - `getPaymentVouchers(query)`: Truy vấn danh sách phiếu chi theo chi nhánh, loại đối tượng, trạng thái.
     - `getCashFlowSummary(query)`: Nâng cấp hỗ trợ `viewType: 'shift' | 'day' | 'month'`, tính toán chi tiết:
       - Inflow (Doanh thu POS tiền mặt + VietQR).
       - Outflow (Chi phí cố định + Phiếu chi NCC).
       - Net Cash Flow (Dòng tiền thuần).
       - Cash Drawer (Két tiền ca trực: mở ca, số dư thực tế, cân đối 100%).
       - Phân bổ theo 2 ca trực chuẩn: Ca Sáng (06:00 - 14:00) & Ca Chiều (14:00 - 22:00).
3. **Kafka Event & Message Patterns**:
   - `finance.payment_voucher.create`
   - `finance.payment_voucher.list`
   - `finance.cashflow.summary`
4. **API Gateway Endpoints**:
   - `POST /api/finance/payment-vouchers`
   - `GET /api/finance/payment-vouchers`
   - `GET /api/finance/cashflow` (query: `branchId`, `year`, `viewType`, `date`)

---

### 2.2. Frontend Web React 19 (`frontend/src/`)
1. **Service Layer**:
   - `frontend/src/services/finance.service.ts`: Khai báo `PaymentVoucherPayload`, `PaymentVoucherItem`, `ShiftDetail`, mở rộng `CashFlowSummary`.
   - **Kiến trúc chuẩn OOP**: Triển khai `interface IFinanceService` (Abstraction), `class FinanceService` (Encapsulation, `private readonly basePath`), Constructor Dependency Injection (`AxiosInstance`), và Singleton export (`financeService = new FinanceService()`). Bảo đảm 100% tương thích ngược và dễ dàng viết Unit Test.
2. **Components**:
   - `frontend/src/components/finance/CreatePaymentVoucherModal.tsx`:
     - **Chuẩn hóa 100% shadcn/ui Dialog**: Loại bỏ header màu xanh đặc thô cũ, chuyển sang Dialog Header tinh tế với icon `ReceiptText` trong container bo góc mềm mại, typography phân cấp chuẩn xác, input trắng tinh với focus ring mờ `ring-2 ring-blue-600/15`, input số tiền có prefix tiền tệ ₫ và badge định dạng VND mềm mại.
     - **Tích hợp Searchable Combobox Nhà Cung Cấp GDP**: Thay thế thẻ select cứng bằng Combobox tìm kiếm thông minh chuẩn shadcn/ui (`Popover + Search + Filtered Options`). Kết nối trực tiếp API `/api/suppliers` tải toàn bộ 15+ nhà cung cấp thực tế từ DB, hỗ trợ gõ tìm kiếm tức thời theo tên công ty (DHG, OPC, Imexpharm, Sanofi...), tên viết tắt hoặc mã chứng chỉ GDP (`GDP-0001/2023-BOH`...).
     - **Segmented Radio Cards**: Lựa chọn phương thức thanh toán dạng card hiện đại (Chuyển khoản NH / Tiền mặt quầy) với visual feedback check icon và cảnh báo tự động trừ két tiền mặt.
   - `frontend/src/components/finance/CreateExpenseModal.tsx`:
     - **Chuẩn hóa shadcn/ui Dialog**: Cấu trúc header, input, dropdown select đồng bộ với form tạo phiếu chi NCC.
   - `frontend/src/components/finance/CashFlowListView.tsx`:
     - **Chuẩn hóa shadcn/ui Card & Accordion**: Header ca trực dạng card phẳng viền mỏng `border-slate-200/80 shadow-xs`, icon đồng hồ bo góc `rounded-lg`, badge trạng thái mềm mại (`bg-emerald-50 text-emerald-700`), bảng dữ liệu POS & Phiếu chi kế toán với typography rõ nét, padding vừa vặn chuẩn thiết kế SaaS hiện đại.
3. **Page Container**:
   - `frontend/src/pages/admin/Finance.tsx`:
     - **Thiết kế chuẩn shadcn/ui**: Đồng bộ toàn bộ hệ thống Button (`h-9 rounded-lg font-medium text-xs`), TabsList & TabsTrigger dạng Segmented Control hiện đại, thanh lọc Filter Bar với DatePicker tinh gọn (loại bỏ các nút chọn nhanh rườm rà), 4 thẻ Financial KPI Cards phẳng tinh gọn, không màu mè lỗi thời.
     - **Truy vấn trực tiếp Database 100% (No Mockup Data)**: Kết nối API Gateway `/api/orders` truy vấn 242 đơn hàng thực tế từ MongoDB, kết hợp chi phí cố định và phiếu chi NCC.
     - **Tổng hợp Ca Trực Live (`realShifts`)**: Tự động phân loại đơn hàng theo giờ thực tế trong ngày (Ca Sáng < 14:00, Ca Chiều >= 14:00), trích xuất mã đơn (`orderCode`), tên khách hàng (`patientName`), tổng tiền, hình thức (CASH/VietQR) và trạng thái đơn.
     - **Tự động định vị ngày có đơn thực tế**: Tự động nhận diện ngày gần nhất có phát sinh giao dịch trong database (`2026-09-28`, `2026-09-13`, `2026-08-28`, `2026-07-27`...) làm ngày mặc định ban đầu.
     - **Đồng bộ Dược Sĩ Trực Ca & Két Tiền Mặt Chuẩn Xác**:
       - Tích hợp gọi `hrService.getWeekSchedule` (API `/api/hr/schedules/week`) và `employeeService.getEmployees` để trích xuất lịch trực thực tế của dược sĩ phụ trách ca.
       - **Quy tắc hiển thị két tiền mặt**: Chỉ khi dược sĩ được phân lịch trực nhận ca (e.g. "Phúc Dược Sĩ", "DS. Vũ Hoàng Long", "DS. Lê Hải Yến") thì mới kết chuyển số dư đầu ca (5,000,000 đ), số dư cuối ca và trạng thái "Cân đối 100%".
       - **Trường hợp chưa phân lịch trực ca**: Giao diện hiển thị rõ ràng "Chưa phân lịch trực ca" kèm cảnh báo "Chỉ kết chuyển và đưa ra số dư két khi dược sĩ được phân lịch trực và ký nhận bàn giao đầu ca", không đưa ra con số két giả định hay báo cân đối ảo.
     - Phân quyền RBAC: Quản lý chi nhánh bị khóa chi nhánh cố định, Admin/Kế toán trưởng xem toàn chuỗi.

---

## 3. Quy Trình Dược Sĩ Thẩm Định & Phê Duyệt Thuốc AI (UC-70, UC-80 & SimpleTable)

### 3.1. Bối Cảnh & Yêu Cầu Nghiệp Vụ
- Khi hệ thống AI (Whisper STT tư vấn giọng nói hoặc AI RAG tư vấn triệu chứng) đề xuất đơn thuốc, **bắt buộc** phải có bước **Dược sĩ chuyên môn thẩm định lâm sàng và phê duyệt** trước khi xuất bán hoặc thêm vào giỏ hàng POS theo tiêu chuẩn GPP.
- Cần một linh kiện bảng dữ liệu dùng chung (`SimpleTable`) đơn giản, nhẹ, chuẩn hoá theo Playbook v2.0 & `/abc-frontend-skill` để hiển thị thuốc đề xuất và tái sử dụng toàn hệ thống.

### 3.2. Triển Khai Kỹ Thuật (Frontend React 19)
1. **Linh kiện dùng chung `SimpleTable` (`frontend/src/components/common/SimpleTable.tsx`)**:
   - Generic type `<T>`, TypeScript nghiêm ngặt, hỗ trợ cấu hình cột linh hoạt (`key`, `header`, `accessor`, `render`, `width`, `align`, `className`).
   - Tích hợp Skeleton loading pulse, Empty state tinh tế, chế độ `compact` cho modal/sidebar, hoverable rows và bo góc y tế `rounded-xl border-slate-200`.
   - Export qua barrel file `frontend/src/components/ui/index.ts`.
   - Comment mã nguồn 100% bằng tiếng Hà Lan (Nederlands).
2. **Modal Thẩm Định & Phê Duyệt GPP `AIPharmacistApprovalModal` (`frontend/src/pages/pharmacist/components/AIPharmacistApprovalModal.tsx`)**:
   - Sử dụng `SimpleTable` hiển thị danh mục thuốc AI đề xuất với checkbox chọn duyệt từng thuốc (hoặc chọn tất cả), hiệu chỉnh liều dùng/dặn dò lâm sàng, kiểm tra tồn kho chi nhánh, tăng giảm số lượng cấp phát.
   - Hộp cảnh báo tương tác thuốc và liều dùng an toàn từ AI.
   - Khung xác nhận trách nhiệm chuyên môn Dược sĩ: CCHN Dược sĩ, checklist 3 tiêu chí an toàn GPP, ghi chú lâm sàng, và checkbox cam kết trách nhiệm bắt buộc.
   - Kết nối API Gateway `PUT /api/ai/consultations/:id/confirm` đồng bộ `pharmacistAgreement: true`, `auditCode`, danh sách thuốc phê duyệt vào MongoDB.
3. **Tích hợp Quầy POS (`frontend/src/pages/pharmacist/components/RetailView.tsx`)**:
   - Thay thế nút thêm trực tiếp bằng nút "Dược Sĩ Thẩm Định & Duyệt GPP".
   - Sau khi phê duyệt, chỉ những thuốc được Dược sĩ chọn mới được thêm vào đơn hàng POS với liều dùng và số lượng đã hiệu chỉnh, đồng thời hiển thị Biên bản thẩm định lâm sàng (`AIPharmacistAuditModal`).
   - Lưu trữ ngữ cảnh kiểm toán (`auditData`) gồm `auditCode`, `consultationId`, `pharmacistName`.

### 3.3. Đồng Bộ Trực Tiếp Vết Tích AI Vào Bảng Đơn Hàng (`orders` Collection)
1. **Mở rộng Schema `orders-service` (`backend/apps/orders-service/src/schemas/order.schema.ts`)**:
   - Bổ sung 4 trường kiểm toán lâm sàng trực tiếp:
     - `isAiAssisted` (boolean, default: false): Đánh dấu đơn hàng có thuốc do AI đề xuất và Dược sĩ duyệt.
     - `aiAuditCode` (string): Mã kiểm toán GPP (e.g. `GPP-AI-829104`).
     - `consultationId` (string): Mã phiên tư vấn âm thanh / triệu chứng lâm sàng (e.g. `CS-177...`).
     - `pharmacistApprovedBy` (string): Họ tên hoặc mã định danh của Dược sĩ chịu trách nhiệm chuyên môn.
2. **Cập nhật DTO & API Gateway**:
   - `CreateOrderDto` & `CreatePayOSLinkDto` tại `api-gateway` và `orders-service` tiếp nhận đầy đủ các trường AI audit.
   - `order.service.ts` (Frontend): Khai báo các trường trong `OrderPayload` và `PayOSLinkPayload`.
3. **Hiển Thị Huy Hiệu & Minh Bạch Hóa Hóa Đơn**:
   - `RetailView.tsx`: Hóa đơn xuất kho sau thanh toán (tiền mặt / VietQR PayOS) hiển thị trực tiếp huy hiệu **✨ Phê duyệt GPP AI: {aiAuditCode}** và tên Dược sĩ thẩm định.
   - `GPPView.tsx`: Danh sách đơn xuất kho GPP bổ sung thẻ huy hiệu `✨ AI GPP: {aiAuditCode}` để thanh tra Dược và Quản lý chi nhánh dễ dàng truy vết nguồn gốc đơn.

---

## 4. Kiểm Thử & Biên Dịch (Build Verification)

- **Live Database & Pharmacist Schedule Verification**: Đã kiểm tra trực tiếp qua API Gateway & MongoDB: 242 đơn hàng thực tế được tải, phân bổ ca chuẩn xác; trích xuất chính xác lịch trực dược sĩ từ collection `work_schedules` (BR-002: Phúc Dược Sĩ, DS. Vũ Hoàng Long; BR-001: DS. Lê Hải Yến).
- **Frontend**: `npm run build` -> **Build thành công 100%** (0 errors).
- **Backend**: `npx nest build orders-service -b swc && npx nest build api-gateway -b swc` -> **Build thành công 100%** (0 errors).
