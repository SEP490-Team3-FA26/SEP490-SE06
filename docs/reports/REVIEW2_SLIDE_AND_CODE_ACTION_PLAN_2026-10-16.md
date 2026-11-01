# Hướng sửa slide Review 2 và các comment Review 1
> Cập nhật live ngày 17/10/2026: đã bổ sung bộ ảnh và evidence tại [README_EVIDENCE.md](../presentation/evidence-review1-2026-10-17/README_EVIDENCE.md). Hóa đơn phía khách có cột lô/HSD nhưng CustomerOrders.tsx:1055–1056 dùng số lô fallback và HSD cố định; bổ sung việc này vào C07. RFM hiện có khối nhắc mua lại nhưng tên chào không khớp tên tài khoản trong lần kiểm tra. Các kết luận source bên dưới chưa xác nhận trùng revision đang deploy.

Ngày rà soát: 16/10/2026.

Phạm vi: đọc tĩnh các luồng code liên quan trực tiếp tới comment Review 1; đối chiếu với bản Canva 27 trang đã đọc ở lượt trước. Chưa sửa code, chưa chạy ứng dụng, chưa chạy bộ kiểm thử và chưa đối chiếu Jira đang chạy. Các lỗi dưới đây có bằng chứng trong mã nguồn; “có triển khai” không đồng nghĩa “đã kiểm thử đạt”. Lần kết nối lại tab Canva trong lượt này bị timeout, nên số trang dùng làm mốc theo bản đã đọc.

## 1. Trạng thái đối với từng comment Review 1

| Comment | Kết quả đọc code/tài liệu trình bày | Trạng thái nên ghi trên slide |
|---|---|---|
| Đồng bộ sprint Jira với Report 2 | Cần đối chiếu ngày, phạm vi, issue, người phụ trách trên Jira và Report 2; code không chứng minh được việc này. | Pending verification |
| Tỷ lệ đóng góp GitHub | Không thể quy đổi số commit thành phần trăm công sức. Cần bảng task/PR và phần bàn giao khi nhóm còn 4 người. | Pending verification |
| Mọi xuất kho theo FEFO | POS và chuyển kho có sort expDate tăng dần; chuyển kho thiếu điều kiện loại lô đã hết hạn. POS còn rủi ro trừ kho dở dang. | Partially resolved |
| Biên bản hủy thuốc | Có API xuất hủy, transaction log và giao diện biên bản. Giao diện còn tên hội đồng cố định; API chưa lưu hồ sơ phê duyệt có cấu trúc. | Partially resolved |
| Hóa đơn có batchNo + expDate từng dòng | Có batchNo và số lượng theo lô; schema bán hàng chưa có expDate, bản in chưa hiện expDate. | Partially resolved |
| Quy trình chuẩn nhà cung cấp | Có trường GDP và hàm kiểm tra; luồng PO tự động lại chỉ cảnh báo GDP hết hạn rồi tiếp tục. | Partially resolved |
| Bảo vệ dữ liệu khi tải đơn thuốc | Có JWT/role cho AI và mask một số trường trong audit log; vẫn có fallback file public, thiếu ràng buộc chi nhánh khi đọc/sửa OCR. | Partially resolved |
| Độ chính xác hóa đơn tự động | Đơn hàng đã tính giá/tổng tiền trên server và xác minh webhook PayOS. Tổng tiền trên SalesOrder và UI chưa thống nhất cùng breakdown. | Partially resolved |
| Tracking đơn hàng | Có giao diện nhưng mốc giao hàng/GPS/nhiệt độ đang được giả lập. | UI implemented; real tracking pending |
| Làm rõ AI | Có STT, OCR, RAG, LLM; dữ liệu confidence và việc đồng thuận của dược sĩ còn ghi sẵn. | Implemented; validation and audit fixes pending |
| Cá nhân hóa người dùng | Có lịch sử tìm kiếm, RFM và quy tắc gợi ý; API nhận danh tính khách từ query/body, chưa ràng buộc chủ dữ liệu. | Implemented; authorization fixes pending |
| Có quản lý chi nhánh | Có dữ liệu/kho theo chi nhánh; chưa đủ để khẳng định mọi API đã phân quyền theo chi nhánh. | Implemented; access-control verification pending |
| Bán phần mềm/gói cho doanh nghiệp | Là phần business model cần làm rõ trên slide và tài liệu. Chưa đủ bằng chứng để tuyên bố đã có sản phẩm SaaS thương mại hoàn chỉnh. | Business model to clarify |

