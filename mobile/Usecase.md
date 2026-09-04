## Use Case Mobile App

> Tài liệu này mô tả **use case cho app mobile** (React Native) dựa trên đặc tả hệ thống trong `README.md`.  
> Tập trung vào 2 role chính: **User (Customer)** và **Staff (Check-in)**.

---

### 1. User (Customer)

#### 1.1. Auth & Tài khoản
- **UC-M-01 – Đăng ký tài khoản (Customer)**  
  - Màn hình: Register  
  - Hành động: Nhập email, mật khẩu, thông tin cơ bản → gọi API `POST /api/auth/register` → xác thực OTP (nếu có flow OTP trên mobile).
- **UC-M-02 – Đăng nhập / Đăng xuất**  
  - Màn hình: Login  
  - API: `POST /api/auth/login`, `POST /api/auth/logout`  
  - Lưu token, role vào storage → điều hướng vào khu vực User.
- **UC-M-03 – Quên mật khẩu / Đặt lại mật khẩu**  
  - Màn hình: ForgotPassword → ResetPassword  
  - API: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.
- **UC-M-04 – Xem & cập nhật hồ sơ** (map UC-04, UC-05)  
  - Màn hình: Profile  
  - API:
    - `GET /api/users/me` – lấy thông tin hiện tại.
    - `PATCH /api/users/me` – cập nhật hồ sơ.
    - `PATCH /api/users/me/password` – đổi mật khẩu.

#### 1.2. Khám phá sự kiện (Discovery)
- **UC-M-05 – Tìm kiếm & Lọc sự kiện** (map UC-06)  
  - Màn hình: EventList / Search  
  - API: `GET /api/events` với các query: `q`, `date`, `location`, `category`.  
  - Hỗ trợ tìm không dấu như mô tả trong README.
- **UC-M-06 – Xem chi tiết sự kiện** (map UC-07)  
  - Màn hình: EventDetail  
  - API: `GET /api/events/:eventId`.
- **UC-M-07 – Xem sơ đồ ghế** (map UC-07, UC-09, UC-36)  
  - Màn hình: SeatMap  
  - API:
    - `GET /api/events/:eventId/seats` – load sơ đồ ghế.
    - (Sau này) `GET /api/events/:eventId/view-360` – nếu cần hiển thị 360°.
- **UC-M-08 – Gợi ý cá nhân hóa** (map UC-08)  
  - Màn hình: Home / Recommended  
  - API: `GET /api/events/recommendations`.

#### 1.3. Đặt vé & Thanh toán
- **UC-M-09 – Chọn & Giữ ghế** (map UC-09)  
  - Màn hình: SeatSelection  
  - API: `POST /api/bookings/reserve-seats` – gửi danh sách ghế chọn, nhận về mã giữ chỗ + thời gian hết hạn.
- **UC-M-10 – Áp dụng mã giảm giá (Voucher)** (map UC-11)  
  - Màn hình: Checkout  
  - API: `POST /api/bookings/apply-voucher`.
- **UC-M-11 – Thêm sự kiện vào yêu thích (Wishlist)** (map UC-12)  
  - Màn hình: EventDetail (nút “Thêm vào yêu thích”)  
  - API: `POST /api/bookings/favorites` (hoặc endpoint tương ứng), `GET /api/bookings/favorites`.
- **UC-M-12 – Thanh toán PayOS** (map UC-17)  
  - Màn hình: Checkout → PayOS WebView / deep link  
  - API:
    - `POST /api/payments/create-payment-intent` – tạo payment link.
    - Lắng nghe webhook từ backend → app chỉ cần poll trạng thái booking nếu cần.
- **UC-M-13 – Nhận vé & QR Code** (map UC-18)  
  - Màn hình: TicketDetail / MyTickets  
  - API: `GET /api/bookings/:bookingId` hoặc `GET /api/users/me/tickets`  
  - Hiển thị QR Code (backend đã generate, app chỉ render ảnh/chuỗi).
- **UC-M-14 – Hủy vé & gửi yêu cầu hoàn tiền** (map UC-15)  
  - Màn hình: TicketDetail  
  - API: `POST /api/bookings/:bookingId/cancel` – gửi request, backend xử lý rule 36h & 40% fee.

#### 1.4. Quản lý vé & ví
- **UC-M-15 – Xem lịch sử mua vé** (map UC-19)  
  - Màn hình: PurchaseHistory  
  - API: `GET /api/bookings` (filter theo user).
- **UC-M-16 – Đăng ký danh sách chờ (Waitlist)** (map UC-16)  
  - Màn hình: EventDetail (khi sold-out)  
  - API: `POST /api/bookings/waitlist`.
- **UC-M-17 – Xem ví số dư & lịch sử giao dịch** (map UC-44)  
  - Màn hình: Wallet  
  - API:
    - `GET /api/users/wallet`
    - `POST /api/users/wallet/withdraw` – yêu cầu rút tiền (nếu có use case này cho Customer).

---

### 2. Staff (Check-in App)

#### 2.1. Auth
- **UC-M-18 – Đăng nhập nhân viên** (map UC-31)  
  - Màn hình: StaffLogin  
  - API: `POST /api/staff/login`  
  - Sau khi login, lưu token + role = STAFF, điều hướng sang màn hình quét QR.

#### 2.2. Check-in & quét vé
- **UC-M-19 – Quét mã QR vé** (map UC-32)  
  - Màn hình: StaffScan (Camera)  
  - Camera đọc QR → gửi payload lên API `POST /api/staff/check-in/scan`.  
  - Backend kiểm tra hợp lệ vé, trạng thái, sự kiện, thời gian.
- **UC-M-20 – Xác thực & Check-in vé** (map UC-33)  
  - Tiếp tục từ UC-M-19  
  - API trả về: trạng thái vé (VALID/USED/EXPIRED/INVALID) + thông tin cơ bản của khách/sự kiện.  
  - UI hiển thị kết quả rõ ràng (màu xanh/đỏ) để staff dễ thao tác.
- **UC-M-21 – Check-in bằng FaceID (optional nâng cao)** (map UC-35/UC-32 mở rộng)  
  - Màn hình: StaffFaceCheck  
  - API: `POST /api/staff/check-in/face` – gửi dữ liệu FaceID (tùy cách backend thiết kế).

---

### 3. Gợi ý triển khai trong code mobile

- **Routing / Navigation**
  - Tách 2 flow:
    - Flow **User**: Auth → Discovery → Booking → Tickets → Wallet.
    - Flow **Staff**: StaffLogin → StaffScan → StaffResult.
- **Context / State**
  - Sử dụng `AuthContext` (đã tạo) để lưu:
    - `role: 'guest' | 'user' | 'staff'`
    - Thông tin cơ bản của user/staff (id, name, email).
- **Mapping với README**
  - Các mã UC-M-xx ở trên được map tương ứng với UC trong README để:
    - Backend: biết use case nào thuộc service nào.
    - Mobile: biết màn hình nào cần gọi API nào.

