# KỊCH BẢN THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN TỐT NGHIỆP — REVIEW 3
## ĐỀ TÀI: ABC PHARMACY — HỆ THỐNG QUẢN TRỊ CHUỖI NHÀ THUỐC BÁN LẺ & CHĂM SÓC SỨC KHỎE TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI)
### Mã Lớp / Nhóm: WDP301 / SEP490 — Nhóm SE_06 (Nhóm 7)

---

> [!IMPORTANT]
> **THÔNG TIN QUY CHUẨN BUỔI BẢO VỆ REVIEW 3:**
> - **Tổng thời lượng:** **45 – 50 phút** (Nhóm thuyết trình + Demo: **25 – 30 phút** | Hội đồng phản biện Q&A: **15 – 20 phút**).
> - **Đội ngũ bảo vệ (4 thành viên):**
>   1. **Trần Hồng Phước (Trưởng nhóm / Kiến trúc sư hệ thống):** Điều phối chung, Kiến trúc Microservices Kafka, API Gateway, Tích hợp AI Vision/OCR, Quầy POS & Quản lý Chi nhánh.
>   2. **Nguyễn Tiến Đạt (Kỹ sư Kho & Vận hành Logistics):** Vận hành Kho GSP 4 cấp, Thuật toán Lô & Hạn dùng FEFO, Quản lý Nhập/Xuất/Kiểm kê kho, Mobile App Nghiệp vụ.
>   3. **Nguyễn Văn Nam (Chuyên viên Mua hàng & Phân tích Dữ liệu):** Quản trị Danh mục SKU, Quy trình Mua hàng GDP/RFQ/PO/GRN, AI Forecast Dự báo nhu cầu, Mô hình Adaptive RFM Marketing & Báo cáo Tài chính PayOS.
>   4. **Đinh Anh Phúc (Scrum Master & Trưởng nhóm Kiểm thử QA):** Quản trị Backlog/Jira/Tài liệu, Phân quyền RBAC, Trợ lý AI Dược sĩ (RAG/Chatbot/STT), Báo cáo Kiểm thử phần mềm (Report 5).
> - **Tài liệu bàn giao hoàn chỉnh:** Bộ Reports tại thư mục `review_3` (Report 1 đến Report 6), Báo cáo Kiểm thử `Report5_Test_Report.xlsx` (58 test suites, 514 test cases Pass 100%), Kế hoạch vận hành VPS Production `https://abcpharmacy.store`.
> - **Sản phẩm Demo:** Bản Live Demo Web React 19 và Mobile Expo tương tác thời gian thực, kết nối cụm Microservices Production.

---

## MỤC LỤC BÀI THUYẾT TRÌNH (AGENDA)

```
00:00 - 03:00  | PHẦN 1: Mở đầu, Giới thiệu sản phẩm & Bài toán giải quyết ngành Dược
03:00 - 06:00  | PHẦN 2: Báo cáo Tiếp thu & Ma trận Chỉnh sửa góp ý Hội đồng tại Review 2
06:00 - 14:00  | PHẦN 3: Trọng tâm Nghiệp vụ Cốt lõi (Business Workflows: BW01, BW07, BW09)
14:00 - 22:00  | PHẦN 4: Báo cáo Chuyên sâu Report 4 (Thiết kế), Report 5 (Kiểm thử), Report 6 (Triển khai)
22:00 - 28:00  | PHẦN 5: Kịch bản Trình diễn Thực tế (Live Product Demonstration)
28:00 - 30:00  | PHẦN 6: Tổng kết Dự án & Định hướng Phát triển
-------------------------------------------------------------------------------------------------------
30:00 - 50:00  | PHẦN 7: Vòng Phản biện Chuyên môn & Trả lời Câu hỏi Hội đồng (Q&A Session)
```

---

# PHẦN 1: MỞ ĐẦU, GIỚI THIỆU SẢN PHẨM & BÀI TOÁN NGÀNH DƯỢC (00:00 – 03:00)
**Thời lượng:** 3 phút  
**Người trình bày:** **Trần Hồng Phước (Trưởng nhóm)**

### 1.1. Lời chào & Tuyên ngôn dự án (00:00 – 00:45)
- **Lời nói:**
  > *"Kính thưa Quý Thầy/Cô trong Hội đồng Đánh giá Đồ án Tốt nghiệp!  
  > Em tên là **Trần Hồng Phước**, đại diện cho **Nhóm SE_06**, xin phép được kính gửi lời chào trân trọng nhất đến Hội đồng.  
  > Hôm nay, nhóm chúng em xin được báo cáo kết quả hoàn thiện đề tài: **ABC Pharmacy — Hệ thống Quản trị Chuỗi Nhà thuốc Bán lẻ & Chăm sóc Sức khỏe tích hợp Trí tuệ Nhân tạo**.  
  > Đề tài được định vị là một giải pháp **Vertical SaaS** (Hệ điều hành chuyên sâu) dành riêng cho các chuỗi nhà thuốc vừa và nhỏ có quy mô từ **2 đến 20 chi nhánh** tại Việt Nam, vận hành tuân thủ nghiêm ngặt 3 tiêu chuẩn y tế quốc gia: **GPP** (Thực hành tốt nhà thuốc), **GSP** (Thực hành tốt bảo quản thuốc), và **GDP** (Thực hành tốt phân phối thuốc)."*
- **Điểm cần nhấn trên Slide:** Logo ABC Pharmacy, 3 chứng chỉ y tế GPP – GSP – GDP, quy mô chuỗi mục tiêu (2–20 cơ sở).

### 1.2. Bài toán nhức nhối của các chuỗi nhà thuốc vừa và nhỏ (00:45 – 01:45)
- **Lời nói:**
  > *"Kính thưa Thầy/Cô, khi các nhà thuốc truyền thống mở rộng thành chuỗi chi nhánh, họ lập tức đối mặt với **4 điểm nghẽn nghiêm trọng** mà các phần mềm POS phổ thông như KiotViet hay Sapo không thể giải quyết trọn vẹn:  
  > 1. **Dữ liệu phân tán & Khủng hoảng tồn kho:** Tồn kho giữa Kho tổng và các chi nhánh không đồng bộ theo thời gian thực; xảy ra tình trạng chi nhánh này thiếu hàng đứt gãy trong khi chi nhánh khác ứ đọng.  
  > 2. **Rủi ro thuốc quá hạn & Vi phạm pháp lý BYT:** Dược phẩm có hạn sử dụng và số lô sản xuất nghiêm ngặt. Việc xuất kho theo cảm tính hoặc nhập trước xuất trước (FIFO) khiến thuốc cận hạn bị lãng quên trong góc tủ, dẫn đến nguy cơ bán nhầm thuốc quá hạn cho bệnh nhân — vi phạm nghiêm trọng Thông tư 11 của Bộ Y Tế.  
  > 3. **Quá tải tại quầy POS & Đơn thuốc phức tạp:** Dược sĩ mất từ 3 đến 5 phút để gõ tay từng tên thuốc biệt dược, kiểm tra tương tác thuốc và tra cứu tồn kho từng lô, gây ùn tắc giờ cao điểm.  
  > 4. **Dự báo mua hàng thủ công:** Đặt hàng nhà cung cấp hoàn toàn dựa trên kinh nghiệm cảm tính của thủ kho, dẫn đến đọng vốn hàng tỷ đồng hoặc không kịp chuẩn bị thuốc theo mùa dịch bệnh."*
- **Điểm cần nhấn trên Slide:** Sơ đồ 4 nỗi đau (Pain Points): Lệch tồn kho, Rủi ro thuốc quá hạn, Ùn tắc POS, Dự báo cảm tính.

