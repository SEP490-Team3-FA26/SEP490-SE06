# Demo business workflow Review 2 ABC Pharmacy

Nhóm SE_06 · Phúc dẫn xuyên suốt 5 phút · Nam hỗ trợ mua hàng, Đạt hỗ trợ kho, Phước hỗ trợ POS

## 1 Câu chuyện và phạm vi

Theo dõi cùng SKU DEMO từ hồ sơ mua, nhận theo lô, vị trí kho, chuyển và nhận tại chi nhánh đến bán tại quầy. Chatbot là nhánh khách hàng song song, không tự nối giỏ chatbot với giỏ POS. Trong 5 phút, mở chứng từ đã chuẩn bị cho các bước cũ và dành thao tác trực tiếp cho bước nhận hàng hoặc POS. Không nói mọi hồ sơ đều vừa được tạo trên sân khấu.

## 2 Business workflow đưa lên slide

Nhu cầu/tồn/forecast → quản lý chọn nguồn cấp → RFQ và so sánh báo giá → PO → GRN kiểm nhận → nhập lô và vị trí trên sơ đồ kho → chuyển hàng → chi nhánh nhận → dược sĩ kiểm tra đầu vào OCR → POS → đối chiếu lô và tồn.

Nhánh song song: Khách hàng → chatbot tìm sản phẩm → thẻ sản phẩm → khách/dược sĩ xem lại. Chỉ vẽ tiếp bước giỏ/đặt hàng nếu nhóm thực sự trình diễn và xác minh liên kết.

Kho tổng còn hàng có thể cấp trực tiếp cho chi nhánh; không bắt buộc đi qua RFQ. SKU DEMO chưa có lịch sử bán nên phần forecast là màn hình riêng, không phải nguồn sinh RFQ DEMO đã chuẩn bị.

## 3 Phần cũ lướt nhanh và cập nhật cần dừng

Lướt đăng nhập, master data và nhập form RFQ/PO. Dừng tại báo giá và PO liên kết, GRN VERIFIED, chi tiết kệ và lô/HSD, nhận chi nhánh, chatbot trả thẻ và kết quả POS. Chỉ gọi là “đã demo ở Review 1” nếu nhóm thực sự đã demo phần đó lần trước.

## 4 Kịch bản 5 phút

### 00:00 đến 00:20 Mở business workflow

Phúc nói; Nam chuẩn bị hồ sơ mua hàng, Đạt chuẩn bị kho và nhận chi nhánh, Phước chuẩn bị POS. Những người hỗ trợ chỉ thao tác, không nhận lượt thuyết trình mới.

“Sau đây, nhóm xin demo theo business workflow: nhu cầu bổ sung hàng, mua và kiểm nhận, lưu kho theo lô, cấp chi nhánh, rồi bán hàng và đối chiếu. Các chứng từ đã chuẩn bị trước được giữ nguyên mã để hội đồng theo dõi. Nhóm cũng minh họa chatbot ở kênh khách hàng; đây là nhánh song song với bán tại quầy.”

### 00:20 đến 01:00 Forecast và hồ sơ RFQ PO

“Đầu tiên, quản lý xem nhu cầu, tồn và hàng đang về để cân nhắc bổ sung. SKU DEMO vừa tạo chưa có lịch sử bán, nên nhóm không dùng nó để chứng minh độ chính xác dự báo. Nhóm chuyển sang bộ hồ sơ mua hàng đã chuẩn bị cho cùng SKU này.”

Mở forecast để chỉ đầu vào và đề xuất đã có; không huấn luyện lại hoặc tạo giao dịch. Sau đó mở RFQ-20261017-0008 và PO-RFQ-20261017-0008. Đây là RFQ tạo qua API ứng dụng để chuẩn bị demo; chưa chứng minh RFQ này được sinh từ forecast.

“Ở RFQ này có hai báo giá thử nghiệm. Báo giá B rẻ hơn nhưng thời hạn còn lại ngắn hơn ngưỡng của RFQ; nhóm đã chọn A và sinh PO liên kết. Các bước nhập form cũ nhóm lướt nhanh.”

RFQ đã AWARDED, PO đã COMPLETED do đã nhập đủ hàng. Không mô tả PO này là đang chờ duyệt, không award lại, không gửi thư cho nhà cung cấp.

### 01:00 đến 01:30 Kiểm nhận GRN và lô hàng

“Đây là hai phiếu nhập của cùng PO. Vitamin C được nhập 30 hộp ở lô gần hạn và 80 hộp ở lô xa hạn. Số lượng thực nhận, số lô và hạn dùng đã được kiểm tra và phiếu đã hoàn tất trước buổi demo.”

