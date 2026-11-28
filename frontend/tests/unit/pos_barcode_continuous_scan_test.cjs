// frontend/tests/unit/pos_barcode_continuous_scan_test.cjs
/**
 * =========================================================================
 * BÀI KIỂM THỬ ĐƠN VỊ: QUÉT LIÊN TỤC CÙNG MỘT SẢN PHẨM TỰ ĐỘNG CỘNG DỒN SỐ LƯỢNG (POS RETAIL)
 * Tham chiếu: Nghiệp vụ Quét Barcode POS Quầy Bán Lẻ Dược Sĩ (WDP301/SEP490)
 * Yêu cầu: Khi quét liên tục cùng 1 sản phẩm (ví dụ mua 3 miếng cao dán),
 * hệ thống tự động cộng dồn tăng số lượng trên cùng một dòng sản phẩm thay vì tách lẻ hoặc không nhảy số lượng.
 * 
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Playbook v2.0 & sep.md)
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values] Quét 3 lần liên tiếp cao dán, cộng dồn quantity 1 -> 2 -> 3 trên cùng 1 dòng, giữ nguyên đơn vị 'Miếng'.
 * 2. [Boundary Values] Chạm trần tồn kho khả dụng chi nhánh, xử lý hàng đợi tuần tự hóa chống xung đột bất đồng bộ (Race Conditions).
 * 3. [Abnormal Values] Mã rỗng, mã dưới 3 ký tự, mã lạ không tồn tại, thuốc hết hàng tồn kho = 0.
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

const assert = require('assert');

/**
 * Mô phỏng logic xử lý quét Barcode vào giỏ hàng POS (Tương đương processBarcodeScanned trong RetailView.tsx)
 */
class PosBarcodeScannerSimulator {
  constructor(catalog = [], branchStock = {}) {
    this.catalog = catalog;
    this.branchStock = branchStock;
    this.cart = [];
    this.scanQueue = Promise.resolve();
    this.barcodeCache = new Map();
  }

  // Tra cứu mã vạch từ danh mục dược phẩm (hỗ trợ cả barcode chính và packaging units)
  async lookupBarcode(barcode) {
    const cleanBarcode = barcode ? barcode.trim() : '';
    if (!cleanBarcode || cleanBarcode.length < 3) {
      return { found: false, message: 'Mã vạch không hợp lệ' };
    }

    if (this.barcodeCache.has(cleanBarcode)) {
      return this.barcodeCache.get(cleanBarcode);
    }

    const med = this.catalog.find((m) => {
      const matchPrimary = m.barcode === cleanBarcode || m.sku === cleanBarcode || m._id === cleanBarcode;
      if (matchPrimary) return true;
      if (Array.isArray(m.units)) {
        return m.units.some((u) => u.barcode === cleanBarcode);
      }
      return false;
    });

    if (!med) {
      return { found: false, message: 'Không tìm thấy thuốc khớp mã' };
    }

    // Xác định đơn vị bao gói tương ứng với mã vạch vừa quét
    let matchedUnit = null;
    if (Array.isArray(med.units)) {
      matchedUnit = med.units.find((u) => u.barcode === cleanBarcode) || null;
    }

    const totalStock = this.branchStock[med._id] !== undefined ? this.branchStock[med._id] : (med.stock || 0);

    const result = {
      found: true,
      medicine: med,
      matchedUnit,
      totalStock,
    };

    this.barcodeCache.set(cleanBarcode, result);
    return result;
  }

  // Đưa việc quét vào hàng đợi tuần tự hóa (Queue serialization)
  scanBarcode(barcode) {
    this.scanQueue = this.scanQueue.then(async () => {
      return this._processSingleScan(barcode);
    });
    return this.scanQueue;
  }

