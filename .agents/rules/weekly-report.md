# Quy Chuẩn Lập Báo Cáo Tuần & Báo Cáo Ngày (Weekly & Daily Report Rules) - WDP301 / SEP490

Tài liệu này quy định các tiêu chuẩn bắt buộc cho mọi Agent khi lập, cập nhật và đồng bộ Báo cáo tuần (**Weekly Report**) và Báo cáo ngày (**Daily Stand-up**) cho đồ án tốt nghiệp WDP301/SEP490.

---

## 1. Quy Tắc Bất Biến Chống Sinh Trùng Lặp (Zero-Duplicate Mandate)

> [!CAUTION]
> **Tuyệt đối cấm sinh nhiều báo cáo trùng lặp trong cùng một tài liệu (Idempotency Guarantee):**
> 1. **Kiểm tra trước khi ghi (Check before inject):**
>    - Khi tạo báo cáo cho `[Tuần N]`, Agent hoặc script **BẮT BUỘC** phải quét nội dung XML của tài liệu xem tiêu đề `[Tuần N]` đã tồn tại hay chưa.
>    - **Nếu ĐÃ TỒN TẠI:** Bắt buộc thực hiện **GHI ĐÈ CẬP NHẬT TẠI CHỖ (In-place Replace)** bằng cách định vị ranh giới khối XML của tuần đó (từ `<w:p>` chứa `[Tuần N]` đến trước `<w:p>` của tuần kế tiếp hoặc `<w:sectPr>`). Tuyệt đối không chèn lặp tuần.
>    - **Nếu CHƯA TỒN TẠI:** Chèn **1 LẦN DUY NHẤT** lên đầu tài liệu ngay trước tuần cũ đầu tiên (Prepend).
> 2. **Cấm chèn tuần giả lập (No Phantom Weeks):** Tuyệt đối không tự ý chèn các tuần quá khứ (như Tuần 7, Tuần 8) vào cuối tài liệu. Chỉ xử lý tuần được người dùng yêu cầu.

---

## 2. Quy Chuẩn Bảng Biểu & Định Dạng (Exact Google Docs Styling)

Mọi báo cáo tuần phải tuân thủ 100% định dạng từ Google Docs Template gốc:

### 2.1. Bảng Recover & Master plan (4 cột chuẩn)
- Bảng bắt buộc gồm **4 cột**:
  1. `#` (STT): Chiều rộng `800` dxa, in đậm `#475569`, canh giữa.
  2. `Plan`: Chiều rộng `4300` dxa, chữ thường `#0f172a`, canh trái.
  3. `Status`: Chiều rộng `1400` dxa, **IN ĐẬM MÀU XANH LÁ `#15803d` "Done"**, canh giữa.
  4. `Actual`: Chiều rộng `7458` dxa, chữ thường `#0f172a`, canh trái.
- Tổng chiều rộng bảng: `13958.0` dxa.
- Hàng tiêu đề (Header): Nền xanh `#1e3a8a`, chữ trắng `#ffffff` in đậm.
- Dòng chẵn: Nền xám nhạt dịu mắt `#f8fafc` (Zebra shading).
- Đường viền: `#cbd5e1` mảnh 0.5pt.

### 2.2. Mục Deliverables / Shipables this week
- Phía dưới dòng chữ `Code chạy được:`, **BẮT BUỘC** sinh **Bảng 1 cột duy nhất** (Chiều rộng `13958.0` dxa, viền `#cbd5e1`).
- Mỗi chức năng/sản phẩm chạy được nằm trên một hàng riêng biệt, xen kẽ màu nền zebra.
- Tuyệt đối không gộp chung thành một đoạn văn bản dài liền dòng.

### 2.3. Bảng Issue (6 cột chuẩn)
- Bảng gồm **6 cột**:
  `Issue` (2512 dxa) | `Chi tiết` (3070 dxa) | `Impact` (2512 dxa) | `Action` (3070 dxa) | `Commit deadline` (1396 dxa) | `Note` (1396 dxa).
- Header: Nền `#1e3a8a`, chữ trắng `#ffffff`, font 8.5pt (sz=17).

---

## 3. Công Cụ & Quy Trình Thực Thi

- **Python Sync Script (Khuyên dùng):** `python3 scripts/weekly_report_sync.py [--dry-run | --sync] [--discord]`
  - Hỗ trợ quét git commits 7 ngày gần nhất.
  - Tự động in-place update chống sinh trùng lặp.
  - Xuất bản Word chuẩn sang `docs/` và `~/Downloads/`.
  - Hỗ trợ đẩy nhị phân trực tiếp lên Google Docs Cloud qua Service Account.
- **Node.js Engine:** `node /Users/tranhongphuoc/skills/sep490-weekly-report/scripts/run.js`
  - Đã tích hợp cơ chế In-place Update và bảng 4 cột.

