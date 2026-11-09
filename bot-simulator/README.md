# ABC Pharmacy — Digital Twin & Live Traffic Simulator v2.0 Clean

Module mô phỏng song sinh kỹ thuật số (Digital Twin) độc lập cấp doanh nghiệp cho hệ thống **ABC Pharmacy**, tạo lưu lượng, hành vi nhân sự và chuỗi cung ứng kho vận thực chiến dựa trên thuật toán **Ngẫu Nhiên Có Thiên Vị (Biased & Weighted Randomness)**, vận hành 100% trên nền tảng Express, WebSocket Socket.IO và Chart.js.

---

## 1. Nguyên Tắc Thiết Kế: Dữ Liệu Sống & Ngẫu Nhiên Có Thiên Vị

Hệ thống loại bỏ hoàn toàn các script seed ảo tĩnh. Mọi dữ liệu (đơn hàng, đánh giá, chấm công, phiếu nhập kho) đều được sinh ra từ các luồng hành vi tự nhiên chạy qua API Gateway (`http://localhost:4000`), tuân thủ đầy đủ các guard (`JwtAuthGuard`, `RolesGuard`, `ValidationPipe`), trừ kho FIFO thật và bắn sự kiện vào Kafka Event Bus.

### Thuật toán Thiên vị Thực tế (Biased & Weighted Randomness):
1. **Thiên vị Từ khóa theo Mùa (Seasonal Trend Bias)**:
   - 70% lượt tìm kiếm tập trung vào nhóm thuốc "hot trend" giao mùa / cảm cúm / hô hấp (*Panadol hạ sốt, Khẩu trang y tế 4 lớp, Vitamin C 1000mg, Siro ho Prospan, Nước muối sinh lý, Men vi sinh*).
   - 30% dành cho các mặt hàng thông thường (xương khớp, dầu xoa bóp, kem bôi da).
2. **Sản phẩm Chủ lực (Hero Best-Sellers) vs Sản phẩm Nhạy cảm (Problematic)**:
   - **Hero Products (Chiếm 65 - 70% doanh số)**: Khách mua số lượng 2 - 4 hộp. Khi các mặt hàng này bán chạy, tồn kho tại chi nhánh tụt nhanh -> Quản lý cơ sở (`Branch Manager`) ưu tiên tạo yêu cầu nhập hàng (`PR`) đúng các thuốc này -> Thủ kho (`Warehouse`) gom PR tạo `PO` nhập từ Nhà cung cấp. Báo cáo quản trị thể hiện rõ quy luật kinh doanh. Đánh giá của nhóm này 95% là 4 - 5 sao.
   - **Problematic Products (Chiếm 10% doanh số)**: Các mặt hàng nhạy cảm bao bì hoặc giao vào giờ cao điểm sẽ nhận đánh giá 1 - 2 sao (kèm tag *"Móp hộp"*, *"Chờ đợi lâu"*). Nhờ đó, Manager Bot tự động phản hồi và đóng phiếu giải quyết khiếu nại theo cam kết SLA 24h.
3. **Phân loại Tính cách Nhân sự & Khung giờ Ca Chi nhánh**:
   - Tự động nhận diện khung ca làm việc theo từng chi nhánh: BR-001/BR-004 (ca sáng 06:00 - 14:00), BR-002/BR-003 (ca sáng 07:00 - 15:00).
   - **Dược sĩ Gương mẫu (`PUNCTUAL`)**: 95% check-in sớm 5 - 15 phút trước giờ mở ca.
   - **Dược sĩ Hay đi muộn (`CHRONIC_LATE`)**: 70% check-in trễ 10 - 25 phút so với giờ bắt đầu ca, hệ thống HR tự động ghi nhận trạng thái `LATE`.
   - Check-out và Bàn giao ca: Diễn ra sau khi hết giờ ca, hoàn tất nộp biên bản chốt két tiền mặt và checklist thuốc kiểm soát đặc biệt.
4. **100% Đơn Hàng COD Kèm Địa Chỉ Đầy Đủ 4 Cấp**:
   - Phương thức thanh toán 100% `CASH` (mã chuẩn backend cho COD - Cash on Delivery).
   - Địa chỉ giao hàng đầy đủ: *Số nhà + Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố* (tại TP.HCM, Hà Nội, Đà Nẵng).

---

## 2. 4 Nhóm Tác Nhân Mô Phỏng (Roles)

