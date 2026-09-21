---
description: "Tự động tạo báo cáo tuần, trích xuất Git commits, chèn lên đầu Google Docs (Prepend) và đồng bộ trực tiếp lên Cloud"
---

# Weekly Report & Meeting Notes Workflow (`/abc-weekly-report`)

Quy trình tự động hóa lập báo cáo tuần và biên bản họp theo đúng **Template gốc**:
🔗 [Google Docs Template Gốc](https://docs.google.com/document/d/1IYDTQcmeC5aDakFyNy750XizY4rkd5qG/edit?rtpof=true#heading=h.1ifhkkulwvz8) (File ID: `1IYDTQcmeC5aDakFyNy750XizY4rkd5qG`)

---

## 1. Các Bước Thực Hiện (Execution Steps)

Khi người dùng gõ lệnh `/abc-weekly-report`, Agent sẽ thực hiện các bước sau:

1. **Thu thập dữ liệu tuần**:
   - Tự động quét `git log` trong 7 ngày gần nhất để lấy danh sách commit tính năng (`feat`), sửa lỗi (`fix`), và Pull Requests đã merge.
   - Xác định ngày bắt đầu (`start_date`) và ngày kết thúc (`end_date`) của tuần báo cáo.

2. **Khởi tạo nội dung báo cáo tuần**:
   - Tuân thủ nghiêm ngặt cấu trúc của Template gốc:
     - **Project Report**:
       - `Overview`: Bảng `Recover` (đầu việc nợ) và Bảng `Master plan` (tiến độ tuần qua).
       - `Deliverables / Shipables this week`: Code chạy được + Tài liệu.
       - `Issue`: Bảng 6 cột (Issue, Chi tiết, Impact, Action, Commit deadline, Note).
       - `Plan next week`: Bảng `Recover` & `Master plan` tuần tới.
     - **Meeting notes**:
       - `KEY NOTES`: Các điểm đã thống nhất.
       - `TODO`: Đầu việc, người phụ trách (@assignee), Deadline.
       - `Thời gian, địa điểm, thành phần tham dự`.

3. **Chèn lên đầu tài liệu (Prepend)**:
   - Áp dụng nguyên tắc của template: *"Mỗi tuần thêm 1 cục vào phía trên, để tiện follow"*.
   - Khối tuần mới sẽ được chèn ngay trước tuần cũ trong file Word `docs/Template-Weekly-report-and-weekly-meeting-notes.docx`.

4. **Đồng bộ trực tiếp lên Google Docs Cloud**:
   - Tự động chạy script đồng bộ qua Google Drive API:
     ```bash
     python scripts/weekly_report_sync.py --sync --discord
     ```
   - Ghi đè trực tiếp nhị phân (Binary PATCH) lên file trên Google Docs mà không làm đổi link URL.

5. **Xuất Discord Meeting Notes**:
   - Tạo đoạn trích xuất ngắn gọn để người dùng copy-paste ngay lên Discord/Slack của team.

---

## 2. Các Tùy Chọn Lệnh (CLI Options)

Người dùng hoặc Agent có thể tùy chỉnh tham số khi chạy:

```bash
# 1. Chạy mặc định cho tuần hiện tại và đồng bộ lên Google Docs:
python scripts/weekly_report_sync.py --sync --discord

# 2. Chỉ tạo file Word cục bộ để kiểm tra trước (Dry-run):
python scripts/weekly_report_sync.py --dry-run --discord

# 3. Chỉ định rõ tiêu đề tuần và ngày:
python scripts/weekly_report_sync.py --week-title "[Tuần 5] 2026-09-14 ~ 2026-09-20" --start-date 2026-09-14 --end-date 2026-09-20 --sync --discord

# 4. Truyền dữ liệu chi tiết từ file JSON:
python scripts/weekly_report_sync.py --data-json docs/weekly_input.json --sync --discord
```
