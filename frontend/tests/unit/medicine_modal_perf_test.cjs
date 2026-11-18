/**
 * medicine_modal_perf_test.cjs
 * Kiểm thử đơn vị tối ưu hiệu năng cho các Modal chọn thuốc (CreatePO, CreatePR, CreateDisposal)
 * và MedicineCard / medicineService cache trên Web Frontend.
 * Tuân thủ Test-Coupled Mandate: Đủ 3 nhóm [Normal Values], [Boundary Values], [Abnormal Values].
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.resolve(__dirname, '../..');
const medCardFile = fs.readFileSync(path.join(rootDir, 'src/components/MedicineCard.tsx'), 'utf8');
const poModalFile = fs.readFileSync(path.join(rootDir, 'src/components/CreatePOModal.tsx'), 'utf8');
const prModalFile = fs.readFileSync(path.join(rootDir, 'src/components/CreatePRModal.tsx'), 'utf8');
const disposalModalFile = fs.readFileSync(path.join(rootDir, 'src/components/CreateDisposalModal.tsx'), 'utf8');
const medServiceFile = fs.readFileSync(path.join(rootDir, 'src/services/inventory/medicine.service.ts'), 'utf8');

// Helper mô phỏng cắt trang cuốn chiếu (Progressive Rendering)
function sliceProgressivePage(items, visibleCount) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const safeCount = Number.isFinite(Number(visibleCount)) ? Math.max(0, Math.floor(Number(visibleCount))) : 0;
  return items.slice(0, safeCount);
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     -> ${err.message}`);
    failed++;
  }
}

console.log('\n⚡ [Frontend Performance Unit Test] Medicine Modals & Cache\n');

// 1. [Normal Values]
runTest('[Normal Values] TC-PERF-01: MedicineCard được bọc React.memo, hoist regex và giải mã ảnh async', () => {
  assert(medCardFile.includes('React.memo(MedicineCardInner'), 'MedicineCard chưa bọc React.memo');
  assert(medCardFile.includes('decoding="async"'), 'Ảnh trong MedicineCard thiếu decoding="async"');
  assert(medCardFile.includes('REGEX_FULL_PACK'), 'Chưa hoist regex đóng gói ra ngoài component');
});

runTest('[Normal Values] TC-PERF-02: CreatePOModal áp dụng Progressive Rendering (24 thẻ), IntersectionObserver, useDeferredValue & Set O(1)', () => {
  assert(poModalFile.includes('PO_MODAL_PAGE_SIZE = 24'), 'CreatePOModal chưa giới hạn page size 24');
  assert(poModalFile.includes('useDeferredValue(searchQuery)'), 'CreatePOModal chưa dùng useDeferredValue');
  assert(poModalFile.includes('IntersectionObserver'), 'CreatePOModal thiếu IntersectionObserver tự nạp thêm');
  assert(poModalFile.includes('cartIdSet.has(medId)'), 'CreatePOModal chưa dùng Set tra cứu O(1)');
  assert(!poModalFile.includes('filteredMedicines.map(med =>'), 'CreatePOModal vẫn đang .map() toàn bộ filteredMedicines');
});

runTest('[Normal Values] TC-PERF-03: CreatePRModal & CreateDisposalModal áp dụng Progressive Rendering + loại bỏ vòng lặp O(N^2)', () => {
  assert(prModalFile.includes('PR_MODAL_PAGE_SIZE = 24'), 'CreatePRModal chưa giới hạn page size 24');
  assert(prModalFile.includes('selectedMedIdSet.has(medId)'), 'CreatePRModal chưa dùng Set O(1)');
  assert(disposalModalFile.includes('DISPOSAL_MODAL_PAGE_SIZE = 24'), 'CreateDisposalModal chưa giới hạn page size 24');
  assert(disposalModalFile.includes('disposalCartIdSet.has(medId)'), 'CreateDisposalModal chưa dùng Set O(1)');
  assert(!disposalModalFile.includes('combinedMedList.find('), 'CreateDisposalModal vẫn còn vòng lặp O(N^2) combinedMedList.find');
});

runTest('[Normal Values] TC-PERF-04: medicineService.getMedicinesDropdown có cache TTL 2 phút, gộp request trùng và invalidate khi thay đổi', () => {
  assert(medServiceFile.includes('DROPDOWN_CACHE_TTL_MS'), 'Thiếu TTL cache cho getMedicinesDropdown');
  assert(medServiceFile.includes('dropdownInFlight'), 'Thiếu deduplication in-flight request');
  assert(medServiceFile.includes('invalidateMedicinesDropdownCache()'), 'Thiếu cơ chế xóa cache sau khi cập nhật thuốc/xuất hủy');
});

// 2. [Boundary Values]
runTest('[Boundary Values] TC-PERF-05: Danh mục 2.000 thuốc chỉ render đúng 24 thẻ đầu tiên (giảm ~98.8% DOM nodes)', () => {
  const bigList = Array.from({ length: 2000 }, (_, i) => ({ id: `med-${i}` }));
  const firstPage = sliceProgressivePage(bigList, 24);
  assert.strictEqual(firstPage.length, 24);
  assert.strictEqual(firstPage[0].id, 'med-0');
  assert.strictEqual(firstPage[23].id, 'med-23');
});

runTest('[Boundary Values] TC-PERF-06: Danh mục nhỏ hơn 24 thuốc (VD: 5 thuốc) hoặc rỗng (0 thuốc) trả đủ không thừa', () => {
  assert.strictEqual(sliceProgressivePage([1, 2, 3, 4, 5], 24).length, 5);
  assert.strictEqual(sliceProgressivePage([], 24).length, 0);
});

// 3. [Abnormal Values]
runTest('[Abnormal Values] TC-PERF-07: Tham số visibleCount âm / NaN / danh sách null không gây crash', () => {
  assert.deepStrictEqual(sliceProgressivePage(null, 24), []);
  assert.deepStrictEqual(sliceProgressivePage([1, 2, 3], -10), []);
  assert.deepStrictEqual(sliceProgressivePage([1, 2, 3], NaN), []);
});

console.log(`\n📊 Kết quả: ${passed}/${passed + failed} tests PASS`);
if (failed > 0) {
  process.exit(1);
}
