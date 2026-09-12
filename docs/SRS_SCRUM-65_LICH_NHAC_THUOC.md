# BẢN ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## Tính Năng: Quản Lý & Nhắc Lịch Uống Thuốc (Medication Reminder & Adherence Tracking)

* **Mã công việc (Jira Key):** `SCRUM-65`
* **Tiêu đề Ticket:** `[Feat] lịch nhắc thuốc`
* **Người tạo (Reporter):** phuocthde180577
* **Sprint:** SCRUM Sprint 0
* **Độ ưu tiên (Priority):** Medium
* **Phân hệ (Module):** Personalized Healthcare Services (UC-159) / Customer Mobile Experience
* **Kiến trúc hệ thống:** NestJS Microservices + Apache Kafka + Redis Cache-Aside + MongoDB

---

## 1. TỔNG QUAN HỆ THỐNG (INTRODUCTION & CONTEXT)

### 1.1. Bối cảnh & Mục tiêu (Business Problem & Goals)
* **Vấn đề thực tế:** Tỷ lệ bệnh nhân quên uống thuốc, uống sai liều, hoặc ngưng thuốc giữa chừng khi triệu chứng thuyên giảm lên tới hơn 50%, dẫn đến kháng thuốc hoặc kéo dài thời gian hồi phục.
* **Mục tiêu:** Cung cấp tính năng lập lịch và tự động nhắc nhở uống thuốc thông minh trên ứng dụng di động PharmaChain. Tích hợp trực tiếp với hóa đơn mua thuốc tại quầy/đơn hàng online hoặc đơn thuốc quét qua AI OCR để tự động hóa quá trình tạo phác đồ nhắc nhở.

### 1.2. Các tác nhân tham gia (Actors)
1. **Khách hàng / Bệnh nhân (Customer):** Thiết lập lịch, nhận thông báo, ghi nhận tình trạng uống thuốc (Đã uống / Bỏ qua / Nhắc lại).
2. **Dược sĩ (Pharmacist):** Xem báo cáo mức độ tuân thủ điều trị (Adherence Report) để đưa ra khuyến nghị khi bệnh nhân tái khám/mua thêm thuốc.
3. **Hệ thống (System / Scheduler Service):** Tự động phát thông báo định kỳ, đối soát lịch uống và cảnh báo khi thuốc sắp hết (Refill Alert).

---

## 2. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - FR)

```
+-------------------------------------------------------------------------------+
|                        LUỒNG HOẠT ĐỘNG CHỨC NĂNG                              |
+-------------------------------------------------------------------------------+
| [Hóa đơn / Quét AI OCR] ---> Tự động trích xuất liều dùng                     |
|            hoặc                                                               |
| [Nhập thủ công]         ---> Chọn thuốc trong Master Data                     |
|            |                                                                  |
|            v                                                                  |
| [Cấu hình lịch trình]   ---> Giờ uống, trước/sau ăn, tần suất ngày/tuần       |
|            |                                                                  |
|            v                                                                  |
| [Hệ thống Scheduler]    ---> Local Notification (Mobile) + Push (FCM/Kafka)   |
|            |                                                                  |
|            v                                                                  |
| [Khách hàng Check-in]   ---> Đã uống (Taken) / Bỏ qua (Skipped) / Hoãn 15p    |
|            |                                                                  |
|            v                                                                  |
| [Báo cáo & Tự động hóa] ---> Tính Adherence Score % & Nhắc mua thêm thuốc     |
+-------------------------------------------------------------------------------+
```

### FR-01: Khởi tạo Lịch Nhắc Uống Thuốc (Schedule Creation)
* **FR-01.1 (Đồng bộ tự động từ Đơn thuốc):** Khi khách hàng hoàn thành đơn hàng có thuốc kê đơn/không kê đơn hoặc quét ảnh đơn thuốc thành công qua AI OCR, hệ thống hiển thị tùy chọn: *"Thêm toàn bộ đơn thuốc vào Lịch nhắc uống?"*. Nếu đồng ý, tự động điền: Tên thuốc, liều lượng, số ngày dùng, tần suất.
* **FR-01.2 (Thêm thủ công):** Khách hàng tự tìm kiếm thuốc theo tên/hoạt chất (từ danh mục thuốc PharmaChain), chọn:
  * Dạng bào chế: Viên nén, viên nang, dung dịch, gói, ống...
  * Liều dùng: Số lượng + đơn vị (viên, ml, giọt).
  * Mối liên hệ với bữa ăn: Trước ăn (30p), trong bữa ăn, sau ăn (15-30p), hoặc lúc đói.
  * Hướng dẫn chi tiết: Uống nhiều nước, không nhai nát...