Không đưa con số “70–80% hoàn thành” từ nhận xét Review 1 thành tiến độ hiện tại. Dùng số yêu cầu đã nghiệm thu / tổng yêu cầu trong phạm vi cùng ngày chốt.

## 2. Sửa bản Canva đang có ở đâu

| Trang cũ | Hướng sửa cụ thể |
|---|---|
| 1 — Cover | Giữ; ghi Review 2, tên đề tài và đúng 4 thành viên. Xóa Lê Trường Thành ở mọi trang/phụ lục phân công nếu còn. |
| 2 — Kết quả first comment review 1 | Đổi thành Review 1 Feedback and Resolution. Điền bảng Feedback / Changes / Evidence / Status. Tách 2 trang nếu cần; không nhồi 13 dòng vào một slide. Dùng trạng thái trong mục 1. |
| Sau trang 2 | Thêm Agenda 8 mục, xem mục 3. |
| 3 — Vì sao cần ABC Pharmacy? | Rút xuống 3 ý tiếng Anh: vấn đề, người dùng, giá trị của hệ thống. Nói 20–30 giây; chuyển trọng tâm sang thay đổi từ Review 1. |
| 4 — Existing System | Pharmacity và Long Châu là chuỗi nhà thuốc; đổi nhãn phần này thành Market References nếu giữ logo. Nếu muốn so sánh phần mềm, dùng các sản phẩm phần mềm cụ thể có nguồn và tiêu chí so sánh. Chưa có nguồn thì bỏ khẳng định “đối thủ không có AI/FEFO/multi-branch”. |
| 5 — Our Solution | Có ảnh giao diện, không phải trang trống. Thêm nhãn: Implemented / In progress / Phase 3. Giá trị khác biệt phải gắn bằng chứng demo được. |
| 6 — Project Management | Thay đoạn Scrum chung bằng Planned vs Actual, completed/remaining work, current risks và phân công 4 người. Kiểm tra lại 8 sprints/14 weeks/Sprint 5–6 thay vì giữ nguyên số cũ. |
| 7–8 — Product Backlog | Có ảnh board và spreadsheet. Chọn 1 trang chính, phóng to phần issue tiêu biểu; thêm 3 chỉ số có nguồn: planned, completed, carried over. Trang còn lại chuyển appendix. |
| 9 — Document Management | Gộp vào PM hoặc appendix. Thể hiện phiên bản Report 2/3/4/5 và liên kết tới yêu cầu/thiết kế/test; ảnh thư mục đơn thuần chưa thể hiện tiến độ. |
| Trước trang 10 | Thêm Updated Business Workflow. Vẽ 1–2 luồng nghiệp vụ chính, đánh dấu chỗ được sửa từ Review 1. |
| 10 — Architecture | Giữ sơ đồ, thêm 3 chú thích vai trò Gateway, Kafka/services, MongoDB/Redis và đường đi của luồng demo. Chỉ mô tả thành phần thực sự dùng. |
| 11 — ERD | Giữ; thêm chú thích 3 cụm: medicine–batch–inventory; order–sale–allocation; prescription–OCR/consultation audit. Nêu snapshot batch/expiry là việc còn cần bổ sung. Không đọc từng bảng. |
| 12–22 — Module use cases | Đưa phần lớn vào appendix. Phần chính giữ 1–2 trang Use Case Updates Since Review 1; nêu thay đổi và demo liên quan. Không thuyết trình lại 11 sơ đồ như Review 1. |
| 23 — AI pipeline | Trang này thiên về kiến trúc hệ thống. Gộp phần trùng với Architecture; dành trang AI để giải thích input → xử lý → đầu ra → dược sĩ xác nhận → audit. |
| 24 — AI package diagram | Giữ làm hình phụ/appendix. Cập nhật OCR và LLM theo code hiện tại ở mục 5. Không ghi accuracy 96% từ confidence hardcode. |
| 25 — Software Testing | Thay screenshot quá nhỏ bằng bảng/tóm tắt dễ đọc. Sửa 149.17% và 148.61%. Tách executed rate, pass rate và code coverage; xem mục 6. Thêm 2 failed cases là gì nếu vẫn còn. |
| 26 — Demo | Thay một dòng chữ bằng sơ đồ luồng + vai trò thao tác + kết quả cần chứng minh. Ưu tiên 2 luồng ở mục 7. |
| 27 — Conclusion | Chính tả Conclusion đã được sửa. Đổi nội dung thành Phase 2 Assessment: completed/total, known issues, risks; thêm Phase 3 Plan với owner và mốc thực tế. |

