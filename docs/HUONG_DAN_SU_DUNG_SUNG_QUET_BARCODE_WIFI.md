# HƯỚNG DẪN SỬ DỤNG: BIẾN ĐIỆN THOẠI THÀNH SÚNG QUÉT BARCODE WI-FI CHO WEB POS
## Hệ Thống Chuỗi Nhà Thuốc ABC Pharmacy (WDP301 / SEP490)

---

## 📌 Tổng Quan
Tính năng **Súng Quét Barcode Wi-Fi (Wireless Mobile Barcode Scanner)** cho phép Dược sĩ sử dụng chính chiếc điện thoại thông minh (iPhone hoặc Android) làm súng quét mã vạch không dây siêu nhạy, kết nối trực tiếp với màn hình bán hàng **Web POS** trên máy tính mà **không cần mua thêm súng quét USB vật lý**.

Hệ thống hỗ trợ 2 giải pháp linh hoạt:
1. **Lựa chọn 1 (Khuyên dùng - Không cần cài app):** Quét mã QR trực tiếp trên màn hình POS để mở ứng dụng Web súng quét không dây, đồng bộ qua Server-Sent Events (SSE) và BroadcastChannel.
2. **Lựa chọn 2 (Dùng ứng dụng Barcode to PC):** Cài đặt ứng dụng *Barcode to PC: Wi-Fi scanner* trên điện thoại cùng mạng Wi-Fi với máy tính để giả lập bàn phím không dây.

---

## 🚀 LỰA CHỌN 1: QUÉT TRỰC TIẾP BẰNG CAMERA ĐIỆN THOẠI (KHÔNG CẦN CÀI APP)

Đây là giải pháp hiện đại, tối ưu nhất của hệ thống ABC Pharmacy:

### Các bước thực hiện:
1. **Trên máy tính:**
   - Đăng nhập tài khoản Dược sĩ và truy cập trang **POS Bán Hàng** (`/pharmacist/sales`).
   - Tại thanh tìm kiếm thuốc, nhấp vào nút **📱 SÚNG QUÉT WI-FI** (cạnh nút USB Scanner).
   - Hộp thoại xuất hiện hiển thị **Mã QR Kết Nối** đi kèm Mã phiên làm việc (Ví dụ: `POS-A8B9C1`).

2. **Trên điện thoại:**
   - Mở ứng dụng **Camera** mặc định của điện thoại (iOS Camera hoặc Google Lens trên Android).
   - Hướng camera vào mã QR trên màn hình máy tính và bấm vào thông báo mở liên kết:
     ```text
     https://[dia-chi-web]/pos/mobile-scanner?sessionId=POS-A8B9C1
     ```
   - Màn hình điện thoại lập tức chuyển thành **Kính ngắm súng quét chuyên dụng**:
     - Có tia laser đỏ di chuyển và khung ngắm barcode.
     - Phát âm thanh bíp (*Tít*) chuẩn siêu thị mỗi khi quét trúng mã.
     - Tự động rung máy (Haptic feedback) để Dược sĩ nhận biết mà không cần nhìn vào màn hình máy tính.

3. **Thao tác bán hàng thực tế:**
   - Cầm điện thoại đi lại trong quầy thuốc, hướng camera vào mã vạch trên vỏ hộp thuốc (hoặc bấm nhanh vào các nút thuốc mẫu trên màn hình).
   - **Phản hồi tức thì trên máy tính:** Màn hình Web POS trên máy tính tự động nhảy thuốc vào giỏ hàng ngay lập tức (độ trễ &lt; 30ms), chọn đúng lô cận hạn nhất (FEFO) và tính đúng đơn giá!

---

## 💻 LỰA CHỌN 2: DÙNG PHẦN MỀM "BARCODE TO PC" (WI-FI KEYSTROKE EMULATION)

Nếu phòng khám hoặc nhà thuốc đã quen dùng phần mềm chuyên dụng **Barcode to PC**:

### Bước 1: Chuẩn bị mạng Wi-Fi
- Đảm bảo điện thoại và máy tính chạy Web POS đang kết nối **chung một mạng Wi-Fi** (chung dải IP nội bộ).

