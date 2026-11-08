// Bộ điều phối 4 nhóm Bot thực chiến: Khách hàng, Dược sĩ POS, Quản lý cơ sở & Thủ kho tổng
const {
  CUSTOMER_NAMES,
  COD_DELIVERY_ADDRESSES,
  SEARCH_KEYWORDS_WEIGHTED,
  POSITIVE_REVIEWS_POOL,
  NEGATIVE_REVIEWS_POOL,
  CHECKIN_NOTES,
  MANAGER_RESOLVE_ACTIONS,
  SUPPLIERS_POOL,
  PR_REASON_NOTES,
  GRN_RECEIPT_NOTES,
  STOCK_TRANSFER_NOTES,
} = require('./data-pools');

function jitterGps(lat, lng) {
  // Độ lệch +-15 đến 30 mét, thỏa mãn công thức Haversine bán kính 200m-500m
  const deltaLat = (Math.random() - 0.5) * 0.0003;
  const deltaLng = (Math.random() - 0.5) * 0.0003;
  return {
    latitude: Number((lat + deltaLat).toFixed(6)),
    longitude: Number((lng + deltaLng).toFixed(6)),
  };
}

function randomPick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(items, weightFn) {
  if (!items || items.length === 0) return null;
  const totalWeight = items.reduce((sum, it) => sum + (weightFn(it) || 1), 0);
  let random = Math.random() * totalWeight;
  for (const it of items) {
    const w = weightFn(it) || 1;
    if (random <= w) return it;
    random -= w;
  }
  return items[items.length - 1];
}