### 1.3. Giải pháp toàn diện của ABC Pharmacy (01:45 – 03:00)
- **Lời nói:**
  > *"Để giải quyết triệt để 4 bài toán trên, ABC Pharmacy mang đến một hệ sinh thái đồng bộ khép kín:  
  > - **Kiến trúc Microservices Event-Driven qua Apache Kafka:** Đảm bảo toàn bộ chuỗi chi nhánh đồng bộ giao dịch tức thì, chịu tải cao và tính sẵn sàng tuyệt đối.  
  > - **Bộ quy tắc vận hành Kho Dược GSP/FEFO tự động:** Quản lý vị trí lưu trữ 4 cấp (Khu vực - Dãy kệ - Tầng - Ô ngăn `Zone-Rack-Shelf-Bin`), thuật toán FEFO tự động ưu tiên xuất lô cận hạn trước, kết hợp cơ chế khóa bán tự động `LOCKED_BATCH` bảo vệ 100% sức khỏe người bệnh.  
  > - **Trợ lý AI hỗ trợ Dược sĩ (Human-in-the-loop):** Ứng dụng Computer Vision OCR đọc toa thuốc bản in bóc tách tự động trong 2 giây, RAG Tra cứu tương tác chống chỉ định, và Camera Barcode Scanner hỗ trợ dược sĩ thao tác không chạm.  
  > - **Hệ thống AI Forecast & Adaptive RFM:** Dự báo nhu cầu thuốc theo mùa vụ và nhận diện chu kỳ dùng thuốc của bệnh nhân mãn tính để chủ động chăm sóc khách hàng.  
  > Ngay sau đây, em xin kính mời bạn **Đinh Anh Phúc** báo cáo về việc tiếp thu và hoàn thiện các góp ý của Hội đồng từ lần Review 2."*
- **Điểm cần nhấn trên Slide:** Sơ đồ giải pháp 4 trụ cột: Microservices Kafka, Kho Dược FEFO, AI Dược sĩ, AI Forecast & RFM.

---

# PHẦN 2: BÁO CÁO TIẾP THU & MA TRẬN CHỈNH SỬA GÓP Ý REVIEW 2 (03:00 – 06:00)
**Thời lượng:** 3 phút  
**Người trình bày:** **Đinh Anh Phúc (Scrum Master & QA Lead)**

### 2.1. Tinh thần cầu thị & Tuyên bố nâng cấp (03:00 – 03:40)
- **Lời nói:**
  > *"Kính thưa Thầy/Cô, tại buổi Review 2 ngày 18/10/2026, nhóm đã nhận được những lời nhận xét vô cùng quý báu và xác đáng từ Quý Thầy/Cô phản biện về mặt nghiệp vụ kho y tế, phân lập dữ liệu và kiểm thử hệ thống.  
  > Trong giai đoạn chuẩn bị cho Review 3, nhóm đã tiến hành **tổng rà soát toàn bộ mã nguồn, cấu trúc cơ sở dữ liệu và quy trình nghiệp vụ**, cam kết **giải quyết triệt để 100% các vấn đề được Hội đồng lưu ý**, không còn bất kỳ nợ kỹ thuật (technical debt) nào tồn đọng."*

### 2.2. Ma trận Đối chiếu 10 Góp ý của Reviewer & Kết quả khắc phục thực tế (03:40 – 06:00)

| STT | Ý kiến đóng góp của Hội đồng tại Review 2 | Hiện trạng khi Review 2 | Giải pháp cải tiến & Kết quả đạt được tại Review 3 | Minh chứng mã nguồn & Kết quả |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **Phân biệt rõ ràng FEFO vs FIFO trong toàn bộ hệ thống** | Sơ đồ kho và mã nguồn có chỗ còn ghi nhãn FIFO; chưa phân tầng rõ rệt ngưỡng cận hạn. | Chuẩn hóa 100% thuật toán **FEFO (First-Expired, First-Out)**. Xây dựng bộ lọc 3 màu: Vàng (60–90 ngày), Cam (30–60 ngày), Đỏ (<30 ngày hoặc quá hạn). POS ưu tiên lô gần hạn nhất còn khả dụng. | `medicine.service.ts:889`, `sales.service.ts:221`, `uc-30-fefo.spec.ts` (PASS) |
| **02** | **Cơ chế khóa bán thuốc hết hạn tự động (Zero Expired Sales)** | Lô hết hạn vẫn có thể bị thêm vào giỏ hàng nếu dược sĩ gõ mã tay; rủi ro nhận hàng hoàn ghi đè trạng thái. | Kích hoạt cờ **`LOCKED_BATCH` / `EXPIRED`** tự động. POS chặn thanh toán tuyệt đối, hiển thị cảnh báo đỏ vi phạm y tế. Đảm bảo trạng thái khóa bất biến qua mọi luồng hoàn hàng/điều chuyển. | `medicine.service.ts:1082`, `RetailView.tsx:2390`, `disposal-near-expiry.spec.ts` |
| **03** | **Biên bản xuất hủy thuốc y tế chuẩn Bộ Y Tế (BW09)** | Chưa có mẫu biên bản xuất hủy chính quy; thiếu thông tin hội đồng tiêu hủy và chứng thư rác y tế. | Chuẩn hóa quy trình theo **Thông tư 11/2025/TT-BYT & NĐ 155/2018/NĐ-CP**: Lập Hội đồng 3 bên (Dược sĩ trưởng, Trưởng kho, Ban Giám đốc), bàn giao đơn vị rác y tế, tải chứng thư tiêu hủy và trừ kho 100%. | `StockDisposal.tsx`, `InventoryHistory.tsx:1510`, `InventoryTransaction.schema` |
| **04** | **Phân lập phạm vi chi nhánh trong Kiểm kê kho (BW07)** | Dropdown kiểm kê tải toàn bộ kho chuỗi; dùng chuỗi `batchNo` dễ nhầm lẫn; thiếu quyền hạn kiểm kê cơ sở. | Phân lập nghiêm ngặt theo `branchId`. Định danh chính xác bằng **`batchId` (ObjectId)**. Kiểm kê 2 bước: Bước 1 Lưu nháp (`DRAFT`) chốt snapshot tồn sổ; Bước 2 Quản lý duyệt (`COMPLETED`) qua DB Transaction. | `inventory-check.controller.ts`, `medicine.service.ts:1177`, `InventoryCheck.tsx` |
| **05** | **Bắt buộc giải trình chênh lệch & Xóa cache Redis kiểm kê** | Cho phép lưu lý do rỗng khi có chênh lệch; sau khi chốt số liệu không nhảy ngay do vướng Cache Redis. | Bắt buộc nhập lý do giải trình khi `difference !== 0`. Khi Quản lý duyệt `COMPLETED`, backend tự động xóa toàn bộ khóa Cache Redis liên quan (`medicines:dropdown:*`, `medicines:stats:*`) và ghi Audit Log. | `medicine.service.ts:1230`, `inventory-check.controller.ts:95` |
| **06** | **Quy trình kích hoạt chi nhánh mới nghiêm ngặt (BW01)** | Chi nhánh tạo mới mặc định `active`; thiếu hồ sơ pháp lý giấy phép GPP; sinh mã cơ sở dễ trùng lặp. | Đặt trạng thái ban đầu là **`preparing`**. Bổ sung trường GPP (`gppNumber`, `gppExpiryDate`). Kiểm tra 4 điều kiện tiên quyết trước khi kích hoạt sang **`active`**. Thuật toán sinh mã `BR-xxx` kiểm tra ứng viên chống trùng lặp. | `branch.schema.ts`, `branch.service.ts:115`, `user-service.controller.ts:91` |
| **07** | **Bảo vệ tính toàn vẹn bảng giá SKU gốc khi Flash Sale** | Giảm giá xả hàng cận date ghi đè trực tiếp lên trường `price` gốc của thuốc toàn chuỗi. | Tách độc lập **Bảng giá chi nhánh (`BranchPricing`)** và **Chiến dịch Flash Sale (`FlashSaleCampaign`)**. Lô cận hạn được giảm giá tại cơ sở mà không làm thay đổi giá niêm yết chuẩn của thuốc gốc. | `sales.service.ts:446`, `uc-39-branch-pricing.spec.ts`, `uc-74-flash-sale.spec.ts` |
| **08** | **Nâng cấp độ bao phủ và chất lượng kiểm thử (Report 5)** | Báo cáo Review 2 chỉ có 284 test cases; thiếu kịch bản kiểm tra biên, ngoại lệ timeout và race-condition. | Mở rộng lên **58 Test Suites, 514 Test Cases (PASS 100%)**. Tuân thủ nghiêm ngặt **Test-Coupled Mandate** kẹp đủ 3 nhóm giá trị: `[Normal Values]`, `[Boundary Values]`, `[Abnormal Values]`. | `Report5_Test_Report.xlsx`, `npm run test:ci` (All Suites Passed in GitHub Actions) |
| **09** | **Loại bỏ hoàn toàn Mock Data & Khắc phục rò rỉ bảo mật** | Còn nút bấm "Developer Test Accounts" điền tự động tài khoản đặc quyền trên giao diện production. | Áp dụng chính sách **Zero Mock Data** trên toàn bộ môi trường Production. Khóa hoàn toàn Developer Test Accounts; chỉ cho phép đăng nhập qua cơ chế JWT xác thực mã hóa bcrypt từ CSDL MongoDB Atlas. | `Login.tsx:12`, `auth.service.ts`, VPS Production Audit Log |
| **10** | **Đồng bộ ứng dụng Mobile & Webcam Barcode Scanner** | Bản mobile chưa đồng bộ mượt mà danh sách kiểm kê; dược sĩ tại quầy thiếu tính năng quét Barcode camera trực tiếp. | Hoàn thiện Mobile Expo kiểm kho đồng bộ API Gateway. Bổ sung tính năng **Webcam Live Barcode/QR Scanner** với 3 engine song song (`BarcodeDetector` + `jsQR` + `@zxing`) tại quầy POS Dược sĩ. | `RetailView.tsx` (Commit `3e970c7`), `InventoryCheckModal.tsx` (Commit `8a8e936`) |

