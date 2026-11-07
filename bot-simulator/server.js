// Điểm khởi chạy của Bot Simulator & Live Traffic Command Center v2.0 Clean (Tích hợp SQLite & Bản đồ 2D)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const config = require('./config');
const ApiClient = require('./src/api-client');
const { BotEngine } = require('./src/bot-engine');
const Scheduler = require('./src/scheduler');
const SimulatorStore = require('./src/store');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const apiClient = new ApiClient(config.gatewayUrl);
const engine = new BotEngine(apiClient, config);
const scheduler = new Scheduler(engine, config);
const store = new SimulatorStore();

// Khôi phục thống kê KPI và 250 sự kiện gần nhất từ SQLite khi khởi động lại container/server
const savedStats = store.loadStats();
if (savedStats && typeof savedStats === 'object') {
  engine.state.stats = {
    ...engine.state.stats,
    ...savedStats,
    activeViewers: 0,
  };
}

store.seedInitialSeats(engine.state.branches, engine.state.tokens.managers, engine.state.tokens.pharmacists);

const MAX_SAVED_LOGS = 250;
const recentLogs = store.getRecentEvents(MAX_SAVED_LOGS);

function findPharmacistPersona(actorName, branchId) {
  for (const p of Object.values(engine.state.tokens.pharmacists)) {
    const pName = p.user?.fullName || '';
    if (pName === actorName && (!branchId || p.branchId === branchId)) {
      return p.persona || 'BALANCED';
    }
  }
  return null;
}

function getMapPayload() {
  store.seedInitialSeats(engine.state.branches, engine.state.tokens.managers, engine.state.tokens.pharmacists);
  const seats = store.getAllSeats();
  const pharmMetaMap = new Map();
  for (const p of Object.values(engine.state.tokens.pharmacists)) {
    const key = `PHARM:${p.branchId || 'BR-001'}:${String(p.user?.fullName || 'Dược sĩ').trim()}`;
    pharmMetaMap.set(key, {
      isCheckedIn: Boolean(p.isCheckedIn),
      scheduledToday: Boolean(p.scheduledToday),
      assignedShiftName: p.assignedShift?.shiftName || null,
      assignedShiftTime: p.assignedShift
        ? `${p.assignedShift.shiftStart || '07:00'}-${p.assignedShift.shiftEnd || '15:00'}`
        : null,
    });
  }

  const enrichedSeats = seats.map(s => {
    if (s.seatType !== 'PHARMACIST') {
      return { ...s, isCheckedIn: true, scheduledToday: true, assignedShiftName: null };
    }
    const meta = pharmMetaMap.get(s.seatId);
    const scheduledToday = meta ? meta.scheduledToday : false;
    const assignedShiftName = meta ? meta.assignedShiftName : null;
    const assignedShiftTime = meta ? meta.assignedShiftTime : null;
    const defaultIdleAction = scheduledToday
      ? `Có lịch trực hôm nay: ${assignedShiftName || 'Ca trực'} (${assignedShiftTime || '07:00-15:00'})`
      : 'Nghỉ lịch hôm nay (Không có tên trong lịch phân công ngày hôm nay của Quản lý)';

    return {
      ...s,
      isCheckedIn: meta ? meta.isCheckedIn : false,
      scheduledToday,
      assignedShiftName,
      assignedShiftTime,
      lastAction:
        !s.totalEvents || s.lastAction === 'Đang chờ ca / Chưa phát sinh giao dịch'
          ? defaultIdleAction
          : s.lastAction,
    };
  });

  return {
    branches: engine.state.branches,
    branchProfiles: engine.getPublicState().branchProfiles,
    seats: enrichedSeats,
    branchSummaries: store.getBranchSummaries(),
  };
}

function emitActivity(role, badge, actorName, branchId, actionText, amount = null, status = 'SUCCESS') {
  const rawLog = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    role,        // CUSTOMER | PHARMACIST | MANAGER | WAREHOUSE | SYSTEM
    badge,       // VIEW | ORDER | POS | ATTENDANCE | REVIEW | SCHEDULE | PAYROLL | PR | PO | GRN | TRANSFER
    actorName,
    branchId: branchId || 'ONLINE',
    actionText,
    amount,
    status,      // SUCCESS | WARN
  };

  const persona = role === 'PHARMACIST' ? findPharmacistPersona(actorName, branchId) : null;
  const logItem = store.recordActivity(rawLog, persona);
  store.saveStats(engine.state.stats);

  recentLogs.unshift(logItem);
  if (recentLogs.length > MAX_SAVED_LOGS) {
    recentLogs.pop();
  }

  io.emit('bot:activity', logItem);
  io.emit('bot:stats', engine.getPublicState());
}