Mở GRN có ID 6ad3e593b3263f345aea9d1c và 6ad3e596b3263f345aea9d83; chỉ actualQty, VERIFIED, COMPLETED và poId. Hai phiếu dùng số kiểm đếm nhập thủ công trong fixture; không gọi đây là kết quả AI đếm ảnh. Không duyệt lại.

### 01:30 đến 02:00 Sơ đồ kho và hai lô theo hạn dùng

“Sau nhập kho, nhóm có thể tìm vị trí hàng theo khu, kệ, tầng và ô. Ở kệ RES4, tầng 1, ô 10 là Vitamin C DEMO. Kho tổng còn 85 hộp: 5 hộp ở lô gần hạn và 80 hộp ở lô xa hạn. Hai ô bên cạnh minh họa hàng sắp hết và hàng còn đủ tồn.”

Mở /warehouse/inventory/map → cuộn đến Khu Dự Trữ → sổ các kệ → RES4 → Tầng 1 → dòng ô B10 → 2 Lô. B8 có 60 hộp khẩu trang, B9 có 8 gói bông. NEAR hết hạn 06/01/2027, FAR hết hạn 17/10/2028. Dùng ngày cụ thể vì số ngày còn lại thay đổi theo giờ máy chủ. Không dùng tìm kiếm toàn sơ đồ để chứng minh số tồn: lúc kiểm tra, kết quả tìm DEMO hiển thị “Hết hàng” dù chi tiết kệ có tồn đúng.

### 02:00 đến 02:25 Chi nhánh nhận hàng

“Hệ thống phân biệt hàng đang chuyển với hàng đã nhận. Chi nhánh BR-001 đã có 20 hộp DEMO từ phiếu trước. Phiếu ST-20261017-0002 đang chuyển thêm 5 hộp cùng lô gần hạn; tại đây nhóm xác nhận thực nhận và đối chiếu tồn chi nhánh.”

Thao tác trực tiếp khi trình diễn: mở đúng ST-20261017-0002, nhập thực nhận 5, xác nhận nhận → kiểm tra DELIVERED và tồn 20 thành 25. Đây là mốc dự kiến, chưa được bấm trong phiên chuẩn bị. Nếu đã diễn tập nhận phiếu này, không bấm lần hai; đọc trạng thái hiện tại và dùng số tồn mới. Kho tổng đã trừ khi xuất chuyển, nên bước nhận không được trừ thêm 5 ở kho tổng.

### 02:25 đến 03:05 Chatbot ở kênh khách hàng

“Ở nhánh khách hàng, người dùng có thể tìm sản phẩm bằng câu hỏi tự nhiên. Nhóm nhập nhu cầu bổ sung vitamin C; chatbot trả các thẻ sản phẩm để xem tên, giá và tình trạng còn hàng. Đây là nhánh tìm hiểu sản phẩm, không phải giỏ bán theo đơn tại quầy.”

Mở /customer/shop → biểu tượng Bồ Câu → tạo cuộc trò chuyện mới, đặt tên DEMO R2 nếu cần → nhập câu hỏi số 1 trong chatbot-prompts.txt. Phiên thử đã trả UPSA-C 37.000đ, Enervon 2.290đ và Ceelin 68.000đ. Riêng Enervon đã được đối chiếu API danh mục: 2.290đ/Hộp, còn 152 tại thời điểm chuẩn bị. Số tồn và kết quả AI có thể thay đổi; đọc dữ liệu đang hiển thị. Không thêm sản phẩm thật vào giỏ hoặc tạo thanh toán để minh họa.

“Luồng hiện đã trả thẻ sản phẩm. Phần tìm chính xác SKU DEMO mới và trả lời giá ở lượt tiếp nối chưa đạt trong thử nghiệm, nên nhóm vẫn để ở Remaining Work.”

Nếu API chậm quá 8 giây, mở ảnh 07-chatbot-product-discovery.png và nói rõ đó là kết quả thử trước buổi demo; không đọc ảnh như phản hồi mới.

### 03:05 đến 03:40 OCR hỗ trợ tiếp nhận

“Tại quầy, OCR hỗ trợ trích xuất thông tin từ ảnh đầu vào. Dược sĩ phải kiểm tra tên và số lượng trước khi dùng cho giao dịch. Nhóm xin chỉ một trường trích xuất và kết quả đối chiếu danh mục.”

