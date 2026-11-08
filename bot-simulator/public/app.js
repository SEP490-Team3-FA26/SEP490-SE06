// Điều khiển Trung tâm Mô phỏng 2D & Nhật ký Hợp nhất cho ABC Pharmacy
const isSubpath = window.location.pathname.startsWith('/simulator');
const BASE_URL = isSubpath ? '/simulator' : '';
const socket = io({
  path: isSubpath ? '/simulator/socket.io' : '/socket.io',
});

let currentState = { isRunning: false, speedMultiplier: 1, currentScenario: 'NORMAL' };
let currentFilter = 'ALL';
let currentSearch = '';
let showCustomerSeats = false;
let activityLogs = [];
let throughputHistory = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let throughputLabels = Array(10).fill('');
let recentEventCount = 0;

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

const ACTIVE_BUBBLE_MS = 6000;

const roleBadgeStyles = {
  CUSTOMER: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  PHARMACIST: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  MANAGER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  WAREHOUSE: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  SYSTEM: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const ROLE_LABELS = {
  CUSTOMER: 'Khách',
  PHARMACIST: 'Dược sĩ',
  MANAGER: 'Quản lý',
  WAREHOUSE: 'Kho tổng',
  SYSTEM: 'Hệ thống',
};

const BADGE_LABELS = {
  IDLE: 'Trực tuyến',
  VIEW: 'Tìm thuốc',
  POS: 'Bán POS',
  ATTENDANCE: 'Điểm danh',
  HANDOVER: 'Bàn giao ca',
  ORDER: 'Đặt COD',
  BROWSE: 'Xem thuốc',
  REVIEW: 'Đánh giá',
  SLA: 'Phản hồi SLA',
  SCHEDULE: 'Xếp lịch',
  PAYROLL: 'Bảng lương',
  RESTOCK: 'Báo hết hàng',
  PR: 'Tạo PR',
  PO: 'Duyệt PO',
  GRN: 'Nhập kho GRN',
  TRANSFER: 'Chuyển kho',
  BOOT: 'Khởi động',
};

const COMPARTMENT_META = {
  'ONLINE_WEB': {
    title: 'Kênh Khách Hàng Online — Website & Mobile App',
    subtitle: 'Người dùng trực tuyến tự tìm kiếm thuốc • Đặt đơn giao hàng COD • Đánh giá 1–5 sao',
    accent: 'border-cyan-500/40 bg-cyan-950/15',
    headerBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  'BR-001': {
    title: 'CN1 — ABC Pharmacy Quận 1',
    subtitle: 'Flagship • Lưu lượng 35% • SLA 95%',
    accent: 'border-emerald-500/35 bg-emerald-950/10',
    headerBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  'BR-002': {
    title: 'CN2 — ABC Pharmacy Quận 2',
    subtitle: 'Khu Đông • Lưu lượng 25% • SLA 90%',
    accent: 'border-sky-500/35 bg-sky-950/10',
    headerBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  'BR-004': {
    title: 'CN4 — ABC Pharmacy Hà Nội',
    subtitle: 'Miền Bắc • Lưu lượng 20% • SLA 75%',
    accent: 'border-indigo-500/35 bg-indigo-950/10',
    headerBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  'BR-003': {
    title: 'CN3 — ABC Pharmacy Đà Nẵng',
    subtitle: 'Quá tải • Lưu lượng 12% • SLA 35%',
    accent: 'border-rose-500/35 bg-rose-950/10',
    headerBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  'BR-006': {
    title: 'CN5 — ABC Pharmacy Hội An',
    subtitle: 'Vệ tinh • Lưu lượng 8% • SLA 85%',
    accent: 'border-amber-500/35 bg-amber-950/10',
    headerBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  'CENTRAL_WH': {
    title: 'Kho Tổng Trung Tâm (GSP / GDP)',
    subtitle: 'Điều phối PR → PO → GRN → Xuất kho',
    accent: 'border-purple-500/35 bg-purple-950/10',
    headerBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
};

// ============================================================================
// BIỂU ĐỒ SPARKLINE NHỊP SỰ KIỆN (CHART.JS)
// ============================================================================
let throughputChart = null;

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
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 1.5,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: {
            display: false,
            beginAtZero: true,
          },
        },
      },
    });
  }
}

setInterval(() => {
  const tpsEl = document.getElementById('tpsBadge');
  if (tpsEl) {
    tpsEl.innerText = `${recentEventCount} SK / 3s`;
  }
  if (!throughputChart) {
    recentEventCount = 0;
    return;
  }
  throughputHistory.shift();
  throughputHistory.push(recentEventCount);
  recentEventCount = 0;
  throughputChart.update('none');
}, 3000);

// Định kỳ cập nhật hiệu ứng viền sáng của ghế đang hoạt động
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
});