### FR-02: Thiết lập Tần suất & Thời gian (Timing & Frequency)
* **FR-02.1:** Cung cấp các chế độ lặp:
  * Hằng ngày (Everyday).
  * Ngày chẵn / lẻ hoặc theo chu kỳ (Mỗi X ngày một lần).
  * Các ngày cố định trong tuần (Thứ 2, 4, 6...).
  * Uống theo liệu trình ngắt quãng (VD: Thuốc tránh thai hàng ngày, thuốc kháng sinh 7 ngày).
* **FR-02.2:** Cài đặt nhiều mốc giờ trong ngày (Sáng, Trưa, Chiều, Tối).
* **FR-02.3:** Đặt khoảng thời gian áp dụng: Ngày bắt đầu, ngày kết thúc hoặc duy trì liên tục (thuốc mãn tính: tim mạch, huyết áp, tiểu đường).

### FR-03: Phát Thông Báo & Tương Tác Nhanh (Notification & Quick Action)
* **FR-03.1 (Đa phương thức thông báo):**
  * **Local Notification (Mobile):** Đặt lịch trước trên hệ điều hành (Android AlarmManager / iOS UserNotifications) để chuông reo chính xác tuyệt đối ngay cả khi thiết bị **không có mạng Internet**.
  * **Push Notification (FCM/APNs):** Máy chủ gửi thông báo dự phòng và đồng bộ giữa nhiều thiết bị (Tablet, Smartphone).
* **FR-03.2 (Thao tác nhanh trên màn hình khóa / Thông báo):**
  * **Đã uống (Taken):** Lưu nhật ký với mốc thời gian thực tế.
  * **Nhắc lại sau (Snooze):** Báo lại sau 10, 15, hoặc 30 phút.
  * **Bỏ qua (Skipped):** Yêu cầu chọn lý do (Tác dụng phụ, quên mang thuốc, hết thuốc...).

### FR-04: Đo lường Mức độ Tuân thủ Điều trị (Adherence Tracking)
* **FR-04.1 (Chỉ số Adherence Score):** Tính tỷ lệ phần trăm tuân thủ theo công thức:
  $$\text{Adherence Rate (\%)} = \left(\frac{\text{Số liều đã uống đúng giờ}}{\text{Tổng số liều được chỉ định trong kỳ}}\right) \times 100$$
* **FR-04.2 (Giao diện Lịch - Calendar View):**
  * Màu xanh lá: Uống đúng giờ (trong vòng 45 phút quanh giờ hẹn).
  * Màu vàng: Uống trễ (> 45 phút).
  * Màu đỏ: Bỏ liều (Missed / Skipped).
* **FR-04.3 (Chia sẻ dữ liệu y tế):** Xuất báo cáo lịch sử tuân thủ để Dược sĩ tại chi nhánh PharmaChain kiểm tra khi tư vấn đợt thuốc mới.

### FR-05: Cảnh báo Hết thuốc & Gợi ý Mua thêm (Refill Reminder)
* Hệ thống theo dõi số lượng tồn thuốc cá nhân (`remaining_pills`).
* Khi lượng thuốc còn lại chỉ đủ dùng trong $\le 3$ ngày, hệ thống kích hoạt thông báo nhắc nhở kèm nút bấm: *"Đặt mua thêm thuốc tại PharmaChain"* (tự động điều hướng và thêm sản phẩm vào giỏ hàng).

---

## 3. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

| Tiêu chí | Đặc tả kỹ thuật & Yêu cầu |
| :--- | :--- |
| **Độ trễ thông báo** | Thông báo phải phát ra trong vòng $\pm 30$ giây so với thời gian cài đặt. |
| **Tính khả dụng ngoại tuyến** | Mobile App phải hoạt động đầy đủ chế độ Offline-first; đồng bộ dữ liệu nhật ký lên Cloud ngay khi có kết nối trở lại. |
| **Bảo mật & Quyền riêng tư** | Dữ liệu thuốc cá nhân thuộc thông tin y tế nhạy cảm (PHI - Protected Health Information), mã hóa khi truyền qua TLS 1.3 và lưu trữ định danh phân tán. |
| **Hiệu năng & Tải đỉnh** | Khung giờ cao điểm (07:00 - 08:30 sáng) có khả năng kích hoạt hơn 100,000 sự kiện nhắc nhở/phút thông qua Kafka Message Broker. |
| **Tương thích thiết bị** | Hoạt động mượt mà trên iOS 14+ và Android 10+; hỗ trợ cơ chế chạy nền tránh bị Battery Saver tắt tiến trình. |

---

## 4. THIẾT KẾ KIẾN TRÚC & QUY CHUẨN KAFKA (PLAYBOOK COMPLIANT)

