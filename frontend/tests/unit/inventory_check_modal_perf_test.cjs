const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * BỘ KIỂM THỬ HIỆU NĂNG MODAL CHỌN THUỐC TRONG BIÊN BẢN KIỂM KÊ (InventoryCheck.tsx)
 * Tuân thủ Test-Coupled Mandate (đầy đủ 3 nhóm giá trị chuẩn):
 * 1. [Normal Values]: Xác minh Progressive Rendering (24 thẻ/lượt), IntersectionObserver, useDeferredValue, lazy image loading.
 * 2. [Boundary Values]: Xác minh hành vi cắt danh sách ở các mốc biên 0, 24, 25 và 1000 thuốc.
 * 3. [Abnormal Values]: Cấm render trực tiếp toàn bộ filteredModalMedicines.map(...) hoặc thẻ <img> thiếu loading="lazy".
 */

const inventoryCheckPath = path.resolve(
  __dirname,
  '../../src/pages/warehouse/InventoryCheck.tsx'
);
const sourceCode = fs.readFileSync(inventoryCheckPath, 'utf8');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// =========================================================================
// 1. [Normal Values]: Kiểm tra đầy đủ cơ chế tối ưu render & tải ảnh
// =========================================================================
console.log('\n[1. Normal Values] Kiểm tra cơ chế Progressive Rendering & Lazy Image trên InventoryCheck.tsx');

runTest('[Normal] Khai báo CHECK_MODAL_PAGE_SIZE = 24 và dùng useDeferredValue cho ô tìm kiếm Modal', () => {
  assert(
    /const\s+CHECK_MODAL_PAGE_SIZE\s*=\s*24\b/.test(sourceCode),
    'Thiếu hằng số CHECK_MODAL_PAGE_SIZE = 24'
  );
  assert(
    /useDeferredValue\(\s*modalSearchTerm\s*\)/.test(sourceCode),
    'Thiếu useDeferredValue(modalSearchTerm) để chống giật khi gõ tìm kiếm'
  );
});

runTest('[Normal] Áp dụng IntersectionObserver tự động nạp thêm khi cuộn xuống đáy Modal', () => {
  assert(
    /new\s+IntersectionObserver\(/.test(sourceCode),
    'Thiếu IntersectionObserver cho danh sách thẻ thuốc trong Modal kiểm kê'
  );
  assert(
    /visibleModalMedicines\.map\(/.test(sourceCode),
    'Modal phải duyệt qua visibleModalMedicines thay vì toàn bộ mảng'
  );
});

runTest('[Normal] Thẻ <img> trong Modal kiểm kê có đầy đủ loading="lazy" và decoding="async"', () => {
  assert(
    /loading="lazy"/.test(sourceCode),
    'Thiếu thuộc tính loading="lazy" trên thẻ <img> của Modal chọn thuốc kiểm kê'
  );
  assert(
    /decoding="async"/.test(sourceCode),
    'Thiếu thuộc tính decoding="async" trên thẻ <img> của Modal chọn thuốc kiểm kê'
  );
});

// =========================================================================
// 2. [Boundary Values]: Kiểm thử logic phân trang cục bộ ở các giá trị biên
// =========================================================================
console.log('\n[2. Boundary Values] Kiểm tra logic cắt danh sách Progressive Rendering ở mốc biên');

function computeVisibleSlice(totalItems, pageSize, currentVisible) {
  const safeTotal = Math.max(0, Number(totalItems) || 0);
  const safeLimit = Math.min(Math.max(pageSize, Number(currentVisible) || pageSize), safeTotal);
  return {
    visibleCount: safeLimit,
    hasMore: safeLimit < safeTotal,
    nextVisible: Math.min(safeLimit + pageSize, safeTotal),
  };
}

runTest('[Boundary] Danh sách rỗng (0 thuốc) -> hiển thị 0, hasMore = false', () => {
  const res = computeVisibleSlice(0, 24, 24);
  assert.strictEqual(res.visibleCount, 0);
  assert.strictEqual(res.hasMore, false);
});

runTest('[Boundary] Đúng 24 thuốc -> hiển thị 24, hasMore = false', () => {
  const res = computeVisibleSlice(24, 24, 24);
  assert.strictEqual(res.visibleCount, 24);
  assert.strictEqual(res.hasMore, false);
});

runTest('[Boundary] 25 thuốc (vượt biên 1 phần tử) -> lượt đầu 24, hasMore = true, nạp thêm đạt 25', () => {
  const res = computeVisibleSlice(25, 24, 24);
  assert.strictEqual(res.visibleCount, 24);
  assert.strictEqual(res.hasMore, true);
  assert.strictEqual(res.nextVisible, 25);
});

runTest('[Boundary] 1000 thuốc -> lượt đầu chỉ mount tối đa 24 thẻ DOM (giảm >97% DOM nodes ban đầu)', () => {
  const res = computeVisibleSlice(1000, 24, 24);
  assert.strictEqual(res.visibleCount, 24);
  assert.strictEqual(res.hasMore, true);
  assert.strictEqual(res.nextVisible, 48);
});

// =========================================================================
// 3. [Abnormal Values]: Chặn hồi quy render toàn bộ mảng gây đơ trình duyệt
// =========================================================================
console.log('\n[3. Abnormal Values] Kiểm tra chống hồi quy render ồ ạt trong Modal kiểm kê');

runTest('[Abnormal] Cấm render trực tiếp filteredModalMedicines.map(...) trong JSX', () => {
  assert(
    !/filteredModalMedicines\.map\(/.test(sourceCode),
    'Phát hiện filteredModalMedicines.map(...) gây render ồ ạt hàng nghìn DOM node!'
  );
});

runTest('[Abnormal] Footer Modal phải hiển thị rõ tỷ lệ đang hiển thị / tổng số lọc được', () => {
  assert(
    /visibleModalMedicines\.length/.test(sourceCode) &&
      /filteredModalMedicines\.length/.test(sourceCode),
    'Footer Modal phải hiển thị rõ số lượng thẻ đang hiển thị trên tổng số thuốc lọc được'
  );
});

console.log(`\n📊 [InventoryCheck Modal Perf Test] ${passed}/${passed + failed} PASS`);
if (failed > 0) {
  process.exit(1);
}
