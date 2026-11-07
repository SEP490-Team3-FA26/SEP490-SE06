// Logic điều khiển Frontend Command Center cho ABC Pharmacy Digital Twin v2.0 Clean
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

const roleBadgeStyles = {
  CUSTOMER: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  PHARMACIST: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  MANAGER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  WAREHOUSE: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  SYSTEM: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
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
            '#38bdf8', // Customer
            '#34d399', // Pharmacist
            '#c084fc', // Manager
            '#818cf8', // Warehouse
            '#fbbf24', // System
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

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================
socket.on('connect', () => {
  checkGatewayHealth();
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
  }
});

socket.on('bot:activity', (item) => {
  recentEventCount++;
  activityLogs.unshift(item);
  if (activityLogs.length > 200) {
    activityLogs.pop();
  }
  renderActivityFeed();
  updateRoleChart();
});

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
// RENDERING FUNCTIONS
// ============================================================================
function renderStats(st) {
  const stats = st.stats || {};
  document.getElementById('statViewers').innerText = Number(stats.activeViewers || 0).toLocaleString('vi-VN');
  document.getElementById('statSearches').innerText = Number(stats.totalSearches || 0).toLocaleString('vi-VN');
  document.getElementById('statOrders').innerText = Number(stats.totalOrders || 0).toLocaleString('vi-VN');
  document.getElementById('statRevenue').innerText = `${Number(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ`;
  document.getElementById('statReviews').innerText = Number(stats.totalReviews || 0).toLocaleString('vi-VN');
  document.getElementById('statSupplyChain').innerText = `${stats.totalPRs || 0} / ${stats.totalPOs || 0} / ${stats.totalGRNs || 0}`;

  // Toggle button status
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

  // Speed buttons
  [1, 5, 15, 60].forEach(sp => {
    const el = document.getElementById(`sp-${sp}`);
    if (el) {
      el.className = st.speedMultiplier === sp
        ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-600 text-white shadow'
        : 'px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition';
    }
  });

  // Scenario select
  const scenSelect = document.getElementById('scenarioSelect');
  if (scenSelect && st.currentScenario && scenSelect.value !== st.currentScenario) {
    scenSelect.value = st.currentScenario;
  }

  // Pharmacists list with persona
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

      return `
        <div class="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
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

    return `
      <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 ${borderAccent} flex items-start justify-between gap-3 text-xs transition hover:bg-slate-800/80">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-slate-500 font-mono text-[10px]">${escapeHtml(item.timestamp)}</span>
            <span class="px-2 py-0.5 rounded border font-black text-[10px] ${colorClass}">${item.role} · ${item.badge}</span>
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

async function triggerNow(action) {
  await fetch(`${BASE_URL}/api/sim/trigger/${action}`, { method: 'POST' });
}

async function resetStats() {
  if (confirm('Bạn có chắc muốn đặt lại toàn bộ chỉ số KPI về 0?')) {
    await fetch(`${BASE_URL}/api/sim/reset`, { method: 'POST' });
  }
}

function exportLogs() {
  window.open(`${BASE_URL}/api/sim/export-logs`, '_blank');
}

async function checkGatewayHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/sim/health`);
    const data = await res.json();
    const badge = document.getElementById('gatewayStatusBadge');
    if (badge) {
      if (data.gatewayConnected) {
        badge.innerText = `Gateway: Online (${data.gatewayLatencyMs}ms)`;
        badge.className = 'px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      } else {
        badge.innerText = 'Gateway: Chưa kết nối port 4000';
        badge.className = 'px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30';
      }
    }
  } catch {}
}

setInterval(checkGatewayHealth, 10000);

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  checkGatewayHealth();
});
