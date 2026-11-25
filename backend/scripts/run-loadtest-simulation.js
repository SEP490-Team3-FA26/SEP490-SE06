/**
 * Script Chạy Load Testing Mô Phỏng Đa Luồng Người Dùng Online Đồng Thời
 * Hệ thống: ABC Pharmacy Platform (WDP301 / SEP490-SE06)
 * 
 * Cách dùng:
 *   cd backend
 *   node scripts/run-loadtest-simulation.js                              # Chạy mặc định tới http://localhost:4000 (100 concurrent)
 *   node scripts/run-loadtest-simulation.js --target=https://api.abcpharmacy.store --concurrency=200 --duration=30
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Đọc tham số dòng lệnh
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : defaultValue;
}

const TARGET_URL = getArg('target', 'http://localhost:4000').replace(/\/$/, '');
const CONCURRENCY = Math.max(1, parseInt(getArg('concurrency', '100'), 10) || 100);
const DURATION_SECONDS = Math.max(0, parseInt(getArg('duration', '0'), 10) || 0);
const USERS_FILE = path.join(__dirname, 'loadtest-users.json');
const MAX_ERROR_SAMPLES = 5;

if (!fs.existsSync(USERS_FILE)) {
  console.error('❌ Không tìm thấy file loadtest-users.json! Vui lòng chạy "node scripts/seed-loadtest-1000-users.js" trước.');
  process.exit(1);
}

const allUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

console.log('====================================================');
console.log('🚀 ABC PHARMACY — SCRIPT LOAD TESTING TỰ ĐỘNG');
console.log('====================================================');
console.log(`🌐 Target Gateway URL : ${TARGET_URL}`);
console.log(`👥 Số lượng User nạp   : ${allUsers.length}`);
console.log(`⚡ Mức độ đồng thời    : ${CONCURRENCY} virtual users`);
if (DURATION_SECONDS > 0) {
  console.log(`⏱️ Thời lượng chạy     : ${DURATION_SECONDS}s`);
}
console.log('====================================================\n');

// Trích xuất thông điệp lỗi rõ ràng (bao gồm AggregateError từ Node http.request)
function extractErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    const first = err.errors[0];
    return first.code || first.message || String(first);
  }
  return err.code || err.message || String(err);
}

function makeRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const startTime = Date.now();

    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000,
    };

    const req = lib.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          latency,
          body
        });
      });
    });

    req.on('error', err => reject({ error: extractErrorMessage(err), latency: Date.now() - startTime }));
    req.on('timeout', () => {
      req.destroy();
      reject({ error: 'Timeout', latency: Date.now() - startTime });
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// Ghi nhận mẫu lỗi đầu tiên để phục vụ chẩn đoán khi chạy tải cao
function recordErrorSample(errorSamples, endpoint, detail) {
  if (errorSamples.length < MAX_ERROR_SAMPLES) {
    errorSamples.push(`${endpoint} -> ${detail}`);
  }
}

async function simulateUser(user, index, errorSamples) {
  const stats = { index, email: user.email, loginAttempts: 1, loginOk: false, requestsOk: 0, errors: 0, latencies: [] };

  try {
    // 1. Đăng nhập lấy JWT Token
    const loginRes = await makeRequest(`${TARGET_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: user.email,
      password: user.password
    });

    if (loginRes.statusCode !== 200 && loginRes.statusCode !== 201) {
      stats.errors++;
      recordErrorSample(errorSamples, 'POST /api/auth/login', `HTTP ${loginRes.statusCode}`);
      return stats;
    }

    stats.loginOk = true;
    stats.latencies.push(loginRes.latency);

    let token = '';
    try {
      const data = JSON.parse(loginRes.body);
      token = data.accessToken || data.token || (data.data && data.data.accessToken) || '';
    } catch (_) {}

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Mô phỏng các tác vụ đọc dữ liệu của user online
    const endpoints = [
      '/api/auth/profile',
      '/api/medicines?page=1&limit=20',
      '/api/users/cart',
      '/api/vouchers'
    ];

    for (const ep of endpoints) {
      try {
        const res = await makeRequest(`${TARGET_URL}${ep}`, {
          method: 'GET',
          headers: authHeaders
        });
        stats.latencies.push(res.latency);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          stats.requestsOk++;
        } else {
          stats.errors++;
          recordErrorSample(errorSamples, `GET ${ep}`, `HTTP ${res.statusCode}`);
        }
      } catch (err) {
        stats.errors++;
        recordErrorSample(errorSamples, `GET ${ep}`, err.error || 'Request error');
      }
    }
  } catch (err) {
    stats.errors++;
    recordErrorSample(errorSamples, 'POST /api/auth/login', err.error || 'Connection error');
  }

  return stats;
}

// Chạy 1 worker liên tục cho đến hết thời gian nếu có truyền --duration
async function runWorker(workerIndex, deadline, errorSamples) {
  const aggregated = { loginAttempts: 0, loginOk: 0, requestsOk: 0, errors: 0, latencies: [] };
  let iteration = 0;

  do {
    const userIndex = (workerIndex + iteration * CONCURRENCY) % allUsers.length;
    const res = await simulateUser(allUsers[userIndex], userIndex + 1, errorSamples);
    aggregated.loginAttempts += res.loginAttempts;
    if (res.loginOk) aggregated.loginOk += 1;
    aggregated.requestsOk += res.requestsOk;
    aggregated.errors += res.errors;
    aggregated.latencies.push(...res.latencies);
    iteration++;
  } while (deadline > 0 && Date.now() < deadline);

  return aggregated;
}

async function runPool() {
  const workerCount = Math.min(CONCURRENCY, allUsers.length);
  const deadline = DURATION_SECONDS > 0 ? Date.now() + DURATION_SECONDS * 1000 : 0;
  const errorSamples = [];

  console.log(`⏳ Đang khởi động ${workerCount} phiên làm việc đồng thời...`);

  const startTime = Date.now();
  const promises = Array.from({ length: workerCount }, (_, i) => runWorker(i, deadline, errorSamples));
  const results = await Promise.all(promises);
  const totalDuration = Math.max((Date.now() - startTime) / 1000, 0.001);

  const totalLoginAttempts = results.reduce((acc, r) => acc + r.loginAttempts, 0);
  const totalLogins = results.reduce((acc, r) => acc + r.loginOk, 0);
  const totalRequestsOk = results.reduce((acc, r) => acc + r.requestsOk, 0);
  const totalErrors = results.reduce((acc, r) => acc + r.errors, 0);
  const allLatencies = results.flatMap(r => r.latencies).sort((a, b) => a - b);

  const avgLatency = allLatencies.length ? (allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length).toFixed(1) : 0;
  const p50 = allLatencies[Math.floor(allLatencies.length * 0.50)] || 0;
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)] || 0;
  const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)] || 0;
  const totalSuccessOps = totalLogins + totalRequestsOk;
  const successThroughput = (totalSuccessOps / totalDuration).toFixed(1);

  console.log('\n====================================================');
  console.log('📊 KẾT QUẢ LOAD TESTING THỰC NGHIỆM');
  console.log('====================================================');
  console.log(`⏱️ Tổng thời gian thực thi : ${totalDuration.toFixed(2)}s`);
  console.log(`👤 Đăng nhập thành công     : ${totalLogins} / ${totalLoginAttempts} lượt`);
  console.log(`✅ Requests API thành công   : ${totalRequestsOk}`);
  console.log(`❌ Lỗi (Timeouts / Fails)   : ${totalErrors}`);
  console.log(`⚡ Success Throughput (RPS)  : ${successThroughput} req/sec`);
  console.log(`📈 Độ trễ trung bình (Avg)   : ${avgLatency} ms`);
  console.log(`🎯 P50 Latency (50% users)   : ${p50} ms`);
  console.log(`🎯 P95 Latency (95% users)   : ${p95} ms`);
  console.log(`🎯 P99 Latency (99% users)   : ${p99} ms`);
  if (errorSamples.length > 0) {
    console.log('----------------------------------------------------');
    console.log('🔍 Mẫu lỗi ghi nhận đầu tiên:');
    errorSamples.forEach((sample, idx) => console.log(`   ${idx + 1}. ${sample}`));
  }
  console.log('====================================================\n');
}

runPool();