> Tuân thủ chuẩn kiến trúc: **API Gateway + Kafka + Redis + MongoDB**.

```
[Mobile App / Web]
       | (HTTP REST)
       v
[API Gateway] <========================> [Redis Cache]
       |                               (Cache-Aside / Eviction)
       | (Kafka Topics)
       +-------- emit (Event-Driven: Create/Update/Delete/Checkin) --------+
       |                                                                    |
       +-------- send (Request-Response: Get By ID, Get All) -----------+  |
                                                                        |  |
                                                                        v  v
                                                           [Medication / Notification Service]
                                                                        |
                                                                        v
                                                               [MongoDB Database]
```

### 4.1. Quy chuẩn Topics Kafka

| Thao tác | Tên Topic Kafka | Cơ chế | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Tạo mới lịch** | `medication.schedule.event.create` | `emit` (Non-blocking) | Bắn event tạo lịch, Gateway trả về `202 Accepted`. |
| **Cập nhật lịch** | `medication.schedule.event.update` | `emit` (Non-blocking) | Bắn event sửa lịch + xóa cache Redis `med_schedule:{id}`. |
| **Xóa lịch** | `medication.schedule.event.delete` | `emit` (Non-blocking) | Bắn event xóa lịch + xóa cache Redis `med_schedule:{id}`. |
| **Check-in cữ thuốc** | `medication.log.event.checkin` | `emit` (Non-blocking) | Ghi nhận uống/bỏ qua/hoãn liều dùng. |
| **Lấy chi tiết lịch** | `medication.schedule.get.by.id` | `send` (Req-Res) | Đọc Redis trước, nếu Miss gọi sang Microservice qua Kafka. |
| **Lấy danh sách lịch** | `medication.schedule.get.by.user` | `send` (Req-Res) | Truy vấn danh sách lịch thuốc đang hoạt động của người dùng. |

---

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU (MONGODB SCHEMAS)

### 5.1. Collection: `MedicationSchedule`
```json
{
  "_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
  "user_id": "64e4b5f8c2b7d81a9c1e2f3a",
  "prescription_id": "DT-2026-0987",
  "medicine_id": "MED-AUGMENTIN-625",
  "medicine_name": "Augmentin 625mg (Amoxicillin/Clavulanic)",
  "dosage": {
    "amount": 1,
    "unit": "viên"
  },
  "meal_relation": "AFTER_MEAL",
  "times_per_day": ["08:00", "20:00"],
  "repeat_type": "DAILY",
  "start_date": ISODate("2026-09-15T00:00:00Z"),
  "end_date": ISODate("2026-09-22T00:00:00Z"),
  "total_quantity": 14,
  "remaining_quantity": 10,
  "refill_alert_threshold": 4,
  "status": "ACTIVE",
  "created_at": ISODate("2026-09-12T14:00:00Z"),
  "updated_at": ISODate("2026-09-12T14:00:00Z")
}
```

### 5.2. Collection: `MedicationLog`
```json
{
  "_id": ObjectId("65f1c3d4e5f6a7b8c9d0e1f2"),
  "schedule_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
  "user_id": "64e4b5f8c2b7d81a9c1e2f3a",
  "scheduled_time": ISODate("2026-09-15T08:00:00Z"),
  "actual_time": ISODate("2026-09-15T08:12:00Z"),
  "status": "TAKEN",
  "delay_minutes": 12,
  "skip_reason": null,
  "notes": "Đã uống sau khi ăn sáng nhẹ",
  "created_at": ISODate("2026-09-15T08:12:05Z")
}
```

---

## 6. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

### Kịch bản 1: Tạo lịch nhắc thuốc thành công từ đơn thuốc mua tại quầy
* **Given:** Khách hàng đăng nhập ứng dụng và có hóa đơn mua thuốc mã `HD-88491` vừa hoàn tất.
* **When:** Khách hàng mở thông báo hoàn tất đơn hàng và bấm chọn *"Tạo lịch nhắc thuốc tự động"*.
* **Then:** Hệ thống tự động tạo các bản ghi lịch nhắc cho từng loại thuốc trong đơn; ứng dụng hiển thị danh sách các mốc giờ uống được gợi ý (08:00, 13:00, 20:00) để người dùng xác nhận hoặc tùy chỉnh.

### Kịch bản 2: Điểm danh uống thuốc khi có chuông báo
* **Given:** Đến 08:00 sáng, điện thoại khách hàng đổ chuông và hiển thị thông báo nhắc uống Augmentin 625mg.
* **When:** Khách hàng nhấn nút *"Đã uống"* trực tiếp trên thông báo hoặc giao diện ứng dụng.
* **Then:** Trạng thái cữ thuốc chuyển sang màu xanh lá (`TAKEN`), số lượng viên còn lại giảm đi 1, và thông tin được đồng bộ lên máy chủ.

