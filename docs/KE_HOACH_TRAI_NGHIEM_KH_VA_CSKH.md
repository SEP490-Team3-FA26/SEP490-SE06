# Đánh Giá Trải Nghiệm Khách Hàng Tại Chi Nhánh & Hệ Thống CSKH Tích Hợp Loyalty (Hạng Thành Viên & Điểm Thưởng)

> **Tài liệu phân tích & Kiến trúc giải pháp kỹ thuật (Fullstack Implementation Blueprint)**  
> **Dự án:** Hệ thống Quản trị & Chuỗi Bán lẻ Dược Phẩm ABC Pharmacy (WDP301)  
> **Tác giả ý tưởng:** Product Owner / Leader  
> **Kiến trúc sư giải pháp:** AI Pair Programmer  
> **Phiên bản:** v2.0 (Cập nhật tích hợp Hạng thành viên & Điểm thưởng)

---

## MỤC LỤC
1. [Khung 4 Bước Phân Tích Ý Tưởng Ban Đầu](#1-khung-4-bước-phân-tích-ý-tưởng-ban-đầu)
2. [Lựa Chọn Vận Hành Của Leader & Phản Hồi Chiến Lược](#2-lựa-chọn-vận-hành-của-leader--phản-hồi-chiến-lược)
3. [Hệ Thống Phân Hạng Thành Viên & Cơ Chế Điểm Thưởng (Loyalty Engine)](#3-hệ-thống-phân-hạng-thành-viên--cơ-chế-điểm-thưởng-loyalty-engine)
4. [Luồng Điểm Chạm Đánh Giá & Thu Thập Định Danh Khách Hàng](#4-luồng-điểm-chạm-đánh-giá--thu-thập-định-danh-khách-hàng)
5. [Thiết Kế Kiến Trúc Kỹ Thuật (Microservices Architecture)](#5-thiết-kế-kiến-trúc-kỹ-thuật-microservices-architecture)
6. [Quy Trình Xử Lý Khiếu Nại Dành Cho Trưởng Chi Nhánh (Closed-Loop SLA)](#6-quy-trình-xử-lý-khiếu-nại-dành-cho-trưởng-chi-nhánh-closed-loop-sla)

---

## 1. Khung 4 Bước Phân Tích Ý Tưởng Ban Đầu

### Bước 1: Tóm Tắt Ý Tưởng
* Thu thập phản hồi và đánh giá mức độ hài lòng (CSAT/NPS) của khách hàng gắn liền với từng giao dịch tại một **chi nhánh cụ thể**.
* Mở rộng dữ liệu phản hồi này thành **hệ thống Chăm sóc Khách hàng (CSKH / CRM)** toàn chuỗi: theo dõi chất lượng phục vụ, xử lý khiếu nại, giữ chân khách hàng.

### Bước 2: Các Giả Định Ẩn Cần Lưu Tâm
1. Khách mua thuốc có động lực và thời gian để đánh giá sau giao dịch.
2. Tỷ lệ định danh khách hàng (SĐT/App) tại quầy thuốc đủ lớn để thu thập dữ liệu có ý nghĩa.
3. Khách hàng phân biệt được thái độ phục vụ của nhân viên với đặc thù sản phẩm (thuốc đắng, giá niêm yết).
4. Dược sĩ không can thiệp/gian lận để tự tăng điểm số thi đua.
5. Chi nhánh có đủ nhân lực và quy trình để phản hồi khi có đánh giá tiêu cực.

### Bước 3: Rủi Ro Lớn Nhất
> [!CAUTION]
> **"Bẫy Thiên Lệch Phản Hồi Tiêu Cực (Negative Skew Bias)"**  
> Khách hàng hài lòng thường im lặng rời đi, chỉ có khách hàng bức xúc mới chủ động phản hồi. Nếu không có cơ chế tặng thưởng (điểm/voucher), 80-90% đánh giá thu về sẽ là 1-2 sao, gây áp lực tiêu cực lên dược sĩ và bóp méo bức tranh thực tế của chi nhánh.

### Bước 4: Câu Hỏi Làm Rõ
Đã làm rõ: Hình thức thu thập là **QR hóa đơn giấy (tại quầy) + Xác nhận nhận hàng (online)**; Người chịu trách nhiệm chính là **Trưởng chi nhánh**.

---

## 2. Lựa Chọn Vận Hành Của Leader & Phản Hồi Chiến Lược

### 2.1. Phân Tách Hai Điểm Chạm (Touchpoints)
* **Mua tại quầy:** In mã QR động trực tiếp lên hóa đơn nhiệt POS.
  * *Thách thức:* Tỷ lệ quét hóa đơn giấy tự phát rất thấp (~3-5%).
  * *Giải pháp:* In thông điệp kích hoạt động lực ngay cạnh QR:  
    👉 **"Quét mã đánh giá nhận ngay +100 Điểm Thưởng & Voucher Giảm Giá 10% Cho Lần Mua Sau!"** (Nâng tỷ lệ quét lên 25-35%).
* **Mua online:** Hiển thị popup đánh giá ngay khi khách bấm *"Đã nhận thuốc"* trong mục *Lịch sử đơn hàng* trên App / Web.

### 2.2. Trách Nhiệm Của Trưởng Chi Nhánh (Branch Manager Ownership)
* Trưởng chi nhánh trực tiếp theo dõi chỉ số CSAT của cơ sở mình.
* Khi có đánh giá 1–2 sao: Hệ thống bắn cảnh báo Realtime (Socket.IO/Push) đến App của Trưởng chi nhánh để liên hệ khách hàng trong vòng 24 giờ.
* Ban Giám Đốc chuỗi giám sát chỉ số giải quyết khiếu nại (Resolution Rate & SLA) để tránh tình trạng chi nhánh che giấu lỗi.

---

## 3. Hệ Thống Phân Hạng Thành Viên & Cơ Chế Điểm Thưởng (Loyalty Engine)

Hệ thống kết nối trực tiếp với dịch vụ `user-service` và `orders-service` đã có sẵn trong kiến trúc backend.

### 3.1. Bảng Tiêu Chuẩn Phân Hạng Khách Hàng (Customer Tiers)

| Hạng Thành Viên | Điểm Tích Lũy (`accumulatedPoints`) | Hệ Số Tích Điểm (`multiplier`) | Đặc Quyền Giảm Giá Lần Sau | Quyền Lợi CSKH Riêng Biệt |
| :--- | :--- | :--- | :--- | :--- |
| 🥉 **Hạng Đồng (Standard/Bronze)** | Dưới 1.000 điểm | x1.0 (1% giá trị đơn) | Trừ điểm tối đa 50% đơn hàng | CSKH cơ bản qua Zalo/App |
| 🥈 **Hạng Bạc (Silver)** | 1.000 – 4.999 điểm | x1.2 (1.2% giá trị đơn) | Giảm thêm 3% cho TPCN & Thiết bị | Tặng Voucher 30.000đ sinh nhật |
| 🥇 **Hạng Vàng (Gold)** | 5.000 – 9.999 điểm | x1.5 (1.5% giá trị đơn) | Giảm trực tiếp 5% toàn bộ hóa đơn | Miễn phí giao hàng nội thành, Dược sĩ gọi hỏi thăm định kỳ |
| 💎 **Hạng Kim Cương (Diamond)** | Từ 10.000 điểm trở lên | x2.0 (2% giá trị đơn) | Giảm trực tiếp 8% toàn bộ hóa đơn | Ưu tiên hotline riêng, Bác sĩ/Dược sĩ trưởng tư vấn toa thuốc 1-1 |

### 3.2. Cơ Chế Thưởng Điểm Hợp Lý & Bền Vững (Kinh Tế Bán Lẻ Dược)

> [!NOTE]
> **Quy chuẩn tỷ lệ quy đổi trong hệ thống:**  
> `1 Điểm Loyalty = 1 VNĐ`. (Mua hàng tích 1% giá trị đơn, ví dụ đơn 100.000đ tích được 1.000 điểm).  
> Biên lợi nhuận ngành thuốc mỏng (8% - 15%), do đó điểm thưởng đánh giá được cơ cấu ở mức **vừa đủ kích thích hành vi nhưng không làm thâm hụt lợi nhuận**.

* **1. Mức thưởng điểm khi đánh giá:**
  * **Đánh giá chấm sao (1–5★) & Chọn Tag nhanh:** Nhận ngay **+1.000 điểm** (= 1.000 VNĐ, tương đương mức tích lũy của đơn hàng 100.000 VNĐ).
  * **Đánh giá có tâm (Nhận xét >30 chữ hoặc đính kèm ảnh quầy thuốc):** Nhận thêm **+1.000 điểm** (Tổng cộng tối đa: **+2.000 điểm** = 2.000 VNĐ).
  * *Chi phí trên mỗi lượt đánh giá chỉ chiếm ~1% – 2% doanh thu đơn hàng, rất an toàn cho chi nhánh.*

* **2. Voucher khuyến mãi lần sau (Hợp lý & Tránh thâm hụt):**
  * Tặng **Voucher Giảm 5.000 VNĐ** cho đơn hàng kế tiếp từ **100.000 VNĐ** trở lên (thời hạn 14 ngày, áp dụng tại chính chi nhánh đó).
  * *Hoặc:* Voucher giảm **5% (tối đa 10.000 VNĐ)** chỉ áp dụng cho nhóm **Thực phẩm chức năng, Vitamin & Dược mỹ phẩm** (ngành hàng có biên lợi nhuận cao 25% – 35%, không áp dụng cho thuốc điều trị kê đơn).
  * Tặng kèm dịch vụ giá trị gia tăng (Chi phí 0đ): *"Miễn phí đo huyết áp & tư vấn chỉ số sức khỏe định kỳ bởi Dược sĩ chi nhánh"*.

* **3. Cơ chế kiểm soát & Chống gian lận (Anti-Abuse Controls):**
  * **Khóa theo đơn hàng:** Mỗi hóa đơn (`orderCode`) chỉ được tích điểm đánh giá **duy nhất 1 lần**.
  * **Giới hạn tần suất:** Mỗi số điện thoại chỉ được nhận điểm thưởng đánh giá tối đa **1 lần / ngày** và **tối đa 3 lần / tháng** (ngăn chặn hành vi tách nhỏ đơn hàng để farm điểm).
  * **Giá trị đơn tối thiểu:** Chỉ áp dụng tích điểm thưởng cho đơn hàng hoàn tất có giá trị từ **30.000 VNĐ** trở lên.

---

## 4. Luồng Điểm Chạm Đánh Giá & Thu Thập Định Danh Khách Hàng

### 4.1. Quy trình Mua Tại Quầy (POS Retail)
```
[Khách mua thuốc tại quầy]
       │
       ▼
[Dược sĩ POS in hóa đơn có QR Code động]
(In lời mời: "Quét QR nhận ngay +1.000đ - 2.000đ Điểm Thưởng & Voucher Lần Sau")
       │
       ▼
[Khách quét QR bằng Zalo / Camera Điện Thoại]
       │
       ▼
[Mở Web Form Đánh Giá 30 Giây]
- Nếu đơn có sẵn SĐT: Tự động hiển thị tên & hạng thành viên.
- Nếu khách vãng lai: Hiện ô "Nhập SĐT để nhận ngay điểm thưởng vào tài khoản".
       │
       ▼
[Khách chấm sao (1-5★) + Chọn Tag nhanh + Viết nhận xét]
       │
       ▼
[Hệ thống cộng Điểm Thưởng + Tự động Nâng Hạng + Phát Voucher vào Ví]
```

### 4.2. Quy trình Mua Online (Mobile App / Web Store)
```
[Khách nhận hàng thành công]
       │
       ▼
[Bấm 'Đã Nhận Thuốc' trong mục Lịch Sử Đơn Hàng]
       │
       ▼
[Hiển thị BottomSheet / Popup Đánh Giá]
(Đã định danh 100% qua User Profile)
       │
       ▼
[Chấm sao Dịch vụ Chi Nhánh & Thái độ Shipper]
       │
       ▼
[Cộng điểm thưởng Loyalty Realtime qua Kafka]
```

---

## 5. Thiết Kế Kiến Trúc Kỹ Thuật (Microservices Architecture)

### 5.1. Database Schema (`BranchFeedback`)
```typescript
{
  _id: ObjectId,
  orderId: string,              // ID đơn hàng
  orderCode: string,            // Mã đơn hiển thị (VD: ORD-89213)
  branchId: string,             // Mã chi nhánh (VD: BR-001)
  branchName: string,           // Tên chi nhánh
  pharmacistId?: string,        // Dược sĩ đứng quầy bán đơn này
  pharmacistName?: string,

  // Thông tin định danh khách hàng & Loyalty
  customerId?: string,          // ID tài khoản (nếu đã có)
  customerPhone: string,        // SĐT định danh (bắt buộc để tích điểm & chia hạng)
  customerName?: string,
  customerTier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond', // Hạng tại thời điểm đánh giá

  // Chi tiết đánh giá
  rating: number,               // 1 đến 5 sao
  aspects: {
    staffAttitude: number,      // Thái độ dược sĩ (1-5)
    consultationQuality: number,// Chất lượng tư vấn chuyên môn (1-5)
    waitingTime: number,        // Thời gian chờ đợi (1-5)
    cleanliness: number,        // Vệ sinh không gian quầy (1-5)
  },
  tags: string[],               // ['TuVanNhietTinh', 'NhanhChong', 'ChoLau', 'GiaCao']
  comment?: string,
  images?: string[],

  // Quyền lợi thưởng đã phát
  rewardPointsEarned: number,   // Số điểm thưởng được cộng (VD: 100)
  issuedVoucherCode?: string,   // Mã voucher giảm giá lần sau (nếu có)

  // Vòng lặp xử lý khiếu nại (CSKH Closed-Loop)
  status: 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
  isNegative: boolean,          // true nếu rating <= 2 sao
  resolution?: {
    handledBy: string,          // ID Trưởng chi nhánh xử lý
    handledByName: string,
    actionTaken: string,        // 'CALLED_CUSTOMER' | 'OFFERED_VOUCHER' | 'INTERNAL_TRAINING'
    notes: string,              // Ghi chú giải trình của Trưởng chi nhánh
    resolvedAt: Date,
    customerSatisfiedAfterCall?: boolean,
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 5.2. Các Topic Kafka Chuẩn Hóa
* **`feedback.event.created`**: Khi khách hàng gửi đánh giá thành công.
  * `user-service` lắng nghe $\rightarrow$ Thực hiện `updatePoints({ phone, pointsDelta: 100 })` và cập nhật Hạng thành viên.
  * `notification-service` lắng nghe $\rightarrow$ Nếu `rating <= 2`, phát thông báo khẩn cấp (Socket.IO) tới Trưởng chi nhánh qua room `branch-{branchId}`.
* **`feedback.event.resolved`**: Khi Trưởng chi nhánh hoàn tất xử lý khiếu nại.
  * Cập nhật trạng thái vé và lưu nhật ký Audit cho Ban Giám Đốc.

### 5.3. Danh Sách Endpoint REST API (API Gateway)
| Method | Endpoint Gateway | Vai trò | Chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/feedbacks/lookup-order/:code` | Public / Customer | Tra cứu đơn hàng từ mã QR hóa đơn để mở form đánh giá |
| `POST` | `/api/feedbacks` | Public / Customer | Gửi đánh giá + Tích điểm thưởng + Nhận voucher |
| `GET` | `/api/branch-manager/feedbacks` | Trưởng Chi Nhánh | Xem toàn bộ phản hồi & chỉ số CSAT của chi nhánh mình |
| `PATCH`| `/api/branch-manager/feedbacks/:id/resolve` | Trưởng Chi Nhánh | Cập nhật biên bản xử lý khiếu nại (giải quyết 1-2 sao) |
| `GET` | `/api/admin/feedbacks/chain-summary`| Admin / Giám Đốc | So sánh mức độ hài lòng giữa tất cả chi nhánh toàn chuỗi |

---

## 6. Quy Trình Xử Lý Khiếu Nại Dành Cho Trưởng Chi Nhánh (Closed-Loop SLA)

1. **Phát hiện tức thì (Realtime Alert):** Ngay khi khách chấm 1 hoặc 2 sao, màn hình quản trị của Trưởng chi nhánh nhấp nháy đỏ kèm âm thanh cảnh báo: *"Có khiếu nại mới từ đơn hàng ORD-xxxxx (SĐT: 0912xxx)*.
2. **Quy chuẩn SLA 24 Giờ:** Trưởng chi nhánh có tối đa **24 giờ** để gọi điện thoại trực tiếp cho khách hàng lắng nghe, xin lỗi chân thành và tặng mã giảm giá bồi thường nếu lỗi thuộc về chi nhánh.
3. **Đóng phiếu (Resolution):** Ghi rõ lý do và hành động khắc phục lên hệ thống. Nếu sau 24h chưa xử lý, phiếu sẽ tự động kích hoạt trạng thái **`SLA_BREACHED`** và gửi báo cáo về Ban Giám Đốc để kiểm điểm chi nhánh.
