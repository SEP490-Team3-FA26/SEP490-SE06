export function getPortalHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cổng Thông Tin Cơ Sở Dữ Liệu Dược Quốc Gia - Bộ Y Tế (Sandbox v2)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace']
          },
          colors: {
            moh: {
              red: '#da251d',
              gold: '#ffcd00',
              blue: '#0057cd',
              dark: '#0f172a'
            }
          }
        }
      }
    }
  </script>
  <style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    .animate-pulse-slow { animation: pulse-slow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 font-sans antialiased min-h-screen flex flex-col selection:bg-red-500 selection:text-white">

  <!-- Quốc huy & Header chuẩn Bộ Y Tế -->
  <header class="bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 border-b border-red-900/40 sticky top-0 z-50 backdrop-blur-md shadow-2xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
      
      <!-- Logo & Tiêu đề cơ quan -->
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-full bg-red-600/20 border-2 border-red-500/60 flex items-center justify-center p-1.5 shadow-lg shadow-red-900/30">
          <svg class="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/60">Bộ Y Tế Việt Nam</span>
            <span class="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> QĐ 232/QĐ-TTYQG v1.1
            </span>
          </div>
          <h1 class="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
            CƠ SỞ DỮ LIỆU DƯỢC QUỐC GIA
            <span class="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-mono font-normal border border-blue-500/30">SANDBOX MOCK</span>
          </h1>
          <p class="text-[11px] text-slate-400">Hệ thống Giám sát & Quản lý Liên thông Dược Toàn Quốc - Cổng Dành Cho Doanh Nghiệp & Thanh Tra</p>
        </div>
      </div>

      <!-- Quick Action / Status -->
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Máy chủ Giám sát</div>
          <div class="text-xs font-mono font-bold text-emerald-400">ONLINE : PORT 4005</div>
        </div>
        <a href="http://localhost:3001" target="_blank" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5">
          <span>Về Ứng Dụng WDP301</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
      </div>

    </div>

    <!-- Navigation Tabs -->
    <div class="border-t border-slate-800 bg-slate-950/70">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto no-scrollbar">
        <button onclick="switchTab('dashboard')" id="tab-btn-dashboard" class="tab-btn active px-4 py-2.5 text-xs font-bold text-red-400 border-b-2 border-red-500 flex items-center gap-2 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Sổ Cái Giám Sát Toàn Quốc
        </button>
        <button onclick="switchTab('drugs')" id="tab-btn-drugs" class="tab-btn px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 border-b-2 border-transparent flex items-center gap-2 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
          Tra Cứu Danh Mục Thuốc QG (2.331 Thuốc)
        </button>
        <button onclick="switchTab('facilities')" id="tab-btn-facilities" class="tab-btn px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 border-b-2 border-transparent flex items-center gap-2 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          5 Cơ Sở Dược Cấp Phép
        </button>
        <button onclick="switchTab('console')" id="tab-btn-console" class="tab-btn px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 border-b-2 border-transparent flex items-center gap-2 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          API Console & Tài Liệu Kỹ Thuật (19 APIs)
        </button>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- ========================================================================= -->
    <!-- TAB 1: SỔ CÁI GIÁM SÁT TOÀN QUỐC (THANH TRA BỘ Y TẾ) -->
    <!-- ========================================================================= -->
    <section id="tab-dashboard" class="space-y-6">
      
      <!-- Thông báo pháp lý cảnh báo -->
      <div class="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-red-600/20 text-red-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <h2 class="text-sm font-bold text-white uppercase tracking-wide">Chế Độ Giám Sát Thanh Tra Bộ Y Tế (MOH_INSPECTOR)</h2>
            <p class="text-xs text-red-300 mt-0.5">Theo Quyết định 232/QĐ-TTYQG và Thông tư 11/2025/TT-BYT: Mọi giao dịch Nhập - Xuất - Bán lẻ - Kiểm kê đều được cấp mã định danh quốc gia và bất biến (Immutable Ledger).</p>
          </div>
        </div>
        <button onclick="refreshDashboard()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Làm Mới Dữ Liệu
        </button>
      </div>

      <!-- KPI Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng Phiếu Nhập Kho</div>
          <div id="kpi-stock-in" class="text-2xl font-black text-blue-400 mt-1">12</div>
          <div class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span class="text-emerald-400 font-bold">100%</span> đã đồng bộ từ NCC GDP
          </div>
        </div>

        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng Phiếu Xuất & Bán Lẻ</div>
          <div id="kpi-stock-out" class="text-2xl font-black text-emerald-400 mt-1">48</div>
          <div class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span class="text-emerald-400 font-bold">48/48</span> toa thuốc & bán lẻ POS
          </div>
        </div>

        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Biên Bản Kiểm Kê Kho</div>
          <div id="kpi-stock-taking" class="text-2xl font-black text-purple-400 mt-1">6</div>
          <div class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            Tự động lập biên bản giải trình sai lệch
          </div>
        </div>

        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
          <div class="text-[11px] font-bold uppercase tracking-wider text-red-400">Vi Phạm Y Tế Phát Hiện</div>
          <div id="kpi-violations" class="text-2xl font-black text-red-400 mt-1">0</div>
          <div class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            Cảnh báo bán thuốc quá hạn / vi phạm lô
          </div>
        </div>
      </div>

      <!-- Sổ cái giao dịch gần nhất -->
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
        <div class="p-4 border-b border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/40">
          <div>
            <h3 class="text-sm font-extrabold text-white flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sổ Cái Giao Dịch Dược Phẩm Quốc Gia (Real-Time Ledger)
            </h3>
            <p class="text-[11px] text-slate-400">Nhật ký các gói tin đồng bộ tự động từ API Gateway WDP301</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-slate-400 font-mono">Đồng bộ gần nhất: <span id="last-sync-time" class="text-slate-200 font-bold">Vừa xong</span></span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/80">
              <tr>
                <th class="px-4 py-3">Mã GD Quốc Gia</th>
                <th class="px-4 py-3">Cơ Sở Gửi</th>
                <th class="px-4 py-3">Loại Nghiệp Vụ</th>
                <th class="px-4 py-3">Lý Do / Nội Dung</th>
                <th class="px-4 py-3 text-center">Trạng Thái BYT</th>
                <th class="px-4 py-3 text-right">Thời Điểm Ghi Sổ</th>
              </tr>
            </thead>
            <tbody id="ledger-table-body" class="divide-y divide-slate-700/40 text-slate-300 font-mono">
              <tr>
                <td colspan="6" class="px-4 py-8 text-center text-slate-500">Đang tải nhật ký giao dịch...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>

    <!-- ========================================================================= -->
    <!-- TAB 2: TRA CỨU 2.331 THUỐC QUỐC GIA -->
    <!-- ========================================================================= -->
    <section id="tab-drugs" class="hidden space-y-6">
      
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
              Cơ Sở Dữ Liệu 2.331 Danh Mục Thuốc Quốc Gia
            </h2>
            <p class="text-xs text-slate-400">Danh mục thuốc đã được Cục Quản lý Dược cấp số đăng ký lưu hành hợp pháp</p>
          </div>
          <div class="text-xs font-mono px-3 py-1 bg-slate-900 rounded-lg border border-slate-700 text-blue-400">
            Tổng cộng: <span class="font-bold text-white">2.331</span> SKU
          </div>
        </div>

        <!-- Filter bar -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="md:col-span-2 relative">
            <input 
              type="text" 
              id="drug-search-input"
              oninput="debounceSearchDrugs()"
              placeholder="Tìm theo tên biệt dược, số đăng ký (VN-16755-13...), hoạt chất chính..."
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono"
            />
          </div>
          <div>
            <select 
              id="drug-rx-filter"
              onchange="fetchDrugsList(1)"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition font-bold"
            >
              <option value="">Tất cả phân loại thuốc</option>
              <option value="0">Thuốc không kê đơn (OTC)</option>
              <option value="1">Thuốc kê đơn bắt buộc (Rx)</option>
            </select>
          </div>
        </div>

        <!-- Drugs Table -->
        <div class="border border-slate-700/60 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900/90 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/80">
                <tr>
                  <th class="px-4 py-3">Mã Định Danh QG</th>
                  <th class="px-4 py-3">Tên Thuốc / Biệt Dược</th>
                  <th class="px-4 py-3">Số Đăng Ký (SĐK)</th>
                  <th class="px-4 py-3">Hoạt Chất & Hàm Lượng</th>
                  <th class="px-4 py-3">Dạng Bào Chế</th>
                  <th class="px-4 py-3 text-center">Phân Loại</th>
                </tr>
              </thead>
              <tbody id="drugs-table-body" class="divide-y divide-slate-700/40 text-slate-300">
                <tr>
                  <td colspan="6" class="px-4 py-8 text-center text-slate-500">Đang tải danh mục thuốc...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div class="flex justify-between items-center text-xs text-slate-400 pt-2">
          <div id="drugs-page-info">Trang 1 / 117</div>
          <div class="flex gap-2">
            <button onclick="prevDrugsPage()" id="btn-prev-drugs" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition disabled:opacity-40">Trang trước</button>
            <button onclick="nextDrugsPage()" id="btn-next-drugs" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition disabled:opacity-40">Trang tiếp</button>
          </div>
        </div>
      </div>

    </section>

    <!-- ========================================================================= -->
    <!-- TAB 3: 5 CƠ SỞ DƯỢC CẤP PHÉP -->
    <!-- ========================================================================= -->
    <section id="tab-facilities" class="hidden space-y-6">
      
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            Danh Sách Cơ Sở Dược Thuộc Chuỗi Đã Được Cấp Phép Kết Nối
          </h2>
          <p class="text-xs text-slate-400">Danh sách tài khoản doanh nghiệp đã hoàn tất thẩm định GPP/GSP và được cấp chứng thư số kết nối CSDL Dược Quốc Gia</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="facilities-grid">
          <!-- Cards rendered dynamically via JS -->
        </div>
      </div>

    </section>

    <!-- ========================================================================= -->
    <!-- TAB 4: API CONSOLE (19 APIS CHUẨN QĐ 232) -->
    <!-- ========================================================================= -->
    <section id="tab-console" class="hidden space-y-6">
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left: List of 19 APIs -->
        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            19 APIs Chuẩn Quyết Định 232/QĐ-TTYQG
          </h3>
          <p class="text-xs text-slate-400">Chọn API để xem cấu trúc và chạy thử kiểm thử trực tiếp</p>

          <div class="space-y-1.5 text-xs font-mono max-h-[550px] overflow-y-auto pr-1">
            <div class="text-[10px] uppercase font-bold text-slate-500 px-2 pt-2">Nhóm 1: Xác Thực OAuth2</div>
            <button onclick="loadApiDoc('auth_login')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-blue-300 flex items-center justify-between border border-slate-800">
              <span>POST /v2/auth/login</span>
              <span class="text-[9px] bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded">OAuth2</span>
            </button>

            <div class="text-[10px] uppercase font-bold text-slate-500 px-2 pt-2">Nhóm 2: Danh Mục Master Data</div>
            <button onclick="loadApiDoc('master_drugs')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 flex items-center justify-between border border-slate-800">
              <span>GET /v2/master/drugs</span>
              <span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">2331 SKU</span>
            </button>
            <button onclick="loadApiDoc('master_units')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 flex items-center justify-between border border-slate-800">
              <span>GET /v2/master/units</span>
              <span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">10 ĐVT</span>
            </button>
            <button onclick="loadApiDoc('master_routes')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 flex items-center justify-between border border-slate-800">
              <span>GET /v2/master/routes</span>
              <span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Đường dùng</span>
            </button>

            <div class="text-[10px] uppercase font-bold text-slate-500 px-2 pt-2">Nhóm 3: Giao Dịch Nhập - Xuất - Kiểm Kê</div>
            <button onclick="loadApiDoc('stock_in')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-emerald-300 flex items-center justify-between border border-slate-800">
              <span>POST /v2/transactions/stock-in</span>
              <span class="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded">Nhập kho</span>
            </button>
            <button onclick="loadApiDoc('stock_out')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-amber-300 flex items-center justify-between border border-slate-800">
              <span>POST /v2/transactions/stock-out</span>
              <span class="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded">Bán lẻ POS</span>
            </button>
            <button onclick="loadApiDoc('stock_taking')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-purple-300 flex items-center justify-between border border-slate-800">
              <span>POST /v2/transactions/stock-taking</span>
              <span class="text-[9px] bg-purple-950 text-purple-400 px-1.5 py-0.5 rounded">Kiểm kê</span>
            </button>
          </div>
        </div>

        <!-- Right: Interactive Test Console -->
        <div class="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 id="console-api-title" class="text-sm font-bold text-white">Thử Nghiệm API Trực Tiếp</h3>
              <p id="console-api-desc" class="text-xs text-slate-400">Gửi yêu cầu thử nghiệm lên Sandbox mock</p>
            </div>
            <button onclick="runConsoleApi()" id="btn-run-console" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-md flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Gửi Yêu Cầu (Send)
            </button>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Method & URL</label>
            <div class="flex gap-2 font-mono text-xs">
              <span id="console-method" class="px-3 py-2 bg-blue-950 text-blue-400 border border-blue-800 rounded-lg font-bold">GET</span>
              <input type="text" id="console-url" value="/v2/health" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200" readonly />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Body (JSON / URL Encoded)</label>
            <textarea id="console-body" rows="4" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"></textarea>
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response Output</label>
              <span id="console-status" class="text-xs font-mono font-bold text-slate-500">200 OK</span>
            </div>
            <pre id="console-response" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-400 max-h-56 overflow-y-auto no-scrollbar">// Bấm "Gửi Yêu Cầu" để xem kết quả trả về từ Cổng Dược Quốc Gia</pre>
          </div>
        </div>

      </div>

    </section>

  </main>

  <!-- Footer -->
  <footer class="bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-auto">
    <div class="max-w-7xl mx-auto px-4 space-y-2">
      <p class="font-bold text-slate-400">CƠ SỞ DỮ LIỆU DƯỢC QUỐC GIA VIỆT NAM — MOCK SANDBOX V2</p>
      <p>Cơ quan chủ quản: Bộ Y Tế — Trung tâm Thông tin Y tế Quốc gia (Quyết định 232/QĐ-TTYQG & Thông tư 11/2025/TT-BYT)</p>
      <p class="text-[10px] font-mono text-slate-600">Hỗ trợ kỹ thuật: 19008255 nhánh 2 | Hệ thống WDP301 Microservices Architecture</p>
    </div>
  </footer>

  <!-- Client Script for Portal -->
  <script>
    let currentTab = 'dashboard';
    let drugsPage = 1;
    let searchTimeout = null;

    function switchTab(tabId) {
      currentTab = tabId;
      document.querySelectorAll('section[id^="tab-"]').forEach(s => s.classList.add('hidden'));
      document.getElementById('tab-' + tabId).classList.remove('hidden');

      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('text-red-400', 'border-red-500');
        b.classList.add('text-slate-400', 'border-transparent');
      });

      const activeBtn = document.getElementById('tab-btn-' + tabId);
      activeBtn.classList.add('text-red-400', 'border-red-500');
      activeBtn.classList.remove('text-slate-400', 'border-transparent');

      if (tabId === 'dashboard') refreshDashboard();
      if (tabId === 'drugs') fetchDrugsList(drugsPage);
      if (tabId === 'facilities') loadFacilities();
    }

    // Refresh Inspector Ledger
    async function refreshDashboard() {
      try {
        const res = await fetch('/v2/health');
        const health = await res.json();
        
        // Cập nhật Ledger mẫu dựa trên mock transactions
        const tbody = document.getElementById('ledger-table-body');
        const mockRows = [
          { code: 'TXN-OUT-20261008-00912', facility: 'Nhà thuốc WDP - Chi nhánh 1 (Q.1)', type: 'BÁN LẺ POS', note: 'Toa thuốc cảm cúm & Panadol Extra', status: 'ACCEPTED', time: 'Vừa xong' },
          { code: 'TXN-IN-20261008-00431', facility: 'Tổng Kho GSP - Tân Bình', type: 'NHẬP KHO GDP', note: 'Nhập 500 hộp Kháng sinh Augmentin 1g', status: 'ACCEPTED', time: '12 phút trước' },
          { code: 'TXN-ST-20261008-00104', facility: 'Nhà thuốc WDP - Chi nhánh 2 (Bình Thạnh)', type: 'KIỂM KÊ KHO', note: 'Kiểm kê định kỳ tháng 10 - Khớp 100%', status: 'ACCEPTED', time: '1 giờ trước' },
          { code: 'TXN-OUT-20261008-00890', facility: 'Nhà thuốc WDP - Chi nhánh 3 (Q.7)', type: 'BÁN LẺ POS', note: 'Thuốc nhỏ mắt V.Rohto Dryeye', status: 'ACCEPTED', time: '2 giờ trước' },
          { code: 'TXN-IN-20261008-00428', facility: 'Tổng Kho GSP - Tân Bình', type: 'NHẬP KHO GDP', note: 'Nhập 200 lọ Betadine sát khuẩn', status: 'ACCEPTED', time: '4 giờ trước' }
        ];

        tbody.innerHTML = mockRows.map(r => \`
          <tr class="hover:bg-slate-800/60 transition">
            <td class="px-4 py-3 font-bold text-blue-400">\${r.code}</td>
            <td class="px-4 py-3 text-white font-sans font-semibold">\${r.facility}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">\${r.type}</span></td>
            <td class="px-4 py-3 text-slate-400 font-sans">\${r.note}</td>
            <td class="px-4 py-3 text-center">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                ✓ \${r.status}
              </span>
            </td>
            <td class="px-4 py-3 text-right text-slate-500">\${r.time}</td>
          </tr>
        \`).join('');

        document.getElementById('last-sync-time').innerText = new Date().toLocaleTimeString('vi-VN');
      } catch (e) {
        console.error(e);
      }
    }

    // Fetch Drugs List
    async function fetchDrugsList(page = 1) {
      drugsPage = page;
      const tbody = document.getElementById('drugs-table-body');
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Đang tra cứu dữ liệu Cục Quản Lý Dược...</td></tr>';

      try {
        const search = document.getElementById('drug-search-input').value;
        const rx = document.getElementById('drug-rx-filter').value;
        
        // Lấy token login trước nếu chưa có
        let token = sessionStorage.getItem('mock_token');
        if (!token) {
          const authRes = await fetch('/v2/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: 'business_admin', password: btoa('SecretPass123') })
          });
          const authData = await authRes.json();
          token = authData.access_token;
          if (token) sessionStorage.setItem('mock_token', token);
        }

        const query = new URLSearchParams({
          page: page.toString(),
          page_size: '20'
        });
        if (search) query.append('search', search);

        const res = await fetch('/v2/master/drugs?' + query.toString(), {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });

        const data = await res.json();
        const drugs = data.data || [];
        const total = data.total || 2331;
        const totalPages = Math.ceil(total / 20);

        document.getElementById('drugs-page-info').innerText = \`Trang \${page} / \${totalPages} (Tổng \${total} thuốc)\`;
        document.getElementById('btn-prev-drugs').disabled = page <= 1;
        document.getElementById('btn-next-drugs').disabled = page >= totalPages;

        if (drugs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">Không tìm thấy thuốc phù hợp</td></tr>';
          return;
        }

        tbody.innerHTML = drugs.map(d => \`
          <tr class="hover:bg-slate-800/60 transition">
            <td class="px-4 py-3 font-mono font-bold text-blue-400">\${d.national_drug_id || d.id || 'DRUG-00000'}</td>
            <td class="px-4 py-3 font-sans font-bold text-white max-w-xs">\${d.name || d.ten_thuoc}</td>
            <td class="px-4 py-3 font-mono text-emerald-400 font-bold">\${d.registration_number || d.so_dang_ky || 'Chưa cấp'}</td>
            <td class="px-4 py-3 text-slate-400 font-sans">\${d.active_ingredient || d.hoat_chat || '---'}</td>
            <td class="px-4 py-3 text-slate-400">\${d.dosage_form || 'Viên nén'}</td>
            <td class="px-4 py-3 text-center">
              \${d.prescription_status === 1 || d.drug_classification === 'PRESCRIPTION' ? 
                '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60">Kê đơn (Rx)</span>' :
                '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">Không kê đơn</span>'
              }
            </td>
          </tr>
        \`).join('');

      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">Lỗi kết nối API Master Drugs: ' + err.message + '</td></tr>';
      }
    }

    function prevDrugsPage() {
      if (drugsPage > 1) fetchDrugsList(drugsPage - 1);
    }

    function nextDrugsPage() {
      fetchDrugsList(drugsPage + 1);
    }

    function debounceSearchDrugs() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchDrugsList(1);
      }, 400);
    }

    // Load Facilities
    function loadFacilities() {
      const facilities = [
        { code: 'FAC-HQ-01', name: 'Kho Tổng Trung Tâm GSP - WDP Tân Bình', type: 'Kho Tổng (GSP)', address: '123 Trường Chinh, Q. Tân Bình, TP.HCM', license: 'GSP-BYT-2026/089', status: 'ACTIVE' },
        { code: 'FAC-BR-01', name: 'Nhà thuốc WDP - Chi nhánh 1', type: 'Nhà thuốc Bán lẻ (GPP)', address: '45 Lê Duẩn, P. Bến Nghé, Quận 1, TP.HCM', license: 'GPP-SYTHCM-2026/112', status: 'ACTIVE' },
        { code: 'FAC-BR-02', name: 'Nhà thuốc WDP - Chi nhánh 2', type: 'Nhà thuốc Bán lẻ (GPP)', address: '88 Xô Viết Nghệ Tĩnh, Q. Bình Thạnh, TP.HCM', license: 'GPP-SYTHCM-2026/115', status: 'ACTIVE' },
        { code: 'FAC-BR-03', name: 'Nhà thuốc WDP - Chi nhánh 3', type: 'Nhà thuốc Bán lẻ (GPP)', address: '210 Nguyễn Thị Thập, Quận 7, TP.HCM', license: 'GPP-SYTHCM-2026/120', status: 'ACTIVE' },
        { code: 'FAC-BR-04', name: 'Nhà thuốc WDP - Chi nhánh 4', type: 'Nhà thuốc Bán lẻ (GPP)', address: '15 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', license: 'GPP-SYTHCM-2026/133', status: 'ACTIVE' },
      ];

      const container = document.getElementById('facilities-grid');
      container.innerHTML = facilities.map(f => \`
        <div class="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-md space-y-3">
          <div class="flex justify-between items-start">
            <span class="font-mono text-[11px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">\${f.code}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">HOẠT ĐỘNG</span>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white">\${f.name}</h4>
            <div class="text-xs text-slate-400 mt-0.5">\${f.type}</div>
          </div>
          <div class="text-xs text-slate-400 space-y-1 border-t border-slate-800 pt-2 font-mono text-[11px]">
            <div>📍 \${f.address}</div>
            <div>📜 GP: <span class="text-slate-200 font-bold">\${f.license}</span></div>
          </div>
        </div>
      \`).join('');
    }

    // Load API Docs in Console
    const API_PRESETS = {
      auth_login: {
        title: 'POST /v2/auth/login',
        desc: 'Xác thực OAuth2 doanh nghiệp. Mật khẩu gửi dạng Base64.',
        method: 'POST',
        url: '/v2/auth/login',
        body: 'username=business_admin&password=' + btoa('SecretPass123')
      },
      master_drugs: {
        title: 'GET /v2/master/drugs',
        desc: 'Tra cứu danh mục 2.331 thuốc quốc gia (QĐ 232).',
        method: 'GET',
        url: '/v2/master/drugs?page=1&page_size=5',
        body: ''
      },
      master_units: {
        title: 'GET /v2/master/units',
        desc: 'Danh mục 10 đơn vị tính chuẩn BYT (Hộp, Vỉ, Viên, Chai, Tuýp...).',
        method: 'GET',
        url: '/v2/master/units',
        body: ''
      },
      master_routes: {
        title: 'GET /v2/master/routes',
        desc: 'Danh mục đường dùng thuốc (Đường uống, tiêm bắp, bôi ngoài da...).',
        method: 'GET',
        url: '/v2/master/routes',
        body: ''
      },
      stock_in: {
        title: 'POST /v2/transactions/stock-in',
        desc: 'Liên thông phiếu nhập kho từ nhà cung cấp GDP.',
        method: 'POST',
        url: '/v2/transactions/stock-in',
        body: JSON.stringify({
          facility_code: "FAC-HQ-01",
          invoice_no: "INV-GDP-2026-9912",
          reason: "supplier",
          items: [
            {
              drug_code: "VN-16755-13",
              batch_no: "BATCH-2026-A1",
              expiry_date: "2027-12-31",
              quantity: 100,
              unit_price: 45000
            }
          ]
        }, null, 2)
      },
      stock_out: {
        title: 'POST /v2/transactions/stock-out',
        desc: 'Liên thông phiếu bán lẻ / toa thuốc từ quầy POS.',
        method: 'POST',
        url: '/v2/transactions/stock-out',
        body: JSON.stringify({
          facility_code: "FAC-BR-01",
          reason: "sale-retail",
          order_code: "ORD-POS-77812",
          items: [
            {
              drug_code: "VN-16755-13",
              batch_no: "BATCH-2026-A1",
              quantity: 2,
              unit_price: 55000
            }
          ]
        }, null, 2)
      },
      stock_taking: {
        title: 'POST /v2/transactions/stock-taking',
        desc: 'Liên thông kết quả kiểm kê kho định kỳ.',
        method: 'POST',
        url: '/v2/transactions/stock-taking',
        body: JSON.stringify({
          facility_code: "FAC-BR-02",
          check_code: "CHK-2026-10-08",
          items: [
            {
              drug_code: "VN-16755-13",
              system_quantity: 100,
              actual_quantity: 98,
              diff_reason: "Hao hụt rách vỏ hộp bảo quản"
            }
          ]
        }, null, 2)
      }
    };

    function loadApiDoc(presetKey) {
      const p = API_PRESETS[presetKey];
      if (!p) return;
      document.getElementById('console-api-title').innerText = p.title;
      document.getElementById('console-api-desc').innerText = p.desc;
      document.getElementById('console-method').innerText = p.method;
      document.getElementById('console-url').value = p.url;
      document.getElementById('console-body').value = p.body;
    }

    async function runConsoleApi() {
      const method = document.getElementById('console-method').innerText;
      const url = document.getElementById('console-url').value;
      const bodyText = document.getElementById('console-body').value;
      const resElem = document.getElementById('console-response');
      const statusElem = document.getElementById('console-status');

      resElem.innerText = '// Đang gửi yêu cầu...';

      try {
        let headers = {};
        let token = sessionStorage.getItem('mock_token');
        if (token && !url.includes('/auth/login')) {
          headers['Authorization'] = 'Bearer ' + token;
        }

        let options = { method, headers };

        if (method === 'POST') {
          if (url.includes('/auth/login')) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.body = bodyText;
          } else {
            headers['Content-Type'] = 'application/json';
            options.body = bodyText;
          }
        }

        const res = await fetch(url, options);
        statusElem.innerText = res.status + ' ' + res.statusText;
        statusElem.className = res.ok ? 'text-xs font-mono font-bold text-emerald-400' : 'text-xs font-mono font-bold text-red-400';

        const json = await res.json();
        resElem.innerText = JSON.stringify(json, null, 2);

        if (json.access_token) {
          sessionStorage.setItem('mock_token', json.access_token);
        }
      } catch (e) {
        statusElem.innerText = 'ERROR';
        statusElem.className = 'text-xs font-mono font-bold text-red-400';
        resElem.innerText = 'Lỗi thực thi: ' + e.message;
      }
    }

    // Auto initialize on load
    window.addEventListener('DOMContentLoaded', () => {
      refreshDashboard();
      loadApiDoc('auth_login');
    });
  </script>
</body>
</html>`;
}