### 1. Khách Hàng (Customer Bot)
- Gửi nhật ký tìm kiếm hành vi người dùng vào Kafka (`POST /api/recommendations/search-log`).
- Duyệt chi tiết sản phẩm thuốc (`GET /api/medicines/:id`).
- Đặt mua Online 100% COD với địa chỉ thực tế (`POST /api/orders`), trừ kho FIFO tức thì.
- Gửi đánh giá sản phẩm (`POST /api/products/:id/reviews`) và phản hồi chi nhánh (`POST /api/feedbacks`).

### 2. Dược Sĩ POS (Pharmacist Bot)
- Điểm danh GPS Geofencing chuẩn bán kính Haversine theo ca làm việc chi nhánh (`POST /api/hr/attendance/check-in`).
- Bán lẻ POS tại quầy 100% `RETAIL` (`POST /api/sales`), không bán sỉ.
- Bàn giao ca trực GPP (kiểm đếm két tiền, biên bản số đơn, thuốc kiểm soát đặc biệt) qua `POST /api/hr/shift-handover/submit`.
- Check-out tan ca chuẩn GPS Geofencing (`POST /api/hr/attendance/check-out`).

### 3. Quản Lý Cơ Sở (Branch Manager Bot)
- Xử lý khiếu nại khách hàng đánh giá 1 - 2 sao theo cam kết SLA 24h (`PATCH /api/feedbacks/:id/resolve`).
- Lập và công bố lịch trực tuần mới cho dược sĩ cơ sở (`POST /api/hr/schedules/publish`).
- Đối soát báo cáo KPI doanh số và phê duyệt bảng lương tháng (`POST /api/hr/payroll/calculate` & `PATCH /api/hr/payroll/:id/approve`).
- Giám sát tọa độ GPS chuẩn cho cơ sở (`PATCH /api/branches/:id/location`).

### 4. Thủ Kho Tổng (Warehouse Bot & Supply Chain)
- **Purchase Requisition (PR)**: Chi nhánh tự động tạo yêu cầu nhập hàng khi thuốc Hero bán chạy bị hụt tồn kho (`POST /api/purchase-requisitions`).
- **Purchase Order (PO Auto Route)**: Tự động gom PR theo từng Nhà cung cấp lớn (DHG, Traphaco, Imexpharm...), tạo PO và duyệt lệnh thanh toán công nợ (`POST /api/purchase-orders/auto-route`).
- **Goods Receipt Note (GRN)**: Nhập kho theo số lô (`batchNo`) và hạn sử dụng (`expDate`), tự động kích hoạt tăng tồn kho và sinh `InventoryTransaction` (`POST /api/goods-receipts`).
- **Stock Transfer**: Xuất chuyển kho điều phối thuốc từ Kho Tổng về các chi nhánh (`POST /api/stock-transfers`).

---

## 3. Giao Diện Điều Khiển Command Center (`http://localhost:4050`)

- **6 Thẻ KPI Trực Quan**: Khách trực tuyến, Tìm kiếm Kafka, Đơn COD & POS, Doanh thu VND, Đánh giá & SLA, Chuỗi kho PR/PO/GRN.
- **Biểu Đồ Trực Quan (Chart.js)**: Throughput sự kiện thời gian thực và Tỷ lệ hoạt động 4 vai trò.
- **Danh Sách Dược Sĩ & Persona**: Hiển thị trạng thái trong ca/ngoài ca và nhãn tính cách (Gương mẫu / Hay trễ).
- **Bàn Kích Hoạt Nhanh 1-Click**: Dược sĩ vào ca, Bàn giao két, 5 Đơn COD, Chuỗi nhập kho, Lập lịch tuần, Bảng lương tháng.
- **Dòng Sự Kiện Live Stream**: Lọc theo từng role, ô tìm kiếm thời gian thực, nút xuất file JSON báo cáo.

---

## 4. Hướng Dẫn Vận Hành & Kiểm Thử

### Khởi động Simulator:
```bash
cd bot-simulator
npm start
```
Mở trình duyệt: `http://localhost:4050`

### Chạy Kiểm Thử Tự Động:
```bash
npm test --prefix bot-simulator
```
*(Bao gồm 27 test cases trải dài trên 5 bộ kiểm thử: Data Pools, ApiClient Retry, Scheduler 4-Timers, BotEngine Biased E2E và Express REST API).*
