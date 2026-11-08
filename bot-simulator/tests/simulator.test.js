// Bộ kiểm thử toàn diện cho ABC Pharmacy Bot Simulator v2.0 Clean & Biased Randomness
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const ApiClient = require('../src/api-client');
const { BotEngine, BRANCH_PROFILES, jitterGps, randomPick, pickWeighted, generateBatchNo, getVietnamTodayStr, getWeekMondayStr } = require('../src/bot-engine');
const Scheduler = require('../src/scheduler');
const {
  CUSTOMER_NAMES,
  COD_DELIVERY_ADDRESSES,
  SEARCH_KEYWORDS_WEIGHTED,
  POSITIVE_REVIEWS_POOL,
  NEGATIVE_REVIEWS_POOL,
  SUPPLIERS_POOL,
  PR_REASON_NOTES,
  GRN_RECEIPT_NOTES,
  STOCK_TRANSFER_NOTES,
} = require('../src/data-pools');

describe('1. Data Pools & Utility Functions', () => {
  test('randomPick trả về phần tử hợp lệ và an toàn với mảng rỗng', () => {
    assert.strictEqual(randomPick([]), null);
    assert.strictEqual(randomPick(null), null);

    const arr = [1, 2, 3];
    const picked = randomPick(arr);
    assert.ok(arr.includes(picked));
  });

  test('pickWeighted lựa chọn phần tử theo tỉ lệ trọng số', () => {
    const items = [
      { id: 'rare', weight: 1 },
      { id: 'frequent', weight: 99 },
    ];
    let frequentCount = 0;
    for (let i = 0; i < 100; i++) {
      const picked = pickWeighted(items, it => it.weight);
      if (picked.id === 'frequent') frequentCount++;
    }
    assert.ok(frequentCount > 80, 'Phần tử trọng số cao phải xuất hiện áp đảo');
  });

  test('jitterGps sinh tọa độ trong phạm vi an toàn Haversine (dưới 50m)', () => {
    const originLat = 10.7769;
    const originLng = 106.7009;

    for (let i = 0; i < 50; i++) {
      const gps = jitterGps(originLat, originLng);
      assert.ok(Math.abs(gps.latitude - originLat) <= 0.0003, 'Độ lệch lat vượt ngưỡng');
      assert.ok(Math.abs(gps.longitude - originLng) <= 0.0003, 'Độ lệch lng vượt ngưỡng');
      assert.strictEqual(typeof gps.latitude, 'number');
      assert.strictEqual(typeof gps.longitude, 'number');
    }
  });

  test('generateBatchNo tạo mã số lô hợp lệ có tiền tố và năm tháng', () => {
    const batch = generateBatchNo('LOT');
    assert.ok(batch.startsWith('LOT-'));
    assert.strictEqual(batch.split('-').length, 3);
  });

  test('Data pools có đầy đủ dữ liệu mẫu tiếng Việt có dấu cho cả 4 nhóm bot', () => {
    assert.ok(CUSTOMER_NAMES.length >= 10, 'Danh sách khách hàng phải có ít nhất 10 tên');
    assert.ok(COD_DELIVERY_ADDRESSES.length >= 10, 'Danh sách địa chỉ COD phải có ít nhất 10 địa chỉ 4 cấp');
    assert.ok(SEARCH_KEYWORDS_WEIGHTED.length >= 5, 'Danh sách từ khóa phải có ít nhất 5 mục');
    assert.ok(POSITIVE_REVIEWS_POOL.length >= 3, 'Pool review tích cực phải có ít nhất 3 mục');
    assert.ok(NEGATIVE_REVIEWS_POOL.length >= 2, 'Pool review tiêu cực phải có ít nhất 2 mục');
    assert.ok(SUPPLIERS_POOL.length >= 3, 'Danh sách nhà cung cấp phải có ít nhất 3 mục');
    assert.ok(PR_REASON_NOTES.length >= 2, 'Ghi chú PR phải có ít nhất 2 mục');
    assert.ok(GRN_RECEIPT_NOTES.length >= 2, 'Ghi chú GRN phải có ít nhất 2 mục');
    assert.ok(STOCK_TRANSFER_NOTES.length >= 2, 'Ghi chú Transfer phải có ít nhất 2 mục');
  });
});

