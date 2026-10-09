---
name: abc-code-review
description: "Quy trình và tiêu chuẩn review Pull Request (PR) chuẩn hóa toàn diện cho dự án WDP301/SEP490: kết hợp đánh giá 2 trục (Standards vs Spec), kiểm tra tuân thủ Fullstack Playbook v2.0 (.agents/rules/trienkhaitaskmoi.md: Microservices Event-Driven Kafka 202, Redis Cache-Aside, API Gateway Bounded Context, Frontend 3-Tier, English comments, GSP/GDP/GPP Medical Domain rules), phát hiện Code Smells & Security RBAC, và tự động xuất báo cáo review chuyên nghiệp kèm phán quyết (Approve/Request Changes)."
---

# Quy Trình Review Pull Request Toàn Diện (`/abc-code-review`)
### Bộ Tiêu Chuẩn 2 Trục Đánh Giá: Kỹ Thuật (Standards) • Nghiệp Vụ (Spec)
### Dựa trên: Fullstack Implementation Playbook v2.0 (`.agents/rules/trienkhaitaskmoi.md`)
### Hệ Thống WDP301: NestJS Gateway + Kafka + Redis + MongoDB + React 19 Web + Expo Mobile

Tài liệu này là **Quy trình chuẩn tối cao (Standard Review Protocol)** dành cho các thành viên trong đội ngũ phát triển WDP301/SEP490 để tiến hành đánh giá mã nguồn (Code Review) cho mọi Pull Request (PR), nhánh tính năng (Feature Branch) hoặc commit trước khi sáp nhập (merge).

> [!CAUTION]
> **Các Nguyên Tắc Bất Biến (Immutable Review Gates) - Vi phạm bất kỳ điều nào dưới đây lập tức gán nhãn `REQUEST CHANGES`:**
> 1. **Giao tiếp liên dịch vụ:** Tuyệt đối **không** được gọi HTTP trực tiếp giữa các microservices nội bộ; mọi giao tiếp liên dịch vụ **bắt buộc** phải đi qua **Kafka**.
> 2. **Cổng giao tiếp Client:** Frontend Web và Mobile tuyệt đối **không** kết nối trực tiếp vào Database hoặc Microservice; mọi request **bắt buộc** phải qua **API Gateway** (`/api/...`).
> 3. **Bản chất Event-Driven Kafka (HTTP 202 Accepted):** Các thao tác Ghi (`POST`, `PUT`, `DELETE`) tại Gateway trả về **HTTP 202 Accepted**. Client **không được re-fetch ngay tức thì** mà phải có độ trễ **Delayed Re-fetch (500ms - 1000ms)** hoặc áp dụng Optimistic UI / Socket.IO để tránh đọc dữ liệu cũ khi Consumer chưa kịp ghi DB / cập nhật Redis.
> 4. **Ngôn ngữ chú thích mã nguồn:** Toàn bộ code comment (`//`, `/* */`, JSDoc) **bắt buộc viết bằng Tiếng Anh**. Không chấp nhận tiếng Việt trong code comments.
> 5. **Git & Dependency Hygiene:** Không commit file `.env`, credentials, secrets, hoặc các thư viện không liên quan đến phạm vi PR trong `package.json` / `package-lock.json`.

---

## 1. Triết Lý Đánh Giá 2 Trục Độc Lập (The Two-Axis Review Philosophy)

Mọi PR được đánh giá dọc theo 2 trục tách biệt nhằm tránh tình trạng một trục che lấp trục kia:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 ABC CODE REVIEW ENGINE                  │
                  └─────────────────────────────────────────────────────────┘
                                   │                       │
                 ┌─────────────────┴──┐                 ┌──┴──────────────────┐
                 ▼                    ▼                 ▼                     ▼
          ┌─────────────┐      ┌─────────────┐   ┌─────────────┐       ┌─────────────┐
          │ TRỤC 1 (A)  │      │ TRỤC 1 (B)  │   │ TRỤC 2 (A)  │       │ TRỤC 2 (B)  │
          │ ARCHITECTURE│      │ CLEAN CODE  │   │ SPEC MATCH  │       │ DOMAIN/GSP  │
          │ & PLAYBOOK  │      │ & SMELLS    │   │ REQUIREMENT │       │ COMPLIANCE  │
          └─────────────┘      └─────────────┘   └─────────────┘       └─────────────┘
                 │                    │                 │                     │
                 └────────────────────┼─────────────────┴─────────────────────┘
                                      ▼
                        BÁO CÁO REVIEW CHUẨN HÓA (VERDICT)
                   [APPROVE / REQUEST CHANGES / COMMENT]
