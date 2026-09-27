# Hướng dẫn Kịch bản Test Thủ công (Manual Test) - HR Module

Tài liệu này cung cấp kịch bản kiểm thử (test workflow) chi tiết từ A-Z cho Module Quản lý Nhân sự (SCRUM-59). Vui lòng thực hiện tuần tự để kiểm tra tính đúng đắn của toàn bộ luồng nghiệp vụ.

---

## 1. Chuẩn bị Môi trường & Dữ liệu Test
Hệ thống hiện tại mặc định có 1 Branch Manager và 1 Pharmacist. Để test tính năng hoán đổi ca làm việc, cần tạo thêm 1 tài khoản Pharmacist nữa.

1. **Khởi động hệ thống:** Chạy Backend (`docker compose up -d`) và Frontend (`npm run dev`).
2. **Đăng nhập quản lý:** Mở trình duyệt, đăng nhập với tài khoản Branch Manager:
   - Email: `manager@vinapharmacy.com`
   - Mật khẩu: `123456`
3. **Tạo thêm nhân viên:**
   - Vào menu **Quản lý nhân sự** (`/branch/employees`).
   - Bấm nút **"Cấp Account Nhân viên"**.
   - Điền thông tin tạo 1 tài khoản Dược sĩ mới (Ví dụ: Tên: `Dược Sĩ 2`, Email: `duocsi2@vinapharmacy.com`, Mật khẩu: `123456`).
   - *(Lưu ý: Nếu workflow yêu cầu Admin duyệt tạo tài khoản, hãy dùng `admin@vinapharmacy.com` để duyệt).*

---

## 2. Kịch bản 1: Quản lý chi nhánh xếp lịch (Branch Manager)
**Mục tiêu:** Kiểm tra chức năng thiết lập ca và gán lịch làm việc tuần.

1. Vẫn đang ở tài khoản `manager@vinapharmacy.com`.
2. **Thiết lập ca:** Vào menu **Quản lý Ca Làm Việc** (`/branch/shifts`).
   - Bấm nút **"Khởi tạo ca mặc định"** để sinh nhanh 2 ca (Ca Sáng & Ca Chiều).
   - Hoặc có thể tự bấm **"Tạo ca mới"** để thêm ca tùy chỉnh.
3. **Phân công lịch:** Vào menu **Phân Công Lịch Làm Việc** (`/branch/schedule`).
   - Màn hình sẽ hiển thị lịch tuần Trống, trạng thái phía trên góc phải là **"Bản nháp"**.
   - Tại cột **Thứ Hai**, dòng **Ca Sáng**: Mở dropdown và gán cho `pharmacist@vinapharmacy.com`.
   - Tại cột **Thứ Hai**, dòng **Ca Chiều**: Mở dropdown và gán cho `duocsi2@vinapharmacy.com`.
   - Bấm nút xanh **"Đăng Lịch Tuần"** ở góc màn hình.
   - **Kết quả mong đợi:** Lịch lưu thành công, trạng thái chuyển sang "Đã đăng lịch", các ô dropdown bị khóa lại (không cho sửa tự do nữa).

---

## 3. Kịch bản 2: Dược sĩ 1 xin đổi ca
**Mục tiêu:** Kiểm tra giao diện xem lịch cá nhân và gửi form xin đổi ca.

1. Mở một cửa sổ trình duyệt ẩn danh (Incognito), đăng nhập tài khoản Dược sĩ 1:
   - Email: `pharmacist@vinapharmacy.com`
   - Mật khẩu: `123456`
2. **Kiểm tra thông báo:** Nhấn vào icon cái chuông (Góc trên phải). 
   - **Kết quả mong đợi:** Xuất hiện thông báo *"Lịch làm việc tuần này đã được công bố"*.
3. **Xem lịch:** Vào menu **Lịch Làm Việc Cá Nhân** (`/pharmacist/schedule`).
   - **Kết quả mong đợi:** Sẽ thấy Ca Sáng thứ Hai nổi màu đậm (do là ca của mình), và Ca Chiều (của người khác) bị làm mờ.
4. **Tạo yêu cầu:** Bấm nút **"Đổi ca"** dưới ô Ca Sáng. (Hệ thống điều hướng sang trang `/pharmacist/shift-swaps`).
   - Form yêu cầu xuất hiện.
   - Mũi tên trái (Ca của bạn): Chọn **Ca sáng Thứ Hai**.
   - Mũi tên phải (Đổi với): Chọn **Dược sĩ 2**, sau đó chọn **Ca chiều của Dược sĩ 2**.
   - Lý do: Nhập *"Nhà có việc bận xin đổi xuống ca chiều"*.
   - Bấm gửi.
   - **Kết quả mong đợi:** Phiếu xuất hiện trong tab *Yêu cầu tôi gửi đi* với trạng thái **"Chờ đối phương"** (Màu vàng).

---

## 4. Kịch bản 3: Dược sĩ 2 xác nhận yêu cầu
**Mục tiêu:** Dược sĩ nhận yêu cầu phản hồi (Đồng ý/Từ chối).

1. Đăng xuất khỏi tài khoản Pharmacist 1.
2. Đăng nhập vào tài khoản Dược Sĩ 2: `duocsi2@vinapharmacy.com` (Mật khẩu: `123456`).
3. **Kiểm tra thông báo:** Bấm vào icon chuông để kiểm tra thông báo yêu cầu đổi ca.
4. **Xử lý phiếu:** Vào menu **Yêu cầu đổi ca** (`/pharmacist/shift-swaps`), chuyển sang Tab **"Yêu cầu đến tôi"**.
   - Bấm nút **"Đồng ý"** trên phiếu yêu cầu của Dược sĩ 1.
   - **Kết quả mong đợi:** Trạng thái phiếu thay đổi thành **"Chờ QL Duyệt"** (Màu cam).

---

## 5. Kịch bản 4: Quản lý chi nhánh chốt yêu cầu
**Mục tiêu:** Quản lý duyệt phiếu và hệ thống tự động cập nhật lịch.

1. Trở lại cửa sổ trình duyệt của Branch Manager (`manager@vinapharmacy.com`).
2. **Kiểm tra thông báo:** Sẽ có thông báo 2 dược sĩ đã đồng thuận đổi ca.
3. **Duyệt phiếu:** Vào menu **Duyệt Yêu Cầu Đổi Ca** (`/branch/shift-swaps`).
   - Sẽ thấy phiếu xin đổi ca đang ở trạng thái chờ duyệt.
   - Bấm icon **Dấu check màu xanh (Đồng ý)**.
4. **Nghiệm thu kết quả:** 
   - Quay lại menu **Phân Công Lịch Làm Việc** (`/branch/schedule`).
   - **Kết quả mong đợi:** Hệ thống đã tự động hoán đổi vị trí của 2 nhân sự. (Dược sĩ 2 chuyển lên Ca Sáng, Dược sĩ 1 bị đẩy xuống Ca Chiều).
