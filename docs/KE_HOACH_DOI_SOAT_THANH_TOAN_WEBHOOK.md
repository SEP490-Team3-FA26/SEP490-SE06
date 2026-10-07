# KẾ HOẠCH TRIỂN KHAI THỰC TẾ: ĐỐI SOÁT THANH TOÁN TỰ ĐỘNG QUA VÍ ĐIỆN TỬ & NGÂN HÀNG (WEBHOOK RECONCILIATION)

> **Dự án**: WDP301 - Hệ Thống Chuỗi Bán Lẻ Dược Phẩm GSP/GDP
> **Module**: Tài Chính & Thanh Toán (Finance & Payment Reconciliation)
> **Kiến trúc**: Microservices (API Gateway + Kafka + Redis + MongoDB + PayOS/VietQR)
> **Phương châm thiết kế**: **Trải nghiệm quầy thuốc là ưu tiên số 1 + Dung sai thông minh + Kiểm soát thất thoát dòng tiền theo ngoại lệ (Exception-Based Accounting)**.

---

## 1. PHƯƠNG ÁN THỰC TẾ & HỢP LÝ NHẤT CHO NHÀ THUỐC BÁN LẺ

Trong môi trường nhà thuốc thực tế, **khách hàng đang ốm đau, mệt mỏi, đứng chờ tại quầy thuốc không thể bị giữ lại chỉ vì lỗi nghẽn mạng 1.000đ - 2.000đ**. Vì vậy, hệ thống áp dụng cơ chế **Đối Soát 2 Tầng (Hybrid Two-Tier Reconciliation)**:

```
                  ┌────────────────────────────────────────────────────────┐
                  │ GIAO DỊCH THANH TOÁN QR / VÍ ĐIỆN TỬ TẠI QUẦY HOẶC WEB │
                  └──────────────────────────┬─────────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          [TẦNG 1: THỜI GIAN THỰC TẠI QUẦY]             [TẦNG 2: ĐỐI SOÁT CUỐI NGÀY]
          • Webhook + Redis Idempotency Lock            • Cron Job tự động lúc 00:30 AM
          • Ngưỡng dung sai linh hoạt:                  • So khớp Doanh thu POS vs. Tiền Bank
            - Thiếu <= 5.000đ: Cho xuất thuốc ngay,      • Phân loại 3 nhóm:
              ghi nợ sổ đối soát / ví điểm.               - Khớp 100% (Matched)
            - Thừa tiền: Cho xuất thuốc, tích điểm.       - Lệch tiền (Under/Overpaid)
          • Fallback: Dược sĩ kiểm tra tức thời           - Giao dịch mồ côi (Orphan Txn)
            hoặc ghi nhận giao dịch khẩn cấp.           • Xuất bảng chênh lệch cho Kế toán
```

---

## 2. LUỒNG XỬ LÝ DUNG SAI THÔNG MINH TẠI QUẦY (REAL-TIME SMART TOLERANCE)

### 2.1. Quy tắc phân xử số tiền chênh lệch (Amount Tolerance Rules)

Khi nhận Webhook từ ngân hàng/cổng thanh toán (PayOS, VietQR):

1. **Khớp 100% số tiền**: Đơn chuyển ngay sang `PAID`, máy POS in hóa đơn và đẩy dữ liệu trừ tồn kho thời gian thực.
2. **Khách chuyển thiếu $\le$ 5.000 VNĐ** *(VD: Tiền thuốc 103.000đ khách chuyển 100.000đ hoặc gõ nhầm tiền lẻ)*:
   - **Xử lý tại quầy**: Hệ thống tự động chuyển đơn sang `PAID` (cho phép xuất thuốc ngay).
   - **Xử lý tài chính**: Ghi nhận khoản thiếu vào sổ `PaymentDiscrepancy`. Nếu khách có tài khoản thành viên, tự động cấn trừ 5.000đ điểm thưởng tích lũy. Nếu khách vãng lai, đưa vào khoản hao hụt cho phép của ca bán hàng.
3. **Khách chuyển thiếu $>$ 5.000 VNĐ**:
   - Trạng thái đơn: `PARTIAL_PAID`.
   - Máy POS hiển thị hộp thoại cảnh báo: *"Khách đã chuyển [X] đ, còn thiếu [Y] đ"*. Dược sĩ có thể thu thêm phần thiếu bằng tiền mặt hoặc yêu cầu khách quét mã QR bổ sung.
