#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hệ thống tự động phân tích và tạo báo cáo Code Review hằng ngày cho dự án WDP301/SEP490.
Tác vụ:
1. Trích xuất git log trong 24 giờ (hoặc số ngày cấu hình).
2. Phân tích tuân thủ chuẩn commit (Conventional Commits).
3. Phát hiện rủi ro bảo mật (nhạy cảm, file .env, credentials).
4. Thống kê theo từng thành viên (tác giả, số commit, files thay đổi, additions, deletions).
5. Xuất báo cáo HTML/Markdown sẵn sàng gửi email tới quản trị viên.
"""

import os
import sys
import argparse
import subprocess
import re
from datetime import datetime, timezone, timedelta

# Định dạng ngày giờ chuẩn Việt Nam (GMT+7)
VN_TZ = timezone(timedelta(hours=7))

# Danh sách tiền tố Conventional Commits hợp lệ
VALID_COMMIT_TYPES = (
    "feat", "fix", "chore", "refactor", "docs", "style", "test", 
    "perf", "ci", "build", "revert", "merge"
)

# Danh sách phần mở rộng hoặc tên file nhạy cảm cần cảnh báo
SENSITIVE_PATTERNS = [
    r"\.env($|\.)",
    r".*secret.*",
    r".*credential.*",
    r".*\.pem$",
    r".*\.key$",
    r".*id_rsa.*",
    r"package-lock\.json$", # Cảnh báo nếu vô tình sửa package-lock không mong muốn
]

def run_git_command(cmd, cwd=None):
    """Thực thi lệnh git và trả về chuỗi kết quả."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Lỗi khi thực thi lệnh git: {e.stderr}", file=sys.stderr)
        return ""

def get_git_commits(days=1, since_date=None):
    """Lấy danh sách các commit trong khoảng thời gian đã cho."""
    since_arg = f"--since={days}.days" if not since_date else f"--since={since_date}"
    
    # Định dạng phân tách: %H (hash), %an (author name), %ae (author email), %ad (author date ISO), %s (subject)
    log_format = "%H|%an|%ae|%ad|%s"
    cmd = ["git", "log", since_arg, f"--pretty=format:{log_format}", "--date=iso"]
    output = run_git_command(cmd)
    
    if not output:
        return []
    
    commits = []
    lines = output.split("\n")
    for line in lines:
        if not line.strip():
            continue
        parts = line.split("|", 4)
        if len(parts) == 5:
            c_hash, author, email, date_str, subject = parts
            commits.append({
                "hash": c_hash,
                "short_hash": c_hash[:7],
                "author": author.strip(),
                "email": email.strip(),
                "date": date_str.strip(),
                "subject": subject.strip()
            })
    return commits

def analyze_commit(commit_hash):
    """Phân tích chi tiết một commit: files thay đổi, additions, deletions, cảnh báo nhạy cảm."""
    # Lấy thống kê numstat
    numstat_cmd = ["git", "show", "--numstat", "--pretty=format:", commit_hash]
    numstat_output = run_git_command(numstat_cmd)
    
    files_changed = []
    total_additions = 0
    total_deletions = 0
    sensitive_alerts = []
    
    for line in numstat_output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            add_str, del_str, file_path = parts[0], parts[1], parts[2]
            add = int(add_str) if add_str.isdigit() else 0
            del_ = int(del_str) if del_str.isdigit() else 0
            total_additions += add
            total_deletions += del_
            files_changed.append({
                "path": file_path,
                "additions": add,
                "deletions": del_
            })
            
            # Kiểm tra file nhạy cảm
            for pattern in SENSITIVE_PATTERNS:
                if re.search(pattern, file_path, re.IGNORECASE):
                    sensitive_alerts.append(file_path)
                    break

    return {
        "files_changed": files_changed,
        "total_files": len(files_changed),
        "additions": total_additions,
        "deletions": total_deletions,
        "sensitive_alerts": sensitive_alerts
    }

def check_conventional_commit(subject):
    """Kiểm tra commit message có tuân thủ quy chuẩn Conventional Commits không."""
    pattern = r"^(" + "|".join(VALID_COMMIT_TYPES) + r")(\([a-zA-Z0-9_\-\.\/]+\))?(!)?:\s.+$"
    if re.match(pattern, subject, re.IGNORECASE):
        return True, "Hợp lệ"
    
    # Kiểm tra merge commit tự động
    if subject.lower().startswith("merge "):
        return True, "Merge Commit"
        
    return False, "Chưa theo chuẩn Conventional Commit (vd: feat(module): mô tả)"

