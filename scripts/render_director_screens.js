/**
 * render_director_screens.js
 * Sinh ảnh mô phỏng pixel-perfect cho Ban Giám Đốc:
 * 1. director_po_detail_modal_phone.png (Sửa dứt điểm lỗi màn hình trắng trống 8.2KB)
 * 2. director_po_detail_modal_fullpage.png
 * Chuẩn nhận diện Auth Blue #0284C7, tối giản thanh lịch, không viền đen thô.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const path = require('path');

const htmlPoDetailModal = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 412px;
    height: 915px;
    background: #0F172A;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0F172A;
    position: relative;
    user-select: none;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* 1. MÀN HÌNH NỀN PHÍA DƯỚI (DIRECTOR SCREEN BLURRED BACKGROUND) */
  .bg-screen {
    width: 100%;
    height: 100%;
    background: #F8FAFC;
    opacity: 0.25;
    filter: blur(4px);
    position: absolute;
    top: 0;
    left: 0;
  }
  .bg-header {
    height: 120px;
    background: linear-gradient(135deg, #0369A1, #0284C7);
  }

  /* 2. MODAL BACKDROP */
  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.65);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  /* STATUS BAR */
  .status-bar {
    height: 44px;
    padding: 10px 18px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
  }
  .status-icons {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  /* 3. MODAL SHEET DIALOG CARD */
  .modal-sheet {
    background: #FFFFFF;
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 20px 20px 30px;
    box-shadow: 0 -10px 30px rgba(0,0,0,0.25);
    animation: slideUp 0.3s ease-out;
  }

  .sheet-handle {
    width: 40px;
    height: 4px;
    background: #CBD5E1;
    border-radius: 2px;
    margin: 0 auto 16px;
  }

  .modal-top-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .header-icon-col {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #F0F9FF;
    border: 1px solid #BAE6FD;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0284C7;
  }

  .po-code-title {
    font-size: 17px;
    font-weight: 800;
    color: #0F172A;
  }

  .po-subtitle {
    font-size: 12px;
    color: #64748B;
    margin-top: 2px;
  }

  .status-pill {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    color: #D97706;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* META INFO GRID */
  .meta-info-card {
    background: #F8FAFC;
    border-radius: 14px;
    border: 1px solid #E2E8F0;
    padding: 12px 14px;
    margin-bottom: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .meta-item-label {
    font-size: 11px;
    color: #64748B;
    font-weight: 600;
  }

  .meta-item-val {
    font-size: 12.5px;
    font-weight: 700;
    color: #0F172A;
    margin-top: 2px;
  }

  /* ITEMS LIST */
  .items-section-title {
    font-size: 13px;
    font-weight: 800;
    color: #334155;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
  }

  .items-table-box {
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 14px;
  }

  .item-row {
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #FFFFFF;
    border-bottom: 1px solid #F1F5F9;
  }

  .item-row:last-child {
    border-bottom: none;
  }

  .item-name-col {
    flex: 1;
  }

  .item-name {
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
  }

  .item-unit-qty {
    font-size: 11.5px;
    color: #64748B;
    margin-top: 2px;
  }

  .item-price-val {
    font-size: 13px;
    font-weight: 800;
    color: #0F172A;
    text-align: right;
  }

  /* TOTAL CARD */
  .total-card {
    background: #F0F9FF;
    border: 1px solid #BAE6FD;
    border-radius: 14px;
    padding: 12px 16px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .total-label {
    font-size: 13px;
    font-weight: 700;
    color: #0369A1;
  }

  .total-amount {
    font-size: 19px;
    font-weight: 900;
    color: #0284C7;
  }

  /* AI BANNER */
  .ai-alert-banner {
    background: #F0FDF4;
    border: 1px solid #BAE6FD;
    background: #F8FAFC;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 11.5px;
    color: #0369A1;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  /* ACTION BUTTONS */
  .btn-row {
    display: flex;
    gap: 10px;
  }

  .btn-reject {
    flex: 1;
    height: 48px;
    border-radius: 14px;
    border: 1.5px solid #FCA5A5;
    background: #FEF2F2;
    color: #EF4444;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .btn-approve {
    flex: 2;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
    border: none;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
  }
</style>
</head>
<body>

  <!-- NỀN MỜ PHÍA SAU -->
  <div class="bg-screen">
    <div class="bg-header"></div>
  </div>

  <!-- OVERLAY VÀ MODAL POPUP -->
  <div class="modal-overlay">
    <div class="status-bar">
      <span>14:54</span>
      <div class="status-icons">
        <span>●●●●</span>
        <span>📶</span>
        <span>🔋 100%</span>
      </div>
    </div>

    <div style="flex: 1;"></div>

    <div class="modal-sheet">
      <div class="sheet-handle"></div>

      <!-- HEADER -->
      <div class="modal-top-header">
        <div class="header-icon-col">
          <div class="header-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <div class="po-code-title">Đơn Mua PO-2026-001</div>
            <div class="po-subtitle">Phê duyệt hạn mức ngân sách chuỗi</div>
          </div>
        </div>
        <div class="status-pill">
          <span>●</span>
          <span>Chờ Duyệt</span>
        </div>
      </div>

      <!-- META INFO -->
      <div class="meta-info-card">
        <div>
          <div class="meta-item-label">Nhà Cung Cấp:</div>
          <div class="meta-item-val">CP Dược Hậu Giang</div>
        </div>
        <div>
          <div class="meta-item-label">Cơ Sở Tiếp Nhận:</div>
          <div class="meta-item-val">Kho Tổng Trung Tâm</div>
        </div>
        <div>
          <div class="meta-item-label">Ngày Lập Đơn:</div>
          <div class="meta-item-val">26/10/2026</div>
        </div>
        <div>
          <div class="meta-item-label">Hạn Mức Quota Còn:</div>
          <div class="meta-item-val" style="color: #0284C7;">850.000.000 ₫</div>
        </div>
      </div>

      <!-- ITEMS SECTION -->
      <div class="items-section-title">
        <span>Danh mục dược phẩm đặt mua (3):</span>
        <span style="color: #64748B; font-weight: 600;">Chuẩn GSP</span>
      </div>

      <div class="items-table-box">
        <div class="item-row">
          <div class="item-name-col">
            <div class="item-name">Amoxicillin 500mg (Kháng sinh)</div>
            <div class="item-unit-qty">500 Hộp • 110.000 ₫ / Hộp</div>
          </div>
          <div class="item-price-val">55.000.000 ₫</div>
        </div>

        <div class="item-row">
          <div class="item-name-col">
            <div class="item-name">Panadol Extra Đỏ (Giảm đau hạ sốt)</div>
            <div class="item-unit-qty">1.000 Hộp • 95.000 ₫ / Hộp</div>
          </div>
          <div class="item-price-val">95.000.000 ₫</div>
        </div>

        <div class="item-row">
          <div class="item-name-col">
            <div class="item-name">Decolgen Forte (Trị cảm cúm)</div>
            <div class="item-unit-qty">400 Hộp • 87.500 ₫ / Hộp</div>
          </div>
          <div class="item-price-val">35.000.000 ₫</div>
        </div>
      </div>

      <!-- TOTAL -->
      <div class="total-card">
        <span class="total-label">Tổng Giá Trị Phê Duyệt:</span>
        <span class="total-amount">185.000.000 ₫</span>
      </div>

      <!-- AI RECOMMENDATION BANNER -->
      <div class="ai-alert-banner">
        <span>⚡</span>
        <span><b>AI Supply Chain:</b> Đơn hàng nằm trong ngưỡng dự báo tiêu thụ an toàn (+14.2% mùa dịch). Khuyến nghị phê duyệt.</span>
      </div>

      <!-- BUTTONS -->
      <div class="btn-row">
        <button class="btn-reject">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>TỪ CHỐI</span>
        </button>
        <button class="btn-approve">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>PHÊ DUYỆT ĐƠN HÀNG</span>
        </button>
      </div>

    </div>
  </div>

</body>
</html>
`;

async function renderDirectorScreens() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2
  });

  console.log('📸 Đang render director_po_detail_modal_phone.png (Sửa dứt điểm lỗi màn hình trắng trống)...');
  await page.setContent(htmlPoDetailModal, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(__dirname, '../docs/mobile_v2/director_po_detail_modal_phone.png')
  });
  await page.screenshot({
    path: path.join(__dirname, '../docs/mobile_v2/director_po_detail_modal_fullpage.png')
  });

  await browser.close();
  console.log('✅ Đã render thành công director_po_detail_modal_phone.png & fullpage!');
}

renderDirectorScreens().catch(console.error);
