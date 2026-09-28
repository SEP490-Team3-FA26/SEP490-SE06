# KẾ HOẠCH TRIỂN KHAI THỰC TẾ: PHÂN NHÓM KHÁCH HÀNG THEO HÀNH VI MUA SẮM (ADAPTIVE PHARMACY RFM)

> **Dự án**: WDP301 - Hệ Thống Chuỗi Bán Lẻ Dược Phẩm GSP/GDP  
> **Module**: Khách Hàng, Marketing & CSKH Cá Nhân Hóa (Customer Analytics & Retention)  
> **Kiến trúc**: Microservices (User Service + Kafka + Redis + MongoDB Aggregation + Nightly Cron)  
> **Phương châm thiết kế**: **Thích ứng với đặc thù bệnh lý ngành Dược + Tách biệt dữ liệu khách vãng lai + Tính toán lệch giờ (Off-peak Nightly Batch) không gây chậm hệ thống POS**.

---

## 1. PHƯƠNG ÁN THỰC TẾ & HỢP LÝ NHẤT CHO BÁN LẺ DƯỢC PHẨM

### 1.1. Bản chất hành vi mua sắm tại Nhà thuốc khác biệt với Thương mại điện tử
- **Nhóm 1: Bệnh nhân điều trị mãn tính (Huyết áp, Tim mạch, Tiểu đường, Cơ xương khớp)**:
  - Bác sĩ luôn kê đơn theo liều 28–30 ngày. Khách hàng này có chu kỳ mua cực kỳ đều đặn (mỗi tháng 1 lần).
  - Với nhóm này, nếu **quá 35–40 ngày** chưa thấy quay lại, hệ thống phải kích hoạt trạng thái **Nguy cơ rời bỏ (At Risk)** ngay lập tức để Dược sĩ/CSKH gọi điện thăm hỏi, không thể chờ 90 ngày như mua quần áo hay mỹ phẩm!
- **Nhóm 2: Khách mua thuốc cấp tính (Cảm, Sốt, Tiêu hóa) & Thực phẩm chức năng**:
  - Hành vi mua đột xuất hoặc theo đợt bồi bổ. Áp dụng thang đo phân vị RFM chuẩn 12 tháng.
- **Nhóm 3: Khách vãng lai mua lẻ không để lại SĐT**:
  - Tự động gắn nhãn định danh chung `GUEST_RETAIL` và **loại trừ hoàn toàn khỏi tập mẫu phân tích RFM** để tránh làm sai lệch phân vị thống kê.

---

## 2. MA TRẬN PHÂN NHÓM 5 PHÂN KHÚC & HÀNH ĐỘNG MARKETING TỰ ĐỘNG

Dựa vào điểm số `[R, F, M]` chuẩn hóa từ 1 đến 5:

| Phân khúc | Đặc điểm hành vi | Ngưỡng điểm | Kịch bản tự động hóa (Automated Trigger) |
| :--- | :--- | :---: | :--- |
| **👑 Champions (Khách Hàng Kim Cương)** | Khách hàng ruột, chi tiêu lớn, ghé mua hàng tháng. | `R: 4-5`<br>`F: 4-5`<br>`M: 4-5` | • Tự động nhân đôi điểm tích lũy thành viên.<br>• Tặng quà tri ân sinh nhật & dịp Tết.<br>• Hỗ trợ Dược sĩ tư vấn riêng 1-1 qua Zalo. |
| **💎 Loyal Chronic (Khách Mua Thuốc Mãn Tính)** | Mua đơn thuốc định kỳ 28–30 ngày, ổn định nhiều năm. | `R: 3-5`<br>`F: 3-5`<br>`M: 3-5` | • **Hệ thống tự động nhắc mua thuốc**: Bắn thông báo Zalo ZNS / App trước 3 ngày hết thuốc kèm danh mục đơn cũ.<br>• Miễn phí giao hàng tận nhà khi tái mua. |
| **🌱 Potential Loyalist (Khách Mới Tiềm Năng)** | Khách mới mua 1-2 lần gần đây nhưng giá trị đơn hàng cao. | `R: 4-5`<br>`F: 1-2`<br>`M: 3-5` | • Tự động tặng Voucher giảm 5% cho đơn tiếp theo, hạn dùng 14 ngày để kích thích lần mua thứ 2. |
| **⚠️ At Risk (Nguy Cơ Rời Bỏ)** | Từng mua rất nhiều/đều đặn nhưng đã quá chu kỳ bình thường (quá 40 ngày với thuốc mãn tính hoặc quá 90 ngày với TPCN) không thấy ghé. | `R: 1-2`<br>`F: 3-5`<br>`M: 3-5` | • Tự động tạo **Voucher Cứu Khách (Win-back Voucher 10-15%)** gửi qua SMS/Zalo.<br>• Đưa vào danh sách gọi điện CSKH của Dược sĩ chi nhánh. |
| **💤 Hibernating / Lost (Ngủ Đông / Đã Mất)** | Khách lâu ngày không tương tác (> 6 tháng). | `R: 1`<br>`F: 1-2`<br>`M: 1-2` | • Chỉ gửi tin nhắn thông báo khi có chiến dịch đại hạ giá hoặc chương trình cộng đồng. |

---

## 3. KIẾN TRÚC HIỆU NĂNG CAO: TÍNH TOÁN LỆCH GIỜ (OFF-PEAK NIGHTLY BATCH)

Để đảm bảo máy POS tại quầy và App khách hàng luôn mượt mà (độ trễ < 50ms):
1. **Không tính toán RFM theo thời gian thực (On-the-fly)** vì việc quét hàng trăm nghìn đơn hàng sẽ làm tê liệt Database bán hàng vào ban ngày.
2. **Nightly Cron Job (Chạy lúc 01:00 AM)**:
   - Sử dụng MongoDB Aggregation Pipeline tính toán toàn bộ chỉ số R, F, M cho các khách hàng có SĐT.
   - Chấm điểm phân vị (Quintile 1 - 5) và lưu kết quả cố định vào bảng `customer_segments`.
3. **Redis Caching**:
   - Cache kết quả phân khúc và đề xuất voucher của khách hàng theo `phone` với TTL 24 giờ.
   - Khi khách hàng quét mã hoặc đọc SĐT tại quầy POS, hệ thống lấy ngay phân khúc trong **1 mili-giây** để hiển thị ưu đãi phù hợp lên màn hình Dược sĩ.

---

## 4. BẢNG DỮ LIỆU ĐẶC THÙ NGÀNH DƯỢC (`customer_segments`)

```typescript
{
  _id: ObjectId,
  phone: String,                  // Định danh duy nhất của khách hàng (Unique Index)
  fullName: String,
  primaryBranchId: String,        // Chi nhánh quen thuộc nhất
  customerType: 'CHRONIC_PATIENT' // Bệnh nhân mãn tính (ưu tiên chu kỳ 30 ngày)
              | 'GENERAL_RETAIL', // Khách hàng tiêu dùng chung
  
  // Chỉ số RFM
  lastOrderDate: Date,
  recencyDays: Number,
  totalOrders12M: Number,
  totalSpent12M: Number,
  avgOrderValue: Number,

  // Điểm số phân vị (1 - 5)
  rScore: Number,
  fScore: Number,
  mScore: Number,
  segment: 'CHAMPIONS' | 'LOYAL_CHRONIC' | 'POTENTIAL_LOYALIST' | 'AT_RISK' | 'HIBERNATING',

  // Dự báo tái mua & Tự động hóa tiếp thị
  predictedRefillDate: Date,      // Ngày dự kiến hết thuốc cần mua lại
  nextAction: 'SEND_REFILL_REMINDER' | 'DISPATCH_WINBACK_VOUCHER' | 'VIP_CONCIERGE',
  lastEvaluatedAt: Date
}
```