- **Lời nói chuyển tiếp:**
  > *"Sau đây, để minh chứng cho các cải tiến nghiệp vụ chuẩn hóa này, em xin kính chuyển lời cho bạn **Nguyễn Tiến Đạt** và bạn **Nguyễn Văn Nam** trình bày sâu về **3 Business Workflows cốt lõi** của hệ thống."*

---

# PHẦN 3: TRỌNG TÂM NGHIỆP VỤ CỐT LÕI (BUSINESS WORKFLOWS) (06:00 – 14:00)
**Thời lượng:** 8 phút  
**Người trình bày:** **Nguyễn Tiến Đạt (Kho & Logistics)** & **Nguyễn Văn Nam (Mua hàng & Phân tích)**

```
06:00 - 08:30  | BW01: Thiết lập & Mở Chi Nhánh Mới (Nguyễn Văn Nam)
08:30 - 11:15  | BW07: Kiểm Kê Kho & Xử Lý Biên Bản Sai Lệch (Nguyễn Tiến Đạt)
11:15 - 14:00  | BW09: Quản Trị Thuốc Cận Hạn, Khóa Bán & Xuất Hủy Y Tế (Nguyễn Tiến Đạt)
```

### 3.1. BUSINESS WORKFLOW 01 (BW01) — Thiết Lập & Kích Hoạt Chi Nhánh Mới (06:00 – 08:30)
**Người trình bày: Nguyễn Văn Nam**

- **Lời nói:**
  > *"Kính thưa Hội đồng, quy trình **BW01** giải quyết bài toán nhân bản và mở rộng chuỗi nhà thuốc nhanh chóng nhưng vẫn bảo đảm tuyệt đối tính tuân thủ pháp lý y tế.  
  > **1. Nguyên tắc Kế thừa Dữ liệu Gốc:**  
  > - Toàn bộ chuỗi dùng chung một Danh mục Dược phẩm chuẩn (`Medicine Master`). Khi chi nhánh mới được tạo lập, hệ thống không bắt buộc nhập liệu lại từ đầu mà tự động kế thừa toàn bộ thông tin hoạt chất, quy cách đóng gói và bảng giá niêm yết chuẩn.  
  > - Chi nhánh mới ban đầu chỉ ở trạng thái **Đang chuẩn bị (`preparing`)**, hoàn toàn chưa thể phát sinh giao dịch bán lẻ.  
  > **2. Cổng kiểm soát 4 Điều kiện Tiên quyết (Server-side Enforcement):**  
  > Hệ thống từ chối kích hoạt nếu thiếu 1 trong 4 điều kiện sau:  
  > - *Điều kiện 1:* Đã nhập số chứng chỉ Thực hành tốt nhà thuốc **GPP** và ngày cấp phép còn hiệu lực theo dữ liệu Sở Y Tế.  
  > - *Điều kiện 2:* Đã phân quyền một Dược sĩ Quản lý cơ sở hợp lệ có vai trò `branch`.  
  > - *Điều kiện 3:* Đã số hóa bản đồ kho và quầy thuốc GSP phân chia theo khu vực bảo quản đặc thù (thuốc thường, kháng sinh, thuốc kê đơn, khu vực biệt trữ).  
  > - *Điều kiện 4:* Đã hoàn tất tiếp nhận lô hàng điều chuyển đầu tiên (`Stock Transfer Receive`) từ Kho Tổng để bảo đảm quầy có tồn kho thực tế.  
  > Chỉ khi đạt đủ 4 điều kiện trên, Ban Giám Đốc mới có thể nhấn nút **'Kích hoạt mở bán'**, chuyển chi nhánh sang trạng thái **`active`**."*
- **Điểm cần nhấn trên Slide:** Sơ đồ BPMN BW01, bảng 4 điều kiện kích hoạt, cơ chế kế thừa bảng giá niêm yết.

---

### 3.2. BUSINESS WORKFLOW 07 (BW07) — Kiểm Kê Kho & Xử Lý Biên Bản Sai Lệch (08:30 – 11:15)
**Người trình bày: Nguyễn Tiến Đạt**

- **Lời nói:**
  > *"Kính thưa Thầy/Cô, trong quản trị kho dược, kiểm kê là thao tác nhạy cảm nhất vì liên quan trực tiếp đến thất thoát thuốc và gian lận thương mại. **BW07** của ABC Pharmacy được thiết kế theo quy trình **Kiểm kê 2 bước độc lập** có bảo chứng toàn vẹn dữ liệu:  
  > **Bước 1: Lập phiên & Chốt snapshot tồn sổ (Freeze Snapshot):**  
  > - Thủ kho hoặc nhân viên chi nhánh mở phiên kiểm kê. Hệ thống lập tức chụp lại số liệu tồn sổ kế toán theo từng **`batchId` (ObjectId duy nhất của lô)** tại thời điểm đó.  
  > - Nhân viên tiến hành đếm thực tế bằng cách quét Barcode trên Mobile hoặc nhập số lượng đếm trên Web. Hệ thống kiểm soát nhập liệu chặt chẽ: từ chối số âm, số thập phân lẻ đối với đơn vị viên/hộp.  
  > - Nếu có chênh lệch giữa thực đếm và tồn sổ (`difference !== 0`), giao diện **bắt buộc nhân viên phải nhập lý do giải trình** (ví dụ: vỡ hỏng trong bảo quản, dán nhầm tem vỉ, hoặc hao hụt tự nhiên). Phiên kiểm kê ở bước này **chỉ được phép lưu ở trạng thái Nháp (`DRAFT`)**, nhân viên đếm tuyệt đối không có quyền tự điều chỉnh tồn kho hệ thống!  
  > **Bước 2: Phê duyệt của Quản lý & Cân bằng tồn qua Database Transaction:**  
  > - Quản lý chi nhánh hoặc Trưởng kho đăng nhập vào duyệt biên bản. Nếu số liệu nghi vấn, Quản lý bấm yêu cầu đếm lại (`RECOUNT`).  
  > - Khi Quản lý bấm **'Hoàn tất kiểm kê' (`COMPLETED`)**, backend thực thi toàn bộ tác vụ cân bằng bên trong **MongoDB ClientSession Transaction** để bảo đảm tính nguyên tử (Atomicity):  
  >   1. Cập nhật số lượng tồn kho mới. Nếu lô thuốc đã hết hạn, tự động gắn cờ `status = 'EXPIRED'`.  
  >   2. Tự động sinh bản ghi `InventoryTransaction` lưu vết đầy đủ: `batchId`, `branchId`, `stockBefore`, `stockAfter`, `quantityChange`, người thực hiện và lý do giải trình.  
  >   3. Tự động dọn dẹp các khóa Cache Redis liên quan để toàn bộ màn hình POS và danh mục thuốc cập nhật số tồn mới ngay tức khắc.  
  >   4. Đồng bộ dữ liệu điều chỉnh lên CSDL Dược Quốc gia theo chuẩn API Bộ Y Tế."*
- **Điểm cần nhấn trên Slide:** Sơ đồ 4 giai đoạn kiểm kê, cơ chế Snapshot `batchId`, Database Transaction và cơ chế bắt buộc giải trình chênh lệch.

---

### 3.3. BUSINESS WORKFLOW 09 (BW09) — Quản Trị Thuốc Cận Hạn, Khóa Bán & Xuất Hủy Y Tế (11:15 – 14:00)
**Người trình bày: Nguyễn Tiến Đạt**

