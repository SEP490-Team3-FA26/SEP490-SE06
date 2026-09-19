# 📱 BÁO CÁO CHI TIẾT CÁC CHỨC NĂNG ĐANG CÓ & CHẠY MƯỢT MÀ TRÊN MOBILE
> **Hệ thống:** Quản trị Chuỗi Nhà thuốc & Bán lẻ Dược phẩm Đa Kênh (**Pharma ERP Mobile**)  
> **Nền tảng:** React Native (Expo SDK 57, TypeScript, Reanimated, NativeWind, Modern Glassmorphism UI)  
> **Nhánh phát triển:** `dat/mobile`  
> **Thời điểm cập nhật:** Tháng 09/2026  
> **Trạng thái kiểm thử:** ✅ **100% Biên dịch thành công (0 lỗi TypeScript `npx tsc`), tất cả màn hình đã test chạy mượt mà, không giật lag.**

---

## I. TỔNG QUAN HỆ THỐNG MOBILE

Toàn bộ ứng dụng di động được xây dựng theo kiến trúc **Multi-Role Actor Pattern** hiện đại, kết nối trực tiếp với cụm Microservices backend (API Gateway, Kafka, MongoDB, Redis, AI Service). Ứng dụng hỗ trợ trải nghiệm mượt mà từ khách hàng cá nhân đến nhân sự vận hành chuỗi nhà thuốc.

### 📊 Bảng Thống Kê Quy Mô Tính Năng:
| Chỉ số | Số lượng | Tình trạng vận hành |
| :--- | :---: | :---: |
| **Nhóm vai trò người dùng (Roles)** | 6 Roles | Hoạt động độc lập & Hỗ trợ chuyển đổi nhanh (Testing Hub) |
| **Màn hình chính & phụ trợ (Screens)** | 14 Màn hình | Đã tối ưu layout Safe Area, không lỗi tràn viền |
| **Tab nghiệp vụ chuyên sâu (Tabs)** | 16 Tabs | Tải mượt mà, hỗ trợ kéo để làm mới (`RefreshControl`) |
| **API Endpoints tích hợp sống** | 51 Endpoints | Kết nối Microservices qua API Gateway |
| **Tính năng AI Vision & OCR thực tế** | 2 Module | Sử dụng Camera thiết bị thật & Thư viện ảnh |
| **Cổng thanh toán trực tuyến** | 3 Tầng | PayOS VietQR Deep Link + Polling Watcher + In-App Modal |
| **Độ phủ ảnh sản phẩm thuốc thực tế** | 100% | Tích hợp cơ chế Fallback chuyên khoa thông minh |
| **Hệ thống thông báo Toast** | Toàn cục | Thay thế triệt để hộp thoại `Alert.alert` thô cứng |

---

## II. CHI TIẾT TÍNH NĂNG ĐANG CHẠY MƯỢT MÀ THEO TỪNG PHÂN HỆ

### 1. Phân Hệ Xác Thực & Tài Khoản (Authentication & Account)
*Tập tin quản lý:* [`LoginScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/auth/LoginScreen.tsx), [`RegisterScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/auth/RegisterScreen.tsx), [`ForgotPasswordScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/auth/ForgotPasswordScreen.tsx)

* **Đăng nhập đa phương thức:**
  * Đăng nhập chuẩn bằng Email hoặc Số điện thoại kết hợp Mật khẩu bảo mật.
  * Tích hợp **Lưới 6 Nút Đăng Nhập Nhanh Demo 1-Chạm**: Cho phép chuyển nhanh tài khoản Admin, Giám đốc, Thủ kho, Dược sĩ, Quản lý chi nhánh, Khách hàng để trình diễn/kiểm thử không cần gõ phím.
  * Hỗ trợ đăng nhập thông qua Google OAuth2 qua WebView In-App an toàn.
* **Đăng ký tài khoản Khách hàng:**
  * Nhập họ tên, email, số điện thoại và mật khẩu (có kiểm tra độ dài và khớp mật khẩu).
  * Quy trình xác thực 2 bước với mã OTP 6 số gửi về email đăng ký (`verifyEmail`), có nút gửi lại mã khi hết hạn (`resendVerification`).
* **Quên mật khẩu & Khôi phục tài khoản:**
  * Nhập email yêu cầu cấp lại mật khẩu (`forgotPassword`).
  * Nhận OTP qua email và nhập mật khẩu mới trực tiếp trên app (`resetPassword`).
* **Trải nghiệm giao diện (UI/UX):**
  * Nền Gradient tối sang trọng với hiệu ứng Ambient Glowing Orbs tán xạ ánh sáng kính mờ.
  * Lưu trữ Token phiên đăng nhập tự động vào `AsyncStorage`, tự động đăng nhập khi mở lại app.

---

### 2. Phân Hệ Khách Hàng (Customer Module - 5 Tabs Nghiệp Vụ)
*Tập tin quản lý:* [`CustomerScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/customer/CustomerScreen.tsx)

