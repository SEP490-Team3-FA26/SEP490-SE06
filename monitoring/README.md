# Hệ Thống Giám Sát WDP301 (Monitoring & Observability)

Hệ thống giám sát được thiết kế theo kiến trúc chuẩn Production tối ưu tài nguyên cho Cloud VPS (chỉ tiêu tốn ~130MB RAM), bao gồm 4 thành phần tích hợp trực tiếp:

1. **Dozzle (Real-time Container Logs)**:
   - Truy cập: `http://<IP_VPS>:8888` (Ví dụ: `http://103.75.187.86:8888`)
   - Xem log trực tiếp của toàn bộ 11 container microservices mà không cần kết nối SSH.

2. **Prometheus v2.51.0 (Metrics Scraper & TSDB)**:
   - Tự động cào số liệu mỗi 10 giây từ:
     - `api-gateway:4000/metrics`: Đo lường tần suất gọi API, mã HTTP (2xx, 3xx, 4xx, 5xx), độ trễ (latency p50/p95/p99) và tình trạng Node.js runtime.
     - `node-exporter:9100`: Đo lường tài nguyên phần cứng máy chủ VPS (RAM tổng, RAM khả dụng, CPU, ổ cứng).

3. **Node Exporter v1.8.0**:
   - Thu thập chỉ số phần cứng Linux host trực tiếp qua `/proc` và `/sys`.

4. **Grafana v10.4.0 (Visual Dashboard)**:
   - Truy cập: `http://<IP_VPS>:3001` (Ví dụ: `http://103.75.187.86:3001`)
   - **Tự động cấu hình (Auto-provisioning)**: Nguồn dữ liệu Prometheus và Dashboard `WDP301 - Tổng Quan Giám Sát (API Latency & RAM)` được nạp sẵn tự động.
   - **Chế độ xem không cần đăng nhập (Anonymous Viewer)**: Bất kỳ ai mở liên kết là xem được số liệu thời gian thực ngay lập tức.

---

## Danh Mục Chỉ Số Giám Sát

### 1. Tình Trạng API & Hiệu Năng
- **Tần Suất Request (req/s)**: `sum(rate(http_requests_total[1m]))`
- **Độ Trễ Trung Bình (ms)**: Đo lường qua histogram của từng API.
- **Độ Trễ p95 / p99 (ms)**: 95% và 99% request nhanh hơn mức này.
- **Phân Bố Mã Trạng Thái HTTP**: Thống kê số lượng request theo status code (200, 201, 202, 400, 404, 500...).
- **Chi Tiết Từng Endpoint**: Xem endpoint nào đang được gọi nhiều nhất và độ trễ tương ứng.

### 2. Sức Khỏe Máy Chủ (Host Resources)
- **RAM Thực Tế Còn Lại (GB)**: Lấy từ `node_memory_MemAvailable_bytes`.
- **Tỷ Lệ Dùng RAM (%)**: `100 - (MemAvailable / MemTotal * 100)`.
- **CPU Usage (%)**: Tỷ lệ phần trăm CPU đang hoạt động.