- **Lời nói:**
  > *"Kính thưa Hội đồng, quy trình **BW09** là lá chắn an toàn tối cao của ABC Pharmacy trong việc bảo vệ tính mạng người tiêu dùng và tuân thủ Luật Dược 2016:  
  > **1. Phân tầng cảnh báo FEFO 3 cấp độ:**  
  > Mỗi đêm, hệ thống chạy tác vụ tự động rà soát toàn bộ hàng triệu lô thuốc trong chuỗi và phân loại trực quan:  
  > - 🟡 **Cận Hạn Vàng (60 – 90 ngày):** Thuốc rơi vào diện kích cầu. Quản lý có thể tạo chương trình Flash Sale giảm giá 20–30% cho riêng lô thuốc này tại chi nhánh để thu hồi vốn. Hệ thống bảo vệ tính toàn vẹn: giá khuyến mãi được lưu ở bảng riêng (`BranchPricing`), tuyệt đối không làm sai lệch giá gốc niêm yết toàn chuỗi.  
  > - 🟠 **Cận Hạn Cam (15 – 59 ngày):** Khi Dược sĩ bán hàng tại POS, thuật toán FEFO tự động chọn lô này để xuất trước. Trên màn hình POS xuất hiện huy hiệu cận hạn và số ngày còn lại, nhắc nhở Dược sĩ tư vấn người bệnh uống đủ liệu trình trước ngày hết hạn.  
  > - 🔴 **Cận Hạn Đỏ (< 15 ngày hoặc Đã Quá Hạn):** Hệ thống **TỰ ĐỘNG KÍCH HOẠT TRẠNG THÁI KHÓA BÁN (`LOCKED_BATCH`)**. Cho dù Dược sĩ cố tình quét mã Barcode hay tìm kiếm, POS lập tức bật cảnh báo đỏ cấm xuất hóa đơn.  
  > **2. Quy trình Tiêu hủy Rác Y Tế Nguy Hại (Thông tư 11/2025/TT-BYT):**  
  > - Thuốc hết hạn không được phép vứt bỏ tùy tiện ra môi trường. Hệ thống hỗ trợ lập **Biên bản kiểm kê xuất hủy 3 bên** gồm: Dược sĩ trưởng, Quản lý kho và Đại diện Ban Giám Đốc.  
  > - Lô thuốc được chuyển vào khu vực niêm phong cách ly, sau đó bàn giao cho Đơn vị Xử lý Chất thải Nguy hại được cấp phép.  
  > - Khi đơn vị xử lý cấp **Chứng thư Tiêu hủy hợp lệ**, Quản lý tải ảnh chứng thư lên hệ thống và duyệt phiếu xuất hủy. Tồn kho của lô được khấu trừ về 0 tức thì, hạch toán chi phí hao hụt vào sổ tài chính và ghi vết vĩnh viễn trên Audit Log."*
- **Điểm cần nhấn trên Slide:** Huy hiệu 3 màu FEFO trực quan, cơ chế khóa bán `LOCKED_BATCH`, quy trình xuất hủy rác y tế chuẩn BYT.

---

# PHẦN 4: BÁO CÁO CHUYÊN SÂU REPORT 4, 5, 6 (14:00 – 22:00)
**Thời lượng:** 8 phút  
**Người trình bày:** **Trần Hồng Phước (Report 4 & 6)** & **Đinh Anh Phúc (Report 5)**

```
14:00 - 17:00  | Report 4: Software Design Document (SDD) (Trần Hồng Phước)
17:00 - 20:00  | Report 5: Software Test Documentation (Đinh Anh Phúc)
20:00 - 22:00  | Report 6: Deployment, Operation & Security (Trần Hồng Phước)
```

### 4.1. REPORT 4: SOFTWARE DESIGN DOCUMENT (KIẾN TRÚC HỆ THỐNG) (14:00 – 17:00)
**Người trình bày: Trần Hồng Phước**

- **Lời nói:**
  > *"Kính thưa Hội đồng, em xin trình bày nội dung cốt lõi của **Report 4 — Tài liệu Thiết kế Phần mềm (SDD)**:  
  > **1. Mô hình Kiến trúc Microservices Phân tán & Bounded Context:**  
  > Hệ thống được thiết kế theo chuẩn kiến trúc hướng dịch vụ với **API Gateway** đóng vai trò cổng giao tiếp duy nhất cho Web và Mobile. Tầng backend được chia thành **6 Microservices chuyên biệt** theo ranh giới nghiệp vụ độc lập:  
  > - `auth-service`: Quản lý danh tính, JWT token, mã hóa mật khẩu bcrypt.  
  > - `user-service`: Quản lý nhân viên chi nhánh, phân quyền RBAC và hồ sơ khách hàng.  
  > - `inventory-service`: Trái tim quản trị dược phẩm, theo dõi Lô, Hạn dùng, Sơ đồ kho GSP và Kiểm kê.  
  > - `supplier-service`: Mua hàng GDP, RFQ, PO và Nghiệm thu hàng hóa GRN.  
  > - `orders-service`: Bán lẻ POS, Đơn thuốc, Cổng thanh toán PayOS VietQR và Báo cáo tài chính.  
  > - `ai-service (Python FastAPI)`: Xử lý chuyên sâu Computer Vision OCR đơn thuốc, mô hình dự báo nhu cầu và trợ lý RAG tra cứu y khoa.  
  > **2. Giao thức Event-Driven qua Apache Kafka & Cơ chế HTTP 202 Accepted:**  
  > - Tuân thủ nguyên tắc không gọi HTTP trực tiếp giữa các microservices nội bộ để tránh nghẽn cascade (cascading failure). Mọi giao tiếp đều đi qua **Apache Kafka**.  
  > - Với các tác vụ Ghi (Tạo đơn, Cập nhật tồn kho, Phê duyệt PO): API Gateway phát sự kiện qua `kafkaClient.emit()`, lập tức phản hồi mã **HTTP 202 Accepted** cho Client. Dữ liệu được xử lý ngầm bất đồng bộ đảm bảo trải nghiệm người dùng mượt mà tuyệt đối.  
  > - Với các tác vụ Đọc: Áp dụng chiến lược **Redis Cache-Aside**. Nếu Cache Hit, dữ liệu trả về trong dưới 10ms. Nếu Cache Miss, Gateway gọi `kafkaClient.send()` xuống microservice lấy dữ liệu từ MongoDB rồi lưu ngược lại Redis với TTL cấu hình phù hợp.  
  > **3. Thiết kế Cơ sở Dữ liệu & Quản lý Kho 4 Cấp:**  
  > - Schema MongoDB được tối ưu hóa cho ngành dược: Thực thể Thuốc (`Medicine`) kết nối với Lô hàng (`MedicineBatch`), trong đó mỗi lô lưu trữ tọa độ kho 4 cấp: `Zone` (Khu bảo quản) - `Rack` (Kệ) - `Shelf` (Tầng) - `Bin` (Ô ngăn), giúp thủ kho định vị chính xác vị trí hộp thuốc trong vòng 5 giây."*
- **Điểm cần nhấn trên Slide:** Sơ đồ Architecture Blueprint, luồng Kafka Event-Driven 202 vs Redis Cache-Aside, sơ đồ tọa độ kho 4 cấp.

---

### 4.2. REPORT 5: SOFTWARE TEST DOCUMENTATION (BÁO CÁO KIỂM THỬ) (17:00 – 20:00)
**Người trình bày: Đinh Anh Phúc**

