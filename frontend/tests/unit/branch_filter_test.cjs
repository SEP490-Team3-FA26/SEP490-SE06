const assert = require('assert');

/**
 * branch_filter_test.cjs
 * Kiểm thử đơn vị cho thuật toán lọc và chuẩn hóa dữ liệu chi nhánh tại trang Admin Branches (/admin/branches).
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate.
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values].
 */

function filterBranches(branches, searchTerm) {
  const searchKey = (searchTerm || '').trim().toLowerCase();
  return (branches || []).filter((branch) => {
    if (!branch) return false;
    const name = (branch.name || '').toLowerCase();
    const address = (branch.address || '').toLowerCase();
    const code = (branch.branchCode || branch.id || '').toLowerCase();
    const manager = (branch.manager || '').toLowerCase();
    return (
      !searchKey ||
      name.includes(searchKey) ||
      address.includes(searchKey) ||
      code.includes(searchKey) ||
      manager.includes(searchKey)
    );
  });
}

function mapBranchData(rawList) {
  const list = Array.isArray(rawList) ? rawList : (rawList?.data || []);
  return list
    .filter((b) => Boolean(b))
    .map((b) => ({
      ...b,
      id: b.branchCode || b._id || '',
      branchCode: b.branchCode || b.id || '',
      name: b.name || 'Chi nhánh chưa đặt tên',
      address: b.address || 'Chưa cập nhật địa chỉ',
      image: b.image || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4',
      status: b.status || 'active',
      manager: b.manager || 'Chưa gán quản lý',
      contact: b.contact || b.phone || '',
      stats: {
        employees: Number(b.stats?.employees) || 0,
        totalStock: Number(b.stats?.totalStock) || 0,
        lowStock: Number(b.stats?.lowStock) || 0,
        expiring: Number(b.stats?.expiring) || 0,
      },
      alerts: Array.isArray(b.alerts) ? b.alerts : [],
    }));
}

console.log('🧪 BẮT ĐẦU KIỂM THỬ: Branch Filter & Mapping Suite (Test-Coupled Mandate)\n');

// =========================================================================
// 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
// =========================================================================
console.log('--- 1. [Normal Values] ---');

const normalBranches = [
  { _id: '1', branchCode: 'BR-001', name: 'Nhà thuốc VinaPharmacy - CN1', address: 'Quận 1, TP.HCM', manager: 'Nguyễn Văn A' },
  { _id: '2', branchCode: 'BR-002', name: 'Nhà thuốc VinaPharmacy - CN2', address: 'Quận 2, TP.HCM', manager: 'Trần Thị B' },
  { _id: '3', branchCode: 'BR-003', name: 'Nhà thuốc ABC Pharmacy Hội An', address: '197 Lý Thường Kiệt, Hội An', manager: 'Lê Văn C' },
];

// TC-BRANCH-NORM-01: Tìm kiếm theo tên chi nhánh
const resName = filterBranches(normalBranches, 'Hội An');
assert.strictEqual(resName.length, 1, 'TC-BRANCH-NORM-01 thất bại');
assert.strictEqual(resName[0].branchCode, 'BR-003');
console.log('✔ TC-BRANCH-NORM-01: Tìm kiếm chính xác theo tên chi nhánh');

// TC-BRANCH-NORM-02: Tìm kiếm theo địa chỉ
const resAddress = filterBranches(normalBranches, 'Quận 1');
assert.strictEqual(resAddress.length, 1, 'TC-BRANCH-NORM-02 thất bại');
assert.strictEqual(resAddress[0].branchCode, 'BR-001');
console.log('✔ TC-BRANCH-NORM-02: Tìm kiếm chính xác theo địa chỉ chi nhánh');

// TC-BRANCH-NORM-03: Tìm kiếm theo mã chi nhánh hoặc tên quản lý
const resCode = filterBranches(normalBranches, 'BR-002');
assert.strictEqual(resCode.length, 1, 'TC-BRANCH-NORM-03 thất bại');
console.log('✔ TC-BRANCH-NORM-03: Tìm kiếm chính xác theo mã chi nhánh');

