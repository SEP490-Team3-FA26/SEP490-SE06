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