```

- **Trục 1: Tiêu Chuẩn Kỹ Thuật (Standards Axis):** Mã nguồn có tuân thủ cấu trúc kiến trúc, tiêu chuẩn kỹ thuật của repo (Playbook v2.0, Redis caching, Kafka messaging, 3-tier frontend, RBAC, error handling, clean code smells)?
- **Trục 2: Đáp Ứng Nghiệp Vụ & Yêu Cầu (Spec / Domain Axis):** Mã nguồn có thực hiện đúng và đủ yêu cầu của User Story / Task Jira / Issue không? Có bị thiếu sót (missing) hoặc vượt phạm vi yêu cầu (scope creep) không? Có tuân thủ nghiệp vụ ngành dược (GSP kho bãi, GDP phân phối, GPP nhà thuốc, FEFO)?

---

## 2. Danh Sách Kiểm Tra Trục 1: Tiêu Chuẩn Kỹ Thuật (Standards Checklist)

### 2.1. Tầng API Gateway & Microservice (Backend)
- [ ] **HTTP Method & Mã trạng thái chuẩn:**
  - `GET`: Trả về `200 OK` (Cache-Aside qua Redis hoặc Kafka `send()`).
  - `POST` / `PUT` / `DELETE` (Ghi bất đồng bộ): Trả về `202 ACCEPTED` với payload `{ status: 'Accepted', message: '...' }`.
- [ ] **Topic Kafka chuẩn Domain-Driven:**
  - Sự kiện một chiều (Emit): `<domain>.<entity>.event.<action>` hoặc `<entity>.event.<action>` (VD: `inventory.medicine.event.relocate_bin`, `product.event.create`).
  - Yêu cầu phản hồi (Send): `<domain>.<entity>.<action>` (VD: `inventory.medicine.list`, `supplier.get_by_id`).
  - Microservice prefix tương ứng: `inventory.*`, `user.*`, `supplier.*`, `orders.*`, `auth.*`, `ai.*`.
- [ ] **Redis Cache & Cache Eviction:**
  - Read One: Cache-Aside (`cacheKey = entity:id`, check Redis -> nếu miss thì gọi Kafka -> lưu lại với `CACHE_TTL`).
  - Update / Delete: Chủ động xóa cache key liên quan (`await this.cacheManager.del(cacheKey)`).
- [ ] **Consumer Controller:**
  - Dùng `@EventPattern` cho các sự kiện Ghi, xử lý payload an toàn (`typeof data === 'string' ? JSON.parse(data) : data`).
  - Dùng `@MessagePattern` cho các truy vấn Đọc trả về dữ liệu.
- [ ] **Bảo mật & Phân quyền (RBAC):**
  - Mọi endpoint nhạy cảm phải có `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.
  - Không để lộ thông tin nhạy cảm (passwords, JWT secrets, salt) trong response hoặc log.

### 2.2. Tầng Frontend (Web React 19 & Mobile Expo)
- [ ] **Kiến trúc 3 Tầng phân lập (3-Tier Architecture):**
  - Tầng 1 (`services/`): Pure HTTP API client, gọi qua Gateway `/api/...`, khai báo đầy đủ TypeScript interface.
  - Tầng 2 (`hooks/`): Custom Hook quản lý state nghiệp vụ, trạng thái loading/submitting/error, xử lý bất đồng bộ.
  - Tầng 3 (`components/` / `pages/`): UI presentation, Tailwind CSS v4, không gọi Axios/fetch trực tiếp trong component.
- [ ] **Xử lý Bất Đồng Bộ Kafka (HTTP 202 Handling):**
  - Khi gọi API thao tác Ghi, UI phải có phản hồi tiếp nhận (Toast / Optimistic UI).
  - **Bắt buộc có Delayed Re-fetch (500ms - 1000ms):** Không được re-fetch ngay tức thì; phải dùng `setTimeout(() => refresh(), 1000)` để đợi Kafka Consumer ghi DB và làm tươi Redis.