Thống nhất toàn bộ tiêu đề, bullet, caption và legend bằng tiếng Anh. Ảnh chụp ứng dụng tiếng Việt có thể giữ nếu đó là giao diện sản phẩm thực tế; caption tiếng Anh giải thích rõ thao tác. Bỏ animation không phục vụ giải thích.

## 3. Agenda 8 phần và bố cục

1. Project Overview
2. Project Management
3. Requirements and Business Workflow Updates
4. System Architecture and Database Design
5. Testing and Quality
6. AI Integration
7. Live Demonstration
8. Phase 2 Assessment and Phase 3 Plan

Review 1 Feedback and Resolution đặt ngay sau cover, trước agenda.

Nếu vẫn giữ giới hạn 15 phút nhóm đã nêu: dành khoảng 1 phút mở đầu/feedback, 7 phút nội dung cập nhật, 5 phút demo, 2 phút đánh giá/kế hoạch. Chuyển use case chi tiết, ERD đầy đủ, backlog đầy đủ sang appendix để trả lời câu hỏi. Nếu hội đồng quy định thời lượng khác, điều chỉnh theo lịch đó.

Mẫu text ngắn cho slide feedback:
- FEFO allocation: Implemented; expired-batch filtering and transactional consistency require fixes.
- Invoice traceability: Batch allocation is stored; expiry snapshots and printed expiry dates are pending.
- Disposal workflow: Disposal records are available; approval records and report data require completion.
- Supplier qualification: GDP fields are available; strict validation must be enforced in auto-routed purchase orders.
- Privacy: Role checks and audit masking exist; private file access and branch authorization require fixes.
- Order tracking: UI available; real shipment events are pending.
- AI and personalization: Core flows implemented; audit integrity, authorization, and evaluation remain in progress.

## 4. Code cần sửa — theo mức ưu tiên

P0 = xử lý trước khi tuyên bố tính năng an toàn/đúng nghiệp vụ và trước demo luồng liên quan.
P1 = hoàn thiện để đóng comment Review 1; nếu chưa kịp, ghi rõ hạn chế và kế hoạch.

### C01 — P0 — Khóa truy cập ảnh đơn thuốc và dữ liệu OCR/voice theo chi nhánh

Bằng chứng:
- [Lưu file AI](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/ai-clinical/ai-clinical.service.ts:51): S3 presigned URL 7 ngày được lưu; khi S3 lỗi ghi ảnh/audio vào public/uploads và trả URL public.
- [Mount thư mục public](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/main.ts:94): thư mục public được phục vụ bằng express.static.
- [Controller AI](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/ai-clinical/ai-clinical.controller.ts:81): branch_id từ body được ưu tiên trước JWT; API history/detail/adjust chưa truyền người dùng để kiểm tra quyền trên bản ghi.
- [Truy vấn OCR](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/ai-clinical/ai-clinical.service.ts:175): bỏ branchId hoặc dùng ALL có thể bỏ filter; detail/adjust tìm theo scanId đơn thuần.
- Có [mask trong audit](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/interceptors/audit-log.interceptor.ts:194); việc này bảo vệ payload log, không tự bảo vệ file gốc.

Sửa:
1. Lưu file y tế trong kho private; không fallback vào thư mục static public. Khi storage lỗi, báo lỗi hoặc dùng vùng private có kiểm soát.
2. Lưu object key; chỉ tạo URL ngắn hạn sau khi xác thực quyền xem, thay vì lưu URL sống 7 ngày làm đường truy cập lâu dài.
3. Lấy branch/user từ JWT; admin xem nhiều chi nhánh phải có quyền rõ ràng. Áp dụng cùng chính sách cho list/detail/adjust/audio/confirm.
4. Lấy reviewer/audit actor từ JWT; không nhận danh tính dược sĩ trong body làm bằng chứng.
5. Đặt limits/fileFilter ngay ở Multer, không chỉ kiểm tra sau khi nhận toàn bộ file. Chốt thời hạn giữ/xóa ảnh và audio, rà dữ liệu gửi tới AI provider.