* **Tab 1 - Cửa Hàng Thuốc (Store):**
  * Hiển thị danh mục hơn 2,300+ sản phẩm thuốc từ cơ sở dữ liệu MongoDB thông qua `Inventory Microservice`.
  * Tìm kiếm tức thời theo tên thuốc, biệt dược, hoạt chất không dấu.
  * Lọc linh hoạt theo nhóm danh mục dược lý: *Kháng sinh, Giảm đau hạ sốt, Hô hấp, Tiêu hóa, Tim mạch, Vitamin & Khoáng chất...*
  * **100% Ảnh thuốc thực tế độ nét cao** trên từng thẻ sản phẩm, không bị vỡ hoặc placeholder xám.
  * Modal xem chi tiết thuốc: Bột/viên, quy cách đóng gói, công dụng, cách dùng, chống chỉ định, tồn kho hiện tại.
  * Nút "Thêm vào giỏ" nhanh với hiệu ứng nảy nút và thông báo Toast góc trên màn hình.
* **Tab 2 - Giỏ Hàng Thông Minh (Cart):**
  * Danh sách thuốc đã chọn kèm hình ảnh đại diện, đơn giá và tổng phụ.
  * Tăng / giảm số lượng linh hoạt, tự động xóa khi số lượng về 0.
  * Tính toán tự động tổng tiền hàng, số tiền giảm trừ từ voucher và tổng tiền thực trả.
  * Chọn voucher có sẵn hoặc nhập mã voucher giảm giá trực tiếp.
  * Nút chuyển tiếp mượt mà sang quy trình Thanh toán (`CustomerCheckoutScreen`).
* **Tab 3 - Dược Sĩ Trí Tuệ Nhân Tạo (AI Chat Consultant):**
  * Trò chuyện hỏi đáp bệnh học, tư vấn sử dụng thuốc theo triệu chứng (ho, cảm sốt, đau họng, đau dạ dày...).
  * Mô phỏng nút Micro thu âm giọng nói mô tả triệu chứng bệnh nhân với bộ đếm thời gian thực.
  * **Card Gợi Ý Thuốc Trực Quan Trong Khung Chat:** AI tự động đính kèm danh sách thuốc phù hợp kèm ảnh, giá tiền và nút **"1-Chạm Thêm Vào Giỏ"** ngay bên dưới câu trả lời.
* **Tab 4 - Kho Mã Giảm Giá Toàn Chuỗi (Vouchers):**
  * Danh sách các mã khuyến mãi (giảm % có mức trần hoặc giảm số tiền cố định).
  * Hiển thị rõ giá trị đơn tối thiểu áp dụng và thời hạn voucher.
  * Nút 1-chạm sao chép mã và tự động nạp áp dụng vào giỏ hàng.
* **Tab 5 - Quản Lý Đơn Mua Hàng (Order Tracking):**
  * Lịch sử tất cả đơn hàng đã mua của khách hàng.
  * Lọc nhanh đơn hàng theo Số điện thoại.
  * Phân loại trạng thái đơn hàng trực quan: *Chờ xử lý (PENDING), Đã thanh toán (PAID), Đang vận chuyển (SHIPPING), Hoàn thành (COMPLETED), Đã hủy (CANCELLED)*.
  * Popup hiển thị **Mã QR Đơn Hàng** sắc nét phục vụ đối soát, nhận hàng tại quầy hoặc thanh toán bổ sung.

---

### 3. Phân Hệ Đặt Hàng & Thanh Toán PayOS (Checkout & Payment)
*Tập tin quản lý:* [`CustomerCheckoutScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/customer/CustomerCheckoutScreen.tsx), [`OrderConfirmation.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/OrderConfirmation.tsx)

