---
name: google-docx
description: >-
  Chuyển đổi, tạo mới và ghi đè trực tiếp tài liệu từ định dạng Markdown (.md) sang Microsoft Word / Google Docs (.docx).
  Tự động định dạng chuẩn ấn phẩm báo cáo: phông chữ chuyên nghiệp (Calibri/Arial), căn lề 1 inch tiêu chuẩn,
  tiêu đề phân cấp màu xanh thương hiệu, bảng biểu có header màu sắc viền mỏng, hộp cảnh báo (Callout alerts),
  và khối mã nguồn Monospace. Tích hợp sẵn cơ chế ghi đè an toàn (Direct Document Overwrite).
---

# Google Docx & Word Automation Skill (`google-docx`)

Kỹ năng này cung cấp giải pháp toàn diện cho việc tự động hóa tạo lập, chuyển đổi và **ghi đè trực tiếp** các tài liệu báo cáo, đặc tả kỹ thuật, tài liệu kiểm thử từ Markdown sang định dạng **Microsoft Word & Google Docs (`.docx`)**.

---

## 1. Mục Đích & Phạm Vi Áp Dụng (When to Use)

Kích hoạt kỹ năng này khi:
1. Người dùng gõ lệnh `/google-docx` trong thanh chat.
2. Người dùng yêu cầu xuất tài liệu báo cáo (Report 1, 2, 3, 4, 5, SRS, Architecture Guide) ra file Word / Google Docs.
3. Người dùng yêu cầu **ghi đè trực tiếp** vào file `.docx` hiện có mà không sinh ra các file thừa thãi.
4. Cần chuẩn hóa tài liệu theo chuẩn đồ án đại học (FPT Capstone, Luận văn tốt nghiệp) hoặc báo cáo doanh nghiệp.

---

## 2. Quy Chuẩn Định Dạng Văn Bản (Style Guide)

Tài liệu `.docx` sinh ra tương thích 100% với cả **Microsoft Office Word (2016-2024 / Office 365)** và **Google Docs / Google Drive**, tuân thủ nghiêm ngặt các quy tắc thẩm mỹ:

| Thành phần văn bản | Quy chuẩn định dạng | Giá trị kỹ thuật (OpenXML / python-docx) |
| :--- | :--- | :--- |
| **Kích thước trang** | Chuẩn A4 quốc tế | Width: 8.27 inches, Height: 11.69 inches |
| **Căn lề trang (Margins)** | 1.0 inch (2.54 cm) cả 4 phía | Top/Bottom/Left/Right = `Inches(1.0)` |
| **Phông chữ mặc định** | Calibri (hoặc Times New Roman) | Size: `11pt`, Màu chữ: Charcoal Dark `#212529` |
| **Khoảng cách dòng** | 1.15x Line Spacing | `line_spacing = 1.15`, `space_after = 5-6pt` |
| **Tiêu đề H1 (Heading 1)** | In đậm, Size 20pt, Deep Navy | Màu `#1E3A8A`, `space_before = 12pt` |
| **Tiêu đề H2 (Heading 2)** | In đậm, Size 15pt, Deep Navy | Màu `#1E3A8A`, `space_before = 12pt` |
| **Tiêu đề H3 (Heading 3)** | In đậm, Size 13pt, Slate Dark | Màu `#334155`, `space_before = 8pt` |
| **Bảng biểu (Tables)** | Căn giữa, Header nền xanh chữ trắng | Header: `#1E3A8A` + White text, Viền mỏng `#CBD5E1`, so le màu hàng |
| **Hộp ghi chú (Callouts)**| Khung nền pastel có viền trái nổi bật | Blue (`#3B82F6`) cho Note, Red (`#EF4444`) cho Warning, Green (`#10B981`) cho Tip |
| **Khối code (Code Blocks)**| Monospace Consolas, nền xám nhạt | Font: `Consolas 9.5pt`, Nền `#F8F9FA`, viền trái vi tính |

---

## 3. Quy Trình Chuyển Đổi & Ghi Đè (Step-by-Step Execution)

### Bước 1: Xác định file Markdown đầu vào và file `.docx` đích
* Nếu người dùng chỉ định đường dẫn:
  * Input: `docs/<ten_file>.md`
  * Output: `docs/<ten_file>.docx` (hoặc đường dẫn do người dùng chỉ định).
* Mặc định kỹ năng sẽ **ghi đè trực tiếp (Overwrite)** lên file `.docx` nếu file đã tồn tại nhằm đảm bảo tính nhất quán của tài liệu.

