# SBA Residual Business Risk Review

**Ngày đánh giá:** 08/10/2026  
**Vai trò:** Senior Business Analyst (SBA)  
**Phạm vi:** Backend microservices, API Gateway và các màn hình bán hàng/kho/mua hàng hiện có trong repository  
**Phương pháp:** đọc luồng nghiệp vụ từ controller → Kafka message → service → schema; đối chiếu các điểm ghi tiền, tồn kho, trạng thái và phân quyền. Đây là desk review mã nguồn, chưa thay thế kiểm thử UAT, kiểm thử tải hay kiểm tra dữ liệu production.

## 1. Nhận định điều hành

Dự án đã có nền tảng nghiệp vụ rộng: bán lẻ/kê đơn, FEFO theo lô, nhập kho/kiểm nhận, chuyển kho, RFQ/PO, đối soát PayOS, loyalty và liên thông GPP. Tuy nhiên, các rủi ro nghiêm trọng còn tập trung ở ranh giới giữa các service. Khi một bước bất đồng bộ hoặc một bước thất bại, hệ thống có thể lưu trạng thái tiền, hóa đơn hoặc tồn kho không cùng một sự thật.

**Khuyến nghị phát hành:** chưa nên coi các luồng thanh toán, hoàn trả và xuất kho là sẵn sàng cho vận hành thật cho tới khi đóng các mục **BR-01 đến BR-05** và có bằng chứng kiểm thử hồi quy. Các mục **BR-06 đến BR-09** cần được xử lý trước khi mở rộng quy mô chuỗi.

| Mã | Feature | Mức độ | Độ tin cậy | Kết luận SBA |
|---|---|---:|---:|---|
| BR-01 | Đơn hàng / xuất kho / thanh toán | P0 - Critical | Đã xác nhận qua code | Có thể ghi nhận đơn đã thanh toán nhưng xuất kho thất bại; trả kết quả thành công kèm cảnh báo. |
| BR-02 | Loyalty / điểm thưởng | P0 - Critical | Đã xác nhận qua code | Điểm có thể bị trừ hai lần khi tạo đơn dùng điểm. |
| BR-03 | PayOS webhook / đối soát | P0 - Critical | Đã xác nhận qua code | Endpoint không xác minh chữ ký trước khi gửi payload vào xử lý; trạng thái có thể bị giả mạo nếu endpoint bị gọi trực tiếp. |
| BR-04 | Giá bán / tổng tiền | P0 - Critical | Đã xác nhận qua code | Backend tin `price` và `totalAmount` do client gửi, tạo rủi ro bán sai giá và thu tiền sai. |
| BR-05 | Đơn kê đơn / Rx | P0 - Critical | Đã xác nhận qua code | Mã `PRX-HAND-*` có thể tạo đơn thủ công với thông tin bác sĩ/bệnh viện mặc định; chưa có rào chắn nghiệp vụ độc lập ở backend cho phê duyệt dược sĩ. |
| BR-06 | Tồn kho đa bảng / FEFO | P1 - High | Đã xác nhận qua code | Luồng bán dùng đọc rồi `save()` từng batch, trong khi một số luồng chuyển kho dùng atomic update; tính nhất quán chưa đồng nhất. |
| BR-07 | Trả/đổi hàng | P1 - High | Đã xác nhận qua code | Trả hàng cộng số lượng theo đơn vị giao dịch vào stock batch nhưng không dùng `exchangeValue`; có thể lệch tồn khi bán vỉ/viên. |
| BR-08 | Kiểm kê kho | P1 - High | Đã xác nhận qua code | Có thể hoàn tất nhiều lần theo race giữa các request vì trạng thái được đọc và cập nhật tách rời, không có điều kiện chuyển trạng thái nguyên tử. |
| BR-09 | RFQ / public supplier portal | P1 - High | Đã xác nhận qua code | Token được gọi là one-time nhưng không bị vô hiệu hóa sau khi nộp; nhà cung cấp có thể nộp lại và thay thế báo giá trong cùng hạn. |
| BR-10 | Nhập kho / công nợ NCC | P1 - High | Đã xác nhận qua code | Ghi nhận công nợ dùng `grn.totalAmount` tính theo số lượng kỳ vọng, trong khi tồn kho dùng `actualQty`; nhận thiếu vẫn có thể ghi công nợ đủ. |
| BR-11 | Bảo mật dữ liệu đơn hàng | P1 - High | Cần kiểm thử/UAT xác nhận | `my-orders` cho phép truy vấn theo số điện thoại hoặc tên; cần xác nhận mức xác thực và masking trên giao diện. |
| BR-12 | Marketing ROI | P2 - Medium | Đã xác nhận qua code | ROI dùng COGS cố định 65% và chỉ quy doanh thu khi có voucher; chỉ số có thể sai khi giá vốn thực tế hoặc campaign đa kênh khác biệt. |