engine.setEmitter(emitActivity);

// ============================================================================
// REST API ĐIỀU KHIỂN, THỐNG KÊ & BẢN ĐỒ 2D SQLITE
// ============================================================================
app.get('/api/sim/state', (req, res) => {
  res.json(engine.getPublicState());
});

app.get('/api/sim/map', (req, res) => {
  res.json(getMapPayload());
});

app.get('/api/sim/history', (req, res) => {
  const { seatId, branchId, role, actorName, limit } = req.query;
  if (seatId) {
    const detail = store.getSeatDetail(String(seatId), Number(limit) || 100);
    return res.json(detail);
  }
  const events = store.queryHistory({
    branchId: branchId ? String(branchId) : undefined,
    role: role ? String(role) : undefined,
    actorName: actorName ? String(actorName) : undefined,
    limit: Number(limit) || 100,
  });
  res.json({ seat: null, events });
});

app.get('/api/sim/health', async (req, res) => {
  const pingRes = await apiClient.ping();
  res.json({
    simulatorStatus: 'ONLINE',
    uptimeSeconds: Math.floor(process.uptime()),
    gatewayUrl: config.gatewayUrl,
    gatewayConnected: pingRes.ok,
    gatewayLatencyMs: pingRes.latencyMs,
    speedMultiplier: engine.state.speedMultiplier,
    currentScenario: engine.state.currentScenario,
    isRunning: engine.state.isRunning,
    sqliteDbPath: store.dbPath,
  });
});

app.get('/api/sim/export-logs', (req, res) => {
  const logs = store.getRecentEvents(500);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="bot_simulator_logs.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    stats: engine.state.stats,
    logsCount: logs.length,
    logs,
  });
});

app.post('/api/sim/toggle', (req, res) => {
  engine.state.isRunning = !engine.state.isRunning;
  if (engine.state.isRunning) {
    scheduler.start();
    emitActivity('SYSTEM', 'START', 'Admin Control', 'ALL', `Đã BẬT mô phỏng tự động (Tốc độ: ${engine.state.speedMultiplier}x, Kịch bản: ${engine.state.currentScenario})`);
  } else {
    scheduler.stop();
    engine.state.stats.activeViewers = 0;
    emitActivity('SYSTEM', 'STOP', 'Admin Control', 'ALL', 'Đã TẠM DỪNG toàn bộ luồng mô phỏng tự động');
  }
  res.json(engine.getPublicState());
});

app.post('/api/sim/speed', (req, res) => {
  const speed = Number(req.body.speed) || 1;
  scheduler.updateSpeed(speed);
  emitActivity('SYSTEM', 'SPEED', 'Admin Control', 'ALL', `Đã đổi tốc độ mô phỏng sang ${engine.state.speedMultiplier}x`);
  res.json(engine.getPublicState());
});

app.post('/api/sim/scenario', (req, res) => {
  const { scenario } = req.body;
  const ok = engine.setScenario(scenario);
  if (ok && engine.state.isRunning) {
    scheduler.start();
  }
  res.json({ success: ok, state: engine.getPublicState() });
});

app.post('/api/sim/reset', (req, res) => {
  store.resetAll();
  recentLogs.length = 0;
  engine.resetStats();
  store.seedInitialSeats(engine.state.branches, engine.state.tokens.managers, engine.state.tokens.pharmacists);
  io.emit('bot:map-init', getMapPayload());
  res.json(engine.getPublicState());
});

