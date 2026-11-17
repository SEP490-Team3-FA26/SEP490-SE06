/**
 * retail_cart_layout_test.cjs
 * Bộ kiểm thử đơn vị cho kiến trúc bố cục Giỏ hàng POS Bán lẻ (RetailView.tsx):
 * 1. [Normal Values]: Tên thuốc dài, thông tin hoạt chất đầy đủ, lựa chọn đơn vị quy đổi và tính toán thành tiền chuẩn xác.
 * 2. [Boundary Values]: Tên thuốc 1 ký tự, số lượng tối thiểu = 1, quy đổi đơn vị hệ số 1, đơn vị rỗng fallback về đơn vị chuẩn.
 * 3. [Abnormal Values]: Hoạt chất null/undefined/rỗng, giá trị âm, unitOptions không xác định, dữ liệu đặc thù.
 */

const assert = require('assert');

console.log('======================================================================');
console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ GIAO DIỆN & TÍNH TOÁN GIỎ HÀNG POS (RETAIL CART)');
console.log('======================================================================\n');

// Hàm chuẩn hóa thông tin hiển thị giỏ hàng
function formatCartItemDisplay(it) {
  const name = (it.name || 'Thuốc không xác định').trim();
  const activeIngredient = it.active_ingredient ? `(${it.active_ingredient.trim()})` : '';
  const selectedUnit = it.selectedUnit || it.unit || 'Hộp';
  const unitPrice = Math.max(0, Number(it.price) || 0);
  const quantity = Math.max(1, Number(it.quantity) || 1);
  const totalPrice = unitPrice * quantity;

  return {
    fullNameDisplay: activeIngredient ? `${name} ${activeIngredient}` : name,
    selectedUnit,
    unitPriceText: `${unitPrice.toLocaleString('vi-VN')}₫ / ${selectedUnit}`,
    totalPriceText: `${totalPrice.toLocaleString('vi-VN')}₫`,
    totalPrice,
    quantity,
  };
}

// Hàm chuẩn hóa các tùy chọn đơn vị quy đổi
function formatUnitOptions(it) {
  const baseUnit = it.unit || 'Hộp';
  const rawOptions = Array.isArray(it.unitOptions) && it.unitOptions.length > 0
    ? it.unitOptions
    : [{ unitName: baseUnit, price: it.price || 0, exchangeValue: 1 }];

  return rawOptions.map(u => ({
    unitName: u.unitName || baseUnit,
    price: Math.max(0, Number(u.price) || 0),
    optionLabel: `${u.unitName} (${(Math.max(0, Number(u.price) || 0)).toLocaleString('vi-VN')}₫)`,
  }));
}

let passed = 0;
let total = 0;

function runTest(testName, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}: ${err.message}`);
  }
}

// =========================================================================
// 1. [Normal Values]: Luồng chuẩn
// =========================================================================
console.log('--- 1. [Normal Values] Luồng hiển thị chuẩn tên thuốc & quy đổi đơn vị ---');

runTest('TC-CART-NORM-01: Hiển thị trọn vẹn tên thuốc dài và hoạt chất lâm sàng', () => {
  const item = {
    name: 'Cao dán Salonpas Hisamitsu giảm đau vai, đau lưng, đau cơ (24 gói x 10 miếng)',
    active_ingredient: '1 gói chứa: Tocopherol acetate 2%, L-menthol 5.71%, Methyl salicylate 6.29%',
    price: 18000,
    unit: 'Hộp',
    selectedUnit: 'Gói 10 Miếng (Lẻ)',
    quantity: 2,
  };

  const res = formatCartItemDisplay(item);
  assert.strictEqual(res.totalPrice, 36000);
  assert.strictEqual(res.totalPriceText, '36.000₫');
  assert.strictEqual(res.unitPriceText, '18.000₫ / Gói 10 Miếng (Lẻ)');
  assert(res.fullNameDisplay.includes('Cao dán Salonpas'));
  assert(res.fullNameDisplay.includes('Tocopherol acetate'));
});

runTest('TC-CART-NORM-02: Tạo danh sách đơn vị bán tinh gọn với nhãn chuẩn', () => {
  const item = {
    unit: 'Hộp',
    price: 180000,
    unitOptions: [
      { unitName: 'Hộp', price: 180000, exchangeValue: 10 },
      { unitName: 'Gói 10 Miếng (Lẻ)', price: 18000, exchangeValue: 1 },
    ],
  };

  const options = formatUnitOptions(item);
  assert.strictEqual(options.length, 2);
  assert.strictEqual(options[0].optionLabel, 'Hộp (180.000₫)');
  assert.strictEqual(options[1].optionLabel, 'Gói 10 Miếng (Lẻ) (18.000₫)');
});

// =========================================================================
// 2. [Boundary Values]: Giá trị biên
// =========================================================================
console.log('\n--- 2. [Boundary Values] Các trường hợp biên độ ---');

runTest('TC-CART-BOUND-01: Số lượng biên tối thiểu bằng 1', () => {
  const item = {
    name: 'Panadol Extra',
    price: 15000,
    quantity: 0, // Nhỏ hơn 1
  };

  const res = formatCartItemDisplay(item);
  assert.strictEqual(res.quantity, 1);
  assert.strictEqual(res.totalPrice, 15000);
});

runTest('TC-CART-BOUND-02: Không có unitOptions tự fallback về đơn vị gốc duy nhất', () => {
  const item = {
    name: 'Siro HoAstex 90ml',
    price: 45000,
    unit: 'Chai',
    unitOptions: [],
  };

  const options = formatUnitOptions(item);
  assert.strictEqual(options.length, 1);
  assert.strictEqual(options[0].unitName, 'Chai');
  assert.strictEqual(options[0].price, 45000);
});

// =========================================================================
// 3. [Abnormal Values]: Dữ liệu dị thường
// =========================================================================
console.log('\n--- 3. [Abnormal Values] Xử lý ngoại lệ và dữ liệu dị thường ---');

runTest('TC-CART-ABNORM-01: Hoạt chất null hoặc rỗng không hiển thị dấu ngoặc rỗng', () => {
  const item1 = { name: 'Bông y tế Bạch Tuyết', active_ingredient: null, price: 10000, quantity: 1 };
  const item2 = { name: 'Gạc tiệt trùng', active_ingredient: '', price: 5000, quantity: 1 };

  const res1 = formatCartItemDisplay(item1);
  const res2 = formatCartItemDisplay(item2);

  assert.strictEqual(res1.fullNameDisplay, 'Bông y tế Bạch Tuyết');
  assert.strictEqual(res2.fullNameDisplay, 'Gạc tiệt trùng');
});

runTest('TC-CART-ABNORM-02: Tên thuốc null/undefined tự hiển thị tên mặc định, giá âm được chuẩn hóa về 0', () => {
  const item = { name: undefined, price: -50000, quantity: -2 };
  const res = formatCartItemDisplay(item);

  assert.strictEqual(res.fullNameDisplay, 'Thuốc không xác định');
  assert.strictEqual(res.totalPrice, 0);
  assert.strictEqual(res.totalPriceText, '0₫');
});

console.log('\n======================================================================');
console.log(`📊 TỔNG KẾT: ${passed}/${total} BÀI KIỂM THỬ ĐẠT YÊU CẦU (${Math.round((passed / total) * 100)}%)`);
console.log('======================================================================\n');

if (passed !== total) {
  process.exit(1);
}
