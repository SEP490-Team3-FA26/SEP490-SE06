# Sổ Tay Quản Trị Cloud VPS & Vận Hành Hệ Thống WDP301 (Production VPS Playbook)

> **Tài liệu chuẩn hóa dành cho Kỹ sư Vận hành & Lập trình viên Backend / DevOps**  
> *Dành cho Cloud VPS iNet (Ubuntu 24.04 LTS — 3 CPU, 6GB RAM, 80GB SSD)*

---

## 1. Kết Nối & Quản Lý Phiên Làm Việc (SSH Access)

### 1.1 Lệnh kết nối từ xa
Do nhà cung cấp iNet cấu hình cổng SSH tùy chỉnh để tăng tính bảo mật, bạn luôn phải truyền cờ `-p 24700`:

```bash
# Cú pháp kết nối cơ bản
ssh root@103.75.187.86 -p 24700

# Kết nối có sử dụng SSH Private Key (Khuyên dùng khi vào môi trường thật)
ssh -i ~/.ssh/id_rsa root@103.75.187.86 -p 24700
```

### 1.2 Quản lý tiến trình nền bằng `tmux` hoặc `screen` (Tránh đứt kết nối)
Khi chạy các lệnh nặng (như `docker build`, `npm build`), nếu mạng chập chờn phiên SSH bị ngắt thì lệnh sẽ bị hủy. Hãy dùng `tmux`:

```bash
# Cài đặt tmux
apt install -y tmux

# Mở một phiên làm việc mới có tên 'deploy'
tmux new -s deploy

# Thoát ra ngoài mà vẫn để tiến trình chạy ngầm: Bấm phím Ctrl + B, sau đó thả tay bấm phím D

# Xem lại phiên đang chạy ngầm
tmux attach -t deploy
```

---

## 2. Giám Sát Tài Nguyên Phần Cứng (System Monitoring)

### 2.1 Kiểm tra Bộ nhớ (RAM & Swap)
```bash
# Xem dung lượng RAM và Swap theo đơn vị dễ đọc (MB, GB)
free -h -w

# Giám sát thay đổi RAM liên tục mỗi 2 giây
watch -n 2 free -m
```

### 2.2 Kiểm tra Ổ cứng (Disk Space & Inode)
```bash
# Xem dung lượng ổ đĩa các phân vùng
df -h /

# Kiểm tra dung lượng thư mục nào đang chiếm nhiều dung lượng nhất trong /var
du -sh /var/* | sort -hr | head -n 10

# Kiểm tra số lượng Inode (hết Inode dù còn dung lượng ổ cứng vẫn không ghi được file)
df -i /
```

### 2.3 Giám sát CPU & Tiến trình thời gian thực
```bash
# Trình quản lý tiến trình trực quan
htop
# Hoặc lệnh mặc định có sẵn
top -c -o %MEM   # Sắp xếp theo % RAM tiêu thụ
```

---

## 3. Cấu Hình Bộ Nhớ Ảo (Swap Space 4GB)

Hệ thống chạy **Kafka (JVM) + Redis + MongoDB driver + 10 Microservices Node.js** nên bắt buộc phải có Swap để bảo vệ hệ thống không bị crash đột ngột.

```bash
# 1. Tạo file swap kích thước 4GB
fallocate -l 4G /swapfile

# 2. Phân quyền chỉ cho phép root truy cập (Bảo mật thông tin memory)
chmod 600 /swapfile

# 3. Định dạng vùng nhớ swap
mkswap /swapfile

# 4. Kích hoạt swap ngay lập tức
swapon /swapfile

# 5. Lưu vĩnh viễn vào hệ thống (không bị mất khi khởi động lại server)
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 6. Tối ưu độ nhạy của Swap (vm.swappiness = 10 đến 20 cho server)
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

---

## 4. Quản Trị Tường Lửa Mạng (UFW Firewall)

> [!CAUTION]
> Luôn luôn mở cổng `24700/tcp` **trước khi** chạy lệnh bật tường lửa (`ufw enable`). Nếu quên bước này, bạn sẽ bị khóa vĩnh viễn không SSH vào được server nữa.

```bash
# 1. Kiểm tra trạng thái tường lửa
ufw status verbose

# 2. Mở cổng SSH tùy chỉnh
ufw allow 24700/tcp comment "Custom SSH Port"

# 3. Mở cổng Web & Reverse Proxy
ufw allow 80/tcp comment "HTTP Web"
ufw allow 443/tcp comment "HTTPS SSL"