Đạt khi: không token không đọc được file; người chi nhánh A không xem/sửa dữ liệu B; thay branchId/scanId không vượt quyền; lỗi S3 không tạo file public. Trên slide ghi Partially resolved cho tới khi có kết quả kiểm thử này.

### C02 — P0 — Bảo vệ API bán hàng và xuất hủy

Bằng chứng:
- [SalesController](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/controllers/sales.controller.ts:9) dùng OptionalJwtAuthGuard; create cho RETAIL không yêu cầu đăng nhập; list/detail không truyền phạm vi chi nhánh.
- [Truy vấn hóa đơn](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts:626) không có điều kiện owner/branch.
- [API xuất hủy](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/controllers/medicine.controller.ts:119) có JWT nhưng chưa kiểm tra role/branch tại route; performedBy nhận từ client.

Sửa: dùng JWT + role cho POS/return/exchange và xuất hủy; kiểm tra chi nhánh ở service; actor từ JWT. Giữ luồng mua hàng công khai riêng với API vận hành kho. Khách không được gọi trực tiếp lệnh trừ kho hay xem hóa đơn của người khác.

Đạt khi: gọi POS không token trả 401; khách gọi nghiệp vụ nội bộ trả 403; đổi ID/branch không xem hoặc hủy lô ngoài phạm vi.

### C03 — P0 — Chặn lô hết hạn trong FEFO, thống nhất mọi luồng xuất

Bằng chứng:
- [POS chọn lô](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts:251) có sort expDate, nhưng tính totalAvailable trước khi bỏ lô hết hạn.
- [Chuyển kho](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/purchase/purchase.service.ts:1683) lọc ACTIVE + stock rồi sort; không lọc expDate và vòng trừ không bỏ lô hết hạn. Lô hết hạn chưa được job đổi trạng thái vẫn có thể bị xuất.
- [Online dùng chung lệnh xuất](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/orders-service/src/orders-service.service.ts:734) gọi inventory.sale.create.

Sửa: dùng chung chính sách eligible batch: đúng kho/chi nhánh, còn tồn, trạng thái hợp lệ, còn hạn theo quy ước ngày đã thống nhất. Tổng tồn khả dụng và thao tác trừ đều dùng chính sách này. Sort thêm khóa phụ khi cùng expDate. Loại lô quarantine/blocked nếu các trạng thái này tồn tại trong nghiệp vụ. Đừng chỉ trông chờ cron đổi EXPIRED.

Đạt khi: có lô ACTIVE đã hết hạn, lô gần hạn và lô xa hạn thì POS, online và transfer đều bỏ lô hết hạn, xuất lô gần hạn trước; thiếu tồn còn hạn thì từ chối toàn bộ.

### C04 — P0 — Giao dịch bán hàng phải toàn vẹn và chống xử lý lặp

Bằng chứng:
- [Tạo sale](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts:163) kiểm tra orderCode rồi xử lý; [trừ từng lô](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts:338) đã dùng atomic decrement.
- Nhưng [thiếu lô sau khi trừ](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts:374) có thể throw sau khi đã cập nhật lô trước; hóa đơn và log tới cuối mới lưu. Hàm không bao trong một MongoDB transaction.
- [Schema orderCode](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/schemas/sales-order.schema.ts:96) hiện chỉ index, chưa unique.
- [Đổi hàng](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts:903) thay batch.stock trong bộ nhớ nhưng không lưu các lô mới đổi trước khi hoàn tất.

Sửa: transaction trong inventory cho batch/balance/sale/log/prescription có liên quan; idempotency key và unique index phù hợp, xử lý retry/race. Chuẩn hóa dữ liệu cũ trước khi tạo unique index. Luồng exchange phải thực sự persist trừ kho, đúng chi nhánh, cùng cơ chế giao dịch. Giao tiếp xuyên service dùng trạng thái/saga phù hợp; transaction DB không tự bao trùm toàn bộ microservices.

Đạt khi: mặt hàng thứ nhất đủ, mặt hàng thứ hai thiếu thì tất cả tồn không đổi; hai request cùng orderCode chỉ tạo một sale và trừ một lần; đổi hàng xong đọc lại DB thấy số tồn đúng.

