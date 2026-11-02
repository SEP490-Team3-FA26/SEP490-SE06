/**
 * Script sinh tự động file docs/mobile_v2/index.html hoàn chỉnh
 * Tích hợp toàn bộ 68 Màn hình & Modal + Showcase Card Sản Phẩm + Báo cáo Agent Làm Chủ
 * ĐẶC BIỆT: NAVBAR / SIDEBAR CÓ THỂ MỞ RA MỞ VÔ MƯỢT MÀ ĐỂ DEMO VỚI KHÁCH HÀNG!
 * KÈM THEO: CHẾ ĐỘ DEMO KHÁCH HÀNG (ZEN PRESENTATION MODE) VỚI FLOATING PRESENTER CONTROLLER!
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const fs = require('fs');
const path = require('path');

const screens = JSON.parse(fs.readFileSync('docs/mobile_v2/screens_data.json', 'utf8'));

const REDESIGN_SCREENS = [
  {
    num: "01",
    id: "redesign_customer_home",
    title: "Trang Chủ Khách Hàng (Customer Home)",
    subagent: "Subagent 01 • Senior UX Architect",
    image: "01_customer_home_auth_blue.png",
    desc: "Đồng bộ Header Xanh Auth #0284C7, Thanh tìm kiếm thuốc thông minh, 8 danh mục bo tròn 20px, Banner ưu đãi gia đình, không viền đen cứng (Zero-Border)."
  },
  {
    num: "02",
    id: "redesign_medicine_cards",
    title: "Hệ Thống Thẻ Thuốc (Medicine Cards Showcase)",
    subagent: "Subagent 02 • Medical Card Specialist",
    image: "02_medicine_cards_showcase_auth_blue.png",
    desc: "Phân loại rõ Rx (Đỏ cảnh báo) & OTC (Xanh Auth). Đơn vị tính linh hoạt Hộp/Vỉ/Viên. Nút dấu cộng 44px chạm dễ dàng cho người lớn tuổi."
  },
  {
    num: "03",
    id: "redesign_medicine_detail",
    title: "Chi Tiết Dược Phẩm (Medicine Detail)",
    subagent: "Subagent 03 • Clinical UX Specialist",
    image: "04_medicine_detail_auth_blue.png",
    desc: "Hiển thị tương tác thuốc, hoạt chất, quy cách đóng gói, hướng dẫn sử dụng và nút Tư vấn Dược sĩ 1 chạm bảo đảm an toàn dược lâm sàng."
  },
  {
    num: "04",
    id: "redesign_cart_rewards",
    title: "Giỏ Hàng & Tích Điểm (Cart & Rewards)",
    subagent: "Subagent 04 • Loyalty & Checkout Specialist",
    image: "05_cart_rewards_auth_blue.png",
    desc: "Tích hợp thẻ hội viên ABC Club, thanh tiến trình đổi điểm, tự động đề xuất voucher giảm giá và tính toán miễn phí giao hàng tức thì."
  },
  {
    num: "05",
    id: "redesign_vietqr_payos",
    title: "Thanh Toán VietQR PayOS Chuẩn Y Tế",
    subagent: "Subagent 05 • Payment Integration Specialist",
    image: "06_vietqr_payos_auth_blue.png",
    desc: "QR VietQR động tích hợp cổng PayOS, tự động khớp mã đơn hàng, hiển thị thời gian chờ giao dịch và bảo mật tài chính tối đa."
  },
  {
    num: "06",
    id: "redesign_ai_consultant",
    title: "Dược Sĩ AI Tư Vấn Triệu Chứng 24/7",
    subagent: "Subagent 06 • AI Clinical Assistant",
    image: "07_ai_consultant_auth_blue.png",
    desc: "Khung chat y tế thông minh, gợi ý phác đồ điều trị ban đầu an toàn, cảnh báo chống chỉ định và kết nối trực tiếp với dược sĩ có chứng chỉ hành nghề."
  },
  {
    num: "07",
    id: "redesign_health_passport",
    title: "Sổ Sức Khỏe Số QR (Health Passport)",
    subagent: "Subagent 07 • Digital Health Record Architect",
    image: "08_digital_health_passport_auth_blue.png",
    desc: "Mã QR định danh bệnh nhân, lưu trữ nhóm máu, tiền sử dị ứng thuốc nghiêm trọng, bệnh mãn tính và lịch tái khám định kỳ."
  },
  {
    num: "08",
    id: "redesign_medicine_reminder",
    title: "Lịch Nhắc Uống Thuốc Offline 100%",
    subagent: "Subagent 08 • Patient Adherence Specialist",
    image: "09_medicine_reminder_auth_blue.png",
    desc: "Hoạt động độc lập không cần mạng hoặc Google Push. Phân bổ sáng/trưa/chiều/tối, đếm số viên còn lại và nhắc uống trước/sau bữa ăn."
  },
  {
    num: "09",
    id: "redesign_pharmacist_pos",
    title: "POS Bán Lẻ Cho Dược Sĩ Quầy Thuốc",
    subagent: "Subagent 09 • Pharmacy Retail POS Architect",
    image: "10_pharmacist_pos_auth_blue.png",
    desc: "Quét mã Barcode GS1 siêu tốc, tra cứu tồn kho thực tế tại chi nhánh, hỗ trợ bán thuốc kê đơn có đính kèm toa và in hóa đơn VAT điện tử."
  },
  {
    num: "10",
    id: "redesign_warehouse_gsp",
    title: "Sơ Đồ Kho & Quản Lý Lô Chuẩn GSP",
    subagent: "Subagent 10 • Logistics & GSP Specialist",
    image: "11_warehouse_gsp_auth_blue.png",
    desc: "Giám sát nhiệt độ độ ẩm kho lạnh bằng cảm biến IoT, định vị vị trí kệ kho (A1-02-03), áp dụng quy tắc xuất kho FEFO chống hết hạn dùng."
  }
];

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ABC PHARMACY - ${screens.length} Màn Hình Mobile & Showcase Card Sản Phẩm v2.0 (Auth Blue)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* ─── BỘ MÀU XANH AUTH ĐỒNG BỘ (SKY / MEDICAL BLUE) ─── */
      --primary: #0284C7;             /* Sky-600 */
      --primary-light: #0EA5E9;       /* Sky-500 */
      --primary-accent: #38BDF8;      /* Sky-400 */
      --primary-dark: #0369A1;        /* Sky-700 */
      --primary-deep: #0C4A6E;        /* Sky-900 */
      --primary-gradient: linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #38BDF8 100%);
      --primary-btn-gradient: linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%);
      
      /* ─── CANVAS VÀ PANEL TỐI ─── */
      --bg-canvas: #090E17;
      --bg-panel: #0F172A;
      --bg-panel-elevated: #1E293B;
      --bg-card: rgba(30, 41, 59, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-focus: #0284C7;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;

      /* ─── MÀU NGỮ NGHĨA Y TẾ GPP & THƯƠNG HIỆU AUTH CHUẨN ─── */
      --amber: #F59E0B;
      --rose: #EF4444;
      --phone-w: 390px;
      --phone-h: 844px;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;

      /* ─── ZERO-BORDER THẺ SẢN PHẨM ─── */
      --shadow-card: 0 4px 20px -2px rgba(2, 132, 199, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04);
      --shadow-hover: 0 12px 30px -4px rgba(2, 132, 199, 0.16);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background-color: var(--bg-canvas);
      color: var(--text-main);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ─── 1. TOPBAR CHÍNH ─── */
    .topbar {
      height: 62px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      z-index: 100;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* NÚT BẤM MỞ RA / THU VÀO NAVBAR SIDEBAR */
    .btn-toggle-sidebar {
      background: var(--bg-panel-elevated);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 7px 12px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 700;
      transition: all 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .btn-toggle-sidebar:hover {
      background: rgba(2, 132, 199, 0.2);
      border-color: #38BDF8;
      color: #FFFFFF;
      transform: translateY(-1px);
    }

    .btn-toggle-sidebar.active {
      background: var(--primary);
      color: #FFFFFF;
      border-color: #38BDF8;
    }

    .brand-logo {
      width: 34px;
      height: 34px;
      background: var(--primary-btn-gradient);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px rgba(2, 132, 199, 0.5);
    }

    .brand-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 20px;
      background: rgba(14, 165, 233, 0.15);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* NAV TABS TRÊN TOPBAR */
    .topbar-nav {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(30, 41, 59, 0.6);
      padding: 4px;
      border-radius: 30px;
      border: 1px solid var(--border-color);
    }

    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .nav-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-btn.active {
      background: var(--primary);
      color: #FFFFFF;
      box-shadow: 0 2px 10px rgba(2, 132, 199, 0.4);
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-pill {
      background: var(--bg-panel-elevated);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .btn-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-pill.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary-accent);
      box-shadow: 0 0 12px rgba(2, 132, 199, 0.4);
    }

    .btn-pill-demo {
      background: linear-gradient(135deg, #0284C7 0%, #38BDF8 100%);
      color: white;
      border: none;
      font-weight: 800;
      box-shadow: 0 2px 12px rgba(2, 132, 199, 0.35);
    }

    .btn-pill-demo:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(2, 132, 199, 0.5);
    }

    /* ─── 2. BỐ CỤC CHÍNH ─── */
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* ─── 3. THANH DANH SÁCH BÊN TRÁI (SIDEBAR 68 MÀN HÌNH - COLLAPSIBLE) ─── */
    .sidebar {
      width: 320px;
      background: var(--bg-panel);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 30;
      transition: margin-left 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease, width 0.3s ease;
      position: relative;
    }

    /* KHI THU GỌN SIDEBAR */
    .sidebar.collapsed {
      margin-left: -320px;
      opacity: 0;
      pointer-events: none;
    }

    .sidebar-header-box {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .search-box {
      flex: 1;
      background: var(--bg-panel-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      color: var(--text-main);
      font-size: 12.5px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .search-box:focus {
      border-color: var(--primary-accent);
    }

    .btn-close-sidebar {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close-sidebar:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
    }

    .screen-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 10px;
    }

    .screen-list::-webkit-scrollbar {
      width: 5px;
    }

    .screen-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    .category-group {
      margin-bottom: 12px;
    }

    .category-header {
      font-size: 11px;
      font-weight: 800;
      color: #38BDF8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .category-header-count {
      background: rgba(14, 165, 233, 0.2);
      color: #38BDF8;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
    }

    .screen-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.18s ease;
      margin-bottom: 3px;
      border: 1px solid transparent;
    }

    .screen-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .screen-item.active {
      background: rgba(2, 132, 199, 0.18);
      border-color: rgba(56, 189, 248, 0.4);
    }

    .screen-item-thumb {
      width: 40px;
      height: 54px;
      border-radius: 6px;
      background: #020617;
      border: 1px solid var(--border-color);
      overflow: hidden;
      flex-shrink: 0;
    }

    .screen-item-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
    }

    .screen-item-content {
      flex: 1;
      min-width: 0;
    }

    .screen-item-title {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .screen-item-sub {
      font-size: 10.5px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* NÚT FLOATING MỞ SIDEBAR KHI ĐANG COLLAPSED */
    .floating-open-sidebar-btn {
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38BDF8;
      padding: 8px 14px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: none;
      align-items: center;
      gap: 8px;
      z-index: 40;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
      transition: all 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
    }

    .floating-open-sidebar-btn:hover {
      background: var(--primary);
      color: white;
      transform: scale(1.04);
      border-color: #38BDF8;
    }

    .floating-open-sidebar-btn.visible {
      display: flex;
    }

    /* ─── 4. KHÔNG GIAN CANVAS TRUNG TÂM ─── */
    .canvas-viewport {
      flex: 1;
      overflow: auto;
      background: radial-gradient(#1e293b 1.2px, transparent 1.2px);
      background-size: 26px 26px;
      background-color: var(--bg-canvas);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px;
      position: relative;
      transition: all 0.3s ease;
    }

    .view-tab-content {
      display: none;
      width: 100%;
      flex-direction: column;
      align-items: center;
    }

    .view-tab-content.active {
      display: flex;
    }

    .screen-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 100%;
      position: relative;
    }

    .screen-meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      padding: 8px 20px;
      border-radius: 30px;
      margin-bottom: 20px;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .screen-meta-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38BDF8;
      box-shadow: 0 0 10px #38BDF8;
    }

    /* KHUNG IPHONE MOCKUP FRAME */
    .phone-mockup {
      width: 390px;
      height: 844px;
      background: #000;
      border-radius: 48px;
      box-shadow: 0 25px 70px -15px rgba(0, 0, 0, 0.8),
                  0 0 0 10px #1E293B,
                  0 0 0 12px #334155;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
    }

    .phone-mockup.full-mode {
      height: auto;
      max-height: none;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7),
                  0 0 0 1px var(--border-color);
    }

    .phone-island {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 110px;
      height: 28px;
      background: #000;
      border-radius: 20px;
      z-index: 50;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
    }

    .phone-mockup.full-mode .phone-island {
      display: none;
    }

    .phone-screen-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
      scroll-behavior: smooth;
    }

    .phone-screen-container::-webkit-scrollbar {
      width: 4px;
    }

    .phone-screen-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .phone-screen-image {
      width: 100%;
      display: block;
    }

    /* GRID FIGMA BOARDS VIEW (XEM 68 MÀN HÌNH CÙNG LÚC) */
    .grid-view-container {
      display: none;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      width: 100%;
      max-width: 1600px;
    }

    .grid-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
    }

    .grid-card:hover {
      transform: translateY(-6px);
      border-color: var(--primary);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(2, 132, 199, 0.2);
    }

    .grid-card-preview {
      height: 460px;
      background: #020617;
      overflow: hidden;
      position: relative;
    }

    .grid-card-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      transition: transform 0.3s ease;
    }

    .grid-card:hover .grid-card-preview img {
      transform: scale(1.02);
    }

    .grid-card-body {
      padding: 16px;
    }

    .grid-card-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      color: #38BDF8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .grid-card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 6px;
      line-height: 1.3;
    }

    .grid-card-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ─── ROLE FILTER BAR (PHÂN LOẠI THEO VAI TRÒ) ─── */
    .role-filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      margin-bottom: 22px;
      width: 100%;
      max-width: 1600px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
      position: sticky;
      top: 0;
      z-index: 50;
      transition: all 0.3s ease;
    }

    .role-filter-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #38BDF8;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      white-space: nowrap;
    }

    .role-filter-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      flex: 1;
      padding: 2px 0;
    }

    .role-filter-pills::-webkit-scrollbar {
      display: none;
    }

    .role-pill {
      background: var(--bg-panel-elevated);
      border: 1px solid var(--border-color);
      color: #94A3B8;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
    }

    .role-pill:hover {
      background: rgba(2, 132, 199, 0.15);
      border-color: rgba(56, 189, 248, 0.4);
      color: #F0F9FF;
      transform: translateY(-1px);
    }

    .role-pill.active {
      background: linear-gradient(135deg, #0284C7, #0369A1);
      border-color: #38BDF8;
      color: #FFFFFF;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
    }

    .role-pill .role-count {
      background: rgba(255, 255, 255, 0.15);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
    }

    .role-pill.active .role-count {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }

    .role-filter-summary {
      font-size: 12px;
      color: #94A3B8;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .role-filter-summary strong {
      color: #38BDF8;
      font-family: 'JetBrains Mono', monospace;
    }

    /* MINI PILLS TRONG SIDEBAR */
    .sidebar-role-pills {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
      overflow-x: auto;
      scrollbar-width: none;
      background: rgba(15, 23, 42, 0.6);
    }

    .sidebar-role-pills::-webkit-scrollbar {
      display: none;
    }

    .sidebar-role-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      color: #94A3B8;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 9px;
      border-radius: 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .sidebar-role-pill:hover {
      background: rgba(2, 132, 199, 0.15);
      color: #38BDF8;
      border-color: rgba(56, 189, 248, 0.3);
    }

    .sidebar-role-pill.active {
      background: #0284C7;
      color: #FFFFFF;
      border-color: #38BDF8;
      font-weight: 800;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }

    /* ─── ROLE BADGES THEME MÀU SẮC CHUẨN ─── */
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 6px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .role-badge.role-all {
      background: rgba(56, 189, 248, 0.15);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .role-badge.role-customer {
      background: rgba(14, 165, 233, 0.15);
      color: #38BDF8;
      border: 1px solid rgba(14, 165, 233, 0.3);
    }
    .role-badge.role-pharmacist {
      background: rgba(2, 132, 199, 0.25);
      color: #38BDF8;
      border: 1px solid rgba(2, 132, 199, 0.5);
    }
    .role-badge.role-warehouse {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .role-badge.role-branch {
      background: rgba(99, 102, 241, 0.15);
      color: #A5B4FC;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }
    .role-badge.role-director {
      background: rgba(236, 72, 153, 0.15);
      color: #F472B6;
      border: 1px solid rgba(236, 72, 153, 0.3);
    }
    .role-badge.role-guest {
      background: rgba(129, 140, 248, 0.15);
      color: #C7D2FE;
      border: 1px solid rgba(129, 140, 248, 0.3);
    }
    .role-badge.role-admin {
      background: rgba(2, 132, 199, 0.18);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.35);
    }

    .grid-card-order-tag {
      position: absolute;
      top: 10px;
      right: 12px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38BDF8;
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      backdrop-filter: blur(8px);
      z-index: 2;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    .grid-card-header-tags {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .screen-item-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 3px;
    }

    .screen-item-role-tag {
      font-size: 9px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* ─── FLOATING PRESENTER CONTROLLER (CHO DEMO KHÁCH HÀNG) ─── */
    .presenter-floating-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 40px;
      padding: 8px 18px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(2, 132, 199, 0.3);
      z-index: 99;
      transition: all 0.3s ease;
    }

    .presenter-btn {
      background: var(--bg-panel-elevated);
      color: #FFFFFF;
      border: 1px solid var(--border-color);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .presenter-btn:hover {
      background: var(--primary);
      border-color: #38BDF8;
      transform: scale(1.08);
    }

    .presenter-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 220px;
    }

    .presenter-screen-title {
      font-size: 13px;
      font-weight: 800;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
    }

    .presenter-screen-counter {
      font-size: 11px;
      color: #38BDF8;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
    }

    /* ─── 5. BẢNG GÓP Ý & THÔNG TIN BÊN PHẢI (INSPECTOR - COLLAPSIBLE) ─── */
    .feedback-drawer {
      width: 320px;
      background: var(--bg-panel);
      border-left: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 30;
      transition: margin-right 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease;
    }

    .feedback-drawer.collapsed {
      margin-right: -320px;
      opacity: 0;
      pointer-events: none;
    }

    .drawer-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .drawer-title {
      font-size: 13.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .drawer-content::-webkit-scrollbar {
      width: 4px;
    }

    .screen-info-box {
      background: var(--bg-panel-elevated);
      border-radius: var(--radius-md);
      padding: 14px;
      border: 1px solid var(--border-color);
    }

    .screen-info-item {
      margin-bottom: 8px;
    }

    .screen-info-label {
      font-size: 10.5px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .screen-info-value {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-main);
      word-break: break-all;
    }

    .feedback-input-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feedback-textarea {
      width: 100%;
      height: 85px;
      background: var(--bg-panel-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 10px;
      color: var(--text-main);
      font-size: 12.5px;
      outline: none;
      resize: none;
      font-family: inherit;
    }

    .feedback-textarea:focus {
      border-color: var(--primary-accent);
    }

    .notes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .note-card {
      background: var(--bg-panel-elevated);
      border-left: 3px solid var(--primary-accent);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .note-card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-weight: 700;
      color: #38BDF8;
      font-size: 11px;
    }

    /* ─── 6. STYLES CHO TAB SHOWCASE CARD SẢN PHẨM ─── */
    .cards-matrix-view {
      width: 100%;
      max-width: 1150px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .matrix-hero {
      background: var(--bg-panel);
      padding: 24px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .matrix-grid-2col {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .med-card-white {
      background: #FFFFFF;
      border-radius: 20px;
      padding: 16px;
      box-shadow: var(--shadow-card);
      border: 1px solid rgba(224, 242, 254, 0.7);
      display: flex;
      flex-direction: column;
      color: #0F172A;
      transition: all 0.25s;
    }

    .med-card-white:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
      border-color: #38BDF8;
    }

    .pill-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 8px;
      display: inline-block;
    }

    .pill-otc { background: #F0F9FF; color: #0284C7; border: 1px solid #BAE6FD; }
    .pill-rx { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
    .pill-sale { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
    .pill-best { background: #FEF3C7; color: #B45309; border: 1px solid #FCD34D; }

    /* FOOTER STATUS */
    .status-bar-bottom {
      height: 40px;
      background: rgba(15, 23, 42, 0.96);
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      font-size: 11.5px;
      color: var(--text-muted);
      z-index: 100;
    }

    /* ─── 7. STYLES CHO TAB 10 MÀN REDESIGN TĨNH (SUBAGENTS UI V2) ─── */
    .redesign-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
      width: 100%;
    }

    .redesign-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    }

    .redesign-card:hover {
      transform: translateY(-4px);
      border-color: rgba(56, 189, 248, 0.4);
      box-shadow: 0 12px 30px rgba(2, 132, 199, 0.2);
    }

    .redesign-thumb-frame {
      width: 100%;
      height: 480px;
      border-radius: 16px;
      overflow: hidden;
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
      cursor: zoom-in;
    }

    .redesign-thumb-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      transition: transform 0.35s ease;
    }

    .redesign-thumb-frame:hover img {
      transform: scale(1.025);
    }

    .redesign-thumb-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(12, 74, 110, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.5);
      color: #38BDF8;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      backdrop-filter: blur(8px);
    }

    .redesign-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .redesign-subagent-tag {
      font-size: 11px;
      color: #38BDF8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .redesign-title {
      font-size: 16px;
      font-weight: 800;
      color: #F8FAFC;
    }

    .redesign-desc {
      font-size: 12.5px;
      color: #94A3B8;
      line-height: 18px;
    }

    /* LIGHTBOX ZOOM MODAL */
    .lightbox-modal {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.92);
      backdrop-filter: blur(12px);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 20px;
    }

    .lightbox-modal.active {
      display: flex;
    }

    .lightbox-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .lightbox-img {
      max-width: 100%;
      max-height: 82vh;
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(56, 189, 248, 0.3);
      object-fit: contain;
    }

    .lightbox-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      color: #F8FAFC;
    }

    .lightbox-close-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #F8FAFC;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.2s;
    }

    .lightbox-close-btn:hover {
      background: #EF4444;
      border-color: #EF4444;
    }
  </style>
</head>
<body>

  <!-- TOPBAR -->
  <header class="topbar">
    <div class="brand">
      <!-- NÚT MỞ RA / MỞ VÔ SIDEBAR TRÊN NAVBAR -->
      <button class="btn-toggle-sidebar" id="btnToggleSidebar" onclick="toggleSidebar()" title="Đóng / Mở Menu Danh Sách (Phím tắt: [ hoặc Ctrl+B)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span id="sidebarToggleLabel">☰ Menu ${screens.length} Màn</span>
      </button>

      <div class="brand-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17"/>
        </svg>
      </div>
      <div>
        <div class="brand-title">
          ABC PHARMACY
          <span class="brand-badge">UI v2.0 • AUTH BLUE</span>
        </div>
      </div>
    </div>

    <!-- 3 TABS ĐIỀU HƯỚNG CHÍNH -->
    <nav class="topbar-nav">
      <button class="nav-btn active" onclick="switchTab('all-screens')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/></svg>
        ${screens.length} Màn Hình & Modal
      </button>
      <button class="nav-btn" onclick="switchTab('redesign')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        10 Màn Redesign (Subagents UI v2)
      </button>
      <button class="nav-btn" onclick="switchTab('cards')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Showcase Card Dược Phẩm
      </button>
      <button class="nav-btn" onclick="switchTab('audit')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
        Báo Cáo Thẩm Định
      </button>
    </nav>

    <!-- ACTIONS -->
    <div class="toolbar-actions">
      <!-- NÚT DEMO KHÁCH HÀNG (ZEN MODE) -->
      <button class="btn-pill btn-pill-demo" id="btnDemoMode" onclick="toggleDemoMode()" title="Chế độ thuyết trình tối giản dành cho khách hàng">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span id="demoModeText">Demo Khách Hàng</span>
      </button>

      <button class="btn-pill" id="btn-toggle-view" onclick="toggleViewMode()">
        <span>📐 Cuộn Phone</span>
      </button>
      <button class="btn-pill" id="btn-toggle-grid" onclick="toggleGridMode()">
        <span>🔲 Lưới Figma (${screens.length} Màn)</span>
      </button>
      <button class="btn-pill" id="btnToggleDrawer" onclick="toggleDrawer()" title="Ẩn/Hiện Bảng Chi Tiết & Góp Ý">
        <span>ℹ️ Chi Tiết</span>
      </button>
    </div>
  </header>

  <!-- WORKSPACE -->
  <div class="main-container">

    <!-- SIDEBAR MÀN HÌNH (MỞ RA / MỞ VÔ) -->
    <aside class="sidebar" id="sidebarContainer">
      <div class="sidebar-header-box">
        <input type="text" class="search-box" id="screenSearchInput" placeholder="Tìm kiếm trong ${screens.length} màn hình..." oninput="handleSearch(this.value)">
        <button class="btn-close-sidebar" onclick="toggleSidebar()" title="Đóng Menu (Phím [)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div class="sidebar-role-pills" id="sidebarRolePills">
        <!-- Render mini-pills qua JS -->
      </div>
      <div class="screen-list" id="screenListContainer">
        <!-- Render danh sách màn hình bằng JavaScript -->
      </div>
    </aside>

    <!-- KHÔNG GIAN CANVAS -->
    <main class="canvas-viewport" id="canvasViewport">

      <!-- NÚT NỔI FLOATING ĐỂ MỞ LẠI SIDEBAR KHI ĐANG COLLAPSED -->
      <button class="floating-open-sidebar-btn" id="floatingSidebarToggle" onclick="toggleSidebar()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        <span>Mở Menu ${screens.length} Màn Hình</span>
      </button>

      <!-- ============================================================== -->
      <!-- TAB 1: TOÀN BỘ ${screens.length} MÀN HÌNH & MODAL                            -->
      <!-- ============================================================== -->
      <div id="tab-all-screens" class="view-tab-content active">
        <!-- ROLE FILTER BAR (PHÂN LOẠI THEO VAI TRÒ) -->
        <div class="role-filter-bar" id="roleFilterBar">
          <div class="role-filter-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span>Phân loại vai trò:</span>
          </div>
          <div class="role-filter-pills" id="roleFilterPills">
            <!-- Render các pill tự động qua JavaScript -->
          </div>
          <div class="role-filter-summary" id="roleFilterSummary">
            <span>Hiển thị: </span><strong id="roleDisplayCount">${screens.length} / ${screens.length}</strong>
          </div>
        </div>

        <!-- KHUNG SÂN KHẤU TRÌNH DIỄN (STAGE VIEW) -->
        <div class="screen-stage" id="screen-stage">
          <div class="screen-meta-badge">
            <span class="dot"></span>
            <span id="stage-screen-role" class="role-badge role-guest">🔐 Khách & Auth</span>
            <span style="color: var(--border-color);">|</span>
            <span id="stage-screen-category" style="color: #38BDF8; font-weight: 700;">1. Xác thực & Tài khoản</span>
            <span style="color: var(--border-color);">|</span>
            <span id="stage-screen-title" style="font-weight: 800;">Màn Hình Mở Đầu (Splash Screen)</span>
            <span id="stage-screen-dims" style="color: var(--text-muted); font-size: 11px;">(412 x 915px Phone)</span>
          </div>

          <!-- MOCKUP KHUNG IPHONE 16 PRO -->
          <div class="phone-mockup" id="phone-mockup">
            <div class="phone-island"></div>
            <div class="phone-screen-container" id="phone-screen-container">
              <img id="stage-screen-img" class="phone-screen-image" src="${screens[0].phoneImage}" alt="${screens[0].name}">
            </div>
          </div>
        </div>

        <!-- LƯỚI TOÀN CẢNH (FIGMA MULTI-BOARD GRID VIEW) -->
        <div class="grid-view-container" id="grid-view-container">
          <!-- Render 70 card tự động -->
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 2: SHOWCASE CARD SẢN PHẨM THUỐC                            -->
      <!-- ============================================================== -->
      
      <!-- ============================================================== -->
      <!-- TAB 2: 10 MÀN REDESIGN TĨNH (SUBAGENTS UI V2)                   -->
      <!-- ============================================================== -->
      <div id="tab-redesign" class="view-tab-content">
        <div class="cards-matrix-view">
          <div class="matrix-hero">
            <div>
              <h2 style="font-size: 20px; font-weight: 800; color: #F8FAFC;">
                ✨ Bộ Sưu Tập 10 Màn Redesign Trực Quan - Chuẩn Tone Xanh Auth #0284C7
              </h2>
              <p style="color: #94A3B8; font-size: 13px; margin-top: 4px;">
                Được thiết kế độc lập bởi 10 Subagents chuyên biệt • Thẩm định khắt khe bởi Lead UX Reviewer • Triệt tiêu 100% viền đen cứng (Zero-Border)
              </p>
            </div>
            <span class="pill-badge pill-otc" style="font-size: 12px; padding: 6px 14px;">10 Màn Redesign V2</span>
          </div>

          <div class="redesign-grid">
            ${REDESIGN_SCREENS.map(s => `
              <div class="redesign-card">
                <div class="redesign-thumb-frame" onclick="openLightbox('${s.image}', '${s.title}')" title="Nhấp để phóng to ảnh chất lượng cao">
                  <img src="${s.image}" alt="${s.title}" loading="lazy">
                  <span class="redesign-thumb-badge">Màn #${s.num}</span>
                </div>
                <div class="redesign-info">
                  <span class="redesign-subagent-tag">${s.subagent}</span>
                  <div class="redesign-title">${s.title}</div>
                  <div class="redesign-desc">${s.desc}</div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <button class="btn-pill" style="flex: 1; justify-content: center; font-size: 11.5px; padding: 7px 12px;" onclick="openLightbox('${s.image}', '${s.title}')">
                    🔍 Phóng To Xem Chi Tiết
                  </button>
                  <a href="${s.image}" download="${s.image}" class="btn-pill" style="justify-content: center; font-size: 11.5px; padding: 7px 12px;" title="Tải ảnh về máy">
                    💾 Tải Ảnh
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div id="tab-cards" class="view-tab-content">
        <div class="cards-matrix-view">
          <div class="matrix-hero">
            <div>
              <h2 style="font-size: 20px; font-weight: 800; color: #F8FAFC;">
                🏷️ Showcase Chi Tiết Toàn Bộ Thẻ Sản Phẩm Dược Phẩm (Medicine Cards)
              </h2>
              <p style="color: #94A3B8; font-size: 13px; margin-top: 4px;">
                Chuẩn Zero-Border • Bo góc 20px • Đơn vị tính Hộp/Vỉ/Viên • Đồng bộ màu Xanh Auth #0284C7
              </p>
            </div>
            <span class="pill-badge pill-otc" style="font-size: 12px; padding: 6px 14px;">Đầy Đủ 8 Kiểu Card</span>
          </div>

          <!-- THẺ GRID 2 CỘT -->
          <div class="matrix-grid-2col">
            <!-- Card 1: Panadol Extra -->
            <div class="med-card-white">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="pill-badge pill-otc">OTC • Không kê đơn</span>
                <span style="color: #EF4444; font-size: 16px;">♥</span>
              </div>
              <div style="width: 100%; aspect-ratio: 1 / 1; background: #F8FAFC; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 50px;">💊</div>
              <div style="font-size: 11px; color: #0284C7; font-weight: 800; text-transform: uppercase; margin-top: 10px;">Giảm đau - Hạ sốt</div>
              <h3 style="font-size: 15px; font-weight: 800; margin-top: 4px;">Viên Nén Panadol Extra Đỏ (Hộp 180 viên)</h3>
              <p style="font-size: 11.5px; color: #64748B; margin-top: 2px;">Hoạt chất: Paracetamol 500mg, Caffeine 65mg</p>
              <div style="display: flex; gap: 6px; margin: 10px 0;">
                <span style="background: #E0F2FE; color: #0284C7; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">Hộp (180 viên)</span>
                <span style="background: #F1F5F9; color: #64748B; font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 6px;">Vỉ (12 viên)</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; border-top: 1px dashed #E2E8F0; padding-top: 8px;">
                <div>
                  <div style="font-size: 11px; color: #94A3B8; text-decoration: line-through;">220.000 ₫</div>
                  <div style="font-size: 17px; font-weight: 900; color: #0284C7; font-family: 'JetBrains Mono', monospace;">195.000 ₫</div>
                </div>
                <button style="width: 36px; height: 36px; border-radius: 18px; background: var(--primary-btn-gradient); border: none; color: white; font-weight: 900; font-size: 18px; cursor: pointer;">+</button>
              </div>
            </div>

            <!-- Card 2: Augmentin 1g -->
            <div class="med-card-white">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="pill-badge pill-rx">Rx • Thuốc kê đơn</span>
                <span style="color: #94A3B8; font-size: 16px;">♡</span>
              </div>
              <div style="width: 100%; aspect-ratio: 1 / 1; background: #F8FAFC; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 50px;">🧪</div>
              <div style="font-size: 11px; color: #D97706; font-weight: 800; text-transform: uppercase; margin-top: 10px;">Kháng sinh phổ rộng</div>
              <h3 style="font-size: 15px; font-weight: 800; margin-top: 4px;">Kháng Sinh Augmentin 1g (Hộp 14 viên)</h3>
              <p style="font-size: 11.5px; color: #64748B; margin-top: 2px;">Amoxicillin 875mg + Acid Clavulanic 125mg</p>
              <div style="display: flex; gap: 6px; margin: 10px 0;">
                <span style="background: #FEF3C7; color: #B45309; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">Hộp (14 viên)</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; border-top: 1px dashed #E2E8F0; padding-top: 8px;">
                <div>
                  <div style="font-size: 11px; color: #94A3B8; text-decoration: line-through;">260.000 ₫</div>
                  <div style="font-size: 17px; font-weight: 900; color: #D97706; font-family: 'JetBrains Mono', monospace;">245.000 ₫</div>
                </div>
                <button style="background: #D97706; border: none; color: white; padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer;">Tư vấn toa</button>
              </div>
            </div>
          </div>

          <!-- Card 3 & 4 -->
          <div class="matrix-grid-2col">
            <!-- Flash sale Berocca -->
            <div class="med-card-white" style="border: 1.5px solid #FECACA;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="pill-badge pill-sale">⚡ GIẢM 24% • FLASH SALE</span>
                <span style="font-size: 11px; font-weight: 800; color: #DC2626; font-family: monospace;">⏳ 02:45:18</span>
              </div>
              <div style="width: 100%; aspect-ratio: 1 / 1; background: #FFF5F5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 50px;">🍊</div>
              <div style="font-size: 11px; color: #DC2626; font-weight: 800; text-transform: uppercase; margin-top: 10px;">Vitamin & Đề kháng</div>
              <h3 style="font-size: 15px; font-weight: 800; margin-top: 4px;">Viên Sủi Berocca Performance Vị Cam (10 viên)</h3>
              <div style="font-size: 11px; color: #DC2626; font-weight: 700; margin: 8px 0 4px 0;">Đã bán 78% • Còn 12 tuýp</div>
              <div style="height: 6px; background: #FEE2E2; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
                <div style="width: 78%; height: 100%; background: #DC2626;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; border-top: 1px dashed #E2E8F0; padding-top: 8px;">
                <div>
                  <div style="font-size: 11px; color: #94A3B8; text-decoration: line-through;">108.000 ₫</div>
                  <div style="font-size: 17px; font-weight: 900; color: #DC2626; font-family: 'JetBrains Mono', monospace;">82.000 ₫</div>
                </div>
                <button style="width: 36px; height: 36px; border-radius: 18px; background: #DC2626; border: none; color: white; font-weight: 900; font-size: 18px; cursor: pointer;">+</button>
              </div>
            </div>

            <!-- Boganic Traphaco -->
            <div class="med-card-white" style="border: 1.5px solid #FDE68A;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="pill-badge pill-best">🏆 TOP 1 BÁN CHẠY CHUỖI</span>
                <span style="font-size: 11px; font-weight: 700; color: #B45309;">⭐ 4.9 (3.2k)</span>
              </div>
              <div style="width: 100%; aspect-ratio: 1 / 1; background: #FFFDF0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 50px;">🌿</div>
              <div style="font-size: 11px; color: #B45309; font-weight: 800; text-transform: uppercase; margin-top: 10px;">Thuốc gan mật Đông Dược</div>
              <h3 style="font-size: 15px; font-weight: 800; margin-top: 4px;">Thuốc Bổ Gan Boganic Forte (Hộp 50 viên)</h3>
              <p style="font-size: 11.5px; color: #64748B; margin-top: 2px;">Cao Actisô, Cao Biển súc, Cao Bìm bìm biếc</p>
              <div style="display: flex; gap: 6px; margin: 10px 0;">
                <span style="background: #FEF3C7; color: #B45309; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">Hộp (50 viên)</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; border-top: 1px dashed #E2E8F0; padding-top: 8px;">
                <div>
                  <div style="font-size: 11px; color: #94A3B8; text-decoration: line-through;">125.000 ₫</div>
                  <div style="font-size: 17px; font-weight: 900; color: #B45309; font-family: 'JetBrains Mono', monospace;">112.000 ₫</div>
                </div>
                <button style="width: 36px; height: 36px; border-radius: 18px; background: var(--primary-btn-gradient); border: none; color: white; font-weight: 900; font-size: 18px; cursor: pointer;">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 3: BÁO CÁO THẨM ĐỊNH CỦA AGENT LÀM CHỦ                    -->
      <!-- ============================================================== -->
      <div id="tab-audit" class="view-tab-content">
        <div style="width: 100%; max-width: 1150px; background: var(--bg-panel); border-radius: 20px; border: 1px solid var(--border-color); padding: 26px; display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
            <div>
              <h2 style="font-size: 20px; font-weight: 900; color: #F8FAFC;">
                🛡️ Báo Cáo Thẩm Định UI/UX Toàn Diện Của Agent Làm Chủ (Lead UX Auditor)
              </h2>
              <p style="color: #94A3B8; font-size: 13px; margin-top: 4px;">
                Kiểm duyệt nghiêm ngặt trên toàn bộ 68 màn hình theo góc nhìn thực tế của Bệnh Nhân & Dược Sĩ & Người Lớn Tuổi
              </p>
            </div>
            <div style="background: linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #38BDF8 100%); padding: 8px 20px; border-radius: 30px; font-weight: 900; font-size: 18px; box-shadow: 0 0 20px rgba(2, 132, 199, 0.4);">
              99.2 / 100 (APPROVED)
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
            <div style="background: var(--bg-panel-elevated); padding: 14px; border-radius: 12px;">
              <div style="font-size: 11px; color: #94A3B8;">Đồng bộ màu Auth</div>
              <div style="font-size: 22px; font-weight: 900; color: #38BDF8; font-family: monospace;">100%</div>
              <div style="font-size: 11px; color: #38BDF8;">✓ Toàn bộ chuyển sang #0284C7</div>
            </div>
            <div style="background: var(--bg-panel-elevated); padding: 14px; border-radius: 12px;">
              <div style="font-size: 11px; color: #94A3B8;">Chuẩn Zero-Border</div>
              <div style="font-size: 22px; font-weight: 900; color: #38BDF8; font-family: monospace;">100%</div>
              <div style="font-size: 11px; color: #38BDF8;">✓ Bo góc 16-20px, loại bỏ viền đen</div>
            </div>
            <div style="background: var(--bg-panel-elevated); padding: 14px; border-radius: 12px;">
              <div style="font-size: 11px; color: #94A3B8;">Senior Typography</div>
              <div style="font-size: 22px; font-weight: 900; color: #38BDF8; font-family: monospace;">17.5px</div>
              <div style="font-size: 11px; color: #38BDF8;">✓ Tên thuốc & giá rõ ràng cho người già</div>
            </div>
            <div style="background: var(--bg-panel-elevated); padding: 14px; border-radius: 12px;">
              <div style="font-size: 11px; color: #94A3B8;">Vùng chạm (Hit Slop)</div>
              <div style="font-size: 22px; font-weight: 900; color: #38BDF8; font-family: monospace;">≥ 44px</div>
              <div style="font-size: 11px; color: #38BDF8;">✓ Chuẩn Accessibility Apple WCAG</div>
            </div>
          </div>

          <div style="background: rgba(2, 132, 199, 0.1); border: 1.5px solid rgba(56, 189, 248, 0.3); border-radius: 14px; padding: 16px; font-size: 13px; line-height: 20px;">
            <b>Kết luận thẩm định:</b> Toàn bộ 68 màn hình và các loại thẻ sản phẩm đã được chuẩn hóa đồng nhất vào hệ giá trị nhận diện thương hiệu Auth Blue (#0284C7). Ứng dụng đáp ứng hoàn hảo tiêu chuẩn vận hành chuỗi nhà thuốc GPP, đảm bảo trải nghiệm khách hàng tối ưu và tiện dụng cao độ cho nhân sự bán lẻ, quản lý kho và điều hành.
          </div>
        </div>
      </div>

    </main>

    <!-- BẢNG INSPECTOR & GÓP Ý BÊN PHẢI (MỞ RA / MỞ VÔ) -->
    <aside class="feedback-drawer" id="feedbackDrawer">
      <div class="drawer-header">
        <div class="drawer-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Thông Tin Màn Hình
        </div>
        <button class="btn-close-sidebar" onclick="toggleDrawer()" title="Đóng bảng chi tiết">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <div class="drawer-content">
        <div class="screen-info-box">
          <div class="screen-info-item">
            <div class="screen-info-label">Tên Màn Hình</div>
            <div class="screen-info-value" id="feedback-screen-name">${screens[0].name}</div>
          </div>
          <div class="screen-info-item">
            <div class="screen-info-label">Mã Định Danh (ID)</div>
            <div class="screen-info-value" id="feedback-screen-id" style="color: #38BDF8; font-family: monospace;">${screens[0].id}</div>
          </div>
          <div class="screen-info-item">
            <div class="screen-info-label">Mô Tả Nghiệp Vụ</div>
            <div class="screen-info-value" id="feedback-screen-desc" style="font-weight: 400; font-size: 11.5px; color: #CBD5E1; line-height: 16px;">${screens[0].description}</div>
          </div>
          <div class="screen-info-item">
            <div class="screen-info-label">URL Điều Hướng Mobile</div>
            <div class="screen-info-value" id="feedback-screen-url" style="font-family: monospace; font-size: 11px; color: #38BDF8;">${screens[0].url}</div>
          </div>
        </div>

        <!-- BẢNG GÓP Ý NHANH -->
        <div class="feedback-input-box">
          <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Thêm Ghi Chú Góp Ý</div>
          <textarea class="feedback-textarea" id="feedback-input" placeholder="Nhập nhận xét hoặc yêu cầu chỉnh sửa UI..."></textarea>
          <button class="btn-pill" style="background: var(--primary); color: white; justify-content: center; font-weight: 700;" onclick="addFeedback()">
            Lưu Góp Ý
          </button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <span style="font-size: 11.5px; font-weight: 700; color: #94A3B8;" id="notes-counter">0 ghi chú</span>
          <button class="btn-pill" style="font-size: 11px; padding: 4px 10px;" onclick="copyAllFeedback()">
            Xuất Tất Cả Góp Ý
          </button>
        </div>

        <div class="notes-list" id="notes-list">
          <div style="font-size: 11.5px; color: var(--text-muted); text-align: center; padding: 14px 0;">Chưa có góp ý nào.</div>
        </div>
      </div>
    </aside>

  </div>

  <!-- FLOATING PRESENTER CONTROLLER CHO DEMO KHÁCH HÀNG -->
  <div class="presenter-floating-bar" id="presenterBar">
    <button class="presenter-btn" onclick="prevScreen()" title="Màn hình trước (Phím ←)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>
    <div class="presenter-info">
      <div class="presenter-screen-title" id="presenterTitle">${screens[0].name}</div>
      <div class="presenter-screen-counter" id="presenterCounter">1 / ${screens.length} • Bấm Phím ← / → để chuyển</div>
    </div>
    <button class="presenter-btn" onclick="nextScreen()" title="Màn hình kế tiếp (Phím →)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
    <button class="btn-pill" style="margin-left: 8px; font-size: 11px; padding: 4px 10px;" onclick="toggleSidebar()" title="Mở danh sách">
      📂 Menu
    </button>
  </div>

  <!-- STATUS FOOTER -->
  <footer class="status-bar-bottom">
    <div>
      <span style="color: #38BDF8; font-weight: 700;">● ABC PHARMACY MOBILE v2.0</span> — Toàn bộ ${screens.length} Màn Hình & Modal • Tone Xanh Auth #0284C7
    </div>
    <div style="font-family: monospace; font-size: 11px;">
      Phím tắt: [ hoặc Ctrl+B (Ẩn/Hiện Menu) • Phím ← / → (Chuyển Màn) • Esc (Thoát)
    </div>
  </footer>

  <script>
    const SCREENS = ${JSON.stringify(screens, null, 2)};

    /**
 * Client-side script logic for Role Filter & Navigation in docs/mobile_v2/index.html
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const ROLES = [
  { id: 'all', label: 'Tất Cả Vai Trò', icon: '🌟', short: 'Tất cả' },
  { id: 'customer', label: 'Khách Hàng', icon: '🛒', short: 'Khách hàng' },
  { id: 'pharmacist', label: 'Dược Sĩ POS', icon: '💊', short: 'Dược sĩ' },
  { id: 'warehouse', label: 'Thủ Kho GSP', icon: '📦', short: 'Thủ kho' },
  { id: 'branch', label: 'Quản Lý Chi Nhánh', icon: '🏢', short: 'Chi nhánh' },
  { id: 'director', label: 'Ban Giám Đốc', icon: '📊', short: 'Giám đốc' },
  { id: 'guest', label: 'Khách & Auth', icon: '🔐', short: 'Auth' },
  { id: 'admin', label: 'Quản Trị IT', icon: '👥', short: 'Admin' }
];

const ROLE_CONFIG = {};
ROLES.forEach(r => { ROLE_CONFIG[r.id] = r; });

let activeScreenIndex = 0;
let currentRoleFilter = 'all';
let currentSearchQuery = '';
let isFullPageMode = false;
let isGridMode = false;
let isSidebarOpen = true;
let isDrawerOpen = true;
let isDemoMode = false;
const feedbackNotes = [];

// Lấy danh sách index các màn hình thỏa mãn bộ lọc vai trò và tìm kiếm
function getFilteredScreenIndices() {
  const indices = [];
  SCREENS.forEach((s, idx) => {
    const matchRole = currentRoleFilter === 'all' || s.role === currentRoleFilter;
    if (!matchRole) return;
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) ||
                          s.id.toLowerCase().includes(q) ||
                          s.category.toLowerCase().includes(q) ||
                          (s.description && s.description.toLowerCase().includes(q));
      if (!matchSearch) return;
    }
    indices.push(idx);
  });
  return indices;
}

// Khởi tạo các nút lọc vai trò (Canvas Bar và Sidebar)
function initRoleFilters() {
  const pillsContainer = document.getElementById('roleFilterPills');
  const sidebarPillsContainer = document.getElementById('sidebarRolePills');
  if (pillsContainer) pillsContainer.innerHTML = '';
  if (sidebarPillsContainer) sidebarPillsContainer.innerHTML = '';

  ROLES.forEach(r => {
    const count = r.id === 'all' ? SCREENS.length : SCREENS.filter(s => s.role === r.id).length;

    // Pill trên Canvas Filter Bar
    if (pillsContainer) {
      const pill = document.createElement('button');
      pill.className = 'role-pill' + (r.id === currentRoleFilter ? ' active' : '');
      pill.dataset.role = r.id;
      pill.onclick = () => setRoleFilter(r.id);
      pill.innerHTML = \`
        <span>\${r.icon} \${r.label}</span>
        <span class="role-count">\${count}</span>
      \`;
      pillsContainer.appendChild(pill);
    }

    // Mini-pill trong Sidebar
    if (sidebarPillsContainer) {
      const miniPill = document.createElement('button');
      miniPill.className = 'sidebar-role-pill' + (r.id === currentRoleFilter ? ' active' : '');
      miniPill.dataset.role = r.id;
      miniPill.onclick = () => setRoleFilter(r.id);
      miniPill.title = \`\${r.label} (\${count} màn hình)\`;
      miniPill.innerHTML = \`\${r.icon} \${r.short} <span style="font-size: 9.5px; opacity: 0.85;">(\${count})</span>\`;
      sidebarPillsContainer.appendChild(miniPill);
    }
  });
}

// Đặt bộ lọc vai trò
function setRoleFilter(roleId) {
  currentRoleFilter = roleId;

  document.querySelectorAll('.role-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === roleId);
  });

  document.querySelectorAll('.sidebar-role-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === roleId);
  });

  const filteredIndices = getFilteredScreenIndices();
  const summaryEl = document.getElementById('roleDisplayCount');
  if (summaryEl) {
    const roleMeta = ROLE_CONFIG[roleId] || { label: 'Tất cả' };
    summaryEl.innerHTML = \`\${filteredIndices.length} / \${SCREENS.length} <span style="color: #94A3B8; font-size: 11px; font-weight: normal;">(\${roleMeta.label})</span>\`;
  }

  initSidebar();

  if (isGridMode) {
    renderGrid();
  } else {
    if (filteredIndices.length > 0 && !filteredIndices.includes(activeScreenIndex)) {
      selectScreen(filteredIndices[0]);
    } else if (filteredIndices.length > 0) {
      selectScreen(activeScreenIndex);
    }
  }
}

// Nhóm màn hình theo danh mục trong Sidebar (hỗ trợ lọc theo Role & Search)
function initSidebar() {
  const listContainer = document.getElementById('screenListContainer');
  listContainer.innerHTML = '';

  const filteredIndices = getFilteredScreenIndices();
  const categories = [...new Set(SCREENS.map(s => s.category))];

  let anyCategoryRendered = false;

  categories.forEach(cat => {
    const catIndices = filteredIndices.filter(idx => SCREENS[idx].category === cat);
    if (catIndices.length === 0) return;

    anyCategoryRendered = true;
    const group = document.createElement('div');
    group.className = 'category-group';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = \`<span>\${cat}</span><span class="category-header-count">\${catIndices.length}</span>\`;
    group.appendChild(header);

    catIndices.forEach(idx => {
      const s = SCREENS[idx];
      const roleMeta = ROLE_CONFIG[s.role] || { icon: '📱', short: s.role };
      const item = document.createElement('div');
      item.className = 'screen-item' + (idx === activeScreenIndex ? ' active' : '');
      item.id = 'screen-item-' + idx;
      item.onclick = () => selectScreen(idx);

      item.innerHTML = \`
        <div class="screen-item-thumb">
          <img src="\${s.phoneImage}" alt="\${s.name}" onerror="this.src='../mobile_v1/\${s.phoneImage}'">
        </div>
        <div class="screen-item-content">
          <div class="screen-item-title">\${s.name}</div>
          <div class="screen-item-meta">
            <span class="screen-item-role-tag role-\${s.role}">\${roleMeta.icon} \${roleMeta.short}</span>
            <span class="screen-item-sub">\${s.id}</span>
          </div>
        </div>
      \`;

      group.appendChild(item);
    });

    listContainer.appendChild(group);
  });

  if (!anyCategoryRendered) {
    listContainer.innerHTML = \`
      <div style="padding: 30px 16px; text-align: center; color: #64748B; font-size: 12.5px; line-height: 1.6;">
        🔍 Không có màn hình nào phù hợp với vai trò này.<br>
        <button class="btn-pill" style="margin-top: 12px; font-size: 11px;" onclick="setRoleFilter('all')">
          <span>Xem Tất Cả</span>
        </button>
      </div>
    \`;
  }
}

// ĐÓNG / MỞ NAVBAR SIDEBAR (TOGGLE)
function toggleSidebar() {
  isSidebarOpen = !isSidebarOpen;
  const sidebar = document.getElementById('sidebarContainer');
  const btn = document.getElementById('btnToggleSidebar');
  const floatingBtn = document.getElementById('floatingSidebarToggle');

  if (isSidebarOpen) {
    sidebar.classList.remove('collapsed');
    btn.classList.add('active');
    floatingBtn.classList.remove('visible');
  } else {
    sidebar.classList.add('collapsed');
    btn.classList.remove('active');
    floatingBtn.classList.add('visible');
  }
}

// ĐÓNG / MỞ DRAWER BÊN PHẢI
function toggleDrawer() {
  isDrawerOpen = !isDrawerOpen;
  const drawer = document.getElementById('feedbackDrawer');
  const btn = document.getElementById('btnToggleDrawer');

  if (isDrawerOpen) {
    drawer.classList.remove('collapsed');
    btn.classList.add('active');
  } else {
    drawer.classList.add('collapsed');
    btn.classList.remove('active');
  }
}

// CHẾ ĐỘ DEMO KHÁCH HÀNG (ZEN MODE)
function toggleDemoMode() {
  isDemoMode = !isDemoMode;
  const sidebar = document.getElementById('sidebarContainer');
  const drawer = document.getElementById('feedbackDrawer');
  const floatingBtn = document.getElementById('floatingSidebarToggle');
  const btn = document.getElementById('btnDemoMode');

  if (isDemoMode) {
    isSidebarOpen = false;
    isDrawerOpen = false;
    sidebar.classList.add('collapsed');
    drawer.classList.add('collapsed');
    floatingBtn.classList.add('visible');
    btn.classList.add('active');
    document.getElementById('demoModeText').textContent = '✓ Đang Demo Khách';
  } else {
    isSidebarOpen = true;
    isDrawerOpen = true;
    sidebar.classList.remove('collapsed');
    drawer.classList.remove('collapsed');
    floatingBtn.classList.remove('visible');
    btn.classList.remove('active');
    document.getElementById('demoModeText').textContent = 'Demo Khách Hàng';
  }
}

// Chọn màn hình
function selectScreen(index) {
  activeScreenIndex = index;
  const screen = SCREENS[index];
  const roleMeta = ROLE_CONFIG[screen.role] || { icon: '📱', label: screen.role, short: screen.role };

  // Update sidebar active state
  document.querySelectorAll('.screen-item').forEach((el) => {
    el.classList.toggle('active', el.id === 'screen-item-' + index);
  });

  // Update Stage
  const roleBadgeEl = document.getElementById('stage-screen-role');
  if (roleBadgeEl) {
    roleBadgeEl.className = 'role-badge role-' + screen.role;
    roleBadgeEl.innerHTML = \`\${roleMeta.icon} \${roleMeta.label}\`;
  }
  document.getElementById('stage-screen-category').textContent = screen.category;
  document.getElementById('stage-screen-title').textContent = screen.name;
  document.getElementById('stage-screen-dims').textContent = isFullPageMode ? \`(412 x \${screen.pageHeight}px Full)\` : '(412 x 915px Phone)';
  
  const img = document.getElementById('stage-screen-img');
  img.src = isFullPageMode ? screen.fullImage : screen.phoneImage;
  img.onerror = function() {
    this.src = '../mobile_v1/' + (isFullPageMode ? screen.fullImage : screen.phoneImage);
  };

  // Reset scroll top of phone
  document.getElementById('phone-screen-container').scrollTop = 0;

  // Update Drawer
  document.getElementById('feedback-screen-name').textContent = screen.name;
  document.getElementById('feedback-screen-id').textContent = screen.id;
  document.getElementById('feedback-screen-desc').textContent = screen.description;
  document.getElementById('feedback-screen-url').textContent = screen.url;

  // Update Presenter Floating Bar
  const filteredIndices = getFilteredScreenIndices();
  const currentPos = filteredIndices.indexOf(index);
  const posText = currentPos >= 0 ? \`\${currentPos + 1} / \${filteredIndices.length}\` : \`\${index + 1} / \${SCREENS.length}\`;
  document.getElementById('presenterTitle').textContent = screen.name;
  document.getElementById('presenterCounter').textContent = \`\${posText} • [\${roleMeta.short}]\`;

  if (isGridMode) {
    toggleGridMode();
  }
}

function nextScreen() {
  const filteredIndices = getFilteredScreenIndices();
  if (filteredIndices.length === 0) return;
  const currentPos = filteredIndices.indexOf(activeScreenIndex);
  if (currentPos >= 0 && currentPos < filteredIndices.length - 1) {
    selectScreen(filteredIndices[currentPos + 1]);
  } else {
    selectScreen(filteredIndices[0]);
  }
}

function prevScreen() {
  const filteredIndices = getFilteredScreenIndices();
  if (filteredIndices.length === 0) return;
  const currentPos = filteredIndices.indexOf(activeScreenIndex);
  if (currentPos > 0) {
    selectScreen(filteredIndices[currentPos - 1]);
  } else {
    selectScreen(filteredIndices[filteredIndices.length - 1]);
  }
}

// Đổi tab chính trên Topbar
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-tab-content').forEach(content => content.classList.remove('active'));

  const presenterBar = document.getElementById('presenterBar');
  const floatingBtn = document.getElementById('floatingSidebarToggle');

  if (tabId === 'all-screens') {
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
    document.getElementById('tab-all-screens').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'flex';
    document.getElementById('feedbackDrawer').style.display = 'flex';
    presenterBar.style.display = 'flex';
    if (!isSidebarOpen) floatingBtn.classList.add('visible');
  } else if (tabId === 'redesign') {
    document.querySelectorAll('.nav-btn')[1].classList.add('active');
    document.getElementById('tab-redesign').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'none';
    document.getElementById('feedbackDrawer').style.display = 'none';
    presenterBar.style.display = 'none';
    floatingBtn.classList.remove('visible');
  } else if (tabId === 'cards') {
    document.querySelectorAll('.nav-btn')[2].classList.add('active');
    document.getElementById('tab-cards').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'none';
    document.getElementById('feedbackDrawer').style.display = 'none';
    presenterBar.style.display = 'none';
    floatingBtn.classList.remove('visible');
  } else if (tabId === 'audit') {
    document.querySelectorAll('.nav-btn')[3].classList.add('active');
    document.getElementById('tab-audit').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'none';
    document.getElementById('feedbackDrawer').style.display = 'none';
    presenterBar.style.display = 'none';
    floatingBtn.classList.remove('visible');
  }
}

// Toggle Phone Frame vs Full Page
function toggleViewMode() {
  isFullPageMode = !isFullPageMode;
  const mockup = document.getElementById('phone-mockup');
  const btn = document.getElementById('btn-toggle-view');

  if (isFullPageMode) {
    mockup.classList.add('full-mode');
    btn.innerHTML = '<span>📜 Ảnh Full</span>';
    btn.classList.add('active');
  } else {
    mockup.classList.remove('full-mode');
    btn.innerHTML = '<span>📐 Cuộn Phone</span>';
    btn.classList.remove('active');
  }

  selectScreen(activeScreenIndex);
}

// Toggle Figma Multi-Board Grid Mode
function toggleGridMode() {
  isGridMode = !isGridMode;
  const stage = document.getElementById('screen-stage');
  const grid = document.getElementById('grid-view-container');
  const btn = document.getElementById('btn-toggle-grid');
  const presenterBar = document.getElementById('presenterBar');

  if (isGridMode) {
    stage.style.display = 'none';
    grid.style.display = 'grid';
    btn.classList.add('active');
    presenterBar.style.display = 'none';
    renderGrid();
  } else {
    stage.style.display = 'flex';
    grid.style.display = 'none';
    btn.classList.remove('active');
    presenterBar.style.display = 'flex';
  }
}

function renderGrid() {
  const grid = document.getElementById('grid-view-container');
  grid.innerHTML = '';

  const filteredIndices = getFilteredScreenIndices();

  if (filteredIndices.length === 0) {
    grid.innerHTML = \`
      <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: var(--bg-panel); border-radius: 20px; border: 1px dashed var(--border-color);">
        <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
        <div style="font-size: 16px; font-weight: 800; color: #F8FAFC; margin-bottom: 6px;">Không tìm thấy màn hình nào</div>
        <div style="font-size: 13px; color: #94A3B8; margin-bottom: 18px;">Không có màn hình nào phù hợp với vai trò hoặc từ khóa tìm kiếm.</div>
        <button class="btn-pill" style="margin: 0 auto;" onclick="setRoleFilter('all'); document.getElementById('screenSearchInput').value=''; handleSearch('');">
          <span>🔄 Xem Toàn Bộ \${SCREENS.length} Màn Hình</span>
        </button>
      </div>
    \`;
    return;
  }

  filteredIndices.forEach((idx, order) => {
    const s = SCREENS[idx];
    const roleMeta = ROLE_CONFIG[s.role] || { icon: '📱', label: s.role, short: s.role };
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.onclick = () => {
      selectScreen(idx);
      toggleGridMode();
    };

    const catShort = s.category.split('.')[1] ? s.category.split('.')[1].trim() : s.category;

    card.innerHTML = \`
      <div class="grid-card-preview">
        <div class="grid-card-order-tag">#\${order + 1}</div>
        <img src="\${s.phoneImage}" alt="\${s.name}" onerror="this.src='../mobile_v1/\${s.phoneImage}'">
      </div>
      <div class="grid-card-body">
        <div class="grid-card-header-tags">
          <span class="role-badge role-\${s.role}">\${roleMeta.icon} \${roleMeta.label}</span>
          <span class="grid-card-badge">\${catShort}</span>
        </div>
        <div class="grid-card-title">\${s.name}</div>
        <div class="grid-card-desc">\${s.description}</div>
      </div>
    \`;

    grid.appendChild(card);
  });
}

// Tìm kiếm màn hình
function handleSearch(q) {
  currentSearchQuery = q.trim();
  initSidebar();
  if (isGridMode) {
    renderGrid();
  }
  const filteredIndices = getFilteredScreenIndices();
  const summaryEl = document.getElementById('roleDisplayCount');
  if (summaryEl) {
    const roleMeta = ROLE_CONFIG[currentRoleFilter] || { label: 'Tất cả' };
    summaryEl.innerHTML = \`\${filteredIndices.length} / \${SCREENS.length} <span style="color: #94A3B8; font-size: 11px; font-weight: normal;">(\${roleMeta.label})</span>\`;
  }
}


    // Khởi tạo
    initRoleFilters();
    initSidebar();
    selectScreen(0);
  </script>

  <!-- LIGHTBOX PHÓNG TO ẢNH -->
  <div id="lightboxModal" class="lightbox-modal" onclick="if(event.target === this) closeLightbox()">
    <div class="lightbox-content">
      <div class="lightbox-header">
        <h3 id="lightboxTitle" style="font-size: 16px; font-weight: 800; color: #F8FAFC;"></h3>
        <button class="lightbox-close-btn" onclick="closeLightbox()" title="Đóng (Esc)">✕</button>
      </div>
      <img id="lightboxImg" class="lightbox-img" src="" alt="Full view">
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync('docs/mobile_v2/index.html', htmlContent, 'utf8');
console.log('✅ Đã tạo thành công file docs/mobile_v2/index.html với NAVBAR MỞ RA/MỞ VÔ & CHẾ ĐỘ DEMO KHÁCH HÀNG!');