- **Lời nói:**
  > *"Kính thưa Quý Thầy/Cô, em xin báo cáo phần **Report 5 — Tài liệu Kiểm thử Phần mềm**, đây là niềm tự hào lớn nhất của nhóm trong giai đoạn Review 3:  
  > **1. Quy mô & Kết quả Kiểm thử Toàn diện:**  
  > So với 284 ca kiểm thử ở Review 2, tại Review 3 nhóm đã nâng cấp toàn diện hệ sinh thái test lên:  
  > - **Tổng số Test Suites:** **58 / 58 suites PASS 100%**.  
  > - **Tổng số Test Cases:** **514 / 514 tests PASS 100%**.  
  > - **Độ phủ mã nguồn (Code Coverage):** Đạt **88.6% Statement Coverage** trên toàn bộ các Service và Controller cốt lõi của Backend.  
  > **2. Thực thi Chính sách Nghiêm ngặt 'Test-Coupled Mandate':**  
  > Theo quy định phát triển Fullstack Playbook v2.0 của dự án, mọi hàm nghiệp vụ, Service hoặc Controller mới đều **bắt buộc phải kẹp file test `*.spec.ts` tương ứng ngay trong cùng lần commit**. Tuyệt đối không commit mã nguồn mà thiếu bài test (Chính sách Zero Untested Code).  
  > **3. Cấu trúc 3 Nhóm Giá Trị Chuẩn Guideline:**  
  > Toàn bộ 514 test cases đều được phân loại rành mạch theo 3 nhóm giá trị:  
  > - **`[Normal Values]` (282 tests):** Kiểm tra các luồng nghiệp vụ chuẩn thành công: Tạo đơn POS, xuất kho FEFO, duyệt GRN, đăng nhập phân quyền, tích hợp PayOS.  
  > - **`[Boundary Values]` (118 tests):** Thử nghiệm tại các điểm biên cực hạn: Ngưỡng hạn dùng đúng ngày thứ 15, ngày thứ 90; số tồn kho bằng 0 hoặc đúng 1 đơn vị; biên bản kiểm kê chênh lệch đúng 0; kiểm tra tính lũy tiến (idempotency) khi người dùng bấm đúp chuột liên tiếp tránh trùng lặp giao dịch.  
  > - **`[Abnormal Values]` (114 tests):** Kiểm tra khả năng chịu lỗi và an ninh: Cố tình thêm lô thuốc đã hết hạn vào POS; kích hoạt chi nhánh thiếu giấy phép GPP; số lượng kiểm kê âm hoặc chữ cái; giả lập sự cố ngắt kết nối Kafka broker hoặc MongoDB timeout. Hệ thống đều bắt ngoại lệ chính xác, ném mã lỗi HTTP chuẩn và không làm sập ứng dụng.  
  > Toàn bộ 58 suites test được chạy tự động trong CI/CD Pipeline của GitHub Actions qua bộ báo cáo `tap-reporter.js`, bảo đảm không có bất kỳ dòng mã lỗi nào được phép lọt lên nhánh chính."*
- **Điểm cần nhấn trên Slide:** Biểu đồ tròn 3 nhóm giá trị kiểm thử, bảng số liệu 58 suites / 514 tests PASS 100%, ảnh chụp màn hình GitHub Actions CI test pass.

---

### 4.3. REPORT 6: DEPLOYMENT, OPERATION & SECURITY REPORT (TRIỂN KHAI & BẢO MẬT) (20:00 – 22:00)
**Người trình bày: Trần Hồng Phước**

- **Lời nói:**
  > *"Kính thưa Thầy/Cô, em xin tóm lược nội dung **Report 6 — Triển khai, Vận hành và Đánh giá An toàn**:  
  > **1. Hạ tầng Triển khai Production Thực tế:**  
  > - Toàn bộ hệ thống hiện đang vận hành thực tế trên máy chủ **VPS Ubuntu Server** tại tên miền chính thức: `https://abcpharmacy.store`.  
  > - Sử dụng **Docker & Docker Compose Multi-service Monorepo**, bao bọc các container độc lập cho API Gateway, các Microservices, Redis, MongoDB Replica Set, và Nginx Reverse Proxy được chứng thực mã hóa bảo mật qua chứng chỉ **Let's Encrypt SSL/TLS**.  
  > **2. Tự động hóa CI/CD Pipeline & GitOps:**  
  > - Pipeline GitHub Actions tự động thực thi 4 công đoạn kiểm tra mỗi khi có Pull Request: (1) Linting kiểm tra cú pháp, (2) Chạy bộ test tự động `npm run test:ci`, (3) Build Docker image với cơ chế GitHub Actions Cache (`cache-from type=gha`), (4) Đẩy image lên Docker Registry và kích hoạt Webhook tự động cập nhật hệ thống production.  
  > **3. Chính sách An ninh & Bảo mật Y tế:**  
  > - **Chính sách Zero Mock Data:** 100% dữ liệu danh mục thuốc, số lô, tồn kho và khách hàng đều là dữ liệu thực tế lưu trữ trên MongoDB, hoàn toàn không có dữ liệu hardcode giả lập.  
  > - **Bảo mật Dữ liệu Bệnh nhân:** Áp dụng cơ chế Masking che mờ thông tin cá nhân (SĐT, tên bệnh nhân) trên các màn hình công cộng và nhật ký kiểm toán.  
  > - **Chính sách Không dùng Push Notification của Google/Hệ điều hành:** Nhằm bảo mật quyền riêng tư của bệnh nhân và tránh phụ thuộc bên thứ ba, 100% thông báo trong hệ thống được truyền tải nội bộ qua **Socket.IO Realtime Rooms** và Toast In-app Notifications."*
- **Điểm cần nhấn trên Slide:** Sơ đồ hạ tầng VPS Docker Nginx, quy trình CI/CD GitHub Actions, chính sách bảo mật Zero Mock Data.

---

# PHẦN 5: KỊCH BẢN TRÌNH DIỄN THỰC TẾ (LIVE PRODUCT DEMO) (22:00 – 28:00)
**Thời lượng:** 6 phút  
**Sản phẩm xuyên suốt:** Thuốc kháng sinh **Augmentin 1g** (Hộp 14 viên)  
**Kịch bản điều phối:** Cả 4 thành viên phối hợp nhịp nhàng theo chuỗi giá trị khép kín:

```
22:00 - 23:15  | BƯỚC 1: Quản Trị Kho & Theo Dõi Lô Hạn Dùng FEFO (Nguyễn Tiến Đạt)
23:15 - 24:30  | BƯỚC 2: Dự Báo Nhu Cầu AI & Phê Duyệt Đơn Mua PO (Nguyễn Văn Nam)
24:30 - 25:45  | BƯỚC 3: Nghiệm Thu Nhập Kho GRN & AI Vision Đếm Hộp (Nguyễn Tiến Đạt)
25:45 - 27:00  | BƯỚC 4: Bán Lẻ POS, Quét Barcode Webcam & Ưu Tiên FEFO (Trần Hồng Phước)
27:00 - 28:00  | BƯỚC 5: Trợ Lý Dược Sĩ AI, Đối Soát Doanh Thu PayOS (Đinh Anh Phúc)
```

### Chi tiết Thao tác & Lời thoại Phối hợp trong Live Demo:

#### 🔹 BƯỚC 1: Quản trị Kho & Lô Hạn Dùng (22:00 – 23:15)
- **Người thao tác:** **Nguyễn Tiến Đạt** (Đăng nhập tài khoản `warehouse@vinapharmacy.com`).
- **Thao tác màn hình:** Mở menu `/warehouse/inventory/lot-tracking`. Tìm thuốc *Augmentin 1g*.
- **Lời dẫn:**
  > *"Kính thưa Thầy/Cô, bắt đầu luồng demo, em mở màn hình Quản lý Lô & Hạn dùng của thuốc Augmentin 1g tại Chi nhánh BR-001.  
  > Trên màn hình, Thầy/Cô có thể thấy hệ thống hiển thị rõ ràng tọa độ vị trí: `Khu A - Kệ 02 - Tầng 3 - Ô 05`.  
  > Hiện tại chi nhánh có 2 lô: Lô `AUG-2026-01` còn hạn 45 ngày (mang huy hiệu Cam - FEFO ưu tiên xuất) và Lô `AUG-2025-09` đã quá hạn 10 ngày (mang huy hiệu Đỏ - hệ thống đã tự động gán cờ `LOCKED_BATCH`). Ngay bây giờ, tồn kho khả dụng chỉ còn 10 hộp, sắp chạm ngưỡng an toàn."*

#### 🔹 BƯỚC 2: AI Dự Báo Nhu Cầu & Mua Hàng GDP (23:15 – 24:30)
- **Người thao tác:** **Nguyễn Văn Nam** (Đăng nhập tài khoản `director@vinapharmacy.com`).
- **Thao tác màn hình:** Mở trang `/admin/demand-forecast` -> Xem gợi ý nhập hàng Augmentin -> Vào `/admin/purchase-orders` duyệt đơn PO.
- **Lời dẫn:**
  > *"Tiếp nối nhu cầu bổ sung hàng, hệ thống AI Forecast dựa trên lịch sử bán hàng 90 ngày qua và mùa dịch viêm đường hô hấp, đã tự động tính toán và đưa ra đề xuất bổ sung **50 hộp Augmentin 1g**.  
  > Em vào danh mục Mua hàng, hệ thống đã tự động tạo sẵn Đơn đặt hàng PO gửi đến Nhà cung cấp Dược Hậu Giang (đã thẩm định đạt chứng chỉ GDP). Giám đốc chỉ cần kiểm tra hạn mức ngân sách chi nhánh và bấm 'Phê duyệt PO'."*

