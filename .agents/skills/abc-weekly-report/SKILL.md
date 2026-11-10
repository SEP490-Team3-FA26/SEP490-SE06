---
name: abc-weekly-report
description: Tự động tạo báo cáo tuần, trích xuất Git commits, chèn lên đầu Google Docs (Prepend) hoặc cập nhật tại chỗ (In-place Update chống trùng lặp), và đồng bộ trực tiếp lên Cloud. Kích hoạt khi gõ /abc-weekly-report hoặc yêu cầu tạo báo cáo tuần và biên bản họp.
---

# Weekly Report & Meeting Notes Workflow (`/abc-weekly-report`)

Quy trình tự động hóa lập báo cáo tuần (**Weekly Report**) và biên bản họp (**Meeting Notes**) theo đúng chuẩn **Template Google Docs gốc** của dự án:
🔗 [Google Docs Template Gốc](https://docs.google.com/document/d/1IYDTQcmeC5aDakFyNy750XizY4rkd5qG/edit?rtpof=true#heading=h.1ifhkkulwvz8) (File ID: `1IYDTQcmeC5aDakFyNy750XizY4rkd5qG`)

---

## 🎨 1. Quy Chuẩn Bảng Biểu & Định Dạng Bắt Buộc (Exact Template Specs)

Mọi báo cáo tuần xuất ra phải tuân thủ nghiêm ngặt các quy cách sau:

| Thành phần | Quy cách chuẩn | Chi tiết kỹ thuật |
| :--- | :--- | :--- |
| **Bảng Recover & Master plan** | **4 cột bắt buộc** | `#` (800 dxa, canh giữa) \| `Plan` (4300 dxa) \| `Status` (1400 dxa, canh giữa, bold xanh lá `#15803d` "Done") \| `Actual` (7458 dxa). |
| **Deliverables Code chạy được** | **Bảng 1 cột duy nhất** | Bảng đơn rộng 13958 dxa, viền `#cbd5e1`, mỗi chức năng/sản phẩm code chạy được nằm trên 1 hàng riêng, xen kẽ zebra `#f8fafc`. |
| **Bảng Issue** | **6 cột bắt buộc** | `Issue` (2512 dxa) \| `Chi tiết` (3070 dxa) \| `Impact` (2512 dxa) \| `Action` (3070 dxa) \| `Commit deadline` (1396 dxa) \| `Note` (1396 dxa). |
| **Header Bảng (Header row)** | Nền `#1e3a8a` | Chữ trắng `#ffffff`, Bold, Canh giữa / Trái theo cột. |
| **Đường viền Bảng (Borders)** | `#cbd5e1` | Viền đơn mảnh (0.5pt, sz=4) bao quanh và giữa các ô. |

---

## 🛡️ 2. Quy Tắc Bất Biến Chống Trùng Lặp Báo Cáo (Anti-duplicate Idempotency)

> [!CAUTION]
> **Tuyệt đối không để xảy ra lỗi nhân bản trùng lặp tuần (Zero Duplicate Report):**
> 1. **Kiểm tra sự tồn tại của tuần trước khi ghi (Check before inject):**
>    - Khi tạo/cập nhật `[Tuần N]`, script quét toàn bộ tài liệu để tìm kiếm tiêu đề `[Tuần N]`.
>    - **Nếu tuần đã tồn tại:** Thực hiện **GHI ĐÈ CẬP NHẬT TẠI CHỖ (In-place Replace)** bằng cách thay thế toàn bộ khối XML từ `<w:p>` của `[Tuần N]` đến trước `<w:p>` của tuần kế tiếp (hoặc `<w:sectPr>`). **Tuyệt đối không chèn thêm khối mới**.
>    - **Nếu là tuần mới:** Chèn **1 LẦN DUY NHẤT** ngay phía trước tuần cũ đầu tiên (Prepend).
> 2. **Cấm hardcode tự động chèn tuần giả lập (No Phantom Weeks):** Tuyệt đối không tự ý chèn các tuần cũ (như Tuần 7, Tuần 8) vào đuôi tài liệu. Chỉ xử lý đúng tuần được yêu cầu.

---

## 🚀 3. Các Bước Thực Hiện (Execution Steps)

Khi người dùng gõ lệnh `/abc-weekly-report`, Agent sẽ thực hiện các bước sau:

1. **Thu thập dữ liệu tuần**:
   - Quét `git log` trong 7 ngày gần nhất để lấy danh sách commit tính năng (`feat`), sửa lỗi (`fix`), và Pull Requests đã merge.
   - Hoặc đọc dữ liệu từ kênh Discord `#daily-stand-up`.
   - Xác định ngày bắt đầu (`start_date`) và ngày kết thúc (`end_date`) của tuần báo cáo.

2. **Khởi tạo nội dung báo cáo tuần**:
   - `[Tuần N] YYYY-MM-DD ~ YYYY-MM-DD`
   - `Project Report -> Overview`:
     - Bảng `Recover` (4 cột: `#`, `Plan`, `Status`, `Actual`).
     - Bảng `Master plan` (4 cột: `#`, `Plan`, `Status`, `Actual`).
   - `Deliverables / Shipables this week`:
     - `Code chạy được:` Bảng 1 cột đơn, mỗi dòng là một tính năng đã hoàn thiện.
     - `Tài liệu:` Danh sách tài liệu đã xuất bản.
   - `Issue`: Bảng 6 cột (Issue, Chi tiết, Impact, Action, Commit deadline, Note).
   - `Plan next week`: Bảng `Recover` & `Master plan` tuần tới.
   - `Meeting notes`: `KEY NOTES`, `TODO`, `Thời gian, địa điểm, thành phần tham dự`.

3. **Ghi đè In-place hoặc Prepend vào tài liệu**:
   - Cập nhật trực tiếp vào file Word `docs/Template-Weekly-report-and-weekly-meeting-notes.docx` theo cơ chế chống trùng lặp.
   - Tự động sao lưu một bản sang `~/Downloads/`.

4. **Đồng bộ trực tiếp lên Google Docs Cloud**:
   - Tự động chạy script đồng bộ qua Google Drive API:
     ```bash
     python3 scripts/weekly_report_sync.py --sync --discord
     ```
   - Ghi đè trực tiếp nhị phân (Binary PATCH) lên file trên Google Docs mà không làm đổi link URL.

5. **Xuất Discord Meeting Notes**:
   - Tạo đoạn trích xuất ngắn gọn để người dùng copy-paste ngay lên Discord/Slack của team.

---

## 💻 4. Các Tùy Chọn Lệnh (CLI Options)

```bash
# 1. Chạy mặc định cho tuần hiện tại và đồng bộ lên Google Docs:
python3 scripts/weekly_report_sync.py --sync --discord

# 2. Chỉ tạo file Word cục bộ để kiểm tra trước (Dry-run):
python3 scripts/weekly_report_sync.py --dry-run --discord

# 3. Chỉ định rõ tiêu đề tuần và ngày:
python3 scripts/weekly_report_sync.py --week-title "[Tuần 9] 2026-11-02 ~ 2026-11-08" --start-date 2026-11-02 --end-date 2026-11-08 --dry-run --discord

# 4. Chạy qua Node.js engine:
node /Users/tranhongphuoc/skills/sep490-weekly-report/scripts/run.js
```