### C05 — P0 — Nhà cung cấp hết hạn GDP vẫn có thể đi qua PO tự động

Bằng chứng:
- [Hàm kiểm tra NCC](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/supplier-service/src/supplier-service.service.ts:104) có chặn inactive/GDP hết hạn khi được gọi, nhưng cho qua hồ sơ thiếu ngày GDP.
- [PO tự động](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/purchase/purchase.service.ts:589) tạo supplier fallback khi không xác minh được; GDP hết hạn chỉ log “continuing” và đi tiếp.
- [Duyệt PO](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/purchase/purchase.service.ts:686) chưa gọi lại kiểm tra GDP trước bước APPROVE.

Sửa: xác định bộ hồ sơ bắt buộc theo scope; không gửi/duyệt PO cho NCC không xác minh được, inactive hoặc hồ sơ bắt buộc thiếu/hết hạn. Có thể giữ bản nháp bị chặn để bổ sung hồ sơ. Gọi cùng một validator ở auto-route và approval; kiểm tra lại khi hồ sơ thay đổi. Tách seed dữ liệu giả ở onModuleInit khỏi startup production.

Đạt khi: supplier service mất kết nối, NCC thiếu hồ sơ, hết hạn hoặc inactive đều không trở thành PO đã duyệt; NCC hợp lệ đi được luồng. Slide hiện chỉ ghi Partially resolved.

### C06 — P0 — Không tự sinh số lô và hạn dùng khi nhập kho thực tế

Bằng chứng:
- [Nhận PO tự động](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/purchase/purchase.service.ts:797) tự tạo batchNo và expDate = hôm nay + 1 năm.
- [Route vẫn gọi được](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/controllers/purchase-order.controller.ts:146) POST :id/receive gửi tới hàm này.

Sửa: bỏ đường nhập kho tự tạo thông tin truy vết; nhận GRN với batchNo, expDate, quantity từ hàng thực tế, có validation. Nếu cần công cụ dữ liệu thử thì tách khỏi luồng vận hành.

Đạt khi: nhận hàng thiếu batchNo/expDate bị từ chối; thông tin lô từ GRN đi xuyên tới transfer → sale → invoice, không bị thay bằng số tự sinh.

### C07 — P1 — Hóa đơn thiếu expDate và có lỗi đơn vị ở phân bổ lô

Bằng chứng:
- [SalesOrderBatchItem](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/schemas/sales-order.schema.ts:5) có batchNo/quantity/importPrice, chưa có expDate.
- [Lưu phân bổ](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts:353) lưu quantity theo đơn vị cơ sở.
- [In hóa đơn POS](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/pharmacist/components/RetailView.tsx:2368) vẫn ghi FIFO; ghép b.quantity với it.unit. Ví dụ 1 hộp = 10 viên có thể in phần phân bổ thành 10 hộp. Chưa in HSD.
- Rà cùng mẫu in ở PrescriptionView.tsx và WholesaleView.tsx.

Sửa: lưu snapshot batchId/batchNo/expDate/baseQuantity/baseUnit tại thời điểm xuất, trả trong DTO và in từng phân bổ; phân biệt số lượng bán và số lượng đơn vị cơ sở. Đổi nhãn FEFO. Với dữ liệu cũ thiếu HSD, hiển thị thiếu dữ liệu hoặc backfill khi truy vết được; không đoán HSD.

Đạt khi: bán một dòng đi qua hai lô in đủ số lô, HSD, lượng lấy từ từng lô đúng đơn vị; tổng phân bổ khớp số lượng quy đổi; sửa dữ liệu lô hiện tại không làm đổi hóa đơn lịch sử.

### C08 — P1 — Biên bản hủy phải lấy dữ liệu thật và có lưu hồ sơ

Bằng chứng:
- [Xử lý hủy](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/medicine.service.ts:936) đã trừ kho, tạo transaction và gọi đồng bộ; chưa có hồ sơ hội đồng/phê duyệt có cấu trúc ở luồng này.
- [Submit từ UI](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/warehouse/InventoryHistory.tsx:273) gộp lý do/phương pháp vào notes.
- [Mẫu biên bản](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/warehouse/InventoryHistory.tsx:1482) dùng địa điểm VinaPharmacy và tên hội đồng cố định; fallback thời gian hiện tại.
- Hàm đang dùng Math.min để âm thầm giảm lượng hủy khi yêu cầu vượt tồn, khác với UI chặn vượt tồn.