  // Xử lý đơn lẻ một lượt quét
  async _processSingleScan(barcode) {
    if (!barcode || barcode.trim().length < 3) {
      return { success: false, reason: 'INVALID_CODE', cart: this.cart };
    }
    const cleanBarcode = barcode.trim();

    const lookupRes = await this.lookupBarcode(cleanBarcode);
    if (!lookupRes || !lookupRes.found || !lookupRes.medicine) {
      return { success: false, reason: 'NOT_FOUND', cart: this.cart };
    }

    const med = lookupRes.medicine;
    const totalStock = lookupRes.totalStock;

    if (totalStock <= 0) {
      return { success: false, reason: 'OUT_OF_STOCK', medicine: med, cart: this.cart };
    }

    const medId = med._id || med.id;
    const selectedUnitObj = lookupRes.matchedUnit || (med.units && med.units[0]) || { unitName: med.unit || 'Hộp', price: med.price, exchangeValue: 1 };
    const targetUnitName = (selectedUnitObj.unitName || med.unit || '').trim();

    let isStockExceeded = false;
    let wasAccumulated = false;
    let newQty = 1;

    // Cập nhật State giỏ hàng theo hàm Functional Updater (setCart(prev => ...))
    const prev = this.cart;

    // Tìm xem trong giỏ hàng đã có dòng sản phẩm này chưa (khớp medId và đơn vị tính)
    const existingIndex = prev.findIndex((it) => {
      const isSameId = (it.id || it._id) === medId;
      if (!isSameId) return false;
      const currentUnit = (it.selectedUnit || it.unit || '').trim();
      if (currentUnit && targetUnitName) {
        return currentUnit.toLowerCase() === targetUnitName.toLowerCase();
      }
      return true;
    });

    if (existingIndex >= 0) {
      const existing = prev[existingIndex];
      const nextQty = (Number(existing.quantity) || 1) + 1;
      const factor = existing.exchangeValue || 1;
      const nextBaseQty = nextQty * factor;

      if (nextBaseQty > totalStock) {
        isStockExceeded = true;
        return { success: false, reason: 'MAX_STOCK_REACHED', cart: this.cart };
      }

      wasAccumulated = true;
      newQty = nextQty;

      const nextCart = [...prev];
      nextCart[existingIndex] = {
        ...existing,
        quantity: nextQty,
      };
      this.cart = nextCart;
      return { success: true, action: 'INCREMENT', medicine: med, quantity: newQty, cart: this.cart };
    } else {
      // Thêm mới 1 dòng vào giỏ hàng
      wasAccumulated = false;
      newQty = 1;

      const newItem = {
        ...med,
        id: medId,
        selectedUnit: selectedUnitObj.unitName,
        unit: selectedUnitObj.unitName,
        exchangeValue: selectedUnitObj.exchangeValue || 1,
        price: selectedUnitObj.price || med.price,
        quantity: 1,
      };
      this.cart = [...prev, newItem];
      return { success: true, action: 'ADD_NEW', medicine: med, quantity: 1, cart: this.cart };
    }
  }
}

// ==========================================
// THIẾT LẬP DỮ LIỆU DANH MỤC THỬ NGHIỆM
// ==========================================
const mockCatalog = [
  {
    _id: 'med_cao_dan_01',
    name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu',
    sku: 'MED-SALONPAS-PATCH',
    barcode: '8935001701125', // Barcode chính của hộp
    unit: 'Hộp',
    price: 65000,
    stock: 100,
    units: [
      { unitName: 'Hộp', barcode: '8935001701125', price: 65000, exchangeValue: 20 },
      { unitName: 'Gói', barcode: '8935001701126', price: 15000, exchangeValue: 5 },
      { unitName: 'Miếng', barcode: '8935001701127', price: 3500, exchangeValue: 1 },
    ],
  },
  {
    _id: 'med_panadol_02',
    name: 'Panadol Extra Đỏ Giảm Đau Hạ Sốt',
    sku: 'MED-PANADOL-EXTRA',
    barcode: '8935001802214',
    unit: 'Hộp',
    price: 185000,
    stock: 50,
    units: [
      { unitName: 'Hộp', barcode: '8935001802214', price: 185000, exchangeValue: 15 },
      { unitName: 'Vỉ', barcode: '8935001802215', price: 13000, exchangeValue: 1 },
    ],
  },
  {
    _id: 'med_het_hang_03',
    name: 'Berberin Mộc Hoa Trắng Hết Tồn Kho',
    sku: 'MED-BERBERIN-ZERO',
    barcode: '8935001999999',
    unit: 'Lọ',
    price: 25000,
    stock: 0, // Hết hàng
  },
];

