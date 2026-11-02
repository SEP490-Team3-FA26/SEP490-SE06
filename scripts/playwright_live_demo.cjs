// =========================================================================
// KỊCH BẢN TỰ ĐỘNG HÓA PLAYWRIGHT TRỰC TIẾP TRÊN MÀN HÌNH (HEADED MODE)
// Tác vụ: Trình diễn 2 Business Flow thực tế trên https://abcpharmacy.store
// =========================================================================

const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('🚀 [Playwright] Khởi chạy Microsoft Edge trực tiếp trên màn hình của anh yêu...');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: false, // Mở trình duyệt thật để anh yêu quan sát trực tiếp
    slowMo: 450,     // Giảm tốc độ thao tác vừa phải để dễ theo dõi
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null // Tận dụng tối đa độ phân giải màn hình thật
  });

  // Thiết lập cookie phiên để đảm bảo không bao giờ bị văng phiên
  await context.addCookies([
    { name: 'abc_session_active', value: '1', domain: 'abcpharmacy.store', path: '/' },
    { name: 'abc_session_active', value: '1', domain: '.abcpharmacy.store', path: '/' }
  ]);

  const page = await context.newPage();

  // =========================================================================
  // BƯỚC 1: ĐĂNG NHẬP VỚI TÀI KHOẢN ADMIN TỔNG
  // =========================================================================
  console.log('👉 [Bước 1/6] Mở trang đăng nhập: https://abcpharmacy.store/auth/login');
  await page.goto('https://abcpharmacy.store/auth/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Chọn role "Admin Tổng" nếu có trên giao diện
  const adminRoleCard = page.locator('text=Admin Tổng').first();
  if (await adminRoleCard.isVisible()) {
    console.log('   🖱️ Click chọn vai trò "Admin Tổng"');
    await adminRoleCard.click();
    await page.waitForTimeout(600);
  }

  // Nhấn nút "Truy cập hệ thống"
  console.log('   🔐 Nhấn nút "Truy cập hệ thống" để đăng nhập...');
  const submitBtn = page.locator('button:has-text("Truy cập hệ thống"), button[type="submit"]').first();
  await submitBtn.click();

  // Chờ điều hướng vào trang quản trị /admin
  await page.waitForURL('**/admin**', { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  console.log('   ✅ Đăng nhập thành công! Đã vào trang Quản trị Hệ thống.');
  await page.waitForTimeout(2000);

  // =========================================================================
  // BƯỚC 2: QUAN SÁT DASHBOARD TỔNG QUAN HỆ THỐNG
  // =========================================================================
  console.log('👉 [Bước 2/6] Quan sát Dashboard Tổng quan Chuỗi ABC Pharmacy (/admin)');
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy({ top: -350, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // =========================================================================
  // BƯỚC 3: FLOW 2 - THIẾT LẬP & MỞ CHI NHÁNH MỚI (/admin/branches)
  // =========================================================================
  console.log('👉 [Bước 3/6] Mở trang Quản trị Chi nhánh (/admin/branches) - Flow 2');
  await page.goto('https://abcpharmacy.store/admin/branches', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Thử nghiệm ô tìm kiếm chi nhánh
  const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
  if (await searchInput.isVisible()) {
    console.log('   🔍 Gõ tìm kiếm chi nhánh: "Quận 1"');
    await searchInput.fill('Quận 1');
    await page.waitForTimeout(1500);
    console.log('   🧹 Xóa bộ lọc tìm kiếm để xem toàn bộ 5 chi nhánh đạt chuẩn GPP');
    await searchInput.fill('');
    await page.waitForTimeout(1000);
  }

  // Cuộn xem danh sách các cơ sở bán lẻ trong chuỗi
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy({ top: -400, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // =========================================================================
  // BƯỚC 4: FLOW 2 - BẢNG GIÁ CHUẨN ĐỒNG BỘ CHI NHÁNH MỚI (/admin/pricing)
  // =========================================================================
  console.log('👉 [Bước 4/6] Mở trang Quản lý Bảng giá chuẩn chuỗi (/admin/pricing) - Flow 2');
  await page.goto('https://abcpharmacy.store/admin/pricing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy({ top: -350, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // =========================================================================
  // BƯỚC 5: FLOW 1 - THEO DÕI HẠN DÙNG LÔ THUỐC FEFO 3 MÀU (/admin/lot-tracking)
  // =========================================================================
  console.log('👉 [Bước 5/6] Mở trang Theo dõi Lô thuốc & FEFO 3 màu (/admin/lot-tracking) - Flow 1');
  await page.goto('https://abcpharmacy.store/admin/lot-tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('   🏷️ Kiểm tra 3 ngưỡng cảnh báo FEFO: Vàng (60-90d), Cam (30-60d), Đỏ (<30d/Hết hạn)');
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollBy({ top: -350, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // =========================================================================
  // BƯỚC 6: FLOW 1 - PHIẾU XUẤT HỦY KHO DƯỢC PHẨM (/admin/inventory/dispose)
  // =========================================================================
  console.log('👉 [Bước 6/6] Mở trang Lịch sử & Phiếu Xuất Hủy Dược phẩm (/admin/inventory/dispose) - Flow 1');
  await page.goto('https://abcpharmacy.store/admin/inventory/dispose', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('   📋 Xem biên bản hội đồng kiểm kê, đơn vị xử lý rác y tế và hạch toán hao hụt trừ kho');
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2500);

  console.log('\n🎉 HOÀN THÀNH TOÀN BỘ KỊCH BẢN DEMO PLAYWRIGHT TRỰC TIẾP!');
  console.log('   Giữ màn hình thêm 5 giây để anh yêu quan sát trước khi đóng...');
  await page.waitForTimeout(5000);

  await browser.close();
  console.log('👋 Đã đóng trình duyệt Playwright an toàn!');
})();