- [ ] **UX & Tương tác:**
  - Không dùng `alert()` hoặc `confirm()` gốc của trình duyệt cho luồng nghiệp vụ chính; dùng Modal / Toast / Confirm Dialog tùy chỉnh.
  - Xử lý đầy đủ 3 trạng thái: `loading` (Skeleton/Spinner), `error` (thông báo lỗi thân thiện), `empty` (trạng thái trống).
- [ ] **Ngôn ngữ chú thích mã nguồn:**
  - Toàn bộ comment trong code bắt buộc là **English**.

### 2.3. Clean Code & Phát Hiện Code Smells (Fowler Baseline)
- [ ] **Mysterious Name:** Tên biến/hàm/interface rõ nghĩa, đúng thuật ngữ ngành dược (SKU, Batch, Shelf, Bin, Requisition, Dispense).
- [ ] **Duplicated Code:** Không copy-paste logic tính toán hạn dùng, tính tồn kho, chuyển đổi đơn vị qua nhiều file.
- [ ] **Data Clumps:** Nhóm tọa độ vị trí kho `{ zone, rack, shelf, bin }` thành interface chuẩn (`WarehouseLocation`).
- [ ] **Shotgun Surgery & Divergent Change:** Một thay đổi không làm vỡ các module khác.
- [ ] **Dead Code & Unused Imports:** Loại bỏ import thừa, biến không dùng, console.log debug tạm thời.

---

## 3. Danh Sách Kiểm Tra Trục 2: Đáp Ứng Nghiệp Vụ & Yêu Cầu (Spec / Domain Checklist)

### 3.1. Nghiệp Vụ Ngành Dược (Pharma Domain Rules)
- [ ] **Kho GSP & Vị Trí Lưu Trữ:**
  - Quy chuẩn 1 thùng chỉ chứa 1 loại thuốc (Single-SKU bin integrity). Khi dồn kho/chuyển ô phải chặn chuyển nhầm vào thùng đang chứa thuốc khác.
  - Phân loại rõ ràng giữa Kệ Chính (MAIN - 960 thùng tiêu chuẩn) và Khu Lưu Trữ Dự Trữ (RESERVE).
- [ ] **Nguyên tắc FEFO & Trạng Thái Lô (Batches):**
  - First Expired, First Out: Ưu tiên xuất lô có hạn dùng gần nhất.
  - Kiểm tra trạng thái lô: Không tính tồn hoặc xuất kho các lô `EXPIRED`, `QUARANTINED`, `REMOVED`.
- [ ] **Phân Biệt Kho Tổng (CENTRAL_WH) & Chi Nhánh (Retail Branches):**
  - Tồn kho Kho Tổng độc lập, tuyệt đối không cộng dồn tồn của các chi nhánh bán lẻ vào Kho Tổng.
- [ ] **Quy Chuẩn Đơn Vị (Units) & Quy Đổi:**
  - Xử lý chính xác đơn vị cơ bản và đơn vị đóng gói (Viên, Vỉ, Hộp, Thùng).

### 3.2. So Khớp Yêu Cầu (Spec Match & Scope Check)
- [ ] **Tính đầy đủ (Completeness):** Các tính năng được mô tả trong Issue/PR đã được hiện thực đầy đủ chưa?
- [ ] **Nguy cơ Scope Creep:** PR có chứa các thay đổi nằm ngoài mục tiêu cam kết không?
- [ ] **Dependency Hygiene:** PR có tự ý cài thêm packages lạ hoặc không cần thiết không?

---

## 4. Quy Trình Thực Hiện Review Từng Bước (Execution Workflow)

Khi được yêu cầu review (bằng URL PR GitHub, số PR, hoặc so sánh Git branch), Agent thực hiện tuần tự:

### Bước 1: Thu Thập Dữ Liệu PR & Commit Diff
```bash
# Lấy thông tin tổng quan PR
gh pr view <PR_NUMBER_OR_URL> --json number,title,body,baseRefName,headRefName,commits,files

# Lấy danh sách file thay đổi
gh pr diff <PR_NUMBER_OR_URL> --name-only

# Tải diff chi tiết vào file tạm để phân tích
gh pr diff <PR_NUMBER_OR_URL> > /tmp/pr_diff.diff
```
*(Nếu review local: dùng `git log <base>..HEAD --oneline` và `git diff <base>...HEAD`)*.