#### 🔹 BƯỚC 3: Nghiệm Thu Nhập Kho GRN & AI Computer Vision Đếm Hộp (24:30 – 25:45)
- **Người thao tác:** **Nguyễn Tiến Đạt** (Mở giao diện Kiểm nhận GRN trên Mobile/Web).
- **Thao tác màn hình:** Mở PO vừa duyệt -> Tạo phiếu GRN -> Bật tính năng AI Vision bóc tách hình ảnh kiện hàng -> Bấm hoàn tất nhập kho.
- **Lời dẫn:**
  > *"Khi xe giao hàng của NCC đến chi nhánh, thủ kho mở phiếu Nghiệm thu hàng nhập (GRN).  
  > Thay vì đếm tay từng hộp dễ sai sót, thủ kho sử dụng tính năng **Computer Vision Bounding Box**: Chụp ảnh kiện hàng 6 hộp thuốc, mô hình AI tự động nhận diện và đếm chính xác 6 hộp, tự động điền số lượng thực nhận `actualQty = 6`.  
  > Thủ kho nhập Số lô mới `AUG-2026-99`, Hạn dùng 2028, xếp vào ô ngăn `A-02-03-05` và bấm Hoàn tất GRN. Ngay lập tức, kho được cộng thêm hàng thành công!"*

#### 🔹 BƯỚC 4: Bán Lẻ POS, Quét Live Barcode & Xuất Thuốc FEFO (25:45 – 27:00)
- **Người thao tác:** **Trần Hồng Phước** (Đăng nhập tài khoản `pharmacist@vinapharmacy.com`).
- **Thao tác màn hình:** Mở quầy POS `/pharmacist`. Bật webcam quét mã Barcode hộp thuốc Augmentin. Thử chọn lô hết hạn -> Thử bán bình thường.
- **Lời dẫn:**
  > *"Tại quầy bán thuốc, Dược sĩ thao tác bán hàng:  
  > Đầu tiên, em bật tính năng **Webcam Live Barcode Scanner**: Đưa hộp thuốc trước camera, âm thanh Beep vang lên và Augmentin 1g lập tức nhảy vào giỏ hàng. Quét tiếp lần 2, số lượng tăng lên 2 mà không bị nhân đôi dòng.  
  > Tiếp theo, em thử cố tình chọn lô hết hạn `AUG-2025-09`: Hệ thống lập tức bật cảnh báo đỏ **`[KHÓA BÁN] Lô thuốc đã hết hạn sử dụng!`** và cấm thanh toán.  
  > Khi chọn bán bình thường, hệ thống tự động gán Lô `AUG-2026-01` theo nguyên tắc **FEFO**, hiển thị nhãn cảnh báo 'Hạn dùng còn 45 ngày' để dược sĩ tư vấn khách hàng. Em bấm Thanh toán xuất mã VietQR PayOS."*

#### 🔹 BƯỚC 5: Trợ Lý AI Dược Sĩ & Đối Soát Doanh Thu Realtime (27:00 – 28:00)
- **Người thao tác:** **Đinh Anh Phúc** (Mở Chatbot AI Dược sĩ -> Mở Báo cáo Tài chính).
- **Thao tác màn hình:** Nhập câu hỏi kiểm tra tương tác thuốc -> Mở Dashboard Báo cáo Doanh thu & Tồn kho.
- **Lời dẫn:**
  > *"Song song với bán thuốc, Dược sĩ có thể sử dụng Trợ lý AI y khoa: Khi gõ hoặc nói 'Augmentin có dùng chung được với Allopurinol không?', hệ thống RAG truy xuất dược thư quốc gia cảnh báo ngay nguy cơ tăng dị ứng phát ban da.  
  > Cuối cùng, giao dịch bán hàng POS hoàn tất thành công. Em quay trở lại Dashboard Báo cáo Doanh thu: Số tiền thanh toán qua PayOS được đối soát tức thì, và tồn kho thuốc của Lô FEFO được trừ chính xác từ 10 xuống còn 8 hộp trên toàn hệ thống!"*

---

# PHẦN 6: TỔNG KẾT DỰ ÁN & ĐỊNH HƯỚNG TƯƠNG LAI (28:00 – 30:00)
**Thời lượng:** 2 phút  
**Người trình bày:** **Trần Hồng Phước (Trưởng nhóm)**

- **Lời nói:**
  > *"Kính thưa Quý Thầy/Cô trong Hội đồng,  
  > Qua 28 phút trình bày và demo thực tế, Nhóm SE_06 đã chứng minh được:  
  > 1. Một hệ thống phần mềm **vận hành thực tế 100% trên môi trường Production**, giải quyết trọn vẹn chuỗi giá trị khép kín từ Mua hàng GDP -> Quản trị kho GSP theo FEFO -> Bán lẻ GPP tại quầy -> Chăm sóc khách hàng trung thành.  
  > 2. Đạt độ hoàn thiện kỹ thuật xuất sắc với kiến trúc **Microservices Event-Driven qua Apache Kafka, Redis Cache-Aside**, bộ kiểm thử **514 test cases PASS 100%**, và tuân thủ tuyệt đối chuẩn mực **Zero Mock Data**.  
  > 3. Tích hợp Trí tuệ Nhân tạo thực chất với cơ chế **Human-in-the-loop**, giúp nâng cao năng suất của Dược sĩ mà vẫn bảo đảm tối thượng an toàn sức khỏe của người bệnh.  
  > **Định hướng phát triển trong tương lai:** Nhóm dự kiến sẽ kết nối sâu hơn với cổng Dữ liệu Dược Quốc gia của Cục Quản lý Dược, hoàn thiện mô hình AI nhận diện đơn thuốc viết tay bằng OCR chuyên biệt, và mở rộng giải pháp triển khai đa cụm Kubernetes (K8s).  
  > Nhóm SE_06 xin chân thành cảm ơn Quý Thầy/Cô trong Hội đồng đã chú ý lắng nghe. Nhóm chúng em đã sẵn sàng đón nhận các câu hỏi nhận xét và phản biện từ Thầy/Cô!"*

---

# PHẦN 7: BỘ CÂU HỎI PHẢN BIỆN CHUYÊN SÂU & TRẢ LỜI MẪU (Q&A SESSION) (30:00 – 50:00)
**Thời lượng:** 15 – 20 phút  
**Bộ 12 Câu hỏi Hóc búa nhất của Hội đồng & Phương án Trả lời Xuất sắc:**

### ❓ CÂU 01: Tại sao nhóm lại chọn Apache Kafka làm Message Broker mà không dùng RabbitMQ hay gọi HTTP REST trực tiếp giữa các Service?
- **Người trả lời chính:** **Trần Hồng Phước**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, nhóm đã cân nhắc rất kỹ bài toán đặc thù của chuỗi bán lẻ dược phẩm:  
  > 1. **Nhược điểm của gọi HTTP trực tiếp:** Khi quầy POS bán một đơn thuốc, nếu gọi HTTP đồng bộ sang Service Kho, Service Tích điểm và Service Báo cáo, chỉ cần 1 service gặp sự cố hoặc mạng chập chờn sẽ gây ra lỗi dây chuyền (Cascading Failure), khiến quầy POS bị treo cứng, khách hàng phải chờ đợi.  
  > 2. **Lý do chọn Kafka thay vì RabbitMQ:**  
  >    - **Lưu trữ Log sự kiện bền vững (Event Sourcing & Replay):** Kafka lưu trữ message dưới dạng commit-log trên đĩa cứng theo cấu hình retention time. Khi Service Báo cáo hoặc Service AI cần huấn luyện lại dữ liệu lịch sử bán hàng của 6 tháng qua, Kafka cho phép tua lại offset (`replay events`) từ đầu mà không làm phiền đến hệ thống cơ sở dữ liệu chính.  
  >    - **Khả năng chịu tải cực cao (High Throughput):** Kafka xử lý hàng trăm nghìn sự kiện/giây với cơ chế Partitioning, hoàn toàn đáp ứng bài toán mở rộng chuỗi lên 20 đến 50 chi nhánh trong tương lai."*

---

