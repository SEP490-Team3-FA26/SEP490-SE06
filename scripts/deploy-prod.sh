#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 [CI/CD] Bắt đầu tự động Deploy dự án WDP301..."
echo "=================================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# 0. Tự động cài đặt Docker & Docker Compose nếu VPS chưa có
if ! command -v docker > /dev/null 2>&1; then
  echo "🐳 Docker chưa cài đặt. Đang tiến hành cài đặt Docker Engine..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  systemctl enable docker
  systemctl start docker
fi

# 1. Kích hoạt Swap 4GB nếu chưa có (chống tràn RAM cho VPS 6GB chạy 11 containers)
CURRENT_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$CURRENT_SWAP" -eq 0 ]; then
  echo "💾 Đang thiết lập 4GB Swap an toàn cho VPS 6GB RAM..."
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile none swap' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2. Đảm bảo tường lửa UFW được thiết lập an toàn (Chỉ mở SSH, HTTP, HTTPS)
if command -v ufw > /dev/null 2>&1; then
  echo "🛡️ Cấu hình tường lửa UFW: Chỉ mở SSH (24700), HTTP (80), HTTPS (443)..."
  ufw allow 24700/tcp > /dev/null 2>&1 || true
  ufw allow 80/tcp > /dev/null 2>&1 || true
  ufw allow 443/tcp > /dev/null 2>&1 || true

  # Thu hồi triệt để các cổng nội bộ nếu từng mở trước đây
  ufw delete allow 3000/tcp > /dev/null 2>&1 || true
  ufw delete allow 4000/tcp > /dev/null 2>&1 || true
  ufw delete allow 4005/tcp > /dev/null 2>&1 || true
  ufw delete allow 8000/tcp > /dev/null 2>&1 || true
  ufw delete allow 8888/tcp > /dev/null 2>&1 || true
  ufw delete allow 3001/tcp > /dev/null 2>&1 || true
fi

# 3. Đảm bảo chứng chỉ SSL cho Nginx (Cloudflare Full SSL)
if [ ! -f "$APP_DIR/ssl/cert.pem" ] || [ ! -f "$APP_DIR/ssl/key.pem" ]; then
  echo "🔒 Đang tạo chứng chỉ SSL cho Nginx..."
  mkdir -p "$APP_DIR/ssl"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$APP_DIR/ssl/key.pem" \
    -out "$APP_DIR/ssl/cert.pem" \
    -subj "/C=VN/ST=DN/L=DaNang/O=WDP301/OU=IT/CN=abcpharmacy.store" > /dev/null 2>&1
  chmod 600 "$APP_DIR/ssl/key.pem"
  chmod 644 "$APP_DIR/ssl/cert.pem"
fi

# 4. Đảm bảo file .env tồn tại
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo "⚙️ Chưa có backend/.env, tiến hành tạo từ .env.example..."
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
fi

# 4.1. Đảm bảo cấu hình xác thực Dozzle tồn tại (không lưu thông tin nhạy cảm vào Git)
if [ ! -f "$APP_DIR/gitops/monitoring/dozzle/users.yml" ]; then
  echo "🔒 Khởi tạo file cấu hình xác thực Dozzle (users.yml)..."
  mkdir -p "$APP_DIR/gitops/monitoring/dozzle"
  cp "$APP_DIR/gitops/monitoring/dozzle/users.yml.example" "$APP_DIR/gitops/monitoring/dozzle/users.yml"
  chmod 600 "$APP_DIR/gitops/monitoring/dozzle/users.yml"
fi

# 5. Build Production Docker Images
bash "$APP_DIR/scripts/build-prod-images.sh"

# 6. Khởi chạy toàn bộ hệ sinh thái Microservices
echo "🐳 Đang khởi động hệ thống qua Docker Compose..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 6.1. Tự động đồng bộ Firebase FCM key và reload Nginx (Triệt tiêu vĩnh viễn lỗi 502 Bad Gateway)
echo "🔄 Đồng bộ Firebase credentials và làm mới Nginx Reverse Proxy..."
if [ -f "$APP_DIR/backend/service-account-key.json" ]; then
  docker cp "$APP_DIR/backend/service-account-key.json" wdp301-gateway:/app/service-account-key.json || true
fi
docker compose -f docker-compose.prod.yml restart frontend || true

# 7. Giữ build cache để lần deploy sau không phải cài lại dependency AI.
echo "🧹 Dọn dẹp Docker images trung gian (giữ nguyên build cache)..."
docker image prune -f

echo "=================================================="
echo "🎉 DEPLOY THÀNH CÔNG RỰC RỠ TRÊN PRODUCTION!"
echo "👉 Website:      https://abcpharmacy.store"
echo "👉 Backend API:  https://abcpharmacy.store/api (bảo vệ qua Cloudflare + Nginx)"
echo "👉 Logs Dozzle:  https://abcpharmacy.store/dozzle (admin / admin)"
echo "👉 Grafana:      https://abcpharmacy.store/grafana (admin / admin)"
echo "=================================================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