describe('2. ApiClient Module with Retry & Ping', () => {
  let mockServer;
  let mockPort;
  let receivedRequests = [];

  before(async () => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        receivedRequests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body ? JSON.parse(body) : null,
        });

        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        if (req.url === '/api/error') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Bad Request Test' }));
          return;
        }

        if (req.url === '/api/gateway-timeout') {
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Gateway Timeout' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: 'ok' }));
      });
    });

    await new Promise(resolve => mockServer.listen(0, resolve));
    mockPort = mockServer.address().port;
  });

  after(async () => {
    await new Promise(resolve => mockServer.close(resolve));
  });

  test('ApiClient gửi GET request thành công', async () => {
    const client = new ApiClient(`http://localhost:${mockPort}`);
    const res = await client.get('/api/test');
    assert.deepStrictEqual(res, { success: true, data: 'ok' });
  });

  test('ApiClient gửi POST kèm Bearer token và custom headers', async () => {
    const client = new ApiClient(`http://localhost:${mockPort}`);
    await client.post('/api/create', { name: 'ABC' }, 'test-token-123', { 'x-custom': 'val' });

    const lastReq = receivedRequests[receivedRequests.length - 1];
    assert.strictEqual(lastReq.method, 'POST');
    assert.strictEqual(lastReq.url, '/api/create');
    assert.strictEqual(lastReq.headers['authorization'], 'Bearer test-token-123');
    assert.strictEqual(lastReq.headers['x-custom'], 'val');
    assert.deepStrictEqual(lastReq.body, { name: 'ABC' });
  });

  test('ApiClient ném lỗi ngay lập tức khi server trả 400', async () => {
    const client = new ApiClient(`http://localhost:${mockPort}`);
    await assert.rejects(
      async () => client.get('/api/error'),
      {
        name: 'Error',
        message: 'Bad Request Test',
      }
    );
  });

  test('ApiClient ping trả về latency hợp lệ', async () => {
    const client = new ApiClient(`http://localhost:${mockPort}`);
    const ping = await client.ping();
    assert.strictEqual(ping.ok, true);
    assert.strictEqual(typeof ping.latencyMs, 'number');
  });

  test('ApiClient tắt retry mặc định cho thao tác ghi (POST/PATCH) để chống tạo đơn trùng khi mất phản hồi', async () => {
    const client = new ApiClient(`http://localhost:${mockPort}`);
    const beforeCount = receivedRequests.filter(r => r.url === '/api/gateway-timeout' && r.method === 'POST').length;

    await assert.rejects(
      async () => client.post('/api/gateway-timeout', { order: 1 }),
      /Gateway Timeout/
    );

    const afterCount = receivedRequests.filter(r => r.url === '/api/gateway-timeout' && r.method === 'POST').length;
    assert.strictEqual(afterCount - beforeCount, 1, 'POST mặc định chỉ được gửi đúng 1 lần, không tự động retry');
  });
});

describe('3. Scheduler Module with 4 Timers & Scenarios', () => {
  test('Scheduler bật, tắt, cập nhật tốc độ và phân bổ 4 luồng nghiệp vụ', () => {
    const dummyEngine = {
      state: { speedMultiplier: 1, isRunning: false, currentScenario: 'NORMAL' },
      simulateCustomerBrowsing: async () => {},
      simulateCustomerOrderAndReview: async () => {},
      simulatePharmacistPOSAndAttendance: async () => {},
      simulateWarehouseOperations: async () => {},
    };

    const dummyConfig = {
      intervals: {
        browsingBaseMs: 3000,
        orderBaseMs: 8000,
        posBaseMs: 5000,
        warehouseBaseMs: 10000,
      },
    };

    const scheduler = new Scheduler(dummyEngine, dummyConfig);
    scheduler.start();
    assert.ok(scheduler.browseTimer !== null);
    assert.ok(scheduler.orderTimer !== null);
    assert.ok(scheduler.posTimer !== null);
    assert.ok(scheduler.warehouseTimer !== null);

    scheduler.updateSpeed(15);
    assert.strictEqual(dummyEngine.state.speedMultiplier, 15);

    // Kiểm tra giới hạn biên tốc độ (tối đa 60x, tối thiểu 1x)
    scheduler.updateSpeed(100);
    assert.strictEqual(dummyEngine.state.speedMultiplier, 60);

    scheduler.updateSpeed(-5);
    assert.strictEqual(dummyEngine.state.speedMultiplier, 1);

    scheduler.stop();
    assert.strictEqual(scheduler.browseTimer, null);
    assert.strictEqual(scheduler.orderTimer, null);
    assert.strictEqual(scheduler.posTimer, null);
    assert.strictEqual(scheduler.warehouseTimer, null);
  });
});

