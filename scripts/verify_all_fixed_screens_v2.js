/**
 * verify_all_fixed_screens_v2.js
 * Kiểm chứng tự động toàn bộ màn hình sau khi fix trên docs/mobile_v2/index.html bằng Playwright
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const path = require('path');

(async () => {
  console.log('🚀 Khởi chạy Playwright để kiểm chứng docs/mobile_v2/index.html...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });
  const page = await context.newPage();

  const fileUrl = 'file://' + path.resolve('docs/mobile_v2/index.html');
  console.log('🌐 Đang tải trang gallery:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Chụp tổng quan thư viện màn hình Gallery
  await page.screenshot({ path: 'docs/mobile_v2/verified_gallery_full.png' });
  console.log('📸 [1/5] Đã lưu verified_gallery_full.png');

  // 2. Kiểm tra màn hình Nghỉ Phép & Nghỉ Ca (Auth Blue)
  console.log('🔍 [2/5] Kiểm tra màn hình Nghỉ Phép (user_profile_leave)...');
  await page.evaluate(() => {
    if (typeof window.selectScreenById === 'function') {
      window.selectScreenById('user_profile_leave');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/mobile_v2/verified_leave_modal_blue.png' });
  console.log('📸 [2/5] Đã lưu verified_leave_modal_blue.png');

  // 3. Kiểm tra màn hình Đổi Ca Chéo Chi Nhánh (Tìm kiếm đồng nghiệp & Lọc vai trò)
  console.log('🔍 [3/5] Kiểm tra màn hình Đổi Ca (pharmacist_swap_modal)...');
  await page.evaluate(() => {
    if (typeof window.selectScreenById === 'function') {
      window.selectScreenById('pharmacist_swap_modal');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/mobile_v2/verified_swap_modal_search.png' });
  console.log('📸 [3/5] Đã lưu verified_swap_modal_search.png');

  // 4. Kiểm tra Trung Tâm Điều Hành Ban Giám Đốc (user_profile_main)
  console.log('🔍 [4/5] Kiểm tra màn hình Giám Đốc (user_profile_main)...');
  await page.evaluate(() => {
    if (typeof window.selectScreenById === 'function') {
      window.selectScreenById('user_profile_main');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/mobile_v2/verified_director_hub.png' });
  console.log('📸 [4/5] Đã lưu verified_director_hub.png');

  // 5. Kiểm tra Modal Chi Tiết Duyệt PO (director_po_detail_modal)
  console.log('🔍 [5/5] Kiểm tra màn hình Duyệt PO (director_po_detail_modal)...');
  await page.evaluate(() => {
    if (typeof window.selectScreenById === 'function') {
      window.selectScreenById('director_po_detail_modal');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/mobile_v2/verified_director_po_detail.png' });
  console.log('📸 [5/5] Đã lưu verified_director_po_detail.png');

  await browser.close();
  console.log('🎉 Hoàn tất toàn bộ quy trình kiểm chứng Playwright trên docs/mobile_v2/index.html!');
})();

