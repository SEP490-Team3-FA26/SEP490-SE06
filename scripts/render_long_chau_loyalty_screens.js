/**
 * render_long_chau_loyalty_screens.js
 * Sinh ảnh mô phỏng pixel-perfect cho:
 * 1. customer_vouchers_tab (Tab Điểm Thưởng chuẩn FPT Long Châu - Quà tặng, Hũ tiết kiệm, Quỹ Hy Vọng)
 * 2. customer_redeem_gift_modal (Modal Đổi Quà chuẩn ảnh user gửi)
 * 3. customer_points_history (Màn hình Lịch Sử Điểm Thưởng mới)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

// HTML Screen 1: Tab Điểm Thưởng Chuẩn FPT Long Châu
const htmlRewardsTab = `<!DOCTYPE html>
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
    padding: 10px 20px 0;
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

  /* 2. HEADER GRADIENT LONG CHÂU */
  .rewards-header {
    background: linear-gradient(180deg, #0284C7 0%, #0369A1 100%);
    padding: 10px 18px 30px;
    position: relative;
  }
  .top-action-pills {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .action-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: none;
  }
  .pill-my-gifts {
    background: rgba(255, 255, 255, 0.22);
    color: #FFFFFF;
    backdrop-filter: blur(8px);
  }
  .pill-history {
    background: rgba(255, 255, 255, 0.22);
    color: #FFFFFF;
    backdrop-filter: blur(8px);
  }

  /* KHỐI ĐIỂM & HŨ THỦY TINH */
  .hero-points-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
  }
  .hero-left-col {
    flex: 1;
  }
  .hero-label {
    color: #E0F2FE;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .hero-coin-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .coin-badge {
    width: 26px;
    height: 26px;
    border-radius: 13px;
    background: #F59E0B;
    border: 2px solid #FDE68A;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 900;
    color: #FFFFFF;
    box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
  }
  .coin-number {
    font-size: 34px;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }
  .rules-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #BAE6FD;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
  }

  /* 3D GLASS COIN JAR */
  .jar-visual-container {
    width: 95px;
    height: 95px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .glass-jar {
    width: 76px;
    height: 88px;
    border-radius: 20px 20px 24px 24px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.15) 100%);
    border: 2.5px solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 8px 24px rgba(2, 132, 199, 0.3), inset 0 2px 10px rgba(255, 255, 255, 0.5);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .jar-lid {
    position: absolute;
    top: -8px;
    width: 52px;
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(180deg, #FDE68A 0%, #D97706 100%);
    border: 1.5px solid #FEF3C7;
    box-shadow: 0 2px 6px rgba(217, 119, 6, 0.35);
  }
  .jar-slot {
    width: 22px;
    height: 3px;
    background: #92400E;
    border-radius: 2px;
    margin: 3px auto 0;
  }
  .jar-tag {
    position: absolute;
    top: 10px;
    right: -10px;
    background: #E0F2FE;
    color: #0369A1;
    font-size: 9.5px;
    font-weight: 800;
    padding: 3px 6px;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    transform: rotate(12deg);
  }
  .jar-shine {
    position: absolute;
    left: 8px;
    top: 12px;
    width: 10px;
    height: 48px;
    border-radius: 5px;
    background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%);
  }

  /* 3. HOPE FOUNDATION BANNER */
  .hope-banner {
    margin: -16px 16px 16px;
    background: #FFFFFF;
    border-radius: 18px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    position: relative;
  }
  .hope-banner-hero {
    background: linear-gradient(135deg, #EFF6FF 0%, #FEE2E2 100%);
    padding: 16px 18px;
    text-align: center;
  }
  .hope-header-logos {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .hope-logo-text {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #0284C7;
  }
  .hope-title-sub {
    font-size: 12px;
    font-weight: 700;
    color: #1E293B;
    margin-bottom: 2px;
  }
  .hope-title-main {
    font-size: 16px;
    font-weight: 900;
    color: #0284C7;
    margin-bottom: 10px;
    letter-spacing: 0.2px;
  }
  .hope-title-main span {
    color: #E11D48;
  }
  .hope-join-btn {
    display: inline-block;
    background: linear-gradient(90deg, #0284C7 0%, #0369A1 100%);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 800;
    padding: 7px 22px;
    border-radius: 18px;
    box-shadow: 0 3px 10px rgba(2, 132, 199, 0.35);
  }
  .hope-footer-strip {
    background: #FFF1F2;
    padding: 9px 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #9F1239;
  }
  .hope-amount {
    color: #E11D48;
    font-weight: 800;
  }

  /* 4. QUÀ TẶNG SECTION */
  .gifts-section {
    padding: 0 16px 20px;
  }
  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .section-title {
    font-size: 16px;
    font-weight: 800;
    color: #0F172A;
  }
  .section-view-all {
    font-size: 13px;
    font-weight: 600;
    color: #0284C7;
    text-decoration: none;
  }
  .section-subtitle {
    font-size: 12.5px;
    color: #64748B;
    margin-bottom: 12px;
  }

  /* FILTER PILLS */
  .tier-pills-row {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }
  .tier-pill {
    padding: 7px 15px;
    border-radius: 20px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .tier-pill.active {
    background: #F0F9FF;
    border-color: #0284C7;
    color: #0284C7;
    font-weight: 700;
  }

  /* 2-COLUMN GIFT GRID */
  .gifts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .gift-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
  }
  .gift-img-box {
    width: 100%;
    height: 120px;
    border-radius: 10px;
    background: #F8FAFC;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    overflow: hidden;
  }
  .gift-img-box img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
  }
  .gift-name {
    font-size: 13px;
    font-weight: 600;
    color: #0F172A;
    line-height: 18px;
    height: 36px;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .gift-price {
    font-size: 12px;
    color: #0284C7;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .gift-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
  }
  .gift-coin {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 800;
    color: #D97706;
  }
  .gift-redeem-btn {
    background: #0284C7;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
  }

  /* 5. BOTTOM NAVIGATION */
  .bottom-nav {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: #FFFFFF;
    border-top: 1px solid #F1F5F9;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.03);
  }
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    color: #94A3B8;
    font-size: 11px;
    font-weight: 600;
    position: relative;
  }
  .nav-item.active {
    color: #0284C7;
    font-weight: 700;
  }
  .nav-center-bubble {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    background: #0284C7;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 22px;
    margin-top: -24px;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    border: 3px solid #FFFFFF;
  }
  .nav-badge {
    position: absolute;
    top: -2px;
    right: 2px;
    background: #EF4444;
    color: #FFFFFF;
    font-size: 9.5px;
    font-weight: 800;
    width: 15px;
    height: 15px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #FFFFFF;
  }
</style>
</head>
<body>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <span>11:53</span>
    <div class="status-icons">
      <span>📶</span>
      <span>73%</span>
    </div>
  </div>

  <!-- HEADER GRADIENT LONG CHÂU -->
  <div class="rewards-header">
    <div class="top-action-pills">
      <button class="action-pill pill-my-gifts">🎁 Quà của tôi</button>
      <button class="action-pill pill-history">📄 Lịch sử</button>
    </div>

    <div class="hero-points-row">
      <div class="hero-left-col">
        <div class="hero-label">Điểm thưởng của tôi</div>
        <div class="hero-coin-row">
          <div class="coin-badge">F</div>
          <div class="coin-number">0</div>
        </div>
        <a href="#" class="rules-link">Xem thể lệ &rsaquo;</a>
      </div>

      <!-- 3D GLASS SAVING COIN JAR -->
      <div class="jar-visual-container">
        <div class="glass-jar">
          <div class="jar-lid">
            <div class="jar-slot"></div>
          </div>
          <div class="jar-tag">ABC</div>
          <div class="jar-shine"></div>
          <span style="font-size: 28px; margin-top: 10px;">🪙</span>
        </div>
      </div>
    </div>
  </div>

  <!-- HOPE FOUNDATION BANNER -->
  <div class="hope-banner">
    <div class="hope-banner-hero">
      <div class="hope-header-logos">
        <span style="font-size: 14px;">🎗️</span>
        <span class="hope-logo-text">HOPE FOUNDATION • ABC PHARMACY</span>
      </div>
      <div class="hope-title-sub">SAN SẺ GÁNH NẶNG ĐIỀU TRỊ</div>
      <div class="hope-title-main">GÓP HY VỌNG <span>VÌ BỆNH NHÂN UNG THƯ</span></div>
      <div class="hope-join-btn">THAM GIA NGAY</div>
    </div>
    <div class="hope-footer-strip">
      <span>❤️</span>
      <span>Cộng đồng đã quyên góp <span class="hope-amount">15.336.500 đồng</span></span>
    </div>
  </div>

  <!-- QUÀ TẶNG SECTION -->
  <div class="gifts-section">
    <div class="section-header-row">
      <div class="section-title">Quà tặng</div>
      <a href="#" class="section-view-all">Xem tất cả</a>
    </div>
    <div class="section-subtitle">Tích điểm đổi quà với giá 1.000 đồng.</div>

    <!-- FILTER PILLS -->
    <div class="tier-pills-row">
      <div class="tier-pill active">1.500 điểm ✓</div>
      <div class="tier-pill">3.000 điểm</div>
      <div class="tier-pill">4.500 điểm</div>
    </div>

    <!-- 2-COL GRID -->
    <div class="gifts-grid">
      <!-- Gift 1 -->
      <div class="gift-card">
        <div class="gift-img-box">
          <img src="https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00030752_mat_na_duong_am_pax_moly_hyaluronic_acid_deep_sea_water_mask_pack_25ml_9925_60da7f7bfa.jpg" alt="Mặt nạ Pax Moly Deep Sea" onerror="this.onerror=null; this.src='https://placehold.co/120x120/0284c7/white?text=Pax+Moly';">
        </div>
        <div class="gift-name">Mặt nạ dưỡng ẩm Pax Moly Hyaluronic Acid Deep Sea Water...</div>
        <div class="gift-price">1.000đ / Miếng</div>
        <div class="gift-bottom-row">
          <div class="gift-coin">
            <span style="font-size: 13px;">🪙</span>
            <span>1.500</span>
          </div>
          <button class="gift-redeem-btn">Đổi ngay</button>
        </div>
      </div>

      <!-- Gift 2 -->
      <div class="gift-card">
        <div class="gift-img-box">
          <img src="https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00030753_mat_na_duong_am_pax_moly_super_aqua_mask_pack_25ml_8731_60da8018ce.jpg" alt="Mặt nạ Pax Moly Super Aqua" onerror="this.onerror=null; this.src='https://placehold.co/120x120/0284c7/white?text=Super+Aqua';">
        </div>
        <div class="gift-name">Mặt nạ dưỡng ẩm Pax Moly Super Aqua Mask Pack làm mềm...</div>
        <div class="gift-price">1.000đ / Miếng</div>
        <div class="gift-bottom-row">
          <div class="gift-coin">
            <span style="font-size: 13px;">🪙</span>
            <span>1.500</span>
          </div>
          <button class="gift-redeem-btn">Đổi ngay</button>
        </div>
      </div>
    </div>
  </div>

  <!-- BOTTOM BAR -->
  <div class="bottom-nav">
    <div class="nav-item">
      <span style="font-size: 19px;">🏠</span>
      <span>Trang chủ</span>
    </div>
    <div class="nav-item active">
      <span style="font-size: 19px;">🎁</span>
      <span>Điểm thưởng</span>
    </div>
    <div class="nav-center-bubble">
      <span>💬</span>
    </div>
    <div class="nav-item">
      <span style="font-size: 19px;">🛒</span>
      <span>Giỏ hàng</span>
      <div class="nav-badge">2</div>
    </div>
    <div class="nav-item">
      <span style="font-size: 19px;">👤</span>
      <span>Tài khoản</span>
    </div>
  </div>

</body>
</html>`;

// HTML Screen 2: Modal Đổi Quà Tích Điểm (Redeem Gift Modal)
const htmlRedeemModal = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 412px;
    height: 915px;
    background: rgba(15, 23, 42, 0.6);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0F172A;
    overflow: hidden;
    position: relative;
    user-select: none;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  /* MODAL CARD BOTTOM SHEET */
  .modal-sheet {
    background: #FFFFFF;
    border-radius: 24px 24px 0 0;
    padding: 22px 20px 36px;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    position: relative;
  }
  .modal-title {
    font-size: 17px;
    font-weight: 800;
    color: #0F172A;
    text-align: center;
    width: 100%;
  }
  .modal-close-btn {
    position: absolute;
    right: 0;
    top: -2px;
    font-size: 20px;
    color: #64748B;
    cursor: pointer;
    background: none;
    border: none;
    padding: 4px;
  }

  /* ITEM CARD */
  .item-box {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: #F8FAFC;
    border-radius: 14px;
    border: 1px solid #E2E8F0;
    margin-bottom: 20px;
  }
  .item-thumb {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    object-fit: contain;
  }
  .item-name {
    flex: 1;
    font-size: 13.5px;
    font-weight: 600;
    color: #1E293B;
    line-height: 19px;
  }

  /* ROW: SỐ LƯỢNG */
  .row-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .field-label {
    font-size: 14px;
    font-weight: 600;
    color: #0F172A;
  }
  .stepper-box {
    display: flex;
    align-items: center;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    overflow: hidden;
  }
  .step-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: #FFFFFF;
    font-size: 18px;
    font-weight: 700;
    color: #64748B;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .step-val {
    width: 38px;
    text-align: center;
    font-size: 15px;
    font-weight: 700;
    color: #0F172A;
    border-left: 1px solid #CBD5E1;
    border-right: 1px solid #CBD5E1;
    line-height: 36px;
  }

  /* ROW: ĐIỂM SỬ DỤNG & HIỆN CÓ */
  .points-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .points-label {
    font-size: 14px;
    color: #64748B;
  }
  .points-needed {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 15px;
    font-weight: 800;
    color: #F59E0B;
  }
  .points-current {
    font-size: 15px;
    font-weight: 700;
    color: #0F172A;
  }

  /* WARNING MESSAGE */
  .warning-box {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 14px 0 20px;
    color: #EF4444;
    font-size: 13.5px;
    font-weight: 600;
  }

  /* CONFIRM BUTTON (DISABLED) */
  .confirm-btn {
    width: 100%;
    padding: 14px 0;
    border-radius: 26px;
    background: #E2E8F0;
    color: #94A3B8;
    font-size: 15px;
    font-weight: 700;
    border: none;
    cursor: not-allowed;
    text-align: center;
  }
</style>
</head>
<body>

  <div class="modal-sheet">
    <div class="modal-header">
      <div class="modal-title">Đổi quà</div>
      <button class="modal-close-btn">✕</button>
    </div>

    <!-- PRODUCT THUMB -->
    <div class="item-box">
      <img src="https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00030753_mat_na_duong_am_pax_moly_super_aqua_mask_pack_25ml_8731_60da8018ce.jpg" class="item-thumb" alt="Product" onerror="this.onerror=null; this.src='https://placehold.co/60x60/0284c7/white?text=Pax+Moly';">
      <div class="item-name">Mặt nạ dưỡng ẩm Pax Moly Super Aqua Mask Pack làm mềm mịn, cải thiện độ đàn hồi da</div>
    </div>

    <!-- SỐ LƯỢNG -->
    <div class="row-field">
      <div class="field-label">Số lượng:</div>
      <div class="stepper-box">
        <button class="step-btn">−</button>
        <div class="step-val">1</div>
        <button class="step-btn">+</button>
      </div>
    </div>

    <!-- ĐIỂM SỬ DỤNG -->
    <div class="points-row">
      <div class="points-label">Điểm sử dụng:</div>
      <div class="points-needed">
        <span>🪙</span>
        <span>-1.500</span>
      </div>
    </div>

    <!-- ĐIỂM HIỆN CÓ -->
    <div class="points-row">
      <div class="points-label">Điểm hiện có:</div>
      <div class="points-current">0</div>
    </div>

    <!-- CẢNH BÁO KHÔNG ĐỦ ĐIỂM (Ảnh 2 của user) -->
    <div class="warning-box">
      <span>❗</span>
      <span>Không đủ điểm thưởng.</span>
    </div>

    <!-- NÚT XÁC NHẬN -->
    <button class="confirm-btn">Xác nhận</button>
  </div>

</body>
</html>`;

// HTML Screen 3: Màn Hình Lịch Sử Điểm Thưởng (Points History Screen)
const htmlHistoryScreen = `<!DOCTYPE html>
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
    padding: 10px 20px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
    background: #0284C7;
  }

  /* 2. HEADER */
  .history-header {
    height: 52px;
    background: #0284C7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    color: #FFFFFF;
  }
  .back-btn {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    cursor: pointer;
    background: rgba(255,255,255,0.15);
  }
  .header-title {
    font-size: 17px;
    font-weight: 700;
  }

  /* 3. TỔNG QUAN THẺ ĐIỂM (FPT LONG CHÂU STYLE) */
  .summary-card {
    background: linear-gradient(180deg, #0284C7 0%, #0369A1 100%);
    padding: 10px 20px 24px;
    border-radius: 0 0 24px 24px;
    color: #FFFFFF;
    margin-bottom: 16px;
    box-shadow: 0 6px 16px rgba(2, 132, 199, 0.25);
  }
  .summary-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .summary-label {
    font-size: 13.5px;
    color: #E0F2FE;
    font-weight: 500;
  }
  .tier-tag {
    background: rgba(255, 255, 255, 0.25);
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 700;
  }
  .points-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
  }
  .points-val {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }
  .points-unit {
    font-size: 15px;
    font-weight: 600;
    color: #BAE6FD;
  }
  .expiry-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #E0F2FE;
  }

  /* 4. TABS PHÂN LOẠI */
  .tab-pills-row {
    display: flex;
    padding: 0 16px;
    gap: 8px;
    margin-bottom: 16px;
  }
  .tab-pill {
    flex: 1;
    padding: 8px 0;
    border-radius: 20px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #64748B;
    cursor: pointer;
  }
  .tab-pill.active {
    background: #0284C7;
    border-color: #0284C7;
    color: #FFFFFF;
    font-weight: 700;
  }

  /* 5. DANH SÁCH LỊCH SỬ */
  .history-list {
    padding: 0 16px 30px;
  }
  .list-title {
    font-size: 15px;
    font-weight: 700;
    color: #1E293B;
    margin-bottom: 12px;
  }
  .history-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 14px;
    margin-bottom: 10px;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
    display: flex;
    align-items: center;
  }
  .icon-circle {
    width: 42px;
    height: 42px;
    border-radius: 21px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    margin-right: 12px;
  }
  .icon-earn {
    background: #E0F2FE;
  }
  .icon-use {
    background: #FFEDD5;
  }
  .icon-bonus {
    background: #FEF3C7;
  }
  .icon-expire {
    background: #F1F5F9;
  }
  .item-content {
    flex: 1;
  }
  .item-title {
    font-size: 14px;
    font-weight: 600;
    color: #0F172A;
    margin-bottom: 3px;
  }
  .item-order {
    font-size: 12px;
    font-weight: 600;
    color: #0284C7;
    margin-bottom: 3px;
  }
  .item-date {
    font-size: 12px;
    color: #94A3B8;
  }
  .item-points-col {
    text-align: right;
  }
  .item-points-val {
    font-size: 16px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .val-earn {
    color: #0284C7;
  }
  .val-use {
    color: #EA580C;
  }
  .item-points-sub {
    font-size: 11px;
    color: #64748B;
    margin-top: 2px;
  }
</style>
</head>
<body>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <span>11:53</span>
    <div>📶 73%</div>
  </div>

  <!-- HEADER -->
  <div class="history-header">
    <div class="back-btn">&larr;</div>
    <div class="header-title">Lịch sử điểm thưởng</div>
    <div style="width: 36px;"></div>
  </div>

  <!-- SUMMARY CARD -->
  <div class="summary-card">
    <div class="summary-top">
      <div class="summary-label">Tổng điểm tích lũy khả dụng</div>
      <div class="tier-tag">Hạng Vàng</div>
    </div>
    <div class="points-row">
      <span style="font-size: 30px;">🪙</span>
      <span class="points-val">7.838</span>
      <span class="points-unit">điểm</span>
    </div>
    <div class="expiry-info">
      <span>ℹ️</span>
      <span>Điểm sắp hết hạn: 0 điểm vào 31/12/2026</span>
    </div>
  </div>

  <!-- TABS -->
  <div class="tab-pills-row">
    <div class="tab-pill active">Tất cả</div>
    <div class="tab-pill">Tích điểm</div>
    <div class="tab-pill">Sử dụng</div>
    <div class="tab-pill">Hết hạn</div>
  </div>

  <!-- DANH SÁCH -->
  <div class="history-list">
    <div class="list-title">Chi tiết biến động (6)</div>

    <!-- TX 1 -->
    <div class="history-card">
      <div class="icon-circle icon-earn">🛒</div>
      <div class="item-content">
        <div class="item-title">Tích điểm đơn hàng tại quầy POS</div>
        <div class="item-order">#HD-20261028-091</div>
        <div class="item-date">28/10/2026 14:35</div>
      </div>
      <div class="item-points-col">
        <div class="item-points-val val-earn">+150</div>
        <div class="item-points-sub">điểm</div>
      </div>
    </div>

    <!-- TX 2 -->
    <div class="history-card">
      <div class="icon-circle icon-use">🎁</div>
      <div class="item-content">
        <div class="item-title">Đổi quà: Mặt nạ Pax Moly Super Aqua</div>
        <div class="item-date">24/10/2026 16:45</div>
      </div>
      <div class="item-points-col">
        <div class="item-points-val val-use">-1.500</div>
        <div class="item-points-sub">điểm</div>
      </div>
    </div>

    <!-- TX 3 -->
    <div class="history-card">
      <div class="icon-circle icon-earn">🛵</div>
      <div class="item-content">
        <div class="item-title">Tích điểm mua thuốc Online giao 2h</div>
        <div class="item-order">#HD-20261019-542</div>
        <div class="item-date">19/10/2026 09:12</div>
      </div>
      <div class="item-points-col">
        <div class="item-points-val val-earn">+320</div>
        <div class="item-points-sub">điểm</div>
      </div>
    </div>

    <!-- TX 4 -->
    <div class="history-card">
      <div class="icon-circle icon-bonus">🏆</div>
      <div class="item-content">
        <div class="item-title">Thưởng thăng hạng Hạng Vàng</div>
        <div class="item-date">15/10/2026 08:00</div>
      </div>
      <div class="item-points-col">
        <div class="item-points-val val-earn">+500</div>
        <div class="item-points-sub">điểm</div>
      </div>
    </div>

    <!-- TX 5 -->
    <div class="history-card">
      <div class="icon-circle icon-use">🏷️</div>
      <div class="item-content">
        <div class="item-title">Đổi mã voucher giảm 50.000₫</div>
        <div class="item-date">10/10/2026 11:20</div>
      </div>
      <div class="item-points-col">
        <div class="item-points-val val-use">-500</div>
        <div class="item-points-sub">điểm</div>
      </div>
    </div>

    <!-- TX 6 -->
    <div class="history-card">
      <div class="icon-circle icon-expire">⏳</div>
      <div class="item-content">
        <div class="item-title">Điểm hết hạn định kỳ năm 2025</div>
        <div class="item-date">31/12/2025 23:59</div>
      </div>
      <div class="item-points-col">
        <div class="item-points-val val-use">-50</div>
        <div class="item-points-sub">điểm</div>
      </div>
    </div>

  </div>

</body>
</html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Render customer_vouchers_tab (Phone & Fullpage)
  console.log('Rendering customer_vouchers_tab...');
  const page1 = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page1.setContent(htmlRewardsTab, { waitUntil: 'load' });
  await page1.waitForTimeout(600);
  await page1.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/customer_vouchers_tab_phone.png' });
  await page1.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/customer_vouchers_tab_fullpage.png', fullPage: true });
  console.log('✅ Rendered customer_vouchers_tab_phone.png & fullpage.png');
  await page1.close();

  // 2. Render customer_redeem_gift_modal (Phone)
  console.log('Rendering customer_redeem_gift_modal...');
  const page2 = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page2.setContent(htmlRedeemModal, { waitUntil: 'load' });
  await page2.waitForTimeout(600);
  await page2.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/customer_redeem_gift_modal_phone.png' });
  console.log('✅ Rendered customer_redeem_gift_modal_phone.png');
  await page2.close();

  // 3. Render customer_points_history (Phone & Fullpage)
  console.log('Rendering customer_points_history...');
  const page3 = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page3.setContent(htmlHistoryScreen, { waitUntil: 'load' });
  await page3.waitForTimeout(600);
  await page3.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/customer_points_history_phone.png' });
  await page3.screenshot({ path: '/Users/tranhongphuoc/WDP301/docs/mobile_v2/customer_points_history_fullpage.png', fullPage: true });
  console.log('✅ Rendered customer_points_history_phone.png & fullpage.png');
  await page3.close();

  await browser.close();
  console.log('🎉 Done rendering all Long Châu Loyalty screens!');
}

main().catch(console.error);

