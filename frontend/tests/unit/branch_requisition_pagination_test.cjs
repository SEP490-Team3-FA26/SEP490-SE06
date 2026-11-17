/**
 * branch_requisition_pagination_test.cjs
 * Bộ kiểm thử đơn vị cho tính năng phân trang mặc định 100 bản ghi và lọc theo chi nhánh PR
 * 
 * Tuân thủ nghiêm ngặt Test-Coupled Mandate & Fullstack Playbook v2.0:
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * - [Normal Values]: Phân trang 100 bản ghi, tính toán totalPages, trích xuất branchId từ JWT token.
 * - [Boundary Values]: Mốc biên 100 bản ghi (1 trang), 101 bản ghi (2 trang), nhảy trang giới hạn [1, totalPages].
 * - [Abnormal Values]: Dữ liệu rỗng, JWT token dị thường/hỏng, tham số sai định dạng.
 */

const assert = require('assert');

// 1. Logic giải mã branchId từ JWT Token
function getBranchIdFromToken(token, fallbackBranchId = "BR-001") {
  if (!token) return fallbackBranchId;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return fallbackBranchId;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(jsonPayload);
    return payload.branchId || fallbackBranchId;
  } catch {
    return fallbackBranchId;
  }
}

// 2. Logic tính toán phân trang
function calculateTotalPages(totalItems, pageSize = 100) {
  const safePageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 100;
  const safeTotalItems = Number.isFinite(Number(totalItems)) && Number(totalItems) >= 0 ? Number(totalItems) : 0;
  return Math.max(1, Math.ceil(safeTotalItems / safePageSize));
}

// 3. Logic kiểm định trang nhảy hợp lệ
function validateJumpPage(inputPage, totalPages, currentPage) {
  const pageNum = parseInt(inputPage, 10);
  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
    return pageNum;
  }
  return currentPage;
}

// 4. Logic định dạng thông tin phân trang
function formatPaginationInfo(currentPage, totalPages, totalItems, unitName = "sản phẩm") {
  return `Hiển thị trang ${currentPage} / ${totalPages} (${totalItems.toLocaleString("vi-VN")} ${unitName})`;
}