### ❓ CÂU 02: Trong kiến trúc Event-Driven, các tác vụ Ghi trả về HTTP 202 Accepted. Vậy làm sao đảm bảo tính nhất quán dữ liệu (Eventual Consistency) nếu Kafka bị mất kết nối hoặc Consumer xử lý thất bại?
- **Người trả lời chính:** **Trần Hồng Phước**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, nhóm đã thiết lập cơ chế an toàn 3 lớp:  
  > - **Lớp 1 (Idempotent Producer & Acks=all):** Kafka Producer trên API Gateway được cấu hình `acks: -1` (all replicas) và kích hoạt cơ chế `idempotence: true`, bảo đảm sự kiện chỉ được ghi nhận một lần duy nhất vào Kafka mà không bị mất hoặc trùng lặp.  
  > - **Lớp 2 (Idempotency Key tại Consumer):** Tại mỗi Microservice tiếp nhận, mỗi sự kiện đều mang một mã định danh duy nhất (`transactionId` hoặc `orderCode`). Trước khi ghi vào MongoDB, service kiểm tra xem mã này đã được xử lý chưa để tránh ghi đè dữ liệu trùng lặp khi Kafka rebalance.  
  > - **Lớp 3 (Dead Letter Queue - DLQ & Retry Pattern):** Nếu consumer gặp lỗi cơ sở dữ liệu, sự kiện được retry tối đa 3 lần với cơ chế exponential backoff. Nếu vẫn thất bại, sự kiện được đẩy vào hàng đợi lỗi `*.DLQ` và gửi cảnh báo đến quản trị viên để đối soát mà không làm mất thông tin của khách hàng."*

---

### ❓ CÂU 03: Hãy giải thích cặn kẽ tại sao ngành Dược bắt buộc phải áp dụng FEFO thay vì FIFO? Sự khác biệt cốt lõi ở đâu?
- **Người trả lời chính:** **Nguyễn Tiến Đạt**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô:  
  > - **FIFO (First-In, First-Out):** Ưu tiên xuất lô hàng nào **nhập vào kho trước** thì xuất ra trước. Mô hình này phù hợp với hàng may mặc hoặc điện máy.  
  > - **FEFO (First-Expired, First-Out):** Ưu tiên xuất lô hàng nào có **ngày hết hạn (`expDate`) gần nhất** thì xuất ra trước, bất kể lô đó được nhập vào kho trước hay sau!  
  > **Ví dụ thực tế trong ngành dược:** Tháng 1 kho nhập Lô A hạn dùng năm 2028. Đến tháng 2 kho nhập thêm Lô B do nhà sản xuất trả đợt hàng có hạn dùng năm 2026. Nếu chạy theo FIFO thông thường, hệ thống sẽ xuất Lô A trước, dẫn đến việc Lô B nằm ứ lại trong kho và bị hết hạn vào năm 2026 gây thiệt hại kinh tế và vi phạm an toàn y tế.  
  > Do đó, ABC Pharmacy bắt buộc áp dụng thuật toán **FEFO** với bộ lọc `expDate ASC`, tự động xuất Lô B trước để tối ưu hóa vòng đời sản phẩm."*

---

### ❓ CÂU 04: Trong quy trình Kiểm kê kho (BW07), nếu trong lúc nhân viên đang đếm thuốc mà quầy POS vẫn đang xuất bán thì số tồn có bị sai lệch không? Nhóm xử lý bài toán này như thế nào?
- **Người trả lời chính:** **Nguyễn Tiến Đạt**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, đây là bài toán kinh điển trong quản lý kho phân tán. Nhóm giải quyết bằng cơ chế **Snapshot Freeze & Delta Reconciliation**:  
  > 1. Khi tạo đợt kiểm kê, hệ thống lập tức chốt một bản ghi ảnh chụp snapshot tồn sổ của từng `batchId` kèm timestamp `snapshotTime`.  
  > 2. Nhân viên kiểm đếm chỉ việc đếm số lượng thực tế nằm trên kệ tại thời điểm kiểm.  
  > 3. Khi Quản lý bấm hoàn tất kiểm kê, backend so sánh số thực đếm với số tồn sổ tại thời điểm snapshot. Đồng thời, hệ thống truy vấn các bản ghi `InventoryTransaction` phát sinh giữa khoảng thời gian từ `snapshotTime` đến thời điểm bấm duyệt để tính toán bù trừ độ lệch biến động (`Delta Adjust`).  
  > 4. Toàn bộ thao tác ghi nhận tồn mới được bọc trong MongoDB Transaction, bảo đảm số lượng tồn kho cuối cùng hoàn toàn khớp với thực tế mà không cần phải đóng cửa ngừng bán thuốc của chi nhánh."*

---

### ❓ CÂU 05: Tại sao nhóm lại tự xây dựng mô hình Adaptive Pharmacy RFM riêng mà không dùng công thức RFM chuẩn trong sách giáo khoa marketing?
- **Người trả lời chính:** **Nguyễn Văn Nam**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, thang điểm RFM chuẩn trong sách giáo khoa thường áp dụng cho ngành Thời trang hoặc Bán lẻ tổng hợp, nơi khách hàng mua sắm theo cảm xúc và mức chi tiêu mỗi lần có thể lên đến hàng triệu đồng.  
  > Trong **ngành Dược phẩm bán lẻ**, hành vi khách hàng mang tính đặc thù cao:  
  > 1. **Bệnh nhân mãn tính (tiểu đường, huyết áp, tim mạch):** Họ mua thuốc định kỳ chính xác mỗi tháng 1 lần (tương đương 12 lần/năm). Nếu dùng thang điểm giáo khoa (đòi hỏi mua liên tục 20–30 đơn để đạt điểm Tần suất F tối đa) thì một bệnh nhân trung thành uống thuốc suốt 5 năm vẫn sẽ bị xếp vào nhóm mua ít.  
  > 2. Do đó, nhóm xây dựng **Adaptive Pharmacy RFM** hiệu chỉnh lại phân vị theo chu kỳ dùng thuốc 30 ngày. Hệ thống tự động phát hiện bệnh nhân mãn tính qua từ điển hoạt chất (`Metformin, Amlodipine, Losartan...`), dự báo ngày uống hết thuốc (`Predicted Refill Date: 30 ngày`) và kích hoạt gửi thông báo nhắc thuốc kèm voucher phù hợp."*

---

### ❓ CÂU 06: Nếu AI OCR đọc nhầm tên thuốc hoặc liều lượng từ đơn thuốc chụp mờ, hậu quả pháp lý thuộc về ai và hệ thống ngăn chặn điều đó thế nào?
- **Người trả lời chính:** **Trần Hồng Phước**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, trong y tế, an toàn tính mạng người bệnh là tối thượng. Vì vậy, nhóm thiết kế theo triết lý **Human-in-the-loop (Người có chuyên môn giữ quyền quyết định cuối cùng)**:  
  > 1. Hệ thống chỉ chấp nhận đơn thuốc bản in điện tử rõ ràng, từ chối các đơn viết tay nguệch ngoạc để giảm thiểu rủi ro nhận diện sai lệch.  
  > 2. Kết quả bóc tách từ Computer Vision chỉ đóng vai trò là **gợi ý nhập liệu sơ bộ**, tiết kiệm 80% thời gian gõ phím cho Dược sĩ.  
  > 3. Hệ thống bắt buộc Dược sĩ phải đối chiếu đơn thuốc gốc trên màn hình song song và bấm nút 'Xác nhận Dược sĩ' (`Pharmacist Confirms OCR Result`) thì đơn thuốc mới được đưa vào giỏ hàng. Mọi hành vi thêm/sửa/xóa liều của Dược sĩ đều được lưu vết đầy đủ trong `PrescriptionAudit` phục vụ công tác thanh tra y tế."*

---

