#!/usr/bin/env bash
# ==============================================================================
# Script chuyển MongoDB Cloud Atlas sang MongoDB VPS bằng mongodump / mongorestore
# Yêu cầu cung cấp biến môi trường SOURCE_URI và TARGET_URI hoặc qua đối số dòng lệnh.
# ==============================================================================
set -e

SOURCE_URI="${SOURCE_URI:-$1}"
TARGET_URI="${TARGET_URI:-$2}"
BACKUP_DIR="/tmp/mongo_cloud_backup"

if [ -z "$SOURCE_URI" ]; then
  echo "❌ Lỗi bảo mật: Biến môi trường SOURCE_URI (hoặc đối số 1) không được để trống!"
  echo "Ví dụ sử dụng: SOURCE_URI='...' TARGET_URI='...' ./migrate-cloud-to-vps.sh"
  exit 1
fi

if [ -z "$TARGET_URI" ]; then
  echo "❌ Lỗi bảo mật: Biến môi trường TARGET_URI (hoặc đối số 2) không được để trống!"
  echo "Ví dụ sử dụng: SOURCE_URI='...' TARGET_URI='...' ./migrate-cloud-to-vps.sh"
  exit 1
fi

echo "=========================================================="
echo "🚀 BẮT ĐẦU DUMP & RESTORE MONGODB TỪ CLOUD SANG VPS"
echo "=========================================================="

# 1. Tạo thư mục tạm
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 2. Dump từ MongoDB Atlas
echo "⬇️ Đang tải toàn bộ dữ liệu từ MongoDB Atlas Cloud..."
mongodump --uri="$SOURCE_URI" --out="$BACKUP_DIR"

# 3. Restore vào MongoDB VPS
echo "⬆️ Đang khôi phục dữ liệu vào MongoDB VPS..."
mongorestore --uri="$TARGET_URI" --drop "$BACKUP_DIR/WDP201" --nsInclude="WDP201.*"

echo "=========================================================="
echo "✅ DI DỜI DỮ LIỆU THÀNH CÔNG!"
echo "=========================================================="
