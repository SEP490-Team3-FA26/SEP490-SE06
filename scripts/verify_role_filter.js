/**
 * Verification script for Role Filter System in docs/mobile_v2/index.html using Playwright
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });
  const page = await context.newPage();

  const fileUrl = 'file://' + path.resolve('docs/mobile_v2/index.html');
  console.log('🌐 Đang tải trang:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Kiểm tra sự hiện diện của Role Filter Bar
  const roleFilterBar = await page.$('#roleFilterBar');
  if (!roleFilterBar) {
    throw new Error('❌ Không tìm thấy #roleFilterBar!');
  }
  console.log('✅ Đã tìm thấy #roleFilterBar trên giao diện');

  // 2. Đếm số lượng pill trên Role Filter Bar
  const pills = await page.$$('.role-pill');
  console.log(`✅ Số lượng role pills hiển thị: ${pills.length} (Kỳ vọng: 8)`);
  if (pills.length !== 8) {
    throw new Error(`❌ Kỳ vọng 8 role pills nhưng có ${pills.length}!`);
  }

  // 3. Chuyển sang chế độ Lưới Figma
  console.log('🔲 Chuyển sang chế độ Lưới Figma...');
  await page.click('#btn-toggle-grid');
  await page.waitForTimeout(500);

  // Chụp ảnh toàn bộ lưới ở trạng thái "Tất cả"
  await page.screenshot({ path: 'docs/mobile_v2/verified_role_filter_grid_all.png' });
  console.log('📸 Đã lưu verified_role_filter_grid_all.png');

  // 4. Lọc vai trò Dược Sĩ (Pharmacist)
  console.log('💊 Nhấp chọn bộ lọc Dược Sĩ POS (pharmacist)...');
  await page.click('.role-pill[data-role="pharmacist"]');
  await page.waitForTimeout(500);

  const pharmacistCards = await page.$$('.grid-card');
  console.log(`✅ Số lượng thẻ hiển thị cho Dược Sĩ: ${pharmacistCards.length} (Kỳ vọng: 16)`);
  if (pharmacistCards.length !== 16) {
    throw new Error(`❌ Kỳ vọng 16 thẻ dược sĩ nhưng có ${pharmacistCards.length}!`);
  }

  await page.screenshot({ path: 'docs/mobile_v2/verified_role_filter_grid_pharmacist.png' });
  console.log('📸 Đã lưu verified_role_filter_grid_pharmacist.png');

  // 5. Lọc vai trò Thủ Kho (Warehouse)
  console.log('📦 Nhấp chọn bộ lọc Thủ Kho GSP (warehouse)...');
  await page.click('.role-pill[data-role="warehouse"]');
  await page.waitForTimeout(500);

  const warehouseCards = await page.$$('.grid-card');
  console.log(`✅ Số lượng thẻ hiển thị cho Thủ Kho: ${warehouseCards.length} (Kỳ vọng: 12)`);
  if (warehouseCards.length !== 12) {
    throw new Error(`❌ Kỳ vọng 12 thẻ thủ kho nhưng có ${warehouseCards.length}!`);
  }

  await page.screenshot({ path: 'docs/mobile_v2/verified_role_filter_grid_warehouse.png' });
  console.log('📸 Đã lưu verified_role_filter_grid_warehouse.png');

  // 6. Nhấp lại "Tất cả" để xác nhận khôi phục
  console.log('🌟 Nhấp chọn bộ lọc Tất Cả (all)...');
  await page.click('.role-pill[data-role="all"]');
  await page.waitForTimeout(500);

  const allCards = await page.$$('.grid-card');
  console.log(`✅ Số lượng thẻ hiển thị khi chọn Tất cả: ${allCards.length} (Kỳ vọng: 70)`);
  if (allCards.length !== 70) {
    throw new Error(`❌ Kỳ vọng 70 thẻ nhưng có ${allCards.length}!`);
  }

  // 7. Nhấp vào 1 card để mở chế độ Sân Khấu (Stage View)
  console.log('📱 Chọn 1 card để quay về Sân Khấu Stage View...');
  await page.click('.grid-card:first-child');
  await page.waitForTimeout(500);

  const stageRoleTag = await page.$eval('#stage-screen-role', el => el.textContent.trim());
  console.log(`✅ Role Tag trên Sân Khấu: "${stageRoleTag}"`);

  await page.screenshot({ path: 'docs/mobile_v2/verified_role_filter_stage_view.png' });
  console.log('📸 Đã lưu verified_role_filter_stage_view.png');

  console.log('🎉 Toàn bộ bài kiểm tra xác minh Role Filter ĐẠT 100%!');
  await browser.close();
})();