Sửa: lưu DisposalRecord có mã, chi nhánh, snapshot lô/HSD, quantity, reason, method, thành viên thật, người lập/người duyệt và timestamp; trạng thái theo workflow nhóm chốt. Bản in đọc cùng record, không hardcode người ký. Transaction cho trừ kho + log + hồ sơ. Validate quantity trên server, không âm thầm đổi yêu cầu. Không dùng nhãn “100% Có Biên Bản Hội Đồng GPP” như số liệu chứng nhận khi chưa có bằng chứng.

Đạt khi: xem/in lại sau đăng nhập hoặc đổi ngày vẫn đúng dữ liệu; người không có quyền không duyệt/hủy được; không hủy hai lần cùng hồ sơ; số lượng vượt tồn bị từ chối.

### C09 — P1 — Thống nhất số tiền giữa đơn hàng, sale và hóa đơn

Đã có:
- [Quote giá server](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/orders-service/src/orders-service.service.ts:128) thay giá client bằng giá server.
- [Tính lại tổng](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/orders-service/src/orders-service.service.ts:268) tính giảm giá/điểm/thuế rồi ghi totalAmount.
- [Webhook PayOS](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/orders-service/src/orders-service.service.ts:1322) xác minh chữ ký và đối chiếu số tiền. Không ghi lỗi “chưa verify chữ ký” cho code hiện tại.

Còn cần sửa:
- SalesService tính totalAmount từ đơn giá × số lượng và lưu ở dòng 501, chưa chung breakdown như OrdersService.
- RetailView tính tổng có discount/points/VAT ở dòng 1197–1203, nhưng invoice ưu tiên totalAmount của sale ở dòng 2387.
- DeductInventory chưa truyền pricing breakdown cố định của order vào sale; có thể tái tính giá tại thời điểm khác.

Sửa: một cấu trúc breakdown chuẩn: subtotal, discounts, pointsDiscount, tax, grandTotal; định nghĩa rõ SalesOrder.totalAmount là số nào. Server tính/kiểm tra và lưu snapshot đã chốt; invoice, QR, email và báo cáo dùng cùng dữ liệu. Tách trường subtotal nếu cần. Không lấy output AI làm nguồn giá/hệ số quy đổi.

Đạt khi: cùng giỏ hàng với guest/member, voucher, points, nhiều đơn vị cho cùng số phải trả ở màn hình, DB, QR và hóa đơn; retry webhook không xuất kho/tích điểm lặp.

### C10 — P1 — Tracking hiện tại là dữ liệu giả lập

Bằng chứng: [getCustomerShipmentInfo](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/customer/CustomerOrders.tsx:507) tự tạo các mốc +8/+18/+30/+45 phút; sau 45 phút tự coi đã giao; GPS nội suy, tên shipper/carrier, nhiệt độ 4.5°C và cold-chain được ghi sẵn.

Sửa: shipment + event history trên backend, trạng thái từ thao tác có quyền hoặc tích hợp thật. Tách paymentStatus và deliveryStatus. Khách chỉ đọc shipment của đơn mình. Chưa có GPS/cảm biến/carrier thì hiện “Chưa có dữ liệu”, không dựng thành thực tế.

Đạt khi: không có event giao hàng thì dù chờ 1 giờ vẫn chưa DELIVERED; xác nhận giao phải lưu actor/time/evidence theo scope; UI hiển thị đúng event DB.

### C11 — P0 — AI không được tự ghi nhận sự đồng thuận của dược sĩ

Bằng chứng:
- [Khởi tạo voice consultation](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/ai-clinical/ai-clinical.service.ts:333) đã có pharmacistFinalDecision từ AI, pharmacistAgreement = true và confirmedAt ngay lúc tạo; có giá 50000 và số chứng chỉ fallback.
- [OCR log](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/ai-clinical/ai-clinical.service.ts:145) có giá fallback 50000, confidenceScore = 0.96 và license fallback.
- [OCR adjustment](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/ai-clinical/ai-clinical.service.ts:254) nhận pharmacistInfo và orderCode từ body, có thể gán DISPENSED khi body có orderCode.

