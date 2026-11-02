/**
 * render_pharmacist_grid_screens.js
 * Sinh ảnh mô phỏng 2-cột Grid hình vuông chuẩn Shopee (Width === Height) cho:
 * 1. pharmacist_pos_main_phone.png & pharmacist_pos_main_fullpage.png
 * 2. pharmacist_drawer_menu_phone.png (Chuẩn Auth Blue, loại bỏ màu xanh lá)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const path = require('path');

// 1. HTML cho Pharmacist POS Main (2 Cột Grid Chuẩn Shopee, Width === Height)
const htmlPharmacistPOS = `<!DOCTYPE html>
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

  /* 2. HEADER XANH AUTH */
  .header {
    background: #0284C7;
    padding: 8px 16px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .hamburger-btn {
    width: 38px;
    height: 38px;
    border-radius: 19px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .brand-title {
    font-size: 17px;
    font-weight: 900;
    letter-spacing: 0.3px;
    line-height: 1.2;
  }
  .brand-sub {
    font-size: 11px;
    color: #BAE6FD;
    font-weight: 600;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .round-btn {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #FFFFFF;
  }

  /* 3. CẢNH BÁO CA TRỰC GPP */
  .gpp-alert {
    background: #FFFBEB;
    border-bottom: 1px solid #FDE68A;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .alert-icon {
    font-size: 16px;
    color: #D97706;
  }
  .alert-text {
    font-size: 12px;
    color: #92400E;
    font-weight: 600;
    line-height: 16px;
  }

  /* 4. POS TOOLBAR & TÌM KIẾM */
  .toolbar-container {
    padding: 12px 16px 8px;
  }
  .tab-pills-row {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }
  .pos-pill-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 0;
    border-radius: 14px;
    font-size: 13.5px;
    font-weight: 700;
    border: none;
    cursor: pointer;
  }
  .pill-pos-active {
    background: #E0F2FE;
    color: #0284C7;
    border: 1px solid #BAE6FD;
  }
  .pill-ocr-inactive {
    background: #FFFFFF;
    color: #64748B;
    border: 1px solid #E2E8F0;
  }

  .search-box-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .search-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 12px;
    padding: 10px 12px;
  }
  .search-placeholder {
    font-size: 13px;
    color: #94A3B8;
  }
  .scan-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #0284C7;
    color: #FFFFFF;
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700;
    border: none;
    cursor: pointer;
  }

  /* 5. DANH MỤC THUỐC TẠI QUẦY - 2-COLUMN GRID (SHOPEE STYLE) */
  .catalog-container {
    padding: 8px 16px 40px;
  }
  .catalog-title {
    font-size: 15px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 12px;
  }
  .products-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .product-grid-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 10px;
    border: 1px solid #E2E8F0;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* ẢNH HÌNH VUÔNG 1:1 (WIDTH === HEIGHT CHUẨN SHOPEE) */
  .img-square-box {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    background: #F8FAFC;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
  .img-square-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rx-tag {
    position: absolute;
    top: 6px;
    right: 6px;
    background: #FEE2E2;
    color: #DC2626;
    font-size: 9.5px;
    font-weight: 800;
    padding: 2px 5px;
    border-radius: 4px;
  }

  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .card-name {
    font-size: 13px;
    font-weight: 700;
    color: #1E293B;
    line-height: 17px;
    height: 34px;
    overflow: hidden;
    margin-bottom: 3px;
  }
  .card-active {
    font-size: 11px;
    color: #64748B;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 6px;
  }
  .meta-pills-row {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .sku-badge {
    background: #F1F5F9;
    color: #475569;
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
  }
  .exp-badge {
    background: #F0F9FF;
    color: #0284C7;
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #BAE6FD;
  }
  .card-price {
    font-size: 14px;
    font-weight: 900;
    color: #0284C7;
    font-variant-numeric: tabular-nums;
    margin-top: auto;
    margin-bottom: 8px;
  }
  .card-unit {
    font-size: 10.5px;
    font-weight: 600;
    color: #64748B;
  }

  .card-action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px solid #F1F5F9;
  }
  .print-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #F0F9FF;
    border: 1px solid #BAE6FD;
    color: #0284C7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
  }
  .add-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #0284C7;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
  }
