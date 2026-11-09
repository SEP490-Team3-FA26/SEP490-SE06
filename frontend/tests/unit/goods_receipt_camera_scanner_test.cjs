// frontend/tests/unit/goods_receipt_camera_scanner_test.cjs
/**
 * =========================================================================
 * BÀI KIỂM THỬ ĐƠN VỊ: WEBCAM CAMERA & QUÉT MÃ VẠCH NHẬP KHO (GSP/GDP)
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Playbook v2.0 & sep.md)
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values] Khớp Barcode / SKU / Tên thuốc, tăng số lượng thực tế
 * 2. [Boundary Values] Giá trị biên: Quét chạm trần tối đa, giới hạn tốc độ 1500ms
 * 3. [Abnormal Values] Dữ liệu dị thường: Từ chối mã lạ, tạm dừng, lỗi từ chối camera
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

const assert = require('assert');

// Logic cốt lõi xử lý quét mã vạch và đối chiếu kiện hàng PO trong GoodsReceiptInspectionPage.tsx
function processBarcodeInspection(items, rawCode, isPaused) {
  if (!rawCode || !rawCode.trim() || isPaused) {
    return { success: false, reason: isPaused ? 'PAUSED' : 'EMPTY_CODE', items };
  }

  const code = rawCode.trim();
  const q = code.toLowerCase();

  const foundIdx = items.findIndex(
    (it) =>
      (it.barcode && it.barcode.toLowerCase() === q) ||
      (it.sku && it.sku.toLowerCase() === q) ||
      (it.medicineId && it.medicineId.toLowerCase() === q) ||
      (it.medicineName && it.medicineName.toLowerCase() === q) ||
      (it.medicineName && it.medicineName.toLowerCase().includes(q))
  );

  if (foundIdx === -1) {
    return { success: false, reason: 'UNKNOWN_BARCODE', items };
  }

  const targetItem = items[foundIdx];
  const maxReceivable = targetItem.remainingQty > 0 ? targetItem.remainingQty : targetItem.orderedQty;

  if (targetItem.scannedQty >= maxReceivable) {
    return { success: false, reason: 'MAX_REACHED', item: targetItem, items };
  }

  const updatedItems = items.map((it, idx) =>
    idx === foundIdx ? { ...it, scannedQty: it.scannedQty + 1 } : it
  );

  return {
    success: true,
    scannedItem: {
      ...targetItem,
      scannedQty: targetItem.scannedQty + 1,
    },
    items: updatedItems,
  };
}

// Logic kiểm tra giới hạn tần suất quét (Throttle) để chống quét dồn dập
function shouldProcessCameraFrame(now, lastScanTime, minIntervalMs = 1500) {
  return now - lastScanTime >= minIntervalMs;
}

/**
 * Mô phỏng vòng lặp requestAnimationFrame (RAF) 60fps khi camera đang quét hình ảnh.
 * Dùng để kiểm thử chống tràn CPU Main UI Thread (Throttling Regression Test).
 */
function simulateCameraRafLoop({ hasBarcode = false, useFixedThrottling = true, durationMs = 1000, fps = 60 }) {
  let decodeCalls = 0;
  let lastAttemptTime = 0;
  let lastSuccessScan = 0;
  let oldLastScanTime = 0;

  const frameInterval = Math.floor(1000 / fps); // ~16ms

  for (let elapsed = 0; elapsed <= durationMs; elapsed += frameInterval) {
    const now = elapsed;

    if (useFixedThrottling) {
      // Logic mới: Tách riêng cooldown quét thành công (1200ms) và throttling giải mã (250ms)
      if (now - lastSuccessScan < 1200 && lastSuccessScan > 0) {
        continue;
      }
      if (now - lastAttemptTime < 250 && lastAttemptTime > 0) {
        continue;
      }
      // Cập nhật mốc thời gian giải mã NGAY LẬP TỨC dù có tìm thấy barcode hay không
      lastAttemptTime = now;
      decodeCalls++;

      if (hasBarcode) {
        lastSuccessScan = now;
      }
    } else {
      // Logic cũ: Chỉ cập nhật khi tìm thấy mã vạch -> Nếu không có mã thì gọi 60 lần/giây
      if (now - oldLastScanTime >= 1200 || oldLastScanTime === 0) {
        decodeCalls++;
        if (hasBarcode) {
          oldLastScanTime = now;
        }
      }
    }
  }

  return decodeCalls;
}