Sửa: tạo trạng thái chờ duyệt, agreement chưa xác nhận, confirmedAt rỗng; tách AI suggestion khỏi final decision. Chỉ endpoint confirm đã kiểm tra quyền mới lưu actor/time từ server. Không bịa license/giá/confidence; thuốc chưa khớp SKU cần xử lý thủ công, giá lấy pricing service. DISPENSED chỉ khi có sale thực sự, liên kết bản ghi hợp lệ.

Đạt khi: chạy AI xong chưa bấm xác nhận vẫn chưa có chữ ký/đồng thuận của dược sĩ; người khác không giả danh người duyệt; gửi orderCode bất kỳ không thể biến hồ sơ thành DISPENSED; thiếu SKU/giá không tự điền 50000.

### C12 — P0/P1 — Cá nhân hóa có triển khai nhưng phải khóa danh tính người dùng

Bằng chứng:
- [Recommendation API](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/controllers/recommendation.controller.ts:30) nhận phone/userId/deviceId trực tiếp, không gắn JWT guard tại controller.
- [Đọc/xóa lịch sử](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/api-gateway/src/controllers/recommendation.controller.ts:109) dùng danh tính từ query/body.
- [RFM + lịch sử](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/recommendation.service.ts:122) có triển khai quy tắc, nhắc refill và tên khách; [lọc chi nhánh](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/medicine/recommendation.service.ts:250) chỉ hạn chế medicine IDs khi branchItems có dữ liệu, chi nhánh rỗng có thể rơi về dữ liệu toàn hệ thống.
- Cache đọc có hậu tố branchId ở controller dòng 81 nhưng invalidation dòng 54/140 thiếu hậu tố đó.

Sửa: khách đăng nhập dùng danh tính JWT; khách vãng lai dùng session/device token có ràng buộc, không cho client chọn tùy ý người khác. Khóa quyền read/delete/search-log và cá nhân hóa. Chỉ trả gợi ý khả dụng đúng chi nhánh, không fallback sai kho. Đồng nhất cache key/invalidation theo user + branch. Mô tả thuật toán là RFM/search-intent rules nếu đúng code, không nhận là mô hình ML đã được đánh giá.

Đạt khi: user A không đọc/xóa/ghi lịch sử B bằng cách thay phone; chi nhánh không có hàng không quảng bá như có hàng; xóa/tìm kiếm mới cập nhật gợi ý đúng cache. Kiểm thử việc loại thuốc kê đơn và trường hợp thiếu nhãn phân loại.

## 5. Sửa nội dung AI pipeline cho khớp code

Dùng hai nhánh đầu vào:
- Printed prescription image → Vision OCR → structured fields → SKU matching / validation.
- Consultation audio → Whisper STT → text → retrieval / LLM suggestions.

Sau đó: pharmacist reviews and confirms → server pricing and FEFO allocation → order/sale → audit trail.

Các thành phần đã thấy trong code:
- STT: Groq Whisper large v3.
- RAG: Cohere multilingual embeddings + Qdrant, kèm truy vấn dữ liệu thuốc.
- OCR: OpenRouter Gemini 2.5 Flash, fallback Hugging Face; phạm vi hiện mô tả chỉ đơn bản in, từ chối đơn viết tay.
- LLM: hàm generate LLM response ưu tiên DeepSeek khi có cấu hình, sau đó Groq và OpenRouter; không chỉ Llama 3.3 như sơ đồ cũ. Model thực chạy phụ thuộc biến cấu hình/provider khả dụng.
- MongoDB: dữ liệu nghiệp vụ và audit.

Nguồn: [STT](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/ai-service/services/stt_service.py:23), [OCR](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/ai-service/services/ocr_service.py:148), [LLM](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/ai-service/services/llm_service.py:21), [RAG](D:/Đồ án tốt nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/ai-service/services/rag_service.py:12).

Phần human confirmation trên pipeline là hành vi mục tiêu cần enforce theo C11; đừng khẳng định backend đã bảo đảm khi chưa sửa. Forecasting để nhánh planning riêng, tránh ghép vào chuỗi xử lý đơn thuốc như một bước bắt buộc. Không đưa con số độ chính xác AI nếu chưa có tập đánh giá, cách tính và kết quả thực nghiệm.

## 6. Sửa số testing đang trên slide

Theo ảnh trang 25 đã đọc: Planned 360, Passed 175, Failed 2, Pending 183, N/A 0.