Phước mở bán theo đơn tại /pharmacist/sales và dùng ảnh OCR đã diễn tập. File OCR_DEMO_R2.png trong gói là đầu vào tổng hợp để kiểm tra, chưa chạy qua OCR live trong phiên chuẩn bị; không mặc định nó sẽ khớp SKU DEMO. Nếu kết quả khớp thuốc khác, không áp dụng vào giao dịch DEMO. Có thể mở kết quả OCR đã chuẩn bị, nói rõ hồ sơ riêng, rồi chuyển sang bán lẻ SKU DEMO. Không hứa đây là cùng một đơn được OCR thành công nếu chưa kiểm tra.

### 03:40 đến 04:40 POS và tồn sau giao dịch

“Ở giao dịch bán thử, nhóm chọn đúng SKU DEMO và đơn vị Hộp, kiểm tra số lượng cùng giá rồi đối chiếu lô xuất sau bán.”

Chọn BR-001, đúng ca bán → tìm DEMO-R2-VITC → 2 Hộp. Fixture đã chuẩn hóa 1 Hộp bằng 1 đơn vị tồn, giá 25.000đ/Hộp. Giá hàng trước giảm/VAT/phí là 50.000đ; đọc tổng cuối từ server, không tự cộng mức thuế hoặc ưu đãi dự phòng. Chỉ hoàn tất giao dịch thử bằng cơ chế demo nhóm đã xác nhận; không mở PayOS hoặc chuyển tiền thật. Kiểm tra các dữ liệu đơn trước khi xác nhận.

Nếu nhận thêm 5 hộp thành công và chưa có bán khác: tồn chi nhánh 25 → 23 sau bán 2. Nếu chưa nhận: 20 → 18. Đây là phép đối chiếu dự kiến, chưa phải kết quả POS đã chạy. Lưu saleId, batchNo và số lượng thực tế. Chi nhánh hiện chỉ có lô NEAR; bán từ lô này không chứng minh lựa chọn FEFO giữa nhiều lô ở chi nhánh. Hai lô đang thấy ở kho tổng là dữ liệu của kho tổng.

### 04:40 đến 05:00 Đối chiếu và chuyển assessment

“Cuối cùng, nhóm đối chiếu mã giao dịch, lô đã xuất và tồn trước sau. Luồng vừa rồi bao quát mua, kiểm nhận, vị trí kho, cấp chi nhánh và bán tại quầy; chatbot minh họa nhánh tương tác khách hàng. Các giới hạn đã kiểm tra được nhóm ghi nhận trong đánh giá giai đoạn 2. Em xin tiếp tục với Phase 2 Assessment.”

Mở record thật vừa tạo hoặc ảnh/bản ghi đã chuẩn bị có nhãn rõ. Tổng thời gian 20 + 40 + 30 + 30 + 25 + 40 + 35 + 60 + 20 = 300 giây. Phúc nói xuyên suốt, không mời lại Nam, Đạt hoặc Phước.

## 5 Bộ dữ liệu đã chuẩn bị trên website

Đã đọc lại qua API ứng dụng và xem chi tiết kệ trên abcpharmacy.store ngày 18/10/2026. Dữ liệu là fixture có nhãn DEMO R2, không dùng điều trị hoặc kinh doanh hàng thật. Mã chứng từ do máy chủ sinh có ngày 20261017; giữ nguyên mã thực tế này.

| Dữ liệu | Giá trị đã kiểm tra |
|---|---|
| SKU chính | DEMO-R2-VITC — DEMO R2 - Vitamin C 500mg |
| medicineId | 6ad3e406b3263f345aea9a97 |
| Giá và đơn vị | 25.000đ/Hộp; exchangeValue 1 |
| Kho tổng | 85: lô NEAR 5 + FAR 80, RESERVE/RES4/T1/B10 |
| Chi nhánh BR-001 | 20 hộp, lô NEAR, đã nhận ST-20261017-0001 |
| Hàng đang chuyển | 5 hộp lô NEAR, ST-20261017-0002 còn SHIPPING |
| Đối chiếu số lượng Vitamin C | 85 kho tổng + 20 chi nhánh + 5 đang chuyển = 110 đã nhập |
| Bông y tế | DEMO-R2-BONG, 8 Gói, 12.000đ/Gói, B9 |
| Khẩu trang | DEMO-R2-KT, 60 Hộp, 30.000đ/Hộp, B8 |
| RFQ | RFQ-20261017-0008, AWARDED, hai báo giá thử nghiệm |
| PO | PO-RFQ-20261017-0008, COMPLETED |
| GRN gần hạn | 6ad3e593b3263f345aea9d1c, COMPLETED |
| GRN xa hạn | 6ad3e596b3263f345aea9d83, COMPLETED |
| Hai NCC | DEMO R2 - NCC A/B - KHONG GIAO DICH THAT |