# 4. Mở cổng nội bộ ứng dụng (nếu test trực tiếp không qua Nginx)
ufw allow 3000/tcp comment "Frontend Next/React"
ufw allow 4000/tcp comment "API Gateway Backend"

# 5. Kích hoạt hoặc tải lại tường lửa
ufw enable
ufw reload

# 6. Xóa một rule nếu không cần nữa (Ví dụ: đóng cổng 3000)
ufw delete allow 3000/tcp
```

---

## 5. Quản Trị Vòng Đời Ứng Dụng Với Docker & Docker Compose

Thư mục chứa mã nguồn ứng dụng trên server: `/var/www/wdp301`.

```bash
cd /var/www/wdp301
```

### 5.1 Khởi động, dừng và khởi động lại dịch vụ
```bash
# Khởi động toàn bộ cụm dịch vụ chạy ngầm (-d)
docker compose up -d

# Nếu dùng file cấu hình production riêng
docker compose -f docker-compose.prod.yml up -d

# Khởi động lại một service cụ thể (ví dụ api-gateway)
docker compose restart api-gateway

# Dừng toàn bộ hệ thống
docker compose down

# Dừng hệ thống và xóa sạch cả Volumes (CẢNH BÁO: Mất dữ liệu database nếu không backup)
# docker compose down -v
```

### 5.2 Build lại Image khi có cập nhật code mới
```bash
# Build lại và khởi chạy lại các container mà không làm gián đoạn các service khác
docker compose up -d --build

# Chỉ build lại riêng service backend
docker compose build backend
docker compose up -d --no-deps backend
```

### 5.3 Đọc Log để kiểm tra hoạt động & Gỡ lỗi (Debugging)
```bash
# Xem log thời gian thực của toàn bộ hệ thống
docker compose logs -f --tail 100

# Chỉ xem log của API Gateway
docker compose logs -f api-gateway

# Xem log của Kafka broker
docker compose logs -f kafka

# Xem log của Redis
docker compose logs -f redis
```

### 5.4 Quản lý bộ nhớ Docker & Dọn rác định kỳ
```bash
# Xem lượng RAM/CPU từng container đang ngốn theo thời gian thực
docker stats --no-stream

# Dọn dẹp các images không dùng (dangling images) giúp giải phóng hàng chục GB ổ cứng
docker image prune -f

