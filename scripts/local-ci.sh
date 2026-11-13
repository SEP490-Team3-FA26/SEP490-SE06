#!/usr/bin/env bash
# ==============================================================================
# Script Kiểm Tra Chất Lượng Mã Nguồn Toàn Diện (Full CI Quality Gate)
# Tự động kích hoạt trước khi Git Push và trong quy trình CI/CD
# Kiểm tra: Test Rules Kiến Trúc + Backend Build & Test + Frontend Build & Test + Mobile Test
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
BOLD='\033[1m'
NC='\033[0m' # Không màu (No Color)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}${BOLD}🛡️  FULL CI QUALITY GATE: KIỂM TRA CHẤT LƯỢNG MÃ NGUỒN TRƯỚC KHI PUSH${NC}"
echo -e "${CYAN}====================================================================${NC}"

# ------------------------------------------------------------------------------
# Bước 1/5: Kiểm tra Quy tắc kiến trúc & Test Rules (Zero Mock, Kafka, Tiếng Việt, Test-Coupled)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [1/5] Đang kiểm tra Architecture & Playbook Test Rules Audit...${NC}"
if (cd "$ROOT_DIR/backend" && npm run test:rules); then
  echo -e "${GREEN}✅ [1/5] Kiểm tra Test Rules kiến trúc đạt chuẩn 100%!${NC}"
else
  echo -e "${RED}❌ [1/5] VI PHẠM TEST RULES KIẾN TRÚC! Lệnh push bị chặn đứng.${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Bước 2/5: Backend Quality Gate (Typecheck/Build + Full Test Suites)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [2/5] Đang kiểm tra Backend (Build Compilation & Test Suites)...${NC}"
echo -e "   🔹 Đang kiểm tra compile TypeScript & NestJS build..."
if (cd "$ROOT_DIR/backend" && npm run build > /dev/null); then
  echo -e "   ${GREEN}✔ Build Backend thành công (Zero TypeScript Error)!${NC}"
else
  echo -e "${RED}❌ [2/5] BACKEND BUILD THẤT BẠI! Phát hiện lỗi cú pháp hoặc kiểu TypeScript.${NC}"
  echo -e "💡 Chạy thử: cd backend && npm run build để xem chi tiết lỗi."
  exit 1
fi

echo -e "   🔹 Đang chạy TOÀN BỘ Test Cases Backend (@backend/test)..."
if (cd "$ROOT_DIR/backend" && npm run test:ci); then
  echo -e "${GREEN}✅ [2/5] 100% Backend Build & Test Cases đều ĐẠT CHUẨN!${NC}"
else
  echo -e "${RED}❌ [2/5] CÓ BÀI TEST BACKEND BỊ FAILED! Vui lòng sửa lỗi trước khi push code.${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Bước 3/5: Frontend Web Quality Gate (Unit Tests + Vite Production Build)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [3/5] Đang kiểm tra Frontend Web (Unit Tests & Vite Build)...${NC}"
echo -e "   🔹 Đang chạy Unit Tests Frontend..."
if (cd "$ROOT_DIR/frontend" && npm test > /dev/null); then
  echo -e "   ${GREEN}✔ 100% Frontend Unit Tests đều PASS!${NC}"
else
  echo -e "${RED}❌ [3/5] FRONTEND TEST THẤT BẠI! Vui lòng kiểm tra lại logic frontend.${NC}"
  exit 1
fi

echo -e "   🔹 Đang kiểm tra Vite Production Build..."
if (cd "$ROOT_DIR/frontend" && npm run build > /dev/null); then
  echo -e "${GREEN}✅ [3/5] 100% Frontend Tests & Vite Build đều ĐẠT CHUẨN!${NC}"
else
  echo -e "${RED}❌ [3/5] FRONTEND BUILD THẤT BẠI! Phát hiện lỗi cú pháp hoặc bundle React.${NC}"
  echo -e "💡 Chạy thử: cd frontend && npm run build để xem chi tiết lỗi."
  exit 1
fi

# ------------------------------------------------------------------------------
# Bước 4/5: Mobile Expo Quality Gate (Jest Test Suites)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [4/5] Đang chạy TOÀN BỘ Test Cases Mobile Expo (@mobile/test)...${NC}"
if (cd "$ROOT_DIR/mobile" && npm test -- --silent > /dev/null); then
  echo -e "${GREEN}✅ [4/4] 100% Test Cases Mobile (@mobile/test) đều PASS!${NC}"
else
  echo -e "${RED}❌ [4/5] CÓ BÀI TEST MOBILE BỊ FAILED! Vui lòng kiểm tra và sửa lỗi trước khi push.${NC}"
  echo -e "💡 Chạy thử: cd mobile && npm test để xem chi tiết bài test bị fail."
  exit 1
fi

# ------------------------------------------------------------------------------
# Bước 5/5: Kiểm tra tính an toàn của Git Working Tree (Untracked Tests Check)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}👉 [5/5] Đang kiểm tra Working Tree & Bài test kẹp kèm...${NC}"
UNTRACKED_TESTS=$(git status --porcelain | grep -E '^\?\?.*(\.spec\.ts|\.test\.ts)' || true)
if [ -n "$UNTRACKED_TESTS" ]; then
  echo -e "${YELLOW}⚠️  [CẢNH BÁO] Phát hiện bài test mới chưa được đưa vào Git (Untracked):${NC}"
  echo -e "$UNTRACKED_TESTS"
  echo -e "${YELLOW}👉 Hãy đảm bảo bạn đã 'git add' các file test này để không vi phạm quy tắc Test-Coupled Mandate trên CI!${NC}"
fi
echo -e "${GREEN}✅ [5/5] Kiểm tra Working Tree hoàn tất!${NC}"

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 XUẤT SẮC! TOÀN BỘ CHỐT CHẶN (BACKEND, FRONTEND, MOBILE) ĐỀU ĐẠT 100%!${NC}"
echo -e "${GREEN}🚀 Mã nguồn an toàn tuyệt đối, hệ thống sẵn sàng đẩy lên GitHub!${NC}"
echo -e "${CYAN}====================================================================${NC}"