def generate_report_data(days=1, since_date=None):
    """Thu thập và tổng hợp dữ liệu báo cáo toàn diện."""
    commits = get_git_commits(days=days, since_date=since_date)
    
    author_stats = {}
    detailed_commits = []
    all_warnings = []
    
    for c in commits:
        detail = analyze_commit(c["hash"])
        is_conventional, conv_note = check_conventional_commit(c["subject"])
        
        c_full = {
            **c,
            **detail,
            "is_conventional": is_conventional,
            "conventional_note": conv_note
        }
        detailed_commits.append(c_full)
        
        # Thống kê theo tác giả
        author_key = f"{c['author']} ({c['email']})"
        if author_key not in author_stats:
            author_stats[author_key] = {
                "author": c["author"],
                "email": c["email"],
                "commit_count": 0,
                "additions": 0,
                "deletions": 0,
                "files_count": 0,
                "invalid_messages": 0
            }
        
        stat = author_stats[author_key]
        stat["commit_count"] += 1
        stat["additions"] += detail["additions"]
        stat["deletions"] += detail["deletions"]
        stat["files_count"] += detail["total_files"]
        if not is_conventional:
            stat["invalid_messages"] += 1
            all_warnings.append(f"Commit [{c['short_hash']}] của {c['author']}: '{c['subject']}' ({conv_note})")
            
        if detail["sensitive_alerts"]:
            for f in detail["sensitive_alerts"]:
                all_warnings.append(f"⚠️ CẢNH BÁO BẢO MẬT: Commit [{c['short_hash']}] thay đổi file nhạy cảm: {f}")

    return {
        "period_days": days,
        "generated_at": datetime.now(VN_TZ).strftime("%d/%m/%Y %H:%M:%S (GMT+7)"),
        "total_commits": len(commits),
        "author_stats": list(author_stats.values()),
        "commits": detailed_commits,
        "warnings": all_warnings
    }

def render_html_email(data):
    """Tạo giao diện email HTML hiện đại, chuẩn Responsive, giao diện y tế / tech sạch đẹp."""
    now_str = data["generated_at"]
    total_commits = data["total_commits"]
    warnings = data["warnings"]
    
    # Tạo HTML bảng thống kê thành viên
    author_rows = ""
    for a in data["author_stats"]:
        author_rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">{a['author']}<br><span style="font-size: 11px; color: #64748b; font-weight: normal;">{a['email']}</span></td>
            <td style="padding: 10px 14px; text-align: center; font-weight: bold; color: #0284c7;">{a['commit_count']}</td>
            <td style="padding: 10px 14px; text-align: right; color: #16a34a; font-weight: 500;">+{a['additions']:,}</td>
            <td style="padding: 10px 14px; text-align: right; color: #dc2626; font-weight: 500;">-{a['deletions']:,}</td>
            <td style="padding: 10px 14px; text-align: center; color: {'#e11d48' if a['invalid_messages'] > 0 else '#16a34a'};">
                {'⚠️ ' + str(a['invalid_messages']) + ' lỗi' if a['invalid_messages'] > 0 else ' Chuẩn'}
            </td>
        </tr>
        """
        
    if not author_rows:
        author_rows = "<tr><td colspan='5' style='padding: 20px; text-align: center; color: #64748b;'>Không có commit nào trong khoảng thời gian này.</td></tr>"

    # Tạo HTML danh sách commit chi tiết
    commit_cards = ""
    for c in data["commits"]:
        conv_badge = '<span style="background-color: #dcfce7; color: #15803d; font-size: 11px; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">Chuẩn</span>' if c["is_conventional"] else '<span style="background-color: #fee2e2; color: #b91c1c; font-size: 11px; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">Lệch chuẩn</span>'
        
        file_preview = ""
        if c["files_changed"]:
            sample_files = c["files_changed"][:3]
            file_preview = "<ul style='margin: 6px 0 0 0; padding-left: 18px; font-size: 12px; color: #475569;'>"
            for f in sample_files:
                file_preview += f"<li>{f['path']} (+{f['additions']}/-{f['deletions']})</li>"
            if len(c["files_changed"]) > 3:
                file_preview += f"<li style='color: #94a3b8;'>...và {len(c['files_changed']) - 3} file khác</li>"
            file_preview += "</ul>"
            
        commit_cards += f"""
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-family: monospace; font-size: 12px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 600;">{c['short_hash']}</span>
                <span style="font-size: 11px; color: #64748b;">{c['date']}</span>
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 4px 0;">{c['subject']} {conv_badge}</div>
            <div style="font-size: 12px; color: #64748b;">
                Tác giả: <strong>{c['author']}</strong> • Thay đổi: <span style="color: #16a34a;">+{c['additions']}</span> / <span style="color: #dc2626;">-{c['deletions']}</span> dòng trong {c['total_files']} files
            </div>
            {file_preview}
        </div>
        """

    if not commit_cards:
        commit_cards = "<p style='color: #64748b; font-style: italic;'>Không có hoạt động commit mới.</p>"

    # HTML Cảnh báo
    warnings_block = ""
    if warnings:
        warn_items = "".join([f"<li style='margin-bottom: 4px;'>{w}</li>" for w in warnings[:10]])
        warnings_block = f"""
        <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #9f1239;">⚠️ Cảnh Báo Cần Lưu Ý ({len(warnings)} cảnh báo):</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #881337;">
                {warn_items}
            </ul>
        </div>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Báo Cáo Code Review Hằng Ngày - WDP301</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
    <div style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 30px; color: #ffffff;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; font-weight: 600;">Hệ Thống Quản Trị Chuỗi Nhà Thuốc WDP301 / SEP490</div>
            <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 700;">📊 Báo Cáo Code Review Toàn Diện Hằng Ngày</h1>
            <div style="margin-top: 8px; font-size: 13px; opacity: 0.9;">Thời điểm quét: <strong>{now_str}</strong> • Tổng số commit: <strong>{total_commits}</strong></div>
        </div>

        <div style="padding: 24px 30px;">
            
            {warnings_block}

            <!-- Bảng xếp hạng / Thống kê thành viên -->
            <h2 style="font-size: 16px; color: #0f172a; margin-top: 0; margin-bottom: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                👥 Thống Kê Đóng Góp Theo Thành Viên
            </h2>
            <div style="overflow-x: auto; margin-bottom: 28px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; color: #475569;">
                            <th style="padding: 10px 14px;">Thành viên</th>
                            <th style="padding: 10px 14px; text-align: center;">Số Commit</th>
                            <th style="padding: 10px 14px; text-align: right;">Dòng thêm (+)</th>
                            <th style="padding: 10px 14px; text-align: right;">Dòng bớt (-)</th>
                            <th style="padding: 10px 14px; text-align: center;">Chuẩn Commit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {author_rows}
                    </tbody>
                </table>
            </div>

            <!-- Chi tiết Commit -->
            <h2 style="font-size: 16px; color: #0f172a; margin-bottom: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                🔍 Chi Tiết Hoạt Động & Kiểm Tra Mã Nguồn
            </h2>
            {commit_cards}

            <!-- Playbook Rules Box -->
            <div style="margin-top: 30px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; font-size: 12px; color: #1e40af;">
                <strong>💡 Nhắc nhở quy chuẩn dự án (Playbook v2.0):</strong>
                <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                    <li>Mọi giao tiếp nội bộ giữa microservices bắt buộc đi qua <strong>Kafka</strong>, không gọi HTTP trực tiếp.</li>
                    <li>Frontend/Mobile chỉ gọi qua <strong>API Gateway</strong> (/api/...).</li>
                    <li>Các tác vụ ghi (POST/PUT/DELETE) tại Gateway trả về <strong>HTTP 202 Accepted</strong>, áp dụng Delayed Re-fetch 500-1000ms.</li>
                    <li>Code comments bắt buộc viết bằng <strong>Tiếng Việt</strong> (theo nguyên tắc SEP của dự án).</li>
                </ul>
            </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 30px; text-align: center; font-size: 12px; color: #64748b;">
            Báo cáo được tạo tự động bởi <strong>WDP301 Automated Code Review Bot</strong>.<br>
            Dành riêng cho: <a href="mailto:de180577tranhongphuoc@gmail.com" style="color: #0284c7; text-decoration: none;">de180577tranhongphuoc@gmail.com</a>
        </div>
    </div>
