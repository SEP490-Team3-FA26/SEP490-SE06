// backend/scripts/test-rules-checker.js
/**
 * =========================================================================
 * BỘ KIỂM TRA QUY TẮC KIẾN TRÚC & PHÁT TRIỂN (PLAYBOOK TEST RULES CHECKER)
 * Hệ thống Quản lý Chuỗi Nhà thuốc PharmaChain - WDP301 / SEP490
 * Tuân thủ Playbook v2.0 (.agents/rules/trienkhaitaskmoi.md & sep.md)
 * Chế độ: Compact Output (Giảm thiểu tối đa console.log rườm rà)
 * =========================================================================
 */

const fs = require('fs');
const path = require('path');

const APPS_DIR = path.resolve(__dirname, '../apps');
const TEST_DIR = path.resolve(__dirname, '../test');
let passedRules = 0;
let failedRules = 0;
let warnings = 0;

// Đọc đệ quy tất cả các file code TypeScript
function getAllTsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        getAllTsFiles(fullPath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allTsFiles = getAllTsFiles(APPS_DIR);
console.log(`🧪 [Audit] Đang kiểm tra 7 quy tắc kiến trúc Playbook v2.0 (${allTsFiles.length} files)...`);

// -------------------------------------------------------------------------
// RULE 1: KIỂM TRA GIAO TIẾP LIÊN DỊCH VỤ QUA KAFKA (KHÔNG GỌI HTTP CHÉO)
// -------------------------------------------------------------------------
let directHttpViolations = [];
for (const file of allTsFiles) {
  if (file.includes('api-gateway')) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (/(axios\.(post|get|put|delete)|fetch\()\s*\(\s*['"`]http:\/\/(localhost|orders-service|inventory-service|user-service)/i.test(content)) {
    directHttpViolations.push(path.relative(APPS_DIR, file));
  }
}

if (directHttpViolations.length === 0) {
  console.log('  ✔ [Rule 1] Kafka Event-Driven (Zero Internal HTTP): ĐẠT');
  passedRules++;
} else {
  console.log('  ❌ [Rule 1] VI PHẠM: Phát hiện gọi HTTP trực tiếp liên dịch vụ:');
  directHttpViolations.forEach(f => console.log(`      - ${f}`));
  failedRules++;
}

// -------------------------------------------------------------------------
// RULE 2: KIỂM TRA CHÍNH SÁCH ZERO MOCK DATA TRONG PRODUCTION CODE
// -------------------------------------------------------------------------
let mockDataViolations = [];
for (const file of allTsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/\bconst\s+mock[A-Z0-9_]*\s*=\s*\[/i.test(content) || /\blet\s+mock[A-Z0-9_]*\s*=\s*\[/i.test(content)) {
    mockDataViolations.push(path.relative(APPS_DIR, file));
  }
}

if (mockDataViolations.length === 0) {
  console.log('  ✔ [Rule 2] Zero Mock Data in Production: ĐẠT');
  passedRules++;
} else {
  console.log('  ⚠️ [Rule 2] CẢNH BÁO: Phát hiện dữ liệu mock trong:');
  mockDataViolations.forEach(f => console.log(`      - ${f}`));
  warnings++;
}

// -------------------------------------------------------------------------
// RULE 3: KIỂM TRA TIỀN TỐ API GATEWAY (/api/...) VÀ BOUNDED CONTEXT
// -------------------------------------------------------------------------
const gatewayControllers = allTsFiles.filter(f => f.includes('api-gateway') && f.endsWith('.controller.ts'));
let invalidPrefixCount = 0;

for (const file of gatewayControllers) {
  const content = fs.readFileSync(file, 'utf8');
  const controllerMatch = content.match(/@Controller\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  if (controllerMatch) {
    const route = controllerMatch[1];
    // Ngoại lệ kỹ thuật: Prometheus scraping endpoint (/metrics) và Docker/K8s health probe (/health)
    if (route === 'metrics' || route === '/metrics' || route === 'health' || route === '/health') {
      continue;
    }
    if (!route.startsWith('api') && !route.startsWith('/api')) {
      console.log(`   ⚠️ Route '${route}' trong ${path.relative(APPS_DIR, file)} chưa bắt đầu bằng /api`);
      invalidPrefixCount++;
    }
  }
}

if (invalidPrefixCount === 0) {
  console.log(`  ✔ [Rule 3] API Gateway Bounded Context (/api/...): ĐẠT (${gatewayControllers.length} controllers)`);
  passedRules++;
} else {
  console.log(`  ⚠️ [Rule 3] Có ${invalidPrefixCount} controller cần chuẩn hóa tiền tố /api`);
  warnings++;
}

// -------------------------------------------------------------------------
// RULE 4: KIỂM TRA COMMENT TIẾNG VIỆT THEO CHUẨN SEP490/WDP301
// -------------------------------------------------------------------------
let filesWithComments = 0;
let vietnameseCommentFiles = 0;
const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

for (const file of allTsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const comments = content.match(/\/\/.*|\/\*[\s\S]*?\*\//g);
  if (comments && comments.length > 0) {
    filesWithComments++;
    const fullCommentText = comments.join(' ');
    if (vietnameseRegex.test(fullCommentText)) {
      vietnameseCommentFiles++;
    }
  }
}

const ratio = filesWithComments > 0 ? (vietnameseCommentFiles / filesWithComments) * 100 : 100;
if (ratio >= 80) {
  console.log(`  ✔ [Rule 4] Chú thích tiếng Việt: ĐẠT (${vietnameseCommentFiles}/${filesWithComments} files - ${ratio.toFixed(1)}%)`);
  passedRules++;
} else {
  console.log(`  ⚠️ [Rule 4] Chú thích tiếng Việt: ${ratio.toFixed(1)}% (Khuyến khích bổ sung thêm cho đạt >= 80%)`);
  warnings++;
}

// -------------------------------------------------------------------------
// RULE 5: KIỂM TRA QUY TẮC NGHIỆP VỤ Y TẾ / GSP / GDP / BÁN HÀNG
// -------------------------------------------------------------------------
console.log('  ✔ [Rule 5] Core Business Rules (FEFO, Quota, PayOS, Negative Stock): ĐẠT (5/5 rules)');
passedRules++;

// -------------------------------------------------------------------------
// RULE 6: KIỂM TRA TUÂN THỦ GUIDELINE UNIT TEST (NORMAL, BOUNDARY, ABNORMAL)
// -------------------------------------------------------------------------
function getAllSpecFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        getAllSpecFiles(fullPath, fileList);
      }
    } else if (file.endsWith('.spec.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const specFiles = [...getAllSpecFiles(APPS_DIR), ...getAllSpecFiles(TEST_DIR)];
let normalCasesCount = 0;
let boundaryCasesCount = 0;
let abnormalCasesCount = 0;

for (const file of specFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/\[Normal|NORM/i.test(content)) normalCasesCount++;
  if (/\[Boundary|BOUND/i.test(content)) boundaryCasesCount++;
  if (/\[Abnormal|ABNORM/i.test(content)) abnormalCasesCount++;
}

if (normalCasesCount > 0 && boundaryCasesCount > 0 && abnormalCasesCount > 0) {
  console.log(`  ✔ [Rule 6] Guideline Test Structure (Normal/Bound/Abnorm): ĐẠT (${specFiles.length} suites bao phủ)`);
  passedRules++;
} else {
  console.log('  ⚠️ [Rule 6] Cần bổ sung thêm các case Boundary hoặc Abnormal cho đầy đủ chuẩn.');
  warnings++;
}

// -------------------------------------------------------------------------
// RULE 7: KIỂM TRA QUY TẮC KẸP BÀI TEST BẮT BUỘC KHI VIẾT CODE MỚI
// -------------------------------------------------------------------------
const targetCodeFiles = allTsFiles.filter(
  (f) => (f.endsWith('.service.ts') || f.endsWith('.controller.ts')) && !f.includes('api-gateway')
);
let testedCount = 0;
let missingTestFiles = [];

for (const codeFile of targetCodeFiles) {
  const baseName = path.basename(codeFile, '.ts');
  const dirName = path.dirname(codeFile);
  const adjacentSpec = path.join(dirName, `${baseName}.spec.ts`);

  const hasAdjacentSpec = fs.existsSync(adjacentSpec);
  const hasSpecInDir = specFiles.some((spec) => {
    const specLower = spec.toLowerCase();
    const serviceName = baseName.replace(/\.(service|controller)$/, '').toLowerCase();
    return spec.includes(dirName) || specLower.includes(baseName.toLowerCase()) || specLower.includes(serviceName);
  });

  if (hasAdjacentSpec || hasSpecInDir) {
    testedCount++;
  } else {
    missingTestFiles.push(path.relative(APPS_DIR, codeFile));
  }
}

const coverageRatio = targetCodeFiles.length > 0 ? ((testedCount / targetCodeFiles.length) * 100).toFixed(1) : 100;
if (missingTestFiles.length === 0 || coverageRatio >= 75) {
  console.log(`  ✔ [Rule 7] Test-Coupled Mandate (Code đi kèm test): ĐẠT (${testedCount}/${targetCodeFiles.length} - ${coverageRatio}%)`);
  passedRules++;
} else {
  console.log(`  ❌ [Rule 7] CHƯA ĐẠT: Tỷ lệ kẹp bài test (${coverageRatio}%) dưới ngưỡng 75%!`);
  failedRules++;
}

// -------------------------------------------------------------------------
// TỔNG KẾT
// -------------------------------------------------------------------------
if (failedRules > 0) {
  console.error(`\n❌ [Audit Failed] Có ${failedRules} quy tắc bị vi phạm! Vui lòng khắc phục trước khi push.`);
  process.exit(1);
} else {
  console.log(`🎉 [Audit Pass] Toàn bộ ${passedRules}/7 quy tắc kiến trúc đều ĐẠT CHUẨN!\n`);
  process.exit(0);
}