describe('4. BotEngine End-to-End Simulation Flow with Biased Randomness', () => {
  let mockGateway;
  let gatewayPort;
  let loggedActions = [];
  let lastOrderBody = null;

  before(async () => {
    mockGateway = http.createServer((req, res) => {
      let bodyStr = '';
      req.on('data', chunk => bodyStr += chunk);
      req.on('end', () => {
        let body = null;
        try { body = JSON.parse(bodyStr); } catch {}

        if (req.url === '/api/sales' && body?.items?.[0]?.medicineId === 'med-out-of-stock') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Chi nhánh BR-001 không có tồn kho khả dụng cho thuốc "Thuốc Hết Hàng".' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });

        if (req.url.startsWith('/api/medicines')) {
          res.end(JSON.stringify({
            data: [
              { id: 'med-001', name: 'Panadol Extra Đỏ', price: 45000, stock: 100, unit: 'Hộp', prescription_status: 0 },
              { id: 'med-002', name: 'Cao dán Salonpas', price: 35000, stock: 80, unit: 'Gói', prescription_status: 0 },
              { id: 'med-003', name: 'Vitamin C 1000mg', price: 85000, stock: 60, unit: 'Tuýp', prescription_status: 0 },
              { id: 'med-004', name: 'Amoxicillin 500mg', price: 90000, stock: 50, unit: 'Hộp', prescription_status: 1 }
            ]
          }));
        } else if (req.url === '/api/auth/login') {
          res.end(JSON.stringify({
            access_token: 'mock-jwt-token',
            user: {
              id: 'user-001',
              fullName: 'DS. Test',
              email: body?.email,
              role: body?.email?.includes('pharmacist') ? 'pharmacist' : 'admin',
              branchId: 'BR-001'
            }
          }));
        } else if (req.url === '/api/branches') {
          res.end(JSON.stringify([
            { branchCode: 'BR-001', name: 'Chi nhánh 1', latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 }
          ]));
        } else if (req.url === '/api/suppliers') {
          res.end(JSON.stringify([
            { supplierCode: 'SUP-01', name: 'Dược Hậu Giang' }
          ]));
        } else if (req.url.startsWith('/api/branches/') && req.url.endsWith('/location')) {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/recommendations/search-log') {
          res.end(JSON.stringify({ status: 'Accepted' }));
        } else if (req.url === '/api/orders') {
          lastOrderBody = body;
          res.end(JSON.stringify({
            orderCode: 998811,
            order: { _id: 'ord-001', totalAmount: body?.totalAmount || 45000 }
          }));
        } else if (req.url.includes('/reviews')) {
          res.end(JSON.stringify({ success: true, reviewId: 'rev-001' }));
        } else if (req.url === '/api/feedbacks') {
          res.end(JSON.stringify({ success: true, _id: 'fb-001' }));
        } else if (req.url.endsWith('/resolve')) {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/hr/attendance/check-in') {
          res.end(JSON.stringify({ success: true, distanceMeters: 16 }));
        } else if (req.url === '/api/sales') {
          res.end(JSON.stringify({ success: true, totalAmount: 45000 }));
        } else if (req.url === '/api/purchase-requisitions') {
          res.end(JSON.stringify({ _id: 'pr-101', prCode: 'PR-8812', data: { _id: 'pr-101', prCode: 'PR-8812' } }));
        } else if (req.url === '/api/purchase-orders/auto-route') {
          res.end(JSON.stringify({ _id: 'po-201', poCode: 'PO-9901', data: { _id: 'po-201', poCode: 'PO-9901' } }));
        } else if (req.url === '/api/purchase-orders/approve-pay') {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/goods-receipts') {
          res.end(JSON.stringify({ success: true, _id: 'grn-301', data: { _id: 'grn-301' } }));
        } else if (req.url === '/api/goods-receipts/inspections') {
          res.end(JSON.stringify({
            success: true,
            data: {
              _id: 'insp-301',
              items: [{ _id: 'insp-item-1', medicineId: 'med-001', expectedQty: 50 }],
            },
          }));
        } else if (req.url === '/api/goods-receipts/inspections/verify') {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url.endsWith('/submit-inspection') || req.url.endsWith('/approve')) {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/stock-transfers' || req.url === '/api/stock-transfers/direct') {
          res.end(JSON.stringify({
            success: true,
            _id: 'tf-401',
            data: {
              _id: 'tf-401',
              transferCode: 'ST-20261107-0001',
              items: [{ medicineId: 'med-001', batchNo: 'LOT-2611-1111', quantity: 25 }],
            },
          }));
        } else if (req.url.startsWith('/api/stock-transfers/') && req.url.endsWith('/receive')) {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/hr/schedules' || req.url === '/api/hr/schedules/publish') {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/hr/payroll/calculate') {
          res.end(JSON.stringify({ _id: 'pay-001', totalNet: 18500000 }));
        } else if (req.url.includes('/payroll/') && req.url.endsWith('/approve')) {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/hr/shift-handover/live-stats') {
          res.end(JSON.stringify({ shiftId: 'CA_01', expectedCashAmount: 1200000 }));
        } else if (req.url === '/api/hr/shift-handover/submit') {
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === '/api/hr/attendance/check-out') {
          res.end(JSON.stringify({ success: true }));
        } else {
          res.end(JSON.stringify({ status: 'ok' }));
        }
      });
    });

    await new Promise(resolve => mockGateway.listen(0, resolve));
    gatewayPort = mockGateway.address().port;
  });

  after(async () => {
    await new Promise(resolve => mockGateway.close(resolve));
  });

  function getTestConfig() {
    return {
      gatewayUrl: `http://localhost:${gatewayPort}`,
      credentials: {
        admin: { email: 'admin@vinapharmacy.com', password: '123' },
        warehouse: { email: 'warehouse@vinapharmacy.com', password: '123' },
        manager: { email: 'manager@vinapharmacy.com', password: '123' },
        pharmacist: { email: 'pharmacist@vinapharmacy.com', password: '123' },
        customer: { email: 'user@vinapharmacy.com', password: '123' },
      },
      defaultBranches: [
        {
          branchCode: 'BR-001',
          name: 'CN1',
          lat: 10.7769,
          lng: 106.7009,
          radius: 200,
          shiftSchedule: { morningStart: '06:00', morningEnd: '14:00' }
        }
      ],
      intervals: { browsingBaseMs: 3000, orderBaseMs: 5000, posBaseMs: 4000, warehouseBaseMs: 6000 }
    };
  }

  test('BotEngine bootstrap nhận diện Hero Best-seller và phân loại nhân sự', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.setEmitter((role, badge, actorName, branchId, actionText, amount, status) => {
      loggedActions.push({ role, badge, actorName, branchId, actionText, amount, status });
    });

    await engine.bootstrap();

    assert.strictEqual(engine.state.allMedicines.length, 4);
    assert.strictEqual(engine.state.otcMedicines.length, 3, 'Chỉ 3 thuốc OTC được phép bán online');
    assert.ok(engine.state.heroMedicines.length > 0, 'Phải xác định được nhóm thuốc Hero best-seller');
    assert.ok(engine.state.problematicMedicines.length > 0, 'Phải xác định được nhóm thuốc Problematic');
    const heroIds = new Set(engine.state.heroMedicines.map(m => m.id));
    assert.ok(
      engine.state.problematicMedicines.every(pm => !heroIds.has(pm.id)),
      'Tập Hero và Problematic phải tách bạch hoàn toàn, không giao nhau'
    );
    assert.ok(engine.state.tokens.admin !== null);
    assert.ok(engine.state.tokens.warehouse !== null);
    assert.ok(Object.keys(engine.state.tokens.pharmacists).length > 0);
  });

  test('simulateCustomerBrowsing tìm kiếm với thiên vị từ khóa', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.isRunning = true;
    engine.setEmitter((role, badge) => {
      loggedActions.push({ role, badge });
    });

    await engine.simulateCustomerBrowsing();
    assert.ok(engine.state.stats.activeViewers > 0);
    assert.ok(engine.state.stats.totalSearches > 0);
  });

  test('simulateCustomerOrderAndReview 100% COD và có đầy đủ địa chỉ 4 cấp', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.isRunning = true;
    engine.state.otcMedicines = [
      { id: 'med-001', name: 'Panadol Extra', price: 45000, unit: 'Hộp' }
    ];
    engine.state.heroMedicines = engine.state.otcMedicines;
    engine.setEmitter(() => {});

    await engine.simulateCustomerOrderAndReview();

    assert.strictEqual(engine.state.stats.totalOrders, 1);
    assert.ok(engine.state.stats.totalRevenue >= 45000);

    // Kiểm tra 100% COD và địa chỉ giao hàng
    assert.strictEqual(lastOrderBody.paymentMethod, 'CASH', 'Phương thức thanh toán phải là CASH đại diện cho COD');
    assert.ok(lastOrderBody.shippingAddress && lastOrderBody.shippingAddress.includes('Phường'), 'Địa chỉ phải có cấp Phường/Xã');
    assert.ok(lastOrderBody.shippingAddress.includes('Quận') || lastOrderBody.shippingAddress.includes('TP.'), 'Địa chỉ phải có cấp Quận/Huyện');

    assert.strictEqual(engine.state.pendingReviewQueue.length, 1);
    assert.strictEqual(engine.state.pendingReviewQueue[0].orderCode, '998811');
  });

  test('simulatePharmacistPOSAndAttendance check-in theo ca và bán lẻ POS (Không bán sỉ)', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.isRunning = true;
    engine.state.allMedicines = [
      { id: 'med-001', name: 'Panadol Extra', price: 45000, unit: 'Hộp' }
    ];
    engine.state.tokens.pharmacists = {
      'pharm-punctual': {
        token: 'mock-token',
        user: { fullName: 'DS. Nguyễn Văn A' },
        persona: 'PUNCTUAL',
        branchId: 'BR-001',
        branchLat: 10.7769,
        branchLng: 106.7009,
        shiftSchedule: { morningStart: '06:00', morningEnd: '14:00' },
        isCheckedIn: false
      }
    };
    engine.setEmitter(() => {});

    await engine.simulatePharmacistPOSAndAttendance();

    const pharm = engine.state.tokens.pharmacists['pharm-punctual'];
    assert.strictEqual(pharm.isCheckedIn, true);
    assert.strictEqual(engine.state.stats.totalCheckIns, 1);
    assert.strictEqual(engine.state.stats.totalOrders, 1);
  });

  test('Warehouse Operations tạo PR theo nhu cầu Hero, tạo PO và nhập GRN', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.isRunning = true;
    engine.state.tokens.admin = 'mock-admin-token';
    engine.state.tokens.warehouse = 'mock-wh-token';
    engine.state.allMedicines = [
      { id: 'med-001', name: 'Panadol Extra', price: 45000, unit: 'Hộp' }
    ];
    engine.state.heroMedicines = engine.state.allMedicines;
    engine.setEmitter(() => {});

    await engine.simulateWarehouseOperations(true);
    assert.strictEqual(engine.state.stats.totalPRs, 1);
    assert.strictEqual(engine.state.stats.totalPOs, 1);
    assert.strictEqual(engine.state.stats.totalGRNs, 1);
    assert.strictEqual(engine.state.stats.totalStockTransfers, 1);
  });

  test('Khi bán lẻ POS gặp lỗi hết thuốc (409), Bot tự động kích hoạt nhập hàng khẩn cấp (PR -> PO -> GRN -> Transfer -> Receive)', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.isRunning = true;
    engine.state.tokens.admin = 'mock-admin-token';
    engine.state.tokens.warehouse = 'mock-wh-token';
    engine.state.tokens.managers = {
      'BR-001': { token: 'mock-mgr-token', user: { fullName: 'QL Chi Nhánh 1' } }
    };
    engine.state.allMedicines = [
      { id: 'med-out-of-stock', name: 'Thuốc Hết Hàng', price: 60000, unit: 'Hộp' }
    ];
    engine.state.heroMedicines = engine.state.allMedicines;
    engine.state.tokens.pharmacists = {
      'pharm-1': {
        token: 'mock-pharm-token',
        user: { fullName: 'DS. Trực Quầy' },
        persona: 'PUNCTUAL',
        branchId: 'BR-001',
        branchLat: 10.7769,
        branchLng: 106.7009,
        isCheckedIn: true,
        isCompleted: false,
      }
    };
    const restockLogs = [];
    engine.setEmitter((role, badge, actorName, branchId, actionText) => {
      restockLogs.push({ role, badge, branchId, actionText });
    });

    await engine.simulatePharmacistPOSAndAttendance();

    assert.strictEqual(engine.state.stats.totalPRs, 1, 'Phải tự động tạo PR khi hết thuốc');
    assert.strictEqual(engine.state.stats.totalPOs, 1, 'Phải tự động tạo và duyệt PO khi hết thuốc');
    assert.strictEqual(engine.state.stats.totalGRNs, 1, 'Phải tự động kiểm đếm và duyệt GRN khi hết thuốc');
    assert.strictEqual(engine.state.stats.totalStockTransfers, 1, 'Phải tự động điều chuyển và nhận hàng về chi nhánh bị hết thuốc');
    assert.ok(
      restockLogs.some(l => l.role === 'MANAGER' && l.badge === 'TRANSFER' && l.actionText.includes('Xác nhận nhận hàng')),
      'Quản lý chi nhánh phải xác nhận nhận hàng chuyển kho'
    );
  });

  test('triggerWeeklySchedule tạo và publish lịch tuần', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.tokens.admin = 'mock-admin-token';
    engine.setEmitter(() => {});

    await engine.triggerWeeklySchedule();
    assert.ok(true);
  });

  test('triggerMonthlyPayroll tính và duyệt bảng lương tháng', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.tokens.admin = 'mock-admin-token';
    engine.setEmitter(() => {});

    await engine.triggerMonthlyPayroll();
    assert.ok(true);
  });

  test('triggerHandoverAndCheckout bàn giao ca và check-out tan ca', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.setEmitter(() => {});

    const mockPharm = {
      token: 'mock-token',
      user: { fullName: 'DS. Bàn Giao' },
      branchId: 'BR-001',
      branchLat: 10.7769,
      branchLng: 106.7009,
      isCheckedIn: true,
    };

    await engine.triggerHandoverAndCheckout(mockPharm);
    assert.strictEqual(mockPharm.isCheckedIn, false);
  });

  test('Scenarios và ResetStats hoạt động chính xác', () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.setEmitter(() => {});

    assert.strictEqual(engine.setScenario('RUSH_HOUR'), true);
    assert.strictEqual(engine.state.currentScenario, 'RUSH_HOUR');

    assert.strictEqual(engine.setScenario('INVALID_SCENARIO'), false);
    assert.strictEqual(engine.state.currentScenario, 'RUSH_HOUR');

    engine.state.stats.totalOrders = 50;
    engine.resetStats();
    assert.strictEqual(engine.state.stats.totalOrders, 0);
  });

  test('Phân tầng lưu lượng Chi nhánh (1), chất lượng SLA Chi nhánh (2) và tách bạch Hero vs Problematic (4)', () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    cfg.defaultBranches = [
      { branchCode: 'BR-001', name: 'CN1' },
      { branchCode: 'BR-002', name: 'CN2' },
      { branchCode: 'BR-003', name: 'CN3' },
      { branchCode: 'BR-004', name: 'CN4' },
      { branchCode: 'BR-006', name: 'CN6' },
    ];
    const engine = new BotEngine(client, cfg);

    // Kiểm tra hồ sơ SLA và đánh giá xấu giữa BR-001 (Flagship) và BR-003 (Quá tải)
    assert.ok(BRANCH_PROFILES['BR-001'].trafficWeight > BRANCH_PROFILES['BR-006'].trafficWeight);
    assert.ok(BRANCH_PROFILES['BR-001'].negativeReviewRate < BRANCH_PROFILES['BR-003'].negativeReviewRate);
    assert.ok(BRANCH_PROFILES['BR-001'].slaResolveRate > BRANCH_PROFILES['BR-003'].slaResolveRate);

    // Kiểm tra phân phối pickBranchWeighted trong 300 lần chọn
    const counts = { 'BR-001': 0, 'BR-006': 0 };
    for (let i = 0; i < 300; i++) {
      const b = engine.pickBranchWeighted();
      if (counts[b.branchCode] !== undefined) counts[b.branchCode]++;
    }
    assert.ok(counts['BR-001'] > counts['BR-006'] * 2, 'BR-001 phải có lưu lượng gấp nhiều lần BR-006');
  });

  test('Quản lý tự động tạo Ca làm việc, Đăng lịch tuần và chỉ nhân viên có lịch hôm nay (A và B) mới Check-in đi làm, người nghỉ (C) không Check-in', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    cfg.defaultBranches = [
      {
        branchCode: 'BR-003',
        name: 'CN3 Đà Nẵng',
        lat: 16.0544,
        lng: 108.2022,
        radius: 200,
        shiftSchedule: { morningStart: '07:00', morningEnd: '15:00', afternoonStart: '14:00', afternoonEnd: '22:00' },
      },
    ];
    const engine = new BotEngine(client, cfg);
    engine.state.isRunning = true;
    engine.state.tokens.managers = {
      'BR-003': { token: 'mock-mgr-cn3-token', user: { id: 'mgr-cn3', fullName: 'Phạm Thị Lan (Quản Lý CN3)', branchId: 'BR-003' } },
    };
    engine.state.allMedicines = [
      { id: 'med-001', name: 'Panadol Extra', price: 45000, unit: 'Hộp' },
    ];
    engine.state.tokens.pharmacists = {
      'pharm-a': {
        employeeId: 'pharm-a',
        token: 'mock-token-a',
        user: { id: 'pharm-a', fullName: 'DS. Nguyễn Văn A' },
        persona: 'PUNCTUAL',
        branchId: 'BR-003',
        branchLat: 16.0544,
        branchLng: 108.2022,
        isCheckedIn: false,
      },
      'pharm-b': {
        employeeId: 'pharm-b',
        token: 'mock-token-b',
        user: { id: 'pharm-b', fullName: 'DS. Trần Thị B' },
        persona: 'BALANCED',
        branchId: 'BR-003',
        branchLat: 16.0544,
        branchLng: 108.2022,
        isCheckedIn: false,
      },
      'pharm-c': {
        employeeId: 'pharm-c',
        token: 'mock-token-c',
        user: { id: 'pharm-c', fullName: 'DS. Lê Văn C' },
        persona: 'CHRONIC_LATE',
        branchId: 'BR-003',
        branchLat: 16.0544,
        branchLng: 108.2022,
        isCheckedIn: false,
      },
    };
    engine.setEmitter(() => {});

    // Chạy 6 chu kỳ liên tiếp: Quản lý CN3 phải tự động đăng lịch tuần (2 người trực hôm nay, 1 người nghỉ)
    for (let i = 0; i < 6; i++) {
      await engine.simulatePharmacistPOSAndAttendance();
    }

    assert.ok(engine.state.branchSchedules['BR-003'], 'Chi nhánh BR-003 phải có lịch tuần được khởi tạo');
    assert.strictEqual(engine.state.branchSchedules['BR-003'].status, 'published', 'Lịch tuần BR-003 phải ở trạng thái published');

    const allPharms = Object.values(engine.state.tokens.pharmacists);
    const scheduledTodayPharms = allPharms.filter(p => p.scheduledToday);
    const offTodayPharms = allPharms.filter(p => !p.scheduledToday);

    assert.strictEqual(scheduledTodayPharms.length, 2, 'Hôm nay chỉ đúng 2 dược sĩ có lịch trực');
    assert.strictEqual(offTodayPharms.length, 1, 'Dược sĩ thứ 3 phải ở trạng thái nghỉ lịch hôm nay');
    assert.ok(scheduledTodayPharms.every(p => p.isCheckedIn === true), 'Cả 2 dược sĩ có lịch hôm nay phải đã Check-in đi làm');
    assert.strictEqual(offTodayPharms[0].isCheckedIn, false, 'Dược sĩ không có lịch hôm nay tuyệt đối không được Check-in');
  });

  test('Dược sĩ được phân công ca đôi (2 ca/ngày): Sau khi check-out ca 1, tự động chuyển tiếp và sẵn sàng vào ca 2', async () => {
    const client = new ApiClient(`http://localhost:${gatewayPort}`);
    const cfg = getTestConfig();
    const engine = new BotEngine(client, cfg);
    engine.state.isRunning = true;

    const todayStr = getVietnamTodayStr();
    const mockPharm = {
      employeeId: 'pharm-double',
      token: 'mock-double-token',
      user: { id: 'pharm-double', fullName: 'DS. Đặng Hữu Long' },
      persona: 'PUNCTUAL',
      branchId: 'BR-001',
      branchLat: 10.7769,
      branchLng: 106.7009,
      isCheckedIn: true,
      activeShiftKey: `${todayStr}_shift-morning`,
      completedShiftKeys: new Set(),
      assignedShift: {
        shiftId: 'shift-morning',
        shiftName: 'Ca Sáng',
        shiftStart: '06:00',
        shiftEnd: '14:00',
        _timing: { isShiftEnded: true },
      },
    };

    engine.state.tokens.pharmacists = { 'pharm-double': mockPharm };
    engine.state.branchSchedules['BR-001'] = {
      status: 'published',
      weekStart: getWeekMondayStr(todayStr),
      assignments: [
        {
          date: `${todayStr}T00:00:00.000Z`,
          employeeId: 'pharm-double',
          shiftId: 'shift-morning',
          shiftName: 'Ca Sáng',
          shiftStart: '06:00',
          shiftEnd: '14:00',
        },
        {
          date: `${todayStr}T00:00:00.000Z`,
          employeeId: 'pharm-double',
          shiftId: 'shift-afternoon',
          shiftName: 'Ca Chiều',
          shiftStart: '14:00',
          shiftEnd: '22:00',
        },
      ],
    };

    engine.setEmitter(() => {});

    // Gọi triggerHandoverAndCheckout để kết thúc Ca Sáng
    await engine.triggerHandoverAndCheckout(mockPharm);

    assert.strictEqual(mockPharm.isCheckedIn, false, 'Dược sĩ phải ở trạng thái chưa check-in sau khi check-out ca 1');
    assert.ok(mockPharm.completedShiftKeys.has(`${todayStr}_shift-morning`), 'Ca sáng phải được đưa vào danh sách hoàn thành');
    assert.strictEqual(mockPharm.isCompleted, false, 'Chưa hoàn thành ngày làm việc vì vẫn còn Ca Chiều');
    assert.strictEqual(mockPharm.assignedShift.shiftId, 'shift-afternoon', 'Ca tiếp theo phải tự động chuyển thành Ca Chiều');
  });
});

