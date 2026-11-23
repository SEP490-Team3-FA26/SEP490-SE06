---
trigger: always_on
---

# Quy tắc thực thi lệnh và Tối ưu hóa tác vụ cho các thành viên

- **Thực thi lệnh dứt khoát theo từng hệ điều hành (Clean Shell Termination):**
  + **Môi trường Windows:** Luôn sử dụng cú pháp `cmd /c` khi thực thi các lệnh shell (terminal execution) để đảm bảo tiến trình gửi tín hiệu kết thúc (EOF/exit code) rõ ràng về cho IDE, tránh tình trạng bị treo tiến trình hoặc chờ đợi vô hạn.
  + **Môi trường macOS / Linux:** Thực thi lệnh trực tiếp trên bash/zsh thông thường.
  + Không chạy các lệnh terminal tương tác (interactive commands) không tự thoát mà không có cờ không tương tác (non-interactive / `-y` / `--silent`).

- **Tối ưu hóa quét phụ thuộc (Dependency Scan Avoidance):**
  + Tuyệt đối không quét đệ quy hoặc duyệt vào các thư mục `node_modules/`, `.venv/`, `dist/`, `build/`.
  + Tra cứu thư viện và cấu hình qua các file `package.json`, `.gitignore`, `docker-compose.yml` ở các module tương ứng (`backend`, `frontend`, `mobile`).