### Bước 2: Chạy script chuyển đổi tự động
Chạy công cụ chuyển đổi tích hợp sẵn tại `.agents/skills/google-docx/scripts/md_to_docx.py`:

```bash
# Cú pháp chuyển đổi cơ bản:
python .agents/skills/google-docx/scripts/md_to_docx.py <đường_dẫn_file.md> [đường_dẫn_file_đích.docx]

# Ví dụ thực tế:
python .agents/skills/google-docx/scripts/md_to_docx.py docs/REPORT_5_TEST_ENVIRONMENT.md docs/REPORT_5_TEST_ENVIRONMENT.docx
```

### Bước 3: Đồng bộ & Ghi đè trực tiếp lên Google Docs Cloud (Không cần mở Google Drive)
Nếu có liên kết Google Docs và đã chia sẻ quyền Editor cho Service Account (`sep490@stone-climate-507417-k4.iam.gserviceaccount.com`), chạy script đồng bộ trực tiếp:

```bash
# Ghi đè trực tiếp lên file Google Docs trên mây:
python docs/direct_gdrive_sync.py
```
* **Kết quả:** File trên link Google Docs sẽ được cập nhật nội dung mới 100% mà **đường dẫn URL không bao giờ bị thay đổi**.

---

## 4. Hướng Dẫn Sử Dụng Trên Google Docs (Upload & Sync Guide)

Để đưa file `.docx` này lên Google Docs mà không bị mất định dạng bảng và màu sắc:
1. Truy cập **Google Drive** (`drive.google.com`).
2. Kéo thả file `.docx` vừa tạo vào thư mục báo cáo trên Drive.
3. Nhấp đúp chuột vào file -> Chọn **"Mở bằng Google Tài liệu" (Open with Google Docs)**.
4. *Mẹo:* Google Docs hiện nay hỗ trợ chỉnh sửa định dạng DOCX gốc mà không cần chuyển đổi sang định dạng gdoc, bảo toàn 100% màu sắc bảng, viền ô, font chữ và callout.

---

## 5. Góc Ôn Luyện Phỏng Vấn: Document Automation & OpenXML Architecture

| Câu hỏi phỏng vấn | Bản chất kỹ thuật & Câu trả lời ghi điểm |
| :--- | :--- |
| **Định dạng `.docx` bản chất là gì? Khác gì so với file `.doc` cũ?** | File `.docx` tuân theo chuẩn mở **Office Open XML (OOXML)** do Microsoft và ECMA tiêu chuẩn hóa. Về bản chất, file `.docx` là một file nén **ZIP** chứa một cây cấu trúc các file **XML** (`word/document.xml`, `word/styles.xml`, `[Content_Types].xml`). Ngược lại, định dạng `.doc` cũ là định dạng nhị phân độc quyền (Binary Format) rất khó phân tích và thao tác bằng mã nguồn. |
| **Tại sao dùng `python-docx` kết hợp thao tác trực tiếp với XML (`parse_xml`) thay vì chỉ dùng các hàm cơ bản?** | Thư viện `python-docx` cung cấp các API cấp cao cho văn bản, nhưng bị hạn chế về các thuộc tính giao diện nâng cao như: đổ màu nền ô bảng (`w:shd`), căn lề đệm bên trong ô (`w:tcMar`), viền đơn sắc (`w:tblBorders`) và đường kẻ ngang đoạn văn (`w:pBdr`). Bằng cách can thiệp trực tiếp vào thuộc tính XML tầng dưới thông qua `parse_xml(f'<w:...>')`, ta có thể tạo ra các thành phần giao diện hiện đại như Callout alert box và bảng màu chuẩn thương hiệu tương đương Google Docs. |
| **Sự khác biệt giữa việc render HTML rồi convert sang Word so với Direct AST Parsing từ Markdown?** | Render qua HTML trung gian (như qua trình duyệt hoặc Pandoc HTML) phụ thuộc nhiều vào CSS engine của từng trình chuyển đổi, dễ gây vỡ layout bảng biểu khi mở trên Word/Google Docs. Việc duyệt trực tiếp cây cú pháp hoặc xử lý tuần tự (Token-based Parsing) từ Markdown sang OpenXML Node đảm bảo văn bản luôn tuân thủ đúng chuẩn Style Sheet của Word, tốc độ thực thi siêu tốc (chỉ mất ~0.5s) và không phụ thuộc phần mềm bên ngoài. |