describe('5. Server Express API Endpoints & State Management', () => {
  const { server, engine } = require('../server');
  let appPort;
  let client;

  before(async () => {
    await new Promise(resolve => server.listen(0, resolve));
    appPort = server.address().port;
    client = new ApiClient(`http://localhost:${appPort}`);
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  test('GET /api/sim/state trả về trạng thái đầy đủ của simulator', async () => {
    const state = await client.get('/api/sim/state');
    assert.strictEqual(typeof state.isRunning, 'boolean');
    assert.strictEqual(typeof state.speedMultiplier, 'number');
    assert.ok(state.stats);
    assert.ok(Array.isArray(state.branches));
  });

  test('GET /api/sim/health trả về simulatorStatus ONLINE', async () => {
    const health = await client.get('/api/sim/health');
    assert.strictEqual(health.simulatorStatus, 'ONLINE');
    assert.strictEqual(typeof health.uptimeSeconds, 'number');
  });

  test('POST /api/sim/toggle bật và tắt thành công', async () => {
    const beforeState = engine.state.isRunning;
    const res1 = await client.post('/api/sim/toggle', {});
    assert.strictEqual(res1.isRunning, !beforeState);

    const res2 = await client.post('/api/sim/toggle', {});
    assert.strictEqual(res2.isRunning, beforeState);
  });

  test('POST /api/sim/speed cập nhật hệ số tốc độ', async () => {
    const res = await client.post('/api/sim/speed', { speed: 15 });
    assert.strictEqual(res.speedMultiplier, 15);
    assert.strictEqual(engine.state.speedMultiplier, 15);
  });

  test('POST /api/sim/scenario đổi kịch bản hợp lệ', async () => {
    const res = await client.post('/api/sim/scenario', { scenario: 'SUPPLY_CHAIN' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.state.currentScenario, 'SUPPLY_CHAIN');
  });

  test('POST /api/sim/reset đặt lại chỉ số KPI', async () => {
    engine.state.stats.totalOrders = 88;
    const res = await client.post('/api/sim/reset', {});
    assert.strictEqual(res.stats.totalOrders, 0);
  });

  test('GET /api/sim/export-logs trả về tập log hợp lệ', async () => {
    const exportData = await client.get('/api/sim/export-logs');
    assert.ok(exportData.exportedAt);
    assert.ok(Array.isArray(exportData.logs));
    assert.ok(exportData.stats);
  });

  test('POST /api/sim/trigger báo lỗi khi action không tồn tại', async () => {
    await assert.rejects(
      async () => client.post('/api/sim/trigger/non-existent-action', {}),
      {
        name: 'Error',
        status: 400,
      }
    );
  });

  test('GET /api/sim/map và GET /api/sim/history trả về sơ đồ ghế 2D theo chi nhánh và lịch sử SQLite', async () => {
    engine.emitActivity('PHARMACIST', 'POS', 'BR1-02. DS. Lê Thị Minh', 'BR-001', 'Bán lẻ POS 2 hộp Panadol', 90000, 'SUCCESS');
    engine.emitActivity('PHARMACIST', 'ATTENDANCE', 'BR3-03. DS. Vũ Quốc Huy', 'BR-003', 'Check-in GPS ca 07:00 [CHRONIC_LATE]: ĐI MUỘN (18m)', null, 'WARN');

    const mapRes = await client.get('/api/sim/map');
    assert.ok(Array.isArray(mapRes.seats), 'Phải trả về danh sách ghế ngồi trên bản đồ 2D');
    assert.ok(mapRes.seats.some(s => s.branchId === 'BR-001'), 'Phải có khoang BR-001');
    assert.ok(mapRes.seats.some(s => s.branchId === 'CENTRAL_WH'), 'Phải có khoang CENTRAL_WH');

    const seatId = 'PHARM:BR-001:BR1-02. DS. Lê Thị Minh';
    const histRes = await client.get(`/api/sim/history?seatId=${encodeURIComponent(seatId)}`);
    assert.ok(histRes.seat, 'Phải tìm thấy hồ sơ ghế trong SQLite');
    assert.strictEqual(histRes.seat.branchId, 'BR-001');
    assert.strictEqual(histRes.seat.totalOrders, 1);
    assert.strictEqual(histRes.seat.totalRevenue, 90000);
    assert.ok(Array.isArray(histRes.events) && histRes.events.length >= 1, 'Phải trả về lịch sử quá khứ của ghế');

    const branchHist = await client.get('/api/sim/history?branchId=BR-003');
    assert.ok(Array.isArray(branchHist.events));
    assert.ok(branchHist.events.some(e => e.branchId === 'BR-003' && e.status === 'WARN'));
  });
});

describe('6. 24/7 Resilience: Token Auto-Refresh & Circuit Breaker', () => {
  let authServer;
  let authPort;
  let authClient;
  let tokenRenewed = false;

  before(async () => {
    authServer = http.createServer((req, res) => {
      if (req.url === '/api/protected') {
        const auth = req.headers['authorization'];
        if (auth === 'Bearer OLD_EXPIRED_TOKEN') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Token expired' }));
          return;
        }
        if (auth === 'Bearer NEW_VALID_TOKEN') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: 'Access Granted' }));
          return;
        }
      }

      if (req.url === '/api/auth/login') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'NEW_VALID_TOKEN' }));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise(resolve => authServer.listen(0, resolve));
    authPort = authServer.address().port;
    authClient = new ApiClient(`http://127.0.0.1:${authPort}`);
  });

  after(async () => {
    await new Promise(resolve => authServer.close(resolve));
  });

  test('ApiClient tự động gọi onUnauthorized và retry thành công khi gặp 401', async () => {
    authClient.onUnauthorized = async (oldToken) => {
      assert.strictEqual(oldToken, 'OLD_EXPIRED_TOKEN');
      tokenRenewed = true;
      return 'NEW_VALID_TOKEN';
    };

    const res = await authClient.get('/api/protected', 'OLD_EXPIRED_TOKEN');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data, 'Access Granted');
    assert.strictEqual(tokenRenewed, true);
  });

  test('Scheduler không phát sinh request khi Gateway bị ngắt kết nối (Circuit Breaker)', async () => {
    let callCount = 0;
    const mockEngine = {
      state: {
        isRunning: true,
        speedMultiplier: 60,
        currentScenario: 'NORMAL',
        isGatewayOnline: false, // Mất mạng
      },
      simulateCustomerBrowsing: async () => { callCount++; },
      simulateCustomerOrderAndReview: async () => {},
      simulatePharmacistPOSAndAttendance: async () => {},
      simulateWarehouseOperations: async () => {},
    };

    const sched = new Scheduler(mockEngine, {
      intervals: { browsingBaseMs: 50, orderBaseMs: 500, posBaseMs: 500, warehouseBaseMs: 500 }
    });

    sched.start();
    await new Promise(r => setTimeout(r, 150));
    sched.stop();

    assert.strictEqual(callCount, 0, 'Không được bắn request khi isGatewayOnline = false');
  });

  test('pendingReviewQueue luôn giải phóng phần tử đã quá hạn và giới hạn kích thước tối đa để chống OOM', async () => {
    const dummyClient = {
      post: async () => ({ orderCode: 112233, order: { _id: 'ord-test', totalAmount: 45000 } }),
      patch: async () => ({ success: true }),
    };
    const dummyCfg = {
      credentials: {},
      defaultBranches: [{ branchCode: 'BR-001', name: 'CN1', lat: 10.77, lng: 106.70, radius: 200 }],
      intervals: { browsingBaseMs: 3000, orderBaseMs: 5000, posBaseMs: 4000, warehouseBaseMs: 6000 },
    };
    const engine = new BotEngine(dummyClient, dummyCfg);
    engine.state.isRunning = true;
    engine.state.otcMedicines = [{ id: 'med-1', name: 'Panadol', price: 45000, unit: 'Hộp' }];
    engine.state.heroMedicines = engine.state.otcMedicines;

    // 1. Nạp 120 bản ghi vào pendingReviewQueue và kiểm tra giới hạn trần <= 100
    for (let i = 0; i < 120; i++) {
      engine.state.pendingReviewQueue.push({
        orderCode: String(1000 + i),
        medicineId: 'med-1',
        medicineName: 'Panadol',
        isProblematicMed: false,
        customerName: 'Khách Test',
        branchId: 'BR-001',
        readyAt: Date.now() + 60000,
      });
    }
    await engine.simulateCustomerOrderAndReview();
    assert.ok(engine.state.pendingReviewQueue.length <= 100, 'Queue không được vượt quá ngưỡng giới hạn 100');

    // 2. Kiểm tra phần tử đã đến hạn (readyAt = 0) luôn được splice ra khỏi queue kể cả khi rơi vào nhánh 15% không gửi review
    engine.state.pendingReviewQueue = [
      {
        orderCode: '9001',
        medicineId: 'med-1',
        medicineName: 'Panadol',
        customerName: 'Khách Quá Hạn',
        branchId: 'BR-001',
        readyAt: 0,
      },
    ];
    const origRandom = Math.random;
    Math.random = () => 0.99; // Ép rơi vào nhánh >= 0.85 (không gửi review)
    try {
      await engine.simulateCustomerOrderAndReview();
    } finally {
      Math.random = origRandom;
    }

    assert.strictEqual(
      engine.state.pendingReviewQueue.some(r => r.orderCode === '9001'),
      false,
      'Phần tử quá hạn phải được splice khỏi pendingReviewQueue ngay cả khi khách bỏ qua đánh giá'
    );
  });
});
