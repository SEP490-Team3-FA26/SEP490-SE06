/**
 * feature_labels_standardization_test.cjs
 * Bộ kiểm thử xác minh toàn bộ tên chức năng trên Web & Mobile đã được chuẩn hóa sang
 * Tiếng Việt nghiệp vụ dễ hiểu, sẵn sàng đưa vào sử dụng thực tế (loại bỏ các tên kỹ thuật AI/OCR/IoT/STT/SBA...).
 * Tuân thủ Test-Coupled Mandate: Đủ 3 nhóm [Normal Values], [Boundary Values], [Abnormal Values].
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relPath) => fs.readFileSync(path.join(repoRoot, relPath), 'utf8');

const adminLayout = read('frontend/src/layouts/AdminLayout.tsx');
const directorLayout = read('frontend/src/layouts/DirectorLayout.tsx');
const warehouseLayout = read('frontend/src/layouts/WarehouseLayout.tsx');
const pharmacistLayout = read('frontend/src/layouts/PharmacistLayout.tsx');
const branchLayout = read('frontend/src/layouts/BranchLayout.tsx');
const headerUi = read('frontend/src/components/ui/Header.tsx');
const salesPage = read('frontend/src/pages/pharmacist/Sales.tsx');
const retailView = read('frontend/src/pages/pharmacist/components/RetailView.tsx');
const ocrHistory = read('frontend/src/pages/pharmacist/components/OcrHistoryView.tsx');
const voiceHistory = read('frontend/src/pages/pharmacist/components/VoiceConsultationHistoryView.tsx');
const aiForecast = read('frontend/src/components/common/AIForecast.tsx');
const aiInsights = read('frontend/src/components/common/AIInsights.tsx');
const rfqMgmt = read('frontend/src/pages/admin/RFQManagement.tsx');
const mobileWarehouse = read('mobile/src/screens/warehouse/WarehouseScreen.tsx');
const mobilePharmacist = read('mobile/src/screens/pharmacist/PharmacistScreen.tsx');
const mobileAdmin = read('mobile/src/screens/admin/AdminScreen.tsx');
const mobileCustomer = read('mobile/src/screens/customer/CustomerScreen.tsx');

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

console.log('\n🏷️ [Unit Test] Chuẩn Hóa Tên Chức Năng Web & Mobile (User-Friendly Naming)\n');

// 1. [Normal Values]
runTest('[Normal Values] TC-LBL-01: Sidebar 5 vai trò Web sử dụng tên chức năng Tiếng Việt nghiệp vụ chuẩn', () => {
  assert(adminLayout.includes('Khuyến mãi & Mã giảm giá'));
  assert(adminLayout.includes('Mời báo giá Nhà cung cấp'));
  assert(adminLayout.includes('Nhật ký hoạt động'));

  assert(directorLayout.includes('Dự báo nhu cầu nhập hàng'));
  assert(directorLayout.includes('Trợ lý phân tích kinh doanh'));
  assert(directorLayout.includes('Điều phối chuỗi cung ứng'));

  assert(warehouseLayout.includes('Quản lý Kho tổng'));
  assert(warehouseLayout.includes('Giám sát Nhiệt độ & Độ ẩm kho'));
  assert(warehouseLayout.includes('Truy xuất nguồn gốc Lô thuốc'));
  assert(warehouseLayout.includes('Danh mục dùng chung'));

  assert(pharmacistLayout.includes('Bán hàng tại quầy'));
  assert(pharmacistLayout.includes('Lịch sử đọc đơn thuốc'));
  assert(pharmacistLayout.includes('Lịch sử ghi âm tư vấn'));
  assert(branchLayout.includes('Hiệu suất bán hàng'));
});

runTest('[Normal Values] TC-LBL-02: Tab bán hàng Dược sĩ, Header & các trang phân tích dùng ngôn ngữ thân thiện thực tế', () => {
  assert(salesPage.includes('Bán lẻ tại quầy'));
  assert(salesPage.includes('Bán thuốc theo đơn'));
  assert(salesPage.includes('Lịch sử đọc đơn thuốc'));
  assert(retailView.includes('Ghi âm tư vấn khách'));
  assert(retailView.includes('Kiểm soát mã ưu đãi'));
  assert(aiForecast.includes('Dự Báo Nhu Cầu Nhập Hàng Theo Kỳ'));
  assert(aiForecast.includes('Cập Nhật Dự Báo Mới'));
  assert(aiInsights.includes('Trợ Lý Phân Tích Kinh Doanh & Kho Vận'));
  assert(rfqMgmt.includes('Mời Báo Giá Nhà Cung Cấp'));
  assert(headerUi.includes('Giám sát nhiệt độ & độ ẩm kho'));
});

runTest('[Normal Values] TC-LBL-03: Các màn hình Mobile chuẩn hóa sang tên chức năng dễ hiểu', () => {
  assert(mobileWarehouse.includes('Dự Báo Nhập'));
  assert(mobileWarehouse.includes('Kiểm Đếm Bằng Camera'));
  assert(mobileWarehouse.includes('Kết Quả Kiểm Đếm Tự Động'));
  assert(mobilePharmacist.includes('Đọc Đơn Thuốc'));
  assert(mobileAdmin.includes('Quản Trị Hệ Thống'));
  assert(mobileAdmin.includes('Nhật Ký'));
  assert(mobileCustomer.includes('Tư vấn Dược sĩ 24/7'));
});

// 2. [Boundary Values]
runTest('[Boundary Values] TC-LBL-04: Toàn bộ đường dẫn route href trong Sidebar vẫn được bảo toàn nguyên vẹn (không làm hỏng điều hướng)', () => {
  assert(directorLayout.includes('/director/ai-forecast'));
  assert(directorLayout.includes('/director/ai-insights'));
  assert(warehouseLayout.includes('/warehouse/inventory/telemetry'));
  assert(pharmacistLayout.includes('/pharmacist/ocr-history'));
  assert(pharmacistLayout.includes('/pharmacist/ai-consultation'));
  assert(adminLayout.includes('/admin/rfq'));
});

// 3. [Abnormal Values]
runTest('[Abnormal Values] TC-LBL-05: Không còn thuật ngữ kỹ thuật/nội bộ gây khó hiểu cho người dùng cuối', () => {
  const forbiddenInLayouts = [
    'AI Insights',
    'Dự báo Nhu cầu (AI)',
    'Tư Vấn Giọng Nói AI',
    'Lịch Sử Quét OCR',
    'IoT Tracking',
    'Quản lý dữ liệu (Master)',
    'Audit Logs',
    'Real-time',
  ];
  const combinedLayouts = [adminLayout, directorLayout, warehouseLayout, pharmacistLayout, branchLayout].join('\n');
  for (const term of forbiddenInLayouts) {
    assert(!combinedLayouts.includes(term), `Vẫn còn nhãn kỹ thuật "${term}" trong Sidebar Layout`);
  }

  assert(!aiInsights.includes('RTX 3050 GPU'), 'Còn chữ kỹ thuật RTX 3050 GPU trên giao diện AIInsights');
  assert(!aiForecast.includes('Đang Train GPU'), 'Còn chữ kỹ thuật Train GPU trên giao diện AIForecast');
  assert(!retailView.includes('Bảo mật Rủi ro 7 SBA'), 'Còn nhãn nội bộ SBA trên giao diện bán hàng');
  assert(!ocrHistory.includes('UC-69'), 'Còn mã tài liệu UC-69 trên giao diện OcrHistoryView');
  assert(!voiceHistory.includes('UC-70'), 'Còn mã tài liệu UC-70 trên giao diện VoiceConsultationHistoryView');
  assert(!voiceHistory.includes('Whisper STT'), 'Còn tên thuật toán Whisper STT trên giao diện VoiceConsultationHistoryView');
  assert(!mobileWarehouse.includes('Kiểm Định AI Vision'), 'Còn nhãn AI Vision trên giao diện Mobile Warehouse');
  assert(!mobilePharmacist.includes('Quét Đơn OCR'), 'Còn nhãn OCR trên tab Mobile Pharmacist');
});

console.log(`\n📊 Kết quả: ${passed}/${passed + failed} tests PASS`);
if (failed > 0) {
  process.exit(1);
}
