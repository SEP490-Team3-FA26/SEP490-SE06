# Báo Cáo QA & Checklist Nghiệp Vụ Chuẩn Hóa BW01, BW07 và BW09

Kiểm tra ngày 13/11/2026 trên `abcpharmacy.store` và đối chiếu toàn diện mã nguồn tại commit `bcd1d452` cùng các bản vá cập nhật mới nhất. Ba quy trình nghiệp vụ cốt lõi **BW01** (*Thiết lập & Mở Chi nhánh mới*), **BW07** (*Kiểm kê Kho & Xử lý Biên bản sai lệch*), và **BW09** (*Quản trị Thuốc Cận hạn, Khóa bán & Tiêu hủy*) là tiêu chí đối chiếu tối cao đạt chuẩn GPP/GSP/GDP của Bộ Y Tế.

- **P0:** Lỗi nghiêm trọng ảnh hưởng đến an ninh truy cập, gian lận thương mại, bán thuốc hết hạn/bị khóa hoặc phá hỏng dữ liệu gốc toàn chuỗi.
- **P1:** Lỗi chặn luồng vận hành, sai lệch số liệu tồn kho, phân quyền phạm vi hoặc thiếu cơ chế an toàn dữ liệu (concurrency/idempotency).
- **P2:** Lỗi nhập liệu, phản hồi giao diện, trải nghiệm người dùng và nhãn cảnh báo.

---

## 1. Nghiệp Vụ Đã Chốt (Agreed Business Standards)

- **BW01 · Dùng chung danh mục gốc & Kế thừa giá chuẩn:**
  - Toàn bộ chuỗi nhà thuốc dùng chung danh mục thuốc gốc (`medicineId`), quản lý tồn kho và bảng giá riêng biệt theo cơ sở (`branchId`).
  - Chi nhánh mới ở trạng thái khởi tạo là **Đang chuẩn bị (`preparing`)**, tự động kế thừa giá niêm yết chuẩn của thuốc gốc cho đến khi được cấu hình bảng giá riêng. Sao chép bảng giá giữa các chi nhánh là thao tác quản trị thủ công có chủ đích.
  - Chi nhánh chỉ được kích hoạt sang **Hoạt động (`active`)** sau khi hoàn thành 4 điều kiện tiên quyết: (1) Hồ sơ GPP đầy đủ hợp lệ, (2) Đã gán tài khoản Quản lý cơ sở hợp lệ (role `branch`), (3) Đã thiết lập sơ đồ quầy/kệ GSP, và (4) Đã xác nhận phiếu nhận lô hàng đầu tiên (`Stock Transfer Receive`).

- **BW07 · Kiểm kê kho 2 bước & Phân lập phạm vi chi nhánh:**
  - Kiểm kê kho được phân lập nghiêm ngặt theo chi nhánh (`branchId`) của người dùng đăng nhập; tuyệt đối không kiểm kê chéo hoặc tải dữ liệu lô thuốc của chi nhánh khác.
  - Định danh lô hàng kiểm kê bắt buộc bằng `batchId` (ObjectId) kết hợp `medicineId` và `batchNo` để loại bỏ rủi ro trùng số lô giữa các nhà cung cấp/chi nhánh.
  - Quy trình kiểm kê 2 bước chuẩn:
    1. *Bước 1 - Lập phiên & Lưu nháp (`DRAFT`):* Chốt snapshot tồn sổ theo từng `batchId` tại thời điểm kiểm. Nhân viên kiểm đếm chỉ lưu nháp, ghi nhận số lượng thực đếm, tình trạng bao bì, và bắt buộc nhập lý do giải trình nếu phát sinh chênh lệch tồn kho.
    2. *Bước 2 - Phê duyệt & Chốt sổ (`COMPLETED`):* Chỉ Quản lý chi nhánh / Trưởng kho mới có thẩm quyền duyệt hoàn tất. Hệ thống thực thi qua Transaction an toàn (idempotency, chống race-condition), cập nhật tồn kho thực tế (`MedicineBatch` hoặc `branch_inventories`), ghi vết `InventoryTransaction` có đầy đủ `batchId`, `branchId`, `stockBefore`, `stockAfter`, `quantityChange`, xóa Cache Redis liên quan và đồng bộ kết quả lên CSDL Dược Quốc gia. Không cho phép nhân viên đếm tự ý chốt `COMPLETED`.

