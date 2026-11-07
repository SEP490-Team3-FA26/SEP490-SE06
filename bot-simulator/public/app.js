// Logic điều khiển Frontend Command Center & Bản đồ 2D SQLite cho ABC Pharmacy Digital Twin v2.0
const isSubpath = window.location.pathname.startsWith('/simulator');
const BASE_URL = isSubpath ? '/simulator' : '';
const socket = io({
  path: isSubpath ? '/simulator/socket.io' : '/socket.io',
});

let currentState = { isRunning: false, speedMultiplier: 1, currentScenario: 'NORMAL' };
let currentFilter = 'ALL';
let currentSearch = '';
let activityLogs = [];
let throughputHistory = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let throughputLabels = Array(10).fill('');
let recentEventCount = 0;

// Trạng thái Bản đồ 2D & Inspector SQLite
let mapData = {
  branches: [],
  branchProfiles: {},
  seats: [],
  branchSummaries: [],
};

let inspectorSelection = {
  mode: 'ALL', // 'SEAT' | 'BRANCH' | 'ALL'
  seatId: null,
  branchId: null,
  seatMeta: null,
  events: [],
};

const ACTIVE_BUBBLE_MS = 6500;

const roleBadgeStyles = {
  CUSTOMER: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  PHARMACIST: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  MANAGER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  WAREHOUSE: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  SYSTEM: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const COMPARTMENT_META = {
  'BR-001': {
    title: 'Khoang CN1 — ABC Pharmacy Quận 1',
    subtitle: 'Flagship Store • Lưu lượng 35% • SLA 95%',
    accent: 'border-emerald-500/40 bg-emerald-950/10',
    headerBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  'BR-002': {
    title: 'Khoang CN2 — ABC Pharmacy Quận 2',
    subtitle: 'Cơ sở Khu Đông • Lưu lượng 25% • SLA 90%',
    accent: 'border-sky-500/40 bg-sky-950/10',
    headerBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  'BR-004': {
    title: 'Khoang CN4 — ABC Pharmacy Hà Nội',
    subtitle: 'Cơ sở Miền Bắc • Lưu lượng 20% • SLA 75%',
    accent: 'border-indigo-500/40 bg-indigo-950/10',
    headerBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  'BR-003': {
    title: 'Khoang CN3 — ABC Pharmacy Đà Nẵng',
    subtitle: 'Điểm nóng Quá tải • Lưu lượng 12% • SLA 35%',
    accent: 'border-rose-500/40 bg-rose-950/10',
    headerBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  'BR-006': {
    title: 'Khoang CN5 — ABC Pharmacy Hội An',
    subtitle: 'Cơ sở Vệ tinh • Lưu lượng 8% • SLA 85%',
    accent: 'border-amber-500/40 bg-amber-950/10',
    headerBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  'CENTRAL_WH': {
    title: 'Khoang Kho Tổng Trung Tâm (GSP / GDP)',
    subtitle: 'Điều phối PR → PO → Kiểm nghiệm GRN → Xuất kho',
    accent: 'border-purple-500/40 bg-purple-950/10',
    headerBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
};

// ============================================================================
// CHARTS INITIALIZATION (CHART.JS)
// ============================================================================
let throughputChart = null;
let roleChart = null;

function initCharts() {
  const ctxThroughput = document.getElementById('throughputChart')?.getContext('2d');
  if (ctxThroughput) {
    throughputChart = new Chart(ctxThroughput, {
      type: 'line',
      data: {
        labels: throughputLabels,
        datasets: [{
          label: 'Sự kiện / 3s',
          data: throughputHistory,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } },
          },
        },
      },
    });
  }

  const ctxRole = document.getElementById('roleChart')?.getContext('2d');
  if (ctxRole) {
    roleChart = new Chart(ctxRole, {
      type: 'doughnut',
      data: {
        labels: ['Khách', 'Dược sĩ', 'Quản lý', 'Thủ kho', 'Hệ thống'],
        datasets: [{
          data: [1, 1, 1, 1, 1],
          backgroundColor: [
            '#38bdf8',
            '#34d399',
            '#c084fc',
            '#818cf8',
            '#fbbf24',
          ],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#cbd5e1', font: { size: 10 }, boxWidth: 10 },
          },
        },
        cutout: '70%',
      },
    });
  }
}

setInterval(() => {
  if (!throughputChart) return;
  throughputHistory.shift();
  throughputHistory.push(recentEventCount);
  recentEventCount = 0;
  throughputChart.update('none');
}, 3000);

// Định kỳ làm mờ bong bóng pop-up đã quá hạn 6.5 giây trên bản đồ 2D
setInterval(() => {
  renderCompartmentsMap();
}, 2500);

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================
socket.on('connect', () => {
  checkGatewayHealth();
  fetchMapState();
  refreshInspectorHistory();
});

socket.on('bot:stats', (st) => {
  currentState = st;
  renderStats(st);
});

socket.on('bot:init-logs', (logs) => {
  if (Array.isArray(logs) && logs.length > 0) {
    activityLogs = [...logs];
    renderActivityFeed();
    updateRoleChart();
    if (inspectorSelection.mode === 'ALL' && inspectorSelection.events.length === 0) {
      inspectorSelection.events = [...logs];
      renderInspectorHeader();
      renderInspectorTimeline();
    }
  }
});

socket.on('bot:map-init', (payload) => {
  if (payload && Array.isArray(payload.seats)) {
    mapData = payload;
    renderCompartmentsMap();
    renderInspectorHeader();
  }
});

socket.on('bot:activity', (item) => {
  recentEventCount++;
  activityLogs.unshift(item);
  if (activityLogs.length > 250) {
    activityLogs.pop();
  }

  applyLiveActivityToMap(item);
  renderActivityFeed();
  updateRoleChart();
});

// ============================================================================
// CẬP NHẬT BẢN ĐỒ 2D & BONG BÓNG POP-UP THEO THỜI GIAN THỰC
// ============================================================================
function applyLiveActivityToMap(item) {
  if (!item || !item.seatId || item.seatId === 'SYS:ALL') return;

  const now = item.createdAt || Date.now();
  let seat = mapData.seats.find(s => s.seatId === item.seatId);

  if (!seat) {
    const seatType = item.role === 'MANAGER'
      ? 'MANAGER'
      : (item.role === 'PHARMACIST' ? 'PHARMACIST' : (item.role === 'WAREHOUSE' ? 'WAREHOUSE' : 'CUSTOMER'));
    seat = {
      seatId: item.seatId,
      branchId: item.branchId || 'BR-001',
      seatType,
      actorName: item.actorName,
      persona: seatType === 'PHARMACIST' ? 'BALANCED' : seatType,
      lastBadge: item.badge,
      lastAction: item.actionText,
      lastStatus: item.status || 'SUCCESS',
      lastAmount: item.amount || null,
      lastTimestamp: item.timestamp,
      lastActiveAt: now,
      totalEvents: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalWarns: 0,
      punctualCheckins: 0,
      lateCheckins: 0,
      isCheckedIn: true,
    };
    mapData.seats.push(seat);
  }

  if (seat.seatType === 'CUSTOMER') {
    seat.actorName = item.actorName;
  }
  seat.lastBadge = item.badge;
  seat.lastAction = item.actionText;
  seat.lastStatus = item.status || 'SUCCESS';
  seat.lastAmount = item.amount !== undefined ? item.amount : null;
  seat.lastTimestamp = item.timestamp;
  seat.lastActiveAt = now;
  seat.totalEvents = (seat.totalEvents || 0) + 1;

  if ((item.badge === 'POS' || item.badge === 'ORDER') && item.status === 'SUCCESS') {
    seat.totalOrders = (seat.totalOrders || 0) + 1;
    seat.totalRevenue = (seat.totalRevenue || 0) + (Number(item.amount) || 0);
  }
  if (item.status === 'WARN') {
    seat.totalWarns = (seat.totalWarns || 0) + 1;
  }
  if (item.badge === 'ATTENDANCE') {
    const isLate = item.status === 'WARN' || (item.actionText && item.actionText.includes('ĐI MUỘN'));
    if (isLate) seat.lateCheckins = (seat.lateCheckins || 0) + 1;
    else seat.punctualCheckins = (seat.punctualCheckins || 0) + 1;
  }

  renderCompartmentsMap();

  // Nếu ghế hoặc khoang này đang được mở trong Inspector thì đẩy sự kiện mới vào ngay
  const matchesSeat = inspectorSelection.mode === 'SEAT' && inspectorSelection.seatId === item.seatId;
  const matchesBranch = inspectorSelection.mode === 'BRANCH' && inspectorSelection.branchId === item.branchId;
  const matchesAll = inspectorSelection.mode === 'ALL';

  if (matchesSeat || matchesBranch || matchesAll) {
    if (matchesSeat) {
      inspectorSelection.seatMeta = { ...seat };
    }
    inspectorSelection.events.unshift(item);
    if (inspectorSelection.events.length > 150) {
      inspectorSelection.events.pop();
    }
    renderInspectorHeader();
    renderInspectorTimeline();
  }
}

async function fetchMapState() {
  try {
    const res = await fetch(`${BASE_URL}/api/sim/map`);
    const data = await res.json();
    if (data && Array.isArray(data.seats)) {
      mapData = data;
      renderCompartmentsMap();
      renderInspectorHeader();
    }
  } catch {}
}

function getPersonaBadgeHtml(persona, seatType) {
  if (seatType === 'MANAGER') {
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Quản lý cơ sở</span>';
  }
  if (seatType === 'WAREHOUSE') {
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Kho GSP</span>';
  }
  if (seatType === 'CUSTOMER') {
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">Khách hàng</span>';
  }
  if (persona === 'CHRONIC_LATE') {
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Hay trễ</span>';
  }
  if (persona === 'PUNCTUAL') {
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Gương mẫu</span>';
  }
  return '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-slate-300">Tiêu chuẩn</span>';
}

function formatShortBubbleText(seat) {
  if (!seat || !seat.lastAction) return '';
  const badge = seat.lastBadge || 'ACTION';
  if (seat.lastAmount) {
    return `${badge}: +${Number(seat.lastAmount).toLocaleString('vi-VN')}đ`;
  }
  const clean = String(seat.lastAction);
  return clean.length > 44 ? `${clean.slice(0, 44)}...` : clean;
}

function renderStaffSeatCard(seat, now) {
  const isActive = seat.lastActiveAt && (now - seat.lastActiveAt < ACTIVE_BUBBLE_MS);
  const isWarn = seat.lastStatus === 'WARN';
  const isSelected = inspectorSelection.mode === 'SEAT' && inspectorSelection.seatId === seat.seatId;
  const isOffToday = seat.seatType === 'PHARMACIST' && seat.scheduledToday === false;

  const activeClass = isActive ? (isWarn ? 'seat-active-warn' : 'seat-active-ok') : '';
  const selectedClass = isSelected ? 'seat-selected' : '';
  const offClass = isOffToday && !isActive ? 'opacity-65 border-slate-800/60' : 'border-slate-800';
  const bubbleBg = isWarn
    ? 'bg-rose-600 text-white border-rose-400'
    : 'bg-emerald-600 text-white border-emerald-400';

  const bubbleHtml = isActive
    ? `<div class="seat-bubble mb-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold shadow-lg truncate ${bubbleBg}">
         [${escapeHtml(seat.lastBadge || 'LIVE')}] ${escapeHtml(formatShortBubbleText(seat))}
       </div>`
    : '';

  const checkInStatus = seat.seatType === 'PHARMACIST'
    ? `<span class="w-2 h-2 rounded-full ${seat.isCheckedIn ? 'bg-emerald-400' : (isOffToday ? 'bg-slate-700' : 'bg-amber-400')}" title="${seat.isCheckedIn ? 'Đã Check-in & Đang trực POS' : (isOffToday ? 'Nghỉ theo lịch tuần hôm nay' : 'Có lịch trực hôm nay (Chờ Check-in)')}"></span>`
    : `<span class="w-2 h-2 rounded-full bg-purple-400"></span>`;

  let shiftTagHtml = '';
  if (seat.seatType === 'PHARMACIST') {
    if (isOffToday) {
      shiftTagHtml = '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Nghỉ lịch hôm nay</span>';
    } else if (seat.assignedShiftName) {
      shiftTagHtml = `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">${escapeHtml(seat.assignedShiftName)}</span>`;
    }
  }

  const encodedSeatId = encodeURIComponent(seat.seatId);

  return `
    <div onclick="selectSeat(decodeURIComponent('${encodedSeatId}'))"
      class="seat-card cursor-pointer rounded-xl bg-slate-900/90 border p-2.5 flex flex-col justify-between ${offClass} ${activeClass} ${selectedClass}">
      ${bubbleHtml}
      <div>
        <div class="flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-1.5 min-w-0">
            ${checkInStatus}
            <span class="font-bold text-white text-xs truncate">${escapeHtml(seat.actorName)}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            ${shiftTagHtml}
            ${getPersonaBadgeHtml(seat.persona, seat.seatType)}
          </div>
        </div>
        <div class="text-[11px] text-slate-300 mt-1.5 line-clamp-2 leading-snug">
          ${escapeHtml(seat.lastAction || 'Đang trực tại vị trí')}
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono">
        <span class="text-slate-400">${escapeHtml(seat.lastTimestamp || '--:--:--')} • ${seat.totalEvents || 0} SK</span>
        <span class="${seat.totalRevenue > 0 ? 'text-emerald-400 font-bold' : (seat.lateCheckins > 0 ? 'text-rose-400 font-bold' : 'text-slate-400')}">
          ${seat.totalRevenue > 0
            ? `${seat.totalOrders || 0} đơn (${Number(seat.totalRevenue).toLocaleString('vi-VN')}đ)`
            : (seat.lateCheckins > 0 ? `Trễ ${seat.lateCheckins} lần` : `Cảnh báo: ${seat.totalWarns || 0}`)}
        </span>
      </div>
    </div>
  `;
}

function renderCustomerSeatCard(seat, slotIndex, now) {
  const isActive = seat.lastActiveAt && (now - seat.lastActiveAt < ACTIVE_BUBBLE_MS);
  const isWarn = seat.lastStatus === 'WARN';
  const isSelected = inspectorSelection.mode === 'SEAT' && inspectorSelection.seatId === seat.seatId;

  const activeClass = isActive ? (isWarn ? 'seat-active-warn' : 'seat-active-ok') : '';
  const selectedClass = isSelected ? 'seat-selected' : '';
  const encodedSeatId = encodeURIComponent(seat.seatId);

  const badgeColor = seat.lastBadge === 'ORDER'
    ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30'
    : (seat.lastBadge === 'REVIEW'
      ? (isWarn ? 'text-rose-300 bg-rose-500/20 border-rose-500/30' : 'text-purple-300 bg-purple-500/20 border-purple-500/30')
      : 'text-sky-300 bg-sky-500/20 border-sky-500/30');

  return `
    <div onclick="selectSeat(decodeURIComponent('${encodedSeatId}'))"
      class="seat-card cursor-pointer rounded-xl bg-slate-950/80 border border-slate-800/90 p-2 flex flex-col justify-between ${activeClass} ${selectedClass}">
      <div class="flex items-center justify-between gap-1">
        <span class="text-[10px] font-mono font-bold text-slate-400">Ghế K${slotIndex}</span>
        <span class="px-1.5 py-0.2 rounded border text-[9px] font-bold ${badgeColor}">
          ${escapeHtml(seat.lastBadge || 'IDLE')}
        </span>
      </div>
      <div class="font-bold text-white text-[11px] truncate mt-1">
        ${escapeHtml(seat.actorName || `Khách #${slotIndex}`)}
      </div>
      <div class="text-[10px] text-slate-400 truncate mt-0.5" title="${escapeHtml(seat.lastAction || '')}">
        ${escapeHtml(seat.lastAction || 'Chờ khách giao dịch')}
      </div>
      <div class="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1 pt-1 border-t border-slate-900">
        <span>${escapeHtml(seat.lastTimestamp || '--:--')}</span>
        <span class="text-emerald-400 font-bold">${seat.lastAmount ? `+${Number(seat.lastAmount).toLocaleString('vi-VN')}đ` : `${seat.totalEvents || 0} lượt`}</span>
      </div>
    </div>
  `;
}

function renderCompartmentsMap() {
  const grid = document.getElementById('compartmentsGrid');
  if (!grid) return;

  const seats = mapData.seats || [];
  if (seats.length === 0) return;

  const now = Date.now();
  const compartmentOrder = ['BR-001', 'BR-002', 'BR-004', 'BR-003', 'BR-006', 'CENTRAL_WH'];

  grid.innerHTML = compartmentOrder.map(branchCode => {
    const meta = COMPARTMENT_META[branchCode] || {
      title: `Khoang ${branchCode}`,
      subtitle: 'Cơ sở vận hành',
      accent: 'border-slate-700 bg-slate-900/40',
      headerBadge: 'bg-slate-700 text-slate-200',
    };

    const branchSeats = seats.filter(s => s.branchId === branchCode);
    const totalEvents = branchSeats.reduce((acc, s) => acc + (s.totalEvents || 0), 0);
    const totalOrders = branchSeats.reduce((acc, s) => acc + (s.totalOrders || 0), 0);
    const totalRevenue = branchSeats.reduce((acc, s) => acc + (s.totalRevenue || 0), 0);
    const totalWarns = branchSeats.reduce((acc, s) => acc + (s.totalWarns || 0), 0);

    const isBranchSelected = inspectorSelection.mode === 'BRANCH' && inspectorSelection.branchId === branchCode;
    const branchSelectedRing = isBranchSelected ? 'ring-2 ring-sky-400' : '';

    if (branchCode === 'CENTRAL_WH') {
      const whSeats = branchSeats.filter(s => s.seatType === 'WAREHOUSE');
      return `
        <div class="rounded-2xl border p-3.5 space-y-3 ${meta.accent} ${branchSelectedRing}">
          <div class="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-black border ${meta.headerBadge}">${escapeHtml(branchCode)}</span>
                <h3 class="text-xs md:text-sm font-black text-white">${escapeHtml(meta.title)}</h3>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(meta.subtitle)}</p>
            </div>
            <button onclick="selectBranchHistory(decodeURIComponent('${encodeURIComponent(branchCode)}'))"
              class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-[10px] font-bold whitespace-nowrap">
              Lịch sử Kho (${totalEvents})
            </button>
          </div>

          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              4 Bàn Điều Hành Chuỗi Cung Ứng (Click vào bàn để xem lịch sử PR / PO / GRN / Xuất kho)
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${whSeats.map(s => renderStaffSeatCard(s, now)).join('')}
            </div>
          </div>
        </div>
      `;
    }

    const staffSeats = branchSeats.filter(s => s.seatType === 'MANAGER' || s.seatType === 'PHARMACIST');
    const customerSeats = branchSeats.filter(s => s.seatType === 'CUSTOMER');

    return `
      <div class="rounded-2xl border p-3.5 space-y-3 ${meta.accent} ${branchSelectedRing}">
        <!-- HEADER KHOANG CHI NHÁNH -->
        <div class="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[10px] font-black border ${meta.headerBadge}">${escapeHtml(branchCode)}</span>
              <h3 class="text-xs md:text-sm font-black text-white">${escapeHtml(meta.title)}</h3>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(meta.subtitle)}</p>
          </div>
          <div class="text-right">
            <button onclick="selectBranchHistory(decodeURIComponent('${encodeURIComponent(branchCode)}'))"
              class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-[10px] font-bold whitespace-nowrap">
              Xem cả khoang (${totalEvents})
            </button>
            <div class="text-[10px] font-mono text-emerald-400 font-bold mt-1">
              ${totalOrders} đơn • ${Number(totalRevenue).toLocaleString('vi-VN')}đ
              ${totalWarns > 0 ? `<span class="text-rose-400 ml-1">• ${totalWarns} cảnh báo</span>` : ''}
            </div>
          </div>
        </div>

        <!-- HÀNG 1: GHẾ NHÂN SỰ NỘI BỘ (QUẢN LÝ + DƯỢC SĨ POS) -->
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Hàng Ghế Nhân Sự Cơ Sở (${staffSeats.length} ghế cố định)</span>
            <span class="text-[10px] text-slate-500 font-normal">Click ghế để xem hồ sơ & lịch sử</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${staffSeats.map(s => renderStaffSeatCard(s, now)).join('')}
          </div>
        </div>

        <!-- HÀNG 2: HÀNG GHẾ KHÁCH HÀNG TẠI CHI NHÁNH (4 GHẾ RẠP PHIM) -->
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Hàng Ghế Khách Hàng Giao Dịch Tại ${branchCode} (Tìm thuốc • Đặt COD • Đánh giá)
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${customerSeats.map((s, idx) => renderCustomerSeatCard(s, idx + 1, now)).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// TRA CỨU LỊCH SỬ QUÁ KHỨ TỪ SQLITE (SEAT / BRANCH INSPECTOR)
// ============================================================================
async function selectSeat(seatId) {
  inspectorSelection.mode = 'SEAT';
  inspectorSelection.seatId = seatId;
  inspectorSelection.branchId = null;
  renderCompartmentsMap();

  try {
    const res = await fetch(`${BASE_URL}/api/sim/history?seatId=${encodeURIComponent(seatId)}&limit=120`);
    const data = await res.json();
    inspectorSelection.seatMeta = data.seat || mapData.seats.find(s => s.seatId === seatId) || null;
    inspectorSelection.events = Array.isArray(data.events) ? data.events : [];
    renderInspectorHeader();
    renderInspectorTimeline();
  } catch {}
}

async function selectBranchHistory(branchId) {
  inspectorSelection.mode = 'BRANCH';
  inspectorSelection.branchId = branchId;
  inspectorSelection.seatId = null;
  inspectorSelection.seatMeta = null;
  renderCompartmentsMap();

  try {
    const res = await fetch(`${BASE_URL}/api/sim/history?branchId=${encodeURIComponent(branchId)}&limit=150`);
    const data = await res.json();
    inspectorSelection.events = Array.isArray(data.events) ? data.events : [];
    renderInspectorHeader();
    renderInspectorTimeline();
  } catch {}
}

async function selectAllBranchesHistory() {
  inspectorSelection.mode = 'ALL';
  inspectorSelection.seatId = null;
  inspectorSelection.branchId = null;
  inspectorSelection.seatMeta = null;
  renderCompartmentsMap();

  try {
    const res = await fetch(`${BASE_URL}/api/sim/history?limit=150`);
    const data = await res.json();
    inspectorSelection.events = Array.isArray(data.events) ? data.events : [...activityLogs];
    renderInspectorHeader();
    renderInspectorTimeline();
  } catch {}
}

async function refreshInspectorHistory() {
  await fetchMapState();
  if (inspectorSelection.mode === 'SEAT' && inspectorSelection.seatId) {
    return selectSeat(inspectorSelection.seatId);
  }
  if (inspectorSelection.mode === 'BRANCH' && inspectorSelection.branchId) {
    return selectBranchHistory(inspectorSelection.branchId);
  }
  return selectAllBranchesHistory();
}

function renderInspectorHeader() {
  const nameEl = document.getElementById('inspName');
  const metaEl = document.getElementById('inspMeta');
  const badgeEl = document.getElementById('inspBadge');
  const totalEventsEl = document.getElementById('inspTotalEvents');
  const ordersRevEl = document.getElementById('inspOrdersRev');
  const attendanceEl = document.getElementById('inspAttendance');
  const warnsEl = document.getElementById('inspWarns');

  if (!nameEl) return;

  if (inspectorSelection.mode === 'SEAT') {
    const seat = inspectorSelection.seatMeta || mapData.seats.find(s => s.seatId === inspectorSelection.seatId);
    if (seat) {
      nameEl.innerText = seat.actorName || seat.seatId;
      metaEl.innerText = `Mã ghế: ${seat.seatId} • Khoang: ${seat.branchId}`;
      badgeEl.innerText = `${seat.seatType} (${seat.persona || 'STANDARD'})`;
      totalEventsEl.innerText = Number(seat.totalEvents || 0).toLocaleString('vi-VN');
      ordersRevEl.innerText = `${seat.totalOrders || 0} đơn • ${Number(seat.totalRevenue || 0).toLocaleString('vi-VN')}đ`;
      attendanceEl.innerText = `${seat.punctualCheckins || 0} đúng giờ • ${seat.lateCheckins || 0} đi muộn`;
      warnsEl.innerText = Number(seat.totalWarns || 0).toLocaleString('vi-VN');
      return;
    }
  }

  if (inspectorSelection.mode === 'BRANCH' && inspectorSelection.branchId) {
    const bCode = inspectorSelection.branchId;
    const bSeats = (mapData.seats || []).filter(s => s.branchId === bCode);
    const totalEvents = bSeats.reduce((s, x) => s + (x.totalEvents || 0), 0);
    const totalOrders = bSeats.reduce((s, x) => s + (x.totalOrders || 0), 0);
    const totalRevenue = bSeats.reduce((s, x) => s + (x.totalRevenue || 0), 0);
    const punctual = bSeats.reduce((s, x) => s + (x.punctualCheckins || 0), 0);
    const late = bSeats.reduce((s, x) => s + (x.lateCheckins || 0), 0);
    const warns = bSeats.reduce((s, x) => s + (x.totalWarns || 0), 0);

    const cMeta = COMPARTMENT_META[bCode];
    nameEl.innerText = cMeta ? cMeta.title : `Khoang ${bCode}`;
    metaEl.innerText = cMeta ? cMeta.subtitle : `Tổng hợp toàn bộ ghế thuộc ${bCode}`;
    badgeEl.innerText = bCode;
    totalEventsEl.innerText = totalEvents.toLocaleString('vi-VN');
    ordersRevEl.innerText = `${totalOrders} đơn • ${totalRevenue.toLocaleString('vi-VN')}đ`;
    attendanceEl.innerText = `${punctual} đúng giờ • ${late} đi muộn`;
    warnsEl.innerText = warns.toLocaleString('vi-VN');
    return;
  }

  // Mặc định: ALL
  const allSeats = mapData.seats || [];
  const totalEvents = allSeats.reduce((s, x) => s + (x.totalEvents || 0), 0);
  const totalOrders = allSeats.reduce((s, x) => s + (x.totalOrders || 0), 0);
  const totalRevenue = allSeats.reduce((s, x) => s + (x.totalRevenue || 0), 0);
  const punctual = allSeats.reduce((s, x) => s + (x.punctualCheckins || 0), 0);
  const late = allSeats.reduce((s, x) => s + (x.lateCheckins || 0), 0);
  const warns = allSeats.reduce((s, x) => s + (x.totalWarns || 0), 0);

  nameEl.innerText = 'Toàn Hệ Thống (5 Chi Nhánh & Kho Tổng)';
  metaEl.innerText = 'Click vào bất kỳ ghế nào trên sơ đồ 2D để lọc riêng người đó';
  badgeEl.innerText = 'ALL SEATS';
  totalEventsEl.innerText = totalEvents.toLocaleString('vi-VN');
  ordersRevEl.innerText = `${totalOrders} đơn • ${totalRevenue.toLocaleString('vi-VN')}đ`;
  attendanceEl.innerText = `${punctual} đúng giờ • ${late} đi muộn`;
  warnsEl.innerText = warns.toLocaleString('vi-VN');
}

function renderInspectorTimeline() {
  const container = document.getElementById('inspectorTimeline');
  if (!container) return;

  const q = (document.getElementById('inspectorSearchInput')?.value || '').trim().toLowerCase();
  let list = inspectorSelection.events || [];

  if (q) {
    list = list.filter(it =>
      (it.actorName && it.actorName.toLowerCase().includes(q)) ||
      (it.actionText && it.actionText.toLowerCase().includes(q)) ||
      (it.badge && it.badge.toLowerCase().includes(q)) ||
      (it.branchId && it.branchId.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="text-slate-500 text-xs p-6 text-center">Chưa có bản ghi lịch sử nào trong SQLite cho lựa chọn này.</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    const colorClass = roleBadgeStyles[item.role] || roleBadgeStyles.SYSTEM;
    const isWarn = item.status === 'WARN';
    const borderAccent = isWarn ? 'border-l-4 border-l-rose-500 bg-rose-950/20' : 'border-l-4 border-l-sky-500';

    return `
      <div class="p-2.5 rounded-xl bg-slate-900/85 border border-slate-800 ${borderAccent} text-xs space-y-1">
        <div class="flex items-center justify-between gap-1.5 flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-slate-400 font-mono text-[10px]">${escapeHtml(item.timestamp)}</span>
            <span class="px-1.5 py-0.5 rounded border font-black text-[9px] ${colorClass}">${escapeHtml(item.role)} · ${escapeHtml(item.badge)}</span>
            <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">${escapeHtml(item.branchId)}</span>
          </div>
          ${item.amount ? `<span class="text-emerald-400 font-black font-mono text-[11px]">+${Number(item.amount).toLocaleString('vi-VN')}đ</span>` : ''}
        </div>
        <div class="font-bold text-white text-[11px]">${escapeHtml(item.actorName)}</div>
        <div class="text-slate-300 text-[11px] leading-snug">${escapeHtml(item.actionText)}</div>
      </div>
    `;
  }).join('');
}

function updateRoleChart() {
  if (!roleChart) return;
  let c = 0, p = 0, m = 0, w = 0, s = 0;
  for (const log of activityLogs) {
    if (log.role === 'CUSTOMER') c++;
    else if (log.role === 'PHARMACIST') p++;
    else if (log.role === 'MANAGER') m++;
    else if (log.role === 'WAREHOUSE') w++;
    else s++;
  }
  roleChart.data.datasets[0].data = [c, p, m, w, s];
  roleChart.update('none');
}

// ============================================================================
// RENDERING FUNCTIONS CHO THỐNG KÊ KPI & STREAM TỔNG
// ============================================================================
function renderStats(st) {
  const stats = st.stats || {};
  document.getElementById('statViewers').innerText = Number(stats.activeViewers || 0).toLocaleString('vi-VN');
  document.getElementById('statSearches').innerText = Number(stats.totalSearches || 0).toLocaleString('vi-VN');
  document.getElementById('statOrders').innerText = Number(stats.totalOrders || 0).toLocaleString('vi-VN');
  document.getElementById('statRevenue').innerText = `${Number(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ`;
  document.getElementById('statReviews').innerText = Number(stats.totalReviews || 0).toLocaleString('vi-VN');
  document.getElementById('statSupplyChain').innerText = `${stats.totalPRs || 0} / ${stats.totalPOs || 0} / ${stats.totalGRNs || 0}`;

  const btn = document.getElementById('toggleBtn');
  const dot = document.getElementById('statusDot');

  if (st.isRunning) {
    btn.innerText = 'TẠM DỪNG MÔ PHỎNG';
    btn.className = 'px-5 py-2.5 rounded-xl font-black text-xs md:text-sm bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-900/40';
    dot.className = 'w-4 h-4 rounded-full bg-emerald-400 pulse-dot shadow-lg shadow-emerald-500/50';
  } else {
    btn.innerText = 'BẬT MÔ PHỎNG';
    btn.className = 'px-5 py-2.5 rounded-xl font-black text-xs md:text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-900/40';
    dot.className = 'w-4 h-4 rounded-full bg-slate-500';
  }

  [1, 5, 15, 60].forEach(sp => {
    const el = document.getElementById(`sp-${sp}`);
    if (el) {
      el.className = st.speedMultiplier === sp
        ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-600 text-white shadow'
        : 'px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition';
    }
  });

  const scenSelect = document.getElementById('scenarioSelect');
  if (scenSelect && st.currentScenario && scenSelect.value !== st.currentScenario) {
    scenSelect.value = st.currentScenario;
  }

  const pList = document.getElementById('pharmacistList');
  const countBadge = document.getElementById('pharmCountBadge');
  if (st.pharmacists && st.pharmacists.length > 0) {
    countBadge.innerText = `${st.pharmacists.length} nhân sự`;
    pList.innerHTML = st.pharmacists.map(p => {
      const personaBadge = p.persona === 'CHRONIC_LATE'
        ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">Hay trễ</span>'
        : (p.persona === 'PUNCTUAL'
          ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300">Gương mẫu</span>'
          : '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-slate-300">Tiêu chuẩn</span>');

      const seatKey = encodeURIComponent(`PHARM:${p.branchId}:${String(p.name || 'Dược sĩ').trim()}`);

      return `
        <div onclick="selectSeat(decodeURIComponent('${seatKey}'))"
          class="p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 cursor-pointer border border-slate-800 flex items-center justify-between transition">
          <div>
            <div class="font-bold text-white text-xs flex items-center gap-1.5">
              ${escapeHtml(p.name)}
              ${personaBadge}
            </div>
            <div class="text-[10px] text-slate-400">Cơ sở: <span class="font-mono text-slate-300">${escapeHtml(p.branchId)}</span></div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isCheckedIn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}">
            ${p.isCheckedIn ? 'Đang trực POS' : 'Ngoài ca'}
          </span>
        </div>
      `;
    }).join('');
  } else {
    pList.innerHTML = '<div class="text-slate-500 text-xs p-3">Chưa có nhân sự kết nối.</div>';
  }
}

function renderActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  let filtered = currentFilter === 'ALL'
    ? activityLogs
    : activityLogs.filter(it => it.role === currentFilter);

  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(it =>
      (it.actorName && it.actorName.toLowerCase().includes(q)) ||
      (it.actionText && it.actionText.toLowerCase().includes(q)) ||
      (it.branchId && it.branchId.toLowerCase().includes(q)) ||
      (it.badge && it.badge.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    feed.innerHTML = '<div class="text-slate-500 text-xs p-6 text-center">Không có bản ghi nào phù hợp với bộ lọc.</div>';
    return;
  }

  feed.innerHTML = filtered.map(item => {
    const colorClass = roleBadgeStyles[item.role] || roleBadgeStyles.SYSTEM;
    const isWarn = item.status === 'WARN';
    const borderAccent = isWarn ? 'border-l-4 border-l-rose-500 bg-rose-950/20' : 'border-l-4 border-l-emerald-500';
    const hasSeat = item.seatId && item.seatId !== 'SYS:ALL';
    const clickAttr = hasSeat ? `onclick="selectSeat(decodeURIComponent('${encodeURIComponent(item.seatId)}'))"` : '';

    return `
      <div ${clickAttr} class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 ${borderAccent} ${hasSeat ? 'cursor-pointer' : ''} flex items-start justify-between gap-3 text-xs transition hover:bg-slate-800/80">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-slate-500 font-mono text-[10px]">${escapeHtml(item.timestamp)}</span>
            <span class="px-2 py-0.5 rounded border font-black text-[10px] ${colorClass}">${escapeHtml(item.role)} · ${escapeHtml(item.badge)}</span>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold text-[10px]">${escapeHtml(item.branchId)}</span>
            <span class="font-bold text-white text-xs">${escapeHtml(item.actorName)}</span>
          </div>
          <div class="text-slate-200 text-xs mt-0.5">${escapeHtml(item.actionText)}</div>
        </div>
        ${item.amount ? `<div class="text-emerald-400 font-black font-mono whitespace-nowrap text-xs">+${Number(item.amount).toLocaleString('vi-VN')}đ</div>` : ''}
      </div>
    `;
  }).join('');
}

// ============================================================================
// USER ACTIONS
// ============================================================================
function setFilter(role) {
  currentFilter = role;
  ['ALL', 'CUSTOMER', 'PHARMACIST', 'MANAGER', 'WAREHOUSE', 'SYSTEM'].forEach(r => {
    const btn = document.getElementById(`flt-${r}`);
    if (btn) {
      btn.className = r === role
        ? 'px-2 py-0.5 rounded-md bg-slate-700 text-white font-bold'
        : 'px-2 py-0.5 rounded-md text-slate-400 hover:text-white';
    }
  });
  renderActivityFeed();
}

function handleSearch(val) {
  currentSearch = val;
  renderActivityFeed();
}

function clearLogs() {
  activityLogs = [];
  renderActivityFeed();
  updateRoleChart();
}

async function toggleSim() {
  await fetch(`${BASE_URL}/api/sim/toggle`, { method: 'POST' });
}

async function setSpeed(speed) {
  await fetch(`${BASE_URL}/api/sim/speed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed }),
  });
}

async function changeScenario(scenario) {
  await fetch(`${BASE_URL}/api/sim/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
}

async function resetStats() {
  await fetch(`${BASE_URL}/api/sim/reset`, { method: 'POST' });
  await refreshInspectorHistory();
}

function exportLogs() {
  window.open(`${BASE_URL}/api/sim/export-logs`, '_blank');
}

async function triggerNow(action) {
  await fetch(`${BASE_URL}/api/sim/trigger/${action}`, { method: 'POST' });
}

async function checkGatewayHealth() {
  const badge = document.getElementById('gatewayStatusBadge');
  try {
    const res = await fetch(`${BASE_URL}/api/sim/health`);
    const data = await res.json();
    if (data.gatewayConnected) {
      badge.innerText = `Gateway: ONLINE (${data.gatewayLatencyMs}ms)`;
      badge.className = 'px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    } else {
      badge.innerText = 'Gateway: OFFLINE';
      badge.className = 'px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30';
    }
  } catch {
    badge.innerText = 'Simulator: Mất kết nối';
    badge.className = 'px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  checkGatewayHealth();
  fetchMapState();
  selectAllBranchesHistory();
  setInterval(checkGatewayHealth, 10000);
});
