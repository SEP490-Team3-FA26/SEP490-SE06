# Review phần Testing — 18/10/2026

## Phạm vi và nguồn

- Đã đọc trực tiếp Canva, trang 33 (section divider) và trang 34 (Software Testing). Nguồn: https://www.canva.com/design/DAHQl1OUmac/Ul7URylCoByhd-xIOCJiDA/edit . Ảnh nguồn lưu tại `Canva-Testing-Source-2026-10-18.png`.
- Đã đọc từng trạng thái ca kiểm thử trong `docs/Report5_Test_Report.xlsx`, gồm các cột Round 1 (F), Round 2 (I), Round 3 (L), và công thức Test Statistics.
- Đã đọc `docs/reports/Report5_Test_Documentation.docx` và mẫu test trong code.
- Không chạy lại test, không thay đổi trạng thái test, không sửa Canva hay workbook. Tab Google Sheets trực tuyến không đọc được do timeout, nên chưa kết luận bản online có giống bản trong repo hay không.
- Ảnh mới là biểu đồ trình bày lại các số đang ghi trên Canva, không phải ảnh chụp một lần chạy test mới và không xác nhận các ca ghi Passed thực sự đã đạt.

## 1. Slide 34: phần đã đúng và phần cần sửa

Slide hiện tại ghi 295 Passed, 2 Failed, 63 Pending, 0 N/A, tổng 360. Tổng trạng thái khớp: 295 + 2 + 63 = 360. Hai tỷ lệ hiện trên slide là 82,50% và 81,94%; không còn số vượt 100% như bản cũ.

| Nội dung hiện tại | Sửa thành | Công thức |
|---|---|---|
| Test coverage — 82.50% | Test execution rate — 82.50% | (295 + 2) / 360 |
| Test successful coverage — 81.94% | Passed / planned — 81.94% | 295 / 360 |
| Chưa nêu pass rate trong số ca đã chạy | Pass rate — 99.33% | 295 / 297 |

Không gọi 82,50% hoặc 81,94% là code coverage. Code coverage cần output đo statements / branches / functions / lines và ghi rõ phạm vi, revision, ngày chạy.

Ảnh bảng Excel đang quá nhỏ để thuyết trình: đưa biểu đồ tổng hợp vào slide chính, chuyển bảng 8 module và test case chi tiết sang appendix. Ảnh mới có bản đầy đủ header và bản chỉ nội dung để chèn dưới header Canva đang có.

## 2. Số liệu giữa các nguồn chưa thống nhất

| Nguồn | Passed | Failed | Pending / chưa ghi trạng thái | Ghi chú |
|---|---:|---:|---:|---|
| Canva trang 34 đang xem | 295 | 2 | 63 | Số được dùng trong ảnh mới; chưa xác nhận round / revision |
| Workbook trong repo — Round 1 | 175 | 2 | 183 | Đếm đúng 360 ID ca kiểm thử |
| Workbook trong repo — Round 2 | 175 | 2 | 183 ô trống | Không tự coi ô trống là kết quả đã chạy |
| Workbook trong repo — Round 3 | 357 | 3 | 0 | Là trạng thái được ghi trong file, không phải kết quả vừa chạy lại |
| Test Documentation, mục 5 | 280 | Không tách rõ | Không tách rõ | Ghi 284 executed, 98.6%, 4 minor UI defects đã xử lý; cần đối chiếu riêng |

Chưa được lựa chọn bộ số đẹp nhất rồi đưa vào slide. Chốt một test round có ngày chạy, commit/build, môi trường, tester và evidence. Cập nhật cùng một bộ số ở Test Statistics, Test Documentation và Canva.

### Công thức summary đang lấy Round 1

Trong `Test Statistics`, D11:G18 liên kết đến B6:E6 của từng module. Dòng 6 của module là Round 1; Round 2 nằm dòng 7 và Round 3 nằm dòng 8. Nếu nhóm chủ ý báo cáo Round 3, sửa liên kết cùng lúc cho cả 8 module sang B8:E8; chỉ làm sau khi xác nhận kết quả và evidence của Round 3. Không gộp số của nhiều round.

Hai công thức hiện có:

- E21 = (D19 + E19) / (H19 - G19): tỷ lệ đã chạy trong phạm vi applicable, không phải code coverage.
- E22 = D19 / (H19 - G19): tỷ lệ đạt trên phạm vi applicable, không phải pass rate trong các ca đã chạy.
- Pass rate cần một chỉ số riêng: D19 / (D19 + E19), xử lý trường hợp chưa chạy ca nào.

## 3. Defect đang không khớp test case trong workbook

| Sheet / ID | Mô tả test case | Ghi chú defect hiện có | Việc cần làm |
|---|---|---|---|
| Authentication / UC07-TC2 | Sign out — negative path | FIDO2 WebAuthn biometric login endpoint missing | Kiểm tra lại ID và bằng chứng; logout và biometric login là hai luồng khác nhau |
| Pharmacist POS / UC28-TC2 | Create return slip — negative path | Barcode scanner camera resolution issue on mobile Safari | Gắn lỗi camera vào đúng ca barcode; xác nhận kết quả ca hoàn trả |
| Finance & AI Supply Chain / UC64-TC2 | Analyze seasonal and epidemic trends — negative path | Conflict resolution on concurrent offline POS sync requires manual merge | Gắn lỗi offline sync vào đúng ca; xác nhận riêng ca phân tích xu hướng |

