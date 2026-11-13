* [ ] Hướng Dẫn Vận Hành DevOps, CI/CD Pipeline & Giám Sát Production VPS

**Dự án:** Chuỗi Nhà Thuốc Thông Minh PharmaChain (WDP301 / SEP490)
**Tác giả phụ trách:** Trần Hồng Phước (Fullstack & DevOps Lead)
**Địa chỉ Production:** [https://abcpharmacy.store](https://abcpharmacy.store)
**Máy chủ Cloud VPS:** iNet VPS (Ubuntu, 6GB RAM + 4GB Swap, IP: `103.75.187.86`, SSH Port: `24700`)

---

## 1. Tổng Quan Kiến Trúc Hạ Tầng (Production Architecture)

Hệ thống triển khai theo mô hình Microservices Event-Driven độc lập, điều phối qua Docker Compose (`docker-compose.prod.yml`) gồm 11 dịch vụ container:

```
[ Khách hàng / Dược sĩ ] ── HTTPS ──> [ Cloudflare CDN & WAF ]
                                              │
                                       (Port 443 / 80)
                                              ▼
                                 [ Nginx Reverse Proxy ]
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
             /api (API Gateway)         / (Frontend React 19)   /dozzle & /grafana
                     │                        │                        │
       ┌─────────────┴─────────────┐          │                        │
       ▼                           ▼          │                        │
[ Kafka Broker ]            [ Redis Cache ]   │                        │
 (Event-Driven 202)         (Cache-Aside)     │                        │
       │                                      │                        │
 ┌─────┴────────────────────────────────┐     │                        │
 ▼             ▼            ▼           ▼     │                        │
[Auth]      [User]     [Inventory]   [Orders] │                        │
       │                                      │                        │
       └───────────────┬──────────────────────┘                        │
                       ▼                                               │
             [ MongoDB / PostgreSQL ]                                  │
                                                                       │
 [ Giám sát: Dozzle (Logs) + Node-Exporter + Prometheus + Grafana ] ◄──┘
```

---

## 2. CI/CD Pipeline Toàn Diện (GitHub Actions)

Tệp cấu hình: [`.github/workflows/deploy-vps.yml`](file:///Users/tranhongphuoc/WDP301/.github/workflows/deploy-vps.yml)

### 2.1. Cơ Chế Kích Hoạt (Triggers)

* **Push & Pull Request** trên các nhánh: `main`, `dev`, `demo`, `feat/**`, `fix/**`.
* **Tối ưu Concurrency:** `cancel-in-progress: true` giúp tự động hủy các build cũ khi lập trình viên push commit dồn dập, tiết kiệm tài nguyên runner.

### 2.2. Giai Đoạn 1: CI — Kiểm Định Chất Lượng Nghiêm Ngặt (Quality Gate)

Mọi commit phải vượt qua 100% các bước kiểm thử trước khi được phép merge hoặc deploy:

1. **Playbook & Architecture Rules Audit:** Chạy `npm run test:rules` trong `backend` để kiểm tra 7 quy tắc bất biến của Fullstack Playbook v2.0 (Zero Internal HTTP, Zero Mock Data, Bounded Context, Comment tiếng Việt 100%, v.v.).
2. **Backend Test Suites (`backend/test`):** Chạy `npm run test:ci` với 50 suites, 415 tests pass 100% (FEFO, GS1 Barcode, PayOS VietQR, Kiểm tra dị ứng thuốc UC-107, IoT Telemetry).
3. **Frontend Unit Tests (`frontend/tests`):** Chạy `npm test` kiểm tra bộ lọc kho, điều khoản cam kết AI y tế, bảo mật đăng ký và form bệnh nền GPP.
4. **Bot Simulator Verification:** Build và test bộ mô phỏng 6 vai trò người dùng (`bot-simulator`).

### 2.3. Giai Đoạn 2: CD — Tự Động Triển Khai Lên Cloud VPS (Continuous Deployment)

* **Điều kiện thực thi:** Chỉ kích hoạt khi push vào nhánh `main`, `dev`, hoặc `demo` VÀ toàn bộ bài test ở Giai đoạn 1 đã **PASS 100%**.
* **Thực thi qua SSH Action:** Sử dụng `appleboy/ssh-action` kết nối an toàn vào VPS iNet qua SSH Key bí mật:
  1. Kiểm tra và cài đặt Docker Engine nếu VPS mới.
  2. Kích hoạt phân vùng 4GB Swap an toàn chống tràn bộ nhớ.
  3. Cấu hình tường lửa UFW (chỉ mở SSH 24700, HTTP 80, HTTPS 443).
  4. Đồng bộ mã nguồn Git mới nhất và reset sạch sẽ thư mục làm việc `/var/www/wdp301`.
  5. Thực thi script triển khai chuẩn hóa `scripts/deploy-prod.sh`.

---

## 3. Quy Trình Triển Khai Production Lên VPS (Deploy VPS)

Tệp kịch bản: [`scripts/deploy-prod.sh`](file:///Users/tranhongphuoc/WDP301/scripts/deploy-prod.sh)

### 3.1. Các Bước Xử Lý Cốt Lõi Của Script Triển Khai

1. **Kích hoạt Swap 4GB RAM:**

   ```bash
   fallocate -l 4G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   ```

   *Giúp VPS 6GB chạy êm ái toàn bộ 11 containers Microservices + AI Service mà không bị Docker OOM-Killed.*
2. **Bảo mật Tường lửa UFW (Firewall Hardening):**

   * Chỉ mở công khai các cổng cần thiết: `24700` (SSH quản trị), `80` (HTTP chuyển hướng), `443` (HTTPS Nginx).
   * Thu hồi và đóng toàn bộ các cổng nội bộ nguy hiểm (`3000`, `4000`, `8000`, `8888`, `3001`), buộc mọi truy cập phải đi qua Nginx Reverse Proxy kèm xác thực.
3. **Cấp chứng chỉ SSL Nginx (Cloudflare Full SSL):**

   * Tự động khởi tạo chứng chỉ RSA 2048-bit tại `/var/www/wdp301/ssl/` kết hợp với chế độ mã hóa Cloudflare Full SSL để bảo đảm đường truyền HTTPS an toàn tuyệt đối.
4. **Triệt tiêu lỗi 502 Bad Gateway:**

   * Script tự động sao chép `service-account-key.json` vào container `wdp301-gateway` và làm mới Nginx Reverse Proxy, loại bỏ triệt để hiện tượng Gateway khởi động chậm hơn Nginx.
5. **Dọn dẹp Image trung gian:**

   * Chạy `docker image prune -f` để giải phóng dung lượng ổ cứng sau mỗi lần build mà vẫn giữ nguyên Docker Layer Cache cho AI Service.

### 3.2. Lệnh Quản Trị Hệ Thống Nhanh Trên VPS

```bash
# Khởi động lại toàn bộ hệ thống
npm run prod:up
# hoặc: docker compose -f docker-compose.prod.yml up -d

# Xem log trực tiếp của toàn bộ dịch vụ
npm run prod:logs

# Dừng toàn bộ hệ sinh thái
npm run prod:down
```

---

## 4. Hệ Thống Giám Sát Hạ Tầng & Dịch Vụ (Monitoring VPS)

Thư mục cấu hình: [`gitops/monitoring/`](file:///Users/tranhongphuoc/WDP301/gitops/monitoring/)

Hệ thống giám sát được cấu hình đa tầng giúp đội ngũ phát hiện tức thì sự cố:

### 4.1. Giám Sát Log Thời Gian Thực — Dozzle

* **Địa chỉ truy cập:** [https://abcpharmacy.store/dozzle](https://abcpharmacy.store/dozzle)
* **Tài khoản đăng nhập:** Được quản lý độc lập tại file `gitops/monitoring/dozzle/users.yml` (bảo mật qua quyền `chmod 600`, không commit mật khẩu lên Git).
* **Tính năng:**
  * Xem log trực tiếp dạng streaming của từng Microservice (Gateway, Auth, Inventory, Orders, Kafka, Redis).
  * Bộ lọc tìm kiếm lỗi theo từ khóa (`ERROR`, `Exception`, `Timeout`).
  * Đo đạc mức tiêu thụ RAM và CPU trực quan cho từng container.

### 4.2. Thu Thập Telemetry & Metrics — Node-Exporter + Prometheus

* **Node-Exporter:** Chạy trực tiếp trên host mount `/proc`, `/sys` để đo đạc chỉ số hệ điều hành (CPU Load, Disk Usage, Network I/O, Swap Pressure).
* **Prometheus TSDB:**
  * Tự động cào (scrape) định kỳ 15s các metrics từ:
    - `api-gateway`: Tần suất HTTP requests, mã trạng thái (200, 202, 400, 500), thời gian phản hồi (Latency).
    - `node-exporter`: Tải phần cứng VPS.
  * Thời gian lưu trữ dữ liệu (Retention): 7 ngày, nén WAL tự động.

### 4.3. Bảng Điều Khiển Trực Quan Hóa — Grafana Dashboard

* **Địa chỉ truy cập:** [https://abcpharmacy.store/grafana](https://abcpharmacy.store/grafana)
* **Tài khoản mặc định:** `admin` / `admin`
* **Dashboard mặc định:** `System and API Overview`
  * Biểu đồ tải CPU & RAM toàn hệ thống và từng container.
  * Tần suất API calls theo từng Bounded Context (`/api/auth`, `/api/orders`, `/api/medicines`...).
  * Tỷ lệ lỗi HTTP 4xx và 5xx.
  * Tốc độ thông lượng tin nhắn qua Apache Kafka.

---

## 5. Danh Mục Đường Dẫn Quản Trị Hệ Thống Production

| Phân hệ / Dịch vụ                       | URL Truy Cập                                                               | Mục đích                                                    |
| :------------------------------------------ | :-------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **🌐 Website Bán lẻ & Quầy POS**   | [https://abcpharmacy.store](https://abcpharmacy.store)                       | Giao diện React 19 dành cho Khách hàng & Dược sĩ        |
| **🚪 API Gateway**                    | [https://abcpharmacy.store/api](https://abcpharmacy.store/api)               | Cổng giao tiếp REST API duy nhất                            |
| **📋 Container Logs (Dozzle)**        | [https://abcpharmacy.store/dozzle](https://abcpharmacy.store/dozzle)         | Theo dõi log container thời gian thực                       |
| **📊 Dashboard Giám sát (Grafana)** | [https://abcpharmacy.store/grafana](https://abcpharmacy.store/grafana)       | Biểu đồ hiệu năng phần cứng & API metrics               |
| **🤖 Bot Simulator Dashboard**        | [https://abcpharmacy.store/simulator/](https://abcpharmacy.store/simulator/) | Bảng điều khiển giả lập hành vi người dùng test tải |