### Bước 2: Cài đặt phần mềm trên máy tính
- Tải phần mềm miễn phí **Barcode to PC Server** tại: `https://barcodetopc.com/`
- Khởi động phần mềm (icon sẽ chạy nền ở khay hệ thống Windows bên dưới góc phải màn hình).

### Bước 3: Cài đặt ứng dụng trên điện thoại
- Vào **App Store** (iPhone) hoặc **CH Play** (Android), tìm kiếm và cài đặt ứng dụng:
  `Barcode to PC: Wi-Fi scanner`
- Mở ứng dụng, điện thoại sẽ tự động dò tìm máy tính đang chạy Barcode to PC Server cùng mạng Wi-Fi. Nhấn chọn để kết nối.

### Bước 4: Cấu hình phím bấm trên App
- Trong ứng dụng trên điện thoại, vào **Settings (Cài đặt) > Output Mode**:
  - Chọn kiểu gửi: **Keystrokes** (Gõ phím tự động).
  - Phím kết thúc (Suffix/Ending key): Chọn **Enter**.

### Bước 5: Thao tác quét thuốc vào POS
- Mở màn hình Web POS ABC Pharmacy trên máy tính (có thể nhấp chuột vào ô tìm kiếm hoặc để con trỏ ở bất kỳ đâu trên màn hình).
- Dùng camera điện thoại trong app Barcode to PC quét mã vạch sản phẩm.
- Mã vạch sẽ được truyền không dây qua sóng Wi-Fi về máy tính, tự động gõ mã và nhấn Enter:
  - Thuốc tự động thêm vào Giỏ hàng POS.
  - Tự động áp dụng chiến lược xuất kho FEFO (First-Expired, First-Out).

---

## 🎯 BẢNG MÃ BARCODE CHUẨN ĐỂ DEMO THỬ NGHIỆM

Dược sĩ có thể in bảng mã này ra giấy hoặc hướng camera điện thoại vào màn hình để quét thử nghiệm:

| Tên Dược Phẩm | Mã Barcode Chuẩn | Quy cách đóng gói | Lô FEFO xuất kho |
| :--- | :--- | :--- | :--- |
| **Thuốc sủi Efferalgan 500mg** | `3400932567577` | Hộp 16 viên sủi | `LOT-EFF-2026A` (HSD: 31/12/2026) |
| **Amoxicillin 500mg (Hộp)** | `8935006530010` | Hộp 100 viên nang | `LOT-AMOX-2027B` (HSD: 15/08/2027) |
| **Amoxicillin 500mg (Vỉ lẻ)** | `8935006530022` | Vỉ lẻ 10 viên (Tự tính giá vỉ) | `LOT-AMOX-2027B` (HSD: 15/08/2027) |
| **Panadol Extra Đỏ** | `8935001701101` | Hộp 15 vỉ x 12 viên | `LOT-PANA-2028C` (HSD: 30/06/2028) |

---

## 🛡️ CÁC TỐI ƯU CÔNG NGHỆ ĐÃ TRIỂN KHAI PHÍA HỆ THỐNG
1. **Bộ đệm chống rớt ký tự Wi-Fi (Debounce buffer 250ms):** Tự động bù trừ độ trễ jitter của sóng Wi-Fi, giúp các chuỗi số từ Barcode to PC truyền về không bao giờ bị đứt gãy hoặc mất số.
2. **Kênh truyền đa tầng (Hybrid Real-Time Pipeline):**
   - Cục bộ: Đồng bộ 0ms qua `BroadcastChannel` và `LocalStorage Event`.
   - Mạng diện rộng/Wi-Fi: Đồng bộ qua `Server-Sent Events (SSE)` kết nối trực tiếp với NestJS API Gateway (`/api/events/pos-scanner-bridge`).
3. **Phản hồi giác quan (Sensory Feedback):** Phát âm thanh tần số cao 1850Hz qua Web Audio API mô phỏng tiếng súng quét mã vạch chuyên nghiệp, kích hoạt bộ rung điện thoại tạo cảm giác như cầm thiết bị phần cứng thật.