4. **Khách chuyển thừa tiền**:
   - Đơn chuyển ngay sang `PAID` (xuất thuốc bình thường).
   - Phần tiền thừa tự động chuyển thành **Điểm thưởng ví thành viên (Loyalty Points)** cộng vào SĐT khách hàng để trừ tiền lần sau, hoặc tự động tạo phiếu đề xuất hoàn tiền (Refund Requisition) nếu khách yêu cầu nhận lại tiền mặt.

### 2.2. Xử lý sự cố mạng & Webhook về trễ (POS Emergency Fallback)

Nếu khách đã thấy app ngân hàng trừ tiền nhưng máy POS chưa nhảy trạng thái:

- **Nút "Kiểm Tra Ngay" (Active Polling)**: Dược sĩ bấm nút trên POS để API Gateway gọi thẳng sang PayOS kiểm tra trạng thái tức thì thay vì thụ động đợi Webhook.
- **Xác nhận khẩn cấp có đối soát (Emergency Override)**: Nếu cổng thanh toán đối tác bị sập mạng toàn diện, Dược sĩ bấm *"Xác nhận đã xem biên lai ngân hàng"* -> Nhập 6 số cuối mã giao dịch (`FT...`). Đơn hàng được mở khóa để phát thuốc, hệ thống gắn cờ `MANUAL_OVERRIDE_PENDING_AUDIT` để Kế toán đối chiếu lại vào sáng hôm 

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA CHI TIẾT

### 3.1. Bảng Khóa Idempotency Webhook (`webhook_idempotency_locks`)

*Lưu trên Redis với TTL 24h hoặc MongoDB Unique Index*:

- `key`: `webhook:lock:{gatewayProvider}:{transactionId}`
- Đảm bảo khi ngân hàng retry gửi lại 3-5 lần, hệ thống chỉ xử lý đúng 1 lần duy nhất, tránh tình trạng cộng tiền hoặc xuất kho đúp.

### 3.2. Bảng Đối Soát Chênh Lệch Dòng Tiền (`payment_reconciliations`)

```typescript
{
  _id: ObjectId,
  orderCode: Number,              // Mã đơn hàng
  branchId: String,               // Chi nhánh phát sinh
  cashierId: String,              // Dược sĩ đứng quầy
  expectedAmount: Number,         // Số tiền cần thu theo bill
  actualAmount: Number,           // Số tiền thực tế ngân hàng báo có
  differenceAmount: Number,       // expectedAmount - actualAmount
  toleranceApplied: Boolean,      // Đã áp dụng cơ chế dung sai để xuất thuốc
  status: 'MATCHED'               // Khớp hoàn toàn
        | 'UNDERPAID_TOLERANCE'   // Thiếu nhỏ trong ngưỡng dung sai (đã cho xuất thuốc)
        | 'UNDERPAID_BLOCKED'     // Thiếu lớn (>5k, chờ thu thêm)
        | 'OVERPAID_CREDITED'     // Thừa tiền (đã cộng điểm thưởng)
        | 'MANUAL_OVERRIDE'       // Dược sĩ xác nhận khẩn cấp tại quầy
        | 'ORPHAN_PAYMENT',       // Tiền về tài khoản nhưng không khớp đơn nào
  bankTransactionId: String,      // Mã giao dịch ngân hàng
  bankCode: String,               // MBBank, Vietcombank,...
  paymentTime: Date,
  reconciledAt: Date,
  settlementBatchId: String,      // Mã phiên đối soát cuối ngày
  resolvedBy: String,
  resolutionNotes: String
}
```

---

## 4. QUY TRÌNH ĐỐI SOÁT NGOẠI LỆ CUỐI NGÀY (EXCEPTION-BASED ACCOUNTING)

* **Thời gian chạy**: `00:30 AM` mỗi ngày (sau giờ đóng cửa toàn bộ chuỗi).
* **Nguyên tắc**: Kế toán không cần xem lại hàng nghìn đơn đã khớp đúng 100%, hệ thống chỉ xuất **Danh sách ngoại lệ cần phê duyệt**:
  1. Tổng hợp các đơn hưởng dung sai thiếu tiền ($\le$ 5.000đ) để Kế toán trưởng ký duyệt hạch toán vào chi phí hao hụt hợp lý.
  2. Danh sách các đơn `MANUAL_OVERRIDE` để đối chiếu với sao kê ngân hàng ngày hôm đó.
  3. Danh sách các giao dịch "Mồ côi" (khách chuyển tiền vào tài khoản nhà thuốc nhưng sai cú pháp hoặc hủy đơn trước khi tiền về) để tiến hành liên hệ khách hoàn tiền.