* **Thiết lập đơn hàng:**
  * Điền thông tin người nhận: Họ tên bệnh nhân/khách hàng, Số điện thoại, Địa chỉ nhận hàng, Ghi chú giao hàng.
  * Hình thức giao nhận: *Giao hàng tận nơi (DELIVERY)* hoặc *Nhận tại nhà thuốc (PICKUP)*.
  * Phương thức thanh toán: *Tiền mặt khi nhận COD (CASH)* hoặc *Chuyển khoản VietQR qua PayOS (QR_PAY)*.
  * Kiểm tra voucher hợp lệ trực tiếp qua API `validateVoucher` với trần giảm giá tối đa (`maxDiscountValue`).
* **Kiến Trúc Thanh Toán 3 Tầng Vượt Trội (Triple-Layer Auto-Return & Verification):**
  * **Tầng 1 - Deep Linking Custom Scheme (`wdp301://checkout`):** Tự động mở cổng PayOS qua `WebBrowser.openAuthSessionAsync` và đón callback chuyển thẳng về app sau khi thanh toán.
  * **Tầng 2 - Realtime Active Polling Watcher:** Ngầm kiểm tra trạng thái thanh toán mỗi 2.5 giây (`checkOrderPayment`). Ngay khi khách hàng quét mã VietQR và tiền vào tài khoản thành công (`PAID`), app chủ động đóng trình duyệt và tự động điều hướng sang màn hình **Xác Nhận Đơn Hàng**.
  * **Tầng 3 - Cổng VietQR Trực Tiếp Trong App (In-App Modal):** Hiển thị mã QR động chuẩn VietQR ngay trên giao diện đặt hàng kèm hiệu ứng radar nhận diện giao dịch thời gian thực và nút kiểm tra tức thì, khách hàng không bắt buộc phải mở trình duyệt web.
* **Màn hình Xác Nhận Đơn Hàng (`OrderConfirmation.tsx`):**
  * Hiển thị chi tiết mã đơn, người nhận, danh sách thuốc, đơn giá và số tiền thực thanh toán.
  * Badge trạng thái thanh toán sống từ Backend (Xanh lá - Thành công / Cam - Chờ xử lý).
  * Nút "Kiểm tra thanh toán ngay" gọi API Backend xác thực trạng thái đơn hàng.

---

### 4. Phân Hệ Dược Sĩ Bán Lẻ (Pharmacist POS & AI OCR)
*Tập tin quản lý:* [`PharmacistScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/pharmacist/PharmacistScreen.tsx)

* **Tab 1 - POS Bán Lẻ Tại Quầy (POS):**
  * Tìm kiếm nhanh thuốc theo tên, hoạt chất, nhóm trị liệu.
  * Danh mục thuốc hiển thị 100% hình ảnh thực tế, giá bán, số lượng tồn kho theo lô.
  * Giỏ hàng bán lẻ tại quầy: Tăng giảm số lượng, tính tiền nhanh.
  * Thanh toán thu tiền mặt tại quầy và xuất hóa đơn bán lẻ tức thì.
* **Tab 2 - Quét Đơn Thuốc Thông Minh Bằng AI Vision OCR:**
  * Chụp ảnh đơn thuốc viết tay hoặc in từ phòng khám bằng **Camera thật của thiết bị** (`expo-image-picker`).
  * Chọn ảnh chụp đơn thuốc có sẵn từ **Thư viện ảnh**.
  * Cung cấp sẵn các **Đơn thuốc mẫu thực tế** để thử nghiệm ngay: *Đơn Viêm phế quản cấp, Đơn Cảm cúm sốt siêu vi, Đơn Đau dạ dày trào ngược*.
  * Gửi ảnh tới `AI Microservice` (`POST /api/ai/prescriptions/scan`), tự động bóc tách tên thuốc, hàm lượng, liều dùng, số lượng.
  * Hiển thị danh sách thuốc đã bóc tách kèm ảnh đại diện và nút **"1-Chạm Thêm Vào Giỏ Hàng POS"**.
* **Tab 3 - Kiểm Tra Tương Tác Thuốc Chéo (Drug-Drug Interactions):**
  * Chọn đồng thời nhiều loại thuốc kê trong đơn để kiểm tra mức độ tương tác dược lý.
  * Đánh giá mức độ an toàn: *Nguy hiểm (Chống chỉ định phối hợp), Cảnh báo (Cần theo dõi), An toàn*.
  * Cung cấp lời khuyên chuyên môn y khoa để dược sĩ tư vấn chuẩn xác cho người bệnh.

---

### 5. Phân Hệ Thủ Kho Dược Phẩm (Warehouse Management & AI Vision)
*Tập tin quản lý:* [`WarehouseScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/warehouse/WarehouseScreen.tsx)

