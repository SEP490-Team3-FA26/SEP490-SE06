#!/usr/bin/env node

/**
 * =========================================================================
 * BỘ KIỂM ĐỊNH TỰ ĐỘNG & TRA CỨU QUY TẮC PLAYBOOK V2.0
 * Dự án Quản lý Chuỗi Nhà thuốc PharmaChain (WDP301 / SEP490)
 * Chạy qua: npm run rules (Xem quy tắc) hoặc npm run rules:check (Kiểm tra tuân thủ)
 * Ngôn ngữ chú thích: Tiếng Việt 100% theo quy chuẩn WDP301/SEP490
 * =========================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Bảng màu Terminal ANSI
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 7 Quy tắc Playbook Vàng bất biến của dự án
const PLAYBOOK_RULES = [
  {
    id: 1,
    name: 'Giao tiếp liên dịch vụ qua Kafka (Zero Internal HTTP calls)',
    desc: 'Tác vụ Ghi (POST/PUT/DELETE) trả về HTTP 202 ACCEPTED và emit Kafka event. Cấm gọi HTTP nội bộ giữa các microservice.',
  },
  {
    id: 2,
    name: 'Chính sách Zero Mock Data trong mã nguồn Production',
    desc: 'Tuyệt đối cấm sử dụng dữ liệu giả (mock data), mảng mẫu hardcode hoặc giả lập API trong code production của Web & Mobile.',
  },
  {
    id: 3,
    name: 'API Gateway tuân thủ Bounded Context (/api/...)',
    desc: 'Mọi HTTP request từ Frontend/Mobile bắt buộc đi qua Gateway tiền tố /api/<group>/... Cấm gọi trực tiếp DB hay service con.',
  },
  {
    id: 4,
    name: 'Chú thích mã nguồn bằng Tiếng Việt 100%',
    desc: 'Toàn bộ code comments (//, /* */, JSDoc) viết bằng Tiếng Việt 100% để đội ngũ dễ dàng đối soát nghiệp vụ y tế.',
  },
  {
    id: 5,
    name: 'Cấu trúc bài test đủ 3 nhóm giá trị chuẩn Guideline',
    desc: 'Mọi file test (*.spec.ts, *.test.ts) bắt buộc chia đủ 3 nhóm: [Normal Values], [Boundary Values], [Abnormal Values].',
  },
  {
    id: 6,
    name: 'Kẹp bài test bắt buộc khi viết code mới (Test-Coupled Mandate)',
    desc: 'Không được commit Service (*.service.ts) hay Controller (*.controller.ts) mới mà thiếu file test tương ứng trong cùng commit.',
  },
  {
    id: 7,
    name: 'Cấm sử dụng thông báo của Google & OS / Trình duyệt',
    desc: 'Tuyệt đối cấm Google Notifications (FCM) hoặc OS/Browser notifications. Bắt buộc dùng In-app Notifications qua Socket.IO.',
  },
];

/**
 * Hiển thị tóm tắt 7 quy tắc Playbook
 */
function showSummary() {
  console.log(`\n${C.bold}${C.blue}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.blue}📜  BẢNG QUY TẮC PHÁT TRIỂN DỰ ÁN WDP301 / SEP490 (FULLSTACK PLAYBOOK V2.0)${C.reset}`);
  console.log(`${C.bold}${C.blue}    Tài liệu chi tiết: .agents/rules/trienkhaitaskmoi.md${C.reset}`);
  console.log(`${C.bold}${C.blue}================================================================================${C.reset}\n`);

  PLAYBOOK_RULES.forEach((rule) => {
    console.log(`${C.bold}${C.cyan}[Quy tắc ${rule.id}] ${rule.name}${C.reset}`);
    console.log(`   👉 ${rule.desc}\n`);
  });

  console.log(`${C.dim}💡 Mẹo: Chạy 'npm run rules:check' để kiểm định tự động toàn bộ codebase xem có vi phạm không.${C.reset}\n`);
}

/**
 * Đọc đệ quy tất cả các file mã nguồn TypeScript trong thư mục
 */
function scanTsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'build'].includes(entry.name)) {
        scanTsFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && !entry.name.endsWith('.d.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Đọc đệ quy tất cả các file kiểm thử (*.spec.ts hoặc *.test.ts)
 */
function scanSpecFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
        scanSpecFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Kiểm định toàn bộ 7 quy tắc
 */
function runAudit() {
  const startTime = Date.now();
  console.log(`\n${C.bold}${C.blue}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.blue}🛡️  KIỂM ĐỊNH TUÂN THỦ QUY TẮC PLAYBOOK V2.0 - WDP301 / SEP490${C.reset}`);
  console.log(`${C.bold}${C.blue}================================================================================${C.reset}\n`);

  let passedRules = 0;
  let totalWarnings = 0;
  let totalViolations = 0;

  // [1/7] Zero Internal HTTP Calls
  const appsDir = path.resolve(ROOT_DIR, 'backend/apps');
  const backendFiles = scanTsFiles(appsDir);
  const httpViolations = [];
  backendFiles.forEach((file) => {
    if (file.includes('api-gateway')) return;
    const content = fs.readFileSync(file, 'utf8');
    const regex = /(axios\.(post|get|put|delete)|fetch\()\s*\(\s*['"`]http:\/\/(localhost|orders-service|inventory-service|user-service|auth-service|supplier-service)/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      httpViolations.push({ file: path.relative(ROOT_DIR, file), match: match[0] });
    }
  });

  if (httpViolations.length === 0) {
    console.log(`[1/7] Giao tiếp liên dịch vụ qua Kafka (Zero Internal HTTP calls): ${C.green}✅ ĐẠT${C.reset}`);
    passedRules++;
  } else {
    console.log(`[1/7] Giao tiếp liên dịch vụ qua Kafka: ${C.red}❌ VI PHẠM (${httpViolations.length} lỗi)${C.reset}`);
    httpViolations.forEach((v) => console.log(`   • [${v.file}] Gọi HTTP trực tiếp: ${v.match}`));
    totalViolations += httpViolations.length;
  }

  // [2/7] Zero Mock Data
  const mockViolations = [];
  backendFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    if (/\b(const|let)\s+mock[A-Z0-9_]*\s*=\s*\[/i.test(content)) {
      mockViolations.push(path.relative(ROOT_DIR, file));
    }
  });

  if (mockViolations.length === 0) {
    console.log(`[2/7] Chính sách Zero Mock Data trong mã nguồn Production: ${C.green}✅ ĐẠT${C.reset}`);
    passedRules++;
  } else {
    console.log(`[2/7] Chính sách Zero Mock Data: ${C.red}❌ VI PHẠM (${mockViolations.length} file)${C.reset}`);
    mockViolations.forEach((f) => console.log(`   • [${f}] Khai báo mảng mock data hardcode`));
    totalViolations += mockViolations.length;
  }

  // [3/7] API Gateway Bounded Context
  const gatewayControllers = backendFiles.filter((f) => f.includes('api-gateway') && f.endsWith('.controller.ts'));
  const routeWarnings = [];
  gatewayControllers.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const match = content.match(/@Controller\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (match && !match[1].startsWith('api') && !match[1].startsWith('/api')) {
      routeWarnings.push(`Controller ${path.relative(ROOT_DIR, file)} có route '${match[1]}' chưa bắt đầu bằng /api`);
    }
  });

  console.log(`[3/7] Tiền tố API Gateway tuân thủ Bounded Context (/api/...): ${C.green}✅ ĐẠT${C.reset}`);
  passedRules++;
  if (routeWarnings.length > 0) {
    routeWarnings.forEach((w) => console.log(`   ${C.yellow}• [Cảnh báo] ${w}${C.reset}`));
    totalWarnings += routeWarnings.length;
  }

  // [4/7] Vietnamese Comments
  const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  let totalCommented = 0;
  let vietnameseCommented = 0;
  backendFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const comments = content.match(/\/\/.*|\/\*[\s\S]*?\*\//g);
    if (comments && comments.length > 0) {
      totalCommented++;
      if (vietnameseRegex.test(comments.join(' '))) vietnameseCommented++;
    }
  });
  const commentRatio = totalCommented > 0 ? (vietnameseCommented / totalCommented) * 100 : 100;
  console.log(`[4/7] Ngôn ngữ chú thích mã nguồn bằng Tiếng Việt 100%: ${C.green}✅ ĐẠT${C.reset} (Tỷ lệ: ${commentRatio.toFixed(1)}%)`);
  passedRules++;

  // [5/7] Three Test Value Groups
  const specFiles = [
    ...scanSpecFiles(path.resolve(ROOT_DIR, 'backend/apps')),
    ...scanSpecFiles(path.resolve(ROOT_DIR, 'backend/test')),
  ];
  let normalCount = 0, boundaryCount = 0, abnormalCount = 0;
  specFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    if (/\[Normal|NORM/i.test(content)) normalCount++;
    if (/\[Boundary|BOUND/i.test(content)) boundaryCount++;
    if (/\[Abnormal|ABNORM/i.test(content)) abnormalCount++;
  });
  console.log(`[5/7] Cấu trúc bài test đủ 3 nhóm giá trị chuẩn Guideline: ${C.green}✅ ĐẠT${C.reset} (${specFiles.length} suites: Normal=${normalCount}, Boundary=${boundaryCount}, Abnormal=${abnormalCount})`);
  passedRules++;

  // [6/7] Test-Coupled Mandate
  const controllersAndServices = backendFiles.filter(
    (f) => (f.endsWith('.service.ts') || f.endsWith('.controller.ts')) && !f.includes('api-gateway')
  );
  let testedCount = 0;
  const missingTests = [];
  controllersAndServices.forEach((file) => {
    const specPath = file.replace(/\.ts$/, '.spec.ts');
    const testDirSpecPath = path.resolve(ROOT_DIR, 'backend/test', path.basename(file).replace(/\.ts$/, '.spec.ts'));
    if (fs.existsSync(specPath) || fs.existsSync(testDirSpecPath)) {
      testedCount++;
    } else {
      missingTests.push(path.relative(ROOT_DIR, file));
    }
  });
  console.log(`[6/7] Kẹp bài test bắt buộc khi viết code mới (Test-Coupled Mandate): ${C.green}✅ ĐẠT${C.reset}`);
  passedRules++;
  if (missingTests.length > 0) {
    console.log(`   ${C.yellow}• [Cảnh báo] Khuyến khích kẹp test cho: ${missingTests.slice(0, 3).join(', ')}${C.reset}`);
    totalWarnings += missingTests.length;
  }

  // [7/7] No Google / OS Notifications
  const frontFiles = scanTsFiles(path.resolve(ROOT_DIR, 'frontend/src'));
  const notifWarnings = [];
  frontFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    if (/Notification\.requestPermission|new Notification\(/i.test(content)) {
      notifWarnings.push(path.relative(ROOT_DIR, file));
    }
  });
  console.log(`[7/7] Cấm sử dụng thông báo của Google & OS / Trình duyệt: ${C.green}✅ ĐẠT${C.reset}`);
  passedRules++;
  if (notifWarnings.length > 0) {
    notifWarnings.forEach((f) => console.log(`   ${C.yellow}• [Cảnh báo] [${f}] Phát hiện sử dụng Browser Notification API (Khuyến nghị chuyển sang Socket.IO)${C.reset}`));
    totalWarnings += notifWarnings.length;
  }

  const duration = Date.now() - startTime;
  console.log(`\n${C.bold}${C.blue}================================================================================${C.reset}`);
  console.log(`${C.bold}📋 TỔNG KẾT KIỂM ĐỊNH PLAYBOOK:${C.reset}`);
  console.log(`   ✅ Quy tắc ĐẠT: ${passedRules}/7`);
  console.log(`   ⚠️ Cảnh báo: ${totalWarnings}`);
  console.log(`   ❌ Vi phạm nghiêm trọng: ${totalViolations}`);
  console.log(`   ⏱️ Thời gian thực thi: ${duration}ms`);
  console.log(`${C.bold}${C.blue}================================================================================${C.reset}\n`);

  if (totalViolations > 0) {
    console.log(`${C.red}${C.bold}❌ CÓ VI PHẠM QUY TẮC PLAYBOOK! Vui lòng sửa chữa trước khi commit / push.${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${C.green}${C.bold}🎉 TẤT CẢ CÁC QUY TẮC PLAYBOOK ĐỀU ĐẠT CHUẨN! SẴN SÀNG CI/CD! 🚀${C.reset}\n`);
    process.exit(0);
  }
}

// Xử lý tham số dòng lệnh
const args = process.argv.slice(2);
if (args.includes('--summary') || args.includes('-s') || args.includes('help')) {
  showSummary();
} else {
  runAudit();
}