// 5. Logic định dạng nhãn trạng thái tiếng Việt chuẩn
function formatPrStatus(status) {
  const statusMap = {
    SUBMITTED: { label: "Đã gửi — Chờ xử lý", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    DISPATCH_PENDING: { label: "Chờ xuất kho", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    SHIPPING: { label: "Đang giao hàng", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    COMPLETED: { label: "Hoàn thành ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    OUT_OF_STOCK: { label: "Hết hàng ⚠", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    CONSOLIDATED: { label: "Đang gom đơn", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "Đã được duyệt ✓", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    REJECTED: { label: "Bị từ chối ✗", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    URGENT_PENDING: { label: "Hỏa tốc — Chờ duyệt ⚡", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    WAREHOUSE_SUBMITTED: { label: "Kho đã gửi Admin", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    DRAFT: { label: "Bản nháp", cls: "bg-slate-50 text-slate-600 border-slate-200" },
    CANCELLED: { label: "Đã hủy", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  };
  return statusMap[status] || { label: status || "—", cls: "bg-slate-50 text-slate-600 border-slate-200" };
}

console.log("======================================================================");
console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ PHÂN TRANG PR 100 BẢN GHI (BRANCH REQUISITION)");
console.log("======================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✔ [Passed] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [Failed] ${name}:`, err.message);
    failed++;
  }
}

// =========================================================================
// 1. [Normal Values] - Luồng nghiệp vụ chuẩn & thành công
// =========================================================================
console.log("--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---");

test("TC-NORM-01: Phân trang mặc định 100 bản ghi/trang cho danh sách PR", () => {
  const totalItems = 350;
  const pageSize = 100;
  const totalPages = calculateTotalPages(totalItems, pageSize);
  assert.strictEqual(totalPages, 4, "350 bản ghi với pageSize 100 phải chia làm 4 trang");
});

test("TC-NORM-02: Trích xuất branchId BR-001 chuẩn từ JWT Token hợp lệ", () => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(JSON.stringify({ sub: "user-123", role: "BRANCH_MANAGER", branchId: "BR-001" })).toString("base64");
  const fakeToken = `${header}.${payload}.signature`;
  
  const branchId = getBranchIdFromToken(fakeToken);
  assert.strictEqual(branchId, "BR-001", "Phải trích xuất đúng BR-001 từ JWT payload");
});

test("TC-NORM-03: Định dạng đúng chuỗi thông tin phân trang với unitName='yêu cầu'", () => {
  const info = formatPaginationInfo(1, 4, 350, "yêu cầu");
  assert.strictEqual(info, "Hiển thị trang 1 / 4 (350 yêu cầu)");
});

test("TC-NORM-04: Nhảy trang hợp lệ đến trang 3 trong phạm vi [1, 4]", () => {
  const validPage = validateJumpPage("3", 4, 1);
  assert.strictEqual(validPage, 3, "Nhập trang '3' hợp lệ phải trả về số 3");
});

test("TC-NORM-05: Định dạng đúng tiếng Việt các trạng thái chính (DISPATCH_PENDING, SHIPPING, SUBMITTED, CONSOLIDATED)", () => {
  assert.strictEqual(formatPrStatus("DISPATCH_PENDING").label, "Chờ xuất kho");
  assert.strictEqual(formatPrStatus("SHIPPING").label, "Đang giao hàng");
  assert.strictEqual(formatPrStatus("SUBMITTED").label, "Đã gửi — Chờ xử lý");
  assert.strictEqual(formatPrStatus("CONSOLIDATED").label, "Đang gom đơn");
  assert.strictEqual(formatPrStatus("OUT_OF_STOCK").label, "Hết hàng ⚠");
  assert.strictEqual(formatPrStatus("COMPLETED").label, "Hoàn thành ✓");
});

// =========================================================================
// 2. [Boundary Values] - Giá trị biên & chuyển trang
// =========================================================================
console.log("\n--- 2. [Boundary Values] Giá trị biên & chuyển trang ---");

test("TC-BOUND-01: Mốc biên đúng 100 bản ghi (pageSize=100) -> Đúng 1 trang", () => {
  const totalPages = calculateTotalPages(100, 100);
  assert.strictEqual(totalPages, 1, "100 bản ghi chỉ có đúng 1 trang");
});

test("TC-BOUND-02: Mốc biên 101 bản ghi (pageSize=100) -> Chuyển sang 2 trang", () => {
  const totalPages = calculateTotalPages(101, 100);
  assert.strictEqual(totalPages, 2, "101 bản ghi phải có 2 trang");
});

test("TC-BOUND-03: Nhảy trang biên tối thiểu (trang 1) và biên tối đa (trang 5)", () => {
  assert.strictEqual(validateJumpPage("1", 5, 2), 1, "Nhảy về trang 1 hợp lệ");
  assert.strictEqual(validateJumpPage("5", 5, 2), 5, "Nhảy đến trang 5 hợp lệ");
});

test("TC-BOUND-04: Nhảy trang vượt biên trên (> totalPages) giữ nguyên trang hiện tại", () => {
  const result = validateJumpPage("10", 5, 2);
  assert.strictEqual(result, 2, "Trang 10 vượt quá totalPages=5 phải giữ nguyên trang hiện tại 2");
});

test("TC-BOUND-05: Nhảy trang vượt biên dưới (<= 0) giữ nguyên trang hiện tại", () => {
  const result = validateJumpPage("0", 5, 2);
  assert.strictEqual(result, 2, "Trang 0 không hợp lệ phải giữ nguyên trang hiện tại 2");
});

test("TC-BOUND-06: Định dạng đúng các trạng thái biên (URGENT_PENDING, WAREHOUSE_SUBMITTED, DRAFT, CANCELLED)", () => {
  assert.strictEqual(formatPrStatus("URGENT_PENDING").label, "Hỏa tốc — Chờ duyệt ⚡");
  assert.strictEqual(formatPrStatus("WAREHOUSE_SUBMITTED").label, "Kho đã gửi Admin");
  assert.strictEqual(formatPrStatus("DRAFT").label, "Bản nháp");
  assert.strictEqual(formatPrStatus("CANCELLED").label, "Đã hủy");
});

// =========================================================================
// 3. [Abnormal Values] - Dữ liệu dị thường & ngoại lệ an toàn
// =========================================================================
console.log("\n--- 3. [Abnormal Values] Dữ liệu dị thường & ngoại lệ an toàn ---");

test("TC-ABNORM-01: totalItems = 0 trả về totalPages = 1 an toàn (không trả về 0)", () => {
  const totalPages = calculateTotalPages(0, 100);
  assert.strictEqual(totalPages, 1, "totalItems = 0 vẫn phải trả về ít nhất 1 trang");
});

test("TC-ABNORM-02: Token rỗng hoặc null fallback về chi nhánh mặc định BR-001", () => {
  assert.strictEqual(getBranchIdFromToken(null), "BR-001");
  assert.strictEqual(getBranchIdFromToken(""), "BR-001");
  assert.strictEqual(getBranchIdFromToken(undefined), "BR-001");
});

test("TC-ABNORM-03: Token hỏng hoặc JSON payload lỗi fallback về BR-001 an toàn", () => {
  const corruptToken = "header.invalid_base64_payload???.sig";
  assert.strictEqual(getBranchIdFromToken(corruptToken), "BR-001");
});

test("TC-ABNORM-04: Nhập chữ cái vào ô nhảy trang ('abc') giữ nguyên trang hiện tại", () => {
  const result = validateJumpPage("abc", 5, 3);
  assert.strictEqual(result, 3, "Nhập chuỗi không phải số phải giữ nguyên trang hiện tại 3");
});

test("TC-ABNORM-05: Trạng thái không xác định hoặc null fallback an toàn", () => {
  assert.strictEqual(formatPrStatus("UNKNOWN_XYZ").label, "UNKNOWN_XYZ");
  assert.strictEqual(formatPrStatus(null).label, "—");
  assert.strictEqual(formatPrStatus("").label, "—");
});

console.log("\n======================================================================");
if (failed === 0) {
  console.log(`🎉 TẤT CẢ ${passed}/${passed} BÀI KIỂM THỬ PHÂN TRANG PR ĐÃ ĐẠT CHUẨN 100%!`);
  console.log("======================================================================\n");
  process.exit(0);
} else {
  console.error(`❌ CÓ ${failed} BÀI KIỂM THỬ THẤT BẠI!`);
  console.log("======================================================================\n");
  process.exit(1);
}