# Dọn dẹp sạch sẽ build cache, container đã tắt và network thừa
docker system prune -a --volumes -f
```

---

## 6. Xử Lý Sự Cố Khẩn Cấp (Troubleshooting Playbook)

### 6.1 Trường hợp 1: Server không phản hồi, nghi tràn RAM
1. Đăng nhập qua Web Console (OneDash) nếu SSH bị treo.
2. Kiểm tra xem tiến trình nào bị OOM Killer bắn hạ:
   ```bash
   dmesg -T | grep -i -E "oom|killed process"
   ```
3. Khởi động lại các container ngốn nhiều RAM nhất:
   ```bash
   docker restart wdp301-kafka wdp301-gateway
   ```

### 6.2 Trường hợp 2: Ổ cứng báo đầy 100% (No space left on device)
1. Kiểm tra file log Docker bị phình to:
   ```bash
   du -sh /var/lib/docker/containers/*/*-json.log
   ```
2. Xóa log docker tạm thời:
   ```bash
   truncate -s 0 /var/lib/docker/containers/*/*-json.log
   ```
3. Xóa các Docker Image cũ:
   ```bash
   docker image prune -af
   ```

---

## 7. Góc Ôn Luyện Phỏng Vấn: Vận Hành Linux & Production Server

| Câu hỏi phỏng vấn | Bản chất kỹ thuật & Câu trả lời ghi điểm |
| :--- | :--- |
| **Khi một Server Production bị chậm đột ngột, quy trình chẩn đoán (Triage) của bạn gồm những bước nào?** | Áp dụng nguyên tắc **USE Method (Utilization, Saturation, Errors)**:<br>1. **CPU:** Gõ `uptime` kiểm tra Load Average (nếu lớn hơn số core CPU là quá tải). Dùng `htop` xem tiến trình nào ngốn CPU.<br>2. **Memory:** Gõ `free -h` xem có đang cạn RAM và bị swap thrashing không.<br>3. **Disk I/O:** Gõ `iostat -xz 1` hoặc `iotop` xem ổ cứng có bị nghẽn thắt cổ chai không.<br>4. **Network:** Gõ `netstat -tulpn` hoặc `ss -s` xem số lượng kết nối TCP đang mở.<br>5. **Logs:** Kiểm tra `journalctl -xe` hoặc `docker logs` để tìm mã lỗi 500. |
| **Tại sao cần giới hạn kích thước log của Docker Container?** | Mặc định Docker ghi log dạng JSON không giới hạn dung lượng. Với các ứng dụng có nhiều log (Kafka, Gateway nhận hàng ngàn request/s), file log có thể ngốn sạch 80GB ổ cứng sau vài tuần, gây sập server. Cần cấu hình `max-size: "50m"` và `max-file: "3"` trong `daemon.json` hoặc compose file. |
| **Khác biệt giữa `SIGTERM` và `SIGKILL` khi tắt container là gì?** | `docker stop` gửi tín hiệu `SIGTERM` (Signal 15), cho phép ứng dụng có 10 giây để **Graceful Shutdown**: đóng kết nối DB, hoàn thành nốt các job Kafka đang dở dang, hủy đăng ký service. Nếu sau 10 giây tiến trình chưa dừng, Docker mới gửi `SIGKILL` (Signal 9) ép buộc ngắt ngay lập tức. |

---

## 8. Bảng Tra Cứu Nhanh Các Lệnh Hay Gặp Nhất Trên VPS (Daily CheatSheet)

Dưới đây là các câu lệnh "bỏ túi" mà kỹ sư vận hành Linux và DevOps sử dụng hàng ngày:

### 8.1 Nhóm Quản Trị Mạng & Tường Lửa (Firewall & Network)
* `ufw allow 80/tcp && ufw reload`:
  * `ufw allow 80/tcp`: Mở cổng số 80 (cổng tiêu chuẩn của Web HTTP) với giao thức TCP để cho phép người dùng/Cloudflare kết nối vào web.
  * `&&`: Toán tử logic "VÀ" — chỉ thực hiện lệnh tiếp theo nếu lệnh đầu tiên chạy thành công không có lỗi.
  * `ufw reload`: Nạp lại toàn bộ cấu hình tường lửa ngay lập tức để rule mới có hiệu lực mà không làm gián đoạn các kết nối hiện tại.
* `ufw status numbered`: Xem danh sách tất cả các cổng đang mở kèm số thứ tự (dễ xóa bằng lệnh `ufw delete <số>`).
* `ss -tulpn` (hoặc `netstat -tulpn`): Xem tất cả các cổng mạng đang mở trên VPS và tiến trình nào đang lắng nghe cổng đó.
* `curl -I http://localhost:80`: Kiểm tra nhanh xem Web Server cục bộ có phản hồi mã HTTP (200, 301, 404) không.

### 8.2 Nhóm Quản Trị Docker & Dự Án WDP301
* `docker compose -f docker-compose.prod.yml ps`: Xem trạng thái các container (Up, Healthy hay Exited).
* `docker compose -f docker-compose.prod.yml logs -f --tail 50 <tên-service>`: Xem 50 dòng log gần nhất và theo dõi log mới theo thời gian thực (ví dụ service: `api-gateway`, `kafka`).
* `docker compose -f docker-compose.prod.yml restart <tên-service>`: Khởi động lại riêng 1 container khi sửa file cấu hình mà không làm sập các service khác.
* `docker stats`: Bảng điều khiển trực quan hiển thị CPU%, RAM tiêu thụ thực tế của từng container.
* `docker image prune -f`: Dọn sạch các image rác/trung gian để giải phóng ổ cứng sau mỗi lần build.

### 8.3 Nhóm Kiểm Tra Phần Cứng & Bộ Nhớ (Resource Health)
* `free -h`: Kiểm tra dung lượng RAM thật và Swap đang dùng/trống bao nhiêu GB.
* `df -h /`: Kiểm tra ổ cứng phân vùng gốc `/` còn trống bao nhiêu phần trăm (cảnh báo nếu > 85%).
* `htop`: Mở bảng điều khiển CPU/RAM trực quan (bấm phím `F10` hoặc `q` để thoát).
* `uptime`: Xem thời gian server đã chạy liên tục và chỉ số **Load Average** trong 1, 5, 15 phút.

### 8.4 Nhóm Thao Tác File & Tiến Trình Hệ Thống
* `nano <đường-dẫn-file>`: Mở trình soạn thảo file nhanh (Lưu: `Ctrl + O` -> `Enter`, Thoát: `Ctrl + X`).
* `tail -f /var/log/syslog`: Xem log của toàn bộ hệ điều hành Ubuntu theo thời gian thực.
* `systemctl restart docker`: Khởi động lại dịch vụ Docker khi Docker daemon bị đơ.
* `history | tail -n 20`: Xem lại 20 câu lệnh gần nhất bạn vừa gõ trên terminal.

