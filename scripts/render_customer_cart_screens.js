/**
 * render_customer_cart_screens.js
 * Sinh ảnh mô phỏng pixel-perfect cho:
 * customer_cart_phone.png (Màn hình Giỏ Hàng đã loại bỏ thanh tìm kiếm theo yêu cầu của user,
 * chuẩn Auth Blue #0284C7, không viền đen thô, đồng bộ 100% với CustomerScreen.tsx)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const path = require('path');

const htmlCart = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 412px;
    height: 915px;
    background: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0F172A;
    overflow-y: auto;
    position: relative;
    user-select: none;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { display: none; }

  /* 1. STATUS BAR */
  .status-bar {
    height: 44px;
    padding: 10px 18px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
    background: #0284C7;
  }
  .status-icons {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  /* 2. HEADER XANH AUTH BLUE (Không có thanh tìm kiếm theo yêu cầu) */
  .header {
    background: linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #0EA5E9 100%);
    padding: 10px 16px 14px;
    color: #FFFFFF;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .menu-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .brand-title {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.18);
    padding: 5px 12px;
    border-radius: 20px;
  }
  .brand-icon-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0284C7;
  }
  .brand-text {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #FFFFFF;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .action-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
  }
  .badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #EF4444;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 10px;
    border: 1.5px solid #0284C7;
  }

  /* 3. MAIN CONTENT */
  .content {
    padding: 16px 16px 90px;
  }
  .cart-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .cart-main-title {
    font-size: 18px;
    font-weight: 800;
    color: #0F172A;
  }
  .clear-all-btn {
    color: #EF4444;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  /* CART ITEMS */
  .cart-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 14px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(15,23,42,0.04);
    border: 1px solid #F1F5F9;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .item-img {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    object-fit: cover;
    background: #F1F5F9;
  }
  .item-info {
    flex: 1;
    min-width: 0;
  }
  .item-name {
    font-size: 13.5px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.35;
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .item-price-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .item-price {
    font-size: 14px;
    font-weight: 800;
    color: #0284C7;
  }
  .item-unit {
    font-size: 11.5px;
    color: #64748B;
  }
  .item-controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .qty-box {
    display: flex;
    align-items: center;
    border: 1px solid #E2E8F0;
    border-radius: 20px;
    padding: 2px 6px;
    background: #F8FAFC;
    gap: 8px;
  }
  .qty-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
  }
  .qty-num {
    font-size: 13px;
    font-weight: 800;
    color: #0F172A;
  }
  .trash-btn {
    color: #EF4444;
    cursor: pointer;
    padding: 2px 4px;
  }

  /* VOUCHER ROW */
  .voucher-input-row {
    display: flex;
    gap: 8px;
    margin: 14px 0 10px;
  }
  .voucher-input {
    flex: 1;
    height: 44px;
    border: 1px solid #CBD5E1;
    border-radius: 12px;
    padding: 0 14px;
    font-size: 14px;
    font-weight: 700;
    color: #0F172A;
    background: #FFFFFF;
    outline: none;
  }
  .voucher-apply-btn {
    height: 44px;
    padding: 0 18px;
    border-radius: 12px;
    background: #0284C7;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 800;
    border: none;
    cursor: pointer;
    letter-spacing: 0.3px;
  }

  .voucher-hub-pill {
    background: #F0F9FF;
    border: 1px solid #BAE6FD;
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    color: #0284C7;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  /* SUMMARY CARD */
  .summary-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 16px;
    border: 1px solid #F1F5F9;
    margin-bottom: 14px;
  }
  .summary-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 13.5px;
    color: #64748B;
  }
  .summary-line.discount {
    color: #0284C7;
    font-weight: 700;
  }
  .summary-total {
    border-top: 1px dashed #E2E8F0;
    padding-top: 12px;
    margin-top: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .total-label {
    font-size: 15px;
    font-weight: 800;
    color: #0F172A;
  }
  .total-amount {
    font-size: 18px;
    font-weight: 900;
    color: #0284C7;
  }

  /* CHECKOUT BUTTON - XANH AUTH */
  .checkout-btn {
    width: 100%;
    height: 48px;
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
    border-radius: 14px;
    color: #FFFFFF;
    font-size: 15px;
    font-weight: 800;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(2,132,199,0.25);
    letter-spacing: 0.5px;
  }

  /* 4. BOTTOM TAB BAR */
  .tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 412px;
    height: 68px;
    background: #FFFFFF;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding-bottom: 6px;
  }
  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
    position: relative;
    cursor: pointer;
  }
  .tab-item.active {
    color: #0284C7;
    font-weight: 800;
  }
  .tab-icon {
    font-size: 20px;
  }
  .tab-ai-center {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(2,132,199,0.3);
    margin-top: -24px;
    border: 3px solid #FFFFFF;
  }
  .tab-badge {
    position: absolute;
    top: -2px;
    right: 2px;
    background: #EF4444;
    color: #FFFFFF;
    font-size: 9px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 8px;
  }