</body>
</html>
"""
    return html

def send_email_smtp(html_content, recipient_email, subject):
    """Gửi email trực tiếp qua SMTP (nếu cấu hình biến môi trường SMTP)."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")

    if not smtp_user or not smtp_pass:
        print("ℹ️ Không tìm thấy cấu hình SMTP_USER / SMTP_PASS. Bỏ qua bước gửi mail trực tiếp bằng Python.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"WDP301 Code Review Bot <{smtp_user}>"
    msg["To"] = recipient_email

    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.ehlo()
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, recipient_email, msg.as_string())
        server.quit()
        print(f"✅ Đã gửi thành công email báo cáo đến {recipient_email}!")
        return True
    except Exception as e:
        print(f"❌ Lỗi khi gửi email qua SMTP: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description="Tạo báo cáo Code Review hằng ngày cho WDP301")
    parser.add_argument("--days", type=int, default=1, help="Số ngày quét log (mặc định: 1)")
    parser.add_argument("--since", type=str, default=None, help="Mốc thời gian cụ thể (vd: '2026-10-05')")
    parser.add_argument("--output", type=str, default="daily_review_report.html", help="Đường dẫn file HTML xuất ra")
    parser.add_argument("--email", type=str, default="de180577tranhongphuoc@gmail.com", help="Email người nhận")
    parser.add_argument("--send-mail", action="store_true", help="Gửi email qua SMTP nếu có cấu hình")
    args = parser.parse_args()

    print(f"🔍 Bắt đầu quét git commits trong {args.days} ngày qua...")
    data = generate_report_data(days=args.days, since_date=args.since)
    html = render_html_email(data)

    with open(args.output, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✅ Đã tạo file báo cáo HTML tại: {args.output}")

    if args.send_mail or os.environ.get("AUTO_SEND_EMAIL") == "true":
        subject = f"[WDP301] Báo Cáo Code Review Hằng Ngày - {datetime.now(VN_TZ).strftime('%d/%m/%Y')}"
        send_email_smtp(html, args.email, subject)

if __name__ == "__main__":
    main()