## 2. Các lỗi cần xử lý trước khi phát hành

### BR-01 — Đơn đã thanh toán nhưng xuất kho thất bại

**Luồng:** `orders-service` đánh dấu đơn `PAID` trước khi hoàn tất xuất kho. Hàm `deductInventory()` bắt lỗi hoặc timeout rồi resolve một object cảnh báo; `createOrder()` vẫn trả `success: true` và giữ đơn đã thanh toán.

**Bằng chứng:**

- `backend/apps/orders-service/src/orders-service.service.ts:374-423`: CASH/CARD được lưu `PAID`; khi xuất kho lỗi, hàm trả `success: true` với `warning`.
- `backend/apps/orders-service/src/orders-service.service.ts:585-596`: timeout/lỗi xuất kho được chuyển thành `{ warning: ... }`, không reject transaction.
- `backend/apps/orders-service/src/orders-service.service.ts:443-465`: QR cũng lưu `PAID` trước khi gọi `deductInventory()`.

**Tác động:** khách đã trả tiền nhưng không có thuốc; CSKH không có trạng thái rõ để giao bù/hoàn tiền; doanh thu, tồn kho và hóa đơn GPP lệch nhau.

**Tiêu chí nghiệm thu:**

1. Đơn chỉ chuyển `PAID/FULFILLABLE` sau khi có kết quả xuất kho thành công hoặc có reservation hợp lệ.
2. Timeout kho tạo trạng thái `PAYMENT_RECEIVED_INVENTORY_PENDING`, retry có idempotency và không trả `success` hoàn tất.
3. Có thao tác hoàn tiền/giải phóng điểm/voucher theo Saga khi xuất kho thất bại.

### BR-02 — Trừ điểm loyalty hai lần

**Bằng chứng:**

- `backend/apps/orders-service/src/orders-service.service.ts:246-255`: trừ `redeemedPoints` ngay khi tạo đơn.
- `backend/apps/orders-service/src/orders-service.service.ts:308-317`: Saga lại trừ `redeemedPoints` lần thứ hai.
- `backend/apps/user-service/src/user-service.service.ts:490`: service cộng/trừ trực tiếp vào số dư, không có transaction key/idempotency key.

**Tác động:** khách mất điểm gấp đôi; nếu số dư không đủ, `Math.max(0, ...)` còn che mất việc trừ quá mức thay vì phát hiện lỗi. Khi đơn hủy, hệ thống chỉ hoàn một lần ở các nhánh hủy.

**Tiêu chí nghiệm thu:** chỉ có một operation `RESERVE_POINTS(orderCode)`; retry cùng orderCode không thay đổi số dư lần hai; test tạo đơn, timeout, hủy và webhook lặp.

### BR-03 — Webhook thanh toán chưa chứng minh chữ ký

**Bằng chứng:**

- `backend/apps/api-gateway/src/controllers/order.controller.ts:64-84`: route nhận webhook, đặt Redis lock rồi chuyển toàn bộ body vào Kafka; không thấy gọi hàm xác minh chữ ký PayOS.
- `backend/apps/orders-service/src/orders-service.service.ts:924-938`: lưu `signatureVerified: true` theo dữ liệu nội bộ dù service không kiểm chứng chữ ký.
- `backend/apps/orders-service/src/orders-service.service.ts:943-999`: payload hợp lệ về cấu trúc có thể chuyển trạng thái đơn và tạo bản ghi đối soát.

