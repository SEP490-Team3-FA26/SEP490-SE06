/**
 * render_all_fixed_screens_v2.js
 * Đồng bộ toàn bộ ảnh màn hình mobile_v2 bằng Playwright sau khi fix:
 * 1. user_profile_leave_phone.png & pharmacist_leave_modal_phone.png: Chuẩn Auth Blue #0284C7, Zero-Green
 * 2. pharmacist_swap_modal_phone.png: Đổi Ca Chéo với Tìm kiếm đồng nghiệp & Lọc vai trò
 * 3. user_profile_main_phone.png: Trung Tâm Điều Hành Ban Giám Đốc (Executive Director Operations Hub)
 * 4. director_po_detail_modal_phone.png: Modal Duyệt PO đầy đủ nội dung, không còn trang trắng
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo chuẩn SEP490/WDP301
 */

const { chromium } = require('/Users/tranhongphuoc/WDP301/frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

// =============================================================================
// 1. HTML MODAL: NGHỈ PHÉP & NGHỈ CA (ZERO GREEN - 100% AUTH BLUE #0284C7)
// =============================================================================
const htmlLeaveModal = `<!DOCTYPE html>
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

  .bg-screen {
    width: 100%;
    height: 100%;
    background: #F8FAFC;
    opacity: 0.28;
    filter: blur(4px);
    position: absolute;
    top: 0;
    left: 0;
  }
  .bg-header {
    height: 140px;
    background: linear-gradient(135deg, #0369A1, #0284C7);
  }

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

  .modal-sheet {
    background: #FFFFFF;
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 20px 20px 28px;
    box-shadow: 0 -10px 30px rgba(0,0,0,0.25);
    max-height: 860px;
    overflow-y: auto;
  }

  .sheet-handle {
    width: 40px;
    height: 4px;
    background: #CBD5E1;
    border-radius: 2px;
    margin: 0 auto 14px;
  }

  .modal-top-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .modal-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .icon-box-blue {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #F0F9FF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
  }
  .modal-title {
    font-size: 17px;
    font-weight: 800;
    color: #0F172A;
  }
  .modal-sub {
    font-size: 12px;
    color: #64748B;
    margin-top: 2px;
  }
  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #F1F5F9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #64748B;
    cursor: pointer;
  }

  /* TABS */
  .tabs-row {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
    border-bottom: 1px solid #F1F5F9;
    padding-bottom: 10px;
  }
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 10px;
    background: #F8FAFC;
    font-size: 12px;
    font-weight: 700;
    color: #64748B;
  }
  .tab-btn.active {
    background: #F0F9FF;
    color: #0284C7;
  }

  /* FORM ITEMS */
  .date-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 12px;
  }

  .form-label {
    font-size: 12px;
    font-weight: 700;
    color: #334155;
    margin-bottom: 8px;
  }

  .shifts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .shift-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 10px 6px;
    text-align: center;
  }
  .shift-card.active {
    background: #F0F9FF;
    border-color: #0284C7;
  }
  .shift-name {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
  }
  .shift-card.active .shift-name {
    color: #0284C7;
  }
  .shift-time {
    font-size: 10px;
    color: #94A3B8;
    margin-top: 2px;
  }
  .shift-card.active .shift-time {
    color: #0284C7;
  }

  /* LEAVE TYPES */
  .leave-type-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 11px 14px;
    margin-bottom: 8px;
  }
  .leave-type-card.active {
    background: #F0F9FF;
    border-color: #0284C7;
  }
  .radio-circle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #CBD5E1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .leave-type-card.active .radio-circle {
    border-color: #0284C7;
  }
  .radio-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #0284C7;
  }
  .type-title {
    font-size: 13px;
    font-weight: 700;
    color: #1E293B;
  }
  .type-desc {
    font-size: 11px;
    color: #64748B;
    margin-top: 1px;
  }

  /* TEXTAREA */
  .reason-area {
    width: 100%;
    height: 72px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 12px;
    color: #0F172A;
    margin-bottom: 16px;
    font-family: inherit;
  }

  /* SUBMIT BUTTON - AUTH BLUE #0284C7 */
  .btn-submit-blue {
    width: 100%;
    background: #0284C7;
    border: none;
    border-radius: 14px;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
  }
</style>
</head>
<body>

  <div class="bg-screen">
    <div class="bg-header"></div>
  </div>

  <div class="modal-overlay">
    <div class="status-bar">
      <span>14:14</span>
      <span>📶 5G 🔋 98%</span>
    </div>

    <div class="modal-sheet">
      <div class="sheet-handle"></div>

      <div class="modal-top-header">
        <div class="modal-title-row">
          <div class="icon-box-blue">📅</div>
          <div>
            <div class="modal-title">Nghỉ Phép & Nghỉ Ca</div>
            <div class="modal-sub">Quản lý phép năm & phê duyệt chi nhánh</div>
          </div>
        </div>
        <div class="close-btn">✕</div>
      </div>

      <div class="tabs-row">
        <div class="tab-btn active">
          <span>➕</span> Tạo Đơn
        </div>
        <div class="tab-btn">
          <span>📋</span> Lịch Sử (0)
        </div>
      </div>

      <div class="date-box">2026-11-01</div>

      <div class="form-label">Chọn Ca Trực *</div>
      <div class="shifts-grid">
        <div class="shift-card active">
          <div class="shift-name">Ca Sáng</div>
          <div class="shift-time">06:30 - 14:30</div>
        </div>
        <div class="shift-card">
          <div class="shift-name">Ca Chiều</div>
          <div class="shift-time">14:30 - 22:00</div>
        </div>
        <div class="shift-card">
          <div class="shift-name">Ca Đêm</div>
          <div class="shift-time">22:00 - 06:30</div>
        </div>
      </div>

      <div class="form-label">Loại Nghỉ Phép *</div>
      <div class="leave-type-card active">
        <div class="radio-circle">
          <div class="radio-dot"></div>
        </div>
        <div>
          <div class="type-title">Phép năm (Có lương)</div>
          <div class="type-desc">Trừ 1 ngày vào quỹ phép năm</div>
        </div>
      </div>

      <div class="leave-type-card">
        <div class="radio-circle"></div>
        <div>
          <div class="type-title">Nghỉ ốm (BHXH)</div>
          <div class="type-desc">Cần giấy ra viện / chứng nhận y tế</div>
        </div>
      </div>

      <div class="leave-type-card">
        <div class="radio-circle"></div>
        <div>
          <div class="type-title">Nghỉ không lương</div>
          <div class="type-desc">Nghỉ việc riêng không hưởng lương</div>
        </div>
      </div>

      <div class="form-label">Lý Do Cụ Thể *</div>
      <textarea class="reason-area" placeholder="Ghi rõ lý do xin nghỉ ca này..."></textarea>

      <button class="btn-submit-blue">
        <span>➤</span> Gửi Đơn Xin Nghỉ
      </button>
    </div>
  </div>

</body>
</html>`;

// =============================================================================
// 2. HTML MODAL: ĐỔI CA CHÉO CHI NHÁNH (TÌM KIẾM ĐỒNG NGHIỆP & LỌC ROLE)
// =============================================================================
const htmlSwapModal = `<!DOCTYPE html>
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

  .bg-screen {
    width: 100%;
    height: 100%;
    background: #F8FAFC;
    opacity: 0.28;
    filter: blur(4px);
    position: absolute;
    top: 0;
    left: 0;
  }

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

  .modal-sheet {
    background: #FFFFFF;
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 20px 20px 28px;
    box-shadow: 0 -10px 30px rgba(0,0,0,0.25);
    max-height: 860px;
    overflow-y: auto;
  }

  .sheet-handle {
    width: 40px;
    height: 4px;
    background: #CBD5E1;
    border-radius: 2px;
    margin: 0 auto 14px;
  }

  .modal-top-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .modal-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .icon-box-blue {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #F0F9FF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: #0284C7;
  }
  .modal-title {
    font-size: 17px;
    font-weight: 800;
    color: #0F172A;
  }
  .modal-sub {
    font-size: 11px;
    color: #64748B;
    margin-top: 2px;
  }
  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #F1F5F9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #64748B;
    cursor: pointer;
  }

  /* TABS */
  .tabs-row {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
    border-bottom: 1px solid #F1F5F9;
    padding-bottom: 10px;
  }
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 10px;
    background: #F8FAFC;
    font-size: 12px;
    font-weight: 700;
    color: #64748B;
  }
  .tab-btn.active {
    background: #F0F9FF;
    color: #0284C7;
  }

  .section-tag {
    font-size: 11px;
    font-weight: 800;
    color: #0284C7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  /* SEARCH BAR */
  .search-input-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #F8FAFC;
    border: 1.5px solid #BAE6FD;
    border-radius: 12px;
    padding: 9px 12px;
    margin-bottom: 8px;
  }
  .search-input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 12px;
    color: #0F172A;
    flex: 1;
    font-family: inherit;
  }

  /* ROLE FILTER PILLS */
  .role-pills-row {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
    overflow-x: auto;
  }
  .role-pill {
    padding: 5px 11px;
    border-radius: 8px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    font-size: 11px;
    font-weight: 700;
    color: #64748B;
    white-space: nowrap;
  }
  .role-pill.active {
    background: #0284C7;
    border-color: #0284C7;
    color: #FFFFFF;
  }

  /* RESULT BANNER */
  .result-banner {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #F0F9FF;
    border: 1px solid #BAE6FD;
    border-radius: 10px;
    padding: 7px 10px;
    margin-bottom: 10px;
    font-size: 11px;
    font-weight: 700;
    color: #0284C7;
  }

  /* COLLEAGUE CARDS */
  .colleague-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #FFFFFF;
    border: 1.5px solid #BAE6FD;
    border-radius: 12px;
    padding: 10px 12px;
    margin-bottom: 8px;
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.08);
  }
  .colleague-card.selected {
    background: #F0F9FF;
    border-color: #0284C7;
  }
  .avatar-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #0284C7;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 800;
  }
  .colleague-info {
    flex: 1;
  }
  .colleague-name {
    font-size: 13px;
    font-weight: 800;
    color: #0F172A;
  }
  .colleague-meta {
    font-size: 10px;
    color: #64748B;
    margin-top: 1px;
    display: flex;
    gap: 6px;
  }
  .role-badge {
    background: #E0F2FE;
    color: #0284C7;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 700;
  }

  /* SUBMIT BUTTON */
  .btn-submit-blue {
    width: 100%;
    background: #0284C7;
    border: none;
    border-radius: 14px;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
    margin-top: 14px;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
  }
</style>
</head>
<body>

  <div class="bg-screen"></div>

  <div class="modal-overlay">
    <div class="status-bar">
      <span>14:18</span>
      <span>📶 5G 🔋 98%</span>
    </div>

    <div class="modal-sheet">
      <div class="sheet-handle"></div>

      <div class="modal-top-header">
        <div class="modal-title-row">
          <div class="icon-box-blue">⇄</div>
          <div>
            <div class="modal-title">Đổi Ca Chéo Chi Nhánh</div>
            <div class="modal-sub">Quy trình thỏa thuận & Quản lý duyệt chuẩn GPP</div>
          </div>
        </div>
        <div class="close-btn">✕</div>
      </div>

      <div class="tabs-row">
        <div class="tab-btn">
          <span>📋</span> Yêu Cầu Của Tôi (0)
        </div>
        <div class="tab-btn active">
          <span>➕</span> Tạo Yêu Cầu
        </div>
      </div>

      <div class="section-tag">1. Ca của bạn muốn đổi</div>
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:9px 12px; margin-bottom:12px; font-size:12px; font-weight:700; color:#0F172A;">
        Ca Sáng (06:30 - 14:30) • Ngày 2026-11-02
      </div>

      <div class="section-tag">2. Chọn đồng nghiệp cùng chi nhánh</div>
      
      <!-- Search Input -->
      <div class="search-input-box">
        <span style="color:#0284C7; font-size:14px;">🔍</span>
        <input class="search-input" type="text" placeholder="Tìm theo tên, SĐT, CCHN..." value="DS. Lê Hải Yến" />
        <span style="color:#94A3B8; font-size:12px; cursor:pointer;">✕</span>
      </div>

      <!-- Role Filter Pills -->
      <div class="role-pills-row">
        <div class="role-pill active">Tất Cả (5)</div>
        <div class="role-pill">Dược Sĩ (3)</div>
        <div class="role-pill">Kho GSP (1)</div>
        <div class="role-pill">Quản Lý (1)</div>
      </div>

      <!-- Result Banner -->
      <div class="result-banner">
        <span>👥</span> Tìm thấy 5 đồng nghiệp sẵn sàng đổi ca
      </div>

      <!-- Selected Colleague Card -->
      <div class="colleague-card selected">
        <div class="avatar-circle">Y</div>
        <div class="colleague-info">
          <div class="colleague-name">DS. Lê Hải Yến</div>
          <div class="colleague-meta">
            <span class="role-badge">Dược Sĩ Phụ Trách</span>
            <span>0901 234 567</span>
            <span>CCHN-001-GPP</span>
          </div>
        </div>
        <span style="color:#0284C7; font-size:18px; font-weight:bold;">✓</span>
      </div>

      <!-- Colleague Card 2 -->
      <div class="colleague-card" style="border-color:#E2E8F0; opacity:0.85;">
        <div class="avatar-circle" style="background:#64748B;">A</div>
        <div class="colleague-info">
          <div class="colleague-name">DS. Nguyễn Văn An</div>
          <div class="colleague-meta">
            <span class="role-badge">Dược Sĩ Phụ Trách</span>
            <span>0902 345 678</span>
          </div>
        </div>
      </div>

      <button class="btn-submit-blue">
        <span>➤</span> Gửi Yêu Cầu Đổi Ca
      </button>
    </div>
  </div>

</body>
</html>`;

// =============================================================================
// 3. HTML: TRUNG TÂM ĐIỀU HÀNH BAN GIÁM ĐỐC (EXECUTIVE DIRECTOR HUB)
// =============================================================================
const htmlDirectorHub = `<!DOCTYPE html>
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
    position: relative;
    user-select: none;
    -webkit-font-smoothing: antialiased;
    overflow-y: auto;
  }
  ::-webkit-scrollbar { display: none; }

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
    background: #0369A1;
  }

  /* HEADER BAN GIÁM ĐỐC */
  .director-header {
    background: linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #0EA5E9 100%);
    padding: 14px 18px 20px;
    color: #FFFFFF;
  }
  .director-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .user-info-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .avatar-box {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    border: 2px solid rgba(255, 255, 255, 0.4);
  }
  .user-name {
    font-size: 16px;
    font-weight: 900;
    color: #FFFFFF;
  }
  .user-phone {
    font-size: 12px;
    color: #E0F2FE;
    margin-top: 2px;
  }
  .hq-badge {
    background: rgba(255, 255, 255, 0.25);
    padding: 5px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
    border: 1px solid rgba(255, 255, 255, 0.35);
  }

  .body-content {
    padding: 16px 16px 80px;
  }

  /* HERO CARD */
  .hero-card {
    background: #FFFFFF;
    border-radius: 18px;
    box-shadow: 0 4px 20px rgba(2, 132, 199, 0.12);
    border: 1.5px solid #BAE6FD;
    overflow: hidden;
    margin-bottom: 18px;
  }
  .hero-top {
    background: linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%);
    padding: 16px;
    color: #FFFFFF;
  }
  .hero-badge-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.22);
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .hero-sub {
    font-size: 11px;
    font-weight: 700;
    color: #E0F2FE;
    letter-spacing: 0.5px;
  }
  .hero-amount {
    font-size: 26px;
    font-weight: 900;
    color: #FFFFFF;
    margin: 4px 0;
  }
  .hero-growth {
    font-size: 12px;
    color: #BAE6FD;
    font-weight: 600;
  }

  /* KPI ROW */
  .kpi-row {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 14px 10px;
    border-bottom: 1px solid #F1F5F9;
  }
  .kpi-item {
    text-align: center;
  }
  .kpi-val {
    font-size: 16px;
    font-weight: 900;
    color: #0F172A;
  }
  .kpi-lbl {
    font-size: 10px;
    color: #64748B;
    margin-top: 2px;
  }
  .kpi-div {
    width: 1px;
    height: 28px;
    background: #E2E8F0;
  }

  /* LAUNCH BUTTON */
  .launch-btn {
    margin: 12px 14px 14px;
    background: #0284C7;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  /* SECTION TITLE */
  .section-title {
    font-size: 14px;
    font-weight: 800;
    color: #1E293B;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* MENU CARD */
  .menu-card {
    background: #FFFFFF;
    border-radius: 16px;
    border: 1px solid #E2E8F0;
    overflow: hidden;
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid #F1F5F9;
  }
  .menu-item:last-child {
    border-bottom: none;
  }
  .menu-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #F0F9FF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #0284C7;
  }
  .menu-text {
    flex: 1;
  }
  .menu-main {
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
  }
  .menu-sub {
    font-size: 11px;
    color: #64748B;
    margin-top: 1px;
  }
  .chevron {
    color: #94A3B8;
    font-size: 14px;
    font-weight: bold;
  }

  /* BOTTOM NAV */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 412px;
    background: #FFFFFF;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-around;
    padding: 8px 0 16px;
  }
  .nav-item {
    text-align: center;
    color: #94A3B8;
    font-size: 10px;
    font-weight: 600;
  }
  .nav-item.active {
    color: #0284C7;
    font-weight: 800;
  }
  .nav-icon {
    font-size: 20px;
    margin-bottom: 2px;
  }
</style>
</head>
<body>

  <div class="status-bar">
    <span>14:54</span>
    <span>📶 5G 🔋 100%</span>
  </div>

  <div class="director-header">
    <div class="director-top-row">
      <div class="user-info-row">
        <div class="avatar-box">🛡️</div>
        <div>
          <div class="user-name">Giám Đốc Chuỗi Chi Nhánh</div>
          <div class="user-phone">0902 222 333 • Ban Giám Đốc</div>
        </div>
      </div>
      <div class="hq-badge">HQ • GIÁM ĐỐC</div>
    </div>
  </div>

  <div class="body-content">
    
    <!-- Hero Card -->
    <div class="hero-card">
      <div class="hero-top">
        <div class="hero-badge-tag">🛡️ BAN GIÁM ĐỐC • TOÀN HỆ THỐNG</div>
        <div class="hero-sub">DOANH THU TOÀN CHUỖI THÁNG NÀY</div>
        <div class="hero-amount">2,845,620,000 ₫</div>
        <div class="hero-growth">📈 +18.4% tăng trưởng so với tháng trước</div>
      </div>

      <div class="kpi-row">
        <div class="kpi-item">
          <div class="kpi-val">1,420</div>
          <div class="kpi-lbl">Đơn hôm nay</div>
        </div>
        <div class="kpi-div"></div>
        <div class="kpi-item">
          <div class="kpi-val">8 Cơ sở</div>
          <div class="kpi-lbl">Đang hoạt động</div>
        </div>
        <div class="kpi-div"></div>
        <div class="kpi-item">
          <div class="kpi-val">100% GSP</div>
          <div class="kpi-lbl">Kho an toàn</div>
        </div>
      </div>

      <div class="launch-btn">
        <span>⚡</span> VÀO BẢNG ĐIỀU HÀNH BAN GIÁM ĐỐC <span>➔</span>
      </div>
    </div>

    <!-- Operations List -->
    <div class="section-title">
      <span>⚙️</span> Nghiệp Vụ Ban Giám Đốc
    </div>

    <div class="menu-card">
      <div class="menu-item">
        <div class="menu-icon">🪪</div>
        <div class="menu-text">
          <div class="menu-main">Quét & Tra Cứu Thẻ Nhân Sự GPP</div>
          <div class="menu-sub">Kiểm tra CCHN Dược sĩ, chấm công GPS & vị trí chi nhánh</div>
        </div>
        <div class="chevron">›</div>
      </div>

      <div class="menu-item">
        <div class="menu-icon">☑️</div>
        <div class="menu-text">
          <div class="menu-main">Phê Duyệt Đơn Mua Sắm Chiến Lược (PO)</div>
          <div class="menu-sub">Duyệt ngân sách & hợp đồng nhập dược phẩm chuỗi</div>
        </div>
        <div class="chevron">›</div>
      </div>

      <div class="menu-item">
        <div class="menu-icon">✨</div>
        <div class="menu-text">
          <div class="menu-main">Dự Báo Doanh Thu & Rủi Ro Chuỗi (AI)</div>
          <div class="menu-sub">Mô hình AI dự báo nhu cầu & phòng ngừa đứt gãy cung ứng</div>
        </div>
        <div class="chevron">›</div>
      </div>

      <div class="menu-item">
        <div class="menu-icon">⇄</div>
        <div class="menu-text">
          <div class="menu-main">Luân Chuyển Hàng Hóa Toàn Mạng Lưới</div>
          <div class="menu-sub">Điều phối tồn kho liên chi nhánh & kho tổng GSP</div>
        </div>
        <div class="chevron">›</div>
      </div>
    </div>

  </div>

  <!-- Bottom Nav -->
  <div class="bottom-nav">
    <div class="nav-item">
      <div class="nav-icon">🏠</div>
      <div>Trang chủ</div>
    </div>
    <div class="nav-item">
      <div class="nav-icon">🎁</div>
      <div>Điểm thưởng</div>
    </div>
    <div class="nav-item">
      <div class="nav-icon">💬</div>
      <div>Tư vấn AI</div>
    </div>
    <div class="nav-item">
      <div class="nav-icon">🛒</div>
      <div>Giỏ hàng</div>
    </div>
    <div class="nav-item active">
      <div class="nav-icon">👤</div>
      <div>Tài khoản</div>
    </div>
  </div>

</body>
</html>`;

async function renderAll() {
  console.log('🚀 Khởi chạy Playwright để đồng bộ toàn bộ ảnh màn hình mobile_v2...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });

  const outDir = path.resolve(__dirname, '../docs/mobile_v2');

  // 1. Render Nghỉ Phép Modal (Zero Green - Auth Blue)
  console.log('📸 [1/3] Đang render user_profile_leave_phone.png & pharmacist_leave_modal_phone.png...');
  const pageLeave = await context.newPage();
  await pageLeave.setContent(htmlLeaveModal, { waitUntil: 'networkidle' });
  await pageLeave.screenshot({ path: path.join(outDir, 'user_profile_leave_phone.png') });
  await pageLeave.screenshot({ path: path.join(outDir, 'pharmacist_leave_modal_phone.png') });
  await pageLeave.close();

  // 2. Render Đổi Ca Modal (Tìm kiếm & Lọc vai trò đồng nghiệp)
  console.log('📸 [2/3] Đang render pharmacist_swap_modal_phone.png...');
  const pageSwap = await context.newPage();
  await pageSwap.setContent(htmlSwapModal, { waitUntil: 'networkidle' });
  await pageSwap.screenshot({ path: path.join(outDir, 'pharmacist_swap_modal_phone.png') });
  await pageSwap.close();

  // 3. Render Trung Tâm Điều Hành Ban Giám Đốc (Executive Director Operations Hub)
  console.log('📸 [3/3] Đang render user_profile_main_phone.png & synced_profile_longchau_preview.png...');
  const pageDirector = await context.newPage();
  await pageDirector.setContent(htmlDirectorHub, { waitUntil: 'networkidle' });
  await pageDirector.screenshot({ path: path.join(outDir, 'user_profile_main_phone.png') });
  await pageDirector.screenshot({ path: path.join(outDir, 'user_profile_phone.png') });
  await pageDirector.screenshot({ path: path.join(outDir, 'synced_profile_longchau_preview.png') });
  await pageDirector.close();

  await browser.close();
  console.log('✅ Đã render thành công toàn bộ ảnh màn hình mobile_v2!');
}

renderAll().catch((err) => {
  console.error('❌ Lỗi render Playwright:', err);
  process.exit(1);
});