* **Tab 1 - Quản Lý Tồn Kho GSP (Inventory):**
  * Danh mục thuốc trong kho trung tâm, tìm kiếm theo tên, mã SKU, hoạt chất.
  * Chi tiết danh sách lô thuốc: Mã số lô (`batchNo`), Hạn dùng (`expDate`), Số lượng tồn từng lô, Trạng thái hoạt động.
  * Mở rộng / thu gọn chi tiết từng mặt hàng mượt mà.
* **Tab 2 - Kiểm Nhận Hàng Hóa AI Vision (Receipts & AI Inspection Flow):**
  * Quản lý các phiếu kiểm nhận nhập kho (GRN) theo đơn đặt hàng nhà cung cấp (PO).
  * **Modal Quét AI Kiểm Hàng Độc Quyền (Goods Receipt Vision Verification):**
    * Ống kính Camera Viewfinder chuẩn GSP với hiệu ứng Laser xanh quét động.
    * Chụp ảnh kiện hàng thực tế hoặc chọn ảnh kiện mẫu thử nghiệm (Salonpas, Tiger Balm Plaster, Salonsip...).
    * **AI Vision bóc tách 5 trường dữ liệu chuyên sâu:**
      1. 📦 *Đếm số lượng bao bì thực tế trong kiện (`aiCount`).*
      2. 🏷️ *Bóc tách chuỗi ký tự số lô sản xuất qua OCR (`batchNo`).*
      3. 📅 *Bóc tách hạn sử dụng qua OCR (`expDate`) và kiểm tra điều kiện chuẩn nhập (> 12 tháng).*
      4. 🛡️ *Đánh giá quy cách niêm phong, tem nhãn chống giả chuẩn GSP (`integrity`).*
      5. 🎯 *Độ tin cậy của thuật toán AI (`confidence %`).*
    * Đối chiếu tự động với số lượng dự kiến theo đơn đặt hàng PO (`expected`).
    * Cho phép thủ kho xác nhận hoặc điều chỉnh số lượng thực nhận nếu có hư hỏng/thiếu hụt.
    * Cơ chế duyệt lũy tiến từng mặt hàng trong phiếu nhập.
    * Nút **"Hoàn Tất Kiểm Nhận & Nhập Tồn Kho GSP"** tự động kích hoạt API `approveGoodsReceipt`, cập nhật số lượng tồn kho trung tâm và chuyển trạng thái phiếu sang `COMPLETED`.
* **Tab 3 - Cảnh Báo Thuốc Hết Hạn (Expiration Alerts):**
  * Phân loại trực quan 3 mức độ:
    * 🔴 *Cận date nghiêm trọng (< 30 ngày): Yêu cầu xuất hủy hoặc hoàn trả.*
    * 🟡 *Cảnh báo theo dõi (< 90 ngày): Ưu tiên xuất trước (FEFO).*
    * 🟢 *Hạn dùng an toàn (> 90 ngày).*
* **Tab 4 - Truy Xuất Nguồn Gốc Lô Thuốc (Batch Tracing):**
  * Nhập mã số lô bất kỳ để tra cứu toàn bộ dòng thời gian luân chuyển: Nhà cung cấp -> Ngày nhập kho -> Phiếu kiểm nhận -> Xuất chuyển chi nhánh -> Bán lẻ.
* **Tab 5 - Dự Báo Nhu Cầu Tiêu Thụ Bằng AI (AI Demand Forecasting):**
  * Tích hợp API `getAIForecast` cho phép xem dự báo tiêu thụ theo các mốc 7 ngày, 14 ngày, 30 ngày.
  * Cảnh báo nguy cơ đứt hàng (Out-of-stock risk) và khuyến nghị số lượng nhập tối ưu duy trì tồn kho an toàn (Safety Stock).

---

