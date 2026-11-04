#!/usr/bin/env bash
# ==============================================================================
# Script Chạy Kiểm Tra CI/CD Ngay Tại Máy Cá Nhân (Local CI Quality Gate)
# Mục đích: Phát hiện bug, lỗi typecheck, vi phạm quy tắc kiến trúc trước khi push
# Dự án: WDP301 / SEP490
# ==============================================================================

set -eo pipefail

# Định nghĩa mã màu hiển thị trên terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # Không màu (No Color)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}🧪 BẮT ĐẦU CHẠY LOCAL CI QUALITY GATE TRƯỚC KHI PUSH CODE${NC}"
echo -e "${CYAN}====================================================================${NC}"

# Bước 1: Kiểm tra Typecheck và Build Backend (Fast-Fail)
echo -e "\n${BLUE}👉 [1/4] Đang kiểm tra Build Backend (NestJS Typecheck & Compile)...${NC}"
if (cd "$ROOT_DIR/backend" && npm run build); then
  echo -e "${GREEN}✅ [1/4] Backend build thành công!${NC}"
else
  echo -e "${RED}❌ [1/4] Backend build thất bại! Vui lòng sửa lỗi biên dịch trước khi push.${NC}"
  exit 1
fi

# Bước 2: Kiểm tra Quy tắc kiến trúc & Test Rules (Zero Mock, Kafka, Tiếng Việt, Test-Coupled)
echo -e "\n${BLUE}👉 [2/4] Đang kiểm tra Architecture & Playbook Test Rules Audit...${NC}"
if (cd "$ROOT_DIR/backend" && npm run test:rules); then
  echo -e "${GREEN}✅ [2/4] Kiểm tra Test Rules đạt chuẩn!${NC}"
else
  echo -e "${RED}❌ [2/4] Vi phạm Test Rules kiến trúc! Vui lòng khắc phục theo hướng dẫn trên.${NC}"
  exit 1
fi

# Nếu người dùng truyền cờ --quick hoặc -q thì bỏ qua chạy full test cases và frontend build
if [ "${1:-}" = "--quick" ] || [ "${1:-}" = "-q" ]; then
  echo -e "\n${YELLOW}⚡ Chế độ kiểm tra nhanh (--quick): Đã hoàn thành các bước thiết yếu!${NC}"
  echo -e "${GREEN}🎉 SẴN SÀNG COMMIT / PUSH CODE! 🚀${NC}"
  exit 0
fi

# Bước 3: Chạy toàn bộ Unit & Integration Test Cases
echo -e "\n${BLUE}👉 [3/4] Đang chạy toàn bộ Unit & Integration Test Suites (Jest TAP)...${NC}"
if (cd "$ROOT_DIR/backend" && npm run test:ci); then
  echo -e "${GREEN}✅ [3/4] 100% Test Cases đều PASS!${NC}"
else
  echo -e "${RED}❌ [3/4] Có bài test bị FAILED! Vui lòng sửa lỗi trước khi push code.${NC}"
  exit 1
fi

# Bước 4: Kiểm tra Build Frontend Web (Vite Bundle)
echo -e "\n${BLUE}👉 [4/4] Đang kiểm tra Build Frontend Web (Vite Production Bundle)...${NC}"
if (cd "$ROOT_DIR/frontend" && npm run build); then
  echo -e "${GREEN}✅ [4/4] Frontend bundle build thành công!${NC}"
else
  echo -e "${RED}❌ [4/4] Frontend build bị lỗi! Vui lòng kiểm tra lại giao diện.${NC}"
  exit 1
fi

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${GREEN}🎉 XUẤT SẮC! TẤT CẢ 4 BƯỚC KIỂM TRA ĐỀU ĐẠT CHUẨN 100%!${NC}"
echo -e "${GREEN}🚀 Code của anh đã an toàn tuyệt đối và sẵn sàng push lên GitHub!${NC}"
echo -e "${CYAN}====================================================================${NC}"

