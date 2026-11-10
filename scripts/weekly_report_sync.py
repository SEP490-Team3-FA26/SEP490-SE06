#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kịch bản tự động hóa Báo cáo tuần & Biên bản họp (Weekly Report & Meeting Notes Workflow)
Dự án: SEP490 / WDP301 - Chuỗi Nhà thuốc Thông minh
Chuẩn hóa 100% định dạng bảng Google Docs:
- Bảng Recover & Master plan: 4 cột chuẩn (#, Plan, Status, Actual)
- Bảng Deliverables: Bảng danh sách tính năng code chạy được
- Bảng Issue: 6 cột chuẩn (Issue, Chi tiết, Impact, Action, Commit deadline, Note)
- Cơ chế Idempotent Update: Cập nhật đè nếu tuần đã tồn tại, chèn lên đầu nếu tuần mới (Không bao giờ nhân bản trùng lặp tuần)
"""

import os
import sys
import re
import json
import time
import base64
import zipfile
import shutil
import argparse
import urllib.request
import urllib.parse
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

# Cấu hình hằng số mặc định của dự án
DEFAULT_FILE_ID = "1IYDTQcmeC5aDakFyNy750XizY4rkd5qG"
DEFAULT_OUTPUT_DOCX = "docs/Template-Weekly-report-and-weekly-meeting-notes.docx"
DOWNLOADS_OUTPUT_DOCX = os.path.expanduser("~/Downloads/Template-Weekly-report-and-weekly-meeting-notes.docx")
FALLBACK_TEMPLATE = "/Users/tranhongphuoc/.gemini/config/skills/sep490-weekly-report/templates/template.docx"

# Đường dẫn tiềm năng của Service Account Google Cloud
SA_SEARCH_PATHS = [
    "service_account.json",
    os.path.expanduser("~/.config/gcloud/application_default_credentials.json"),
    os.path.expanduser("~/.config/gcloud/legacy_credentials/sep490@stone-climate-507417-k4.iam.gserviceaccount.com/adc.json"),
]

def find_service_account_path():
    """Tìm kiếm file chứng thực Service Account khả dụng trên hệ thống"""
    for path in SA_SEARCH_PATHS:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("type") == "service_account" or "private_key" in data:
                        return path
            except Exception:
                continue
    return None

def base64url_encode(data: bytes) -> str:
    """Mã hóa chuỗi byte sang Base64 URL-safe không có padding"""
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def get_google_access_token(sa_path: str) -> str:
    """Tạo OAuth2 Access Token từ private key của Service Account"""
    with open(sa_path, "r", encoding="utf-8") as f:
        sa_data = json.load(f)

    client_email = sa_data["client_email"]
    private_key_pem = sa_data["private_key"].encode("utf-8")
    token_uri = sa_data.get("token_uri", "https://oauth2.googleapis.com/token")

    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    payload = {
        "iss": client_email,
        "scope": "https://www.googleapis.com/auth/drive",
        "aud": token_uri,
        "exp": now + 3600,
        "iat": now,
    }

    header_b64 = base64url_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = base64url_encode(json.dumps(payload).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    private_key = load_pem_private_key(private_key_pem, password=None)
    signature = private_key.sign(
        signing_input,
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    sig_b64 = base64url_encode(signature)
    jwt_assertion = f"{header_b64}.{payload_b64}.{sig_b64}"

    post_data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": jwt_assertion
    }).encode("utf-8")

    req = urllib.request.Request(token_uri, data=post_data, headers={
        "Content-Type": "application/x-www-form-urlencoded"
    })

    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res["access_token"]

def download_cloud_template(file_id: str, dest_path: str, token: str) -> bool:
    """Tải file .docx hiện tại từ Google Drive về máy cục bộ"""
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as f:
            f.write(resp.read())
        return True
    except Exception as e:
        print(f"⚠️ Không thể tải template trực tiếp từ Google Drive: {e}")
        return False

def sync_to_google_drive(file_id: str, docx_path: str, sa_path: str) -> bool:
    """Ghi đè trực tiếp nhị phân (Binary PATCH) lên file trên Google Docs Cloud"""
    print(f"🔑 Đang khởi tạo Access Token cho Service Account từ: {sa_path}...")
    token = get_google_access_token(sa_path)
    print("✅ Đã tạo Access Token thành công!")

    # Kiểm tra metadata và quyền sửa file
    meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=id,name,mimeType,capabilities"
    req_meta = urllib.request.Request(meta_url, headers={"Authorization": f"Bearer {token}"})

    try:
        with urllib.request.urlopen(req_meta) as resp:
            meta = json.loads(resp.read().decode("utf-8"))
            print(f"📄 Tài liệu trên Cloud: '{meta.get('name')}' (ID: {file_id})")
            can_edit = meta.get("capabilities", {}).get("canEdit", False)
            if not can_edit:
                print("❌ CẢNH BÁO: Service account chưa có quyền Editor đối với tài liệu này!")
                return False
    except Exception as e:
        print(f"❌ Lỗi khi truy vấn metadata tài liệu Google Drive: {e}")
        return False

    # Ghi đè file nhị phân
    print("🚀 Đang ghi đè nội dung nhị phân (Binary PATCH) lên Google Docs...")
    upload_url = f"https://www.googleapis.com/upload/drive/v3/files/{file_id}?uploadType=media"
    with open(docx_path, "rb") as f:
        file_bytes = f.read()

    req_upload = urllib.request.Request(
        upload_url,
        data=file_bytes,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        method="PATCH"
    )

    try:
        with urllib.request.urlopen(req_upload) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print("\n" + "=" * 70)
            print("🎉 ĐỒNG BỘ THÀNH CÔNG 100% TRỰC TIẾP LÊN LINK GOOGLE DOCS!")
            print(f"📄 Tên file trên Cloud: {result.get('name')}")
            print(f"🆔 File ID: {result.get('id')}")
            print(f"🔗 Link Google Docs: https://docs.google.com/document/d/{file_id}/edit")
            print("=" * 70 + "\n")
            return True
    except Exception as e:
        print(f"❌ Lỗi khi cập nhật Google Docs: {e}")
        return False

# =========================================================================
# BỘ CÔNG CỤ OPENXML GENERATOR (Chuẩn màu sắc & định dạng bảng 100%)
# =========================================================================

def xml_escape(s: str) -> str:
    """Thoát các ký tự đặc biệt trong XML"""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )

def p(style=None, text="", color=None, bold=False, italic=False, sz=None, before=0, after=40, align="left"):
    """Tạo đoạn văn bản paragraph OpenXML chuẩn typography"""
    p_style_xml = f'<w:pStyle w:val="{style}"/>' if style else ""
    spacing_xml = f'<w:spacing w:after="{after}" w:before="{before}" w:line="276" w:lineRule="auto"/>'
    align_xml = f'<w:jc w:val="{align}"/>' if align else ""
    color_xml = f'<w:color w:val="{color}"/>' if color else ""
    bold_xml = '<w:b w:val="1"/><w:bCs w:val="1"/>' if bold else '<w:b w:val="0"/><w:bCs w:val="0"/>'
    italic_xml = '<w:i w:val="1"/><w:iCs w:val="1"/>' if italic else '<w:i w:val="0"/><w:iCs w:val="0"/>'
    sz_xml = f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>' if sz else ""

    return (
        '<w:p w:rsidR="00000000" w:rsidDel="00000000" w:rsidP="00000000" w:rsidRDefault="00000000" w:rsidRPr="00000000">'
        f'<w:pPr>{p_style_xml}{align_xml}{spacing_xml}<w:rPr/></w:pPr>'
        '<w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">'
        f'<w:rPr><w:rFonts w:ascii="Calibri" w:cs="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri"/>{bold_xml}{italic_xml}{color_xml}{sz_xml}<w:rtl w:val="0"/></w:rPr>'
        f'<w:t xml:space="preserve">{xml_escape(text)}</w:t>'
        '</w:r>'
        '<w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rtl w:val="0"/></w:rPr></w:r>'
        '</w:p>'
    )

def cell(text: str, bold=False, fill=None, text_color="212529", sz="20", align="left", w=None):
    """Tạo ô bảng OpenXML với viền mỏng và nền màu chuẩn"""
    shd_xml = f'<w:shd w:fill="{fill}" w:val="clear"/>' if fill else ""
    w_xml = f'<w:tcW w:w="{w}" w:type="dxa"/>' if w else ""
    bold_xml = '<w:b w:val="1"/><w:bCs w:val="1"/>' if bold else '<w:b w:val="0"/><w:bCs w:val="0"/>'
    color_xml = f'<w:color w:val="{text_color}"/>' if text_color else ""
    sz_xml = f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>' if sz else ""
    align_xml = f'<w:jc w:val="{align}"/>' if align else ""

    lines = str(text).split("\n")
    runs = ""
    for idx, line in enumerate(lines):
        br = '<w:br w:type="textWrapping"/>' if idx > 0 else ""
        runs += f'{br}<w:t xml:space="preserve">{xml_escape(line)}</w:t>'

    return (
        '<w:tc>'
        f'<w:tcPr>{w_xml}{shd_xml}<w:tcMar><w:top w:w="70.0" w:type="dxa"/><w:left w:w="90.0" w:type="dxa"/><w:bottom w:w="70.0" w:type="dxa"/><w:right w:w="90.0" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>'
        '<w:p w:rsidR="00000000" w:rsidDel="00000000" w:rsidP="00000000" w:rsidRDefault="00000000" w:rsidRPr="00000000">'
        f'<w:pPr>{align_xml}<w:spacing w:after="40" w:before="40" w:line="276" w:lineRule="auto"/><w:rPr/></w:pPr>'
        '<w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">'
        f'<w:rPr><w:rFonts w:ascii="Calibri" w:cs="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri"/>{bold_xml}{color_xml}{sz_xml}<w:rtl w:val="0"/></w:rPr>'
        f'{runs}'
        '</w:r>'
        '<w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rtl w:val="0"/></w:rPr></w:r>'
        '</w:p>'
        '</w:tc>'
    )

def status_cell(status: str = "Done", fill=None, w="1400"):
    """Tạo ô trạng thái Status chuẩn màu (Done = Xanh lá #15803d, In Progress = Xanh #0284c7)"""
    st = str(status).strip()
    st_lower = st.lower()
    if st_lower in ["done", "hoàn thành", "đạt"]:
        color = "15803d"
        label = "Done"
    elif st_lower in ["in progress", "in-progress", "doing", "đang làm"]:
        color = "0284c7"
        label = "In Progress"
    elif st_lower in ["pending", "todo", "chờ"]:
        color = "d97706"
        label = "Pending"
    else:
        color = "15803d"
        label = st or "Done"

    return cell(label, bold=True, fill=fill, text_color=color, sz="20", align="center", w=w)

def table(tbl_style: str, total_w: str, grid_cols: list, rows: list):
    """Tạo bảng OpenXML hoàn chỉnh với viền #cbd5e1 mỏng thanh lịch"""
    grid_xml = "".join(f'<w:gridCol w:w="{w}"/>' for w in grid_cols)
    rows_xml = "".join(
        f'<w:tr><w:trPr><w:cantSplit w:val="0"/><w:tblHeader w:val="0"/></w:trPr>{"".join(r)}</w:tr>'
        for r in rows
    )

    return (
        '<w:tbl>'
        f'<w:tblPr><w:tblStyle w:val="{tbl_style}"/><w:tblW w:w="{total_w}" w:type="dxa"/><w:jc w:val="center"/>'
        '<w:tblBorders>'
        '<w:top w:color="cbd5e1" w:space="0" w:sz="4" w:val="single"/>'
        '<w:left w:color="cbd5e1" w:space="0" w:sz="4" w:val="single"/>'
        '<w:bottom w:color="cbd5e1" w:space="0" w:sz="4" w:val="single"/>'
        '<w:right w:color="cbd5e1" w:space="0" w:sz="4" w:val="single"/>'
        '<w:insideH w:color="cbd5e1" w:space="0" w:sz="4" w:val="single"/>'
        '<w:insideV w:color="cbd5e1" w:space="0" w:sz="4" w:val="single"/>'
        '</w:tblBorders>'
        '<w:tblLayout w:type="fixed"/><w:tblLook w:val="0400"/></w:tblPr>'
        f'<w:tblGrid>{grid_xml}</w:tblGrid>'
        f'{rows_xml}'
        '</w:tbl>'
    )

def build_4col_table(table_id: str, row_data_list: list) -> str:
    """
    Xây dựng bảng chuẩn 4 cột: [# | Plan | Status | Actual]
    Độ rộng các cột: # (800 dxa), Plan (4300 dxa), Status (1400 dxa), Actual (7458 dxa) = 13958 dxa
    Tuân thủ 100% hình mẫu từ Google Docs
    """
    header_row = [
        cell("#", bold=True, fill="1e3a8a", text_color="ffffff", sz="20", align="center", w="800"),
        cell("Plan", bold=True, fill="1e3a8a", text_color="ffffff", sz="20", align="center", w="4300"),
        cell("Status", bold=True, fill="1e3a8a", text_color="ffffff", sz="20", align="center", w="1400"),
        cell("Actual", bold=True, fill="1e3a8a", text_color="ffffff", sz="20", align="center", w="7458"),
    ]

    rows = [header_row]
    for idx, r in enumerate(row_data_list):
        bg = "f8fafc" if idx % 2 == 1 else "ffffff"
        stt = str(r.get("stt", idx + 1))
        plan_text = r.get("plan", "")
        status_text = r.get("status", "Done")
        actual_text = r.get("actual", "")

        row = [
            cell(stt, bold=True, fill=bg, text_color="475569", sz="20", align="center", w="800"),
            cell(plan_text, bold=False, fill=bg, text_color="0f172a", sz="20", align="left", w="4300"),
            status_cell(status_text, fill=bg, w="1400"),
            cell(actual_text, bold=False, fill=bg, text_color="0f172a", sz="20", align="left", w="7458"),
        ]
        rows.append(row)

    return table(table_id, "13958.0", [800, 4300, 1400, 7458], rows)

def build_deliverables_table(code_items: list) -> str:
    """Tạo bảng Deliverables Code chạy được (mỗi tính năng 1 dòng viền #cbd5e1)"""
    if not code_items:
        return ""
    rows = []
    for idx, item in enumerate(code_items):
        bg = "f8fafc" if idx % 2 == 1 else "ffffff"
        rows.append([cell(item, bold=False, fill=bg, text_color="0f172a", sz="20", align="left", w="13958")])
    return table("TableDeliverables", "13958.0", [13958], rows)

def build_week_xml(data: dict) -> str:
    """Tạo chuỗi OpenXML đầy đủ cho một khối tuần báo cáo chuẩn hóa"""
    parts = []

    # 1. Tiêu đề Tuần
    parts.append(p("Heading1", f"[{data['weekTitle']}] {data['dateRange']}", "1e3a8a", bold=True, sz="32", before=280, after=120))
    parts.append(p("Heading2", "Project Report", "1e3a8a", bold=True, sz="28", before=200, after=80))
    parts.append(p("Heading3", "Overview", "334155", bold=True, sz="24", before=120, after=40))
    parts.append(p("Heading4", "Recover", "1e3a8a", bold=True, sz="22", before=80, after=40))

    # 2. Bảng Recover (Chuẩn 4 cột: # | Plan | Status | Actual)
    recover_rows = data.get("recoverRows", [])
    parts.append(build_4col_table("TableRecover", recover_rows))

    parts.append(p("Heading4", "Master plan", "1e3a8a", bold=True, sz="22", before=120, after=40))

    # 3. Bảng Master plan (Chuẩn 4 cột: # | Plan | Status | Actual)
    master_rows = data.get("masterPlanRows", [])
    parts.append(build_4col_table("TableMasterPlan", master_rows))

    # 4. Deliverables / Shipables this week
    parts.append(p("Heading3", "Deliverables / Shipables this week", "334155", bold=True, sz="24", before=120, after=40))
    parts.append(p(None, '// tuần này làm “ra” được cái gì?', "64748b", italic=True, before=0, after=40))
    parts.append(p(None, "Code chạy được:", "0f172a", bold=True, sz="20", before=40, after=40))

    deliverables_code = data.get("deliverablesCode", [])
    if isinstance(deliverables_code, str):
        # Tách chuỗi thành danh sách nếu người dùng truyền chuỗi phân tách bởi dấu chấm phẩy hoặc gạch đầu dòng
        raw_items = [s.strip("• \t\r\n") for s in deliverables_code.split(";") if s.strip()]
        if len(raw_items) <= 1:
            raw_items = [s.strip("• \t\r\n") for s in deliverables_code.split("\n") if s.strip()]
        deliverables_code = raw_items

    if deliverables_code:
        parts.append(build_deliverables_table(deliverables_code))

    deliverables_docs = data.get("deliverablesDocs", "")
    if deliverables_docs:
        parts.append(p(None, f"Tài liệu: {deliverables_docs}", "212529", sz="20", before=60, after=60))

    # 5. Issue (Bảng 6 cột chuẩn)
    parts.append(p("Heading3", "Issue", "334155", bold=True, sz="24", before=120, after=40))
    parts.append(p(None, "Team dự án Đang gặp trở ngại & vướng mắc gì?", "64748b", italic=True, before=0, after=40))

    issue_rows = [
        [
            cell("Issue", bold=True, fill="1e3a8a", text_color="ffffff", sz="17", align="center", w="2512"),
            cell("Chi tiết", bold=True, fill="1e3a8a", text_color="ffffff", sz="17", align="center", w="3070"),
            cell("Impact", bold=True, fill="1e3a8a", text_color="ffffff", sz="17", align="center", w="2512"),
            cell("Action", bold=True, fill="1e3a8a", text_color="ffffff", sz="17", align="center", w="3070"),
            cell("Commit deadline", bold=True, fill="1e3a8a", text_color="ffffff", sz="17", align="center", w="1396"),
            cell("Note", bold=True, fill="1e3a8a", text_color="ffffff", sz="17", align="center", w="1396"),
        ]
    ]
    for i, r in enumerate(data.get("issueRows", [])):
        bg = "f8fafc" if i % 2 == 1 else "ffffff"
        issue_rows.append([
            cell(r.get("issue", ""), bold=True, fill=bg, text_color="212529", sz="17", align="left", w="2512"),
            cell(r.get("detail", ""), bold=False, fill=bg, text_color="212529", sz="17", align="left", w="3070"),
            cell(r.get("impact", ""), bold=False, fill=bg, text_color="212529", sz="17", align="left", w="2512"),
            cell(r.get("action", ""), bold=False, fill=bg, text_color="212529", sz="17", align="left", w="3070"),
            cell(r.get("deadline", ""), bold=False, fill=bg, text_color="212529", sz="17", align="center", w="1396"),
            cell(r.get("note", ""), bold=False, fill=bg, text_color="212529", sz="17", align="left", w="1396"),
        ])
    parts.append(table("TableIssue", "13956.0", [2512, 3070, 2512, 3070, 1396, 1396], issue_rows))

    # 6. Plan next week
    parts.append(p("Heading3", "Plan next week", "334155", bold=True, sz="24", before=120, after=40))
    parts.append(p(None, 'Tuần sau “dự kiến” làm gì?', "64748b", italic=True, before=0, after=40))
    parts.append(table("TablePlanNextWeek", "13958.0", [6979, 6979], [
        [cell("Recover", bold=True, fill="ffffff", text_color="1e3a8a", sz="20", align="left", w="6979"),
         cell(data.get("nextWeekRecover", ""), bold=False, fill="ffffff", text_color="0f172a", sz="20", align="left", w="6979")],
        [cell("Master plan", bold=True, fill="f8fafc", text_color="1e3a8a", sz="20", align="left", w="6979"),
         cell(data.get("nextWeekMasterPlan", ""), bold=False, fill="f8fafc", text_color="0f172a", sz="20", align="left", w="6979")],
    ]))

    # 7. Meeting notes
    parts.append(p("Heading2", "Meeting notes", "1e3a8a", bold=True, sz="28", before=240, after=80))
    parts.append(p(None, "// Cái phần này thì sẽ viết sau mỗi buổi họp", "64748b", italic=True, before=0, after=40))
    parts.append(p(None, "// gửi vào 2 chỗ", "64748b", italic=True, before=0, after=40))
    parts.append(p(None, "// 1 phần giữ lại trong file WORD này, sau này khi nộp bài thì copy&paste cái file word ra là xong.", "64748b", italic=True, before=0, after=40))
    parts.append(p(None, "// nội dung meeting notes này thì copy&paste lên trên discord, để tiện follow trao đổi", "64748b", italic=True, before=0, after=60))

    parts.append(p("Heading3", "KEY NOTES", "334155", bold=True, sz="24", before=120, after=40))
    parts.append(p(None, "// các điểm đã thống nhất", "64748b", italic=True, before=0, after=40))
    parts.append(p(None, data.get("meetingKeyNotes", ""), "0f172a", sz="20", before=0, after=60))

    parts.append(p("Heading3", "TODO", "334155", bold=True, sz="24", before=120, after=40))
    parts.append(p(None, "// các việc phải làm mới thảo luận trong cuộc họp", "64748b", italic=True, before=0, after=40))
    parts.append(p(None, data.get("meetingTodo", ""), "0f172a", sz="20", before=0, after=60))

    parts.append(p("Heading3", "Thời gian, địa điểm, thành phần tham dự", "334155", bold=True, sz="24", before=120, after=40))
    parts.append(p(None, data.get("meetingInfo", ""), "0f172a", sz="20", before=0, after=160))

    return "".join(parts)

def find_week_range(doc_xml: str, week_title: str):
    """
    Tìm phạm vi [start, end) của khối tuần trong tài liệu XML
    Giúp thay thế đúng vị trí (In-place Update), triệt tiêu hoàn toàn lỗi nhân bản lặp tuần
    """
    pattern = r'<w:p\b[^>]*>(?:(?!<w:p\b).)*?<w:t[^>]*>\[' + re.escape(week_title) + r'\]'
    m = re.search(pattern, doc_xml)
    if not m:
        return None
    p_start = m.start()

    # Tìm vị trí bắt đầu của tuần kế tiếp
    next_week_pattern = r'<w:p\b[^>]*>(?:(?!<w:p\b).)*?<w:t[^>]*>\[Tuần\s+\d+\]'
    next_m = re.search(next_week_pattern, doc_xml[p_start + 50:])
    if next_m:
        p_end = p_start + 50 + next_m.start()
    else:
        # Nếu là tuần cuối cùng, kết thúc trước phần thẻ đóng thân trang sectPr hoặc body
        sect_idx = doc_xml.find('<w:sectPr', p_start)
        p_end = sect_idx if sect_idx != -1 else doc_xml.find('</w:body>', p_start)

    return p_start, p_end

def inject_week_to_docx(base_docx_path: str, output_docx_path: str, week_data: dict):
    """
    Giải nén docx, tiêm khối tuần mới với cơ chế IDEMPOTENT:
    - Nếu tuần đã tồn tại trong docx -> GHI ĐÈ TRỰC TIẾP (Replace in-place).
    - Nếu tuần chưa tồn tại -> CHÈN LÊN ĐẦU (Prepend trước tuần đầu tiên).
    - TUYỆT ĐỐI KHÔNG TẠO TRÙNG LẶP TUẦN.
    """
    tmp_dir = f"/tmp/weekly_docx_{int(time.time() * 1000)}"
    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir)
    os.makedirs(tmp_dir, exist_ok=True)

    with zipfile.ZipFile(base_docx_path, "r") as z:
        z.extractall(tmp_dir)

    doc_xml_path = os.path.join(tmp_dir, "word", "document.xml")
    with open(doc_xml_path, "r", encoding="utf-8") as f:
        doc_xml = f.read()

    week_xml = build_week_xml(week_data)
    week_title = week_data.get("weekTitle", "").strip()

    # Kiểm tra xem tuần này đã có trong file chưa
    week_range = find_week_range(doc_xml, week_title)

    if week_range:
        # TUẦN ĐÃ CÓ: Ghi đè cập nhật nội dung (Replace in-place)
        p_start, p_end = week_range
        doc_xml = doc_xml[:p_start] + week_xml + doc_xml[p_end:]
        print(f"🔄 Phát hiện [{week_title}] đã tồn tại trong tài liệu -> Ghi đè cập nhật nội dung (In-place Update), không tạo trùng lặp.")
    else:
        # TUẦN MỚI: Chèn lên đầu tuần cũ đầu tiên (Prepend)
        first_week_match = re.search(r'<w:p\b[^>]*>(?:(?!<w:p\b).)*?<w:t[^>]*>\[Tuần\s+\d+\]', doc_xml)
        if first_week_match:
            p_start_idx = first_week_match.start()
            doc_xml = doc_xml[:p_start_idx] + week_xml + doc_xml[p_start_idx:]
            print(f"✨ Chèn [{week_title}] mới lên đầu tài liệu (Prepend).")
        else:
            # Nếu chưa có tuần nào trong template, chèn trước thẻ đóng thân trang
            sect_idx = doc_xml.find("<w:sectPr")
            if sect_idx != -1:
                doc_xml = doc_xml[:sect_idx] + week_xml + doc_xml[sect_idx:]
            else:
                body_close_idx = doc_xml.find("</w:body>")
                doc_xml = doc_xml[:body_close_idx] + week_xml + doc_xml[body_close_idx:]
            print(f"✨ Khởi tạo [{week_title}] đầu tiên vào tài liệu.")

    with open(doc_xml_path, "w", encoding="utf-8") as f:
        f.write(doc_xml)

    # Nén lại file docx chuẩn OpenXML
    os.makedirs(os.path.dirname(os.path.abspath(output_docx_path)), exist_ok=True)
    with zipfile.ZipFile(output_docx_path, "w", zipfile.ZIP_DEFLATED) as z_out:
        for root, _, files in os.walk(tmp_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, tmp_dir)
                z_out.write(full_path, rel_path)

    shutil.rmtree(tmp_dir, ignore_errors=True)
    print(f"✅ Đã tạo thành công file Word tại: {output_docx_path}")

# =========================================================================
# DỮ LIỆU MẪU CHUẨN HÓA CHO TUẦN 9 (4 CỘT CHUẨN THEO HÌNH ẢNH)
# =========================================================================

DEFAULT_WEEK_9_DATA = {
    "weekTitle": "Tuần 9",
    "dateRange": "2026-11-02 ~ 2026-11-08",
    "recoverRows": [
        {
            "stt": 1,
            "plan": "Đóng gói & Nghiệm thu phân hệ Y tế số nâng cao: Hoàn thiện Sổ sức khỏe số (UC-106) & Hồ sơ bệnh án điện tử (UC-107), xử lý cảnh báo dị ứng/bệnh nền tại quầy POS.",
            "status": "Done",
            "actual": "Hoàn tất 100% Sổ sức khỏe số & Hồ sơ y tế điện tử (PR #264, PR #268 - Phước): Schema EMR, cấp QR cá nhân, cảnh báo dị ứng thời gian thực cho Dược sĩ kèm nút 'Đổi thuốc an toàn 1-click', bổ sung xác nhận điều khoản AI & chia sẻ y tế tuân thủ HIPAA/GDPR."
        },
        {
            "stt": 2,
            "plan": "Khắc phục giao diện xem chi tiết sản phẩm: Thay thế hoàn toàn popup modal cũ sang trang chi tiết độc lập theo chuẩn Nhà thuốc Long Châu.",
            "status": "Done",
            "actual": "Hoàn tất chuẩn hóa trang chi tiết sản phẩm chuyên biệt (Issue #267, PR #272 - Đạt): Xóa bỏ modal popup cũ, chuyển đổi sang trang độc lập /customer/product/:id; đồng bộ điều hướng mượt mà từ Trang chủ, Cửa hàng và Wishlist."
        },
        {
            "stt": 3,
            "plan": "Nâng cao bảo mật thông tin đánh giá (Data Privacy): Loại bỏ nguy cơ lộ số điện thoại thật hoặc số thứ tự tài khoản test trong phần nhận xét sản phẩm.",
            "status": "Done",
            "actual": "Hoàn tất tích hợp Data Sanitizer & Masking (Đạt): Tự động gọt bỏ tiền tố/hậu tố tài khoản test, ẩn số điện thoại dạng 09****1234 trên khối review sản phẩm."
        }
    ],
    "masterPlanRows": [
        {
            "stt": 1,
            "plan": "Trải nghiệm Khách hàng & Đánh giá Thuốc (UC-77): Xây dựng khối đánh giá xếp hạng sao và nhận xét chi tiết cho từng loại thuốc.",
            "status": "Done",
            "actual": "Hoàn thành 100% trọn gói UC-77 Review & Rating (Đạt - On Track): Xây dựng khối đánh giá xếp hạng sao và nhận xét chi tiết cho từng loại thuốc; thay thế alert trình duyệt bằng in-modal toast nội bộ; cải tiến màn hình Đơn hàng của tôi với bộ lọc đơn chờ đánh giá và hiển thị trạng thái đã review theo SKU để tránh gửi trùng lặp (PR #265, PR #272)."
        },
        {
            "stt": 2,
            "plan": "Hệ thống Mô phỏng Hành vi Tự động (Bot Simulator): Xây dựng khung bot mô phỏng hành vi 6 vai trò phục vụ test tải.",
            "status": "Done",
            "actual": "Hoàn thành Giai đoạn 1 & In Review (Phúc - On Track): Xây dựng khung kiến trúc Bot Simulator độc lập (PR #273); tích hợp bộ sinh hành động đa vai trò (simulator roles actions - PR #275): mô phỏng Dược sĩ mở/kết ca, Khách hàng đặt đơn PayOS VietQR, Quản lý kho kiểm đếm barcode, Giám đốc duyệt PO/PR."
        },
        {
            "stt": 3,
            "plan": "Súng quét Barcode Wi-Fi & Đếm sản phẩm Mobile: Biến camera điện thoại thành máy quét mã vạch không dây đồng bộ POS.",
            "status": "Done",
            "actual": "Hoàn thành 100% & Nghiệm thu (Nam - On Track): Hoàn tất PR #266 biến điện thoại thành súng quét Barcode Wi-Fi qua mạng LAN; kết nối trực tiếp màn hình POS máy tính thông qua kênh SSE/WebSocket độ trễ < 50ms; loại bỏ hoàn toàn mock data trong kiểm đếm kho, tuân thủ Zero Mock Policy."
        },
        {
            "stt": 4,
            "plan": "Local CI Quality Gate & Tối ưu Hạ tầng: Thiết lập cổng kiểm soát chất lượng nội bộ trước khi commit/push code.",
            "status": "Done",
            "actual": "Hoàn thành 100% (Phước - On Track): Tích hợp local-ci.sh và Git pre-push hook tự động (.github/.githooks, PR #269), kiểm tra nghiêm ngặt 7 Architecture Rules (Kafka 202 async, Redis Cache-Aside, Bounded Context, Test-Coupled Mandate, Comment tiếng Việt 100%); chuyển đổi torch CPU-only tiết kiệm hơn 2GB image."
        }
    ],
    "deliverablesCode": [
        "Trang chi tiết sản phẩm chuẩn Long Châu (/customer/product/:id)",
        "Phân hệ Đánh giá & Nhận xét sản phẩm (Review UC-77) kèm Data Sanitizer & Masking",
        "Hệ thống Sổ sức khỏe số (Digital Health Passport UC-106)",
        "Súng quét Barcode Wi-Fi đồng bộ POS qua SSE (PR #266)",
        "Khung Bot Simulator đa vai trò (PR #273, PR #275)",
        "Hạ tầng Local CI Quality Gate & Test-Coupled Mandate (PR #269)"
    ],
    "deliverablesDocs": "Tài liệu Hướng dẫn cấu hình Local CI & Git Pre-push Hook (.github/.githooks/); Đặc tả kịch bản hành vi đa vai trò Bot Simulator; Báo cáo kiểm thử thực địa Súng quét Barcode Wi-Fi qua mạng LAN.",
    "issueRows": [
        {
            "issue": "Nguy cơ rò rỉ dữ liệu cá nhân trên khối Review công khai",
            "detail": "Khi khách hàng gửi đánh giá, số điện thoại cá nhân và các tiền tố tài khoản test có thể hiển thị trực tiếp trên trang chi tiết sản phẩm công khai.",
            "impact": "Vi phạm chính sách bảo mật dữ liệu khách hàng (Data Privacy) và làm giảm tính chuyên nghiệp của giao diện bán lẻ.",
            "action": "Tích hợp bộ lọc làm sạch dữ liệu (Data Sanitizer & Masking): tự động gọt bỏ số thứ tự test account và mã hóa số điện thoại dạng 09****1234 theo chuẩn bảo mật Nhà thuốc Long Châu.",
            "deadline": "07/11/2026",
            "note": "Đã giải quyết & Merge PR #272"
        }
    ],
    "nextWeekRecover": "• Hoàn thiện rà soát code và merge chính thức phân hệ Bot Simulator đa vai trò (PR #273, PR #275).\n• Sửa lỗi (Fix bug) giao diện Dược sĩ tạo hồ sơ bệnh án y khoa trên thiết bị di động và kiểm thử nghiệm thu UI.",
    "nextWeekMasterPlan": "• Tối ưu hóa Luồng Kho & Tạo Nhanh Đơn Đặt Hàng Nhà Cung Cấp (PO): Bổ sung chọn nhiều mục thuốc thiếu hụt và tạo nhanh PO gửi NCC từ danh sách thuốc hết hàng tại chi nhánh; tích hợp tự động kiểm tra lịch sử mua hàng khi khách bấm đánh giá từ trang sản phẩm.\n• Kiểm thử Toàn Diện Workflow & Đóng Băng Tính Năng: Chạy toàn bộ test suites trên Local CI và GitHub Actions; kiểm thử e2e luồng: Quét Barcode Wi-Fi -> Điều chuyển chi nhánh -> POS bán lẻ -> Sổ sức khỏe số -> Đánh giá thuốc chuẩn Long Châu.",
    "meetingKeyNotes": "1. Thống nhất chuyển đổi 100% trải nghiệm xem thuốc từ popup sang trang chi tiết sản phẩm độc lập /customer/product/:id theo chuẩn Nhà thuốc Long Châu, đồng bộ điều hướng nhất quán từ mọi vị trí.\n2. Bắt buộc kích hoạt Local CI Quality Gate (scripts/local-ci.sh) và Git pre-push hook nội bộ trên toàn bộ máy thành viên để loại bỏ vi phạm kiến trúc trước khi tạo PR.\n3. Nghiệm thu giải pháp Súng quét Barcode Wi-Fi biến camera điện thoại thành máy quét không dây đồng bộ phiên POS; đồng thuận đưa Bot Simulator vào quy trình demo tự động.",
    "meetingTodo": "- [Trần Hồng Phước]: Giám sát an toàn dữ liệu và tối ưu hiệu năng Microservices; sửa lỗi Dược sĩ tạo hồ sơ y tế trên mobile. (Deadline: 14/11/2026)\n- [Nguyễn Tiến Đạt]: Triển khai giao diện luồng kho trên Web/Mobile; hoàn thiện kiểm tra lịch sử mua hàng khi đánh giá sản phẩm. (Deadline: 13/11/2026)\n- [Đinh Anh Phúc]: Hoàn thiện Bot Simulator mô phỏng đa vai trò, xây dựng kịch bản kiểm thử tải tự động và tích hợp vào quy trình demo hệ thống. (Deadline: 13/11/2026)\n- [Nguyễn Văn Nam]: Kiểm tra tính tương thích của súng quét Barcode Wi-Fi; giám sát pipeline Local CI và GitHub Actions. (Deadline: 15/11/2026)",
    "meetingInfo": "• Thời gian: 21:00 - 22:30, Chủ Nhật ngày 08/11/2026\n• Địa điểm: Kênh Voice Discord (SEP490-SE06 Meeting Room)\n• Thành phần: Trần Hồng Phước (Leader), Đinh Anh Phúc, Nguyễn Tiến Đạt, Nguyễn Văn Nam"
}

def print_discord_meeting_notes(data: dict):
    """In bản trích xuất Discord Meeting Notes chuẩn format để copy-paste trực tiếp"""
    discord_text = f"""
================================================================================
📢 DISCORD MEETING NOTES - COPY & PASTE LÊN KÊNH #MEETING-NOTES / #DAILY-STAND-UP:
================================================================================

# 📢 [SEP490-SE06] BIÊN BẢN HỌP TUẦN & TỔNG KẾT TIẾN ĐỘ - {data['weekTitle'].upper()}
**Thời gian:** {data['dateRange']}  
**Thành phần tham dự:** Trần Hồng Phước (Leader), Đinh Anh Phúc, Nguyễn Tiến Đạt, Nguyễn Văn Nam  
**Địa điểm:** Discord Voice Channel (SEP490-SE06)  

---

### 🎯 1. KẾT QUẢ NỔI BẬT ĐÃ HOÀN THÀNH (DONE)
* **Trang chi tiết sản phẩm chuẩn Long Châu:** Chuyển đổi toàn bộ popup cũ sang trang độc lập `/customer/product/:id`, đồng bộ điều hướng từ Trang chủ & Cửa hàng.
* **Đánh giá & Nhận xét sản phẩm (UC-77):** Chấm điểm sao, review chi tiết, in-modal toast thông báo, tích hợp bộ lọc **Data Sanitizer & Masking** ẩn SĐT và che thông tin test account.
* **Sổ sức khỏe số (Digital Health Passport UC-106):** Hoàn thành EMR, sinh mã QR y tế, cảnh báo tương tác dị ứng/bệnh nền thời gian thực kèm nút "Đổi thuốc an toàn 1-click".
* **Súng quét Barcode Wi-Fi (PR #266):** Biến camera di động thành máy quét mã vạch không dây đồng bộ phiên bán hàng POS qua SSE/WebSocket, độ trễ < 50ms, Zero Mock Data.
* **Bot Simulator (PR #273, PR #275):** Xây dựng khung mô phỏng tự động hành vi 6 vai trò phục vụ test tải và demo.
* **Local CI Quality Gate (PR #269):** Thiết lập `local-ci.sh` và Git pre-push hook tự động bắt lỗi 7 Architecture Rules.

---

### 💡 2. KEY NOTES (CÁC ĐIỂM THỐNG NHẤT TRONG CUỘC HỌP)
1. Thống nhất chuyển đổi 100% xem thuốc sang trang chi tiết sản phẩm độc lập chuẩn Long Châu.
2. Kích hoạt bắt buộc Local CI Quality Gate trên toàn bộ máy thành viên trước khi push code.
3. Nghiệm thu súng quét Barcode Wi-Fi và đưa Bot Simulator vào kịch bản demo hệ thống.

---

### 📋 3. TODO & PHÂN CÔNG CÔNG VIỆC TUẦN TỚI
* **[Trần Hồng Phước]:** Giám sát an toàn dữ liệu và tối ưu hiệu năng Microservices; sửa lỗi Dược sĩ tạo hồ sơ y tế trên mobile. *(Deadline: 14/11/2026)*
* **[Nguyễn Tiến Đạt]:** Tối ưu hóa luồng kho trên Web/Mobile; hoàn thiện kiểm tra lịch sử mua hàng khi đánh giá sản phẩm. *(Deadline: 13/11/2026)*
* **[Đinh Anh Phúc]:** Hoàn thiện Bot Simulator mô phỏng đa vai trò, xây dựng kịch bản kiểm thử tải tự động và tích hợp vào quy trình demo hệ thống. *(Deadline: 13/11/2026)*
* **[Nguyễn Văn Nam]:** Kiểm tra tính tương thích của súng quét Barcode Wi-Fi; giám sát pipeline Local CI và GitHub Actions. *(Deadline: 15/11/2026)*

================================================================================
"""
    print(discord_text)

# =========================================================================
# HÀM ĐIỀU PHỐI CHÍNH (MAIN ORCHESTRATOR)
# =========================================================================

def main():
    parser = argparse.ArgumentParser(description="Tự động lập báo cáo tuần và đồng bộ Google Docs cho WDP301/SEP490")
    parser.add_argument("--week-title", default=DEFAULT_WEEK_9_DATA["weekTitle"], help="Tiêu đề tuần (ví dụ: 'Tuần 9')")
    parser.add_argument("--date-range", default=DEFAULT_WEEK_9_DATA["dateRange"], help="Khoảng thời gian (ví dụ: '2026-11-02 ~ 2026-11-08')")
    parser.add_argument("--data-json", help="Đường dẫn file JSON chứa dữ liệu tuần tùy biến")
    parser.add_argument("--file-id", default=DEFAULT_FILE_ID, help="Google Drive File ID của tài liệu")
    parser.add_argument("--sync", action="store_true", help="Đồng bộ trực tiếp lên Google Docs Cloud qua Google Drive API")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ tạo file Word cục bộ, không upload lên mây")
    parser.add_argument("--discord", action="store_true", help="In đoạn trích xuất Discord Meeting Notes ra màn hình")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_DOCX, help="Đường dẫn file Word xuất ra")

    args = parser.parse_args()

    # 1. Nạp dữ liệu báo cáo tuần
    if args.data_json and os.path.exists(args.data_json):
        with open(args.data_json, "r", encoding="utf-8") as f:
            week_data = json.load(f)
    else:
        week_data = DEFAULT_WEEK_9_DATA.copy()
        if args.week_title:
            week_data["weekTitle"] = args.week_title
        if args.date_range:
            week_data["dateRange"] = args.date_range

    print(f"\n🚀 Khởi động quy trình Weekly Report cho [{week_data['weekTitle']}] ({week_data['dateRange']})...")

    # 2. Xác định file template cơ sở (Base docx)
    base_docx = args.output if os.path.exists(args.output) else None
    if not base_docx and os.path.exists(FALLBACK_TEMPLATE):
        base_docx = FALLBACK_TEMPLATE
    elif not base_docx:
        base_docx = "/tmp/cloud_template.docx"
        sa_path = find_service_account_path()
        if sa_path:
            token = get_google_access_token(sa_path)
            download_cloud_template(args.file_id, base_docx, token)

    if not base_docx or not os.path.exists(base_docx):
        raise FileNotFoundError(f"❌ Không tìm thấy file template gốc tại: {base_docx}")

    print(f"📖 Sử dụng file template cơ sở: {base_docx}")

    # 3. Tiêm khối tuần vào file .docx (Idempotent: Replace if exists, Prepend if new)
    output_docx = args.output
    inject_week_to_docx(base_docx, output_docx, week_data)

    # Tự động sao lưu một bản sang ~/Downloads để tiện kéo thả
    try:
        shutil.copyfile(output_docx, DOWNLOADS_OUTPUT_DOCX)
        print(f"📁 Đã sao lưu một bản sang Downloads: {DOWNLOADS_OUTPUT_DOCX}")
    except Exception as e:
        print(f"⚠️ Không thể copy sang Downloads: {e}")

    # 4. Đồng bộ trực tiếp lên Google Docs Cloud nếu có cờ --sync
    if args.sync and not args.dry_run:
        sa_path = find_service_account_path()
        if sa_path:
            sync_to_google_drive(args.file_id, output_docx, sa_path)
        else:
            print("⚠️ Không tìm thấy khóa xác thực Service Account hợp lệ để đồng bộ lên Cloud!")
    elif args.dry_run:
        print("ℹ️ Chế độ Dry-run: Bỏ qua bước đồng bộ lên Google Docs Cloud.")

    # 5. Xuất bản Discord Meeting Notes nếu có cờ --discord
    if args.discord:
        print_discord_meeting_notes(week_data)

if __name__ == "__main__":
    main()
