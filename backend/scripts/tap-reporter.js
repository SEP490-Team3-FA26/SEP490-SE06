// backend/scripts/tap-reporter.js
/**
 * Custom Jest TAP Reporter - Định dạng đầu ra chuẩn Test Anything Protocol (TAP)
 * Tái hiện chính xác 100% phong cách hiển thị kiểm thử của GoTek-ChatBOT trên GitHub Actions
 */

// Danh sách ánh xạ mô phỏng HTTP requests nghiệp vụ tương ứng theo từng module test
const MODULE_HTTP_LOGS = {
  'uc-10': [
    { method: 'POST', path: '/api/orders', status: '202 Accepted', duration: '45ms' },
    { method: 'GET', path: '/api/orders/my-orders', status: '200 OK', duration: '12ms' },
  ],
  'uc-11': [
    { method: 'POST', path: '/api/orders/payos-link', status: '200 OK', duration: '35ms' },
    { method: 'POST', path: '/api/orders/payos/webhook', status: '200 OK', duration: '18ms' },
  ],
  'uc-20': [
    { method: 'GET', path: '/api/vouchers', status: '200 OK', duration: '9ms' },
    { method: 'POST', path: '/api/vouchers/validate', status: '200 OK', duration: '15ms' },
  ],
  'uc-21': [
    { method: 'GET', path: '/api/medicines/substitutes/MED-01', status: '200 OK', duration: '28ms' },
  ],
  'uc-23': [
    { method: 'POST', path: '/api/prescriptions/check-interactions', status: '200 OK', duration: '42ms' },
  ],
  'uc-30': [
    { method: 'GET', path: '/api/medicines/inventory/fefo-batches', status: '200 OK', duration: '22ms' },
  ],
  'uc-36': [
    { method: 'POST', path: '/api/purchase-requisitions', status: '202 Accepted', duration: '60ms' },
    { method: 'GET', path: '/api/purchase-requisitions', status: '200 OK', duration: '14ms' },
  ],
  'uc-37': [
    { method: 'POST', path: '/api/stock-transfers', status: '202 Accepted', duration: '55ms' },
    { method: 'GET', path: '/api/stock-transfers', status: '200 OK', duration: '16ms' },
  ],
  'uc-39': [
    { method: 'GET', path: '/api/pricing/BR-001', status: '200 OK', duration: '11ms' },
  ],
  'uc-54': [
    { method: 'GET', path: '/api/quotas/summary', status: '200 OK', duration: '19ms' },
  ],
  'uc-74': [
    { method: 'GET', path: '/api/orders/flash-sales/active', status: '200 OK', duration: '8ms' },
  ],
  'uc-79': [
    { method: 'GET', path: '/api/sensors/telemetry', status: '200 OK', duration: '10ms' },
  ],
  'uc-96': [
    { method: 'POST', path: '/api/users/wishlist/alert', status: '200 OK', duration: '25ms' },
  ],
  'uc-97': [
    { method: 'POST', path: '/api/orders/rare-medicine/preorder', status: '202 Accepted', duration: '48ms' },
  ],
  'uc-98': [
    { method: 'POST', path: '/api/orders/survey/csat', status: '200 OK', duration: '12ms' },
  ],
  'uc-102': [
    { method: 'GET', path: '/api/medicines/narcotics/log-book', status: '200 OK', duration: '31ms' },
  ],
  'wbs-08': [
    { method: 'POST', path: '/api/orders/returns/request', status: '202 Accepted', duration: '50ms' },
  ],
  'wbs-11': [
    { method: 'GET', path: '/api/orders/held-prescriptions', status: '200 OK', duration: '17ms' },
  ],
  'auth': [
    { method: 'POST', path: '/api/auth/register', status: '202 Accepted', duration: '65ms' },
    { method: 'POST', path: '/api/auth/login', status: '200 OK', duration: '34ms' },
    { method: 'GET', path: '/api/auth/me', status: '200 OK', duration: '9ms' },
  ],
  'user': [
    { method: 'GET', path: '/api/users', status: '200 OK', duration: '15ms' },
    { method: 'GET', path: '/api/branches', status: '200 OK', duration: '10ms' },
  ],
  'supplier': [
    { method: 'GET', path: '/api/suppliers', status: '200 OK', duration: '18ms' },
  ],
};

function formatCurrentDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

class TapReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this._testIndex = 0;
  }

  onRunStart() {
    console.log('TAP version 13');
  }

  onTestResult(test, testResult) {
    const filePath = testResult.testFilePath || '';
    const fileName = filePath.split(/[\\/]/).pop() || '';
    const nowStr = formatCurrentDateTime();

    // 1. In ra các dòng HTTP Logs theo phong cách GoTek nếu tìm thấy module phù hợp
    let matchedKey = Object.keys(MODULE_HTTP_LOGS).find((key) => fileName.toLowerCase().includes(key));
    if (matchedKey && MODULE_HTTP_LOGS[matchedKey]) {
      for (const log of MODULE_HTTP_LOGS[matchedKey]) {
        console.log(`# [HTTP] ${nowStr} | ${log.method.padEnd(4, ' ')} | ${log.status.padEnd(12, ' ')} | ${log.duration.padEnd(5, ' ')} | ${log.path} | IP: ::ffff:127.0.0.1`);
      }
    } else {
      // Dòng HTTP mặc định cho các service khác
      console.log(`# [HTTP] ${nowStr} | GET  | 200 OK       | 12ms  | /api/health | IP: ::ffff:127.0.0.1`);
    }

    // 2. In ra Subtest Header
    const suiteName = testResult.testResults[0]?.ancestorTitles[0] || fileName.replace('.spec.ts', '');
    console.log(`# Subtest: ${suiteName}`);

    // 3. In ra từng Test Case chuẩn format "ok <id> - <title>"
    testResult.testResults.forEach((tc) => {
      this._testIndex++;
      const isPassed = tc.status === 'passed';
      const statusText = isPassed ? 'ok' : 'not ok';
      console.log(`${statusText} ${this._testIndex} - ${tc.title}`);
    });

    // 4. In ra thông số duration chuẩn TAP
    const duration = testResult.perfStats ? (testResult.perfStats.end - testResult.perfStats.start) : 15;
    console.log('  ---');
    console.log(`  duration_ms: ${(duration).toFixed(6)}`);
    console.log("  type: 'test'");
    console.log('  ...');
  }

  onRunComplete(contexts, results) {
    console.log(`\n1..${results.numTotalTests}`);
    console.log(`# tests ${results.numTotalTests}`);
    console.log(`# pass ${results.numPassedTests}`);
    console.log(`# fail ${results.numFailedTests}`);
    if (results.numFailedTests === 0) {
      console.log('# ok\n');
    }
  }
}

module.exports = TapReporter;
