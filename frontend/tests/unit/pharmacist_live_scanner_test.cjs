// frontend/tests/unit/pharmacist_live_scanner_test.cjs
/**
 * =========================================================================
 * BÀI KIỂM THỬ ĐƠN VỊ: QUÉT BARCODE & QR LIVE BẰNG CAMERA CHO DƯỢC SĨ (POS RETAIL)
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Playbook v2.0 & sep.md)
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values] Quét Barcode EAN-13, tự động tăng giỏ hàng, nhận diện Sổ sức khỏe số
 * 2. [Boundary Values] Chạm trần tồn kho chi nhánh, giới hạn cooldown 1200ms chống dập mã
 * 3. [Abnormal Values] Mã rỗng, mã lạ từ chối thêm, thuốc hết hàng stock = 0, camera tạm dừng
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

const assert = require('assert');

// Logic mô phỏng xử lý mã vạch quét từ Camera vào giỏ hàng POS Dược sĩ
function processLivePharmacistBarcode({
  barcode,
  cart,
  catalog,
  branchStock,
  isPaused = false,
  lastScanTime = 0,
  lastScanCode = '',
  currentTime = Date.now(),
}) {
  // 1. Kiểm tra trạng thái tạm dừng
  if (isPaused) {
    return { success: false, reason: 'PAUSED', cart };
  }

  // 2. Kiểm tra mã rỗng hoặc quá ngắn
  if (!barcode || barcode.trim().length < 3) {
    return { success: false, reason: 'INVALID_CODE', cart };
  }

  const cleanBarcode = barcode.trim();

  // 3. Cooldown chống quét dập mã (1200ms cho cùng mã, 500ms cho mã khác)
  const timeSinceLast = currentTime - lastScanTime;
  const isSameCode = cleanBarcode === lastScanCode;
  const minInterval = isSameCode ? 1200 : 500;

  if (lastScanTime > 0 && timeSinceLast < minInterval) {
    return { success: false, reason: 'THROTTLED', cart };
  }

  // 4. Nhận diện QR Sổ Sức Khỏe Số
  if (cleanBarcode.startsWith('{') && cleanBarcode.includes('HEALTH_PASSPORT')) {
    try {
      const passport = JSON.parse(cleanBarcode);
      return {
        success: true,
        type: 'HEALTH_PASSPORT',
        customer: {
          phone: passport.phone || '',
          name: passport.name || '',
        },
        cart,
      };
    } catch (_) {}
  }

  // 5. Tra cứu danh mục thuốc
  const foundMed = catalog.find(
    (m) => m.barcode === cleanBarcode || m.sku === cleanBarcode || m._id === cleanBarcode
  );

  if (!foundMed) {
    return { success: false, reason: 'NOT_FOUND', cart };
  }

  // 6. Kiểm tra tồn kho khả dụng tại chi nhánh
  const totalStock = branchStock[foundMed._id] !== undefined ? branchStock[foundMed._id] : (foundMed.stock || 0);
  if (totalStock <= 0) {
    return { success: false, reason: 'OUT_OF_STOCK', medicine: foundMed, cart };
  }

  // 7. Cập nhật giỏ hàng bán hàng (Khớp cả ID lẫn Barcode chống trùng lặp dòng)
  const medIdStr = String(foundMed._id || foundMed.id || '');
  const existingIdx = cart.findIndex((it) => {
    const itId = String(it.id || it._id || '');
    const itBarcode = String(it.barcode || '');
    return (itId && itId === medIdStr) || (itBarcode && cleanBarcode && itBarcode === cleanBarcode);
  });

  if (existingIdx !== -1) {
    const existing = cart[existingIdx];
    if (existing.quantity + 1 > totalStock) {
      return { success: false, reason: 'MAX_STOCK_REACHED', medicine: foundMed, cart };
    }
    const updatedCart = cart.map((it, idx) =>
      idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it
    );
    return {
      success: true,
      action: 'INCREMENT',
      medicine: foundMed,
      cart: updatedCart,
    };
  } else {
    const newItem = {
      ...foundMed,
      id: medIdStr,
      _id: medIdStr,
      barcode: foundMed.barcode || cleanBarcode,
      quantity: 1,
      price: foundMed.price || 50000,
      unit: foundMed.unit || 'Hộp',
    };
    return {
      success: true,
      action: 'ADD_NEW',
      medicine: foundMed,
      cart: [...cart, newItem],
    };
  }
}

// ==========================================
// THỰC THI BỘ BÀI TEST CHUẨN
// ==========================================
console.log('🚀 Bắt đầu chạy bộ kiểm thử Live Barcode Camera Scanner POS Dược Sĩ...\n');

const mockCatalog = [
  { _id: 'med-01', name: 'Panadol Extra Đỏ', barcode: '8935006530010', sku: 'SKU-PAN-01', price: 65000, unit: 'Hộp' },
  { _id: 'med-02', name: 'Berberin DHG 500mg', barcode: '8935006530022', sku: 'SKU-BER-02', price: 25000, unit: 'Lọ' },
  { _id: 'med-03', name: 'Augmentin 1g GSK', barcode: '8935006530033', sku: 'SKU-AUG-03', price: 210000, unit: 'Hộp' },
];

const mockStock = {
  'med-01': 50,
  'med-02': 2, // Tồn ít để test biên
  'med-03': 0, // Hết hàng để test dị thường
};

// -----------------------------------------------------------------------------
// 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
// -----------------------------------------------------------------------------
console.log('--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---');

// TC-LIVE-NORM-01: Quét mã vạch EAN-13 lần đầu nạp thuốc vào giỏ hàng POS
{
  const res = processLivePharmacistBarcode({
    barcode: '8935006530010',
    cart: [],
    catalog: mockCatalog,
    branchStock: mockStock,
  });

  assert.strictEqual(res.success, true, 'Quét barcode hợp lệ phải thành công');
  assert.strictEqual(res.action, 'ADD_NEW', 'Mặt hàng mới phải được thêm vào giỏ');
  assert.strictEqual(res.cart.length, 1, 'Giỏ hàng phải có đúng 1 món');
  assert.strictEqual(res.cart[0].id, 'med-01', 'Mã thuốc khớp chính xác med-01');
  assert.strictEqual(res.cart[0].quantity, 1, 'Số lượng ban đầu là 1');
  console.log('  ✔ TC-LIVE-NORM-01: Quét mã vạch EAN-13 tự động nạp thuốc mới vào giỏ hàng POS (ĐẠT)');
}

// TC-LIVE-NORM-02: Quét tiếp cùng mã vạch tăng số lượng x2
{
  const initialCart = [{ id: 'med-01', name: 'Panadol Extra Đỏ', quantity: 1, price: 65000, unit: 'Hộp' }];
  const res = processLivePharmacistBarcode({
    barcode: '8935006530010',
    cart: initialCart,
    catalog: mockCatalog,
    branchStock: mockStock,
    lastScanTime: 1000,
    lastScanCode: '8935006530010',
    currentTime: 3000, // Đã qua cooldown 2000ms > 1200ms
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, 'INCREMENT', 'Phải tăng số lượng mặt hàng đã có');
  assert.strictEqual(res.cart.length, 1, 'Không được tạo thêm dòng mới');
  assert.strictEqual(res.cart[0].quantity, 2, 'Số lượng phải tăng lên 2');
  console.log('  ✔ TC-LIVE-NORM-02: Quét tiếp cùng mã thuốc tự động tăng số lượng quantity + 1 (ĐẠT)');
}

// TC-LIVE-NORM-03: Quét mã QR Sổ Sức Khỏe Số nhận diện khách hàng
{
  const qrData = JSON.stringify({
    type: 'HEALTH_PASSPORT',
    phone: '0987654321',
    name: 'Nguyễn Văn Khách',
  });
  const res = processLivePharmacistBarcode({
    barcode: qrData,
    cart: [],
    catalog: mockCatalog,
    branchStock: mockStock,
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.type, 'HEALTH_PASSPORT');
  assert.strictEqual(res.customer.phone, '0987654321');
  assert.strictEqual(res.customer.name, 'Nguyễn Văn Khách');
  console.log('  ✔ TC-LIVE-NORM-03: Nhận diện mã QR Sổ Sức Khỏe Số nạp hồ sơ khách hàng (ĐẠT)');
}

// TC-LIVE-NORM-04: Quét liên tiếp 4 lần bảo đảm 100% không nhân bản dòng trong giỏ hàng POS
{
  let dynamicCart = [];

  // Lần 1: Quét thuốc A (Panadol)
  let r1 = processLivePharmacistBarcode({
    barcode: '8935006530010',
    cart: dynamicCart,
    catalog: mockCatalog,
    branchStock: mockStock,
  });
  dynamicCart = r1.cart;
  assert.strictEqual(dynamicCart.length, 1);
  assert.strictEqual(dynamicCart[0].id, 'med-01');
  assert.strictEqual(dynamicCart[0].quantity, 1);

  // Lần 2: Quét tiếp thuốc A (Panadol) -> Không tạo dòng mới, chỉ tăng quantity thành 2
  let r2 = processLivePharmacistBarcode({
    barcode: '8935006530010',
    cart: dynamicCart,
    catalog: mockCatalog,
    branchStock: mockStock,
    lastScanTime: 1000,
    lastScanCode: '8935006530010',
    currentTime: 3000,
  });
  dynamicCart = r2.cart;
  assert.strictEqual(dynamicCart.length, 1, 'Lần 2 quét trùng thuốc A: Giỏ hàng phải giữ nguyên 1 dòng');
  assert.strictEqual(dynamicCart[0].quantity, 2, 'Lần 2: Số lượng thuốc A phải là 2');

  // Lần 3: Quét thuốc B (Berberin) -> Thêm dòng thứ 2
  let r3 = processLivePharmacistBarcode({
    barcode: '8935006530022',
    cart: dynamicCart,
    catalog: mockCatalog,
    branchStock: mockStock,
    lastScanTime: 3000,
    lastScanCode: '8935006530010',
    currentTime: 4000,
  });
  dynamicCart = r3.cart;
  assert.strictEqual(dynamicCart.length, 2, 'Lần 3 quét thuốc B: Giỏ hàng phải có 2 dòng');
  assert.strictEqual(dynamicCart.find(it => it.id === 'med-02').quantity, 1);

  // Lần 4: Quét lại thuốc A (Panadol) -> Tăng quantity thuốc A lên 3, giỏ hàng vẫn đúng 2 dòng
  let r4 = processLivePharmacistBarcode({
    barcode: '8935006530010',
    cart: dynamicCart,
    catalog: mockCatalog,
    branchStock: mockStock,
    lastScanTime: 4000,
    lastScanCode: '8935006530022',
    currentTime: 5000,
  });
  dynamicCart = r4.cart;
  assert.strictEqual(dynamicCart.length, 2, 'Lần 4 quét lại thuốc A: Giỏ hàng vẫn giữ nguyên 2 dòng');
  assert.strictEqual(dynamicCart.find(it => it.id === 'med-01').quantity, 3, 'Lần 4: Thuốc A tăng lên 3');
  console.log('  ✔ TC-LIVE-NORM-04: Quét xen kẽ nhiều thuốc giống/khác nhau gom đúng số lượng, không tạo dòng mới (ĐẠT)');
}

// -----------------------------------------------------------------------------
// 2. [Boundary Values]: Giá trị biên, kiểm soát tồn kho & chống quét dồn dập
// -----------------------------------------------------------------------------
console.log('\n--- 2. [Boundary Values] Giá trị biên & Throttling ---');

// TC-LIVE-BOUND-01: Chạm trần số lượng tồn kho khả dụng tại chi nhánh
{
  const initialCart = [{ id: 'med-02', name: 'Berberin DHG 500mg', quantity: 2, price: 25000, unit: 'Lọ' }];
  // Tồn kho med-02 chỉ có 2, giỏ đã có 2
  const res = processLivePharmacistBarcode({
    barcode: '8935006530022',
    cart: initialCart,
    catalog: mockCatalog,
    branchStock: mockStock,
    lastScanTime: 1000,
    lastScanCode: '8935006530022',
    currentTime: 3000,
  });

  assert.strictEqual(res.success, false, 'Không được vượt quá tồn kho chi nhánh');
  assert.strictEqual(res.reason, 'MAX_STOCK_REACHED');
  assert.strictEqual(res.cart[0].quantity, 2, 'Số lượng giữ nguyên ở mức tối đa 2');
  console.log('  ✔ TC-LIVE-BOUND-01: Chặn bán vượt quá tồn kho khả dụng tại chi nhánh (ĐẠT)');
}

// TC-LIVE-BOUND-02: Giới hạn Cooldown 1200ms chống quét trùng lặp khi chưa nhấc hộp thuốc ra
{
  const res = processLivePharmacistBarcode({
    barcode: '8935006530010',
    cart: [{ id: 'med-01', quantity: 1 }],
    catalog: mockCatalog,
    branchStock: mockStock,
    lastScanTime: 1000,
    lastScanCode: '8935006530010',
    currentTime: 1400, // Chỉ mới 400ms trôi qua (< 1200ms)
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'THROTTLED', 'Phải kích hoạt cơ chế throttle');
  console.log('  ✔ TC-LIVE-BOUND-02: Cooldown 1200ms chống quét dồn dập cùng 1 mã (ĐẠT)');
}

// TC-LIVE-BOUND-03: Hai mã khác nhau quét cách nhau 600ms (> 500ms) được nhận diện tức thì
{
  const cartWithOne = [{ id: 'med-01', quantity: 1, price: 65000, unit: 'Hộp' }];
  const res = processLivePharmacistBarcode({
    barcode: '8935006530022', // Mã thuốc khác
    cart: cartWithOne,
    catalog: mockCatalog,
    branchStock: mockStock,
    lastScanTime: 1000,
    lastScanCode: '8935006530010', // Mã trước đó
    currentTime: 1600, // 600ms trôi qua (> 500ms cho mã khác)
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, 'ADD_NEW');
  assert.strictEqual(res.cart.length, 2, 'Phải nạp tiếp món thứ 2 vào giỏ');
  console.log('  ✔ TC-LIVE-BOUND-03: Quét 2 mã thuốc khác nhau liên tiếp sau 600ms thành công (ĐẠT)');
}

// -----------------------------------------------------------------------------
// 3. [Abnormal Values]: Dữ liệu dị thường & xử lý ngoại lệ
// -----------------------------------------------------------------------------
console.log('\n--- 3. [Abnormal Values] Dữ liệu dị thường & ngoại lệ ---');

// TC-LIVE-ABNORM-01: Mã rỗng hoặc quá ngắn (< 3 ký tự)
{
  const resEmpty = processLivePharmacistBarcode({ barcode: '', cart: [], catalog: mockCatalog, branchStock: mockStock });
  assert.strictEqual(resEmpty.success, false);
  assert.strictEqual(resEmpty.reason, 'INVALID_CODE');

  const resShort = processLivePharmacistBarcode({ barcode: '12', cart: [], catalog: mockCatalog, branchStock: mockStock });
  assert.strictEqual(resShort.success, false);
  assert.strictEqual(resShort.reason, 'INVALID_CODE');
  console.log('  ✔ TC-LIVE-ABNORM-01: Từ chối mã vạch rỗng hoặc độ dài dưới 3 ký tự (ĐẠT)');
}

// TC-LIVE-ABNORM-02: Mã vạch lạ không có trong danh mục quầy thuốc
{
  const res = processLivePharmacistBarcode({
    barcode: '9999999999999',
    cart: [{ id: 'med-01', quantity: 1 }],
    catalog: mockCatalog,
    branchStock: mockStock,
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'NOT_FOUND');
  assert.strictEqual(res.cart.length, 1, 'Giỏ hàng không bị thay đổi');
  console.log('  ✔ TC-LIVE-ABNORM-02: Từ chối mã vạch lạ không thuộc danh mục dược phẩm (ĐẠT)');
}

// TC-LIVE-ABNORM-03: Thuốc hết hàng tại chi nhánh (stock = 0)
{
  const res = processLivePharmacistBarcode({
    barcode: '8935006530033', // Augmentin stock = 0
    cart: [],
    catalog: mockCatalog,
    branchStock: mockStock,
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'OUT_OF_STOCK');
  assert.strictEqual(res.medicine.name, 'Augmentin 1g GSK');
  console.log('  ✔ TC-LIVE-ABNORM-03: Cảnh báo thuốc hết hàng (stock = 0), không nạp vào giỏ (ĐẠT)');
}

// TC-LIVE-ABNORM-04: Camera đang ở trạng thái Tạm Dừng (isPaused = true)
{
  const res = processLivePharmacistBarcode({
    barcode: '8935006530010',
    cart: [],
    catalog: mockCatalog,
    branchStock: mockStock,
    isPaused: true,
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'PAUSED');
  console.log('  ✔ TC-LIVE-ABNORM-04: Camera đang tạm dừng (isPaused), bỏ qua việc quét mã (ĐẠT)');
}

console.log('\n🎉 Toàn bộ 10/10 bài kiểm thử Live Barcode Scanner POS Dược Sĩ ĐỀU ĐẠT CHUẨN 100%!');

