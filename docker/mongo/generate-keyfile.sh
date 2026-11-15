#!/usr/bin/env bash
# ==============================================================================
# Script sinh KeyFile bí mật cho MongoDB Replica Set với phân quyền chmod 400
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
KEYFILE_PATH="${DIR}/keyfile"

if [ -f "$KEYFILE_PATH" ]; then
  echo "ℹ️ [KeyFile] File bí mật đã tồn tại tại: $KEYFILE_PATH"
else
  echo "🔄 [KeyFile] Đang tạo file keyfile ngẫu nhiên an toàn (756 bytes)..."
  openssl rand -base64 756 > "$KEYFILE_PATH"
  chmod 400 "$KEYFILE_PATH"
  echo "✅ [KeyFile] Đã tạo keyfile thành công và phân quyền chmod 400 an toàn!"
fi

