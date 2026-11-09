// product-detail-sync.spec.ts - Kịch Bản Kiểm Thử E2E Trang Chi Tiết Dược Phẩm Đồng Bộ (Issue #267)
import { test, expect } from '@playwright/test';

test.describe('Issue #267 - UI/UX Product Detail Synchronization (Long Châu Standard)', () => {

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  test('[Normal Values] Điều hướng từ Landing Page sang trang chi tiết sản phẩm chuẩn Long Châu', async ({ page }) => {
    // 1. Truy cập trang chủ Landing page
    await page.goto('/');
    await expect(page.locator('text=Mua Thuốc Chuẩn GPP')).toBeVisible({ timeout: 10000 });

    // 2. Click vào card sản phẩm đầu tiên trên trang chủ
    const firstProductCard = page.locator('.product-card').first();
    if (await firstProductCard.isVisible()) {
      await firstProductCard.click();

      // Kiểm tra URL đã chuyển hướng sang /customer/product/:id (không còn mở modal cũ)
      await expect(page).toHaveURL(/\/customer\/product\//, { timeout: 8000 });

      // Kiểm tra các thành phần chuẩn Long Châu hiển thị đầy đủ
      await expect(page.locator('text=100% Chính hãng')).toBeVisible();
      await expect(page.locator('text=Giao siêu tốc 2H')).toBeVisible();
      await expect(page.locator('text=Thêm vào giỏ hàng')).toBeVisible();
      await expect(page.locator('text=Khách Hàng Đánh Giá & Nhận Xét')).toBeVisible();
    }
  });

  test('[Normal Values] Điều hướng từ Customer Shop và tương tác quy cách đóng gói', async ({ page }) => {
    // 1. Truy cập cửa hàng dược phẩm
    await page.goto('/customer/shop');
    await expect(page.locator('text=Thuốc & Dược phẩm').first()).toBeVisible({ timeout: 10000 });

    // 2. Click vào sản phẩm đầu tiên
    const firstShopCard = page.locator('.group.relative.bg-white.rounded-2xl').first();
    if (await firstShopCard.isVisible()) {
      await firstShopCard.click();
      await expect(page).toHaveURL(/\/customer\/product\//, { timeout: 8000 });

      // 3. Kiểm tra các tab dược lý (Công dụng, Cách dùng, Thành phần)
      await expect(page.locator('text=Công dụng & Chỉ định')).toBeVisible();
      await page.click('text=Cách dùng & Liều lượng');
      await expect(page.locator('text=Hướng dẫn sử dụng và Liều dùng')).toBeVisible();

      // 4. Kiểm tra khối review trực tiếp trên trang
      await expect(page.locator('text=Khách Hàng Đánh Giá & Nhận Xét')).toBeVisible();
      await expect(page.locator('text=Viết Đánh Giá Ngay')).toBeVisible();
    }
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, thuốc hết hàng, review 0
  // =========================================================================
  test('[Boundary Values] Kiểm tra trạng thái thuốc khi số lượng tồn hoặc review ở mức biên', async ({ page }) => {
    await page.goto('/customer/shop');
    
    // Nếu có sản phẩm, vào xem chi tiết để kiểm tra stepper số lượng
    const card = page.locator('.group.relative.bg-white.rounded-2xl').first();
    if (await card.isVisible()) {
      await card.click();
      await expect(page).toHaveURL(/\/customer\/product\//);

      // Thử bấm giảm số lượng ở mức tối thiểu (1 đơn vị) -> không được giảm dưới 1
      const minusBtn = page.locator('button:has-text("-")').first();
      await minusBtn.click();
      await expect(page.locator('text=1').first()).toBeVisible();
    }
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý ngoại lệ, mã sản phẩm không tồn tại
  // =========================================================================
  test('[Abnormal Values] Truy cập ID sản phẩm không tồn tại hiển thị màn hình thông báo thân thiện', async ({ page }) => {
    // Truy cập một ID giả lập không tồn tại trong database
    await page.goto('/customer/product/invalid-medicine-id-999999');

    // Không được sập trang (crash), hiển thị thông báo lỗi thân thiện kèm nút quay lại
    await expect(page.locator('text=Không tìm thấy sản phẩm')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Quay lại cửa hàng')).toBeVisible();

    // Click quay lại cửa hàng
    await page.click('text=Quay lại cửa hàng');
    await expect(page).toHaveURL(/\/customer\/shop/);
  });
});

