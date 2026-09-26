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

# 2. Đảm bảo tường lửa UFW mở cổng cần thiết
if command -v ufw > /dev/null 2>&1; then
  ufw allow 24700/tcp > /dev/null 2>&1 || true
  ufw allow 80/tcp > /dev/null 2>&1 || true
  ufw allow 443/tcp > /dev/null 2>&1 || true
  ufw allow 3000/tcp > /dev/null 2>&1 || true
  ufw allow 4000/tcp > /dev/null 2>&1 || true
  ufw allow 8888/tcp > /dev/null 2>&1 || true
  ufw allow 3001/tcp > /dev/null 2>&1 || true
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

# 5. Build Production Docker Images
echo "🏗️ 1/3 Đang Build Docker Image Backend Microservices..."
docker build -t wdp301-backend:latest ./backend -f ./backend/docker/backend.Dockerfile

echo "🏗️ 2/3 Đang Build Docker Image Frontend Web..."
docker build -t wdp301-frontend:latest . -f ./backend/docker/frontend.Dockerfile

echo "🏗️ 3/3 Đang Build Docker Image AI Service..."
docker build -t wdp301-ai:latest ./backend/apps/ai-service -f ./backend/apps/ai-service/Dockerfile

# 6. Khởi chạy toàn bộ hệ sinh thái Microservices
echo "🐳 Đang khởi động hệ thống qua Docker Compose..."
docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans

# 7. Dọn dẹp Docker images rác
echo "🧹 Dọn dẹp Docker images trung gian..."
docker image prune -f

echo "=================================================="
echo "🎉 DEPLOY THÀNH CÔNG RỰC RỠ TRÊN PRODUCTION!"
echo "👉 Website:      https://abcpharmacy.store"
echo "👉 Backend API:  https://abcpharmacy.store/api (hoặc cổng 4000)"
echo "=================================================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