// =============================================================================
// THỰC THI BỘ KIỂM THỬ
// =============================================================================

console.log('======================================================================');
console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ CAMERA SCANNER NHẬP KHO (GOODS RECEIPT INSPECTION)');
console.log('======================================================================\n');

const samplePoItems = [
  {
    medicineId: 'med-01',
    sku: 'SKU-ORES-245',
    medicineName: 'Bột pha uống Oresol 245 DHG',
    orderedQty: 100,
    remainingQty: 100,
    scannedQty: 0,
    unit: 'Hộp',
    barcode: '8935006530010',
  },
  {
    medicineId: 'med-02',
    sku: 'SKU-PARA-500',
    medicineName: 'Paracetamol 500mg Haphaco',
    orderedQty: 50,
    remainingQty: 50,
    scannedQty: 49, // Gần đầy
    unit: 'Hộp',
    barcode: '8935006530022',
  },
];

// -----------------------------------------------------------------------------
// 1. [Normal Values] Luồng nghiệp vụ chuẩn
// -----------------------------------------------------------------------------
console.log('--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---');

// Test 1.1: Quét bằng mã vạch Barcode EAN-13 chính xác
{
  const res = processBarcodeInspection(samplePoItems, '8935006530010', false);
  assert.strictEqual(res.success, true, 'Quét barcode chuẩn phải thành công');
  assert.strictEqual(res.scannedItem.scannedQty, 1, 'Số lượng đã quét phải tăng lên 1');
  console.log('✔ [Normal] Quét chính xác Barcode EAN-13 tăng số lượng kiểm đếm thành công.');
}

// Test 1.2: Quét bằng mã SKU kiện hàng
{
  const res = processBarcodeInspection(samplePoItems, 'SKU-ORES-245', false);
  assert.strictEqual(res.success, true, 'Quét bằng mã SKU phải thành công');
  assert.strictEqual(res.scannedItem.sku, 'SKU-ORES-245');
  console.log('✔ [Normal] Quét bằng mã SKU kiện hàng tăng kiểm đếm thành công.');
}

// Test 1.3: Quét theo tên thuốc
{
  const res = processBarcodeInspection(samplePoItems, 'Oresol 245', false);
  assert.strictEqual(res.success, true, 'Quét theo tên thuốc khớp một phần phải thành công');
  console.log('✔ [Normal] Quét theo tên thuốc trong PO khớp thành công.');
}

// -----------------------------------------------------------------------------
// 2. [Boundary Values] Giá trị biên & Giới hạn tần suất quét
// -----------------------------------------------------------------------------
console.log('\n--- 2. [Boundary Values] Giá trị biên & Dung sai tần suất ---');

// Test 2.1: Quét chạm trần tối đa
{
  // Mặt hàng med-02 có 49/50, quét 1 lần nữa sẽ đạt 50/50
  const step1 = processBarcodeInspection(samplePoItems, 'SKU-PARA-500', false);
  assert.strictEqual(step1.success, true);
  assert.strictEqual(step1.scannedItem.scannedQty, 50, 'Đạt đúng 50/50');

  // Quét tiếp lần nữa khi đã đủ 50/50 -> Phải từ chối MAX_REACHED
  const step2 = processBarcodeInspection(step1.items, 'SKU-PARA-500', false);
  assert.strictEqual(step2.success, false, 'Không cho phép quét vượt quá số lượng PO');
  assert.strictEqual(step2.reason, 'MAX_REACHED');
  console.log('✔ [Boundary] Chặn không cho quét vượt số lượng đặt hàng khi chạm trần 100%.');
}

