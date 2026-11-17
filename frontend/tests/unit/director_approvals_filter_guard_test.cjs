/**
 * Test Suite: Director HQ Approvals Filter & Defensive Array Guards
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values]: Luồng chuẩn mảng PO, PR hỏa tốc và Nhà cung cấp hợp lệ.
 * 2. [Boundary Values]: Mảng rỗng, mảng 1 phần tử, từ khóa tìm kiếm rỗng, khoảng trắng.
 * 3. [Abnormal Values]: Dữ liệu dị thường (API trả về object lỗi, chuỗi thông báo, null, undefined, số, mã PR lỗi).
 */

const assert = require('assert');

console.log('======================================================================');
console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ DEFENSIVE GUARDS CHO DIRECTOR APPROVALS');
console.log('======================================================================\n');

// Hàm chuẩn hóa dữ liệu từ API tương đương logic trong HQApproval.tsx
function normalizePrList(prData) {
  let prList = prData;
  if (prList && prList.data && Array.isArray(prList.data)) prList = prList.data;
  if (prList && prList.items && Array.isArray(prList.items)) prList = prList.items;
  if (prList && prList.value && Array.isArray(prList.value)) prList = prList.value;
  if (!Array.isArray(prList)) prList = [];
  return prList;
}

function normalizePoList(poDataRaw) {
  let poData = poDataRaw;
  if (poData && poData.data && Array.isArray(poData.data)) poData = poData.data;
  if (poData && poData.items && Array.isArray(poData.items)) poData = poData.items;
  if (poData && poData.value && Array.isArray(poData.value)) poData = poData.value;
  if (!Array.isArray(poData)) poData = [];
  return poData;
}

function filterPrs(prList, searchQuery) {
  const safeUrgentPrs = Array.isArray(prList) ? prList : [];
  return safeUrgentPrs.filter(pr => {
    if (!pr) return false;
    const q = (searchQuery || '').toLowerCase();
    const prCodeMatch = (pr.prCode || pr._id || '').toLowerCase().includes(q);
    const branchMatch = (pr.branchName || '').toLowerCase().includes(q);
    return prCodeMatch || branchMatch;
  });
}

function filterPos(poList, suppliers, searchQuery) {
  const safePoList = Array.isArray(poList) ? poList : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const getSupplierName = (id) => {
    const s = safeSuppliers.find(sup => sup && (sup._id === id || sup.id === id));
    return s?.name || id?.slice(-6) || 'N/A';
  };

  return safePoList.filter(po => {
    if (!po) return false;
    const q = (searchQuery || '').toLowerCase();
    const idMatch = (po._id || po.id || po.poNumber || '').toLowerCase().includes(q);
    const supMatch = (getSupplierName(po.supplierId) || '').toLowerCase().includes(q);
    const prMatch = Array.isArray(po.linkedPrCodes)
      ? po.linkedPrCodes.some(code => typeof code === 'string' && code.toLowerCase().includes(q))
      : (typeof po.linkedPrCodes === 'string' ? po.linkedPrCodes.toLowerCase().includes(q) : false);
    return idMatch || supMatch || prMatch;
  });
}

// -------------------------------------------------------------
// NHÓM 1: [Normal Values] Luồng nghiệp vụ chuẩn
// -------------------------------------------------------------
console.log('--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---');

const normalPrs = [
  { _id: 'PR001', prCode: 'PR-20261117-001', branchName: 'Chi nhánh Quận 1', reason: 'Thiếu thuốc hạ sốt' },
  { _id: 'PR002', prCode: 'PR-20261117-002', branchName: 'Chi nhánh Thủ Đức', reason: 'Khẩn cấp khoa cấp cứu' }
];

const normalPos = [
  { _id: 'PO001', supplierId: 'SUP01', totalAmount: 5000000, linkedPrCodes: ['PR-001'] },
  { _id: 'PO002', supplierId: 'SUP02', totalAmount: 12000000, linkedPrCodes: ['PR-002'] }
];

const normalSuppliers = [
  { _id: 'SUP01', name: 'Dược Hậu Giang DHG' },
  { _id: 'SUP02', name: 'Sanofi Aventis VN' }
];