Không lấy các ghi chú này làm tên hai lỗi hiện tại của Canva trước khi sửa mapping. Round 3 trong file còn có ba ca Failed; điều này cũng cần giải thích trước khi slide tuyên bố chỉ còn hai ca.

Một defect nên có: Defect ID, Test case ID, steps, expected result, actual result, severity, owner, status, build, evidence, ngày retest. Chỉ ghi Closed sau khi có retest đạt.

## 4. Chất lượng test case và báo cáo cần cải thiện

- Test case đang lặp lại ba mẫu happy / negative / edge cho mọi use case. Các ca Sign in / Register còn có precondition “authenticated”, cần sửa theo đúng hành vi bắt đầu luồng.
- Ghi chú “45ms” xuất hiện y hệt ở 120 ca happy path. Đây không đủ để chứng minh hiệu năng từng chức năng; cần request/log và điều kiện đo cụ thể, hoặc bỏ số.
- 120 ghi chú edge path lặp lại “Redis atomic lock prevented race conditions”; cần ca cạnh tranh thực tế với số yêu cầu đồng thời và số dư trước / sau để chứng minh.
- Không áp dụng kỳ vọng “ghi MongoDB và phát Kafka event” cho mọi thao tác; từng test phải kiểm tra hiệu ứng mà use case thực sự cần.
- Test Documentation đang ghi 86.4% statement coverage, Redis cache hit 92.4%, Kafka lag 0 và 100% Critical/High closed. Chưa tìm thấy file coverage-summary / coverage-final / lcov / test-results / junit trong phạm vi repo đã tìm để đối chứng các số này. Cần đính kèm kết quả đo / defect log hoặc bỏ các tuyên bố chưa chứng minh được; không kết luận rằng không có evidence ở nơi khác.
- Test Documentation còn ghi năm 2019 ở cover, nhóm có 5 người và FIFO trong phạm vi kho. Cập nhật năm, đúng 4 thành viên và nghiệp vụ FEFO. Kiểm tra công nghệ realtime theo implementation hiện hành trước khi sửa SSE / Socket.IO.
- Tách mục tiêu kiểm thử (ví dụ branch coverage >= 85%) với kết quả đã đo. Không trình bày mục tiêu thành thành tích.

### Phạm vi test code cần nói đúng

- `backend/apps/inventory-service/src/sales/sales.controller.spec.ts`: mock SalesService, kiểm tra kết quả / lời gọi controller. Ca có tên “deduct stock” không thực sự kiểm tra số tồn DB hoặc FEFO.
- `backend/apps/api-gateway/test/purchase-requisition.e2e-spec.ts`: có HTTP app và MongoDB memory, nhưng mock JWT guard và inventory Kafka client. Nó không chứng minh phân quyền thật hay luồng Kafka xuyên các service thật.
- Việc có file Jest / Playwright không chứng minh suite đang chạy thành công; cần log của lần chạy trên build đã chốt.

## 5. Các ca ưu tiên cho Review 2 — đề xuất, chưa ghi nhận Passed

1. FEFO: dùng ba lô hết hạn / gần hạn / xa hạn; loại lô hết hạn, ưu tiên lô còn hạn gần nhất; thiếu tồn phải từ chối và không trừ kho dở dang.
2. Thanh toán và hóa đơn: cùng subtotal / discount / VAT / grand total trên server, QR và hóa đơn; batchNo / expDate lấy từ lô thật; webhook lặp không tạo sale hay trừ kho hai lần.
3. Phân quyền: người chi nhánh A không đọc / sửa OCR, invoice, inventory của B; không token không xem được file y tế.
4. Xuất hủy và nhà cung cấp: số lượng hủy không vượt tồn; hồ sơ và người duyệt đúng dữ liệu; supplier không đủ điều kiện bị xử lý theo quy tắc đã chốt.
5. OCR / voice: ảnh / âm thanh hợp lệ và không hợp lệ; dược sĩ sửa rồi xác nhận; actor và audit phản ánh thao tác thật.
6. Forecast: mapping salesHistory / sales_history; dữ liệu thiếu, có / không có checkpoint; đối chiếu gợi ý đặt hàng với tồn và hàng đang về. Đánh giá độ chính xác trên dữ liệu holdout trước khi công bố accuracy.

## 6. Bố cục nên dùng

Giữ một slide chính Software Testing với số kế hoạch, trạng thái, ba tỷ lệ có mẫu số và ngày / build / môi trường khi đã chốt. Dùng ảnh mới thay screenshot nhỏ.

Nếu có thêm 30–45 giây, dùng slide Known Defects and Retest Plan: 2–3 lỗi quan trọng có ID, ảnh evidence, owner, trạng thái retest. Không tự điền tên người hay hạn hoàn thành khi chưa phân công.

Nói mẫu theo số đang trên Canva:

> Our test plan contains 360 test cases across eight modules. The current slide reports 297 executed cases: 295 passed and two failed; 63 remain pending. This gives an execution rate of 82.50% and a pass rate of 99.33% among executed cases. We still need to reconcile the report versions, retest the failed cases, and complete the pending cases.

Khi đã đồng bộ và có evidence, thay câu “current slide reports” bằng “In test round [round], on build [build] …”. Không khẳng định hệ thống đã hoàn thiện hoặc đạt toàn bộ yêu cầu chỉ từ pass rate.