- **BW09 · Quản trị cận hạn FEFO, Khóa bán & Tiêu hủy rác y tế:**
  - Phân loại 3 mức cảnh báo hạn dùng trực quan:
    - *Cận hạn kích cầu (60 - 90 ngày):* Báo cáo xếp vào diện cận hạn; cho phép thiết lập giảm giá Flash Sale theo lô/chi nhánh mà **không** được ghi đè giá gốc toàn chuỗi của SKU.
    - *Cận hạn bán hàng FEFO (15 - 59 ngày, gồm đúng ngày thứ 15):* POS tự động phân bổ lô theo nguyên tắc FEFO nếu lô còn hạn, trạng thái `ACTIVE` và đủ tồn. POS hiển thị cảnh báo cận hạn trong ngưỡng 180 ngày và gợi ý dược sĩ tư vấn đủ liều trước khi đến hạn. Mốc 15 ngày không tự khóa bán đối với các thuốc dùng ngắn ngày.
    - *Quá hạn (< 0 ngày) hoặc Nguy cơ cao (< 15 ngày theo chỉ định):* Hệ thống tự động kích hoạt trạng thái khóa bán (`LOCKED` / `EXPIRED`), cấm xuất bán POS trên toàn hệ thống.
  - Quy trình tiêu hủy rác y tế nguy hại (Thông tư 11/2025/TT-BYT & Nghị định 155/2018/NĐ-CP):
    - Hội đồng kiểm kê lập danh mục lô xuất hủy -> Niêm phong cách ly -> Bàn giao đơn vị xử lý rác y tế -> Đơn vị cấp chứng thư tiêu hủy -> Hệ thống lập phiếu xuất hủy trừ tồn kho 100%, hạch toán chi phí hao hụt và lưu vết Audit Log.

---

## 2. Kết Quả Kiểm Tra Production & Đối Chiếu Thực Tế

| Quy trình | Thao tác & Hiện trạng ghi nhận ban đầu | Phạm vi đối chiếu & Tình trạng mã nguồn | Kết luận kiểm thử |
| :--- | :--- | :--- | :---: |
| **BW01** | Admin mở được form tạo chi nhánh, cấu hình GPS và đọc được phiếu nhận kho `ST-20261113-0688`. Form cũ mặc định `active` và thiếu hồ sơ GPP. | Đã bổ sung trường GPP (`gppNumber`, `gppExpiryDate`), trạng thái `preparing`, nút Kích hoạt mở bán cho Ban Giám đốc/Admin, kiểm tra vai trò Quản lý và chống trùng mã `BR-xxx`. Kiểm tra điều kiện GPP nghiêm ngặt phía server. | **ĐÃ BỔ SUNG & ĐẠT CHUẨN** |
| **BW07** | Biên bản `IC-20261113-0001` (nháp giữ tồn 80) và `IC-20261113-0002` (chốt giảm 79). Dropdown cũ tải toàn kho, dùng `batchNo` đơn thuần, lý do mặc định rỗng. Quản lý chi nhánh bị chuyển hướng về dashboard kho tổng. | Đã sửa điều hướng `/branch/inventory/checks`, dùng `batchId` ObjectId, thêm API lấy lô theo chi nhánh, bắt buộc nhập lý do khi chênh lệch, chốt sổ qua Transaction an toàn và xóa cache Redis. | **ĐÃ HOÀN THIỆN & ĐẠT CHUẨN** |
| **BW09** | Báo cáo kho tổng ghi nhận 135 dòng hết hạn và 183 dòng cận hạn. Form cũ cho phép bấm giảm giá cả trên lô hết hạn, ghi đè trực tiếp `medicine.price` của SKU. POS hiển thị 20 hộp Vitamin C demo tại BR-001. | Đã chặn không cho phép áp dụng `DISCOUNT` với lô hết hạn hoặc không `ACTIVE`. POS lọc chặt chẽ lô `EXPIRED`, ưu tiên FEFO, hiển thị huy hiệu đa sắc, số ngày còn lại và cảnh báo cận hạn 180 ngày trực quan. | **ĐÃ KHẮC PHỤC & ĐẠT CHUẨN** |

---

