---
trigger: always_on
---

comment code bằng tiếng việt

- **Quy tắc Kẹp Bài Test Bắt Buộc Khi Viết Code Mới (Test-Coupled Mandate):**
  + Khi viết bất kỳ hàm, Service (`*.service.ts`) hoặc Controller (`*.controller.ts`) mới nào, **BẮT BUỘC PHẢI VIẾT KÈM FILE TEST (`*.spec.ts`) TƯƠNG ỨNG NGAY TRONG CÙNG LƯỢT PHÁT TRIỂN / COMMIT**.
  + Tuyệt đối không commit mã nguồn nghiệp vụ mới mà thiếu bài test (Chính sách Zero Untested Code).
  + Mọi bài test kẹp vào phải phân chia rõ ràng đủ 3 nhóm giá trị chuẩn Guideline:
    1. `[Normal Values]`: Luồng nghiệp vụ chuẩn, thành công.
    2. `[Boundary Values]`: Giá trị biên, tối thiểu, tối đa, 0, 1 đơn vị, race-condition, idempotency chống trùng lặp.
    3. `[Abnormal Values]`: Dữ liệu dị thường, rỗng, sai định dạng, tấn công giả mạo, ngoại lệ.

- **Quy tắc Điểm Dừng Bắt Buộc - Chỉ Dừng Ở `git status`, Cấm Tự Động Push Code (Manual Push Only Policy):**
  + Agent / AI **TUYỆT ĐỐI CẤM** tự ý chạy lệnh `git push` dưới bất kỳ hình thức nào (kể cả push thông thường, `git push origin <branch>`, hay `git push --force`).
  + Sau khi hoàn tất viết code, refactor và chạy kiểm thử thành công, Agent **BẮT BUỘC CHỈ DỪNG LẠI Ở `git status`**.
  + Mọi thao tác đẩy code lên remote repository (GitHub) **HOÀN TOÀN ĐỂ DEVELOPER TRONG TEAM KIỂM TRA LẦN CUỐI VÀ THỰC HIỆN BẰNG TAY (MANUAL PUSH)**.

- **Quy tắc Nghiêm Cấm Force-Push (Zero Force-Push Policy):**
  + Tuyệt đối **CẤM** sử dụng các lệnh force-push (`git push --force`, `git push -f`, `git push --force-with-lease`) lên bất kỳ nhánh nào trên remote repository (kể cả nhánh cá nhân, feature, fix hay nhánh chính).
  + Mọi sửa đổi, cập nhật mã nguồn, refactor hoặc hotfix sau khi đã push bắt buộc phải tạo commit mới bổ sung bình thường (`git commit -m "..."`), không được ghi đè lịch sử commit bằng `git commit --amend` kèm `git push --force`.
  + Bảo toàn tính toàn vẹn của lịch sử Git, tránh gây xung đột mã nguồn hoặc làm mất code của các thành viên khác trong nhóm.

- **Quy tắc Bắt Buộc Phân Trang & Chặn Tràn Tải Kafka 1MB (Mandatory Pagination & Kafka Payload Ceiling):**
  + Tuyệt đối **CẤM** viết các hàm query danh sách dạng `findAll()` hoặc `.find().exec()` quét sạch toàn bộ collection mà không có `.limit()` và `.lean()`.
  + Mọi API trả danh sách (Dược phẩm, Đơn hàng, Phiếu nhập kho GRN, Đơn đặt hàng PO, Đề xuất PR, Chuyển kho...) bắt buộc phải hỗ trợ phân trang (`page`, `limit` mặc định 20, trần tối đa 100).
  + Đảm bảo gói tin JSON phản hồi qua Kafka broker luôn < 1MB, triệt tiêu hoàn toàn nguy cơ broker drop message gây lỗi `HTTP 504 Gateway Timeout`.

- **Quy tắc Bắt Buộc Đánh Index Sắp Xếp (Mandatory Sort Index Policy):**
  + Mọi trường dùng để `.sort()` trong MongoDB (đặc biệt là `{ createdAt: -1 }`, `{ status: 1 }`, `{ timestamp: -1 }`) bắt buộc phải được khai báo Index trong Mongoose Schema (`@Prop({ index: true })` hoặc `schema.index(...)`).
  + Tuyệt đối **CẤM** gọi lệnh `createIndex` runtime trực tiếp trong luồng xử lý request/service làm nghẽn kết nối database.

- **Quy tắc Thứ Tự Định Tuyến & Kiểm Định ObjectId (Route Ordering & ObjectId Validation):**
  + Toàn bộ các route tĩnh (`@Get('categories')`, `@Get('payroll/current')`, `@Get('filters')`) **BẮT BUỘC PHẢI KHAI BÁO TRƯỚC** các route có tham số động (`@Get(':id')`).
  + Route `@Get(':id')` bắt buộc phải có kiểm tra định dạng MongoDB ObjectId 24 ký tự (`!/^[0-9a-fA-F]{24}$/.test(id)`) và ném `BadRequestException` (HTTP 400), tuyệt đối không để lọt chuỗi sai định dạng vào Mongoose `findById` gây crash `CastError` (HTTP 500).

- **Quy tắc Chuẩn Hóa Mã Lỗi RpcException (Standardized RpcException Payload):**
  + Khi microservice ném lỗi nghiệp vụ qua Kafka bằng `new RpcException(...)`, **BẮT BUỘC PHẢI ĐÍNH KÈM `statusCode`** (ví dụ: `statusCode: 404` khi không tìm thấy thực thể, `statusCode: 400` khi dữ liệu sai, `statusCode: 409` khi conflict dữ liệu).
  + Tuyệt đối không chỉ ném `{ message }` thiếu `statusCode` khiến Gateway mặc định fallback thành HTTP 500 Internal Server Error.