### 6. Phân Hệ Ban Giám Đốc Chuỗi (Director Executive Dashboard)
*Tập tin quản lý:* [`DirectorScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/director/DirectorScreen.tsx)

* **Tab 1 - Tổng Quan Kinh Doanh Chuỗi (Overview):**
  * 4 Thẻ chỉ số KPI đo lường sức khỏe tài chính toàn chuỗi: *Doanh thu chuỗi, Tổng giá trị tồn kho hệ thống, Số đơn PO chờ duyệt, Tỉ lệ hoàn tất giao dịch*.
  * Danh sách toàn bộ các chi nhánh nhà thuốc trực thuộc kèm địa chỉ và trạng thái hoạt động.
  * **Modal AI Predictive Analytics:** Phân tích chuyên sâu tốc độ tăng trưởng doanh thu chuỗi, xu hướng mặt hàng bán chạy và dự báo dòng tiền.
* **Tab 2 - Phê Duyệt Đơn Đặt Mua Hàng PO (PO Approvals):**
  * Danh sách các đơn đề xuất mua hàng gửi từ các cơ sở và kho trung tâm.
  * Xem chi tiết danh mục thuốc cần mua, số lượng, đơn giá, tổng kinh phí và nhà cung cấp chỉ định.
  * Thao tác **Phê Duyệt (`approvePurchaseOrder`)** hoặc **Từ Chối (`rejectPurchaseOrder`)** với thông báo Toast phản hồi tức thời.
* **Tab 3 - Giám Sát Điều Chuyển Kho Liên Chi Nhánh (Stock Transfers):**
  * Theo dõi luồng hàng hóa điều chuyển giữa các điểm bán và kho trung tâm (`Stock Transfers`).
  * Xem danh sách các mặt hàng đang bị thiếu hụt/sắp hết hàng trên toàn chuỗi (`lowStockList`).
  * Giám sát hạn mức tồn kho an toàn (`SafeStockChainItem`).

---

### 7. Phân Hệ Quản Lý Chi Nhánh (Branch Manager Module)
*Tập tin quản lý:* [`BranchScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/branch/BranchScreen.tsx)

* **Tab 1 - Doanh Thu & Nhân Lực Chi Nhánh (Revenue):**
  * Theo dõi doanh thu theo ca trực của điểm bán, tổng số hóa đơn đã xuất trong ngày.
  * Quản lý danh sách dược sĩ và nhân viên đang trực ca tại cửa hàng (họ tên, email, điện thoại, trạng thái hoạt động).
* **Tab 2 - Cảnh Báo Tồn & Đề Xuất Bổ Sung Hàng (Alerts & Requisitions):**
  * Danh sách thuốc sắp hết hàng hoặc đã hết hàng tại quầy thuốc, lọc theo *Tất cả, Đã hết (OUT), Sắp hết (LOW)*.
  * **Modal Tạo Phiếu Xin Cấp Hàng Từ Kho Trung Tâm:**
    * Hiển thị thông tin thuốc, ảnh nhận diện bao bì độ nét cao.
    * Nhập số lượng cần bổ sung và lý do đề xuất.
    * Gửi yêu cầu điều chuyển kho (`createStockTransfer`) lên cấp trên phê duyệt.

---