// =========================================================================
// 2. [Boundary Values]: Giá trị biên, từ khóa rỗng, khoảng trắng dư thừa
// =========================================================================
console.log('\n--- 2. [Boundary Values] ---');

// TC-BRANCH-BOUND-01: Từ khóa rỗng hoặc chỉ có khoảng trắng trả về toàn bộ danh sách
const resEmpty = filterBranches(normalBranches, '   ');
assert.strictEqual(resEmpty.length, 3, 'TC-BRANCH-BOUND-01 thất bại');
console.log('✔ TC-BRANCH-BOUND-01: Từ khóa rỗng hoặc khoảng trắng trả về đầy đủ 3 chi nhánh');

// TC-BRANCH-BOUND-02: Danh sách chi nhánh rỗng [] xử lý an toàn
const resEmptyList = filterBranches([], 'Vina');
assert.strictEqual(resEmptyList.length, 0, 'TC-BRANCH-BOUND-02 thất bại');
console.log('✔ TC-BRANCH-BOUND-02: Danh sách rỗng không bị văng lỗi');

// TC-BRANCH-BOUND-03: Tìm kiếm không phân biệt chữ hoa, chữ thường
const resCase = filterBranches(normalBranches, 'vinapharmacy');
assert.strictEqual(resCase.length, 2, 'TC-BRANCH-BOUND-03 thất bại');
console.log('✔ TC-BRANCH-BOUND-03: Tìm kiếm case-insensitive chính xác');

// =========================================================================
// 3. [Abnormal Values]: Dữ liệu dị thường, thiếu name, thiếu address, null/undefined
// =========================================================================
console.log('\n--- 3. [Abnormal Values] ---');

// TC-BRANCH-ABNORM-01: Chi nhánh bị thiếu trường name (undefined) không gây crash toLowerCase
const malformedBranches = [
  { _id: '1', branchCode: 'BR-001', address: 'Quận 1' }, // name is undefined!
  { _id: '2', branchCode: 'BR-002', name: 'CN2' },       // address is undefined!
  null,                                                   // null item!
  undefined,                                              // undefined item!
  { _id: '3', branchCode: 'BR-003', name: 'CN3', address: 'Đà Nẵng' },
];

let noCrash = true;
let filteredResult = [];
try {
  filteredResult = filterBranches(malformedBranches, 'Đà Nẵng');
} catch (e) {
  noCrash = false;
}
assert.ok(noCrash, 'TC-BRANCH-ABNORM-01: Bị crash toLowerCase trên undefined');
assert.strictEqual(filteredResult.length, 1);
assert.strictEqual(filteredResult[0].branchCode, 'BR-003');
console.log('✔ TC-BRANCH-ABNORM-01: Hoàn toàn triệt tiêu lỗi TypeError: Cannot read properties of undefined (reading toLowerCase)');

// TC-BRANCH-ABNORM-02: Chuẩn hóa dữ liệu thiếu thông tin thành fallback mặc định an toàn
const mapped = mapBranchData(malformedBranches);
assert.strictEqual(mapped.length, 3, 'Chỉ lấy 3 object hợp lệ, bỏ qua null/undefined');
assert.strictEqual(mapped[0].name, 'Chi nhánh chưa đặt tên', 'Fallback tên an toàn');
assert.strictEqual(mapped[1].address, 'Chưa cập nhật địa chỉ', 'Fallback địa chỉ an toàn');
assert.strictEqual(mapped[0].stats.employees, 0, 'Stats fallback 0');
console.log('✔ TC-BRANCH-ABNORM-02: mapBranchData chuẩn hóa an toàn các trường thiếu sót');

console.log('\n🎉 TẤT CẢ 8 BÀI TEST UNIT PASS 100% THEO CHUẨN TEST-COUPLED MANDATE!');
