// Điểm khởi chạy của Bot Simulator & Live Traffic Command Center v2.0 Clean
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const config = require('./config');
const ApiClient = require('./src/api-client');
const { BotEngine } = require('./src/bot-engine');
const Scheduler = require('./src/scheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const apiClient = new ApiClient(config.gatewayUrl);
const engine = new BotEngine(apiClient, config);
const scheduler = new Scheduler(engine, config);

// Bộ đệm 250 activity logs gần nhất để phục vụ client mới kết nối
const recentLogs = [];
const MAX_SAVED_LOGS = 250;

function emitActivity(role, badge, actorName, branchId, actionText, amount = null, status = 'SUCCESS') {
  const logItem = {
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

  recentLogs.unshift(logItem);
  if (recentLogs.length > MAX_SAVED_LOGS) {
    recentLogs.pop();
  }

  io.emit('bot:activity', logItem);
  io.emit('bot:stats', engine.getPublicState());
}

engine.setEmitter(emitActivity);

// ============================================================================
// REST API ĐIỀU KHIỂN & THỐNG KÊ
// ============================================================================
app.get('/api/sim/state', (req, res) => {
  res.json(engine.getPublicState());
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
  });
});

app.get('/api/sim/export-logs', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="bot_simulator_logs.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    stats: engine.state.stats,
    logsCount: recentLogs.length,
    logs: recentLogs,
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
  engine.resetStats();
  res.json(engine.getPublicState());
});

app.post('/api/sim/trigger/:action', async (req, res) => {
  const { action } = req.params;

  try {
    if (action === 'checkin-all') {
      for (const p of Object.values(engine.state.tokens.pharmacists)) {
        p.isCheckedIn = false;
        p.isCompleted = false;
      }
      await engine.simulatePharmacistPOSAndAttendance();
    } else if (action === 'handover-all') {
      for (const p of Object.values(engine.state.tokens.pharmacists)) {
        if (p.isCheckedIn && !p.isCompleted) {
          await engine.triggerHandoverAndCheckout(p);
        }
      }
    } else if (action === 'schedule-week') {
      await engine.triggerWeeklySchedule();
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

  io.close(() => {
    server.close(() => {
      console.log('[Bot Simulator v2.0 Clean] Đã giải phóng toàn bộ kết nối HTTP và Socket.IO.');
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
  recentLogs,
  startBackgroundWatchdogs,
  stopBackgroundWatchdogs,
  gracefulShutdown,
};
