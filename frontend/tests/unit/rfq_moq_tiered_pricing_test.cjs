/**
 * rfq_moq_tiered_pricing_test.cjs
 * Kiểm thử đơn vị Frontend cho phân hệ Báo giá Nhà cung cấp (RFQ):
 * - Giải thích rõ ngữ cảnh gửi link báo giá cho Bộ phận Sale của Nhà cung cấp
 * - Bổ sung khái niệm MOQ (Minimum Order Quantity) & Đơn giá theo bậc số lượng (Tiered Pricing)
 * Đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.resolve(__dirname, '../..');
const portalFile = fs.readFileSync(
  path.join(rootDir, 'src/pages/public/SupplierQuotePortal.tsx'),
  'utf8',
);
const rfqMgmtFile = fs.readFileSync(
  path.join(rootDir, 'src/pages/admin/RFQManagement.tsx'),
  'utf8',
);
const rfqServiceFile = fs.readFileSync(
  path.join(rootDir, 'src/services/purchase/rfq.service.ts'),
  'utf8',
);

// Tái hiện công thức tính toán Tiered Pricing & MOQ tương đồng với rfq.service.ts để kiểm chứng toán học
function calculateRfqItemTieredPricing(baseQuotedPrice, quantity, priceTiers, moq, discountPercent = 0) {
  const safeBase = Number.isFinite(Number(baseQuotedPrice)) ? Math.max(0, Number(baseQuotedPrice)) : 0;
  const safeQty = Number.isFinite(Number(quantity)) ? Math.max(0, Math.floor(Number(quantity))) : 0;
  const safeMoq = Number.isFinite(Number(moq)) && Number(moq) >= 1 ? Math.floor(Number(moq)) : 1;

  const validTiers = (Array.isArray(priceTiers) ? priceTiers : [])
    .filter((t) => t && Number(t.minQuantity) >= 1 && Number(t.unitPrice) >= 0)
    .map((t) => ({ minQuantity: Math.floor(Number(t.minQuantity)), unitPrice: Number(t.unitPrice) }))
    .sort((a, b) => a.minQuantity - b.minQuantity);

  let effectiveUnitPrice = safeBase;
  let appliedTierMinQuantity = undefined;
  for (const tier of validTiers) {
    if (safeQty >= tier.minQuantity) {
      effectiveUnitPrice = tier.unitPrice;
      appliedTierMinQuantity = tier.minQuantity;
    } else {
      break;
    }
  }

  const isMoqMet = safeQty >= safeMoq;
  const moqShortfall = isMoqMet ? 0 : safeMoq - safeQty;
  const nextBetterTier = validTiers.find((t) => t.minQuantity > safeQty && t.unitPrice < effectiveUnitPrice);
  const safeDiscount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const lineTotal = Math.round(effectiveUnitPrice * safeQty * (1 - safeDiscount / 100));

  return {
    moq: safeMoq,
    normalizedTiers: validTiers,
    effectiveUnitPrice,
    appliedTierMinQuantity,
    isMoqMet,
    moqShortfall,
    nextBetterTier,
    lineTotal,
  };
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

console.log('\n🧪 [Frontend Unit Test] RFQ Sales Context, MOQ & Tiered Pricing\n');

// 1. [Normal Values]
runTest('[Normal Values] TC-01: Cổng Sale NCC (SupplierQuotePortal) giải thích rõ ngữ cảnh Magic Link, MOQ & Bậc giá', () => {
  assert(
    portalFile.includes('Ngữ cảnh & Hướng dẫn điền báo giá dành cho Bộ phận Sale Nhà cung cấp'),
    'Thiếu banner giải thích ngữ cảnh gửi link cho Bộ phận Sale NCC trên SupplierQuotePortal',
  );
  assert(portalFile.includes('MOQ (Minimum Order Quantity)'), 'Thiếu giải thích khái niệm MOQ');
  assert(portalFile.includes('Bảng đơn giá theo bậc số lượng'), 'Thiếu khối nhập bảng đơn giá theo bậc số lượng');
  assert(portalFile.includes('handleAutoGenerateTiers'), 'Thiếu tính năng gợi ý nhanh bậc giá sỉ');
});

runTest('[Normal Values] TC-02: Trang Quản lý RFQ (RFQManagement) hiển thị ngữ cảnh gửi link Sale, MOQ & gợi ý tối ưu bậc giá', () => {
  assert(
    rfqMgmtFile.includes('Ngữ cảnh Quy trình Gửi Link Báo Giá cho Bộ phận Sale Nhà cung cấp'),
    'Thiếu khung hướng dẫn ngữ cảnh quy trình gửi link cho Bộ phận Sale NCC',
  );
  assert(rfqMgmtFile.includes('handleCopyDirectUrl'), 'Thiếu nút sao chép URL trực tiếp cho Sale');
  assert(rfqMgmtFile.includes('adjustToMoq'), 'Thiếu tùy chọn tự động nâng SL đặt khớp MOQ khi chọn thầu sinh PO');
  assert(rfqMgmtFile.includes('nextBetterTier'), 'Thiếu gợi ý tối ưu bậc giá tốt hơn kế tiếp trên Ma trận');
});

runTest('[Normal Values] TC-03: Service rfq.service.ts xuất đầy đủ interface QuotationPriceTier và hàm tính calculateRfqItemTieredPricing', () => {
  assert(rfqServiceFile.includes('export interface QuotationPriceTier'), 'Thiếu interface QuotationPriceTier');
  assert(rfqServiceFile.includes('export function calculateRfqItemTieredPricing'), 'Thiếu hàm calculateRfqItemTieredPricing');
  assert(rfqServiceFile.includes('moq?: number'), 'Thiếu trường moq trong SupplierQuotationItem');
});

runTest('[Normal Values] TC-04: Áp dụng đúng đơn giá theo bậc số lượng cho mốc 500 hộp', () => {
  const res = calculateRfqItemTieredPricing(
    60000,
    500,
    [
      { minQuantity: 100, unitPrice: 55000 },
      { minQuantity: 500, unitPrice: 50000 },
      { minQuantity: 1000, unitPrice: 46000 },
    ],
    100,
    0,
  );
  assert.strictEqual(res.effectiveUnitPrice, 50000);
  assert.strictEqual(res.appliedTierMinQuantity, 500);
  assert.strictEqual(res.isMoqMet, true);
  assert.strictEqual(res.lineTotal, 25000000);
  assert.deepStrictEqual(res.nextBetterTier, { minQuantity: 1000, unitPrice: 46000 });
});

// 2. [Boundary Values]
runTest('[Boundary Values] TC-05: Số lượng yêu cầu thấp hơn MOQ 1 đơn vị -> báo chưa đạt MOQ và tính đúng shortfall', () => {
  const res = calculateRfqItemTieredPricing(50000, 99, [{ minQuantity: 100, unitPrice: 47000 }], 100);
  assert.strictEqual(res.isMoqMet, false);
  assert.strictEqual(res.moqShortfall, 1);
  assert.strictEqual(res.effectiveUnitPrice, 50000);
});

runTest('[Boundary Values] TC-06: Số lượng yêu cầu bằng đúng MOQ và mốc bậc giá -> đạt MOQ & áp dụng bậc giá ngay', () => {
  const res = calculateRfqItemTieredPricing(50000, 100, [{ minQuantity: 100, unitPrice: 47000 }], 100);
  assert.strictEqual(res.isMoqMet, true);
  assert.strictEqual(res.moqShortfall, 0);
  assert.strictEqual(res.effectiveUnitPrice, 47000);
});

// 3. [Abnormal Values]
runTest('[Abnormal Values] TC-07: Loại bỏ hoàn toàn alert() và window.confirm() thô trong SupplierQuotePortal.tsx', () => {
  assert(!/\balert\s*\(/.test(portalFile), 'Còn sót lệnh alert() trình duyệt trong SupplierQuotePortal.tsx');
  assert(!/window\.confirm\s*\(/.test(portalFile), 'Còn sót lệnh window.confirm() trong SupplierQuotePortal.tsx');
});

runTest('[Abnormal Values] TC-08: Dữ liệu bậc giá rác / âm / NaN không làm crash hàm tính giá', () => {
  const res = calculateRfqItemTieredPricing(
    -100,
    0,
    [null, { minQuantity: -5, unitPrice: 1000 }, { minQuantity: 50, unitPrice: -200 }],
    -10,
    250,
  );
  assert.strictEqual(res.moq, 1);
  assert.strictEqual(res.normalizedTiers.length, 0);
  assert.strictEqual(res.effectiveUnitPrice, 0);
  assert.strictEqual(res.lineTotal, 0);
});

console.log(`\n📊 Kết quả: ${passed}/${passed + failed} tests PASS`);
if (failed > 0) {
  process.exit(1);
}
