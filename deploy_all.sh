#!/bin/bash
set -e

# ==============================================================================
# Script khởi chạy và triển khai toàn bộ dịch vụ WDP301 qua Docker Compose
# Thay thế hoàn toàn Railway CLI trước đây để đồng bộ với môi trường VPS Docker Compose
# ==============================================================================

echo "🚀 [Deploy All] Bắt đầu quy trình triển khai toàn bộ dịch vụ WDP301..."

# 1. Kiểm tra Docker daemon đang hoạt động
if ! docker info > /dev/null 2>&1; then
  echo "❌ Lỗi: Docker daemon chưa được khởi động. Vui lòng kiểm tra và bật Docker service."
  exit 1
fi

# 2. Xác định file cấu hình Docker Compose phù hợp
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "⚠️ Không tìm thấy $COMPOSE_FILE tại thư mục gốc, chuyển sang dùng docker-compose.yml"
  COMPOSE_FILE="docker-compose.yml"
fi

# 3. Build và khởi chạy tất cả containers ngầm (-d)
echo "📦 Đang build và khởi chạy các containers (API Gateway, Microservices, AI Service, Frontend, Nginx)..."
docker compose -f "$COMPOSE_FILE" up -d --build

# 4. Hiển thị thông tin trạng thái hoàn tất
echo "=============================================================================="
echo "✅ Tất cả các dịch vụ đã được khởi chạy thành công qua Docker Compose!"
echo "👉 Kiểm tra danh sách containers: docker compose -f $COMPOSE_FILE ps"
echo "👉 Theo dõi logs thời gian thực:  docker compose -f $COMPOSE_FILE logs -f (hoặc: npm run prod:logs)"
echo "👉 Dừng toàn bộ hệ thống:         docker compose -f $COMPOSE_FILE down   (hoặc: npm run prod:down)"
echo "=============================================================================="