### Bước 2: Kiểm Tra Biên Dịch & Linting Nhanh
- Kiểm tra tính toàn vẹn cú pháp TypeScript của frontend và backend:
  - Frontend: `npm run build` hoặc `tsc` trong `frontend/`.
  - Backend: `nest build <service> -b swc` trong `backend/`.

### Bước 3: Phân Tích Độc Lập Dọc Theo 2 Trục
- **Trục 1 (Standards):** Đối chiếu từng hunk thay đổi với Checklist Mục 2.
- **Trục 2 (Spec):** Đối chiếu commit messages, PR description và logic nghiệp vụ với Checklist Mục 3.

### Bước 4: Lập Báo Cáo & Đưa Ra Phán Quyết (Verdict)
Xuất báo cáo trực tiếp bằng định dạng Markdown theo mẫu chuẩn quy định tại Mục 5.

---

## 5. Mẫu Báo Cáo Review Chuẩn Hóa (Standard Review Report Template)

```markdown
# 📋 BÁO CÁO REVIEW PULL REQUEST: PR #<Number> — <PR Title>
**Người tạo (Author):** @<author> | **Nhánh:** `<head>` ➔ `<base>`
**Phạm vi:** +<additions> / -<deletions> dòng trong <files_count> files

---

## 🏛️ TRỤC 1: TIÊU CHUẨN KỸ THUẬT (STANDARDS REVIEW)

### ✅ Điểm Tốt & Tuân Thủ (Pass):
- [Liệt kê các điểm tuân thủ tốt Playbook v2.0: Event-Driven Kafka 202, Cache-Aside, RBAC, Clean structure...]

### ⚠️ Vi Phạm Tiêu Chuẩn & Cần Cải Thiện (Issues & Warnings):
- **[File & Dòng]:** [Mô tả chi tiết vi phạm: Thiếu delayed re-fetch, comment tiếng Việt, code smell, browser alert...]
  - *Nguyên nhân:* [Trích dẫn quy định trong Playbook v2.0 hoặc Fowler Smell]
  - *Đề xuất sửa (Suggested Fix):* [Đoạn mã khắc phục cụ thể]

---

## 🎯 TRỤC 2: ĐÁP ỨNG NGHIỆP VỤ & YÊU CẦU (SPEC & DOMAIN REVIEW)

### ✅ Tính Năng Đã Hiện Thực Đầy Đủ (Implemented):
- [Liệt kê các tính năng khớp với yêu cầu PR/Issue]

### ⚠️ Vấn Đề Nghiệp Vụ / Lỗ Hổng Logic (Domain Gaps):
- [Liệt kê các sai lệch nghiệp vụ ngành dược (GSP, FEFO, cách tính kho tổng, scope creep, thư viện thừa...)]

---

## 🚨 DANH SÁCH HÀNH ĐỘNG CẦN KHẮC PHỤC (ACTION ITEMS)

| Mức độ (Severity) | Vị trí (Location) | Vấn đề (Issue) | Hướng dẫn xử lý (Action) |
| :--- | :--- | :--- | :--- |
| 🔴 **BLOCKER** | `path/to/file.ts` | [Lỗi nghiêm trọng, vi phạm Playbook bất biến] | [Cách sửa] |
| 🟡 **WARNING** | `path/to/file.tsx` | [Cảnh báo chất lượng, UI/UX, delay timing] | [Cách sửa] |
| 🔵 **SUGGESTION** | `path/to/file.ts` | [Tối ưu hóa, chuyển comment sang tiếng Anh] | [Cách sửa] |

---

## 🏁 PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)

👉 **[ APPROVE ✅ / REQUEST CHANGES ❌ / COMMENT 💬 ]**

*Tóm tắt ngắn gọn lý do đưa ra phán quyết trong 1-2 câu.*
```

---

## 6. Hướng Dẫn Sử Dụng Lệnh Trong Hội Thoại

- **Review PR GitHub:**
  ```
  /abc-code-review https://github.com/SEP490-Team3-FA26/SEP490-SE06/pull/192
  ```
- **Review PR theo số hiệu:**
  ```
  /abc-code-review 192
  ```
- **Review nhánh làm việc hiện tại:**
  ```
  /abc-code-review origin/demo
  ```
- **Review commit cụ thể:**
  ```
  /abc-code-review HEAD~3..HEAD
  ```