</style>
</head>
<body>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <span>14:04</span>
    <div class="status-icons">
      <span>●●●●</span>
      <span>📶</span>
      <span>🔋 100%</span>
    </div>
  </div>

  <!-- HEADER AUTH BLUE - ĐÃ ẨN SEARCH THEO YÊU CẦU DỰ ÁN -->
  <div class="header">
    <div class="header-top">
      <div class="header-left">
        <div class="menu-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </div>
        <div class="brand-title">
          <div class="brand-icon-circle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </div>
          <span class="brand-text">GIỎ HÀNG CỦA BẠN</span>
        </div>
      </div>
      <div class="header-actions">
        <div class="action-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </div>
        <div class="action-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
        <div class="action-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="badge">2</span>
        </div>
        <div class="action-btn" style="background: #FFFFFF; color: #0284C7;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.5 8.5 0 0 1 13 0"/></svg>
        </div>
      </div>
    </div>
  </div>

  <!-- CONTENT -->
  <div class="content">
    <div class="cart-title-row">
      <span class="cart-main-title">Giỏ Hàng Của Bạn (2)</span>
      <span class="clear-all-btn">Xóa tất cả</span>
    </div>

    <!-- ITEM 1 -->
    <div class="cart-card">
      <img class="item-img" src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120" alt="SaViMetoc" />
      <div class="item-info">
        <div class="item-name">Thuốc SaViMetoc giảm đau do co thắt cơ (3 vỉ x 10 viên)</div>
        <div class="item-price-row">
          <span class="item-price">361.000 ₫</span>
          <span class="item-unit">/ Hộp</span>
        </div>
      </div>
      <div class="item-controls">
        <div class="qty-box">
          <span class="qty-btn">−</span>
          <span class="qty-num">1</span>
          <span class="qty-btn">+</span>
        </div>
        <span class="trash-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </span>
      </div>
    </div>

    <!-- ITEM 2 -->
    <div class="cart-card">
      <img class="item-img" src="https://images.unsplash.com/photo-1576073804868-692fc3487c06?w=120" alt="Ecosip" />
      <div class="item-info">
        <div class="item-name">Cao dán thảo dược Ecosip Tatra giảm đau vai, đau lưng...</div>
        <div class="item-price-row">
          <span class="item-price">213.000 ₫</span>
          <span class="item-unit">/ Hộp</span>
        </div>
      </div>
      <div class="item-controls">
        <div class="qty-box">
          <span class="qty-btn">−</span>
          <span class="qty-num">1</span>
          <span class="qty-btn">+</span>
        </div>
        <span class="trash-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </span>
      </div>
    </div>

    <!-- VOUCHER INPUT -->
    <div class="voucher-input-row">
      <input class="voucher-input" value="1710" />
      <button class="voucher-apply-btn">ÁP DỤNG</button>
    </div>

    <!-- VOUCHER HUB LINK -->
    <div class="voucher-hub-pill">
      <span>🎁 Kho Voucher & Điểm Thưởng của bạn (15 ưu đãi)</span>
      <span>›</span>
    </div>

    <!-- SUMMARY -->
    <div class="summary-card">
      <div class="summary-line">
        <span>Tạm tính:</span>
        <span style="font-weight: 700; color: #0F172A;">574.000 ₫</span>
      </div>
      <div class="summary-line discount">
        <span>Khuyến mãi (1710):</span>
        <span>-516.600 ₫</span>
      </div>
      <div class="summary-total">
        <span class="total-label">Tổng Thanh Toán:</span>
        <span class="total-amount">57.400 ₫</span>
      </div>
    </div>

    <!-- CHECKOUT BUTTON -->
    <button class="checkout-btn">TIẾN HÀNH ĐẶT HÀNG</button>
  </div>

  <!-- TAB BAR -->
  <div class="tab-bar">
    <div class="tab-item">
      <span class="tab-icon">🏠</span>
      <span>Trang chủ</span>
    </div>
    <div class="tab-item">
      <span class="tab-icon">🎁</span>
      <span>Điểm thưởng</span>
    </div>
    <div class="tab-ai-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </div>
    <div class="tab-item active">
      <span class="tab-icon">🛒</span>
      <span class="tab-badge">2</span>
      <span>Giỏ hàng</span>
    </div>
    <div class="tab-item">
      <span class="tab-icon">👤</span>
      <span>Tài khoản</span>
    </div>
  </div>

</body>
</html>
`;

async function renderScreens() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2
  });

  console.log('📸 Đang render customer_cart_phone.png (Không có thanh search thuốc theo chuẩn)...');
  await page.setContent(htmlCart, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(__dirname, '../docs/mobile_v2/customer_cart_phone.png')
  });

  await browser.close();
  console.log('✅ Đã cập nhật thành công docs/mobile_v2/customer_cart_phone.png!');
}

renderScreens().catch(console.error);

