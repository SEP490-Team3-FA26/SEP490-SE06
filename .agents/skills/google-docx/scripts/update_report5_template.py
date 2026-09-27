import sys
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="B0C4DE", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def update_report5_template():
    input_path = 'docs/Report5_Downloaded.docx'
    output_path = 'docs/Report5_Test_Documentation_Updated.docx'
    
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        return
        
    doc = Document(input_path)
    
    # 1. Update Table 0: Record of Changes
    table_0 = doc.tables[0]
    # Check row 1 (first row after header)
    row_1 = table_0.rows[1]
    row_1.cells[0].text = "17/09/2026"
    row_1.cells[1].text = "A"
    row_1.cells[2].text = "Trần Hồng Phước (DE180577)"
    row_1.cells[3].text = "Update Section 3.2 Test Environment: Add tools, providers, versions, system URLs, and test accounts for Unit Test & System Test environments."
    
    # Style row 1 text
    for cell in row_1.cells:
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            for run in p.runs:
                run.font.size = Pt(9.5)
                run.font.name = 'Calibri'

    # 2. Update Paragraph P45 (Intro for 3.2 Test Environment)
    p45 = doc.paragraphs[45]
    p45.text = (
        "To guarantee the quality, stability, and reliability of the Smart Pharmacy Chain Management System "
        "(WDP301 / ABC Pharmacy), the test environment is architecturally segregated into two specialized environments: "
        "the Unit Test Environment (isolated component testing focusing on business logic, calculations, and DTO validations "
        "using In-Memory database and mock services) and the System Test Environment (comprehensive end-to-end testing deployed "
        "on Cloud VPS infrastructure to validate event-driven microservices via Kafka, caching with Redis, MongoDB Atlas data persistence, "
        "Qdrant vector search, and PayOS payment gateway integration)."
    )
    p45.paragraph_format.space_before = Pt(4)
    p45.paragraph_format.space_after = Pt(8)
    p45.paragraph_format.line_spacing = 1.15
    for r in p45.runs:
        r.font.name = 'Calibri'
        r.font.size = Pt(11)

    # 3. Update Table 4 (Purpose, Tool, Provider, Version)
    table_4 = doc.tables[4]
    
    # Tool entries to populate
    tool_rows = [
        # Unit test tools
        ("Unit & Component Test Runner & Assertions", "Jest", "Meta / npm open-source", "v29.7.0"),
        ("TypeScript Preprocessor & In-Memory Compiler", "ts-jest", "kulshekhar / npm", "v29.1.2"),
        ("Dependency Injection & Mock Service Testbed", "@nestjs/testing", "NestJS Team", "v10.4.22"),
        ("HTTP Controller & Request Simulation", "Supertest", "LadJS / npm open-source", "v7.2.2"),
        ("In-Memory Database Engine (Zero Pollution)", "mongodb-memory-server", "nodkz / npm open-source", "v11.2.0"),
        # System test tools & infra
        ("API Functional, Integration & Regression Testing", "Postman & Newman CLI", "Postman, Inc.", "v11.x / v6.x"),
        ("End-to-End (E2E) Web UI Automated Testing", "Playwright", "Microsoft", "v1.42+"),
        ("Kafka Message Streaming & Consumer Lag Monitor", "Kafka Console Consumer & CLI", "Confluent Platform", "v7.4.0 (KRaft)"),
        ("Redis Cache-Aside & Eviction Verification", "Redis-CLI", "Redis Ltd.", "v7.2-alpine"),
        ("Cloud Virtual Private Server (Host Engine)", "Ubuntu 24.04 LTS (3 vCPU, 6GB RAM)", "iNet Solutions Cloud", "Kernel 6.8"),
        ("Reverse Proxy, SSL Termination & SSE Handler", "Nginx", "Nginx, Inc. (Dockerized)", "v1.25.4-alpine"),
        ("Production Cloud Database Cluster", "MongoDB Atlas (M10 Replica Set)", "MongoDB, Inc.", "v6.8+"),
        ("Cloud Object Storage & Async SQS/SES Email", "AWS S3 / SQS / SES", "Amazon Web Services (Singapore)", "AWS SDK v3.1069"),
        ("Vector Search Engine for AI Medicine Matcher", "Qdrant Vector DB", "Qdrant Solutions", "v1.8.4"),
        ("Payment Gateway Sandbox (VietQR Auto-match)", "PayOS Sandbox Gateway", "PayOS Vietnam", "SDK v2.0.5"),
        ("Continuous Integration & Automated Test Pipeline", "Jenkins CI Automation", "Jenkins Community (Docker)", "v2.440.3 LTS")
    ]
    
    # Format Table 4 Header
    header_row = table_4.rows[0]
    for cell in header_row.cells:
        set_cell_background(cell, "1E3A8A") # Navy Blue
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            for r in p.runs:
                r.bold = True
                r.font.name = 'Calibri'
                r.font.size = Pt(10.5)
                r.font.color.rgb = RGBColor(255, 255, 255)

    # Clear existing empty rows in table 4 (rows 1 and 2)
    while len(table_4.rows) > 1:
        tr = table_4.rows[-1]._tr
        tr.getparent().remove(tr)
        
    # Append new rows
    for r_idx, (purpose, tool, provider, version) in enumerate(tool_rows):
        row = table_4.add_row()
        vals = [purpose, tool, provider, version]
        bg = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        
        for c_idx, val in enumerate(vals):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.1
            for r in p.runs:
                r.font.name = 'Calibri'
                r.font.size = Pt(9.5)
                r.font.color.rgb = RGBColor(30, 41, 59)
                if c_idx == 1:
                    r.bold = True
                    
    set_table_borders(table_4, color="CBD5E1", sz="4")

    # 4. Insert Subsections 3.2.1 and 3.2.2 right after Table 4
    # Find position of Table 4 in body
    tbl4_element = table_4._tbl
    
    # Helper to insert paragraph after an XML element
    def insert_p_after(element, text, style='Normal', space_before=6, space_after=3, is_bold=False, font_size=11, color_rgb=(30, 41, 59)):
        new_p = doc.add_paragraph(style=style)
        new_p.paragraph_format.space_before = Pt(space_before)
        new_p.paragraph_format.space_after = Pt(space_after)
        new_p.paragraph_format.line_spacing = 1.15
        run = new_p.add_run(text)
        run.bold = is_bold
        run.font.name = 'Calibri'
        run.font.size = Pt(font_size)
        run.font.color.rgb = RGBColor(*color_rgb)
        element.addnext(new_p._p)
        return new_p._p

    # We build the elements in reverse order or sequentially
    curr_el = tbl4_element
    
    # Insert Heading 3.2.1
    curr_el = insert_p_after(curr_el, "3.2.1 System & Application URLs (Danh Mục URL & Cổng Truy Cập)", 
                             space_before=14, space_after=4, is_bold=True, font_size=12, color_rgb=(30, 58, 138))
                             
    curr_el = insert_p_after(curr_el, "The table below lists all endpoints, user-facing URLs, administrative dashboards, and internal network ports used for system testing and integration verification:", 
                             space_before=2, space_after=6, is_bold=False, font_size=10.5, color_rgb=(51, 65, 85))

    # Add Table of URLs
    urls_data = [
        ("Web Frontend (Backoffice & POS)", "https://abcpharmacy.store", "443 / HTTPS (Nginx)", "System Test (Production Domain)"),
        ("Staging Web Application", "http://103.75.187.86:3000", "3000 / HTTP", "Staging Cloud VPS"),
        ("Local Web Development", "http://localhost:3000", "3000 / HTTP", "Local Machine"),
        ("API Gateway (REST API)", "https://abcpharmacy.store/api", "4000 / REST JSON", "System Test / Staging VPS"),
        ("Swagger OpenAPI Documentation", "https://abcpharmacy.store/api/docs", "4000 / Swagger UI", "Interactive API Testing"),
        ("Realtime Events Stream (SSE)", "https://abcpharmacy.store/api/events/sse", "4000 / HTTP SSE", "Real-time Notifications"),
        ("AI Recommendation Service", "http://103.75.187.86:8000", "8000 / HTTP REST", "FastAPI Drug Advisor"),
        ("Qdrant Vector Database", "http://103.75.187.86:6333/dashboard", "6333 / REST", "Vector DB Embeddings Dashboard"),
        ("Jenkins CI/CD Automation", "http://103.75.187.86:8080", "8080 / HTTP", "Build & Pipeline Test Dashboard"),
        ("Mobile App (Metro Bundler)", "exp://103.75.187.86:8081", "8081 / WebSocket", "Expo Mobile Testing Environment")
    ]
    
    tbl_urls = doc.add_table(rows=len(urls_data)+1, cols=4)
    tbl_urls.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_urls, color="CBD5E1", sz="4")
    
    # Headers
    url_headers = ["System / Component", "Access URL / Endpoint", "Port / Protocol", "Test Environment Scope"]
    for c_idx, h_text in enumerate(url_headers):
        cell = tbl_urls.rows[0].cells[c_idx]
        cell.text = h_text
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, top=90, bottom=90, left=100, right=100)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        for r in p.runs:
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(255, 255, 255)
            
    # Rows
    for r_idx, row_vals in enumerate(urls_data):
        row = tbl_urls.rows[r_idx + 1]
        bg = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=60, bottom=60, left=90, right=90)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            for r in p.runs:
                r.font.name = 'Calibri'
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(30, 41, 59)
                if c_idx == 0:
                    r.bold = True
                elif c_idx == 1:
                    r.font.color.rgb = RGBColor(37, 99, 235)
                    
    curr_el.addnext(tbl_urls._tbl)
    curr_el = tbl_urls._tbl

    # Insert Heading 3.2.2
    curr_el = insert_p_after(curr_el, "3.2.2 Test Accounts Specification (Thông Tin Tài Khoản Kiểm Thử)", 
                             space_before=14, space_after=4, is_bold=True, font_size=12, color_rgb=(30, 58, 138))
                             
    curr_el = insert_p_after(curr_el, "A. Unit Test Environment (Mock Users & Fixtures):", 
                             space_before=4, space_after=2, is_bold=True, font_size=11, color_rgb=(30, 41, 59))
                             
    curr_el = insert_p_after(curr_el, "Unit testing operates completely isolated from physical databases. User contexts are injected dynamically into execution guards via NestJS ExecutionContext mocking without requiring real database credentials:", 
                             space_before=1, space_after=6, is_bold=False, font_size=10, color_rgb=(71, 85, 105))

    # Unit test accounts table
    unit_accounts = [
        ("Mock Admin", "admin.test@vinapharmacy.com", "admin", "ALL_BRANCHES", "Verify admin authorization guards & chain-wide analytics"),
        ("Mock Head Branch", "manager.test@vinapharmacy.com", "branch / head_branch", "BR-001 (CN1)", "Verify Purchase Requisition (PR) generation and approval workflow"),
        ("Mock Warehouse", "warehouse.test@vinapharmacy.com", "warehouse", "CENTRAL_WH", "Verify supplier stock receipt, batch allocation, barcode generation"),
        ("Mock Pharmacist", "pharmacist.test@vinapharmacy.com", "pharmacist", "BR-001", "Verify POS sales desk, voucher validation, and stock balance deduction"),
        ("Mock Customer", "customer.test@gmail.com", "user", "None", "Verify online customer checkout, cart calculation, pill reminder scheduling")
    ]
    
    tbl_unit = doc.add_table(rows=len(unit_accounts)+1, cols=5)
    tbl_unit.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_unit, color="CBD5E1", sz="4")
    
    unit_headers = ["Fixture Name", "Mock Identifier (Email)", "Mock Role", "Branch Scope", "Testing Purpose"]
    for c_idx, h_text in enumerate(unit_headers):
        cell = tbl_unit.rows[0].cells[c_idx]
        cell.text = h_text
        set_cell_background(cell, "334155") # Slate Dark
        set_cell_margins(cell, top=80, bottom=80, left=90, right=90)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        for r in p.runs:
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(255, 255, 255)
            
    for r_idx, row_vals in enumerate(unit_accounts):
        row = tbl_unit.rows[r_idx + 1]
        bg = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=50, bottom=50, left=80, right=80)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            for r in p.runs:
                r.font.name = 'Calibri'
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(30, 41, 59)
                if c_idx == 0:
                    r.bold = True
                    
    curr_el.addnext(tbl_unit._tbl)
    curr_el = tbl_unit._tbl

    # System test accounts intro
    curr_el = insert_p_after(curr_el, "B. System Test Environment (Real Seeded Accounts in MongoDB Atlas):", 
                             space_before=10, space_after=2, is_bold=True, font_size=11, color_rgb=(30, 41, 59))
                             
    curr_el = insert_p_after(curr_el, "All accounts listed below are pre-provisioned and seeded directly into the MongoDB Atlas Cloud database on the System Test environment. Shared default testing password for all accounts: 123456", 
                             space_before=1, space_after=6, is_bold=False, font_size=10, color_rgb=(71, 85, 105))

    # System test accounts table
    sys_accounts = [
        ("1", "Admin", "Quản Trị Viên Hệ Thống", "admin@vinapharmacy.com", "123456", "All Branches", "Full system governance, branch creation, master catalog management"),
        ("2", "Head Branch", "Quản Lý Chi Nhánh 1", "manager@vinapharmacy.com", "123456", "BR-001 (Quận 1)", "Approve PR procurement, staff roster management, GPP invoice issuance"),
        ("3", "Branch Manager", "Trần Hồng Phước", "de180577tranhongphuoc@gmail.com", "123456", "BR-002 (TP. Thủ Đức)", "Cross-branch internal transfer, branch inventory balance auditing"),
        ("4", "Branch Manager", "Quản Lý Chi Nhánh 3", "phuocthde180577@fpt.edu.vn", "123456", "BR-003 (Bình Thạnh)", "Branch sales target allocation (KPI), near-expiry drug alerts monitoring"),
        ("5", "Branch Manager", "Quản Lý Chi Nhánh 4", "phuche2004p@gmail.com", "123456", "BR-004 (Gò Vấp)", "Store profile updates, operating hours configuration, cycle counting"),
        ("6", "Warehouse Staff", "Thủ Kho Phước Lê", "warehouse@vinapharmacy.com", "123456", "CENTRAL_WH", "Supplier goods receipt, batch numbering, barcode printing, 2D/3D GSP layout"),
        ("7", "Pharmacist", "Dược Sĩ Quầy Thuốc CN1", "pharmacist@vinapharmacy.com", "123456", "BR-001 (Quận 1)", "POS counter sales, barcode scanning, voucher redemption, PayOS QR payment"),
        ("8", "Customer (Web)", "Khách Hàng Thân Thiết", "user@ABC pharmacy.com", "123456", "Web Online", "Online pharmacy browsing, cart checkout, order tracking, PayOS payment"),
        ("9", "Mobile App User", "Khách Hàng Di Động", "phuoc.mobile.test@gmail.com", "123456", "Mobile (Expo)", "AI camera prescription scanner, medication reminder push notifications")
    ]

    tbl_sys = doc.add_table(rows=len(sys_accounts)+1, cols=7)
    tbl_sys.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_sys, color="CBD5E1", sz="4")
    
    sys_headers = ["No.", "Role", "Full Name", "Login Email", "Password", "Assigned Branch", "Permissions & Test Scope"]
    for c_idx, h_text in enumerate(sys_headers):
        cell = tbl_sys.rows[0].cells[c_idx]
        cell.text = h_text
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, top=80, bottom=80, left=70, right=70)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        for r in p.runs:
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(255, 255, 255)
            
    for r_idx, row_vals in enumerate(sys_accounts):
        row = tbl_sys.rows[r_idx + 1]
        bg = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=50, bottom=50, left=60, right=60)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            for r in p.runs:
                r.font.name = 'Calibri'
                r.font.size = Pt(8.5)
                r.font.color.rgb = RGBColor(30, 41, 59)
                if c_idx in [0, 1]:
                    r.bold = True
                    
    curr_el.addnext(tbl_sys._tbl)
    curr_el = tbl_sys._tbl

    # Save to output file
    doc.save(output_path)
    # Also overwrite the downloaded template directly so both paths are fresh
    doc.save(input_path)
    print(f"✅ Successfully updated Report 5 Template at: {output_path}")
    print(f"✅ Also overwritten to original template file: {input_path}")

if __name__ == '__main__':
    update_report5_template()
