const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch (err) {
    return '';
  }
}

function generateReport() {
  const reportDir = path.resolve('.reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const now = new Date();
  const reportDateStr = now.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const reportTimeStr = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // 1. Lấy commits trong 24 giờ qua từ tất cả các nhánh remote
  let gitLogRaw = runGit('git log --all --remotes --since="24 hours ago" --pretty=format:"%H|%h|%an|%ae|%ad|%s" --date=format:"%H:%M %d/%m/%Y"');
  let isFallback = false;

  // Nếu không có commit trong 24h qua, lấy 8 commit gần nhất trên toàn bộ nhánh để report
  if (!gitLogRaw) {
    gitLogRaw = runGit('git log --all --remotes -n 8 --pretty=format:"%H|%h|%an|%ae|%ad|%s" --date=format:"%H:%M %d/%m/%Y"');
    isFallback = true;
  }

  const rawLines = gitLogRaw ? gitLogRaw.split('\n').filter(Boolean) : [];
  const seenHashes = new Set();
  const commits = [];
  for (const line of rawLines) {
    const parts = line.split('|');
    const hash = parts[0];
    if (hash && !seenHashes.has(hash)) {
      seenHashes.add(hash);
      commits.push({
        hash,
        shortHash: parts[1],
        author: parts[2],
        email: parts[3],
        date: parts[4],
        message: parts.slice(5).join('|')
      });
    }
  }

  // Gom nhóm commit theo tác giả
  const authorMap = {};
  commits.forEach(c => {
    const key = `${c.author} (${c.email})`;
    if (!authorMap[key]) {
      authorMap[key] = [];
    }
    authorMap[key].push(c);
  });

  // 2. Kiểm tra quy chuẩn chất lượng (Quality & Standards Checks)
  const smellFindings = [];
  const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|merge)(\(.*\))?:|(\[SCRUM-\d+\])/i;

  commits.forEach(c => {
    // Kiểm tra format commit
    if (!conventionalCommitRegex.test(c.message) && !c.message.startsWith('Merge pull request')) {
      smellFindings.push({
        type: 'Commit Convention',
        severity: 'Warning',
        detail: `Commit [${c.shortHash}] của ${c.author}: "${c.message}" chưa tuân thủ chuẩn Conventional Commit / Ticket tag ([SCRUM-xxx] hoặc feat(...)).`
      });
    }

    // Check commit diff
    const diffStat = runGit(`git diff-tree --no-commit-id --name-only -r ${c.hash}`);
    const files = diffStat ? diffStat.split('\n').filter(Boolean) : [];

    // Smell: Shotgun Surgery (excessive modified files in a single commit)
    if (files.length > 30 && !c.message.startsWith('Merge pull request')) {
      smellFindings.push({
        type: 'Code Smell (Shotgun Surgery)',
        severity: 'Warning',
        detail: `Commit [${c.shortHash}] by ${c.author} modified ${files.length} files. Consider breaking changes into smaller atomic commits.`
      });
    }

    // Quy chuẩn dự án sep.md: Comment code bằng tiếng Việt được khuyến khích
    const rawDiff = runGit(`git show ${c.hash}`);

    // Check microservice rule: if modifying backend microservices
    const backendFiles = files.filter(f => f.startsWith('backend/apps/'));
    if (backendFiles.length > 0) {
      const diffContent = runGit(`git show ${c.hash} -- ${backendFiles.join(' ')}`);
      // Rule 1: No direct internal HTTP calls between microservices (must use Kafka)
      if (diffContent.includes('axios.get(') || diffContent.includes('axios.post(') || diffContent.includes('HttpService')) {
        smellFindings.push({
          type: 'Microservices Architecture',
          severity: 'Critical',
          detail: `Commit [${c.shortHash}] may contain direct internal HTTP calls in microservices. Must use Kafka Event/Message!`
        });
      }
    }
  });

  // 3. Xây dựng nội dung HTML
  const totalCommits = commits.length;
  const totalAuthors = Object.keys(authorMap).length;

  let authorSectionsHtml = '';
  for (const [authorName, authorCommits] of Object.entries(authorMap)) {
    const commitListHtml = authorCommits.map(c => `
      <li style="margin-bottom: 8px;">
        <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #1e293b;">${c.shortHash}</code>
        <span style="color: #64748b; font-size: 12px; margin-left: 6px;">[${c.date}]</span>
        <div style="margin-top: 4px; color: #334155; font-size: 14px;">${escapeHtml(c.message)}</div>
      </li>
    `).join('');

    authorSectionsHtml += `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px; display: flex; align-items: center;">
          👤 <span style="margin-left: 8px;">${escapeHtml(authorName)}</span>
          <span style="margin-left: auto; background: #dbeafe; color: #1d4ed8; font-size: 12px; padding: 2px 8px; border-radius: 9999px;">
            ${authorCommits.length} commit
          </span>
        </h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${commitListHtml}
        </ul>
      </div>
    `;
  }

  let smellHtml = '';
  if (smellFindings.length > 0) {
    const items = smellFindings.map(s => `
      <li style="margin-bottom: 6px; color: ${s.severity === 'Critical' ? '#b91c1c' : '#b45309'};">
        <strong>[${s.severity}] ${s.type}:</strong> ${escapeHtml(s.detail)}
      </li>
    `).join('');
    smellHtml = `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 15px;">⚠️ Cảnh Báo Quy Chuẩn & Code Smells (${smellFindings.length})</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
          ${items}
        </ul>
      </div>
    `;
  } else {
    smellHtml = `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
        <span style="color: #15803d; font-size: 14px; font-weight: 500;">
          ✅ Không phát hiện vi phạm nghiêm trọng (Tất cả commit đều tuân thủ tốt kiến trúc và quy chuẩn).
        </span>
      </div>
    `;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Code Review</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f1f5f9; padding: 24px 12px; margin: 0;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: #ffffff; padding: 24px;">
      <h2 style="margin: 0; font-size: 22px; font-weight: 700;">📊 Báo Cáo Code Review Hằng Ngày</h2>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">
        ${reportDateStr} • ${reportTimeStr} • Tự động từ GitHub Actions Cloud
      </p>
    </div>

    <div style="padding: 24px;">
      
      <!-- Summary Badges -->
      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 130px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #2563eb;">${totalCommits}</div>
          <div style="font-size: 12px; color: #64748b;">${isFallback ? 'Commit Gần Nhất' : 'Commit (24h qua)'}</div>
        </div>
        <div style="flex: 1; min-width: 130px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #059669;">${totalAuthors}</div>
          <div style="font-size: 12px; color: #64748b;">Thành Viên Đang Code</div>
        </div>
      </div>

      <!-- Notice if fallback -->
      ${isFallback ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #1e40af;">
          ℹ️ <em>Trong 24 giờ qua chưa có commit mới. Dưới đây là 5 commit gần nhất của dự án để bạn tiện theo dõi.</em>
        </div>
      ` : ''}

      <!-- Smells and Standards Check -->
      ${smellHtml}

      <!-- Author Commits Breakdown -->
      <h3 style="color: #0f172a; font-size: 16px; margin: 24px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
        👨‍💻 Chi Tiết Hoạt Động Theo Tác Giả:
      </h3>
      ${authorSectionsHtml || '<p style="color: #64748b; font-style: italic;">Không có commit nào.</p>'}

      <!-- Standards Reminder -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">📌 3 Quy Tắc Bất Biến Của Dự Án (Playbook v2.0):</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
          <li>Tuyệt đối không gọi API HTTP trực tiếp giữa các microservices nội bộ (bắt buộc qua Kafka).</li>
          <li>Frontend/Mobile tuyệt đối không kết nối trực tiếp DB/Microservice (bắt buộc qua API Gateway).</li>
          <li>Tác vụ Ghi trả về HTTP 202 Accepted (Event-Driven qua Kafka).</li>
        </ol>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; margin-top: 28px; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        Hệ thống Code Review chạy hoàn toàn trên GitHub Cloud Runner • Độc lập với máy tính cá nhân
      </div>
    </div>
  </div>
</body>
</html>
  `;

  fs.writeFileSync(path.join(reportDir, 'daily_report.html'), htmlContent);
  console.log('✅ Generated .reports/daily_report.html successfully!');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

generateReport();