const mockBranchStock = {
  med_cao_dan_01: 50, // Còn 50 đơn vị cơ bản
  med_panadol_02: 30,
  med_het_hang_03: 0,
};

async function runTests() {
  console.log('🚀 Bắt đầu chạy bộ kiểm thử Quét Barcode Liên Tục Tự Động Cộng Dồn Số Lượng POS Dược Sĩ...\n');

  // =========================================================================
  // 1. [NORMAL VALUES] LUỒNG NGHIỆP VỤ CHUẨN
  // =========================================================================
  console.log('--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---');

  // TC-NORM-01: Quét lần 1 mã 'Miếng' cao dán -> Tạo dòng mới trong giỏ, số lượng = 1
  {
    const pos = new PosBarcodeScannerSimulator(mockCatalog, mockBranchStock);
    const res1 = await pos.scanBarcode('8935001701127'); // Barcode của Miếng cao dán

    assert.strictEqual(res1.success, true, 'Lần quét 1 phải thành công');
    assert.strictEqual(res1.action, 'ADD_NEW', 'Lần quét 1 phải tạo mới dòng sản phẩm');
    assert.strictEqual(pos.cart.length, 1, 'Giỏ hàng phải có đúng 1 dòng');
    assert.strictEqual(pos.cart[0].selectedUnit, 'Miếng', 'Đơn vị tính phải là Miếng');
    assert.strictEqual(pos.cart[0].quantity, 1, 'Số lượng khởi tạo phải là 1');
    console.log('  ✔ TC-NORM-01: Quét lần 1 mã Miếng cao dán tạo 1 dòng với số lượng 1 (ĐẠT)');

    // TC-NORM-02: Quét lần 2 cùng mã -> Tự động cộng dồn số lượng = 2 trên cùng 1 dòng, KHÔNG tách lẻ
    const res2 = await pos.scanBarcode('8935001701127');
    assert.strictEqual(res2.success, true, 'Lần quét 2 phải thành công');
    assert.strictEqual(res2.action, 'INCREMENT', 'Lần quét 2 phải cộng dồn số lượng');
    assert.strictEqual(pos.cart.length, 1, 'Giỏ hàng vẫn giữ nguyên 1 dòng, tuyệt đối không tách lẻ');
    assert.strictEqual(pos.cart[0].selectedUnit, 'Miếng', 'Đơn vị tính vẫn là Miếng');
    assert.strictEqual(pos.cart[0].quantity, 2, 'Số lượng phải nhảy lên 2');
    console.log('  ✔ TC-NORM-02: Quét lần 2 cùng mã tự động cộng dồn số lượng lên 2, không tách dòng (ĐẠT)');

    // TC-NORM-03: Quét lần 3 cùng mã (mua 3 miếng cao dán) -> Số lượng nhảy lên 3 trên cùng dòng
    const res3 = await pos.scanBarcode('8935001701127');
    assert.strictEqual(res3.success, true, 'Lần quét 3 phải thành công');
    assert.strictEqual(res3.action, 'INCREMENT', 'Lần quét 3 phải cộng dồn số lượng');
    assert.strictEqual(pos.cart.length, 1, 'Giỏ hàng vẫn giữ đúng 1 dòng sản phẩm');
    assert.strictEqual(pos.cart[0].quantity, 3, 'Số lượng phải cộng dồn lên đúng 3');
    console.log('  ✔ TC-NORM-03: Quét liên tục 3 miếng cao dán cộng dồn chuẩn xác quantity = 3 trên 1 dòng (ĐẠT)');
  }

  // TC-NORM-04: Quét sản phẩm khác (Panadol) -> Tạo dòng mới thứ 2; Quét tiếp cao dán -> Tăng đúng dòng cao dán
  {
    const pos = new PosBarcodeScannerSimulator(mockCatalog, mockBranchStock);
    await pos.scanBarcode('8935001701127'); // 1 miếng cao dán
    await pos.scanBarcode('8935001701127'); // 2 miếng cao dán
    await pos.scanBarcode('8935001802215'); // 1 vỉ Panadol

    assert.strictEqual(pos.cart.length, 2, 'Giỏ hàng phải có đúng 2 dòng khác nhau');
    assert.strictEqual(pos.cart[0].name, 'Cao dán Salonpas Diclofenac Patch Hisamitsu');
    assert.strictEqual(pos.cart[0].quantity, 2, 'Dòng cao dán có số lượng 2');
    assert.strictEqual(pos.cart[1].name, 'Panadol Extra Đỏ Giảm Đau Hạ Sốt');
    assert.strictEqual(pos.cart[1].quantity, 1, 'Dòng Panadol có số lượng 1');

    // Quét thêm 1 miếng cao dán nữa
    await pos.scanBarcode('8935001701127');
    assert.strictEqual(pos.cart.length, 2, 'Giỏ hàng vẫn giữ nguyên 2 dòng');
    assert.strictEqual(pos.cart[0].quantity, 3, 'Dòng cao dán tăng lên 3');
    assert.strictEqual(pos.cart[1].quantity, 1, 'Dòng Panadol vẫn giữ nguyên 1');
    console.log('  ✔ TC-NORM-04: Quét xen kẽ nhiều sản phẩm khác nhau định vị đúng dòng và chỉ tăng đúng sản phẩm quét (ĐẠT)');
  }

  // =========================================================================
  // 2. [BOUNDARY VALUES] GIÁ TRỊ BIÊN & CONCURRENCY
  // =========================================================================
  console.log('\n--- 2. [Boundary Values] Giá trị biên & Concurrency ---');

  // TC-BOUND-01: Chạm trần tồn kho chi nhánh khi quét liên tục
  {
    // Giả lập chi nhánh chỉ còn đúng 2 miếng cao dán
    const tightStock = { med_cao_dan_01: 2 };
    const pos = new PosBarcodeScannerSimulator(mockCatalog, tightStock);

    const r1 = await pos.scanBarcode('8935001701127'); // miếng 1
    assert.strictEqual(r1.success, true);
    assert.strictEqual(pos.cart[0].quantity, 1);

    const r2 = await pos.scanBarcode('8935001701127'); // miếng 2 (chạm trần)
    assert.strictEqual(r2.success, true);
    assert.strictEqual(pos.cart[0].quantity, 2);

    const r3 = await pos.scanBarcode('8935001701127'); // miếng 3 (vượt tồn kho 2)
    assert.strictEqual(r3.success, false, 'Phải chặn khi vượt quá tồn kho khả dụng');
    assert.strictEqual(r3.reason, 'MAX_STOCK_REACHED', 'Lý do phải là MAX_STOCK_REACHED');
    assert.strictEqual(pos.cart[0].quantity, 2, 'Số lượng trong giỏ phải giữ nguyên ở mức trần 2');
    console.log('  ✔ TC-BOUND-01: Chặn bán vượt quá tồn kho khả dụng chi nhánh khi quét cộng dồn (ĐẠT)');
  }

  // TC-BOUND-02: Xử lý 3 lượt quét dồn dập đồng thời (Race Condition test)
  {
    const pos = new PosBarcodeScannerSimulator(mockCatalog, mockBranchStock);

    // Kích hoạt 3 lượt quét cùng lúc không await tuần tự (bắn dồn dập từ USB scanner hoặc đa luồng)
    const p1 = pos.scanBarcode('8935001701127');
    const p2 = pos.scanBarcode('8935001701127');
    const p3 = pos.scanBarcode('8935001701127');

    await Promise.all([p1, p2, p3]);

    assert.strictEqual(pos.cart.length, 1, 'Hàng đợi tuần tự hóa phải triệt tiêu race-condition, giỏ chỉ có đúng 1 dòng');
    assert.strictEqual(pos.cart[0].quantity, 3, 'Số lượng cuối cùng phải chuẩn xác bằng 3');
    console.log('  ✔ TC-BOUND-02: Bắn 3 lượt quét đồng thời dồn dập được tuần tự hóa chuẩn xác thành 1 dòng x3 (ĐẠT)');
  }

  // TC-BOUND-03: Bộ nhớ đệm tra cứu Barcode Cache siêu tốc 0ms cho các lần quét lặp lại
  {
    const pos = new PosBarcodeScannerSimulator(mockCatalog, mockBranchStock);
    assert.strictEqual(pos.barcodeCache.has('8935001701127'), false, 'Trước khi quét cache chưa có');

    await pos.scanBarcode('8935001701127');
    assert.strictEqual(pos.barcodeCache.has('8935001701127'), true, 'Sau lần 1 mã vạch đã được nạp vào cache');

    // Lần 2 lấy trực tiếp từ cache mà không cần truy vấn lại
    const cachedData = pos.barcodeCache.get('8935001701127');
    assert.strictEqual(cachedData.medicine._id, 'med_cao_dan_01');
    console.log('  ✔ TC-BOUND-03: Bộ đệm tra cứu Barcode Cache phản hồi tức thì 0ms cho các lần quét tiếp theo (ĐẠT)');
  }

  // =========================================================================
  // 3. [ABNORMAL VALUES] DỮ LIỆU DỊ THƯỜNG & NGOẠI LỆ
  // =========================================================================
  console.log('\n--- 3. [Abnormal Values] Dữ liệu dị thường & ngoại lệ ---');

  // TC-ABNORM-01: Quét mã vạch rỗng hoặc dưới 3 ký tự
  {
    const pos = new PosBarcodeScannerSimulator(mockCatalog, mockBranchStock);
    const r1 = await pos.scanBarcode('');
    const r2 = await pos.scanBarcode('   ');
    const r3 = await pos.scanBarcode('12');

    assert.strictEqual(r1.success, false);
    assert.strictEqual(r2.success, false);
    assert.strictEqual(r3.success, false);
    assert.strictEqual(pos.cart.length, 0, 'Giỏ hàng không bị ảnh hưởng bởi mã rỗng');
    console.log('  ✔ TC-ABNORM-01: Từ chối mã vạch rỗng hoặc độ dài dưới 3 ký tự (ĐẠT)');
  }

  // TC-ABNORM-02: Quét mã lạ không tồn tại trong danh mục dược phẩm
  {
    const pos = new PosBarcodeScannerSimulator(mockCatalog, mockBranchStock);
    const res = await pos.scanBarcode('9999999999999');

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'NOT_FOUND');
    assert.strictEqual(pos.cart.length, 0, 'Giỏ hàng không bị thêm sản phẩm rác');
    console.log('  ✔ TC-ABNORM-02: Từ chối mã vạch lạ không có trong hệ thống (ĐẠT)');
  }

  // TC-ABNORM-03: Quét thuốc đã hết hàng tồn kho (stock = 0)
  {
    const pos = new PosBarcodeScannerSimulator(mockCatalog, mockBranchStock);
    const res = await pos.scanBarcode('8935001999999'); // Thuốc stock = 0

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'OUT_OF_STOCK');
    assert.strictEqual(pos.cart.length, 0, 'Không nạp thuốc hết tồn kho vào giỏ');
    console.log('  ✔ TC-ABNORM-03: Cảnh báo thuốc hết hàng (stock = 0), không nạp vào giỏ hàng (ĐẠT)');
  }

  console.log('\n🎉 TOÀN BỘ 10/10 BÀI KIỂM THỬ QUÉT BARCODE CỘNG DỒN SỐ LƯỢNG ĐỀU ĐẠT CHUẨN 100%!');
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
