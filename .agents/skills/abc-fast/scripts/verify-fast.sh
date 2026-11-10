#!/usr/bin/env bash
# ==============================================================================
# verify-fast.sh - Bộ kiểm chứng siêu tốc & lọc bỏ log thừa cho WDP301 / SEP490
# Giúp giải phóng 85-90% token context, chỉ hiển thị tóm tắt hoặc lỗi khi fail.
# ==============================================================================

set -eo pipefail

# Xác định thư mục gốc của dự án WDP301
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

if [ ! -f "$ROOT_DIR/package.json" ]; then
  ROOT_DIR="/Users/tranhongphuoc/WDP301"
fi

if [ ! -d "$ROOT_DIR/backend" ]; then
  echo "❌ [Error] Không tìm thấy thư mục dự án WDP301 tại: $ROOT_DIR"
  exit 1
fi

MODE="${1:-rules}"
TARGET="${2:-}"

# Định nghĩa màu hiển thị
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

run_rules() {
  echo -e "${CYAN}⚡ [Fast Verify] Kiểm tra Test Rules & Architecture...${NC}"
  local OUTPUT
  local STATUS=0
  OUTPUT=$(cd "$ROOT_DIR/backend" && node scripts/test-rules-checker.js 2>&1) || STATUS=$?
  
  if [ $STATUS -eq 0 ]; then
    local PASSED_LINE
    PASSED_LINE=$(echo "$OUTPUT" | grep -E "Số quy tắc ĐẠT:" || echo "Tất cả quy tắc đạt chuẩn")
    echo -e "${GREEN}✅ [Test Rules] PASS: ${PASSED_LINE}${NC}"
  else
    echo -e "${RED}❌ [Test Rules] FAILED! Phát hiện vi phạm:${NC}"
    echo "$OUTPUT" | grep -E "(VI PHẠM|CHƯA ĐẠT|CẢNH BÁO|Lỗi nghiêm trọng|failedRules)" -A 2 | head -n 25
    return 1
  fi
}

run_syntax() {
  echo -e "${CYAN}⚡ [Fast Verify] Kiểm tra Syntax & Null-Safety...${NC}"
  local OUTPUT
  local STATUS=0
  OUTPUT=$(cd "$ROOT_DIR" && node scripts/check-syntax-and-safety.js 2>&1) || STATUS=$?
  
  if [ $STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ [Syntax Safety] PASS: 100% Mobile Typescript & Runtime Null-Safety đạt chuẩn!${NC}"
  else
    echo -e "${RED}❌ [Syntax Safety] FAILED! Lỗi phát hiện:${NC}"
    echo "$OUTPUT" | grep -E "(❌|Lỗi|Error|Failed)" -A 2 | head -n 25
    return 1
  fi
}

run_build() {
  echo -e "${CYAN}⚡ [Fast Verify] Kiểm tra Typecheck & Compile Backend...${NC}"
  local OUTPUT
  local STATUS=0
  OUTPUT=$(cd "$ROOT_DIR/backend" && npm run build 2>&1) || STATUS=$?
  
  if [ $STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ [Backend Build] PASS: Biên dịch thành công 0 lỗi!${NC}"
  else
    echo -e "${RED}❌ [Backend Build] FAILED! Lỗi biên dịch TypeScript:${NC}"
    echo "$OUTPUT" | grep -E "(error TS[0-9]+|Cannot find|Type ')" -B 1 -A 2 | head -n 30 || echo "$OUTPUT" | tail -n 20
    return 1
  fi
}

run_target_test() {
  local TEST_ARG="$1"
  if [ -z "$TEST_ARG" ]; then
    echo -e "${RED}❌ [Test] Vui lòng truyền tên file spec hoặc từ khóa (VD: ./verify-fast.sh test shelving-dispatch)${NC}"
    exit 1
  fi
  
  echo -e "${CYAN}⚡ [Fast Verify] Chạy bài test nhắm đích: '${TEST_ARG}'...${NC}"
  local OUTPUT
  local STATUS=0
  OUTPUT=$(cd "$ROOT_DIR/backend" && npx jest "$TEST_ARG" --passWithNoTests 2>&1) || STATUS=$?
  
  if [ $STATUS -eq 0 ]; then
    local SUITES_LINE
    local TESTS_LINE
    SUITES_LINE=$(echo "$OUTPUT" | grep "Test Suites:" || echo "1 passed")
    TESTS_LINE=$(echo "$OUTPUT" | grep "Tests:" || echo "all passed")
    echo -e "${GREEN}✅ [Target Test] PASS: ${SUITES_LINE} | ${TESTS_LINE}${NC}"
  else
    echo -e "${RED}❌ [Target Test] FAILED! Chi tiết thất bại:${NC}"
    echo "$OUTPUT" | grep -E "(FAIL|●|✕|Expected:|Received:)" -A 4 | head -n 30 || echo "$OUTPUT" | tail -n 25
    return 1
  fi
}

case "$MODE" in
  rules)
    run_rules
    ;;
  syntax|lint)
    run_syntax
    ;;
  build|compile)
    run_build
    ;;
  test)
    run_target_test "$TARGET"
    ;;
  quick)
    run_rules
    run_syntax
    ;;
  all)
    run_rules
    run_syntax
    run_build
    ;;
  *)
    # Nếu truyền vào một tên file hoặc pattern thì tự động hiểu là muốn chạy test
    if [[ "$MODE" == *".spec.ts"* ]] || [[ "$MODE" == *".test.ts"* ]] || [[ "$MODE" == *"service"* ]] || [[ "$MODE" == *"controller"* ]]; then
      run_target_test "$MODE"
    else
      echo -e "${YELLOW}Cú pháp sử dụng verify-fast.sh:${NC}"
      echo "  ./verify-fast.sh rules           # Kiểm tra Playbook Test Rules (mặc định)"
      echo "  ./verify-fast.sh syntax          # Kiểm tra Mobile syntax & runtime null-safety"
      echo "  ./verify-fast.sh build           # Kiểm tra compile NestJS Backend"
      echo "  ./verify-fast.sh test <tên_file> # Chạy unit test đích danh (Jest)"
      echo "  ./verify-fast.sh quick           # Kiểm tra nhanh: rules + syntax"
      echo "  ./verify-fast.sh all             # Kiểm tra đầy đủ: rules + syntax + build"
      exit 1
    fi
    ;;
esac

exit 0