Không dùng thông tin chứng nhận giả lập của NCC DEMO làm bằng chứng tuân thủ GDP/GPP. Báo giá nhập thủ công, không phải phản hồi nhà cung cấp thật. RFQ-20261017-0007 là bản nháp tạo trước, không phải RFQ chính của câu chuyện; không gửi bản nháp này.

## 6 Những phần còn phải diễn tập

- Chatbot trả được thẻ sản phẩm theo nhu cầu; tìm đúng tên SKU DEMO mới và trả lời nối tiếp giá/tồn chưa đạt. Lời trả lời chính trên UI đang dùng câu dự phòng “Cảm ơn bạn đã chia sẻ...” ở cả ba câu thử; không xem phần này đã nghiệm thu.
- Tìm kiếm toàn sơ đồ từng báo hết hàng cho DEMO trong khi bảng RES4 và API cho tồn đúng. Dùng chi tiết kệ khi demo và ghi lỗi này để sửa.
- SKU DEMO mới chưa có lịch sử bán; chưa có dữ liệu chứng minh forecast của nó. Không tạo lịch sử bán giả để gọi là bằng chứng độ chính xác.
- Ảnh OCR tổng hợp chưa được chạy live; phải diễn tập nhận dạng và đối chiếu trước khi chọn làm ảnh chính.
- Nhận phiếu 5 hộp và bán POS được để dành cho lượt trình diễn; hiện chưa có saleId hay hóa đơn mới từ bộ fixture. Kiểm tra ca bán và quyền BR-001 trước buổi nói.
- Hiện có hai lô Vitamin C ở kho tổng, một lô tại chi nhánh. Cần kịch bản kiểm thử riêng nếu muốn chứng minh FEFO giữa nhiều lô tại POS, rollback, chặn hết hạn hoặc hóa đơn đầy đủ HSD.

## 7 Tệp dùng ngay

- demo-data/README_DEMO_R2.md: mã hồ sơ, vị trí, số tồn, bước thao tác.
- demo-data/demo-products.csv: ba SKU và giá trị trước demo.
- demo-data/chatbot-prompts.txt: câu hỏi chính và hai ca kiểm thử chưa đạt.
- demo-data/OCR_DEMO_R2.png: ảnh đầu vào tổng hợp, chưa kiểm thử OCR live.
- demo-data/03-warehouse-demo-res4.png: ảnh kệ có ba sản phẩm và tồn thực tế.
- demo-data/07-chatbot-product-discovery.png: ảnh chatbot trả thẻ sản phẩm trong lần thử.
- demo-data/website-demo-manifest.json và website-demo-verification.json: ID liên kết và kết quả đọc lại từ API. Không có mật khẩu hay token.

## 8 Đối chiếu code và giới hạn cần xử lý

Đọc tĩnh code ngày 18/10/2026, không thay cho chạy thử trên abcpharmacy.store. Những dòng dưới giúp nhóm chọn bước demo và kiểm tra trước buổi diễn tập.

