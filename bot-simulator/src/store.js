// Tầng lưu trữ bền vững SQLite (node:sqlite) cho Bản đồ 2D & Lịch sử Digital Twin
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

class SimulatorStore {
  constructor(customDbPath = null) {
    const isTest = process.env.NODE_ENV === 'test' || process.execArgv.includes('--test');
    this.dbPath = customDbPath || process.env.SIMULATOR_DB_PATH || (
      isTest ? ':memory:' : path.join(__dirname, '../data/simulator.db')
    );

    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath);
    this.insertCounter = 0;
    this.customerSlotCursor = {};
    this._initSchema();
    this._prepareStatements();
  }

  _initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        role TEXT NOT NULL,
        badge TEXT NOT NULL,
        seat_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        action_text TEXT NOT NULL,
        amount REAL,
        status TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_seat_id ON events(seat_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_branch_id ON events(branch_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_actor_name ON events(actor_name, created_at DESC);

      CREATE TABLE IF NOT EXISTS seat_states (
        seat_id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        seat_type TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        persona TEXT,
        last_badge TEXT,
        last_action TEXT,
        last_status TEXT,
        last_amount REAL,
        last_timestamp TEXT,
        last_active_at INTEGER DEFAULT 0,
        total_events INTEGER DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        total_revenue REAL DEFAULT 0,
        total_warns INTEGER DEFAULT 0,
        punctual_checkins INTEGER DEFAULT 0,
        late_checkins INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  _prepareStatements() {
    this.stmtInsertEvent = this.db.prepare(`
      INSERT OR REPLACE INTO events (
        id, created_at, timestamp, role, badge, seat_id, actor_name, branch_id, action_text, amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtUpsertSeat = this.db.prepare(`
      INSERT INTO seat_states (
        seat_id, branch_id, seat_type, actor_name, persona,
        last_badge, last_action, last_status, last_amount, last_timestamp, last_active_at,
        total_events, total_orders, total_revenue, total_warns, punctual_checkins, late_checkins
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(seat_id) DO UPDATE SET
        branch_id = excluded.branch_id,
        seat_type = excluded.seat_type,
        actor_name = excluded.actor_name,
        persona = COALESCE(excluded.persona, seat_states.persona),
        last_badge = excluded.last_badge,
        last_action = excluded.last_action,
        last_status = excluded.last_status,
        last_amount = excluded.last_amount,
        last_timestamp = excluded.last_timestamp,
        last_active_at = excluded.last_active_at,
        total_events = seat_states.total_events + excluded.total_events,
        total_orders = seat_states.total_orders + excluded.total_orders,
        total_revenue = seat_states.total_revenue + excluded.total_revenue,
        total_warns = seat_states.total_warns + excluded.total_warns,
        punctual_checkins = seat_states.punctual_checkins + excluded.punctual_checkins,
        late_checkins = seat_states.late_checkins + excluded.late_checkins
    `);

    this.stmtInitSeatIfMissing = this.db.prepare(`
      INSERT INTO seat_states (
        seat_id, branch_id, seat_type, actor_name, persona,
        last_badge, last_action, last_status, last_amount, last_timestamp, last_active_at
      ) VALUES (?, ?, ?, ?, ?, 'IDLE', 'Đang chờ ca / Chưa phát sinh giao dịch', 'SUCCESS', NULL, '--:--:--', 0)
      ON CONFLICT(seat_id) DO UPDATE SET
        actor_name = excluded.actor_name,
        persona = COALESCE(excluded.persona, seat_states.persona)
    `);

    this.stmtGetKv = this.db.prepare(`SELECT value FROM kv_store WHERE key = ?`);
    this.stmtSetKv = this.db.prepare(`
      INSERT INTO kv_store (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    this.stmtGetRecentEvents = this.db.prepare(`
      SELECT
        id, created_at AS createdAt, timestamp, role, badge,
        seat_id AS seatId, actor_name AS actorName, branch_id AS branchId,
        action_text AS actionText, amount, status
      FROM events
      ORDER BY created_at DESC
      LIMIT ?
    `);

    this.stmtGetAllSeats = this.db.prepare(`
      SELECT
        seat_id AS seatId, branch_id AS branchId, seat_type AS seatType,
        actor_name AS actorName, persona, last_badge AS lastBadge,
        last_action AS lastAction, last_status AS lastStatus,
        last_amount AS lastAmount, last_timestamp AS lastTimestamp,
        last_active_at AS lastActiveAt, total_events AS totalEvents,
        total_orders AS totalOrders, total_revenue AS totalRevenue,
        total_warns AS totalWarns, punctual_checkins AS punctualCheckins,
        late_checkins AS lateCheckins
      FROM seat_states
      ORDER BY branch_id ASC, seat_type ASC, seat_id ASC
    `);

    this.stmtGetSeatById = this.db.prepare(`
      SELECT
        seat_id AS seatId, branch_id AS branchId, seat_type AS seatType,
        actor_name AS actorName, persona, last_badge AS lastBadge,
        last_action AS lastAction, last_status AS lastStatus,
        last_amount AS lastAmount, last_timestamp AS lastTimestamp,
        last_active_at AS lastActiveAt, total_events AS totalEvents,
        total_orders AS totalOrders, total_revenue AS totalRevenue,
        total_warns AS totalWarns, punctual_checkins AS punctualCheckins,
        late_checkins AS lateCheckins
      FROM seat_states
      WHERE seat_id = ?
    `);

    this.stmtPruneEvents = this.db.prepare(`
      DELETE FROM events
      WHERE id NOT IN (
        SELECT id FROM events ORDER BY created_at DESC LIMIT 40000
      )
    `);
  }

  // Định danh ghế ngồi cố định theo từng khoang chi nhánh / kho tổng để không bao giờ trộn lẫn CN1 với CN2
  resolveSeatInfo(role, badge, actorName, branchId) {
    const cleanBranch = (branchId && branchId !== 'ONLINE' && branchId !== 'ALL')
      ? branchId
      : (role === 'WAREHOUSE' ? 'CENTRAL_WH' : 'BR-001');

    if (role === 'MANAGER') {
      return {
        seatId: `MGR:${cleanBranch}`,
        branchId: cleanBranch,
        seatType: 'MANAGER',
      };
    }

    if (role === 'PHARMACIST') {
      // Chuẩn hóa khóa ghế theo mã chi nhánh và tên dược sĩ
      const normName = String(actorName || 'Pharmacist').trim();
      return {
        seatId: `PHARM:${cleanBranch}:${normName}`,
        branchId: cleanBranch,
        seatType: 'PHARMACIST',
      };
    }

    if (role === 'WAREHOUSE') {
      const whStage = ['PR', 'PO', 'GRN', 'TRANSFER'].includes(badge) ? badge : 'MAIN';
      const stageLabels = {
        PR: 'Bàn Tiếp Nhận PR & Cảnh Báo Tồn',
        PO: 'Bàn Mua Hàng & Duyệt PO NCC',
        GRN: 'Bàn Kiểm Nghiệm GSP & Nhập Kho GRN',
        TRANSFER: 'Bàn Điều Phối Xuất Kho Chi Nhánh',
        MAIN: 'Thủ Kho Trung Tâm',
      };
      return {
        seatId: `WH:CENTRAL_WH:${whStage}`,
        branchId: 'CENTRAL_WH',
        seatType: 'WAREHOUSE',
        displayActorName: stageLabels[whStage] || actorName,
      };
    }

    if (role === 'CUSTOMER') {
      // Mỗi khoang chi nhánh có 4 ghế khách hàng giao dịch (1..4) xoay vòng
      const slotIdx = ((this.customerSlotCursor[cleanBranch] || 0) % 4) + 1;
      this.customerSlotCursor[cleanBranch] = slotIdx;
      return {
        seatId: `CUST:${cleanBranch}:${slotIdx}`,
        branchId: cleanBranch,
        seatType: 'CUSTOMER',
      };
    }

    return {
      seatId: 'SYS:ALL',
      branchId: 'ALL',
      seatType: 'SYSTEM',
    };
  }

  // Khởi tạo sẵn sơ đồ ghế ngồi cho 5 chi nhánh và Kho Tổng khi bootstrap
  seedInitialSeats(branches = [], managersMap = {}, pharmacistsMap = {}) {
    const validBranches = branches.length > 0
      ? branches
      : [
          { branchCode: 'BR-001', name: 'ABC Pharmacy Quận 1' },
          { branchCode: 'BR-002', name: 'ABC Pharmacy Quận 2' },
          { branchCode: 'BR-003', name: 'ABC Pharmacy Đà Nẵng' },
          { branchCode: 'BR-004', name: 'ABC Pharmacy Hà Nội' },
          { branchCode: 'BR-006', name: 'ABC Pharmacy Hội An' },
        ];

    for (const b of validBranches) {
      const code = b.branchCode;
      const mgr = managersMap[code];
      const mgrName = mgr?.user?.fullName || `Quản lý ${code}`;
      this.stmtInitSeatIfMissing.run(`MGR:${code}`, code, 'MANAGER', mgrName, 'MANAGER');

      for (let slot = 1; slot <= 4; slot++) {
        this.stmtInitSeatIfMissing.run(
          `CUST:${code}:${slot}`,
          code,
          'CUSTOMER',
          `Ghế Khách #${slot}`,
          'CUSTOMER'
        );
      }
    }

    for (const pharm of Object.values(pharmacistsMap)) {
      const code = pharm.branchId || 'BR-001';
      const pName = String(pharm.user?.fullName || 'Dược sĩ').trim();
      const seatId = `PHARM:${code}:${pName}`;
      this.stmtInitSeatIfMissing.run(seatId, code, 'PHARMACIST', pName, pharm.persona || 'BALANCED');
    }

    // 4 bàn điều hành tại Kho Tổng
    const whDesks = [
      { id: 'WH:CENTRAL_WH:PR', name: 'Bàn Tiếp Nhận PR & Cảnh Báo Tồn' },
      { id: 'WH:CENTRAL_WH:PO', name: 'Bàn Mua Hàng & Duyệt PO NCC' },
      { id: 'WH:CENTRAL_WH:GRN', name: 'Bàn Kiểm Nghiệm GSP & Nhập Kho GRN' },
      { id: 'WH:CENTRAL_WH:TRANSFER', name: 'Bàn Điều Phối Xuất Kho Chi Nhánh' },
    ];
    for (const desk of whDesks) {
      this.stmtInitSeatIfMissing.run(desk.id, 'CENTRAL_WH', 'WAREHOUSE', desk.name, 'WAREHOUSE');
    }
  }

  recordActivity(logItem, persona = null) {
    const now = Date.now();
    const { seatId, branchId, seatType, displayActorName } = this.resolveSeatInfo(
      logItem.role,
      logItem.badge,
      logItem.actorName,
      logItem.branchId
    );

    const enrichedItem = {
      ...logItem,
      seatId,
      branchId: logItem.branchId === 'ONLINE' ? branchId : (logItem.branchId || branchId),
      createdAt: now,
    };

    try {
      this.stmtInsertEvent.run(
        enrichedItem.id,
        now,
        enrichedItem.timestamp,
        enrichedItem.role,
        enrichedItem.badge,
        seatId,
        enrichedItem.actorName,
        enrichedItem.branchId,
        enrichedItem.actionText,
        enrichedItem.amount !== undefined && enrichedItem.amount !== null ? Number(enrichedItem.amount) : null,
        enrichedItem.status || 'SUCCESS'
      );

      if (seatType !== 'SYSTEM') {
        const isOrder = (enrichedItem.badge === 'POS' || enrichedItem.badge === 'ORDER') && enrichedItem.status === 'SUCCESS';
        const isWarn = enrichedItem.status === 'WARN' ? 1 : 0;
        const isAttendance = enrichedItem.badge === 'ATTENDANCE';
        const isLate = isAttendance && (enrichedItem.status === 'WARN' || enrichedItem.actionText.includes('ĐI MUỘN'));
        const isPunctual = isAttendance && !isLate;

        this.stmtUpsertSeat.run(
          seatId,
          branchId,
          seatType,
          displayActorName || enrichedItem.actorName,
          persona,
          enrichedItem.badge,
          enrichedItem.actionText,
          enrichedItem.status || 'SUCCESS',
          enrichedItem.amount !== undefined && enrichedItem.amount !== null ? Number(enrichedItem.amount) : null,
          enrichedItem.timestamp,
          now,
          1,
          isOrder ? 1 : 0,
          isOrder && enrichedItem.amount ? Number(enrichedItem.amount) : 0,
          isWarn,
          isPunctual ? 1 : 0,
          isLate ? 1 : 0
        );
      }

      this.insertCounter++;
      if (this.insertCounter >= 500) {
        this.insertCounter = 0;
        this.stmtPruneEvents.run();
      }
    } catch (err) {
      console.error('[SimulatorStore] Lỗi ghi SQLite:', err?.message || err);
    }

    return enrichedItem;
  }

  saveStats(statsObj) {
    try {
      this.stmtSetKv.run('runtime_stats', JSON.stringify(statsObj));
    } catch {}
  }

  loadStats() {
    try {
      const row = this.stmtGetKv.get('runtime_stats');
      if (row && row.value) {
        return JSON.parse(row.value);
      }
    } catch {}
    return null;
  }

  getRecentEvents(limit = 200) {
    try {
      return this.stmtGetRecentEvents.all(Math.min(Math.max(Number(limit) || 100, 1), 1000));
    } catch {
      return [];
    }
  }

  getAllSeats() {
    try {
      return this.stmtGetAllSeats.all();
    } catch {
      return [];
    }
  }

  getSeatDetail(seatId, limit = 80) {
    try {
      const seat = this.stmtGetSeatById.get(seatId) || null;
      const historyStmt = this.db.prepare(`
        SELECT
          id, created_at AS createdAt, timestamp, role, badge,
          seat_id AS seatId, actor_name AS actorName, branch_id AS branchId,
          action_text AS actionText, amount, status
        FROM events
        WHERE seat_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      const events = historyStmt.all(seatId, Math.min(Number(limit) || 80, 500));
      return { seat, events };
    } catch {
      return { seat: null, events: [] };
    }
  }

  queryHistory({ seatId, branchId, role, actorName, limit = 100 } = {}) {
    const clauses = [];
    const params = [];

    if (seatId) {
      clauses.push('seat_id = ?');
      params.push(seatId);
    }
    if (branchId && branchId !== 'ALL') {
      clauses.push('branch_id = ?');
      params.push(branchId);
    }
    if (role && role !== 'ALL') {
      clauses.push('role = ?');
      params.push(role);
    }
    if (actorName) {
      clauses.push('actor_name LIKE ?');
      params.push(`%${actorName}%`);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

    try {
      const sql = `
        SELECT
          id, created_at AS createdAt, timestamp, role, badge,
          seat_id AS seatId, actor_name AS actorName, branch_id AS branchId,
          action_text AS actionText, amount, status
        FROM events
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ?
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(...params, safeLimit);
    } catch {
      return [];
    }
  }

  getBranchSummaries() {
    try {
      const stmt = this.db.prepare(`
        SELECT
          branch_id AS branchId,
          SUM(total_events) AS totalEvents,
          SUM(total_orders) AS totalOrders,
          SUM(total_revenue) AS totalRevenue,
          SUM(total_warns) AS totalWarns,
          SUM(punctual_checkins) AS punctualCheckins,
          SUM(late_checkins) AS lateCheckins
        FROM seat_states
        GROUP BY branch_id
      `);
      return stmt.all();
    } catch {
      return [];
    }
  }

  resetAll() {
    try {
      this.db.exec(`
        DELETE FROM events;
        DELETE FROM seat_states;
        DELETE FROM kv_store;
      `);
    } catch {}
  }

  close() {
    try {
      if (this.db) {
        this.db.close();
      }
    } catch {}
  }
}

module.exports = SimulatorStore;