| Chỉ số | Công thức | Giá trị đúng với ảnh đó |
|---|---|---|
| Executed tests | 175 + 2 | 177 |
| Test execution rate | 177 / 360 | 49.17% |
| Pass rate among executed tests | 175 / 177 | 98.87% |
| Passed tests / planned tests | 175 / 360 | 48.61% |
| Pending | 360 − 177 | 183 |

Đây là phép sửa số từ screenshot, không xác nhận dữ liệu kiểm thử hiện tại vẫn là như vậy. Lấy kết quả mới nhất từ nguồn test trước khi chốt slide.

- Xóa 149.17% và 148.61%.
- Không gọi các tỷ lệ trên là code coverage.
- Code coverage chỉ báo cáo nếu có output instrumentation, ghi rõ statements/branches/functions/lines, phạm vi và ngày chạy.
- Thêm bảng Top Defects: ID, scenario, actual result, severity, owner, retest status.
- File sales.controller.spec.ts đang mock SalesService và kiểm tra ủy quyền lời gọi; test đó không chứng minh FEFO, rollback, giá tiền hay đúng số dư DB. Bổ sung integration tests với các ca C01–C12, đặc biệt C03/C04/C05/C09.

## 7. Hai luồng demo chính sau khi sửa

### Demo A — Nhập hàng, chuyển kho, bán FEFO và truy vết hóa đơn
PO với NCC hợp lệ → GRN nhập batch/HSD thật → chuyển về chi nhánh → POS lấy lô còn hạn gần nhất → invoice hiện batchNo + expDate → đối chiếu số tồn.

Chuẩn bị ba lô trong môi trường demo: đã hết hạn, gần hạn, xa hạn. Chứng minh lô hết hạn bị chặn, không chỉ cho thấy màn hình có nhãn FEFO. Dữ liệu demo được tạo riêng và có nguồn, không nhét fallback giả vào production.

### Demo B — OCR hoặc voice hỗ trợ dược sĩ
Ảnh đơn bản in hoặc ghi âm → AI trích xuất/gợi ý → dược sĩ sửa một mục → xác nhận → server chốt giá → bán → xem lại audit actor/time và sale liên kết.

Chỉ chọn một đầu vào OCR hoặc voice nếu thời gian ngắn. Không demo AI tự xác nhận quyết định của dược sĩ. Tracking chỉ đưa vào demo như chức năng hoàn chỉnh khi đã thay C10 bằng event thật.

## 8. Thứ tự nhóm nên triển khai

1. Khóa quyền/file/danh tính: C01, C02, C11, phần bảo mật C12.
2. Sửa nghiệp vụ cốt lõi: C03, C04, C05, C06.
3. Hoàn thiện bằng chứng Review 1: C07, C08, C09.
4. Thay tracking giả C10; hoàn thiện lọc chi nhánh/cache C12.
5. Chạy kiểm thử trọng tâm, lưu evidence, cập nhật status và con số.
6. Sửa slide theo mục 2–6; diễn tập hai luồng demo.

Một comment chỉ đổi thành Resolved khi có đủ: code thực thi đúng + ca kiểm thử đạt + bằng chứng dễ mở + slide/report phản ánh đúng. Chức năng còn lỗi nên ghi Partially resolved kèm việc còn lại và owner.

## 9. Các việc quản lý và business không thể kết luận chỉ từ code

- Sprint alignment: lập bảng Jira sprint ID / start-end / planned scope / actual done / carry-over / Report 2 reference.
- Contribution: với 4 thành viên, liệt kê hạng mục thực làm, PR/issue và phần việc tiếp nhận từ Lê Trường Thành; tỷ lệ nếu cần phải có cách tính thống nhất, không lấy commit count làm công sức.
- Business model: nêu khách hàng là doanh nghiệp/chuỗi nhà thuốc, người mua và người dùng; cách tính phí theo chi nhánh/tài khoản/gói; hỗ trợ triển khai; ranh giới phần đã làm và đề xuất. Không tự đặt số giá thành dữ kiện.
- Phase 2 Assessment: số yêu cầu nghiệm thu/tổng scope, chức năng chưa xong, lỗi còn mở, rủi ro và điều chỉnh nhân sự.
- Phase 3 Plan: task, owner, mốc ngày thực tế, tiêu chí nghiệm thu. Không bịa deadline hay phần trăm hoàn thành.