</style>
</head>
<body>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <span>12:34</span>
    <div>📶 64%</div>
  </div>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="hamburger-btn">☰</div>
      <div>
        <div class="brand-title">ABC PHARMACY</div>
        <div class="brand-sub">Quầy Bán Hàng Dược Sĩ POS</div>
      </div>
    </div>
    <div class="header-actions">
      <div class="round-btn">🔔</div>
      <div class="round-btn">👤</div>
    </div>
  </div>

  <!-- CẢNH BÁO GPP -->
  <div class="gpp-alert">
    <span class="alert-icon">⚠️</span>
    <div class="alert-text">Cảnh báo GPP: Bạn chưa điểm danh vào ca trực. Nhấn vào đây để check-in GPS trước khi bán hàng!</div>
  </div>

  <!-- TOOLBAR & TÌM KIẾM -->
  <div class="toolbar-container">
    <div class="tab-pills-row">
      <button class="pos-pill-btn pill-pos-active">🛒 POS Bán Hàng (0)</button>
      <button class="pos-pill-btn pill-ocr-inactive">⛶ Quét Đơn OCR</button>
    </div>

    <div class="search-box-row">
      <div class="search-input-wrap">
        <span>🔍</span>
        <span class="search-placeholder">Tra cứu thuốc bán lẻ, SKU, Barcode...</span>
      </div>
      <button class="scan-btn">▦ Quét</button>
    </div>
  </div>

  <!-- DANH MỤC THUỐC 2-COLUMN GRID (SHOPEE STYLE - WIDTH === HEIGHT) -->
  <div class="catalog-container">
    <div class="catalog-title">Danh Mục Thuốc Tại Quầy (Có Ảnh & Mã Vạch)</div>

    <div class="products-grid">
      <!-- Item 1: Cao dán Salonpas -->
      <div class="product-grid-card">
        <div class="img-square-box">
          <img src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80" alt="Salonpas" onerror="this.onerror=null; this.src='https://placehold.co/180x180/0284c7/white?text=Salonpas';">
          <div class="rx-tag">OTC</div>
        </div>
        <div class="card-body">
          <div class="card-name">Cao dán Salonpas giảm đau nhức cơ xương khớp</div>
          <div class="card-active">Hoạt chất: Diclofenac sodium</div>
          <div class="meta-pills-row">
            <span class="sku-badge">MED-SALONPAS</span>
            <span class="exp-badge">HSD: 3/2/2027</span>
          </div>
          <div class="card-price">65.000 ₫ <span class="card-unit">/ Hộp</span></div>
        </div>
        <div class="card-action-row">
          <button class="print-btn">🖨️</button>
          <button class="add-btn">+ Thêm</button>
        </div>
      </div>

      <!-- Item 2: Cao dán thảo dược Ecosip -->
      <div class="product-grid-card">
        <div class="img-square-box">
          <img src="https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80" alt="Ecosip" onerror="this.onerror=null; this.src='https://placehold.co/180x180/0284c7/white?text=Ecosip';">
          <div class="rx-tag">OTC</div>
        </div>
        <div class="card-body">
          <div class="card-name">Cao dán thảo dược Ecosip giảm mỏi vai gáy</div>
          <div class="card-active">Hoạt chất: Tinh dầu thảo mộc</div>
          <div class="meta-pills-row">
            <span class="sku-badge">MED-259764</span>
            <span class="exp-badge">HSD: 3/2/2027</span>
          </div>
          <div class="card-price">213.000 ₫ <span class="card-unit">/ Hộp</span></div>
        </div>
        <div class="card-action-row">
          <button class="print-btn">🖨️</button>
          <button class="add-btn">+ Thêm</button>
        </div>
      </div>

      <!-- Item 3: Panadol Extra đỏ -->
      <div class="product-grid-card">
        <div class="img-square-box">
          <img src="https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80" alt="Panadol" onerror="this.onerror=null; this.src='https://placehold.co/180x180/0284c7/white?text=Panadol';">
          <div class="rx-tag">OTC</div>
        </div>
        <div class="card-body">
          <div class="card-name">Viên nén Panadol Extra Đỏ giảm đau hạ sốt</div>
          <div class="card-active">Hoạt chất: Paracetamol 500mg</div>
          <div class="meta-pills-row">
            <span class="sku-badge">MED-PANADOL</span>
            <span class="exp-badge">HSD: 12/2027</span>
          </div>
          <div class="card-price">195.000 ₫ <span class="card-unit">/ Hộp</span></div>
        </div>
        <div class="card-action-row">
          <button class="print-btn">🖨️</button>
          <button class="add-btn">+ Thêm</button>
        </div>
      </div>

      <!-- Item 4: Kháng sinh Augmentin 1g -->
      <div class="product-grid-card">
        <div class="img-square-box">
          <img src="https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=80" alt="Augmentin" onerror="this.onerror=null; this.src='https://placehold.co/180x180/0284c7/white?text=Augmentin';">
          <div class="rx-tag">Rx</div>
        </div>
        <div class="card-body">
          <div class="card-name">Kháng sinh Augmentin 1g kháng khuẩn hô hấp</div>
          <div class="card-active">Hoạt chất: Amoxicillin 875mg</div>
          <div class="meta-pills-row">
            <span class="sku-badge">MED-AUG1G</span>
            <span class="exp-badge">HSD: 8/2026</span>
          </div>
          <div class="card-price">245.000 ₫ <span class="card-unit">/ Hộp</span></div>
        </div>
        <div class="card-action-row">
          <button class="print-btn">🖨️</button>
          <button class="add-btn">+ Thêm</button>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;

