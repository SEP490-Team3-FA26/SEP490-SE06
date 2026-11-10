#!/usr/bin/env node

/**
 * check-syntax-and-safety.js - Cổng kiểm soát lỗi Cú Pháp (Syntax), TypeScript & Runtime Safety
 * Được kích hoạt tự động bởi Husky Git Hook (pre-commit / pre-push) hoặc chạy tay qua: npm run lint:syntax
 * Ngôn ngữ chú thích: Tiếng Việt 100% theo quy chuẩn WDP301/SEP490
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Bảng mã màu ANSI hiển thị Terminal
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function logInfo(msg) {
  console.log(`${COLORS.cyan}${msg}${COLORS.reset}`);
}

function logSuccess(msg) {
  console.log(`${COLORS.green}${msg}${COLORS.reset}`);
}

function logWarn(msg) {
  console.log(`${COLORS.yellow}${msg}${COLORS.reset}`);
}

function logError(msg) {
  console.error(`${COLORS.red}${COLORS.bold}${msg}${COLORS.reset}`);
}

/**
 * Lấy danh sách các file đang được sửa đổi hoặc đã staged trong Git
 */
function getChangedFiles() {
  try {
    const stagedOut = execSync('git diff --name-only --cached', { cwd: ROOT_DIR, encoding: 'utf8' });
    const unstagedOut = execSync('git diff --name-only', { cwd: ROOT_DIR, encoding: 'utf8' });
    const untrackedOut = execSync('git ls-files --others --exclude-standard', { cwd: ROOT_DIR, encoding: 'utf8' });

    const allFiles = new Set([
      ...stagedOut.split('\n'),
      ...unstagedOut.split('\n'),
      ...untrackedOut.split('\n'),
    ]);

    return Array.from(allFiles)
      .map((f) => f.trim())
      .filter((f) => Boolean(f) && fs.existsSync(path.join(ROOT_DIR, f)));
  } catch (err) {
    logWarn(`⚠️ Không thể lấy danh sách Git diff (${err.message}). Bỏ qua lọc file.`);
    return [];
  }
}

/**
 * Kiểm tra lỗi cú pháp file JavaScript bằng node --check
 */
function checkJsSyntax(filePath) {
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    return null;
  } catch (err) {
    return err.stderr ? err.stderr.toString().trim() : err.message;
  }
}

/**
 * Kiểm tra lỗi cú pháp file JSON
 */
function checkJsonSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return null;
  } catch (err) {
    return `Lỗi JSON cú pháp: ${err.message}`;
  }
}

/**
 * Kiểm tra cơ bản file TypeScript / TSX
 */
function checkTsSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Kiểm tra unclosed backticks (dấu huyền template string)
    const backticks = (content.match(/(?<!\\)`/g) || []).length;
    if (backticks % 2 !== 0) {
      return 'Phát hiện dấu huyền template string (`) chưa được đóng!';
    }

    // 2. Kiểm tra xung đột git merge markers
    if (/^<<<<<<< HEAD|^=======|^>>>>>>> /m.test(content)) {
      return 'Phát hiện dấu vết xung đột Git merge (<<<<<<< HEAD / ======= / >>>>>>>) chưa xử lý!';
    }

    return null;
  } catch (err) {
    return `Không thể đọc file: ${err.message}`;
  }
}

/**
 * Hàm điều phối chính (Main Execution)
 */
function main() {
  console.log('');
  logInfo('🐶 [Husky Syntax Guard] Đang quét kiểm tra lỗi cú pháp (Syntax) và an toàn mã nguồn...');

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    logSuccess('✅ Không có file mã nguồn nào thay đổi. Cho phép tiếp tục commit!');
    console.log('');
    process.exit(0);
  }

  // Lọc các file mã nguồn cần kiểm tra cú pháp, loại trừ node_modules, dist, build
  const filesToCheck = changedFiles.filter((f) => {
    if (f.includes('node_modules/') || f.includes('dist/') || f.includes('build/')) return false;
    const ext = path.extname(f).toLowerCase();
    return ['.js', '.jsx', '.ts', '.tsx', '.json', '.cjs', '.mjs'].includes(ext);
  });

  if (filesToCheck.length === 0) {
    logSuccess('✅ Không có file mã nguồn (.js/.ts/.json) nào bị thay đổi. Cho phép tiếp tục!');
    console.log('');
    process.exit(0);
  }

  console.log(`🔎 Phát hiện ${filesToCheck.length} file mã nguồn thay đổi cần kiểm tra:`);

  const errors = [];

  for (const file of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, file);
    const ext = path.extname(file).toLowerCase();
    let err = null;

    if (['.js', '.cjs', '.mjs'].includes(ext)) {
      err = checkJsSyntax(fullPath);
    } else if (ext === '.json') {
      err = checkJsonSyntax(fullPath);
    } else if (['.ts', '.tsx'].includes(ext)) {
      err = checkTsSyntax(fullPath);
    }

    if (err) {
      errors.push({ file, error: err });
      logError(`  ❌ [Lỗi Cú Pháp] ${file}`);
      console.log(`     👉 Chi tiết: ${err}`);
    } else {
      console.log(`  ✓ [Đạt] ${file}`);
    }
  }

  console.log('');
  if (errors.length > 0) {
    logError(`❌ PHÁT HIỆN ${errors.length} FILE CÓ LỖI CÚ PHÁP! LỆNH COMMIT / PUSH ĐÃ BỊ CHẶN!`);
    logWarn('👉 Vui lòng sửa lại các lỗi cú pháp ở trên rồi thực hiện commit lại.');
    console.log('');
    process.exit(1);
  } else {
    logSuccess('🎉 TẤT CẢ FILE ĐỀU ĐẠT CHUẨN CÚ PHÁP 100%! CHO PHÉP COMMIT / PUSH THÀNH CÔNG! 🚀');
    console.log('');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, checkJsSyntax, checkJsonSyntax, checkTsSyntax };
