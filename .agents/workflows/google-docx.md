---
description: "Đồng bộ, chuyển đổi và ghi đè trực tiếp tài liệu lên Google Docs Cloud qua Service Account hoặc xuất file .docx"
---

# Google Docx Workflow

Quy trình tự động hóa tài liệu Google Docs & Word:

1. Phân tích tài liệu Markdown (`.md`) hoặc cấu hình báo cáo cần cập nhật.
2. Định dạng chuẩn thẩm mỹ ấn phẩm (Phông Calibri, Header Navy, viền bảng mỏng, hộp Callout cảnh báo).
3. Chạy script đồng bộ trực tiếp lên Google Docs:
   ```bash
   python docs/direct_gdrive_sync.py
   ```
4. Nếu người dùng yêu cầu xuất file cục bộ:
   ```bash
   python .agents/skills/google-docx/scripts/md_to_docx.py docs/REPORT_5_TEST_ENVIRONMENT.md
   ```
5. Báo cáo kết quả đường link và trạng thái cập nhật cho người dùng.