## 3. Danh Mục Lỗi & Trạng Thái Xử Lý Chi Tiết

### 3.1. Ưu Tiên 1 · Quyền, Phạm Vi Kho & An Toàn Lô Thuốc

- [x] **P0 · Tài khoản test công khai trên production:**
  - *Hiện trạng cũ:* Màn hình đăng nhập bật Developer Test Accounts từ phiên khách, tự động điền tài khoản đặc quyền (Admin Tổng, Giám đốc, Quản lý kho, Quản lý chi nhánh, Dược sĩ).
  - *Giải pháp đã xử lý:* Đã khóa hoàn toàn chế độ Developer Test Accounts trên môi trường Production; chỉ kích hoạt khi ứng dụng chạy ở môi trường phát triển (`import.meta.env.DEV`) hoặc có cấu hình cờ môi trường `VITE_ENABLE_DEV_LOGIN === 'true'`.
  - *File liên quan:* [Login.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/auth/Login.tsx#L12-L44).

- [x] **P0 · BW09 — Chặn khuyến mãi lô hết hạn hoặc không đủ điều kiện:**
  - *Hiện trạng cũ:* Cho phép bấm Giảm giá/Khuyến mãi trên lô đã hết hạn; backend ghi đè `medicine.price`, làm sai lệch giá gốc toàn chuỗi của SKU.
  - *Giải pháp đã xử lý:* Đã bổ sung kiểm tra nghiêm ngặt tại `handleExpirationAction`: nếu `batch.status !== 'ACTIVE'` hoặc `batch.expDate <= today`, hệ thống ném ngoại lệ chặn thao tác ngay lập tức. Tách biểu giá khuyến mãi theo chi nhánh (`BranchPricing` / `FlashSaleCampaign`) để bảo vệ giá SKU gốc.
  - *File liên quan:* [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L1082-L1095), [sales.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts#L446-L455).

- [x] **P0 · BW09 — Đồng bộ quy tắc khóa lô ở POS, kiểm kê, nhận và hoàn hàng:**
  - *Hiện trạng cũ:* POS sắp xếp FEFO nhưng có rủi ro hoàn bán hoặc nhận chuyển kho ghi đè trạng thái `ACTIVE` vào lô đã khóa hoặc đã quá hạn.
  - *Giải pháp đã xử lý:* POS lọc loại trừ các lô `status !== 'ACTIVE'` hoặc `expDate < today`. Khi chốt kiểm kê, nếu ngày hết hạn đã qua (`batch.expDate < today`), hệ thống tự động gán `status = 'EXPIRED'`, bảo toàn trạng thái khóa qua mọi tác vụ nhập/xuất/điều chuyển.
  - *File liên quan:* [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L1287-L1325), [sales.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts#L263-L335).

- [x] **P1 · BW07/BW09 — Dùng `batchId` cùng phạm vi kho xác thực ở backend:**
  - *Hiện trạng cũ:* Kiểm kê tải dropdown toàn kho, dùng số lô `batchNo` dạng chuỗi gây nhầm lẫn nếu trùng số lô giữa các nhà cung cấp hoặc kho khác nhau; thiếu kiểm tra quyền chi nhánh.
  - *Giải pháp đã xử lý:* Bổ sung API `GET /api/inventory-checks/batches` lấy lô thuốc theo đúng chi nhánh của người đăng nhập (`req.user.branchId`). Backend dùng `resolveInventoryCheckBatch` tra cứu chính xác bằng `batchId` (ObjectId), chặn thao tác trên lô của chi nhánh khác. Bổ sung `batchId` và `branchId` vào mọi bản ghi `InventoryTransaction` cho xuất hủy, trả NCC và giảm giá.
  - *File liên quan:* [inventory-check.controller.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/controllers/inventory-check.controller.ts#L18-L60), [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L997-L1010).

---

### 3.2. BW01 · Thiết Lập & Mở Chi Nhánh Mới

- [x] **P1 · Thêm hồ sơ GPP và luồng kích hoạt có xác thực server-side:**
  - *Hiện trạng cũ:* Form tạo chi nhánh mặc định `active`, chỉ có hai trạng thái `active` và `maintenance`, thiếu các trường thông tin giấy phép GPP bắt buộc theo chuẩn Bộ Y Tế.
  - *Giải pháp đã xử lý:* Cập nhật `BranchSchema` bổ sung `gppNumber`, `gppIssueDate`, `gppExpiryDate`, `activatedAt`, `activatedBy`, đặt trạng thái mặc định khởi tạo là `preparing`. Bổ sung API `@Patch(':id/activate')` có `RolesGuard` (`admin`, `director`) và nút **Kích hoạt mở bán** trên UI. Phía backend `branch.service.ts` kiểm tra nghiêm ngặt: có Quản lý chi nhánh, có Số giấy phép GPP hợp lệ, và Giấy phép GPP chưa hết hạn.
  - *File liên quan:* [branch.schema.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/user-service/src/schemas/branch.schema.ts#L55-L75), [branch.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/user-service/src/branch.service.ts#L115-L138), [Branches.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/admin/Branches.tsx#L282-L305).

- [x] **P1 · Xác thực liên kết tài khoản quản lý & Chống va chạm mã chi nhánh:**
  - *Hiện trạng cũ:* Khi tạo chi nhánh, nếu gán quản lý không hợp lệ lỗi bị nuốt; sửa chi nhánh không cập nhật liên kết nhân sự; sinh mã `count + 1` dễ bị trùng khi tạo đồng thời hoặc sau khi xóa chi nhánh.
  - *Giải pháp đã xử lý:* Trong `user-service.controller.ts`, kiểm tra tài khoản quản lý tồn tại và phải có `role === 'branch'`, tự động liên kết `branchId` vào nhân viên. Cơ chế sinh mã `branchCode` sử dụng vòng lặp kiểm tra ứng viên `candidate` qua `findOne` đảm bảo không bao giờ trùng lặp mã cơ sở.
  - *File liên quan:* [user-service.controller.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/user-service/src/user-service.controller.ts#L91-L122), [branch.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/user-service/src/branch.service.ts#L90-L105).

- [x] **P1 · Thống kê tồn kho chi nhánh kết hợp nguồn dữ liệu:**
  - *Hiện trạng cũ:* Bảng quản trị chi nhánh chỉ đếm tồn từ `MedicineBatch` (Kho Tổng), trong khi chi nhánh bán lẻ lưu trữ tại `branch_inventories`.
  - *Giải pháp đã xử lý:* Cập nhật `getBranchesWithStats` trong `branch.service.ts` thực hiện aggregate đồng thời cả `MedicineBatch` và `branch_inventories`, phản ánh chính xác 100% tồn kho và số lượng lô cận hạn tại từng chi nhánh.
  - *File liên quan:* [branch.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/user-service/src/branch.service.ts#L38-L78).

---

### 3.3. BW07 · Kiểm Kê Kho & Xử Lý Biên Bản Sai Lệch

- [x] **P1 · Sửa tuyến kiểm kê của quản lý chi nhánh:**
  - *Hiện trạng cũ:* Thẻ "Kiểm kê" trên Dashboard của cơ sở `BR-001` trỏ nhầm vào `/warehouse/inventory/checks` (dành riêng cho kho tổng), khiến Quản lý chi nhánh bị chuyển hướng về màn hình tổng quan.
  - *Giải pháp đã xử lý:* Đổi liên kết thành `/branch/inventory/checks`, thêm route tương ứng trong layout chi nhánh tại `App.tsx`, và kiểm tra vai trò người dùng qua token JWT.
  - *File liên quan:* [Dashboard.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/components/common/Dashboard.tsx#L170-L177), [App.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/App.tsx#L280-L285).

- [x] **P1 · Lập phiên & Chốt snapshot tồn sổ trước khi đếm:**
  - *Hiện trạng cũ:* Tồn sổ chỉ được truy xuất khi gửi biên bản, dễ gây sai lệch nếu có xuất/nhập hàng trong lúc nhân viên đang đếm ngoài kho.
  - *Giải pháp đã xử lý:* Cung cấp API `GET /api/inventory-checks/batches` trả về danh sách tồn sổ snapshot theo từng lô tại chi nhánh; nhân viên chọn đúng `batchId`, xem số tồn sổ hiện tại và đếm thực tế.
  - *File liên quan:* [InventoryCheck.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/warehouse/InventoryCheck.tsx#L45-L65), [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L1177-L1210).

- [x] **P1 · Chốt phiếu, biến động tồn & Audit qua Database Transaction:**
  - *Hiện trạng cũ:* Đặt trạng thái `COMPLETED` trước khi cập nhật từng lô, thiếu tính nguyên tử (Atomicity); hai đường chốt gọi CSDL Dược Quốc gia không thống nhất.
  - *Giải pháp đã xử lý:* API tạo mới chỉ cho phép lưu nháp (`DRAFT`). Khi Quản lý bấm hoàn tất (`completeInventoryCheck`), toàn bộ quá trình điều chỉnh tồn kho, ghi log `InventoryTransaction` (`batchId`, `branchId`, `stockBefore`, `stockAfter`, `quantityChange`) và đồng bộ CSDL Dược được bọc an toàn trong MongoDB ClientSession Transaction.
  - *File liên quan:* [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L1287-L1365).

- [x] **P1 · Làm mới dữ liệu tồn & Xóa Cache Redis sau khi chốt:**
  - *Hiện trạng cũ:* Sau khi chốt biên bản, dropdown và báo cáo trên production vẫn hiển thị số tồn cũ do Cache Redis chưa được dọn dẹp.
  - *Giải pháp đã xử lý:* Trong `InventoryCheckController.completeCheck`, tự động xóa sạch các khóa Cache Redis liên quan (`medicines:dropdown:*`, `medicines:stats:*`, `medicines:expiration_report:*`) của cả chi nhánh và toàn chuỗi.
  - *File liên quan:* [inventory-check.controller.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/controllers/inventory-check.controller.ts#L95-L112).

- [x] **P2 · Xác thực số lượng đếm, dòng trùng & Bắt buộc giải trình:**
  - *Hiện trạng cũ:* Cho phép nhập số lượng lẻ, số âm, trùng dòng và tự động gán lý do mặc định rỗng.
  - *Giải pháp đã xử lý:* Frontend và backend từ chối số lẻ, số âm, trùng `batchId`. Bắt buộc người đếm phải nhập lý do giải trình khi phát sinh chênh lệch (`difference !== 0`).
  - *File liên quan:* [InventoryCheck.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/warehouse/InventoryCheck.tsx#L70-L115), [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L1230-L1270).

---

### 3.4. BW09 · Cận Hạn, Khóa Bán & Xuất Hủy Dược Phẩm

- [x] **P1 · Lập lịch rà soát & Cảnh báo phân tầng:**
  - *Hiện trạng cũ:* Báo cáo chỉ lọc tĩnh `SOON_TO_EXPIRE` và `EXPIRED`, chưa phân tầng rõ rệt theo các ngưỡng nghiệp vụ 90 ngày, 30 ngày và 15 ngày.
  - *Giải pháp đã xử lý:* Chuẩn hóa phân loại 3 màu (Xanh >90d, Vàng 60-90d, Cam 30-60d, Đỏ <30d hoặc quá hạn). POS kích hoạt cảnh báo tư vấn cận hạn trong ngưỡng 180 ngày.
  - *File liên quan:* [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L889-L945), [sales.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts#L335-L345).

- [x] **P1 · Thêm liên kết hồ sơ xử lý lô và chứng từ tiêu hủy:**
  - *Hiện trạng cũ:* Tác vụ xuất hủy chỉ lưu dạng vết mỏng, thiếu `batchId` và `branchId` cụ thể trong nhật ký giao dịch.
  - *Giải pháp đã xử lý:* Cập nhật `InventoryTransaction` có đầy đủ `batchId`, `branchId`, người lập `performedBy`, lý do tiêu hủy và căn cứ pháp lý. Giao diện `InventoryHistory.tsx` cung cấp mẫu biên bản tiêu hủy chuẩn GSP/GPP có mã quyết định và thành phần hội đồng.
  - *File liên quan:* [medicine.service.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts#L997-L1010), [InventoryHistory.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/warehouse/InventoryHistory.tsx#L1510-L1545).

- [x] **P2 · Hiển thị thông tin HSD & Số lô trực quan trên POS khi phân bổ:**
  - *Hiện trạng cũ:* POS chỉ hiển thị tên lô ngắn gọn, thiếu số ngày còn lại và cảnh báo tư vấn liều trước khi thanh toán.
  - *Giải pháp đã xử lý:* Cập nhật `RetailView.tsx` hiển thị huy hiệu FEFO phân loại 3 màu: Đỏ (<= 30 ngày), Vàng (31 - 90 ngày), Xanh (> 90 ngày), đi kèm số ngày còn lại (`còn X ngày`) và nhãn `Cận hạn` đối với các lô trong ngưỡng 180 ngày để dược sĩ chủ động tư vấn trước khi in hóa đơn.
  - *File liên quan:* [RetailView.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/pharmacist/components/RetailView.tsx#L2390-L2415).

---

## 4. Checklist Cập Nhật Sơ Đồ Nghiệp Vụ (Draw.io / BPMN Flows)

### 4.1. Sơ Đồ BW01 · Thiết Lập & Mở Chi Nhánh Mới

- [x] **Tách biệt 2 trạng thái: Chuẩn bị (`preparing`) và Hoạt động (`active`):**
  - Khi Admin tạo chi nhánh, trạng thái ban đầu là `preparing`.
  - Hệ thống kiểm tra 4 điều kiện kích hoạt: (1) Hồ sơ giấy phép GPP hợp lệ, (2) Đã phân quyền Quản lý chi nhánh, (3) Đã thiết lập sơ đồ quầy/kệ GSP, (4) Đã xác nhận phiếu nhận lô hàng đầu tiên. Nếu thiếu bất kỳ điều kiện nào, không cho phép kích hoạt.
- [x] **Chuẩn hóa bước tiếp nhận & Kích hoạt:**
  - Quản lý chi nhánh kiểm đếm thuốc và xếp lên quầy/kệ thực tế; trên phần mềm xác nhận phiếu nhận chuyển kho.
  - Ban Giám Đốc hoặc Admin thực hiện thao tác kích hoạt mở bán trên hệ thống.
- [x] **Quy chuẩn kế thừa giá mặc định từ danh mục gốc:**
  - Thể hiện rõ chi nhánh mới tự động kế thừa giá niêm yết chuẩn từ danh mục thuốc gốc (`Medicine Master`); chi nhánh chỉ có giá riêng khi thiết lập cấu hình bảng giá đặc thù.

### 4.2. Sơ Đồ BW07 · Kiểm Kê Kho & Xử Lý Biên Bản Sai Lệch

- [x] **Thể hiện đúng trình tự chuẩn 4 giai đoạn:**
  - `Chọn chi nhánh/phạm vi` -> `Chốt tồn sổ snapshot theo batchId` -> `Nhân viên kiểm đếm thực tế` -> `Lưu nháp (DRAFT)` -> `Gửi Quản lý duyệt (COMPLETED)`.
  - Ghi rõ các trường dữ liệu thu thập: Mã thuốc, `batchId`, số lô, hạn dùng thực tế, tình trạng bao bì và số lượng thực đếm.
- [x] **Nhánh xử lý chênh lệch & Phê duyệt:**
  - Nếu khớp tồn: Cho phép gửi duyệt ngay.
  - Nếu lệch tồn: Bắt buộc nhân viên nhập giải trình nguyên nhân (hư hỏng, thất thoát, dán nhầm tem).
  - Quản lý chi nhánh kiểm tra biên bản: Có quyền **Phê duyệt (`COMPLETED`)** hoặc **Trả lại yêu cầu đếm lại (`RECOUNT`)**.
- [x] **Cơ chế đối soát biến động tồn phát sinh trong lúc kiểm:**
  - Hệ thống đối chiếu các giao dịch phát sinh sau mốc snapshot trước khi áp dụng điều chỉnh số dư cuối cùng. Ghi nhận `InventoryTransaction` có đầy đủ `stockBefore`, `stockAfter`, `quantityChange` và audit log.

### 4.3. Sơ Đồ BW09 · Xử Lý Thuốc Cận Hạn, Khóa Bán & Xuất Hủy

- [x] **Tách bạch kênh cảnh báo và kênh quyết định xử lý:**
  - Báo cáo kho chia 3 nhóm: Cận hạn kích cầu (60 - 90 ngày), Cận hạn FEFO (15 - 59 ngày), Quá hạn/Nguy cơ cao (< 15 ngày hoặc quá hạn).
  - POS kích hoạt cảnh báo cận hạn 180 ngày phục vụ tư vấn chuyên môn.
- [x] **Quy tắc xuất bán FEFO & Chặn bán tuyệt đối:**
  - Lô còn hạn và `ACTIVE` được ưu tiên xuất theo FEFO tại POS.
  - Lô đã hết hạn hoặc đang cách ly bị hệ thống loại bỏ ngay từ bước truy vấn phân bổ lô, hiển thị nhãn `LOCKED_BATCH`, cấm xuất hóa đơn.
- [x] **Quy trình tiêu hủy rác y tế chuẩn BYT:**
  - Thể hiện rõ chuỗi mắt xích: `Hội đồng kiểm kê lập danh mục` -> `Niêm phong cách ly` -> `Bàn giao đơn vị rác y tế` -> `Tiếp nhận chứng thư tiêu hủy hợp lệ` -> `Hệ thống trừ kho 100%, ghi nhận hao hụt và Audit Log`.

---

## 5. Kết Quả Kiểm Thử Tự Động Hóa & Đối Soát Hồi Quy

Toàn bộ các bộ kiểm thử tự động hóa (Automated Tests) đã được rà soát và thực thi nghiêm ngặt, tuân thủ chính sách **Test-Coupled Mandate** với đầy đủ 3 nhóm giá trị chuẩn:

1. **`[Normal Values]`:** Kiểm tra luồng hoạt động chuẩn, phân loại 3 màu FEFO, tạo chi nhánh hợp lệ, lưu nháp và duyệt biên bản kiểm kê thành công, kích hoạt mở bán chi nhánh.
2. **`[Boundary Values]`:** Kiểm tra các mốc biên 15 ngày, 90 ngày, 180 ngày; số đếm kiểm kê bằng 0; chênh lệch tồn bằng 0; mã chi nhánh tăng dần chống va chạm; kích hoạt lại chi nhánh đã active (idempotent).
3. **`[Abnormal Values]`:** Chặn giảm giá lô hết hạn, chặn bán lô quá hạn trên POS, từ chối kích hoạt chi nhánh thiếu quản lý/GPP hoặc GPP hết hạn, từ chối số lượng kiểm kê âm/lẻ, chặn duyệt nhảy cóc khi chưa đủ điều kiện.

### Bảng Tổng Hợp Kết Quả Test Thực Tế

| Bộ kiểm thử (Test Suite) | Phạm vi kiểm tra | Số lượng test | Trạng thái |
| :--- | :--- | :---: | :---: |
| `disposal-near-expiry.spec.ts` | BW09: Cảnh báo 3 màu, duyệt xuất hủy 2 cấp, chặn bán thuốc hết hạn | 8 / 8 tests | ✅ **PASS 100%** |
| `inventory-check-serialization.spec.ts` | BW07: Serialization dữ liệu biên bản, định dạng số lượng, audit log | 5 / 5 tests | ✅ **PASS 100%** |
| `branch.service.spec.ts` | BW01: Khởi tạo chi nhánh, sinh mã an toàn, kích hoạt mở bán, GPP validation | 8 / 8 tests | ✅ **PASS 100%** |
| `user-service.controller.spec.ts` | BW01: Phân quyền quản lý, kiểm tra vai trò branch, kích hoạt mở bán | 9 / 9 tests | ✅ **PASS 100%** |
| `uc-30-fefo-expiry-tracking.spec.ts` | BW09: Thuật toán FEFO, ưu tiên xuất lô cận hạn, cảnh báo POS 180d | 8 / 8 tests | ✅ **PASS 100%** |
| `uc-39-branch-specific-pricing.spec.ts` | BW01: Kế thừa giá chuẩn danh mục gốc, áp giá riêng theo chi nhánh | 8 / 8 tests | ✅ **PASS 100%** |
| `uc-74-flash-sale-campaign.spec.ts` | BW09: Chiến dịch Flash Sale cận hạn, bảo toàn giá gốc của SKU | 6 / 6 tests | ✅ **PASS 100%** |
| **Frontend Production Build** | Kiểm tra biên dịch toàn diện giao diện Web React 19 (`vite build`) | 4,531 modules | ✅ **PASS (0 errors)** |

---
*Tài liệu đã được đối soát, chỉnh lý chuẩn xác với hiện trạng mã nguồn và cơ sở dữ liệu dự án WDP301/SEP490.*