**Tác động:** nếu endpoint public bị gọi giả mạo, đối tượng tấn công có thể tạo đối soát/đánh dấu thanh toán hoặc kích hoạt downstream flow. Đây là lỗi kiểm soát thanh toán, cần ưu tiên P0.

**Tiêu chí nghiệm thu:** xác minh chữ ký bằng secret của PayOS trước Redis lock/Kafka; reject 401/400 khi sai; lưu `INVALID_SIGNATURE`; test replay, sửa amount, sửa orderCode và webhook lặp.

### BR-04 — Tin dữ liệu giá và tổng tiền từ client

**Bằng chứng:**

- `backend/apps/api-gateway/src/dto/create-order.dto.ts:24-30, 50-54`: DTO chỉ kiểm tra kiểu số cho `price`, `quantity`, `totalAmount`, không kiểm tra quan hệ giữa chúng.
- `backend/apps/orders-service/src/orders-service.service.ts:131-138, 258-282, 341-350`: subtotal/voucher/PayOS amount lấy từ `data.items` và `data.totalAmount`.
- `backend/apps/inventory-service/src/sales/sales.service.ts:383-385`: giá bán dùng `item.price` nếu client gửi.

**Tác động:** sửa request có thể làm giảm giá, sai tổng thanh toán hoặc làm báo cáo doanh thu/ROI không đáng tin. Đây là lỗi tiền trực tiếp.

**Tiêu chí nghiệm thu:** backend lấy giá và quy đổi đơn vị từ catalog/price list theo branch; tính lại subtotal, discount, tax/fee và total; client chỉ gửi SKU, quantity, unit; từ chối nếu lệch giá hoặc catalog không còn hiệu lực.

### BR-05 — Luồng kê đơn có đường tạo đơn thủ công mặc định

**Bằng chứng:**

- `backend/apps/inventory-service/src/sales/sales.service.ts:171-200`: nếu `type === 'PRESCRIPTION'` và mã bắt đầu `PRX-HAND-`, service tự tạo prescription với `doctorName`, `hospitalName`, `hospitalCode` mặc định.
- `frontend/src/pages/pharmacist/components/PrescriptionView.tsx:681-710`: frontend tạo mã `PRX-HAND-*` khi không có mã điện tử và đánh dấu `isManualPrescription`.

**Tác động:** backend chưa phân biệt rõ “đơn giấy đã được dược sĩ xác minh” với dữ liệu placeholder. Nếu API bị gọi trực tiếp hoặc cờ frontend bị giả mạo, giao dịch Rx có thể đi qua mà không có bằng chứng phê duyệt đủ mạnh.

**Tiêu chí nghiệm thu:** backend yêu cầu `approvedBy`, thời điểm duyệt, mã hành nghề/ảnh đơn hoặc audit record; reject placeholder/default; chỉ vai trò dược sĩ được tạo/duyệt Rx; đơn đã dùng không thể bán lại.

## 3. Các lỗi tồn kho và mua hàng

### BR-06 — Xuất kho bán hàng chưa atomic

`createSalesOrder()` đọc danh sách batch, tính tổng, sau đó giảm `batch.stock` và `save()` (`backend/apps/inventory-service/src/sales/sales.service.ts:236-276, 298-344`). Hai request đồng thời có thể cùng đọc một số dư và cùng ghi kết quả. Các luồng chuyển kho lại dùng `findOneAndUpdate(... stock: { $gte })` (`purchase.service.ts:1669-1681, 2527-2539`), cho thấy kiểm soát race chưa được áp dụng nhất quán cho bán hàng.

**Tiêu chí nghiệm thu:** reserve/trừ stock bằng atomic conditional update hoặc transaction; kiểm thử hai request bán cùng batch cuối; không âm kho và không tạo hai hóa đơn thành công cho cùng số lượng.

### BR-07 — Trả hàng không quy đổi đơn vị

