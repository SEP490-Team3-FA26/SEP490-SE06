# BÁO CÁO TIẾN ĐỘ TUẦN & BIÊN BẢN HỌP [TUẦN 7]
**Thời gian:** 2026-10-19 ~ 2026-10-25  
**Dự án:** Hệ thống Quản trị & Bán lẻ Chuỗi Nhà thuốc Thông minh WDP301/SEP490  
**Nhóm thực hiện:** SEP490-SE06 / Group 7  
**Thành viên tham dự:** Trần Hồng Phước (Leader), Đinh Anh Phúc, Nguyễn Tiến Đạt, Nguyễn Văn Nam  

---

## PHẦN I: PROJECT REPORT (BÁO CÁO DỰ ÁN)

### 1. OVERVIEW (TỔNG QUAN TIẾN ĐỘ)

#### 1.1. Bảng Recover (Khắc phục việc nợ & Nợ kỹ thuật từ giai đoạn trước)

| Plan (Kế hoạch cần giải quyết) | Actual (Kết quả thực tế đạt được tuần này) |
| :--- | :--- |
| • **Khắc phục triệt để lỗ hổng an ninh hạ tầng:** Lộ trực tiếp Backend API và tài liệu Swagger qua IP VPS trên môi trường demo.<br>• **Tinh chỉnh và tối ưu hóa phân hệ IoT & Chatbot AI:** Tối ưu hóa luồng viễn trắc nhiệt độ kho GSP và cô lập Chatbot DeepSeek.<br>• **Chuẩn bị đặc tả kỹ thuật module Flash Sale (UC-74):** Đầu việc tồn đọng từ tuần W6 cần hoàn thiện trước khi code. | • **Hoàn tất 100% bảo mật hạ tầng:** Cấu hình Nginx Reverse Proxy bắt buộc toàn bộ traffic phải đi qua Cloudflare, đóng các cổng nội bộ công khai, ngăn chặn lộ IP VPS và áp dụng Basic Auth bảo vệ tài liệu Swagger (PR #250, PR #251, PR #252 - Phước).<br>• **Hoàn tất tối ưu AI & IoT:** Cô lập hoàn toàn dịch vụ Chatbot DeepSeek, hỗ trợ thị giác máy tính (Vision), lưu giữ ngữ cảnh hội thoại đa lượt; triển khai luồng truyền dữ liệu viễn trắc liên tục (persistent stream) cho cảm biến nhiệt độ - độ ẩm kho GSP (PR #249 - Phúc).<br>• **Hoàn thành đặc tả UC-74:** Hoàn thành tài liệu đặc tả kỹ thuật tính năng Flash Sale & Cron Job tự động (UC-74) và chuẩn hóa ma trận phân rã 11 tính năng cốt lõi đồ án (Phước). |

#### 1.2. Bảng Master Plan (Đối chiếu Tiến độ Thực tế với Kế hoạch W7 trong Master Plan)

| Plan (Mục tiêu Master Plan W7: 19/10 ~ 25/10) | Actual (Tiến độ thực tế & Đánh giá mức độ hoàn thành) |
| :--- | :--- |
| **Trải nghiệm Khách hàng & Email Marketing (UC-76, UC-77)**<br>• Triển khai UC-76: Tạo và gửi Email Marketing tự động - Newsletter.<br>• Triển khai UC-77: Khách hàng đánh giá & review sản phẩm trên App. | **Hoàn thành 100% trọn gói UC-76 Email Marketing (Đạt - On Track):**<br>• Tích hợp dịch vụ gửi mail qua Resend API, thiết kế template HTML responsive chuyên nghiệp cho tin tức và khuyến mãi.<br>• Thiết lập bộ lập lịch Cron Job ngầm tự động quét chiến dịch đến lịch và kích hoạt gửi thư.<br>• Xây dựng giao diện danh sách chiến dịch và bộ soạn thảo Split-Screen Editor kèm Live Preview thời gian thực trên cả Desktop và Mobile.<br>• Triển khai trang công khai Hủy đăng ký nhận tin (`/unsubscribe/:token`), tự động đồng bộ trạng thái người dùng.<br>• Tích hợp Custom Hook `useEmailCampaignManagement`, kết nối tầng Service gọi qua API Gateway và liên kết DTO mã Voucher khuyến mãi (`create-order.dto`). Đã kiểm thử toàn diện (Đạt). |
| **Y tế số nâng cao (UC-107, UC-108, UC-109, UC-99)**<br>• Triển khai UC-107: Gợi ý thuốc theo tiền sử dị ứng || bệnh nền || thuốc dị ứng.<br>• Chuẩn bị hồ sơ y tế & quản lý tuân thủ điều trị. | **Đang triển khai đúng tiến độ UC-107 (Đạt - On Track):**<br>• Đã hoàn thành tài liệu kế hoạch Hồ sơ bệnh án điện tử (EMR) và đặc tả chi tiết UC-107.<br>• **Backend:** Bổ sung Schema bệnh án điện tử (dị ứng, bệnh nền mạn tính, nhóm máu), thiết kế API/Kafka cập nhật hồ sơ y tế.<br>• **Trí tuệ nhân tạo (AI):** Xây dựng endpoint AI kiểm tra xung đột giữa thuốc trong đơn với tiền sử bệnh nền/dị ứng của bệnh nhân, tự động gợi ý thuốc thay thế an toàn.<br>• **Frontend:** Xây dựng modal Onboarding sức khỏe cho người dùng mới, trang Hồ sơ bệnh án cá nhân, và tích hợp cảnh báo dị ứng thời gian thực kèm nút "Đổi thuốc an toàn 1-click" tại quầy POS Dược sĩ (Phước - nhánh `feat/UC-107-allergy-contraindication-medical-record`). |
| **Mục tiêu Kỹ thuật & Đóng băng Tính năng (Feature Freeze)**<br>• Hoàn thành toàn bộ code chức năng mới, sẵn sàng đóng băng tính năng và chuẩn bị Review 2. | **Nâng cấp Toàn diện Hạ tầng Kiểm thử & Thiết lập Quality Gate Nghiêm ngặt:**<br>• Tích hợp môi trường kiểm thử Hybrid Test Container linh hoạt (`@testcontainers/mongodb` trên Docker CI/CD GitHub Actions + fallback `MongoMemoryServer` khi test local).<br>• Xây dựng bộ công cụ `test-rules-checker.js` kiểm định tự động 7 Architecture Rules (Zero Internal HTTP qua Kafka, Zero Mock Data, Bounded Context `/api/...`, Comment tiếng Việt 100%, Core Business FEFO/Quota/PayOS, Guideline 3 nhóm giá trị, Rule 7 Test-Coupled Mandate kẹp bài test bắt buộc).<br>• Bóc tách độc lập toàn bộ 21 Use Cases từ Test Report 5 & WBS thành các file test riêng biệt (`uc-*.spec.ts`, `wbs-*.spec.ts`), đảm bảo mỗi file phủ đủ 3 nhóm giá trị chuẩn (`[Normal Values]`, `[Boundary Values]`, `[Abnormal Values]`).<br>• Bổ sung bộ test Concurrency & Idempotency chống trùng lặp Webhook PayOS VietQR và Race-condition thanh toán.<br>• Tích hợp Fast-Fail Typecheck & Build (7s) và Custom TAP Reporter hiển thị log HTTP Request chuẩn GoTek. Pass 100% 34/34 test suites (199/199 test cases) (Nam). |
| **[VƯỢT TIẾN ĐỘ] Danh sách sản phẩm yêu thích (Wishlist - UC-96)**<br>• Kế hoạch gốc thuộc tuần W13 (Tháng 12), nhóm chủ động đẩy sớm để hoàn thiện luồng trải nghiệm mua sắm. | **Hoàn thành 100% trọn gói UC-96 (Vượt trước 6 tuần - Ahead of Schedule):**<br>• Xây dựng giao diện Wishlist trên Web và Mobile, tích hợp icon trái tim tương tác nhanh trên từng thẻ thuốc.<br>• Hoàn thiện trọn vẹn luồng trải nghiệm người dùng: Thêm vào Wishlist -> Chuyển nhanh vào giỏ hàng -> Thanh toán đơn hàng PayOS/COD. Đã kiểm thử tương tác mượt mà (Đạt - SCRUM-107). |
| **[VƯỢT TIẾN ĐỘ] Dược sĩ kết ca & Quản lý KPI (UC-84 & UC-111)**<br>• Kế hoạch gốc thuộc tuần W10 & W11 (Tháng 11), nhóm triển khai sớm phục vụ nghiệp vụ bán lẻ. | **Hoàn thành Logic & Giao diện (Vượt trước 3 tuần - In Review):**<br>• Triển khai phân hệ Dược sĩ kết thúc ca làm việc, đối soát tiền mặt thực tế trong két so với doanh thu phần mềm quầy POS.<br>• Tích hợp biểu đồ thống kê hiệu suất cá nhân và tính toán KPI theo ca làm việc (Phúc - SCRUM-106). |

---

### 2. DELIVERABLES / SHIPABLES THIS WEEK (SẢN PHẨM BÀN GIAO TRONG TUẦN)

#### 2.1. Code Chạy Được (Working Software)
* **Web & Backend Microservices:**
  - **Phân hệ Email Marketing hoàn chỉnh:** Tích hợp Resend API, bộ soạn thảo Split-Screen Editor kèm Live Preview Desktop/Mobile thời gian thực, cron job tự động gửi thư, trang công khai hủy đăng ký (`/unsubscribe/:token`).
  - **Phân hệ Sản phẩm yêu thích (Wishlist UC-96):** Quản lý wishlist cá nhân, tích hợp nút trái tim trên thẻ thuốc, luồng đồng bộ giỏ hàng và thanh toán.
  - **Phân hệ Hồ sơ bệnh án điện tử (EMR UC-107):** Schema dữ liệu bệnh án, API/Kafka cập nhật hồ sơ, endpoint AI phân tích xung đột dị ứng và gợi ý đổi thuốc 1-click tại POS Dược sĩ.
  - **Phân hệ Dược sĩ kết ca & KPI (SCRUM-106):** Logic chốt ca, kiểm đếm tiền mặt, đối soát doanh thu và báo cáo KPI cá nhân.
  - **Bảo mật & Tối ưu Hạ tầng:** Cấu hình Cloudflare Nginx Reverse Proxy đóng cổng VPS trực tiếp, chặn lộ Swagger/API; cô lập Microservice DeepSeek Chatbot (hỗ trợ Vision & Context) và tối ưu persistent stream viễn trắc IoT GSP.
* **Hạ tầng DevOps & Kiểm thử (Testing Infrastructure):**
  - **Bộ kiểm định quy tắc kiến trúc `test-rules-checker.js`:** 7 rules nghiêm ngặt kiểm tra Zero Mock Data, Kafka Event-Driven, Bounded Context, Comment tiếng Việt 100%, Rule 7 Test-Coupled Mandate.
  - **Cơ chế Hybrid Test Container:** `@testcontainers/mongodb` trên Docker CI/CD GitHub Actions + fallback `MongoMemoryServer` local.
  - **Bộ kịch bản 21 Use Cases test độc lập:** Chuẩn hóa theo Test Report 5 & WBS, phủ 100% cả 3 nhóm giá trị (`[Normal Values]`, `[Boundary Values]`, `[Abnormal Values]`).
  - **Bộ test Concurrency & Idempotency:** Chống race-condition thanh toán PayOS VietQR và chống trùng lặp Webhook.
  - **CI/CD Pipeline tối ưu:** Fast-fail build 7s, timeout 15 phút, Custom TAP Reporter hiển thị subtest và request log chuyên nghiệp.

#### 2.2. Tài liệu (Deliverable Documents)
* **Requirement Management Sheet:** Cập nhật chuẩn hóa toàn bộ danh mục yêu cầu hệ thống (Phước).
* **Đặc tả kỹ thuật Flash Sale & Cron Job tự động (UC-74):** Tài liệu phân tích luồng kích hoạt khung giờ giảm giá, kiểm soát tồn kho và cơ chế hoàn tiền (Phước).
* **Kế hoạch Hồ sơ bệnh án điện tử & Ma trận 11 tính năng cốt lõi:** Phân rã nghiệp vụ cảnh báo dị ứng, bệnh nền và ma trận phân công 11 tính năng đồ án (Phước).
* **Báo cáo Kiểm định Chất lượng & Bộ Kịch bản Kiểm thử 21 Use Cases:** Tài liệu tổng hợp kết quả 34 test suites (199 tests pass), tài liệu hướng dẫn Rule 7 Test-Coupled Mandate (Nam).

---

### 3. ISSUE (KHÓ KHĂN & TRỞ NGẠI ĐÃ GIẢI QUYẾT)

| Issue (Vấn đề) | Chi tiết (Mô tả kỹ thuật) | Impact (Mức độ ảnh hưởng) | Action (Giải pháp xử lý) | Commit deadline | Note (Trạng thái) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lỗ hổng lộ trực tiếp IP VPS & Swagger backend** | Trên môi trường demo, người dùng bên ngoài có thể truy cập thẳng qua địa chỉ IP máy chủ VPS vào cổng backend và tài liệu Swagger API bị lộ công khai không qua lớp bảo vệ. | Rủi ro an ninh mạng, nguy cơ bị quét cổng, lộ cấu trúc dữ liệu và rò rỉ endpoint nội bộ của các microservice. | Cấu hình Nginx Reverse Proxy bắt buộc toàn bộ traffic phải đi qua Cloudflare, đóng các cổng nội bộ công khai, và áp dụng xác thực cơ bản (Basic Auth) cho Swagger. | 24/10/2026 | **Đã giải quyết triệt để** (PR #250, #251, #252 - Phước) |
| **Nguy cơ Race-condition & Webhook PayOS trùng lặp** | Khi đường truyền mạng chập chờn hoặc người dùng thao tác quét mã thanh toán liên tục, Webhook từ PayOS có thể được gọi nhiều lần đồng thời gây nguy cơ xử lý trùng lặp giao dịch. | Sai lệch trạng thái đơn hàng, doanh thu bị cộng đúp hoặc số lượng tồn kho FEFO bị trừ nhiều lần không chính xác. | Bổ sung bộ kiểm thử Concurrency & Idempotency, áp dụng cơ chế khóa phân tán (Distributed Lock / Redis key) và kiểm tra khóa giao dịch trước khi xử lý webhook. | 25/10/2026 | **Đã giải quyết & Pass 100% Test** (PR #254 - Nam) |

---

### 4. PLAN NEXT WEEK (KẾ HOẠCH TUẦN 8: 2026-10-26 ~ 2026-11-01)

#### 4.1. Recover (Đầu việc hoàn tất & Tồn đọng)
* Hoàn thiện review và merge chính thức phân hệ Dược sĩ kết ca, đối soát tiền mặt và KPI (SCRUM-106).
* Bắt tay triển khai mã nguồn module Flash Sale theo khung giờ (UC-74) dựa trên tài liệu đặc tả kỹ thuật đã được phê duyệt.

#### 4.2. Master Plan (Mục tiêu Tuần 8 theo Master Plan)
* **Hoàn thiện & Release Y tế số nâng cao (UC-107):** Đưa tính năng Hồ sơ bệnh án điện tử, cảnh báo tương tác dị ứng/bệnh nền và nút "Đổi thuốc an toàn 1-click" lên môi trường demo.
* **Phát triển AI & Voice Search:**
  - Triển khai UC-80: Chatbot AI tư vấn triệu chứng bệnh cơ bản.
  - Triển khai UC-81: Tìm kiếm thuốc bằng giọng nói (Voice Search) trên ứng dụng di động.
* **Phân hệ Nhà cung cấp & Tem nhãn Barcode:**
  - Triển khai UC-110: Đề xuất nhà cung cấp có giá nhập tốt nhất bằng AI.
  - Triển khai UC-79: Gửi Yêu cầu báo giá RFQ hàng loạt cho Nhà cung cấp.
  - Triển khai UC-78: In mã vạch / tem nhãn phụ cho thuốc nhập khẩu.
* **Mở rộng Hạ tầng Kiểm thử & Chuẩn bị Báo cáo:**
  - Mở rộng bộ bài test tự động cho luồng điều chuyển kho liên chi nhánh và cảnh báo ngưỡng nhiệt độ cảm biến IoT GSP.
  - Phối hợp toàn team chuẩn bị bộ dữ liệu mẫu (Demo Data Pack) phục vụ buổi báo cáo nghiệm thu / Review lần 2 với Giảng viên hướng dẫn.

---

## PHẦN II: MEETING NOTES (BIÊN BẢN HỌP TUẦN)

### 1. KEY NOTES (CÁC ĐIỂM ĐÃ THỐNG NHẤT TRONG CUỘC HỌP)
1. **Thống nhất tuyệt đối về An ninh Hạ tầng:** Toàn bộ hệ thống Backend API và dịch vụ giám sát (Grafana, Dozzle) trên VPS demo bắt buộc phải định tuyến qua Cloudflare Nginx Reverse Proxy, đóng toàn bộ các cổng direct công khai ra Internet.
2. **Ban hành Quy tắc Kiến trúc Bắt buộc Rule 7 ("Test-Coupled Mandate"):** Khi viết bất kỳ hàm, Service (`*.service.ts`) hoặc Controller (`*.controller.ts`) mới nào, lập trình viên bắt buộc phải kẹp file test (`*.spec.ts`) tương ứng trong cùng commit, phân loại đủ 3 nhóm giá trị (`[Normal Values]`, `[Boundary Values]`, `[Abnormal Values]`). CI/CD Pipeline sẽ từ chối merge nếu thiếu test.
3. **Thống nhất Luồng Nghiệp vụ Cảnh báo Dị ứng (UC-107):** Tại quầy POS, khi Dược sĩ thêm thuốc có thành phần xung đột với tiền sử dị ứng/bệnh nền của khách hàng, hệ thống sẽ bật modal cảnh báo tức thì màu đỏ cam và hiển thị nút "Đổi thuốc an toàn 1-click" do AI đề xuất.
4. **Đánh giá Tiến độ Chung:** Nhóm bám sát 100% kế hoạch tuần W7 của Master Plan, đồng thời đã đi trước tiến độ 2 tính năng lớn là UC-96 (Wishlist - vượt trước 6 tuần) và UC-84/UC-111 (Kết ca & KPI - vượt trước 3 tuần). Toàn bộ 199 bài test đều pass trên CI/CD.

### 2. TODO (PHÂN CÔNG CÔNG VIỆC TUẦN TỚI)
* **[Trần Hồng Phước]:** Hoàn thành tích hợp Backend & Frontend cho UC-107 (Hồ sơ bệnh án điện tử & cảnh báo dị ứng); review và merge nhánh SCRUM-106; bắt đầu lập trình phân hệ Flash Sale (UC-74). *(Deadline: 30/10/2026)*
* **[Đinh Anh Phúc]:** Hoàn thiện chỉnh sửa theo review cho SCRUM-106 (Dược sĩ kết ca, KPI); nghiên cứu tích hợp Voice Search và nâng cấp Chatbot AI tư vấn triệu chứng bệnh UC-80. *(Deadline: 31/10/2026)*
* **[Nguyễn Tiến Đạt]:** Kiểm thử toàn diện luồng tương tác Wishlist -> Giỏ hàng -> Thanh toán trên Mobile Expo; phối hợp hoàn thiện UI/UX cảnh báo tương tác thuốc tại quầy POS cho UC-107; hỗ trợ làm sạch backlog Jira. *(Deadline: 30/10/2026)*
* **[Nguyễn Văn Nam]:** Mở rộng bộ bài test tự động cho luồng điều chuyển kho liên chi nhánh và cảnh báo viễn trắc nhiệt độ IoT GSP; chuẩn bị bộ dữ liệu mẫu (Demo Data Pack) phục vụ buổi Review 2; giám sát chất lượng CI/CD pipeline. *(Deadline: 01/11/2026)*

### 3. THÔNG TIN CUỘC HỌP
* **Thời gian:** 21:00 - 22:30, Chủ Nhật ngày 25/10/2026
* **Địa điểm:** Google Meet / Kênh Discord nhóm SEP490-SE06
* **Thành phần:** Trần Hồng Phước (Leader), Đinh Anh Phúc, Nguyễn Tiến Đạt, Nguyễn Văn Nam (Đầy đủ 4/4 thành viên).