function generateBatchNo(prefix = 'LOT') {
  const d = new Date();
  const yymm = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yymm}-${rand}`;
}

// Lấy ngày hiện tại theo múi giờ Việt Nam (UTC+7) định dạng YYYY-MM-DD
function getVietnamTodayStr(d = new Date()) {
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

// Lấy ngày Thứ Hai đầu tuần (YYYY-MM-DD) chứa ngày hiện tại theo chuẩn lịch tuần
function getWeekMondayStr(d = new Date()) {
  const todayStr = typeof d === 'string' ? d.slice(0, 10) : getVietnamTodayStr(d);
  const [y, m, day] = todayStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, day));
  const dow = utc.getUTCDay(); // 0: Chủ nhật, 1: Thứ 2, ..., 6: Thứ 7
  const diff = dow === 0 ? -6 : 1 - dow;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

function addDaysStr(dateStr, days) {
  const [y, m, day] = dateStr.slice(0, 10).split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function normalizeIsoDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function parseTimeMin(tStr, fallback = '07:00') {
  const parts = String(tStr || fallback).split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

/**
 * Đánh giá khung giờ thực tế của ca trực (Hỗ trợ cả ca ban ngày lẫn ca vắt qua nửa đêm 00:00 như 22:00 - 06:00)
 */
function evaluateShiftWindow(shiftStart, shiftEnd, currentMinutes, assignmentDateStr, todayStr, yesterdayStr) {
  const startMin = parseTimeMin(shiftStart, '07:00');
  const endMin = parseTimeMin(shiftEnd, '15:00');
  const isOvernight = endMin <= startMin;

  if (!isOvernight) {
    if (assignmentDateStr !== todayStr) {
      return {
        isActiveWindow: false,
        isShiftEnded: assignmentDateStr < todayStr,
        isFutureShift: assignmentDateStr > todayStr,
        isLate: false,
        isOvernight: false,
        startMin,
        endMin,
      };
    }
    // Cho phép dược sĩ đến check-in sớm tối đa 30 phút trước giờ mở ca
    const isFutureShift = currentMinutes < startMin - 30;
    const isShiftEnded = currentMinutes >= endMin;
    const isActiveWindow = !isFutureShift && !isShiftEnded;
    const isLate = currentMinutes > startMin + 15;
    return { isActiveWindow, isShiftEnded, isFutureShift, isLate, isOvernight: false, startMin, endMin };
  }

  // Ca vắt qua nửa đêm (VD: 22:00 ngày D -> 06:00 sáng ngày D+1)
  const effectiveEndMin = endMin + 1440;
  if (assignmentDateStr === todayStr) {
    const isFutureShift = currentMinutes < startMin - 30;
    const isShiftEnded = false; // Kết thúc vào sáng ngày hôm sau (D+1)
    const isActiveWindow = !isFutureShift;
    const isLate = currentMinutes > startMin + 15;
    return { isActiveWindow, isShiftEnded, isFutureShift, isLate, isOvernight: true, startMin, endMin };
  }

  if (assignmentDateStr === yesterdayStr) {
    const effectiveCurrent = currentMinutes + 1440;
    const isFutureShift = false;
    const isShiftEnded = effectiveCurrent >= effectiveEndMin;
    const isActiveWindow = effectiveCurrent < effectiveEndMin;
    const isLate = effectiveCurrent > startMin + 15;
    return { isActiveWindow, isShiftEnded, isFutureShift, isLate, isOvernight: true, startMin, endMin };
  }

  return {
    isActiveWindow: false,
    isShiftEnded: assignmentDateStr < todayStr,
    isFutureShift: assignmentDateStr > todayStr,
    isLate: false,
    isOvernight: true,
    startMin,
    endMin,
  };
}

// Thiết lập hồ sơ phân tầng lưu lượng, chất lượng phục vụ và tỷ lệ xử lý SLA theo từng chi nhánh
const BRANCH_PROFILES = {
  'BR-001': { trafficWeight: 35, negativeReviewRate: 0.04, slaResolveRate: 0.95 },
  'BR-002': { trafficWeight: 25, negativeReviewRate: 0.08, slaResolveRate: 0.90 },
  'BR-004': { trafficWeight: 20, negativeReviewRate: 0.16, slaResolveRate: 0.75 },
  'BR-003': { trafficWeight: 12, negativeReviewRate: 0.58, slaResolveRate: 0.35 },
  'BR-006': { trafficWeight: 8,  negativeReviewRate: 0.10, slaResolveRate: 0.85 },
};

class BotEngine {
  constructor(apiClient, config) {
    this.apiClient = apiClient;
    this.config = config;

    this.state = {
      isRunning: false,
      isGatewayOnline: true,
      tokenRefreshCount: 0,
      speedMultiplier: 1,
      currentScenario: 'NORMAL', // NORMAL | RUSH_HOUR | SUPPLY_CHAIN | NIGHT_SHIFT
      stats: {
        activeViewers: 0,
        totalSearches: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalReviews: 0,
        totalCheckIns: 0,
        totalPRs: 0,
        totalPOs: 0,
        totalGRNs: 0,
        totalStockTransfers: 0,
      },
      tokens: {
        admin: null,
        warehouse: null,
        managers: {},    // branchCode -> { token, user }
        pharmacists: {}, // employeeId -> { token, user, persona, isCheckedIn, scheduledToday, assignedShift, branchId, branchLat, branchLng, shiftSchedule }
        customers: [],   // [{ token, user }]
      },
      branches: [...config.defaultBranches],
      branchSchedules: {}, // branchCode -> { weekStart, status, shifts, assignments }
      lastScheduleSyncDate: null,
      suppliers: [...SUPPLIERS_POOL],
      otcMedicines: [],
      allMedicines: [],
      heroMedicines: [],        // Nhóm thuốc bán chạy vượt trội (70% doanh số)
      problematicMedicines: [], // Nhóm thuốc hay bị phản ánh bao bì/giao trễ để kiểm thử SLA
      pendingReviewQueue: [],
      pendingPrQueue: [],
      pendingPoQueue: [],
      urgentRestockQueue: [],
      inFlightRestockKeys: new Set(),
    };

    this._scheduleSyncPromise = null;
    this._isWarehouseRunning = false;
    this.emitActivity = () => {};

    // Đăng ký hook tự động đăng nhập lại khi gặp 401 từ API Gateway
    if (this.apiClient) {
      this.apiClient.onUnauthorized = (token, roleContext) => this.handleUnauthorized(token, roleContext);
    }
  }

  setEmitter(emitFn) {
    this.emitActivity = emitFn;
  }

  getBranchProfile(branchCode) {
    return BRANCH_PROFILES[branchCode] || { trafficWeight: 15, negativeReviewRate: 0.15, slaResolveRate: 0.80 };
  }

  pickBranchWeighted() {
    if (!this.state.branches || this.state.branches.length === 0) return null;
    return pickWeighted(
      this.state.branches,
      b => this.getBranchProfile(b.branchCode).trafficWeight
    );
  }

  isOutOfStockError(err) {
    if (!err) return false;
    if (err.status === 409) return true;
    const msg = String(err.message || '').toLowerCase();
    return (
      msg.includes('không có tồn kho') ||
      msg.includes('không đủ tồn kho') ||
      msg.includes('khong co ton kho') ||
      msg.includes('khong du ton kho') ||
      msg.includes('out of stock') ||
      msg.includes('hết hàng') ||
      msg.includes('het hang')
    );
  }

  async triggerUrgentReplenishment(med, branchId = 'CENTRAL_WH', reason = '') {
    if (!med) return false;
    const medId = String(med.id || med._id || '');
    if (!medId) return false;

    const targetBranch = branchId || 'CENTRAL_WH';
    const dedupKey = `${targetBranch}:${medId}`;
    if (this.state.inFlightRestockKeys.has(dedupKey)) return false;
    const alreadyQueued = this.state.urgentRestockQueue.some(
      it => String(it.medicineId) === medId && it.branchId === targetBranch
    );
    if (alreadyQueued) return false;

    if (this.state.urgentRestockQueue.length >= 50) {
      this.state.urgentRestockQueue.pop();
    }
    this.state.urgentRestockQueue.unshift({
      medicineId: medId,
      medicineName: med.name || 'Thuốc thiết yếu',
      unit: med.unit || 'Hộp',
      price: med.price || 45000,
      branchId: targetBranch,
      reason: reason || `Cạn kiệt tồn kho tại ${targetBranch}, yêu cầu nhập hàng khẩn cấp`,
    });

    const isCentral = targetBranch === 'CENTRAL_WH';
    const mgr = !isCentral ? this.state.tokens.managers[targetBranch] : null;
    this.emitActivity(
      isCentral ? 'WAREHOUSE' : 'MANAGER',
      'PR',
      isCentral ? 'Thủ kho Trung tâm' : (mgr?.user?.fullName || `Quản lý ${targetBranch}`),
      targetBranch,
      `Phát hiện hết thuốc "${med.name}" tại ${targetBranch}! Tự động kích hoạt quy trình nhập hàng bổ sung khẩn cấp.`,
      null,
      'WARN'
    );

    this.state.inFlightRestockKeys.add(dedupKey);
    try {
      await this.simulateWarehouseOperations(true);
      return true;
    } finally {
      this.state.inFlightRestockKeys.delete(dedupKey);
    }
  }

  getPublicState() {
    return {
      isRunning: this.state.isRunning,
      isGatewayOnline: this.state.isGatewayOnline,
      tokenRefreshCount: this.state.tokenRefreshCount || 0,
      speedMultiplier: this.state.speedMultiplier,
      currentScenario: this.state.currentScenario,
      stats: this.state.stats,
      branches: this.state.branches,
      branchProfiles: BRANCH_PROFILES,
      managers: Object.entries(this.state.tokens.managers).map(([branchCode, m]) => ({
        branchId: branchCode,
        name: m.user?.fullName || `Quản lý ${branchCode}`,
      })),
      pharmacists: Object.entries(this.state.tokens.pharmacists).map(([key, p]) => ({
        id: p.user?.id || p.user?._id || p.employeeId || key,
        name: p.user?.fullName || 'Dược sĩ',
        branchId: p.branchId,
        persona: p.persona,
        isCheckedIn: Boolean(p.isCheckedIn),
        scheduledToday: Boolean(p.scheduledToday),
        assignedShiftName: p.assignedShift?.shiftName || null,
        assignedShiftTime: p.assignedShift
          ? `${p.assignedShift.shiftStart || '07:00'}-${p.assignedShift.shiftEnd || '15:00'}`
          : null,
      })),
      hasWarehouseAuth: Boolean(this.state.tokens.warehouse),
      medicinesCount: this.state.allMedicines.length,
      otcCount: this.state.otcMedicines.length,
      heroCount: this.state.heroMedicines.length,
      pendingPrCount: this.state.pendingPrQueue.length,
      pendingPoCount: this.state.pendingPoQueue.length,
      urgentRestockCount: this.state.urgentRestockQueue.length,
    };
  }

  resetStats() {
    this.state.stats = {
      activeViewers: this.state.isRunning ? 50 : 0,
      totalSearches: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalReviews: 0,
      totalCheckIns: 0,
      totalPRs: 0,
      totalPOs: 0,
      totalGRNs: 0,
      totalStockTransfers: 0,
    };
    this.emitActivity('SYSTEM', 'RESET', 'Command Center', 'ALL', 'Đã đặt lại toàn bộ chỉ số thống kê KPI về 0');
  }

  setScenario(scenarioName) {
    const valid = ['NORMAL', 'RUSH_HOUR', 'SUPPLY_CHAIN', 'NIGHT_SHIFT'];
    if (!valid.includes(scenarioName)) return false;
    this.state.currentScenario = scenarioName;
    this.emitActivity('SYSTEM', 'SCENARIO', 'Admin Control', 'ALL', `Đã kích hoạt kịch bản mô phỏng: ${scenarioName}`);
    return true;
  }

  // =========================================================================
  // AUTH GUARDIAN: TỰ ĐỘNG ĐĂNG NHẬP LẠI & LÀM MỚI TOKEN (CHỐNG LỖI 401 KHI CHẠY 24/7)
  // =========================================================================
  async handleUnauthorized(oldToken, roleContext = null) {
    if (!oldToken) return null;

    // 1. Admin
    if (this.state.tokens.admin === oldToken || roleContext === 'admin') {
      try {
        const cred = this.state.adminCreds || this.config.credentials.admin;
        const auth = await this.apiClient.post('/api/auth/login', cred, null, {}, { retries: 0, _isRetry401: true });
        if (auth?.access_token) {
          this.state.tokens.admin = auth.access_token;
          this.state.tokenRefreshCount = (this.state.tokenRefreshCount || 0) + 1;
          return auth.access_token;
        }
      } catch {}
    }

    // 2. Thủ kho
    if (this.state.tokens.warehouse === oldToken || roleContext === 'warehouse') {
      try {
        const cred = this.state.warehouseCreds || this.config.credentials.warehouse;
        const auth = await this.apiClient.post('/api/auth/login', cred, null, {}, { retries: 0, _isRetry401: true });
        if (auth?.access_token) {
          this.state.tokens.warehouse = auth.access_token;
          this.state.tokenRefreshCount = (this.state.tokenRefreshCount || 0) + 1;
          return auth.access_token;
        }
      } catch {}
    }

    // 3. Quản lý chi nhánh
    for (const [branchCode, mgr] of Object.entries(this.state.tokens.managers)) {
      if (mgr.token === oldToken || roleContext === `manager:${branchCode}`) {
        try {
          if (mgr.creds) {
            const auth = await this.apiClient.post('/api/auth/login', mgr.creds, null, {}, { retries: 0, _isRetry401: true });
            if (auth?.access_token) {
              mgr.token = auth.access_token;
              this.state.tokenRefreshCount = (this.state.tokenRefreshCount || 0) + 1;
              return auth.access_token;
            }
          }
        } catch {}
      }
    }

    // 4. Dược sĩ
    for (const [userId, pharm] of Object.entries(this.state.tokens.pharmacists)) {
      if (pharm.token === oldToken || roleContext === `pharmacist:${userId}`) {
        try {
          if (pharm.creds) {
            const auth = await this.apiClient.post('/api/auth/login', pharm.creds, null, {}, { retries: 0, _isRetry401: true });
            if (auth?.access_token) {
              pharm.token = auth.access_token;
              this.state.tokenRefreshCount = (this.state.tokenRefreshCount || 0) + 1;
              return auth.access_token;
            }
          }
        } catch {}
      }
    }

    // 5. Khách hàng
    for (const cust of this.state.tokens.customers) {
      if (cust.access_token === oldToken || cust.token === oldToken) {
        try {
          if (cust.creds) {
            const auth = await this.apiClient.post('/api/auth/login', cust.creds, null, {}, { retries: 0, _isRetry401: true });
            if (auth?.access_token) {
              cust.access_token = auth.access_token;
              cust.token = auth.access_token;
              this.state.tokenRefreshCount = (this.state.tokenRefreshCount || 0) + 1;
              return auth.access_token;
            }
          }
        } catch {}
      }
    }

    return null;
  }

  async refreshAllTokens() {
    let renewed = 0;
    if (this.state.tokens.admin) {
      const t = await this.handleUnauthorized(this.state.tokens.admin, 'admin').catch(() => null);
      if (t) renewed++;
    }
    if (this.state.tokens.warehouse && this.state.tokens.warehouse !== this.state.tokens.admin) {
      const t = await this.handleUnauthorized(this.state.tokens.warehouse, 'warehouse').catch(() => null);
      if (t) renewed++;
    }
    for (const mgr of Object.values(this.state.tokens.managers)) {
      if (mgr.creds) {
        const t = await this.handleUnauthorized(mgr.token).catch(() => null);
        if (t) renewed++;
      }
    }
    for (const pharm of Object.values(this.state.tokens.pharmacists)) {
      if (pharm.creds) {
        const t = await this.handleUnauthorized(pharm.token).catch(() => null);
        if (t) renewed++;
      }
    }
    if (renewed > 0) {
      this.emitActivity('SYSTEM', 'AUTH', 'Auth Guardian', 'ALL', `Đã tự động làm mới ${renewed} access tokens phục vụ vận hành 24/7.`);
    }
  }

  // =========================================================================
  // BOOTSTRAP: NẠP DỮ LIỆU & PHÂN LOẠI SẢN PHẨM / NHÂN SỰ CÓ THIÊN VỊ
  // =========================================================================
  async bootstrap() {
    this.emitActivity('SYSTEM', 'INIT', 'Bot Engine', 'ALL', 'Đang kết nối API Gateway để khởi tạo hệ thống...');

    // 1. Nạp danh mục thuốc từ API
    try {
      const medRes = await this.apiClient.get('/api/medicines?page=1&limit=250&directDb=true');
      const meds = medRes?.data || (Array.isArray(medRes) ? medRes : []);
      this.state.allMedicines = meds.filter(m => (m.stock ?? 0) > 0 && (m.price ?? 0) > 0);
      if (this.state.allMedicines.length === 0) {
        this.state.allMedicines = meds.filter(m => (m.price ?? 0) > 0);
      }

      this.state.otcMedicines = this.state.allMedicines.filter(
        m => m.prescription_status !== 1 &&
             !['PRESCRIPTION', 'PRESCRIPTION_ANTIBIOTIC'].includes(String(m.drug_classification || '').toUpperCase())
      );
      if (this.state.otcMedicines.length === 0) {
        this.state.otcMedicines = this.state.allMedicines;
      }

      // 2. Thiết lập thiên vị sản phẩm (Hero vs Problematic - tách bạch hoàn toàn, không giao nhau)
      // Top 30% đầu tiên (hoặc thuốc hạ sốt/vitamin/ho) trở thành Hero Products (Best-seller)
      this.state.heroMedicines = this.state.otcMedicines.filter(m => {
        const name = (m.name || '').toLowerCase();
        return name.includes('panadol') || name.includes('vitamin') || name.includes('prospan') ||
               name.includes('hapacol') || name.includes('efferalgan') || name.includes('oresol');
      });
      if (this.state.heroMedicines.length === 0 && this.state.otcMedicines.length > 0) {
        this.state.heroMedicines = this.state.otcMedicines.slice(0, Math.max(1, Math.floor(this.state.otcMedicines.length * 0.3)));
      }

      // Chỉ chọn Problematic từ tập thuốc OTC KHÔNG thuộc nhóm Hero để tránh kéo tụt sao của Best-seller
      const heroIdSet = new Set(this.state.heroMedicines.map(m => String(m.id || m._id)));
      const nonHeroOtc = this.state.otcMedicines.filter(m => !heroIdSet.has(String(m.id || m._id)));
      const problematicSource = nonHeroOtc.length > 0 ? nonHeroOtc : [];
      this.state.problematicMedicines = problematicSource.slice(-Math.max(1, Math.floor(problematicSource.length * 0.2)));

      this.emitActivity(
        'SYSTEM',
        'INIT',
        'Bot Engine',
        'ALL',
        `Đã nạp ${this.state.allMedicines.length} mặt hàng (${this.state.otcMedicines.length} OTC, ${this.state.heroMedicines.length} Hero best-seller).`
      );
    } catch (err) {
      this.emitActivity('SYSTEM', 'WARN', 'Bot Engine', 'ALL', `Không tải được danh mục thuốc: ${err.message}`);
    }

    // 2. Đăng nhập Admin
    try {
      const adminAuth = await this.apiClient.post('/api/auth/login', this.config.credentials.admin);
      this.state.tokens.admin = adminAuth.access_token;
      this.state.adminCreds = { ...this.config.credentials.admin };
    } catch {
      try {
        const altAdmin = await this.apiClient.post('/api/auth/login', {
          email: 'admin@gmail.com',
          password: 'Password123@',
        });
        this.state.tokens.admin = altAdmin.access_token;
        this.state.adminCreds = { email: 'admin@gmail.com', password: 'Password123@' };
      } catch (err) {
        this.emitActivity('SYSTEM', 'WARN', 'Bot Engine', 'ALL', `Đăng nhập Admin thất bại: ${err.message}`);
      }
    }

    // 3. Đăng nhập Thủ kho
    try {
      const whAuth = await this.apiClient.post('/api/auth/login', this.config.credentials.warehouse);
      this.state.tokens.warehouse = whAuth.access_token;
      this.state.warehouseCreds = { ...this.config.credentials.warehouse };
    } catch {
      this.state.tokens.warehouse = this.state.tokens.admin;
      this.state.warehouseCreds = this.state.adminCreds;
    }

    // 4. Đồng bộ chi nhánh & Nhà cung cấp từ Gateway
    if (this.state.tokens.admin) {
      try {
        const dbBranches = await this.apiClient.get('/api/branches', this.state.tokens.admin);
        if (Array.isArray(dbBranches) && dbBranches.length > 0) {
          this.state.branches = dbBranches.map(b => {
            const defaultMatch = this.config.defaultBranches.find(db => db.branchCode === b.branchCode);
            const hasDbCoords = Boolean(b.latitude && b.longitude);
            return {
              branchCode: b.branchCode || 'BR-001',
              name: b.name || `Chi nhánh ${b.branchCode}`,
              lat: b.latitude || defaultMatch?.lat || 10.7769,
              lng: b.longitude || defaultMatch?.lng || 106.7009,
              radius: b.checkInRadiusMeters || defaultMatch?.radius || 200,
              hasDbCoords,
              shiftSchedule: defaultMatch?.shiftSchedule || { morningStart: '07:00', morningEnd: '15:00', afternoonStart: '15:00', afternoonEnd: '23:00' },
            };
          });
        }

        // Chỉ khởi tạo tọa độ GPS mặc định cho những chi nhánh chưa được Quản lý cơ sở thiết lập tọa độ trên DB
        for (const br of this.state.branches) {
          if (!br.hasDbCoords) {
            await this.apiClient.patch(`/api/branches/${br.branchCode}/location`, {
              latitude: br.lat,
              longitude: br.lng,
              checkInRadiusMeters: br.radius || 250,
            }, this.state.tokens.admin).catch(() => {});
          }
        }
      } catch {}

      try {
        const suppRes = await this.apiClient.get('/api/suppliers', this.state.tokens.admin);
        if (Array.isArray(suppRes) && suppRes.length > 0) {
          this.state.suppliers = suppRes;
        }
      } catch {}
    }

    // 5. Đăng nhập Khách hàng (Kết hợp tài khoản mẫu và các tài khoản đã seed)
    const customerCreds = [
      this.config.credentials.customer,
      { email: 'cust001@abcpharmacy.vn', password: '123456' },
      { email: 'cust002@abcpharmacy.vn', password: '123456' },
      { email: 'cust003@abcpharmacy.vn', password: '123456' },
      { email: 'cust004@abcpharmacy.vn', password: '123456' },
      { email: 'cust005@abcpharmacy.vn', password: '123456' },
      { email: 'customer.bot1@bot.abcpharmacy.local', password: 'Password123@', fullName: CUSTOMER_NAMES[0], phone: '0918000101' },
      { email: 'customer.bot2@bot.abcpharmacy.local', password: 'Password123@', fullName: CUSTOMER_NAMES[1], phone: '0918000102' },
    ];

    for (const cred of customerCreds) {
      try {
        const res = await this.apiClient.post('/api/auth/login', {
          email: cred.email,
          password: cred.password,
        });
        this.state.tokens.customers.push({
          ...res,
          creds: { email: cred.email, password: cred.password },
        });
      } catch {
        if (cred.fullName) {
          try {
            const reg = await this.apiClient.post('/api/auth/register', {
              fullName: cred.fullName,
              email: cred.email,
              password: cred.password,
              phone: cred.phone || '0918000100',
            });
            this.state.tokens.customers.push({
              ...reg,
              creds: { email: cred.email, password: cred.password },
            });
          } catch {}
        }
      }
    }

    // 6. Đăng nhập Dược sĩ (3 dược sĩ/chi nhánh để luân phiên người có lịch trực hôm nay và người nghỉ lịch tuần)
    const seedPharms = [
      // Chi nhánh 1 (BR-001)
      { email: this.config.credentials.pharmacist.email, password: this.config.credentials.pharmacist.password, branchId: 'BR-001', persona: 'PUNCTUAL' },
      { email: 'staff.br001.02@abcpharmacy.vn', password: '123456', branchId: 'BR-001', persona: 'BALANCED' },
      { email: 'staff.br001.03@abcpharmacy.vn', password: '123456', branchId: 'BR-001', persona: 'CHRONIC_LATE' },
      // Chi nhánh 2 (BR-002)
      { email: 'pharmacist.cn2@vinapharmacy.com', password: '123456', branchId: 'BR-002', persona: 'PUNCTUAL' },
      { email: 'staff.br002.02@abcpharmacy.vn', password: '123456', branchId: 'BR-002', persona: 'BALANCED' },
      { email: 'staff.br002.03@abcpharmacy.vn', password: '123456', branchId: 'BR-002', persona: 'CHRONIC_LATE' },
      // Chi nhánh 3 (BR-003)
      { email: 'pharmacist.cn3@vinapharmacy.com', password: '123456', branchId: 'BR-003', persona: 'PUNCTUAL' },
      { email: 'staff.br003.02@abcpharmacy.vn', password: '123456', branchId: 'BR-003', persona: 'BALANCED' },
      { email: 'staff.br003.03@abcpharmacy.vn', password: '123456', branchId: 'BR-003', persona: 'CHRONIC_LATE' },
      // Chi nhánh 4 (BR-004)
      { email: 'pharmacist.cn4@vinapharmacy.com', password: '123456', branchId: 'BR-004', persona: 'PUNCTUAL' },
      { email: 'staff.br004.02@abcpharmacy.vn', password: '123456', branchId: 'BR-004', persona: 'BALANCED' },
      { email: 'staff.br004.03@abcpharmacy.vn', password: '123456', branchId: 'BR-004', persona: 'CHRONIC_LATE' },
      // Chi nhánh 6 (BR-006)
      { email: 'staff.br006.02@abcpharmacy.vn', password: '123456', branchId: 'BR-006', persona: 'PUNCTUAL' },
      { email: 'staff.br006.03@abcpharmacy.vn', password: '123456', branchId: 'BR-006', persona: 'BALANCED' },
      { email: 'staff.br006.04@abcpharmacy.vn', password: '123456', branchId: 'BR-006', persona: 'CHRONIC_LATE' },
    ];

    for (const p of seedPharms) {
      try {
        const auth = await this.apiClient.post('/api/auth/login', {
          email: p.email,
          password: p.password,
        });
        const userId = String(auth.user?.id || auth.user?._id);
        const branchCode = auth.user?.branchId || p.branchId || 'BR-001';
        const branchInfo = this.state.branches.find(b => b.branchCode === branchCode) || this.state.branches[0];

        this.state.tokens.pharmacists[userId] = {
          employeeId: userId,
          token: auth.access_token,
          user: auth.user,
          persona: p.persona,
          branchId: branchCode,
          branchLat: branchInfo?.lat || 10.7769,
          branchLng: branchInfo?.lng || 106.7009,
          shiftSchedule: branchInfo?.shiftSchedule || { morningStart: '07:00', morningEnd: '15:00' },
          isCheckedIn: false,
          isCompleted: false,
          inActiveShiftWindow: false,
          activeShiftKey: null,
          completedShiftKeys: new Set(),
          scheduledToday: false,
          assignedShift: null,
          creds: { email: p.email, password: p.password },
        };
      } catch {}
    }

    // 7. Đăng nhập Quản lý cơ sở cho tất cả 5 chi nhánh
    const seedManagers = [
      { email: 'staff.br001.01@abcpharmacy.vn', password: '123456', branchId: 'BR-001' },
      { email: 'staff.br002.01@abcpharmacy.vn', password: '123456', branchId: 'BR-002' },
      { email: 'staff.br003.01@abcpharmacy.vn', password: '123456', branchId: 'BR-003' },
      { email: 'staff.br004.01@abcpharmacy.vn', password: '123456', branchId: 'BR-004' },
      { email: 'staff.br006.01@abcpharmacy.vn', password: '123456', branchId: 'BR-006' },
      { email: this.config.credentials.manager.email, password: this.config.credentials.manager.password, branchId: 'BR-001' },
      { email: 'manager.cn2@vinapharmacy.com', password: '123456', branchId: 'BR-002' },
      { email: 'manager.cn3@vinapharmacy.com', password: '123456', branchId: 'BR-003' },
      { email: 'manager.cn4@vinapharmacy.com', password: '123456', branchId: 'BR-004' },
      { email: 'rim@vinapharmacy.com', password: '123456', branchId: 'BR-006' },
    ];

    for (const m of seedManagers) {
      try {
        const auth = await this.apiClient.post('/api/auth/login', {
          email: m.email,
          password: m.password,
        });
        const branchCode = auth.user?.branchId || m.branchId || 'BR-001';
        this.state.tokens.managers[branchCode] = {
          token: auth.access_token,
          user: auth.user,
          creds: { email: m.email, password: m.password },
        };
      } catch {}
    }

    // 8. Quản lý các chi nhánh tự động kiểm tra thiết lập Ca làm việc (hỗ trợ động 2 ca, 3 ca, ca đêm...) và Đăng lịch tuần hiện tại trước khi nhân viên vào ca
    await this.ensureAllBranchesScheduled().catch(() => {});

    // 9. Đồng bộ trạng thái Check-in / Check-out thực tế từ DB cho từng Dược sĩ khi khởi động lại Bot
    for (const pharm of Object.values(this.state.tokens.pharmacists)) {
      if (!pharm.token) continue;
      try {
        const myStatus = await this.apiClient.get('/api/hr/attendance/my-status', pharm.token).catch(() => null);
        if (myStatus) {
          pharm.isCheckedIn = Boolean(myStatus.isCheckedIn);
          pharm.isCompleted = Boolean(myStatus.isCompleted);
          if (myStatus.attendance?.date && myStatus.attendance?.shiftId) {
            const sKey = `${myStatus.attendance.date}_${myStatus.attendance.shiftId}`;
            if (myStatus.isCompleted) {
              pharm.completedShiftKeys.add(sKey);
            } else if (myStatus.isCheckedIn) {
              pharm.activeShiftKey = sKey;
            }
          }
        }
      } catch {}
    }

    const totalPharms = Object.keys(this.state.tokens.pharmacists).length;
    const scheduledPharmsCount = Object.values(this.state.tokens.pharmacists).filter(p => p.scheduledToday).length;
    const totalMgrs = Object.keys(this.state.tokens.managers).length;
    const totalCust = this.state.tokens.customers.length;

    this.emitActivity(
      'SYSTEM',
      'READY',
      'Bot Engine',
      'ALL',
      `Khởi tạo thành công: ${totalCust} Khách hàng, ${totalPharms} Dược sĩ (${scheduledPharmsCount} có lịch trực hôm nay), ${totalMgrs} Quản lý, 1 Thủ kho.`
    );
  }

  // =========================================================================
  // 1. KHÁCH HÀNG: TÌM KIẾM CÓ THIÊN VỊ THEO MÙA (SEASONAL TREND BIAS)
  // =========================================================================
  async simulateCustomerBrowsing() {
    if (!this.state.isRunning) return;

    try {
      let baseMultiplier = 1;
      if (this.state.currentScenario === 'RUSH_HOUR') baseMultiplier = 2.5;
      if (this.state.currentScenario === 'NIGHT_SHIFT') baseMultiplier = 0.3;

      const viewersNow = Math.floor((60 + Math.random() * 50) * baseMultiplier);
      this.state.stats.activeViewers = viewersNow;

      // Chọn từ khóa dựa theo trọng số (70% nghiêng về cúm, sốt, đề kháng)
      const searchItem = pickWeighted(SEARCH_KEYWORDS_WEIGHTED, item => item.weight);
      const branch = this.pickBranchWeighted() || this.state.branches[0];
      const customer = randomPick(this.state.tokens.customers);
      const phone = customer?.user?.phone || `0909${Math.floor(100000 + Math.random() * 899999)}`;

      // 1. Gửi mẫu 20% log tìm kiếm vào Kafka Event Bus để tiết kiệm dung lượng MongoDB Atlas 500MB khi chạy 24/7
      if (this.state.stats.totalSearches === 0 || Math.random() < 0.2) {
        await this.apiClient.post('/api/recommendations/search-log', {
          keyword: searchItem.keyword,
          category: searchItem.category,
          phone,
          resultsCount: Math.floor(6 + Math.random() * 18),
        });
      }

      this.state.stats.totalSearches += Math.floor(3 + Math.random() * 5);

      // 2. Thỉnh thoảng mở xem chi tiết một sản phẩm
      if (this.state.allMedicines.length > 0 && Math.random() < 0.4) {
        const med = randomPick(this.state.allMedicines);
        await this.apiClient.get(`/api/medicines/${med.id || med._id}`).catch(() => {});
      }

      this.emitActivity(
        'CUSTOMER',
        'VIEW',
        customer?.user?.fullName || `Khách (${phone.slice(0, 4)}***)`,
        branch.branchCode,
        `Tìm kiếm "${searchItem.keyword}" (Danh mục: ${searchItem.category}) [${viewersNow} online]`
      );
    } catch {}
  }

  // =========================================================================
  // 2. KHÁCH HÀNG: 100% ĐẶT MUA COD ĐẦY ĐỦ ĐỊA CHỈ & ĐÁNH GIÁ CÓ THIÊN VỊ
  // =========================================================================
  async simulateCustomerOrderAndReview() {
    if (!this.state.isRunning || this.state.otcMedicines.length === 0) return;

    // 2A. Tạo đơn hàng Online 100% COD
    let selectedMed = null;
    const assignedBranch = this.pickBranchWeighted()?.branchCode || 'BR-001';
    try {
      const customer = randomPick(this.state.tokens.customers);

      // Thiên vị 70% chọn Hero / Best-seller products
      const isHeroPick = Math.random() < 0.7 && this.state.heroMedicines.length > 0;
      const med = isHeroPick ? randomPick(this.state.heroMedicines) : randomPick(this.state.otcMedicines);
      selectedMed = med;

      // Hero products mua số lượng 2-4 hộp, Normal mua 1-2 hộp
      const qty = isHeroPick ? Math.floor(2 + Math.random() * 3) : Math.floor(1 + Math.random() * 2);

      const items = [{
        medicineId: med.id || med._id,
        name: med.name,
        price: med.price || 50000,
        quantity: qty,
        unit: med.unit || 'Hộp',
      }];

      const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const patientName = customer?.user?.fullName || randomPick(CUSTOMER_NAMES);
      const patientPhone = customer?.user?.phone || `0918${Math.floor(100000 + Math.random() * 899999)}`;
      const deliveryAddress = randomPick(COD_DELIVERY_ADDRESSES);

      // 100% COD (CASH đại diện cho tiền mặt khi nhận hàng)
      const orderRes = await this.apiClient.post('/api/orders', {
        patientName,
        patientPhone,
        shippingAddress: deliveryAddress,
        items,
        totalAmount,
        paymentMethod: 'CASH', // 100% COD
        type: 'ONLINE',
        branchId: 'CENTRAL_WH',
      });

      const finalAmount = orderRes?.order?.totalAmount || orderRes?.totalAmount || totalAmount;
      this.state.stats.totalOrders += 1;
      this.state.stats.totalRevenue += finalAmount;

      this.emitActivity(
        'CUSTOMER',
        'ORDER',
        patientName,
        assignedBranch,
        `Đặt mua Online COD (${assignedBranch}): ${qty} ${med.unit || 'Hộp'} ${med.name} (#${orderRes.orderCode}) — ĐC: ${deliveryAddress}`,
        finalAmount
      );

      if (orderRes.orderCode) {
        const heroIdSet = new Set(this.state.heroMedicines.map(hm => String(hm.id || hm._id)));
        const medIdStr = String(med.id || med._id);
        const isActualHero = heroIdSet.has(medIdStr);
        const isActualProblematic = !isActualHero && this.state.problematicMedicines.some(pm => String(pm.id || pm._id) === medIdStr);

        while (this.state.pendingReviewQueue.length >= 100) {
          this.state.pendingReviewQueue.shift();
        }
        this.state.pendingReviewQueue.push({
          orderCode: String(orderRes.orderCode),
          orderId: String(orderRes.order?._id || orderRes.orderCode),
          medicineId: med.id || med._id,
          medicineName: med.name,
          customerName: patientName,
          customerPhone: patientPhone,
          branchId: assignedBranch,
          isHero: isActualHero,
          isProblematic: isActualProblematic,
          readyAt: Date.now() + 2000,
        });
      }
    } catch (err) {
      this.emitActivity('CUSTOMER', 'ORDER', 'Khách Online', assignedBranch, `Tạo đơn Online COD: ${err.message}`, null, 'WARN');
      if (selectedMed && this.isOutOfStockError(err)) {
        await this.triggerUrgentReplenishment(
          selectedMed,
          'CENTRAL_WH',
          `Kho Tổng hết tồn kho "${selectedMed.name}" khi khách đặt đơn Online COD`
        );
      }
    }

    // 2B. Xử lý đánh giá sao sau khi nhận hàng COD (Tách bạch đánh giá Sản phẩm và chất lượng Chi nhánh)
    const now = Date.now();
    const readyIndex = this.state.pendingReviewQueue.findIndex(it => (it.readyAt || 0) <= now);
    if (readyIndex !== -1) {
      const [itemToReview] = this.state.pendingReviewQueue.splice(readyIndex, 1);
      if (Math.random() >= 0.85) return;
      const branchProfile = this.getBranchProfile(itemToReview.branchId);

      // 1. Đánh giá Sản phẩm: Hero product 100% 4-5 sao; Problematic 75% 1-2 sao
      let productReviewTpl;
      if (itemToReview.isHero) {
        productReviewTpl = randomPick(POSITIVE_REVIEWS_POOL);
      } else if (itemToReview.isProblematic) {
        productReviewTpl = Math.random() < 0.75 ? randomPick(NEGATIVE_REVIEWS_POOL) : randomPick(POSITIVE_REVIEWS_POOL);
      } else {
        productReviewTpl = Math.random() < 0.85 ? randomPick(POSITIVE_REVIEWS_POOL) : randomPick(NEGATIVE_REVIEWS_POOL);
      }

      // 2. Đánh giá Chi nhánh: Phân hóa theo chất lượng vận hành của từng chi nhánh (BR-001/002 cao, BR-003 quá tải thấp)
      const branchReviewTpl = Math.random() < branchProfile.negativeReviewRate
        ? randomPick(NEGATIVE_REVIEWS_POOL)
        : randomPick(POSITIVE_REVIEWS_POOL);

      try {
        await this.apiClient.post(`/api/products/${itemToReview.medicineId}/reviews`, {
          medicineId: itemToReview.medicineId,
          medicineName: itemToReview.medicineName,
          orderId: itemToReview.orderId,
          orderCode: itemToReview.orderCode,
          reviewerName: itemToReview.customerName,
          reviewerPhone: itemToReview.customerPhone,
          rating: productReviewTpl.rating,
          comment: productReviewTpl.comment,
          tags: productReviewTpl.tags,
        });

        const fbRes = await this.apiClient.post('/api/feedbacks', {
          orderCode: itemToReview.orderCode,
          orderId: itemToReview.orderId,
          branchId: itemToReview.branchId,
          branchName: `Chi nhánh ${itemToReview.branchId}`,
          customerPhone: itemToReview.customerPhone,
          customerName: itemToReview.customerName,
          rating: branchReviewTpl.rating,
          tags: branchReviewTpl.tags,
          comment: branchReviewTpl.comment,
        });

        this.state.stats.totalReviews += 1;
        this.emitActivity(
          'CUSTOMER',
          'REVIEW',
          itemToReview.customerName,
          itemToReview.branchId,
          `Đánh giá ${productReviewTpl.rating} sao "${itemToReview.medicineName}" (Dịch vụ ${itemToReview.branchId}: ${branchReviewTpl.rating} sao): "${productReviewTpl.comment}"`,
          null,
          (productReviewTpl.rating <= 2 || branchReviewTpl.rating <= 2) ? 'WARN' : 'SUCCESS'
        );

        // Quản lý cơ sở giải quyết SLA theo năng lực từng chi nhánh (BR-001 95%, BR-003 35%)
        const feedbackId = fbRes?.feedback?._id || fbRes?._id;
        const mgr = this.state.tokens.managers[itemToReview.branchId];
        if (branchReviewTpl.rating <= 2 && feedbackId && mgr?.token && Math.random() < branchProfile.slaResolveRate) {
          setTimeout(async () => {
            try {
              const action = randomPick(MANAGER_RESOLVE_ACTIONS);
              await this.apiClient.patch(`/api/feedbacks/${feedbackId}/resolve`, {
                actionTaken: action.actionTaken,
                notes: action.notes,
                customerSatisfied: action.customerSatisfied,
              }, mgr.token);

              this.emitActivity(
                'MANAGER',
                'REVIEW',
                mgr.user?.fullName || `Quản lý ${itemToReview.branchId}`,
                itemToReview.branchId,
                `Đã xử lý khiếu nại ${branchReviewTpl.rating} sao của khách ${itemToReview.customerName} (SLA 24h hoàn tất)`
              );
            } catch {}
          }, 2000);
        }
      } catch {}
    }
  }

  // =========================================================================
  // 3. DƯỢC SĨ: CHỈ ĐIỂM DANH & BÁN POS KHI CÓ LỊCH TRỰC ĐANG TRONG KHUNG GIỜ CA
  // =========================================================================
  getPharmacistTodayAssignment(pharmKey, pharm, todayStr = getVietnamTodayStr(), currentMinutes = null) {
    if (!pharm) return null;
    const branchCode = pharm.branchId || 'BR-001';
    const sched = this.state.branchSchedules[branchCode];
    if (!sched || sched.status !== 'published' || !Array.isArray(sched.assignments)) {
      return null;
    }

    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const nowMin = currentMinutes !== null ? currentMinutes : vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();
    const yesterdayStr = addDaysStr(todayStr, -1);
    const empId = String(pharm.user?.id || pharm.user?._id || pharm.employeeId || pharmKey);
    const completedSet = pharm.completedShiftKeys instanceof Set ? pharm.completedShiftKeys : new Set();

    // Lấy toàn bộ các ca của dược sĩ này trong ngày hôm nay VÀ ca qua đêm từ ngày hôm qua
    const candidates = [];
    for (const a of sched.assignments) {
      if (String(a.employeeId) !== empId) continue;
      const aDateStr = normalizeIsoDateStr(a.date);
      if (aDateStr !== todayStr && aDateStr !== yesterdayStr) continue;

      const timing = evaluateShiftWindow(a.shiftStart, a.shiftEnd, nowMin, aDateStr, todayStr, yesterdayStr);
      // Nếu là phân công của ngày hôm qua nhưng không phải ca qua đêm thì bỏ qua
      if (aDateStr === yesterdayStr && !timing.isOvernight) continue;

      const shiftKey = `${aDateStr}_${a.shiftId}`;
      const isAlreadyCompleted = completedSet.has(shiftKey);

      candidates.push({
        ...a,
        _assignmentDateStr: aDateStr,
        _shiftKey: shiftKey,
        _timing: timing,
        _isCompleted: isAlreadyCompleted,
      });
    }

    if (candidates.length === 0) return null;

    // Ưu tiên 1: Nếu dược sĩ đang ở trạng thái isCheckedIn trên 1 ca cụ thể, trả về ca đó để kiểm tra giờ kết thúc (check-out) hoặc bán POS tiếp
    if (pharm.isCheckedIn && pharm.activeShiftKey) {
      const currentOpen = candidates.find(c => c._shiftKey === pharm.activeShiftKey && !c._isCompleted);
      if (currentOpen) return currentOpen;
    }

    // Ưu tiên 2: Ca đang nằm trong khung giờ trực hợp lệ (từ startMin - 30p đến trước endMin) và chưa hoàn thành
    const activeNow = candidates.find(c => c._timing.isActiveWindow && !c._isCompleted);
    if (activeNow) return activeNow;

    // Ưu tiên 3: Nếu dược sĩ đang isCheckedIn nhưng chưa gắn activeShiftKey, lấy ca vừa kết thúc để đóng ca
    if (pharm.isCheckedIn) {
      const justEnded = candidates.find(c => c._timing.isShiftEnded && !c._isCompleted);
      if (justEnded) return justEnded;
    }

    // Ưu tiên 4: Ca sắp tới trong ngày hôm nay (để hiển thị có lịch hôm nay nhưng chờ đến giờ mới check-in)
    const upcomingToday = candidates
      .filter(c => c._assignmentDateStr === todayStr && c._timing.isFutureShift && !c._isCompleted)
      .sort((a, b) => a._timing.startMin - b._timing.startMin)[0];
    if (upcomingToday) return upcomingToday;

    // Cuối cùng: Trả về ca trong ngày hôm nay (đã hoàn thành hoặc đã qua giờ) để biết trạng thái
    return candidates.find(c => c._assignmentDateStr === todayStr) || candidates[0];
  }

  async simulatePharmacistPOSAndAttendance(force = false) {
    if (!this.state.isRunning && !force) return;
    const pharmEntries = Object.entries(this.state.tokens.pharmacists);
    if (pharmEntries.length === 0) return;

    const todayStr = getVietnamTodayStr();
    const currentWeekMonday = getWeekMondayStr(todayStr);
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const currentMinutes = vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();

    // Đồng bộ lịch chi nhánh nếu sang ngày mới hoặc quá 60 giây (để nhận diện ngay khi Quản lý vừa thêm Ca thứ 3 / Ca Đêm trên UI)
    const branchCodesInPlay = [...new Set(pharmEntries.map(([, p]) => p.branchId || 'BR-001'))];
    const nowMs = Date.now();
    const needsSync =
      this.state.lastScheduleSyncDate !== todayStr ||
      branchCodesInPlay.some(code => {
        const sc = this.state.branchSchedules[code];
        return (
          !sc ||
          sc.status !== 'published' ||
          sc.weekStart !== currentWeekMonday ||
          nowMs - (sc.updatedAt || 0) > 60000
        );
      });

    if (needsSync) {
      await this.ensureAllBranchesScheduled({ weekStartOverride: currentWeekMonday });
    }

    // 1. Đánh giá lịch trực và khung giờ thực tế của từng dược sĩ
    const scheduledPharms = [];
    for (const [key, p] of pharmEntries) {
      if (!(p.completedShiftKeys instanceof Set)) {
        p.completedShiftKeys = new Set();
      }
      const matchAssign = this.getPharmacistTodayAssignment(key, p, todayStr, currentMinutes);
      p.scheduledToday = Boolean(matchAssign);
      p.assignedShift = matchAssign || null;

      if (!matchAssign) {
        p.inActiveShiftWindow = false;
        p.isCheckedIn = false;
        continue;
      }

      p.isCompleted = Boolean(matchAssign._isCompleted);
      p.inActiveShiftWindow = Boolean(matchAssign._timing?.isActiveWindow && !matchAssign._isCompleted);

      // Nếu dược sĩ đang trong ca (isCheckedIn) mà ca đó đã đến/qua giờ kết thúc -> lập tức bàn giao két & Check-out đóng ca
      if (p.isCheckedIn && matchAssign._timing?.isShiftEnded && !matchAssign._isCompleted) {
        await this.triggerHandoverAndCheckout(p);
        continue;
      }

      scheduledPharms.push(p);
    }

    if (scheduledPharms.length === 0) return;

    // Chỉ chọn những dược sĩ ĐANG TRONG KHUNG GIỜ CA TRỰC HIỆN TẠI (inActiveShiftWindow === true) và chưa Check-out
    const activeWindowPharms = scheduledPharms.filter(p => p.inActiveShiftWindow && !p.isCompleted);
    if (activeWindowPharms.length === 0) {
      // Không có ca nào đang mở ở khung giờ hiện tại (hoặc các dược sĩ của ca hiện tại đã hoàn thành ca)
      return;
    }

    // Ưu tiên dược sĩ đang trong khung giờ ca nhưng chưa check-in; khi đã check-in đủ thì phân tầng lưu lượng POS theo Chi nhánh
    const uncheckedPharms = activeWindowPharms.filter(p => !p.isCheckedIn);
    let pharm;
    if (uncheckedPharms.length > 0) {
      pharm = randomPick(uncheckedPharms);
    } else {
      const activeBranchCodes = [...new Set(activeWindowPharms.map(p => p.branchId))];
      const chosenBranchCode = pickWeighted(
        activeBranchCodes,
        code => this.getBranchProfile(code).trafficWeight
      );
      const branchPharms = activeWindowPharms.filter(p => p.branchId === chosenBranchCode);
      pharm = randomPick(branchPharms) || randomPick(activeWindowPharms);
    }

    const shiftName = pharm.assignedShift?.shiftName || 'Ca Sáng';
    const shiftStart = pharm.assignedShift?.shiftStart || pharm.shiftSchedule?.morningStart || '07:00';
    const shiftEnd = pharm.assignedShift?.shiftEnd || pharm.shiftSchedule?.morningEnd || '15:00';
    const shiftTiming = pharm.assignedShift?._timing || evaluateShiftWindow(
      shiftStart,
      shiftEnd,
      currentMinutes,
      pharm.assignedShift?._assignmentDateStr || todayStr,
      todayStr,
      addDaysStr(todayStr, -1)
    );

    // Nếu ca trực đã kết thúc và dược sĩ đang trong ca -> tự động bàn giao & check-out đóng ca
    if (pharm.isCheckedIn && shiftTiming.isShiftEnded) {
      await this.triggerHandoverAndCheckout(pharm);
      return;
    }

    if (!pharm.isCheckedIn) {
      try {
        const gps = jitterGps(pharm.branchLat, pharm.branchLng);

        // Đồng bộ trạng thái đi muộn với bộ đếm thực tế của Backend (trễ > 15 phút so với giờ bắt đầu ca, hỗ trợ cả ca đêm)
        const isLate = Boolean(shiftTiming.isLate);
        const assignedShiftId = pharm.assignedShift?.shiftId;
        const note = isLate
          ? `${randomPick(CHECKIN_NOTES.late)} (${shiftName} ${shiftStart}-${shiftEnd})`
          : `${randomPick(CHECKIN_NOTES.punctual)} (${shiftName} ${shiftStart}-${shiftEnd})`;

        const checkInPayload = {
          latitude: gps.latitude,
          longitude: gps.longitude,
          isMockLocation: false,
          note,
        };
        if (assignedShiftId && /^[0-9a-fA-F]{24}$/.test(String(assignedShiftId))) {
          checkInPayload.shiftId = String(assignedShiftId);
        }

        const checkInRes = await this.apiClient.post('/api/hr/attendance/check-in', checkInPayload, pharm.token);

        pharm.isCheckedIn = true;
        pharm.activeShiftKey = pharm.assignedShift?._shiftKey || `${todayStr}_${assignedShiftId || 'DEFAULT'}`;
        this.state.stats.totalCheckIns += 1;
        this.emitActivity(
          'PHARMACIST',
          'ATTENDANCE',
          pharm.user?.fullName || 'Dược sĩ',
          pharm.branchId,
          `Check-in GPS ${shiftName} (${shiftStart}-${shiftEnd}) [${pharm.persona || 'NORMAL'}]: ${isLate ? 'ĐI MUỘN' : 'ĐÚNG GIỜ'} (${checkInRes?.distanceMeters || 15}m) — ${note}`,
          null,
          isLate ? 'WARN' : 'SUCCESS'
        );
      } catch (err) {
        if (err.message && (err.message.includes('Cập nhật') || err.message.includes('Cap nhat') || err.message.includes('thành công') || err.message.includes('thanh cong') || err.message.includes('đã Check-in') || err.message.includes('da Check-in'))) {
          pharm.isCheckedIn = true;
          pharm.activeShiftKey = pharm.assignedShift?._shiftKey || `${todayStr}_${pharm.assignedShift?.shiftId || 'DEFAULT'}`;
        } else if (err.message && (err.message.includes('Check-out') || err.message.includes('hoàn thành ca trực') || err.message.includes('đã hoàn thành') || err.message.includes('da hoan thanh'))) {
          // Dược sĩ này đã từng check-out ca này trước đó trên backend -> đánh dấu hoàn thành ca này
          const doneKey = pharm.assignedShift?._shiftKey || `${todayStr}_${pharm.assignedShift?.shiftId || 'DEFAULT'}`;
          pharm.completedShiftKeys.add(doneKey);
          pharm.isCompleted = true;
          pharm.isCheckedIn = false;
          pharm.activeShiftKey = null;
          return;
        } else {
          this.emitActivity('PHARMACIST', 'ATTENDANCE', pharm.user?.fullName || 'Dược sĩ', pharm.branchId, `Check-in: ${err.message}`, null, 'WARN');
          return;
        }
      }
    }

    // 2. Bán lẻ POS tại quầy (100% RETAIL - không bán sỉ)
    if (this.state.allMedicines.length > 0) {
      let selectedMed = null;
      try {
        // Thiên vị: 65% khách mua thuốc Hero / Best-seller tại quầy
        const isHero = Math.random() < 0.65 && this.state.heroMedicines.length > 0;
        const med = isHero ? randomPick(this.state.heroMedicines) : randomPick(this.state.allMedicines);
        selectedMed = med;
        const qty = Math.floor(1 + Math.random() * 3);
        const customerName = randomPick(CUSTOMER_NAMES);
        const customerPhone = `0918${Math.floor(100000 + Math.random() * 899999)}`;
        const paymentMethod = Math.random() < 0.6 ? 'CASH' : 'CARD';

        const saleRes = await this.apiClient.post('/api/sales', {
          patientName: customerName,
          patientPhone: customerPhone,
          branchId: pharm.branchId,
          paymentMethod,
          type: 'RETAIL', // 100% RETAIL
          items: [{
            medicineId: med.id || med._id,
            name: med.name,
            quantity: qty,
            price: med.price || 50000,
            unit: med.unit || 'Hộp',
          }],
        }, pharm.token);

        const totalAmt = saleRes?.data?.totalAmount || saleRes?.totalAmount || (med.price * qty);
        this.state.stats.totalOrders += 1;
        this.state.stats.totalRevenue += totalAmt;

        this.emitActivity(
          'PHARMACIST',
          'POS',
          pharm.user?.fullName || 'Dược sĩ',
          pharm.branchId,
          `Bán lẻ POS (${paymentMethod}): ${qty} ${med.unit || 'Hộp'} ${med.name}${isHero ? ' [Hero Best-seller]' : ''}`,
          totalAmt
        );
      } catch (err) {
        if (err.message && (err.message.includes('Check-out') || err.message.includes('hoàn thành ca trực') || err.message.includes('đã hoàn thành') || err.message.includes('da hoan thanh'))) {
          // Dược sĩ đã kết thúc ca trực -> đánh dấu hoàn thành ca hiện tại và tự động chuyển quầy POS cho người khác
          const doneKey = pharm.activeShiftKey || pharm.assignedShift?._shiftKey || `${todayStr}_${pharm.assignedShift?.shiftId || 'DEFAULT'}`;
          if (pharm.completedShiftKeys instanceof Set) {
            pharm.completedShiftKeys.add(doneKey);
          }
          pharm.isCompleted = true;
          pharm.isCheckedIn = false;
          pharm.activeShiftKey = null;
          this.emitActivity(
            'PHARMACIST',
            'ATTENDANCE',
            pharm.user?.fullName || 'Dược sĩ',
            pharm.branchId,
            `Dược sĩ đã hoàn thành ca trực hôm nay. Tự động chuyển quầy POS cho Dược sĩ ca tiếp theo.`,
            null,
            'INFO'
          );
        } else {
          this.emitActivity('PHARMACIST', 'POS', pharm.user?.fullName || 'Dược sĩ', pharm.branchId, `POS tại quầy: ${err.message}`, null, 'WARN');
          if (selectedMed && this.isOutOfStockError(err)) {
            await this.triggerUrgentReplenishment(
              selectedMed,
              pharm.branchId,
              `Chi nhánh ${pharm.branchId} hết tồn kho "${selectedMed.name}" tại quầy POS`
            );
          }
        }
      }
    }
  }

  // =========================================================================
  // 4. THỦ KHO TỔNG: CHUỖI CUNG ỨNG THEO NHU CẦU THỰC (PR -> PO -> GRN -> TRANSFER)
  // =========================================================================
  async simulateWarehouseOperations(force = false) {
    if (!this.state.isRunning && !force) return;
    if (!force && this._isWarehouseRunning) return;
    const whToken = this.state.tokens.warehouse || this.state.tokens.admin;
    if (!whToken) return;

    const hasUrgent = this.state.urgentRestockQueue.length > 0;
    const shouldRestock = force || hasUrgent || this.state.currentScenario === 'SUPPLY_CHAIN' || Math.random() < 0.65;
    if (!shouldRestock) return;

    this._isWarehouseRunning = true;
    try {
      // GIAI ĐOẠN 1: Chi nhánh tạo yêu cầu nhập hàng (PR) - ưu tiên thuốc đang hết hoặc Hero bán chạy
      try {
        const urgentItem = this.state.urgentRestockQueue.shift();
        let branch = null;
        let med = null;
        let prQty = Math.floor(200 + Math.random() * 200);
        let note = randomPick(PR_REASON_NOTES);
        let restockTargetBranch = null;

        if (urgentItem) {
          const matchedBranch = this.state.branches.find(b => b.branchCode === urgentItem.branchId);
          branch = matchedBranch || randomPick(this.state.branches) || this.state.branches[0];
          med = {
            id: urgentItem.medicineId,
            _id: urgentItem.medicineId,
            name: urgentItem.medicineName,
            unit: urgentItem.unit || 'Hộp',
            price: urgentItem.price || 45000,
          };
          // Nhập 600-1000 đơn vị để đủ quy đổi cho các thuốc đóng gói 20-120 viên/hộp
          prQty = Math.floor(600 + Math.random() * 400);
          note = urgentItem.reason || randomPick(PR_REASON_NOTES);
          restockTargetBranch = urgentItem.branchId;
        } else {
          branch = this.pickBranchWeighted() || this.state.branches[0];
          med = (this.state.heroMedicines.length > 0 && Math.random() < 0.8)
            ? randomPick(this.state.heroMedicines)
            : randomPick(this.state.allMedicines);
          restockTargetBranch = branch?.branchCode;
        }

        const mgr = branch ? this.state.tokens.managers[branch.branchCode] : null;
        const tokenToUse = mgr?.token || this.state.tokens.admin || whToken;

        if (tokenToUse && med && branch) {
          const prRes = await this.apiClient.post('/api/purchase-requisitions', {
            branchId: branch.branchCode,
            branchName: branch.name,
            reason: note,
            isUrgent: Boolean(urgentItem),
            items: [{
              medicineId: med.id || med._id,
              medicineName: med.name,
              quantity: prQty,
              unit: med.unit || 'Hộp',
              estimatedPrice: med.price || 40000,
            }],
          }, tokenToUse);

          const prId = prRes?._id || prRes?.id || prRes?.data?._id;
          const prCode = prRes?.prCode || prRes?.data?.prCode || `PR-${Date.now().toString().slice(-5)}`;

          this.state.stats.totalPRs += 1;
          while (this.state.pendingPrQueue.length >= 50) {
            this.state.pendingPrQueue.shift();
          }
          this.state.pendingPrQueue.push({
            prId,
            prCode,
            branchId: restockTargetBranch || branch.branchCode,
            medicineId: med.id || med._id,
            medicineName: med.name,
            quantity: prQty,
            unit: med.unit || 'Hộp',
            price: med.price || 40000,
            isUrgent: Boolean(urgentItem),
          });

          this.emitActivity(
            'MANAGER',
            'PR',
            mgr?.user?.fullName || `Quản lý ${branch.branchCode}`,
            branch.branchCode,
            `Tạo yêu cầu nhập hàng ${prCode}${urgentItem ? ' [KHẨN CẤP - HẾT THUỐC]' : ''}: ${prQty} ${med.unit || 'Hộp'} ${med.name} — ${note}`
          );
        }
      } catch (err) {
        this.emitActivity('MANAGER', 'PR', 'Quản lý Chi nhánh', 'ALL', `Tạo PR: ${err.message}`, null, 'WARN');
      }

      // GIAI ĐOẠN 2: Thủ kho gom PR tạo Đơn đặt hàng NCC (PO Auto Route) & Duyệt PO sang SHIPPING
      if (this.state.pendingPrQueue.length > 0) {
        try {
          const prItem = this.state.pendingPrQueue.shift();
          const supplier = randomPick(this.state.suppliers) || SUPPLIERS_POOL[0];

          const poRes = await this.apiClient.post('/api/purchase-orders/auto-route', {
            prIds: prItem.prId ? [prItem.prId] : [],
            createdBy: 'Thủ kho Trung tâm',
            items: [{
              medicineId: prItem.medicineId,
              medicineName: prItem.medicineName,
              quantity: prItem.quantity,
              unitPrice: Math.round(prItem.price * 0.7),
            }],
          }, whToken);

          const poData = poRes?.data || poRes;
          const firstPo = Array.isArray(poData?.pos)
            ? poData.pos[0]
            : (Array.isArray(poData) ? poData[0] : poData);
          const poId =
            firstPo?._id ||
            firstPo?.id ||
            (Array.isArray(poData?.poIds) && poData.poIds[0]);
          const poCode = firstPo?.poCode || poData?.poCode || `PO-${Date.now().toString().slice(-5)}`;

          this.state.stats.totalPOs += 1;

          const approveToken = this.state.tokens.admin || whToken;
          if (poId && approveToken) {
            // Dùng PAID để tránh bị chặn bởi hạn mức công nợ NCC khi mô phỏng 24/7, đảm bảo PO chuyển sang SHIPPING
            await this.apiClient.post('/api/purchase-orders/approve-pay', {
              poId,
              action: 'APPROVE',
              paymentType: 'PAID',
            }, approveToken);
          }

          while (this.state.pendingPoQueue.length >= 50) {
            this.state.pendingPoQueue.shift();
          }
          this.state.pendingPoQueue.push({
            poId,
            poCode,
            supplierName: supplier.name,
            medicineId: prItem.medicineId,
            medicineName: prItem.medicineName,
            quantity: prItem.quantity,
            unit: prItem.unit || 'Hộp',
            unitPrice: Math.round(prItem.price * 0.7),
            branchTarget: prItem.branchId,
            isUrgent: prItem.isUrgent,
          });

          this.emitActivity(
            'WAREHOUSE',
            'PO',
            'Thủ kho Trung tâm',
            'CENTRAL_WH',
            `Gom PR tạo và duyệt đơn PO NCC ${poCode} gửi tới ${supplier.name} (${prItem.quantity} ${prItem.unit || 'Hộp'} ${prItem.medicineName})`
          );
        } catch (err) {
          this.emitActivity('WAREHOUSE', 'PO', 'Thủ kho Trung tâm', 'CENTRAL_WH', `Tạo/Duyệt PO: ${err.message}`, null, 'WARN');
        }
      }

      // GIAI ĐOẠN 3: Thủ kho nhận hàng từ NCC, Kiểm đếm & Phê duyệt GRN để cộng tồn kho thật vào CENTRAL_WH
      if (this.state.pendingPoQueue.length > 0) {
        try {
          const poItem = this.state.pendingPoQueue.shift();
          const batchNo = generateBatchNo('LOT');
          const expDate = new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10);
          const grnNote = randomPick(GRN_RECEIPT_NOTES);
          // Xếp vào Khu Dự Trữ Tổng (slotType: RESERVE) để không xung đột nguyên tắc "1 Thùng = 1 Loại Thuốc" trên kệ chính MAIN
          const shelfLocation = { zone: 'RESERVE', rack: 'RES1', shelf: 1, bin: 1, slotType: 'RESERVE' };

          const grnPayload = {
            poId: poItem.poId || 'MOCK_PO',
            supplierName: poItem.supplierName,
            receivedBy: 'Thủ kho Trung tâm',
            receiptNote: grnNote,
            items: [{
              medicineId: poItem.medicineId,
              medicineName: poItem.medicineName,
              batchNo,
              expDate,
              quantity: poItem.quantity,
              unitPrice: poItem.unitPrice,
              location: shelfLocation,
            }],
          };

          const grnRes = await this.apiClient.post('/api/goods-receipts', grnPayload, whToken);
          const grnData = grnRes?.data || grnRes;
          const grnId = grnData?._id || grnData?.id;

          // Thực hiện đầy đủ quy trình Kiểm đếm (Inspection) -> Xác nhận (Verify) -> Duyệt GRN (Approve) để cộng tồn kho DB
          if (grnId) {
            const inspRes = await this.apiClient.post('/api/goods-receipts/inspections', {
              grnId: String(grnId),
              inspectedBy: 'Thủ kho Trung tâm',
            }, whToken);

            const inspRecord = inspRes?.data || inspRes;
            const recordId = inspRecord?._id || inspRecord?.id;
            const inspItems = Array.isArray(inspRecord?.items) ? inspRecord.items : [];

            if (recordId && inspItems.length > 0) {
              for (const inspItem of inspItems) {
                await this.apiClient.post('/api/goods-receipts/inspections/verify', {
                  recordId: String(recordId),
                  itemId: String(inspItem._id || inspItem.id),
                  actualQty: Number(inspItem.expectedQty || poItem.quantity),
                  batchNo,
                  expDate,
                  location: shelfLocation,
                }, whToken);
              }
            }

            await this.apiClient.post(`/api/goods-receipts/${grnId}/submit-inspection`, {}, whToken);
            await this.apiClient.post(`/api/goods-receipts/${grnId}/approve`, {
              discrepancyReason: 'Đã kiểm đếm đủ 100% số lượng và chất lượng theo tiêu chuẩn GSP',
            }, whToken);
          }

          this.state.stats.totalGRNs += 1;
          this.emitActivity(
            'WAREHOUSE',
            'GRN',
            'Thủ kho Trung tâm',
            'CENTRAL_WH',
            `Hoàn tất Kiểm đếm & Duyệt nhập kho GRN lô ${batchNo} (+${poItem.quantity} ${poItem.unit || 'Hộp'} ${poItem.medicineName} vào CENTRAL_WH, HSD: ${expDate}) — ${grnNote}`
          );

          // GIAI ĐOẠN 4: Điều chuyển kho (Stock Transfer) về cơ sở & Quản lý cơ sở xác nhận nhận hàng (Receive)
          if (poItem.branchTarget && poItem.branchTarget !== 'CENTRAL_WH') {
            try {
              const transferQty = Math.max(10, Math.floor(poItem.quantity * 0.5));
              const tfNote = randomPick(STOCK_TRANSFER_NOTES);

              const tfRes = await this.apiClient.post('/api/stock-transfers/direct', {
                fromBranchId: 'CENTRAL_WH',
                toBranchId: poItem.branchTarget,
                toBranchName: `Chi nhánh ${poItem.branchTarget}`,
                shippedBy: 'Thủ kho Trung tâm',
                items: [{
                  medicineId: poItem.medicineId,
                  medicineName: poItem.medicineName,
                  quantity: transferQty,
                  unit: poItem.unit || 'Hộp',
                }],
              }, whToken);

              const tfData = tfRes?.data || tfRes;
              const transferId = tfData?._id || tfData?.id;
              const transferCode = tfData?.transferCode || 'ST-DIRECT';

              this.state.stats.totalStockTransfers += 1;
              this.emitActivity(
                'WAREHOUSE',
                'TRANSFER',
                'Điều phối Kho',
                poItem.branchTarget,
                `Xuất chuyển kho ${transferCode}: ${transferQty} ${poItem.unit || 'Hộp'} ${poItem.medicineName} từ Kho Tổng về ${poItem.branchTarget}`
              );

              // Quản lý chi nhánh đích xác nhận nhận hàng để cộng tồn kho vào branch_inventories
              if (transferId) {
                const targetMgr = this.state.tokens.managers[poItem.branchTarget];
                const receiveToken = targetMgr?.token || whToken;
                const receiverName = targetMgr?.user?.fullName || `Quản lý ${poItem.branchTarget}`;
                const inspectionItems = Array.isArray(tfData?.items)
                  ? tfData.items.map(it => ({
                      medicineId: it.medicineId,
                      batchNo: it.batchNo,
                      actualQuantity: it.quantity,
                    }))
                  : undefined;

                await this.apiClient.post(`/api/stock-transfers/${transferId}/receive`, {
                  receivedBy: receiverName,
                  inspectionItems,
                  inspectionNote: tfNote,
                }, receiveToken);

                this.emitActivity(
                  'MANAGER',
                  'TRANSFER',
                  receiverName,
                  poItem.branchTarget,
                  `Xác nhận nhận hàng phiếu ${transferCode}: Đã cộng +${transferQty} ${poItem.unit || 'Hộp'} ${poItem.medicineName} vào tồn kho ${poItem.branchTarget}`
                );
              }
            } catch (tfErr) {
              this.emitActivity('WAREHOUSE', 'TRANSFER', 'Điều phối Kho', poItem.branchTarget, `Chuyển kho: ${tfErr.message}`, null, 'WARN');
            }
          }
        } catch (grnErr) {
          this.emitActivity('WAREHOUSE', 'GRN', 'Thủ kho Trung tâm', 'CENTRAL_WH', `Nhập kho GRN: ${grnErr.message}`, null, 'WARN');
        }
      }
    } finally {
      this._isWarehouseRunning = false;
    }
  }

  // =========================================================================
  // 5. QUẢN LÝ THIẾT LẬP CA LÀM VIỆC, XẾP LỊCH TUẦN & DUYỆT BẢNG LƯƠNG THÁNG
  // =========================================================================
  async ensureBranchShiftsAndSchedule(branchCode, options = {}) {
    const { forceRebuild = false, weekStartOverride = null } = options;
    const br = this.state.branches.find(b => b.branchCode === branchCode) || {
      branchCode,
      name: `Chi nhánh ${branchCode}`,
      shiftSchedule: { morningStart: '07:00', morningEnd: '15:00', afternoonStart: '14:00', afternoonEnd: '22:00' },
    };

    const branchPharms = Object.entries(this.state.tokens.pharmacists)
      .filter(([, p]) => (p.branchId || 'BR-001') === branchCode)
      .map(([key, p]) => ({
        empId: String(p.user?.id || p.user?._id || p.employeeId || key),
        empName: p.user?.fullName || 'Dược sĩ',
        pharmRef: p,
      }));

    const mgr = this.state.tokens.managers[branchCode];
    // API /api/hr/shifts và /api/hr/schedules* lấy branchId từ JWT của người gọi, nên bắt buộc ưu tiên token của Quản lý/Dược sĩ thuộc đúng chi nhánh đó
    const token = mgr?.token || branchPharms[0]?.pharmRef?.token || this.state.tokens.admin;
    if (!token) return null;

    const todayStr = getVietnamTodayStr();
    const weekStartStr = weekStartOverride || getWeekMondayStr(todayStr);

    try {
      // BƯỚC 1: Lấy toàn bộ danh sách Ca làm việc đang Active của chi nhánh (hỗ trợ động 2 ca, 3 ca, 4 ca, kể cả Ca Đêm 22:00-06:00)
      const rawShifts = await this.apiClient.get('/api/hr/shifts', token).catch(() => []);
      const activeShifts = (Array.isArray(rawShifts) ? rawShifts : []).filter(
        s => s && (s._id || s.id) && s.isActive !== false
      );

      let createdNewShift = false;
      if (activeShifts.length === 0) {
        const createdM = await this.apiClient.post('/api/hr/shifts', {
          name: 'Ca Sáng',
          startTime: br.shiftSchedule?.morningStart || '07:00',
          endTime: br.shiftSchedule?.morningEnd || '15:00',
          color: '#3B82F6',
        }, token).catch(() => null);

        activeShifts.push({
          _id: createdM?._id || createdM?.id || 'SHIFT_MORNING',
          name: createdM?.name || 'Ca Sáng',
          startTime: createdM?.startTime || br.shiftSchedule?.morningStart || '07:00',
          endTime: createdM?.endTime || br.shiftSchedule?.morningEnd || '15:00',
        });
        if (createdM?._id || createdM?.id) createdNewShift = true;
      }

      if (activeShifts.length < 2) {
        const createdA = await this.apiClient.post('/api/hr/shifts', {
          name: 'Ca Chiều',
          startTime: br.shiftSchedule?.afternoonStart || '14:00',
          endTime: br.shiftSchedule?.afternoonEnd || '22:00',
          color: '#F97316',
        }, token).catch(() => null);

        activeShifts.push({
          _id: createdA?._id || createdA?.id || 'SHIFT_AFTERNOON',
          name: createdA?.name || 'Ca Chiều',
          startTime: createdA?.startTime || br.shiftSchedule?.afternoonStart || '14:00',
          endTime: createdA?.endTime || br.shiftSchedule?.afternoonEnd || '22:00',
        });
        if (createdA?._id || createdA?.id) createdNewShift = true;
      }

      // Sắp xếp toàn bộ các ca đang Active theo thứ tự giờ bắt đầu (VD: Ca Sáng 06:00 -> Ca Chiều 14:00 -> Ca Đêm 22:00)
      const orderedShifts = [...activeShifts].sort(
        (a, b) => parseTimeMin(a.startTime, '07:00') - parseTimeMin(b.startTime, '07:00')
      );

      if (createdNewShift) {
        const shiftSummaryText = orderedShifts
          .map(s => `${s.name} (${s.startTime}-${s.endTime})`)
          .join(', ');
        this.emitActivity(
          'MANAGER',
          'SCHEDULE',
          mgr?.user?.fullName || `Quản lý ${branchCode}`,
          branchCode,
          `Thiết lập danh mục Ca làm việc chuẩn cho ${branchCode}: ${shiftSummaryText}`
        );
      }

      const validShiftIds = new Set(orderedShifts.map(s => String(s._id || s.id)));

      // BƯỚC 2: Kiểm tra lịch tuần hiện tại trên Backend (work_schedules)
      const existingSched = await this.apiClient
        .get(`/api/hr/schedules/week?weekStart=${weekStartStr}`, token)
        .catch(() => null);

      const rawExistingAssignments = Array.isArray(existingSched?.assignments)
        ? existingSched.assignments
        : [];
      const validExisting = rawExistingAssignments.filter(
        a => a && a.employeeId && validShiftIds.has(String(a.shiftId))
      );
      const isAlreadyPublished = existingSched?.status === 'published';

      // Số ca cần phân công mỗi ngày khớp với số ca Active trên /branch/shifts (VD: 2 ca -> 2 người/ngày; 3 ca cả nửa đêm -> 3 người/ngày)
      const targetPerDay = Math.min(orderedShifts.length, branchPharms.length);
      const botEmpIdSet = new Set(branchPharms.map(bp => bp.empId));

      let allDaysCovered = branchPharms.length > 0;
      for (let d = 0; d < 7; d++) {
        const dStr = addDaysStr(weekStartStr, d);
        const dayAssigns = validExisting.filter(a => normalizeIsoDateStr(a.date) === dStr);
        const coveredShiftsOnDay = new Set(dayAssigns.map(a => String(a.shiftId)));
        const botAssignedOnDay = dayAssigns.filter(a => botEmpIdSet.has(String(a.employeeId)));
        if (botAssignedOnDay.length < targetPerDay || coveredShiftsOnDay.size < targetPerDay) {
          allDaysCovered = false;
          break;
        }
      }

      let finalAssignments = validExisting;

      if (forceRebuild || !isAlreadyPublished || !allDaysCovered) {
        // Nếu chỉ bổ sung thêm ca mới (VD: Quản lý vừa thêm Ca Đêm thứ 3 trên /branch/shifts), giữ nguyên lịch các ca đã xếp và chỉ điền thêm ca còn thiếu
        const merged = forceRebuild ? [] : [...validExisting];

        for (let d = 0; d < 7; d++) {
          const dStr = addDaysStr(weekStartStr, d);
          const isoDate = `${dStr}T00:00:00.000Z`;
          const existingOnDay = merged.filter(a => normalizeIsoDateStr(a.date) === dStr);
          const coveredShiftIds = new Set(existingOnDay.map(a => String(a.shiftId)));
          const busyEmpIds = new Set(existingOnDay.map(a => String(a.employeeId)));

          for (let slot = 0; slot < targetPerDay; slot++) {
            const shiftObj = orderedShifts[slot];
            if (!shiftObj) continue;
            const sId = String(shiftObj._id || shiftObj.id);
            if (!forceRebuild && coveredShiftIds.has(sId)) continue;

            // Chọn dược sĩ xoay vòng chưa bị trùng ca trong ngày đó
            let chosenPharm = null;
            for (let offset = 0; offset < branchPharms.length; offset++) {
              const candidate = branchPharms[(d + slot + offset) % branchPharms.length];
              if (candidate && !busyEmpIds.has(candidate.empId)) {
                chosenPharm = candidate;
                break;
              }
            }
            if (!chosenPharm) {
              chosenPharm = branchPharms[(d + slot) % branchPharms.length];
            }
            if (!chosenPharm) continue;

            busyEmpIds.add(chosenPharm.empId);
            coveredShiftIds.add(sId);

            merged.push({
              date: isoDate,
              shiftId: sId,
              shiftName: shiftObj.name || `Ca ${slot + 1}`,
              shiftStart: shiftObj.startTime || '07:00',
              shiftEnd: shiftObj.endTime || '15:00',
              employeeId: chosenPharm.empId,
              employeeName: chosenPharm.empName,
              note: `Ca làm việc cố định cơ sở ${branchCode}`,
            });
          }
        }

        await this.apiClient.post('/api/hr/schedules', {
          weekStart: weekStartStr,
          assignments: merged,
        }, token);

        await this.apiClient.post('/api/hr/schedules/publish', {
          weekStart: weekStartStr,
          sendEmailNotification: false,
        }, token).catch(() => {});

        finalAssignments = merged;

        const todayBotShifts = finalAssignments
          .filter(a => normalizeIsoDateStr(a.date) === todayStr && botEmpIdSet.has(String(a.employeeId)))
          .map(a => `${a.employeeName} [${a.shiftName} ${a.shiftStart}-${a.shiftEnd}]`)
          .join(', ');

        this.emitActivity(
          'MANAGER',
          'SCHEDULE',
          mgr?.user?.fullName || `Quản lý ${branchCode}`,
          branchCode,
          `Đã công bố lịch tuần (${weekStartStr} → ${addDaysStr(weekStartStr, 6)}, ${orderedShifts.length} ca/ngày): Hôm nay (${todayStr}) trực gồm ${todayBotShifts || `${finalAssignments.length} ca`}`
        );
      }

      // Nếu hôm nay là Thứ Hai đầu tuần, nối thêm lịch Chủ Nhật tuần trước vào bộ nhớ đệm để Ca Đêm tối Chủ Nhật vắt sang sáng Thứ Hai không bị đứt
      let cachedAssignments = [...finalAssignments];
      if (todayStr === weekStartStr) {
        const prevWeekMonday = addDaysStr(weekStartStr, -7);
        const prevSched = await this.apiClient
          .get(`/api/hr/schedules/week?weekStart=${prevWeekMonday}`, token)
          .catch(() => null);
        if (Array.isArray(prevSched?.assignments)) {
          const yesterdayStr = addDaysStr(todayStr, -1);
          const sundayOvernights = prevSched.assignments.filter(
            a => normalizeIsoDateStr(a.date) === yesterdayStr
          );
          cachedAssignments = [...sundayOvernights, ...cachedAssignments];
        }
      }

      // BƯỚC 3: Lưu bộ nhớ đệm lịch chi nhánh & cập nhật cờ scheduledToday cho từng Dược sĩ của chi nhánh
      this.state.branchSchedules[branchCode] = {
        weekStart: weekStartStr,
        status: 'published',
        shifts: orderedShifts,
        assignments: cachedAssignments,
        updatedAt: Date.now(),
      };

      const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const currentMinutes = vnNow.getUTCHours() * 60 + vnNow.getUTCMinutes();
      for (const bp of branchPharms) {
        const myAssign = this.getPharmacistTodayAssignment(bp.empId, bp.pharmRef, todayStr, currentMinutes);
        bp.pharmRef.scheduledToday = Boolean(myAssign);
        bp.pharmRef.assignedShift = myAssign || null;
        bp.pharmRef.inActiveShiftWindow = Boolean(myAssign?._timing?.isActiveWindow && !myAssign?._isCompleted);
        if (!bp.pharmRef.scheduledToday) {
          bp.pharmRef.isCheckedIn = false;
        }
      }

      return this.state.branchSchedules[branchCode];
    } catch (err) {
      this.emitActivity('MANAGER', 'SCHEDULE', mgr?.user?.fullName || `Quản lý ${branchCode}`, branchCode, `Xếp lịch: ${err.message}`, null, 'WARN');
      return null;
    }
  }

  async ensureAllBranchesScheduled(options = {}) {
    if (this._scheduleSyncPromise && !options.forceRebuild) {
      return await this._scheduleSyncPromise;
    }

    const syncTask = (async () => {
      const branchCodeSet = new Set([
        ...this.state.branches.map(b => b.branchCode),
        ...Object.values(this.state.tokens.pharmacists).map(p => p.branchId || 'BR-001'),
      ]);

      for (const code of branchCodeSet) {
        if (!code || code === 'CENTRAL_WH' || code === 'ALL') continue;
        await this.ensureBranchShiftsAndSchedule(code, options);
      }
      this.state.lastScheduleSyncDate = getVietnamTodayStr();
    })();

    if (!options.forceRebuild) {
      this._scheduleSyncPromise = syncTask;
    }
    try {
      await syncTask;
    } finally {
      if (this._scheduleSyncPromise === syncTask) {
        this._scheduleSyncPromise = null;
      }
    }
  }

  async triggerWeeklySchedule() {
    const todayStr = getVietnamTodayStr();
    const currentWeekMonday = getWeekMondayStr(todayStr);
    const nextWeekMonday = addDaysStr(currentWeekMonday, 7);

    // Đảm bảo cả tuần hiện tại và tuần kế tiếp đều được tạo Ca làm việc và Đăng lịch đầy đủ
    for (const br of this.state.branches) {
      await this.ensureBranchShiftsAndSchedule(br.branchCode, {
        forceRebuild: true,
        weekStartOverride: nextWeekMonday,
      });
      await this.ensureBranchShiftsAndSchedule(br.branchCode, {
        forceRebuild: true,
        weekStartOverride: currentWeekMonday,
      });
    }
    this.state.lastScheduleSyncDate = todayStr;
  }

  async triggerMonthlyPayroll() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    for (const br of this.state.branches) {
      const mgr = this.state.tokens.managers[br.branchCode];
      const token = mgr?.token || this.state.tokens.admin;
      if (!token) continue;

      try {
        await this.apiClient.get(
          `/api/hr/kpi/sales-report?branchId=${br.branchCode}&month=${month}&year=${year}`,
          token
        ).catch(() => null);

        const payroll = await this.apiClient.post('/api/hr/payroll/calculate', {
          branchId: br.branchCode,
          month,
          year,
          mealAllowanceRate: 40000,
        }, token);

        if (payroll?._id || payroll?.id) {
          const pId = payroll._id || payroll.id;
          await this.apiClient.patch(`/api/hr/payroll/${pId}/approve`, {}, token).catch(() => {});
        }

        const netTotal = payroll?.totalNet || 0;
        this.emitActivity(
          'MANAGER',
          'PAYROLL',
          mgr?.user?.fullName || `Quản lý ${br.branchCode}`,
          br.branchCode,
          `Đối soát KPI & phê duyệt bảng lương T${month}/${year} — Thực lĩnh: ${netTotal.toLocaleString('vi-VN')}đ`,
          netTotal
        );
      } catch (err) {
        this.emitActivity('MANAGER', 'PAYROLL', `Quản lý ${br.branchCode}`, br.branchCode, `Bảng lương: ${err.message}`, null, 'WARN');
      }
    }
  }

  // =========================================================================
  // 6. BÀN GIAO CA VÀ TAN CA
  // =========================================================================
  async triggerHandoverAndCheckout(pharm) {
    if (!pharm || !pharm.token) return;

    try {
      const liveStats = await this.apiClient.get('/api/hr/shift-handover/live-stats', pharm.token).catch(() => null);
      const expectedCash = liveStats?.expectedCashAmount || 1200000;

      await this.apiClient.post('/api/hr/shift-handover/submit', {
        shiftId: pharm.assignedShift?.shiftId || liveStats?.shiftId || 'CA_TIEUCHUAN',
        shiftName: pharm.assignedShift?.shiftName || liveStats?.shiftName || 'Ca tiêu chuẩn GPP',
        openingFloat: liveStats?.openingFloat || 1000000,
        systemCashSales: liveStats?.systemCashSales || 0,
        systemDigitalSales: liveStats?.systemDigitalSales || 0,
        systemOrderCount: liveStats?.systemOrderCount || 0,
        pettyExpenses: 0,
        actualCashAmount: expectedCash,
        discrepancyReason: 'Két tiền mặt khớp 100% với sổ quỹ POS.',
        controlledDrugsHandover: liveStats?.controlledDrugsChecklist || [],
        generalShiftNotes: 'Đã vệ sinh tủ thuốc GPP, đối chiếu số lượng lô thuốc kiểm soát đặc biệt.',
      }, pharm.token);

      const gps = jitterGps(pharm.branchLat, pharm.branchLng);
      await this.apiClient.post('/api/hr/attendance/check-out', {
        latitude: gps.latitude,
        longitude: gps.longitude,
        note: 'Hoàn thành bàn giao két tiền và check-out đúng quy định',
      }, pharm.token);

      const doneKey = pharm.activeShiftKey || pharm.assignedShift?._shiftKey || `${getVietnamTodayStr()}_${pharm.assignedShift?.shiftId || 'DEFAULT'}`;
      if (pharm.completedShiftKeys instanceof Set) {
        pharm.completedShiftKeys.add(doneKey);
      }
      pharm.isCompleted = true;
      pharm.isCheckedIn = false;
      pharm.activeShiftKey = null;
      this.emitActivity(
        'PHARMACIST',
        'ATTENDANCE',
        pharm.user?.fullName || 'Dược sĩ',
        pharm.branchId,
        `Nộp Biên bản bàn giao két (${expectedCash.toLocaleString('vi-VN')}đ) và Check-out tan ca! Quầy POS sẵn sàng chuyển giao cho ca trực tiếp theo.`
      );

      // Tự động chuyển giao ca: kích hoạt Dược sĩ kế tiếp của chi nhánh đang trong khung giờ ca trực vào nhận ca
      const nextPharm = Object.values(this.state.tokens.pharmacists).find(
        p => p.branchId === pharm.branchId && p !== pharm && p.scheduledToday && !p.isCompleted
      );
      if (nextPharm) {
        setTimeout(() => {
          this.simulatePharmacistPOSAndAttendance().catch(() => {});
        }, 1500);
      }
    } catch (err) {
      this.emitActivity('PHARMACIST', 'ATTENDANCE', pharm.user?.fullName || 'Dược sĩ', pharm.branchId, `Bàn giao ca: ${err.message}`, null, 'WARN');
    }
  }
}

module.exports = {
  BotEngine,
  BRANCH_PROFILES,
  jitterGps,
  randomPick,
  pickWeighted,
  generateBatchNo,
  getVietnamTodayStr,
  getWeekMondayStr,
  addDaysStr,
  evaluateShiftWindow,
};