### Kịch bản 3: Tự động phát cảnh báo khi thuốc sắp hết (Refill Alert)
* **Given:** Số lượng thuốc còn lại trong lịch trình là $\le 4$ viên (chỉ đủ dùng trong 2 ngày tiếp theo).
* **When:** Hệ thống chạy tác vụ kiểm tra tồn kho cá nhân lúc 20:00 mỗi ngày.
* **Then:** Gửi thông báo đến ứng dụng: *"Thuốc Augmentin 625mg sắp hết. Nhấn vào đây để đặt giao ngay về nhà từ nhà thuốc PharmaChain gần nhất"*.

---

# PHỤ LỤC ÔN LUYỆN PHỎNG VẤN KIẾN TRÚC & HỆ THỐNG 💡

### Q1: Tại sao nên sử dụng kết hợp giữa Local Notification trên Mobile và Push Notification từ Server?
* **Điểm mấu chốt khi trả lời:**
  * **Tính sống còn của Y tế (Mission-Critical):** Việc uống thuốc không được phép phụ thuộc vào sóng 4G/Wifi. Nếu người dùng ở trong tầng hầm hoặc điện thoại đang tắt mạng, Server Push sẽ không tới được. Local Notification lập lịch trực tiếp trên OS (Android/iOS) đảm bảo chuông reo $100\%$ đúng giờ.
  * **Tránh quá tải Server (Thundering Herd Problem):** Hàng triệu người dùng thường hẹn uống thuốc vào cùng các khung giờ tròn (07:00, 08:00, 12:00, 20:00). Nếu Server phải gửi hàng triệu push cùng lúc sẽ nghẽn CPU và Network bandwidth. Đẩy việc kích hoạt xuống thiết bị đầu cuối giúp giảm tải tối đa cho hạ tầng Backend.

### Q2: Tại sao các tác vụ Ghi (Tạo/Sửa/Xóa lịch) lại dùng Kafka `emit` mà không dùng HTTP REST giữa các Service?
* **Điểm mấu chốt khi trả lời:**
  * **Tối ưu thời gian phản hồi (Low Latency):** Phía API Gateway nhận request và chỉ cần bắn sự kiện vào Kafka rồi trả về `202 Accepted` ngay lập tức. Client không bị xoay vòng chờ đợi (Non-blocking I/O).
  * **Khả năng chịu lỗi (Resilience & Decoupling):** Nếu Notification/Medication Service đang quá tải hoặc khởi động lại, message vẫn được lưu an toàn trong Kafka Topic (Message Durability). Khi service hồi phục sẽ tự động tiêu thụ tiếp (Consume) mà không làm mất dữ liệu của khách hàng.

### Q3: Chiến lược Cache Redis ở Gateway xử lý việc tránh Stale Data (Dữ liệu cũ) như thế nào?
* **Điểm mấu chốt khi trả lời:**
  * **Cache-Aside Pattern khi Đọc:** Kiểm tra Redis key `med_schedule:{id}` trước. Nếu có (Hit), trả về ngay trong 1-2ms. Nếu không có (Miss), gọi sang Microservice qua Kafka `send`, nhận dữ liệu rồi ghi vào Redis với `TTL = 1 hour`.
  * **Cache Eviction chủ động khi Ghi:** Khi người dùng Sửa (`Update`) hoặc Xóa (`Delete`) lịch uống thuốc, API Gateway bắn event Kafka đồng thời gọi `await this.cacheManager.del("med_schedule:" + id)` ngay lập tức. Thao tác này loại bỏ cache cũ, đảm bảo lần đọc tiếp theo luôn lấy dữ liệu mới nhất từ Database.

### Q4: Trong MongoDB, nên lưu Lịch uống thuốc định kỳ (Recurring Schedule) theo cách nào để tối ưu dung lượng?
* **Điểm mấu chốt khi trả lời:**
  * Áp dụng **Mô hình Lai (Hybrid Approach)**:
    1. **Bảng Schedule (Rule-based):** Chỉ lưu 1 bản ghi chứa quy tắc lặp (`times_per_day`, `repeat_type`, `start_date`, `end_date`). Tránh việc sinh trước hàng trăm bản ghi trống cho tương lai gây lãng phí bộ nhớ.
    2. **Bảng Log (Event-driven / On-demand):** Bản ghi nhật ký chỉ được sinh ra khi có tương tác thực tế (Người dùng bấm Đã uống / Bỏ qua) hoặc một cronjob cuối ngày quét để đánh dấu các cữ bị quên (`MISSED`).