### ❓ CÂU 07: Con số 514 test cases trong Report 5 có phải là tự động sinh mã (generate ngẫu nhiên) không? Nhóm tổ chức kiểm thử thế nào để đạt tỷ lệ 100% Pass?
- **Người trả lời chính:** **Đinh Anh Phúc**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, nhóm cam kết 100% các bài test đều được lập trình viên viết tay có chủ đích theo quy chuẩn **Test-Coupled Mandate** của dự án:  
  > 1. Mỗi khi một Service (ví dụ: `MedicineService`, `ShiftHandoverService`, `PayrollService`) được phát triển, file test tương ứng (`*.spec.ts`) được xây dựng đồng thời và bao phủ đủ **3 nhóm giá trị chuẩn**:  
  >    - `[Normal Values]`: 282 ca kiểm tra luồng chạy chuẩn.  
  >    - `[Boundary Values]`: 118 ca kiểm tra giá trị biên cực hạn (mốc 15 ngày, 90 ngày, số lượng tồn 0, 1).  
  >    - `[Abnormal Values]`: 114 ca kiểm tra bắt lỗi dị thường, injection, token giả mạo, timeout.  
  > 2. Để đạt được 100% Pass, nhóm áp dụng công cụ `jest-mock` cách ly phụ thuộc, sử dụng bộ nhớ đệm `mongodb-memory-server` để giả lập database sạch cho từng suite test và chạy kiểm tra tự động trước mỗi lần merge Pull Request qua GitHub Actions CI."*

---

### ❓ CÂU 08: Khi một chi nhánh mới được kích hoạt (BW01), việc nhân bản dữ liệu danh mục thuốc có làm tốn dung lượng bộ nhớ của MongoDB không?
- **Người trả lời chính:** **Nguyễn Văn Nam**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, hệ thống áp dụng kiến trúc **Master Data Centralization**:  
  > - Toàn bộ chuỗi chỉ duy trì **duy nhất một bảng danh mục thuốc gốc (`medicines`)** lưu trữ thông tin cố định như tên biệt dược, hoạt chất, số đăng ký, hãng sản xuất và bảng giá niêm yết chuẩn.  
  > - Khi chi nhánh mới được mở, hệ thống **không sao chép lại toàn bộ bảng thuốc** mà chỉ tạo các bản ghi ánh xạ tồn kho trong collection `branch_inventories` và bảng vị trí quầy kệ `medicine_locations`.  
  > - Nhờ cơ chế này, dung lượng cơ sở dữ liệu được tối ưu hóa đến 95%, đồng thời khi cập nhật thông tin dược lý của một loại thuốc thì toàn bộ các chi nhánh đều nhận được thông tin mới ngay lập tức."*

---

### ❓ CÂU 09: Tại sao nhóm không sử dụng Google Notifications hay Firebase Cloud Messaging (FCM) mà lại tự xây dựng Socket.IO In-app Notifications?
- **Người trả lời chính:** **Trần Hồng Phước**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, quyết định này xuất phát từ 2 lý do lớn về nghiệp vụ và an toàn:  
  > 1. **Bảo mật dữ liệu Y tế & Tránh phụ thuộc dịch vụ ngoài:** Việc gửi thông tin đơn thuốc hoặc mã bệnh nhân qua dịch vụ thông báo công cộng của bên thứ ba có nguy cơ vi phạm chính sách bảo mật dữ liệu sức khỏe người dùng (HIPAA / Quy định bảo vệ dữ liệu cá nhân Nghị định 13/2023/NĐ-CP).  
  > 2. **Hiệu năng & Định tuyến phòng theo Chi nhánh (Room Scoping):** Socket.IO cho phép phân cụm phòng cực kỳ chính xác: phòng `branch-{branchId}` dành riêng cho nhân viên tại cơ sở, phòng `warehouse` cho thủ kho, và phòng `user-{userId}` cho cá nhân. Thông báo biến động tồn kho hay đơn hàng mới được gửi thẳng tới giao diện đang mở với độ trễ dưới 50 mili-giây mà không yêu cầu người dùng phải cấp quyền trình duyệt hay lo ngại chặn quảng cáo."*

---

### ❓ CÂU 10: Thuật toán AI Forecast dự báo nhu cầu thuốc hoạt động như thế nào khi gặp mặt hàng thuốc mới tinh chưa có lịch sử bán hàng?
- **Người trả lời chính:** **Nguyễn Văn Nam**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, nhóm áp dụng cơ chế **Cold-Start Fallback Strategy**:  
  > 1. Với các thuốc đã có lịch sử trên 90 ngày, mô hình phân tích chuỗi thời gian (Time-series) kết hợp trọng số mùa vụ và tốc độ tiêu thụ bình quân hàng ngày (`burn rate`) để dự báo nhu cầu bổ sung.  
  > 2. Với thuốc mới hoàn toàn (chưa có lịch sử bán): Hệ thống tự động chuyển sang cơ chế suy luận tương đồng dựa trên **Cụm Hoạt chất & Nhóm Điều trị** (Ví dụ: Thuốc hạ sốt mới sẽ kế thừa hệ số tiêu thụ trung bình của nhóm Paracetamol tại chi nhánh đó). Đồng thời, hệ thống áp dụng mức tồn kho an toàn tối thiểu (`Safety Stock`) theo quy chuẩn ban đầu của Dược sĩ trưởng, và chỉ đưa ra gợi ý đơn mua dự thảo để Quản lý thẩm định chứ AI không tự ý đặt hàng."*

---

### ❓ CÂU 11: Làm thế nào hệ thống đảm bảo bảng giá Flash Sale của lô cận hạn không bị dược sĩ lợi dụng để trục lợi hoặc bán nhầm cho khách hàng khác?
- **Người trả lời chính:** **Nguyễn Tiến Đạt**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô:  
  > 1. Chiến dịch Flash Sale xả hàng cận date được gắn chặt với **Mã số Lô (`batchId`) duy nhất**, chứ không giảm giá theo tên thuốc chung.  
  > 2. Tại quầy POS, giá ưu đãi chỉ tự động áp dụng khi Dược sĩ xuất đúng số lượng của lô cận hạn đó. Nếu khách mua vượt quá số tồn của lô cận hạn, số lượng dôi dư sẽ tự động chuyển sang lô kế tiếp với mức giá niêm yết chuẩn.  
  > 3. Toàn bộ thao tác áp giá và doanh thu từng lô đều được ghi nhận phân rã trên hóa đơn và đối soát cuối ngày trong biên bản Bàn giao ca (`ShiftHandover`), loại bỏ hoàn toàn khả năng Dược sĩ tráo đổi thuốc hoặc gian lận chênh lệch giá."*

---

### ❓ CÂU 12: Đóng góp thực chất của từng thành viên trong nhóm thể hiện ở đâu trên sản phẩm và mã nguồn dự án?
- **Người trả lời chính:** **Trần Hồng Phước (Trưởng nhóm tổng kết)**
- **Trả lời sắc bén:**
  > *"Dạ thưa Thầy/Cô, toàn bộ đóng góp của 4 thành viên được thể hiện minh bạch 100% qua lịch sử Git Commit và phân công trách nhiệm:  
  > - **Trần Hồng Phước:** Thiết kế toàn bộ khung kiến trúc Microservices Kafka, API Gateway, Module POS bán lẻ, Tích hợp Computer Vision OCR đơn thuốc, Triển khai hạ tầng VPS Docker Nginx và CI/CD.  
  > - **Nguyễn Tiến Đạt:** Chịu trách nhiệm toàn bộ phân hệ Kho Dược GSP, vị trí 4 cấp, thuật toán FEFO, Mobile App nghiệp vụ kiểm kho/quét mã, và luồng tiêu hủy thuốc quá hạn BW09.  
  > - **Nguyễn Văn Nam:** Phụ trách Module Mua hàng GDP, RFQ, PO, Quota ngân sách chi nhánh, Mô hình Adaptive RFM Marketing, AI Forecast dự báo và Tích hợp cổng PayOS VietQR.  
  > - **Đinh Anh Phúc:** Quản trị Backlog/Jira Sprint 1–8, Phân quyền RBAC, Trợ lý AI Dược sĩ (RAG/FastAPI/Voice STT), và trực tiếp chủ trì xây dựng toàn bộ hệ thống kiểm thử 58 suites / 514 test cases trong Report 5."*

---

> [!TIP]
> **LỜI KHUYÊN KHI TRẢ LỜI PHẢN BIỆN TRƯỚC HỘI ĐỒNG:**
> - Luôn giữ thái độ lắng nghe, kính trọng và cảm ơn Thầy/Cô sau mỗi câu hỏi.
> - Trả lời dứt khoát, đi thẳng vào nguyên lý kỹ thuật và dẫn chứng bằng file code/màn hình thực tế đã demo.
> - Phước làm nhiệm vụ điều phối câu hỏi: Câu hỏi thuộc phân hệ của bạn nào thì chuyển đúng chuyên môn cho bạn đó trả lời, Phước bổ sung góc nhìn kiến trúc tổng thể.

