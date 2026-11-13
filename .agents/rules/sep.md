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