`processReturn()` dùng `quantity` để tăng `dbBatch.stock` và `medicine.stock` (`backend/apps/inventory-service/src/sales/sales.service.ts:575-605`). Trong khi mỗi dòng bán lưu `exchangeValue`/`baseQuantity` (`sales.service.ts:387-400`). Với 1 vỉ có `exchangeValue=10`, trả 1 vỉ nhưng cộng 1 đơn vị cơ sở thay vì 10.

**Tiêu chí nghiệm thu:** hoàn trả dùng đúng batch allocation và `baseQuantity`; hàng đã mở/đã bảo quản phải có chính sách nhập lại/quarantine; trả hàng không làm tăng stock nếu lý do không đủ điều kiện nhập lại.

### BR-08 — Hoàn tất kiểm kê có thể điều chỉnh hai lần

`completeInventoryCheck()` đọc `check.status`, sau đó set `COMPLETED`, save và gọi `applyStockAdjustments()` (`backend/apps/inventory-service/src/medicine/medicine.service.ts:1245-1259`). Hai request đồng thời có thể vượt qua cùng một kiểm tra. Hàm điều chỉnh cập nhật batch và tạo transaction log (`1267-1296`).

**Tiêu chí nghiệm thu:** chuyển trạng thái bằng `findOneAndUpdate({_id, status: {$ne:'COMPLETED'}})` hoặc transaction; unique key trên `referenceId + batchNo`; test double-click/retry.

### BR-09 — Magic link RFQ chưa one-time

`getRfqBySupplierToken()` và `submitQuotationByToken()` kiểm tra token/deadline, còn `submitSupplierQuotation()` chủ động xóa báo giá cũ của cùng NCC rồi thêm báo giá mới (`backend/apps/inventory-service/src/purchase/purchase.service.ts:3086-3104, 3110-3156`). Schema vẫn giữ token/status `SUBMITTED`, không có bước revoke/consumed-at.

**Tác động:** link bị chuyển tiếp vẫn có thể sửa báo giá trước deadline; không phù hợp với ý nghĩa “one-time token” và làm yếu tính toàn vẹn đấu thầu.

**Tiêu chí nghiệm thu:** xác định rõ “one-time” hay “editable until deadline”; nếu one-time thì reject sau lần submit và lưu `consumedAt`; nếu editable thì đổi tên nghiệp vụ, audit version và khóa sau deadline.

### BR-10 — Công nợ theo số kỳ vọng thay vì số thực nhận

`createGoodsReceiptNote()` tính `grn.totalAmount` từ `quantity * unitPrice` (`backend/apps/inventory-service/src/purchase/purchase.service.ts:901-977`). Khi duyệt, tồn kho/PO dùng `actualQty` (`1074-1193`) nhưng record công nợ NCC truyền `amount: grn.totalAmount` (`1214-1229`). Nhận thiếu có thể tăng công nợ đủ theo PO.

**Tiêu chí nghiệm thu:** công nợ và VAT lấy từ số lượng được nghiệm thu; chênh lệch phải có debit/credit note hoặc workflow giải trình; test nhận 90/100 và kiểm tra PO, stock, AP ledger.

## 4. Rủi ro dữ liệu, báo cáo và bảo mật cần UAT

### BR-11 — Lịch sử đơn hàng có thể suy đoán theo tên/số điện thoại

`getMyOrders()` xây `$or` theo `userId`, `patientPhone` hoặc regex `patientName` (`backend/apps/orders-service/src/orders-service.service.ts:535-565`). Controller `GET /api/orders/my-orders` dùng `OptionalJwtAuthGuard` (`backend/apps/api-gateway/src/controllers/order.controller.ts:192-198`). Cần kiểm thử xem người chưa đăng nhập có thể tự truyền phone/name để lấy lịch sử người khác hay không; nếu có, đây là P0 về dữ liệu cá nhân.

**Tiêu chí nghiệm thu:** khách đã đăng nhập chỉ xem `userId` của mình; khách vãng lai phải dùng mã đơn + OTP/claim token; không truy vấn theo tên mơ hồ; response masking số điện thoại và thông tin nhạy cảm.

### BR-12 — ROI dùng giá vốn giả định và attribution hẹp