// ============================================================================
// CẬP NHẬT SƠ ĐỒ 2D & NHẬT KÝ THEO THỜI GIAN THỰC
// ============================================================================
function applyLiveActivityToMap(item) {
  if (!item) return;

  const now = item.createdAt || Date.now();
  let seat = null;

  if (item.seatId && item.seatId !== 'SYS:ALL') {
    seat = mapData.seats.find(s => s.seatId === item.seatId);

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
  }

  const matchesSeat = inspectorSelection.mode === 'SEAT' && inspectorSelection.seatId === item.seatId;
  const matchesBranch = inspectorSelection.mode === 'BRANCH' && inspectorSelection.branchId === item.branchId;
  const matchesAll = inspectorSelection.mode === 'ALL';

  if (matchesSeat || matchesBranch || matchesAll) {
    if (matchesSeat && seat) {
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

function formatShortActorName(rawName) {
  if (!rawName) return 'Nhân sự';
  return String(rawName)
    .replace(/^(BR\d+-\d+|WH-\d+|\d{2,3})\.\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim();
}

function getCompactRoleOrShiftBadge(seat, isOffToday) {
  if (seat.seatType === 'MANAGER') {
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">Quản lý</span>';
  }
  if (seat.seatType === 'WAREHOUSE') {
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Kho GSP</span>';
  }
  if (seat.seatType === 'PHARMACIST') {
    if (isOffToday) {
      return '<span class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700">Nghỉ ca</span>';
    }
    if (seat.assignedShiftName) {
      return `<span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">${escapeHtml(seat.assignedShiftName)}</span>`;
    }
    return '<span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Trực POS</span>';
  }
  return '';
}

function renderStaffSeatCard(seat, now) {
  const isActive = seat.lastActiveAt && (now - seat.lastActiveAt < ACTIVE_BUBBLE_MS);
  const isWarn = seat.lastStatus === 'WARN';
  const isSelected = inspectorSelection.mode === 'SEAT' && inspectorSelection.seatId === seat.seatId;
  const isOffToday = seat.seatType === 'PHARMACIST' && seat.scheduledToday === false;

  const activeClass = isActive ? (isWarn ? 'seat-active-warn' : 'seat-active-ok') : '';
  const selectedClass = isSelected ? 'seat-selected' : '';
  const offClass = isOffToday && !isActive ? 'opacity-60 border-slate-800/60' : 'border-slate-800';

  const dotColor = seat.seatType === 'PHARMACIST'
    ? (seat.isCheckedIn ? 'bg-emerald-400' : (isOffToday ? 'bg-slate-600' : 'bg-amber-400'))
    : (seat.seatType === 'MANAGER' ? 'bg-purple-400' : 'bg-indigo-400');

  const dotTitle = seat.seatType === 'PHARMACIST'
    ? (seat.isCheckedIn ? 'Đang trong ca trực' : (isOffToday ? 'Nghỉ lịch hôm nay' : 'Chờ vào ca'))
    : 'Nhân sự điều hành';

  const encodedSeatId = encodeURIComponent(seat.seatId);
  const badgeLabel = BADGE_LABELS[seat.lastBadge] || seat.lastBadge || 'Hoạt động';
  const shortName = formatShortActorName(seat.actorName);

  // Dòng phụ thứ 2: nếu vừa có sự kiện nóng thì hiện hành động ngắn, ngược lại hiện tóm tắt gọn
  let secondLineHtml = '';
  if (isActive && seat.lastAction) {
    const highlightColor = isWarn ? 'text-rose-300' : 'text-emerald-300';
    const amountSuffix = seat.lastAmount ? ` (+${Number(seat.lastAmount).toLocaleString('vi-VN')}đ)` : '';
    secondLineHtml = `
      <div class="text-[11px] ${highlightColor} font-medium truncate mt-1" title="${escapeHtml(seat.lastAction)}">
        [${escapeHtml(badgeLabel)}] ${escapeHtml(seat.lastAction)}${amountSuffix}
      </div>
    `;
  } else {
    let statusSummary = 'Sẵn sàng trực';
    if (seat.seatType === 'PHARMACIST') {
      statusSummary = seat.isCheckedIn ? 'Đang trực tại quầy' : (isOffToday ? 'Nghỉ lịch hôm nay' : 'Chờ đến giờ vào ca');
    } else if (seat.seatType === 'MANAGER') {
      statusSummary = 'Điều hành cơ sở';
    } else if (seat.seatType === 'WAREHOUSE') {
      statusSummary = 'Trực điều phối kho';
    }

    const leftMetric = seat.totalRevenue > 0
      ? `<span class="text-emerald-400 font-semibold">${seat.totalOrders || 0} đơn • ${Number(seat.totalRevenue).toLocaleString('vi-VN')}đ</span>`
      : `<span class="text-slate-400">${escapeHtml(statusSummary)}</span>`;

    const rightMetric = seat.lateCheckins > 0
      ? `<span class="text-rose-400 font-mono text-[10px] shrink-0">Trễ ${seat.lateCheckins}</span>`
      : `<span class="text-slate-500 font-mono text-[10px] shrink-0">${seat.totalEvents || 0} SK</span>`;

    secondLineHtml = `
      <div class="flex items-center justify-between gap-2 text-[11px] mt-1">
        <div class="truncate">${leftMetric}</div>
        ${rightMetric}
      </div>
    `;
  }

  return `
    <div onclick="selectSeat(decodeURIComponent('${encodedSeatId}'))"
      class="seat-card cursor-pointer rounded-lg bg-slate-900/90 border px-2.5 py-2 flex flex-col justify-between ${offClass} ${activeClass} ${selectedClass}">
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="w-2 h-2 rounded-full shrink-0 ${dotColor}" title="${dotTitle}"></span>
          <span class="font-bold text-white text-xs truncate" title="${escapeHtml(seat.actorName)}">${escapeHtml(shortName)}</span>
        </div>
        <div class="shrink-0">
          ${getCompactRoleOrShiftBadge(seat, isOffToday)}
        </div>
      </div>
      ${secondLineHtml}
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
  const badgeLabel = BADGE_LABELS[seat.lastBadge] || seat.lastBadge || 'Trực tuyến';
  const rawDisplayName = seat.actorName && !seat.actorName.startsWith('Ghế Khách')
    ? seat.actorName
    : `Khách Online #${slotIndex}`;
  const displayName = formatShortActorName(rawDisplayName);

  let secondLineHtml = '';
  if (isActive && seat.lastAction) {
    const highlightColor = isWarn ? 'text-rose-300' : 'text-cyan-300';
    const amountSuffix = seat.lastAmount ? ` (+${Number(seat.lastAmount).toLocaleString('vi-VN')}đ)` : '';
    secondLineHtml = `
      <div class="text-[11px] ${highlightColor} font-medium truncate mt-1" title="${escapeHtml(seat.lastAction)}">
        ${escapeHtml(seat.lastAction)}${amountSuffix}
      </div>
    `;
  } else {
    const leftText = seat.totalOrders > 0
      ? `<span class="text-emerald-400 font-semibold">${seat.totalOrders} đơn • ${Number(seat.totalRevenue || 0).toLocaleString('vi-VN')}đ</span>`
      : `<span class="text-slate-400">${escapeHtml(
          seat.lastAction && !seat.lastAction.includes('Đang chờ ca')
            ? seat.lastAction
            : 'Đang lướt Website / App'
        )}</span>`;

    secondLineHtml = `
      <div class="flex items-center justify-between gap-1.5 text-[11px] mt-1">
        <div class="truncate" title="${escapeHtml(seat.lastAction || '')}">${leftText}</div>
        <span class="text-slate-500 font-mono text-[10px] shrink-0">${seat.totalEvents || 0} SK</span>
      </div>
    `;
  }

  return `
    <div onclick="selectSeat(decodeURIComponent('${encodedSeatId}'))"
      class="seat-card cursor-pointer rounded-lg bg-slate-900/90 border border-slate-800 px-2.5 py-2 flex flex-col justify-between ${activeClass} ${selectedClass}">
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="w-2 h-2 rounded-full shrink-0 bg-cyan-400"></span>
          <span class="text-xs font-bold text-white truncate" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
        </div>
        <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shrink-0">${escapeHtml(badgeLabel)}</span>
      </div>
      ${secondLineHtml}
    </div>
  `;
}

function renderCompartmentsMap() {
  const grid = document.getElementById('compartmentsGrid');
  if (!grid) return;

  const seats = mapData.seats || [];
  if (seats.length === 0) return;

  // Cập nhật huy hiệu tổng nhân sự đang trực trên tiêu đề cột trái
  const pharmSeats = seats.filter(s => s.seatType === 'PHARMACIST');
  const activePharmCount = pharmSeats.filter(s => s.isCheckedIn).length;
  const countBadge = document.getElementById('pharmCountBadge');
  if (countBadge) {
    countBadge.innerText = `${activePharmCount}/${pharmSeats.length} dược sĩ đang trực POS`;
  }

  const now = Date.now();
  const compartmentOrder = ['ONLINE_WEB', 'BR-001', 'BR-002', 'BR-004', 'BR-003', 'BR-006', 'CENTRAL_WH'];

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
    const encodedBranch = encodeURIComponent(branchCode);

    // 1. KHOANG KÊNH KHÁCH HÀNG ONLINE (TRẢI RỘNG 2 CỘT Ở ĐẦU SƠ ĐỒ)
    if (branchCode === 'ONLINE_WEB') {
      const onlineSeats = branchSeats.filter(s => s.seatType === 'CUSTOMER');
      const totalCustPool = mapData.customersCount || currentState.customersCount || 100;
      return `
        <div class="md:col-span-2 rounded-xl border p-3 space-y-2.5 ${meta.accent} ${branchSelectedRing}">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-black border whitespace-nowrap shrink-0 ${meta.headerBadge}">WEB / APP ONLINE</span>
                <h3 class="text-xs md:text-sm font-black text-white truncate">${escapeHtml(meta.title)}</h3>
                <span class="px-2 py-0.5 rounded bg-slate-900/90 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                  Pool: ${totalCustPool} khách hàng thật (Ngẫu nhiên lên 8 phiên trực tuyến)
                </span>
              </div>
              <p class="text-[10px] text-slate-400 truncate mt-0.5">${escapeHtml(meta.subtitle)}</p>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              <span class="text-[11px] font-mono text-emerald-400 font-bold">
                ${totalOrders} đơn COD • ${Number(totalRevenue).toLocaleString('vi-VN')}đ
                ${totalWarns > 0 ? `<span class="text-rose-400 ml-1">• ${totalWarns} phản ánh</span>` : ''}
              </span>
              <button onclick="selectBranchHistory(decodeURIComponent('${encodedBranch}'))"
                class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-semibold shrink-0">
                Lọc kênh Online (${totalEvents})
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${onlineSeats.map((s, idx) => renderCustomerSeatCard(s, idx + 1, now)).join('')}
          </div>
        </div>
      `;
    }

    // 2. KHOANG KHO TỔNG TRUNG TÂM
    if (branchCode === 'CENTRAL_WH') {
      const whSeats = branchSeats.filter(s => s.seatType === 'WAREHOUSE');
      return `
        <div class="rounded-xl border p-3 space-y-2.5 ${meta.accent} ${branchSelectedRing}">
          <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-black border whitespace-nowrap shrink-0 ${meta.headerBadge}">KHO TỔNG</span>
                <h3 class="text-xs font-black text-white truncate">${escapeHtml(meta.title)}</h3>
              </div>
              <p class="text-[10px] text-slate-400 truncate mt-0.5">${escapeHtml(meta.subtitle)}</p>
            </div>
            <button onclick="selectBranchHistory(decodeURIComponent('${encodedBranch}'))"
              class="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-[10px] font-semibold shrink-0">
              Lọc kho (${totalEvents})
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${whSeats.map(s => renderStaffSeatCard(s, now)).join('')}
          </div>
        </div>
      `;
    }

    // 3. 5 KHOANG CHI NHÁNH VẬT LÝ (CHỈ GỒM QUẢN LÝ & DƯỢC SĨ BÁN POS TRỰC TIẾP TẠI QUẦY)
    const staffSeats = branchSeats.filter(s => s.seatType === 'MANAGER' || s.seatType === 'PHARMACIST');

    return `
      <div class="rounded-xl border p-3 space-y-2.5 ${meta.accent} ${branchSelectedRing}">
        <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-black border whitespace-nowrap shrink-0 ${meta.headerBadge}">${escapeHtml(branchCode)}</span>
              <h3 class="text-xs font-black text-white truncate">${escapeHtml(meta.title)}</h3>
            </div>
            <p class="text-[10px] text-slate-400 truncate mt-0.5">
              POS tại quầy: <strong class="text-emerald-400 font-mono">${totalOrders} đơn (${Number(totalRevenue).toLocaleString('vi-VN')}đ)</strong>
              ${totalWarns > 0 ? `<span class="text-rose-400 font-semibold ml-1">• ${totalWarns} cảnh báo</span>` : ''}
            </p>
          </div>
          <button onclick="selectBranchHistory(decodeURIComponent('${encodedBranch}'))"
            class="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-[10px] font-semibold shrink-0">
            Lọc (${totalEvents})
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${staffSeats.map(s => renderStaffSeatCard(s, now)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// TRA CỨU LỊCH SỬ & NHẬT KÝ HỢP NHẤT (SEAT / BRANCH / ALL)
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
  const resetBtn = document.getElementById('btnResetSelection');

  if (!nameEl) return;

  if (resetBtn) {
    if (inspectorSelection.mode === 'ALL') {
      resetBtn.classList.add('hidden');
    } else {
      resetBtn.classList.remove('hidden');
    }
  }

  if (inspectorSelection.mode === 'SEAT') {
    const seat = inspectorSelection.seatMeta || mapData.seats.find(s => s.seatId === inspectorSelection.seatId);
    if (seat) {
      nameEl.innerText = seat.actorName || seat.seatId;
      metaEl.innerText = `Chi nhánh: ${seat.branchId} • Ca: ${seat.assignedShiftName || 'Linh hoạt'}`;
      badgeEl.innerText = ROLE_LABELS[seat.seatType] || seat.seatType;
      totalEventsEl.innerText = Number(seat.totalEvents || 0).toLocaleString('vi-VN');
      ordersRevEl.innerText = `${seat.totalOrders || 0} • ${Number(seat.totalRevenue || 0).toLocaleString('vi-VN')}đ`;
      attendanceEl.innerText = `${seat.punctualCheckins || 0} / ${seat.lateCheckins || 0}`;
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
    metaEl.innerText = cMeta ? cMeta.subtitle : `Đang lọc toàn bộ nhân sự và khách tại ${bCode}`;
    badgeEl.innerText = bCode;
    totalEventsEl.innerText = totalEvents.toLocaleString('vi-VN');
    ordersRevEl.innerText = `${totalOrders} • ${totalRevenue.toLocaleString('vi-VN')}đ`;
    attendanceEl.innerText = `${punctual} / ${late}`;
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

  nameEl.innerText = 'Tất cả Chi nhánh & Kho Tổng';
  metaEl.innerText = 'Bấm vào một chi nhánh hoặc nhân viên bên trái để lọc riêng';
  badgeEl.innerText = 'TOÀN HỆ THỐNG';
  totalEventsEl.innerText = totalEvents.toLocaleString('vi-VN');
  ordersRevEl.innerText = `${totalOrders} • ${totalRevenue.toLocaleString('vi-VN')}đ`;
  attendanceEl.innerText = `${punctual} / ${late}`;
  warnsEl.innerText = warns.toLocaleString('vi-VN');
}

function renderInspectorTimeline() {
  const container = document.getElementById('inspectorTimeline');
  if (!container) return;

  const q = (currentSearch || document.getElementById('inspectorSearchInput')?.value || '').trim().toLowerCase();
  let list = inspectorSelection.events || [];

  if (currentFilter !== 'ALL') {
    list = list.filter(it => it.role === currentFilter);
  }

  if (q) {
    list = list.filter(it =>
      (it.actorName && it.actorName.toLowerCase().includes(q)) ||
      (it.actionText && it.actionText.toLowerCase().includes(q)) ||
      (it.badge && it.badge.toLowerCase().includes(q)) ||
      (it.branchId && it.branchId.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="text-slate-500 text-xs p-6 text-center">Không có sự kiện nào khớp với bộ lọc hiện tại.</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    const colorClass = roleBadgeStyles[item.role] || roleBadgeStyles.SYSTEM;
    const roleLabel = ROLE_LABELS[item.role] || item.role;
    const badgeLabel = BADGE_LABELS[item.badge] || item.badge;
    const isWarn = item.status === 'WARN';
    const borderAccent = isWarn ? 'border-l-2 border-l-rose-500 bg-rose-950/15' : 'border-l-2 border-l-emerald-500/70';
    const hasSeat = item.seatId && item.seatId !== 'SYS:ALL';
    const clickAttr = hasSeat ? `onclick="selectSeat(decodeURIComponent('${encodeURIComponent(item.seatId)}'))"` : '';

    return `
      <div ${clickAttr} class="px-2.5 py-2 rounded-lg bg-slate-900/85 hover:bg-slate-800/80 border border-slate-800/90 ${borderAccent} ${hasSeat ? 'cursor-pointer' : ''} text-xs space-y-0.5 transition">
        <div class="flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span class="text-slate-500 font-mono text-[10px]">${escapeHtml(item.timestamp)}</span>
            <span class="px-1.5 py-0.2 rounded border font-bold text-[9px] ${colorClass}">${escapeHtml(roleLabel)} · ${escapeHtml(badgeLabel)}</span>
            <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">${escapeHtml(item.branchId)}</span>
            <span class="font-bold text-white text-[11px] truncate">${escapeHtml(item.actorName)}</span>
          </div>
          ${item.amount ? `<span class="text-emerald-400 font-black font-mono text-[11px] shrink-0">+${Number(item.amount).toLocaleString('vi-VN')}đ</span>` : ''}
        </div>
        <div class="text-slate-300 text-[11px] leading-snug">${escapeHtml(item.actionText)}</div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// RENDERING KPI & USER ACTIONS
// ============================================================================
function renderStats(st) {
  const stats = st.stats || {};
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setTxt('statViewers', Number(stats.activeViewers || 0).toLocaleString('vi-VN'));
  setTxt('statSearches', Number(stats.totalSearches || 0).toLocaleString('vi-VN'));
  setTxt('statOrders', Number(stats.totalOrders || 0).toLocaleString('vi-VN'));
  setTxt('statRevenue', `${Number(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ`);
  setTxt('statReviews', Number(stats.totalReviews || 0).toLocaleString('vi-VN'));
  setTxt('statSupplyChain', `${stats.totalPRs || 0} / ${stats.totalPOs || 0} / ${stats.totalGRNs || 0}`);

  const btn = document.getElementById('toggleBtn');
  const dot = document.getElementById('statusDot');

  if (btn && dot) {
    if (st.isRunning) {
      btn.innerText = 'TẠM DỪNG';
      btn.className = 'px-4 py-1.5 rounded-lg font-extrabold text-xs bg-rose-600 hover:bg-rose-500 text-white transition shadow';
      dot.className = 'w-3 h-3 rounded-full bg-emerald-400 pulse-dot shadow-lg shadow-emerald-500/50';
    } else {
      btn.innerText = 'BẬT MÔ PHỎNG';
      btn.className = 'px-4 py-1.5 rounded-lg font-extrabold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow';
      dot.className = 'w-3 h-3 rounded-full bg-slate-500';
    }
  }

  [1, 5, 15, 60].forEach(sp => {
    const el = document.getElementById(`sp-${sp}`);
    if (el) {
      el.className = st.speedMultiplier === sp
        ? 'px-2 py-1 rounded-md text-xs font-bold bg-sky-600 text-white transition'
        : 'px-2 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white transition';
    }
  });

  const scenSelect = document.getElementById('scenarioSelect');
  if (scenSelect && st.currentScenario && scenSelect.value !== st.currentScenario) {
    scenSelect.value = st.currentScenario;
  }
}

function toggleCustomerSeats(checked) {
  showCustomerSeats = Boolean(checked);
  renderCompartmentsMap();
}

function toggleQuickActionsMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('quickActionsMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

function hideQuickActionsMenu() {
  const menu = document.getElementById('quickActionsMenu');
  if (menu) {
    menu.classList.add('hidden');
  }
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('quickActionsMenu');
  if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

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
  renderInspectorTimeline();
}

function handleSearch(val) {
  currentSearch = val;
  renderInspectorTimeline();
}

function clearLogs() {
  activityLogs = [];
  inspectorSelection.events = [];
  renderInspectorTimeline();
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
  if (!badge) return;
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
