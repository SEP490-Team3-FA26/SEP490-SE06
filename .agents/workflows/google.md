---
description: "Đồng bộ và ghi đè trực tiếp tài liệu lên Google Docs (Google Drive API)"
---

# Google Docs Direct Sync Workflow

1. Nạp khóa xác thực Service Account `sep490@stone-climate-507417-k4.iam.gserviceaccount.com`.
2. Ghi đè trực tiếp lên Google Docs Cloud qua Google Drive API:
   ```bash
   python docs/direct_gdrive_sync.py
   ```
3. Xác nhận link tài liệu đã được làm mới: `https://docs.google.com/document/d/1k0Ke_mOGq9Rp_1sDgM1LIlq_jgqQMAGA/edit`