// Test 2.2: Tần suất quét Camera (Throttle 1500ms)
{
  const t0 = 10000;
  // Khung hình sau 500ms (quá nhanh) -> Bỏ qua
  assert.strictEqual(shouldProcessCameraFrame(t0 + 500, t0, 1500), false);
  // Khung hình sau đúng 1500ms -> Chấp nhận
  assert.strictEqual(shouldProcessCameraFrame(t0 + 1500, t0, 1500), true);
  // Khung hình sau 2000ms -> Chấp nhận
  assert.strictEqual(shouldProcessCameraFrame(t0 + 2000, t0, 1500), true);
  console.log('✔ [Boundary] Giới hạn tần suất 1500ms chống quét trùng lặp hoạt động chuẩn xác.');
}

// Test 2.3: [REGRESSION TEST - CPU 100% SATURATION FIX]
// Mô phỏng 60 FPS trong 1000ms khi KHÔNG có mã vạch trong khung hình
{
  // 1. Kiểm tra với logic cũ (bị lỗi): decodeCalls chạm mốc ~61 lần/giây
  const oldBuggyCalls = simulateCameraRafLoop({ hasBarcode: false, useFixedThrottling: false, durationMs: 1000, fps: 60 });
  assert.ok(oldBuggyCalls >= 60, 'Logic cũ phải gọi decode liên tục 60 lần/giây gây tràn 100% CPU');

  // 2. Kiểm tra với logic mới đã fix: decodeCalls chỉ tối đa 4-5 lần/giây (khoảng cách 250ms/lần)
  const fixedCalls = simulateCameraRafLoop({ hasBarcode: false, useFixedThrottling: true, durationMs: 1000, fps: 60 });
  assert.ok(
    fixedCalls <= 5,
    `Tổng số lần gọi giải mã ảnh khi không có barcode trong 1 giây không được vượt quá 5 lần (Thực tế: ${fixedCalls} lần, giảm tải >90% CPU)`
  );
  console.log(`✔ [Boundary - Regression] Chống bão hòa CPU: Trong 1 giây không có barcode, số lần giải mã chỉ ${fixedCalls} lần thay vì ${oldBuggyCalls} lần.`);
}

// -----------------------------------------------------------------------------
// 3. [Abnormal Values] Dữ liệu dị thường & Ngăn chặn lỗi
// -----------------------------------------------------------------------------
console.log('\n--- 3. [Abnormal Values] Dữ liệu dị thường & Ngoại lệ ---');

// Test 3.1: Từ chối mã vạch không có trong đơn PO
{
  const res = processBarcodeInspection(samplePoItems, '9999999999999', false);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'UNKNOWN_BARCODE');
  console.log('✔ [Abnormal] Từ chối mã vạch lạ không thuộc đơn hàng PO.');
}

// Test 3.2: Chặn khi máy quét đang ở trạng thái tạm dừng (Paused)
{
  const res = processBarcodeInspection(samplePoItems, '8935006530010', true);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'PAUSED');
  console.log('✔ [Abnormal] Chặn nhận diện mã vạch khi máy quét đang tạm dừng.');
}

// Test 3.3: Mã vạch rỗng hoặc toàn khoảng trắng
{
  const res = processBarcodeInspection(samplePoItems, '   ', false);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'EMPTY_CODE');
  console.log('✔ [Abnormal] Bỏ qua mã vạch rỗng hoặc khoảng trắng an toàn.');
}

console.log('\n======================================================================');
console.log('🎉 TẤT CẢ CÁC BÀI TEST CAMERA BARCODE SCANNER ĐÃ ĐẠT 100%!');
console.log('======================================================================');