assert.strictEqual(normalizePrList(normalPrs).length, 2);
assert.strictEqual(normalizePoList(normalPos).length, 2);

const normalPrResult = filterPrs(normalPrs, 'Quận 1');
assert.strictEqual(normalPrResult.length, 1);
assert.strictEqual(normalPrResult[0].prCode, 'PR-20261117-001');

const normalPoResult = filterPos(normalPos, normalSuppliers, 'Sanofi');
assert.strictEqual(normalPoResult.length, 1);
assert.strictEqual(normalPoResult[0]._id, 'PO002');
console.log('✔ [Normal] Lọc danh sách PR và PO với dữ liệu chuẩn thành công.');

// -------------------------------------------------------------
// NHÓM 2: [Boundary Values] Giá trị biên
// -------------------------------------------------------------
console.log('\n--- 2. [Boundary Values] Giá trị biên ---');

// Biên mảng rỗng
assert.deepStrictEqual(filterPrs([], 'PR'), []);
assert.deepStrictEqual(filterPos([], [], 'PO'), []);
console.log('✔ [Boundary] Xử lý mảng rỗng an toàn, trả về mảng rỗng.');

// Biên từ khóa tìm kiếm rỗng
assert.strictEqual(filterPrs(normalPrs, '').length, 2);
assert.strictEqual(filterPos(normalPos, normalSuppliers, '').length, 2);
console.log('✔ [Boundary] Tìm kiếm với chuỗi rỗng trả về toàn bộ danh sách.');

// Biên từ khóa chứa khoảng trắng hoặc ký tự đặc biệt
assert.strictEqual(filterPrs(normalPrs, '   ').length, 0);
console.log('✔ [Boundary] Tìm kiếm khoảng trắng không làm crash hệ thống.');

// -------------------------------------------------------------
// NHÓM 3: [Abnormal Values] Dữ liệu dị thường & Chặn lỗi
// -------------------------------------------------------------
console.log('\n--- 3. [Abnormal Values] Dữ liệu dị thường & Chặn lỗi ---');

// API trả về Object lỗi thay vì mảng (Nguyên nhân chính gây n.filter is not a function)
const apiErrorObj = { message: 'Network Timeout 504 Gateway Error', statusCode: 504 };
const normalizedFromError = normalizePrList(apiErrorObj);
assert.ok(Array.isArray(normalizedFromError), 'Phải chuẩn hóa về mảng');
assert.strictEqual(normalizedFromError.length, 0);
assert.doesNotThrow(() => filterPrs(apiErrorObj, 'test'), 'Tuyệt đối không được throw .filter is not a function');
console.log('✔ [Abnormal] Chặn lỗi "n.filter is not a function" khi API trả về Object thông báo lỗi.');

// API bọc trong cấu trúc phân trang { data: [...] } hoặc { items: [...] }
const apiPaginatedObj = { data: normalPrs, total: 2, page: 1, limit: 20 };
const normalizedPaginated = normalizePrList(apiPaginatedObj);
assert.strictEqual(normalizedPaginated.length, 2);
console.log('✔ [Abnormal] Tự động trích xuất đúng mảng từ Object phân trang { data: [...] }.');

// API trả về null hoặc undefined
assert.doesNotThrow(() => filterPrs(null, 'test'));
assert.doesNotThrow(() => filterPrs(undefined, 'test'));
assert.doesNotThrow(() => filterPos(null, null, 'test'));
console.log('✔ [Abnormal] Xử lý an toàn tuyệt đối khi dữ liệu null hoặc undefined.');

// Lô hàng PO chứa linkedPrCodes dị thường (số, null, undefined)
const abnormalPoList = [
  { _id: 'PO-ERR1', supplierId: undefined, linkedPrCodes: [null, undefined, 12345] },
  { _id: 'PO-ERR2', supplierId: null, linkedPrCodes: null }
];
assert.doesNotThrow(() => filterPos(abnormalPoList, null, 'abc'));
console.log('✔ [Abnormal] Chặn lỗi "reading toLowerCase of undefined" khi mã PR hoặc Nhà cung cấp nullish.');

console.log('\n======================================================================');
console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ DEFENSIVE GUARDS CHO APPROVALS ĐỀU PASS 100%!');
console.log('======================================================================');