app.post('/api/sim/trigger/:action', async (req, res) => {
  const { action } = req.params;

  try {
    if (action === 'checkin-all') {
      await engine.ensureAllBranchesScheduled();
      for (const p of Object.values(engine.state.tokens.pharmacists)) {
        p.isCheckedIn = false;
        p.isCompleted = false;
      }
      const scheduledCount = Object.values(engine.state.tokens.pharmacists).filter(p => p.scheduledToday).length;
      for (let i = 0; i < Math.max(1, scheduledCount); i++) {
        await engine.simulatePharmacistPOSAndAttendance(true);
      }
      io.emit('bot:map-init', getMapPayload());
    } else if (action === 'handover-all') {
      for (const p of Object.values(engine.state.tokens.pharmacists)) {
        if (p.isCheckedIn && !p.isCompleted) {
          await engine.triggerHandoverAndCheckout(p);
        }
      }
      io.emit('bot:map-init', getMapPayload());
    } else if (action === 'schedule-week') {
      await engine.triggerWeeklySchedule();
      io.emit('bot:map-init', getMapPayload());
    } else if (action === 'payroll-month') {
      await engine.triggerMonthlyPayroll();
    } else if (action === 'burst-orders') {
      for (let i = 0; i < 5; i++) {
        await engine.simulateCustomerOrderAndReview();
      }
    } else if (action === 'warehouse-cycle') {
      await engine.simulateWarehouseOperations(true);
    } else {
      return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
    }

    res.json({ success: true, state: engine.getPublicState() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

io.on('connection', (socket) => {
  socket.emit('bot:stats', engine.getPublicState());
  socket.emit('bot:init-logs', recentLogs);
  socket.emit('bot:map-init', getMapPayload());
});

// ============================================================================
// BACKGROUND WATCHDOGS & HEALTH MONITOR (24/7 PRODUCTION RESILIENCE)
// ============================================================================
let healthInterval = null;
let tokenRefreshInterval = null;

function startBackgroundWatchdogs() {
  if (healthInterval) clearInterval(healthInterval);
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);

  healthInterval = setInterval(async () => {
    try {
      const pingRes = await apiClient.ping();
      const wasOnline = engine.state.isGatewayOnline;
      engine.state.isGatewayOnline = pingRes.ok;

      if (!pingRes.ok && wasOnline) {
        emitActivity(
          'SYSTEM',
          'WARN',
          'Watchdog',
          'ALL',
          `Mất kết nối tới API Gateway (${pingRes.error || 'Timeout'}). Tạm dừng mô phỏng để chờ Gateway...`,
          null,
          'WARN'
        );
      } else if (pingRes.ok && !wasOnline) {
        emitActivity(
          'SYSTEM',
          'READY',
          'Watchdog',
          'ALL',
          'Kết nối tới API Gateway đã phục hồi! Hệ thống tiếp tục hoạt động.'
        );
        if (engine.state.allMedicines.length === 0 || !engine.state.tokens.admin) {
          await engine.bootstrap().catch(() => {});
          store.seedInitialSeats(engine.state.branches, engine.state.tokens.managers, engine.state.tokens.pharmacists);
          io.emit('bot:map-init', getMapPayload());
        }
      }
    } catch {}
  }, config.healthCheckIntervalMs);

  // Định kỳ 30 phút làm mới access token phòng ngừa hết hạn JWT trên production
  tokenRefreshInterval = setInterval(async () => {
    if (engine.state.isGatewayOnline && (engine.state.isRunning || Boolean(engine.state.tokens.admin))) {
      await engine.refreshAllTokens().catch(() => {});
    }
  }, config.tokenRefreshIntervalMs);

  if (healthInterval.unref) healthInterval.unref();
  if (tokenRefreshInterval.unref) tokenRefreshInterval.unref();
}

function stopBackgroundWatchdogs() {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN (ĐÓNG TIẾN TRÌNH AN TOÀN KHI NHẬN TÍN HIỆU DOCKER / OS)
// ============================================================================
function gracefulShutdown(signal = 'SIGTERM') {
  console.log(`\n[Bot Simulator v2.0 Clean] Nhận tín hiệu ${signal}, đang tắt hệ thống an toàn...`);
  scheduler.stop();
  stopBackgroundWatchdogs();
  store.saveStats(engine.state.stats);
  store.close();

  io.close(() => {
    server.close(() => {
      console.log('[Bot Simulator v2.0 Clean] Đã giải phóng toàn bộ kết nối HTTP, Socket.IO và SQLite.');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('[Bot Simulator v2.0 Clean] Quá thời gian chờ 5s, cưỡng chế thoát tiến trình.');
    process.exit(0);
  }, 5000).unref();
}

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// Khởi động server khi chạy trực tiếp
if (require.main === module) {
  server.listen(config.simulatorPort, async () => {
    console.log(`[Bot Simulator v2.0 Clean] Listening at: http://localhost:${config.simulatorPort}`);
    try {
      await engine.bootstrap();
      store.seedInitialSeats(engine.state.branches, engine.state.tokens.managers, engine.state.tokens.pharmacists);
      io.emit('bot:map-init', getMapPayload());
      startBackgroundWatchdogs();

      if (config.autoStart) {
        engine.state.isRunning = true;
        scheduler.start();
        emitActivity('SYSTEM', 'START', 'Auto Start', 'ALL', 'Đã tự động kích hoạt luồng mô phỏng theo cấu hình AUTO_START=true');
      }
    } catch (err) {
      console.error(`[Bot Simulator v2.0 Clean] Bootstrap error:`, err?.message || err);
    }
  });
}

module.exports = {
  app,
  server,
  engine,
  scheduler,
  store,
  recentLogs,
  startBackgroundWatchdogs,
  stopBackgroundWatchdogs,
  gracefulShutdown,
};
