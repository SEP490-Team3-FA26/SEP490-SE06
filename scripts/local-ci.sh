#!/usr/bin/env bash
# ==============================================================================
# Script Kiểm Tra Chất Lượng Mã Nguồn Toàn Diện (Full Test Quality Gate)
# Chuyên biệt chạy TOÀN BỘ Test Cases: backend/test & frontend/tests
# TUYỆT ĐỐI KHÔNG BUILD (Zero-Build) - Tuân thủ Playbook v2.0 & Test-Coupled Mandate
# Dự án: Chuỗi Nhà Thuốc PharmaChain - WDP301 / SEP490
# ==============================================================================

set -eo pipefail

# Định nghĩa mã màu hiển thị trên terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # Không màu (No Color)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}🧪 BẮT ĐẦU CHẠY TOÀN BỘ TEST CASES (BACKEND/TEST & FRONTEND/TESTS)${NC}"
echo -e "${CYAN}====================================================================${NC}"

# ------------------------------------------------------------------------------
# Bước 1/3: Kiểm tra Quy tắc kiến trúc & Test Rules (Zero Mock, Kafka, Tiếng Việt, Test-Coupled)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [1/3] Đang kiểm tra Architecture & Playbook Test Rules Audit...${NC}"
if (cd "$ROOT_DIR/backend" && npm run test:rules); then
  echo -e "${GREEN}✅ [1/3] Kiểm tra Test Rules kiến trúc đạt chuẩn 100%!${NC}"
else
  echo -e "${RED}❌ [1/3] Vi phạm Test Rules kiến trúc! Vui lòng khắc phục theo thông báo ở trên.${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Bước 2/3: Chạy TOÀN BỘ bài kiểm thử Backend (backend/test)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [2/3] Đang chạy TOÀN BỘ Test Cases Backend (@backend/test)...${NC}"
if (cd "$ROOT_DIR/backend" && npm run test:ci); then
  echo -e "${GREEN}✅ [2/3] 100% Test Cases Backend (@backend/test) đều PASS!${NC}"
else
  echo -e "${RED}❌ [2/3] Có bài test Backend bị FAILED! Vui lòng kiểm tra và sửa lỗi trước khi push code.${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Bước 3/3: Chạy TOÀN BỘ bài kiểm thử Frontend (frontend/tests)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [3/3] Đang chạy TOÀN BỘ Test Cases Frontend (@frontend/tests)...${NC}"
if (cd "$ROOT_DIR/frontend" && npm test); then
  echo -e "${GREEN}✅ [3/3] 100% Test Cases Frontend (@frontend/tests) đều PASS!${NC}"
else
  echo -e "${RED}❌ [3/3] Có bài test Frontend bị FAILED! Vui lòng kiểm tra lại giao diện.${NC}"
  exit 1
fi

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${GREEN}🎉 XUẤT SẮC! TOÀN BỘ TEST CASES CẢ HAI PHÍA BACKEND & FRONTEND ĐỀU PASS 100%!${NC}"
echo -e "${GREEN}🚀 Mã nguồn an toàn tuyệt đối và sẵn sàng push lên GitHub!${NC}"
echo -e "${CYAN}====================================================================${NC}"