// 2. HTML cho Pharmacist Drawer Menu (Chuẩn Auth Blue, Thay toàn bộ xanh lá cây)
const htmlPharmacistDrawer = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 412px;
    height: 915px;
    background: rgba(15, 23, 42, 0.45);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0F172A;
    overflow: hidden;
    position: relative;
    user-select: none;
    -webkit-font-smoothing: antialiased;
  }

  /* DRAWER SHEET BÊN TRÁI */
  .drawer-panel {
    width: 320px;
    height: 100%;
    background: #FFFFFF;
    box-shadow: 8px 0 24px rgba(15, 23, 42, 0.15);
    display: flex;
    flex-direction: column;
    padding: 44px 20px 24px;
    animation: slideRight 0.25s ease;
  }

  /* AVATAR & USER INFO - CHUẨN AUTH BLUE (ZERO GREEN) */
  .avatar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .avatar-circle {
    width: 52px;
    height: 52px;
    border-radius: 26px;
    background: #E0F2FE;
    border: 2px solid #38BDF8;
    color: #0284C7;
    font-size: 18px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-drawer-btn {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: #F1F5F9;
    color: #64748B;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    cursor: pointer;
  }

  .user-name {
    font-size: 17px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 2px;
  }
  .user-branch {
    font-size: 12.5px;
    color: #64748B;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
  }
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #E0F2FE;
    color: #0284C7;
    border: 1px solid #BAE6FD;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 700;
    margin-bottom: 20px;
  }

  /* SECTION & MENU ITEMS */
  .menu-section-title {
    font-size: 11px;
    font-weight: 800;
    color: #94A3B8;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }
  .menu-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 12px;
    border-radius: 12px;
    background: #FFFFFF;
    transition: background 0.15s;
    cursor: pointer;
  }
  .menu-item:hover {
    background: #F8FAFC;
  }
  .menu-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .menu-icon-box {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
  }
  .icon-attendance { background: #FEF3C7; color: #D97706; }
  .icon-schedule { background: #E0F2FE; color: #0284C7; }
  .icon-swap { background: #E0F2FE; color: #0284C7; }
  .icon-leave { background: #FFEDD5; color: #EA580C; }
  .icon-payslip { background: #E0F2FE; color: #0284C7; }
  .icon-ocr { background: #E0F2FE; color: #0284C7; }

  .menu-label {
    font-size: 14px;
    font-weight: 600;
    color: #1E293B;
  }
  .need-checkin-badge {
    background: #FFFBEB;
    color: #D97706;
    border: 1px solid #FDE68A;
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 8px;
  }

  /* LOGOUT FOOTER */
  .drawer-footer {
    padding-top: 16px;
    border-top: 1px solid #F1F5F9;
  }
  .logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #FEF2F2;
    color: #EF4444;
    border: 1px solid #FEE2E2;
    padding: 12px 0;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 8px;
  }
  .footer-caption {
    font-size: 11px;
    color: #94A3B8;
    text-align: center;
  }
</style>
</head>
<body>

  <div class="drawer-panel">
    <!-- AVATAR & CLOSE -->
    <div class="avatar-row">
      <div class="avatar-circle">SC</div>
      <button class="close-drawer-btn">✕</button>
    </div>

    <!-- USER INFO -->
    <div class="user-name">DS. Lê Hải Yến (Dược Sĩ CN1)</div>
    <div class="user-branch">📍 Cơ Sở Chi Nhánh ABC</div>
    <div class="role-badge">🛡️ Dược Sĩ Bán Hàng (GPP)</div>

    <!-- MENU LIST -->
    <div class="menu-section-title">NGHIỆP VỤ & CA TRỰC</div>
    <div class="menu-list">
      <!-- 1. Điểm danh -->
      <div class="menu-item">
        <div class="menu-item-left">
          <div class="menu-icon-box icon-attendance">📍</div>
          <span class="menu-label">Điểm Danh Vào Ca (GPS)</span>
        </div>
        <span class="need-checkin-badge">CẦN VÀO CA</span>
      </div>

      <!-- 2. Lịch làm việc -->
      <div class="menu-item">
        <div class="menu-item-left">
          <div class="menu-icon-box icon-schedule">📅</div>
          <span class="menu-label">Lịch Làm Việc Cơ Sở</span>
        </div>
      </div>

      <!-- 3. Đổi ca chéo -->
      <div class="menu-item">
        <div class="menu-item-left">
          <div class="menu-icon-box icon-swap">🔄</div>
          <span class="menu-label">Đổi Ca Chéo</span>
        </div>
      </div>

      <!-- 4. Nghỉ phép -->
      <div class="menu-item">
        <div class="menu-item-left">
          <div class="menu-icon-box icon-leave">✈️</div>
          <span class="menu-label">Đơn Xin Nghỉ Phép</span>
        </div>
      </div>

      <!-- 5. Bảng lương -->
      <div class="menu-item">
        <div class="menu-item-left">
          <div class="menu-icon-box icon-payslip">🧾</div>
          <span class="menu-label">Phiếu Lương Cá Nhân</span>
        </div>
      </div>

      <!-- 6. OCR đơn thuốc -->
      <div class="menu-item">
        <div class="menu-item-left">
          <div class="menu-icon-box icon-ocr">⛶</div>
          <span class="menu-label">Quét Đơn Thuốc OCR AI</span>
        </div>
      </div>
    </div>

    <!-- LOGOUT FOOTER -->
    <div class="drawer-footer">
      <button class="logout-btn">🚪 Đăng Xuất Ca Trực</button>
      <div class="footer-caption">ABC Pharmacy v2.0 • Chuẩn Y Tế GPP</div>
    </div>
  </div>

</body>
</html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Render pharmacist_pos_main (Phone & Fullpage)
  console.log('Rendering pharmacist_pos_main...');
  const page1 = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page1.setContent(htmlPharmacistPOS, { waitUntil: 'load' });
  await page1.waitForTimeout(600);
  await page1.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/pharmacist_pos_main_phone.png' });
  await page1.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/pharmacist_pos_main_fullpage.png', fullPage: true });
  console.log('✅ Rendered pharmacist_pos_main_phone.png & fullpage.png');
  await page1.close();

  // 2. Render pharmacist_drawer_menu (Phone)
  console.log('Rendering pharmacist_drawer_menu...');
  const page2 = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page2.setContent(htmlPharmacistDrawer, { waitUntil: 'load' });
  await page2.waitForTimeout(600);
  await page2.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/pharmacist_drawer_menu_phone.png' });
  console.log('✅ Rendered pharmacist_drawer_menu_phone.png');
  await page2.close();

  await browser.close();
  console.log('🎉 Done rendering Pharmacist Grid screens with square images & Auth Blue!');
}

main().catch(console.error);

