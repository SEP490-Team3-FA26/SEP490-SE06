/**
 * capture_all_mobile_screens.js
 * Script tự động hóa Playwright để chụp toàn bộ màn hình ứng dụng di động ABC Pharmacy
 * 1. Chụp đồng bộ 100% tất cả các màn hình (Phone Viewport 412x915 & FullPage)
 * 2. Lưu trực tiếp vào thư mục docs/mobile_v2/
 * 3. Tự động cập nhật và sinh lại file docs/mobile_v2/index.html trực quan, sắc nét
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:8086';
const OUT_DIR = path.resolve(__dirname, '../docs/mobile_v2');
const SCREENS_DATA_PATH = path.resolve(__dirname, '../docs/mobile_v2/screens_data.json');

async function captureAllScreens() {
  console.log('🚀 [Playwright Mobile Capture] Bắt đầu quy trình chụp toàn bộ màn hình...');
  
  if (!fs.existsSync(SCREENS_DATA_PATH)) {
    throw new Error(`❌ Không tìm thấy file dữ liệu màn hình: ${SCREENS_DATA_PATH}`);
  }

  const screens = JSON.parse(fs.readFileSync(SCREENS_DATA_PATH, 'utf8'));
  console.log(`📋 Tổng số màn hình cần chụp: ${screens.length}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });

  const startTime = Date.now();
  let completed = 0;
  const CONCURRENCY = 3;

  async function processScreen(screen, workerId) {
    const page = await context.newPage();
    const targetUrl = `${BASE_URL}${screen.url}`;
    const phonePath = path.join(OUT_DIR, screen.phoneImage);
    const fullPath = screen.hasFullPage ? path.join(OUT_DIR, screen.fullImage) : null;

    try {
      // 1. Điều hướng đến màn hình mục tiêu trên Expo Web
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 35000 });
      // Chờ React Native Web hydrate và nạp dữ liệu xong
      await page.waitForTimeout(1000);

      // 2. Chụp khung nhìn điện thoại chuẩn (Phone Viewport)
      await page.screenshot({ path: phonePath });

      // 3. Nếu màn hình hỗ trợ cuộn dài, chụp thêm ảnh FullPage
      if (fullPath && screen.fullImage !== screen.phoneImage) {
        await page.screenshot({ path: fullPath, fullPage: true });
      }

      completed++;
      const percent = Math.round((completed / screens.length) * 100);
      console.log(`[Worker ${workerId}] [${completed}/${screens.length}] (${percent}%) ✅ Đã chụp: ${screen.name} -> ${screen.phoneImage}`);
    } catch (err) {
      console.warn(`[Worker ${workerId}] ⚠️ Thử lại màn hình ${screen.id} do timeout/lỗi: ${err.message}`);
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: phonePath });
        if (fullPath && screen.fullImage !== screen.phoneImage) {
          await page.screenshot({ path: fullPath, fullPage: true });
        }
        completed++;
        console.log(`[Worker ${workerId}] [${completed}/${screens.length}] 🔄 Đã chụp lại thành công: ${screen.name}`);
      } catch (retryErr) {
        console.error(`[Worker ${workerId}] ❌ Không thể chụp ${screen.id}: ${retryErr.message}`);
      }
    } finally {
      await page.close();
    }
  }

  // Chia tải theo pool công việc (Worker Pool Concurrency)
  const queue = [...screens];
  const workers = Array.from({ length: CONCURRENCY }, async (_, workerId) => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        await processScreen(item, workerId + 1);
      }
    }
  });

  await Promise.all(workers);
  await browser.close();

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Hoàn thành chụp ${completed}/${screens.length} màn hình trong ${durationSec}s!`);

  // 4. Tự động build lại giao diện Gallery docs/mobile_v2/index.html
  console.log('\n🔨 [Gallery Builder] Đang cập nhật lại docs/mobile_v2/index.html...');
  execSync('node scripts/build_mobile_v2_gallery.js', { stdio: 'inherit' });

  // 5. Kiểm tra và xác nhận giao diện kết quả sau khi build
  console.log('\n🔎 [Verification] Kiểm tra thư viện sau khi cập nhật...');
  execSync('node scripts/verify_role_filter.js', { stdio: 'inherit' });

  console.log('\n✨ ĐÃ HOÀN TẤT TOÀN DIỆN! Xem trực quan tại: docs/mobile_v2/index.html');
}

captureAllScreens().catch((err) => {
  console.error('❌ Lỗi tiến trình chụp màn hình Playwright:', err);
  process.exit(1);
});