`getMarketingRoiAnalytics()` cố định `DEFAULT_PHARMA_COGS_RATIO = 0.65` và chỉ chọn đơn `voucherCode` khớp campaign trong thời gian campaign (`backend/apps/orders-service/src/orders-service.service.ts:1228-1279`).

**Tác động:** ROI có thể trình bày sai cho thuốc/chi nhánh có biên khác nhau, campaign không dùng voucher, hoặc đơn dùng nhiều kênh. Đây là rủi ro quyết định quản trị, không phải lỗi thu tiền.

**Tiêu chí nghiệm thu:** lấy COGS theo batch/giá vốn thực tế; định nghĩa attribution window và campaign source; hiển thị `estimated` nếu chưa có dữ liệu giá vốn; reconciliation với doanh thu đã đối soát.

## 5. Ưu tiên backlog SBA

### P0 — khóa phát hành

1. Xây state machine đơn hàng: `PENDING_PAYMENT → PAYMENT_CONFIRMED → INVENTORY_RESERVED → FULFILLABLE`; Saga có retry, idempotency và hoàn tác.
2. Xác minh PayOS signature trước khi nhận webhook; kiểm tra amount/orderCode/reference và chống replay.
3. Tính giá/tổng tiền server-side từ catalog, branch price và unit conversion.
4. Loại bỏ placeholder Rx; bắt buộc dược sĩ phê duyệt bằng identity/audit record.
5. Sửa double deduction loyalty, dùng operation key theo orderCode.

### P1 — trước pilot nhiều chi nhánh

1. Atomic stock reservation cho bán hàng; thống nhất `branch_inventories`, `medicine_batches` và `branch_stock_balances` thành một nguồn sự thật hoặc có cơ chế reconcile bắt buộc.
2. Sửa return/exchange theo base quantity và batch allocation.
3. Khóa double-submit kiểm kê và ghi nhận transaction idempotent.
4. Chốt chính sách RFQ token và khóa/phiên bản báo giá.
5. Tính công nợ theo actual received quantity.

### P2 — trước báo cáo điều hành chính thức

1. Thiết kế COGS/attribution cho ROI từ dữ liệu thật.
2. Hoàn tất UAT về lịch sử đơn hàng, masking và quyền truy cập theo branch.
3. Bổ sung dashboard exception: payment received but inventory pending, underpaid tolerance, orphan payment, negative/unsynced stock, duplicate adjustment.

## 6. Kịch bản UAT bắt buộc

- Hai request cùng bán đơn vị cuối của một batch.
- Tạo đơn dùng điểm, timeout Kafka, webhook lặp, hủy đơn và kiểm tra số điểm cuối cùng.
- Gửi webhook sai chữ ký, sửa amount, sửa orderCode, replay cùng reference.
- Gửi giá/tổng tiền thấp hơn catalog; đổi unit từ hộp sang vỉ/viên.
- Xuất kho thất bại sau khi thanh toán thành công; kiểm tra trạng thái và hoàn tiền.
- Bán 1 vỉ rồi trả 1 vỉ; kiểm tra batch stock, medicine stock và transaction log.
- Double-click hoàn tất kiểm kê.
- Hai lần nộp báo giá bằng cùng magic link.
- Nhập PO 100, nghiệm thu 90; đối chiếu stock, PO, GRN và công nợ NCC.
- Truy vấn `my-orders` khi không đăng nhập bằng phone/name của người khác.

## 7. Kết luận SBA

Vấn đề trọng tâm hiện tại không phải thiếu màn hình, mà là thiếu các điểm chốt nghiệp vụ bảo vệ **tính đúng của tiền, tồn kho, quyền bán thuốc kê đơn và dữ liệu khách hàng** khi service phân tán hoặc request bị lặp. Ưu tiên đóng P0 theo thứ tự thanh toán → tồn kho → giá → Rx → loyalty, sau đó dùng bộ UAT ở trên làm điều kiện nghiệm thu cho từng feature. Các mục đã nêu là nhận định dựa trên code hiện tại; cần cập nhật lại báo cáo sau khi có test tích hợp và dữ liệu vận hành thực tế.