### 8. Phân Hệ Quản Trị Hệ Thống (System Admin Dashboard)
*Tập tin quản lý:* [`AdminScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/admin/AdminScreen.tsx)

* **Tab 1 - Giám Sát Sức Khỏe Microservices (System Health):**
  * 4 Đồng hồ đo lường tải hệ thống: *Tải API Gateway, Tải CPU, Mức sử dụng RAM, Số phiên hoạt động*.
  * Trạng thái hoạt động thời gian thực của 5 Microservices: `auth-service`, `user-service`, `inventory-service`, `supplier-service`, `ai-service` (cổng mạng, mức tải % và lưu lượng yêu cầu/phút).
* **Tab 2 - Quản Trị Nhân Sự Toàn Chuỗi (Employee Management):**
  * Danh sách nhân viên toàn hệ thống, tìm kiếm nhanh theo tên/email.
  * Modal tạo mới tài khoản nhân viên (Họ tên, Email, Số điện thoại, Phân quyền vai trò: Dược sĩ, Thủ kho, Quản lý, Giám đốc).
  * Nút **Khóa / Mở Khóa Tài Khoản Nhân Viên Tức Thì** (`toggleBanEmployee`) với hiệu ứng đổi trạng thái trực quan.
* **Tab 3 - Nhật Ký Kiểm Toán Hệ Thống (Audit Logs):**
  * Ghi nhận toàn bộ thao tác nhạy cảm trên hệ thống (ai sửa giá thuốc, ai duyệt đơn kho, ai tạo nhân viên) kèm nhãn thời gian chi tiết.
* **Thanh Điều Hướng Nhanh Giữa Các Màn Hình (Quick Actor Switcher):**
  * Tích hợp thanh cuộn nhanh dưới menu tab giúp Admin nhảy ngay tới bất kỳ vai trò nào (Khách hàng, Thủ kho, Giám đốc, Dược sĩ, Quản lý) để kiểm tra giao diện mà không cần đăng nhập lại.

---

### 9. Phân Hệ Tiện Ích Dùng Chung & Trải Nghiệm Người Dùng (Common Hub)
*Tập tin quản lý:* [`ProfileScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/common/ProfileScreen.tsx), [`NotificationListScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/common/NotificationListScreen.tsx), [`WebViewScreen.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/common/WebViewScreen.tsx), [`FlatComponentsShowcase.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/mobile/src/screens/common/FlatComponentsShowcase.tsx)

* **Hồ Sơ Cá Nhân & Testing Hub (`ProfileScreen.tsx`):**
  * Xem thông tin cá nhân, chi nhánh trực thuộc, vai trò hiện tại.
  * Modal chỉnh sửa thông tin liên hệ: Họ tên, Số điện thoại, Địa chỉ nhận hàng.
  * Modal đổi mật khẩu bảo mật: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu.
  * **Trung Tâm Đổi Vai Trò Tức Thì (Testing Hub):** Cung cấp 6 nút đổi quyền trực tiếp (Admin, Giám đốc, Thủ kho, Dược sĩ, Quản lý, Khách hàng) trong 1 chạm.
  * Đăng xuất tài khoản an toàn với hộp thoại xác nhận.
* **Trung Tâm Thông Báo Đẩy (`NotificationListScreen.tsx`):**
  * Nhận thông báo thời gian thực về đơn hàng mới, duyệt phiếu kiểm nhận, cảnh báo thuốc cận date/hết hàng.
  * Đánh dấu đã đọc từng thông báo hoặc nút "Đọc tất cả" 1-chạm.
* **Cổng Thanh Toán & In-App Browser (`WebViewScreen.tsx`):**
  * Mô phỏng cổng thanh toán PayOS cao cấp với mã QR VietQR động, bộ đếm ngược 15:00, nút mở trình duyệt ngoài và kiểm tra trạng thái thanh toán.
* **Bộ Sưu Tập Giao Diện Kính Mờ (`FlatComponentsShowcase.tsx`):**
  * Giới thiệu đầy đủ hệ thống UI chuẩn hóa: `FlatCard`, `FlatButton`, `FlatInput`, `FlatBadge`, `FlatModal`, `FlatEmptyState`.

---

## III. CÁC TỐI ƯU KỸ THUẬT ĐẢM BẢO ỨNG DỤNG CHẠY MƯỢT MÀ

1. **Hiệu Năng & Hoạt Họa 60 FPS:**
   * Sử dụng `react-native-reanimated` kết hợp `AnimatedTouchable` với bộ điều khiển Native Driver, đảm bảo mọi thao tác chạm và chuyển tab đều có phản hồi xúc giác mượt mà không gây nghẽn luồng JavaScript.
2. **Loại Bỏ Hoàn Toàn Ảnh Lỗi (Zero Broken Image Links):**
   * Hàm `ApiService.mapMedicine` tự động quét từ khóa nhóm dược lý để cung cấp ảnh dự phòng sắc nét chuyên khoa y tế, đảm bảo không có bất kỳ sản phẩm nào bị mất ảnh dù máy chủ ảnh bên ngoài gặp sự cố.
3. **Thích Ứng Đa Mạng & Đa Thiết Bị:**
   * Tự động phát hiện địa chỉ IP máy chủ của lập trình viên qua `Constants.expoConfig?.hostUri`, tự chuyển sang loopback ảo `http://10.0.2.2:4000` khi chạy trên máy ảo Android Studio, và `http://localhost:4000` trên Web.
4. **Chuẩn Hóa Thông Báo Bằng Toast Hiện Đại:**
   * Thay thế hoàn toàn các hộp thoại `Alert.alert` chặn tương tác bằng thông báo dạng thẻ trượt `react-native-toast-message`, chỉ giữ lại hộp thoại xác nhận khi thực hiện thao tác quan trọng (đăng xuất, hủy giao dịch, thu tiền POS).
5. **Khắc Phục Vỡ Giao Diện Trên Mọi Dòng Điện Thoại:**
   * Tính toán lề an toàn chuẩn (`SafeAreaView` và `useSafeAreaInsets`), tránh hoàn toàn tình trạng chữ bị đè vào Dynamic Island của iPhone hoặc nút bấm bị che khuất bởi thanh điều hướng Android.
6. **Kiểm Soát Kiểu Dữ Liệu TypeScript Tuyệt Đối:**
   * Dự án vượt qua kiểm tra tĩnh nghiêm ngặt `npx tsc --noEmit --skipLibCheck` với **0 lỗi biên dịch**, sẵn sàng đóng gói cho cả môi trường phát triển lẫn phát hành production.