| Bước | Bằng chứng code | Điều có thể nói và giới hạn |
|---|---|---|
| Forecast sang RFQ | frontend/src/components/common/AIForecast.tsx:388 — handleCreateRFQFromForecast; sessionStorage rfq_prefill_meds rồi điều hướng trang RFQ | Có đường chuyển danh sách sang form RFQ; RFQManagement.tsx:225 lấy suggestedOrderQty nhưng có fallback 100, nên vẫn phải kiểm tra số lượng thực tế được điền |
| Forecast sinh PO | AIForecast.tsx:346 — handleConfirmAutoRoutePo gọi purchaseOrderService.autoRoute, prIds rỗng | Đây là nhánh khác, không bắt buộc PR; còn fallback số lượng/giá và fallback chọn thuốc cần rà soát |
| RFQ chọn thầu sinh PO | backend/apps/inventory-service/src/purchase/purchase.service.ts:3354 — awardRfq | Lưu RFQ AWARDED và PO PENDING_APPROVAL trong transaction; số lượng đang lấy availableQuantity, cần kiểm tra có đúng nhu cầu đã chọn không |
| Duyệt PO | purchase.service.ts:728 — approveAndPayPurchaseOrder | Chuyển SHIPPING; CREDIT có check_limit. Nhánh PAID trong hàm không tự chứng minh chuyển tiền ngân hàng đã thành công |
| Nhận PO nhanh | purchase.service.ts:839 — receivePurchaseOrder | Tự sinh batchNo và HSD cộng một năm; không dùng dữ liệu này để chứng minh đã quét lô/HSD thật |
| Duyệt GRN | purchase.service.ts:1082 — approveGoodsReceiptNote | Kiểm tra trạng thái, VERIFIED, lý do chênh lệch và lô/HSD; cập nhật theo actualQty. Cần test rollback/partial failure riêng |
| Chuyển kho | purchase.service.ts:1700 — createStockTransfer | Lấy lô ACTIVE, stock > 0, sort expDate; chưa có expDate > hiện tại trong filter đã đọc. Không tuyên bố mọi lô hết hạn được chặn chỉ từ nhãn ACTIVE |
| Chi nhánh nhận | purchase.service.ts:1889 — confirmStockTransferReceipt | Có bước nhận riêng với trạng thái SHIPPING và cập nhật hàng nhận; phải kiểm tra actualQuantity, log và chênh lệch trên bộ dữ liệu demo |
| Bán POS | backend/apps/inventory-service/src/sales/sales.service.ts:221 trở đi | Có phân bổ theo lô và kiểm tra hạn ở các nhánh; cần đối chiếu số tồn và rollback, không suy từ test controller mock |
| OCR sang bán theo đơn | frontend/src/pages/pharmacist/components/PrescriptionView.tsx:254 — handleApplyAIScanToCart và :575 — finalizeSalesOrder | Có bước áp dụng OCR vào prescriptionItems rồi tạo sale trên cùng luồng. Thông tin chứng chỉ và auditCode trong UI còn giá trị gán sẵn; việc lưu adjustment có catch chỉ ghi log, nên phải kiểm tra bản ghi backend |
| Hóa đơn bán theo đơn | PrescriptionView.tsx:1903 — items/batches, :1920 trở đi — phần tổng tiền | Có hiển thị số lô; phần tổng đang tự tính ưu đãi 5% và VAT 8%. Phải đối chiếu với server; chưa dùng phần in này làm bằng chứng số tiền đã thống nhất hoặc HSD đã đầy đủ |
| Voice và xác nhận | backend/apps/api-gateway/src/ai-clinical/ai-clinical.service.ts:344 | Khởi tạo pharmacistAgreement true và confirmedAt trước thao tác xác nhận; chưa dùng log này làm bằng chứng dược sĩ thật đã xác nhận |
| Forecast đầu vào | inventory-service/src/reports/reports.service.ts:270 và ai-service/routers/forecast.py:181 | Backend gửi salesHistory, Python đọc sales_history/monthlySales; cần sửa hoặc xác nhận mapping trên bản deploy trước khi gọi đó là forecast từ lịch sử thật |

Không dùng tài liệu forecast mô tả GPU làm bằng chứng bản deploy đang chạy GPU. Không bấm huấn luyện lại trong demo 5 phút. Nếu forecast chưa nhận lịch sử đúng, ghi rõ phần minh họa UI và không coi kết quả đó là bằng chứng forecast đã nghiệm thu.

## 9 Các nhánh mở rộng nếu hội đồng yêu cầu

**Kiểm kê:** systemStock snapshot → nhập actualStock → xem difference → hoàn tất phiếu → đối chiếu tồn và transaction điều chỉnh. Hàm createInventoryCheck và completeInventoryCheck có trong medicine.service.ts. Chuẩn bị một phiếu thử nghiệm; không điều chỉnh tồn của SKU đang demo trước khi đã chụp/ghi số tồn sau bán.

**Xuất hủy:** lô cần xử lý → lập xuất hủy → xem biến động tồn → mở biên bản. Kiểm tra trước người lập, người duyệt và dữ liệu in; không dùng tên hội đồng hardcode làm evidence đã hoàn thiện nghiệp vụ.

**Nhánh còn hàng tại kho tổng:** mở PR chi nhánh → quản lý chọn chuyển kho → SHIPPING → chi nhánh nhận → DELIVERED. Quyết định nguồn cấp hiện cần người dùng lựa chọn; không trình bày gateway tự động phân nhánh nếu chưa có code tương ứng.

**Kênh online:** đặt hàng → thanh toán demo → xử lý đơn → kiểm tra tồn và trạng thái. Chỉ mô tả tracking theo event thật nếu đã có; giao diện tự sinh mốc giao hàng không chứng minh tích hợp vận chuyển thực tế.

Nếu muốn thao tác mọi bước từ tạo RFQ, nhập báo giá, duyệt PO, tạo/kiểm GRN, chuyển/nhận, AI và bán đều mới trong cùng một lượt, nhóm cần diễn tập một phiên dài hơn; bản 5 phút dùng các mốc hồ sơ chuẩn bị để thể hiện đủ quy trình và giữ trọng tâm cập nhật.
