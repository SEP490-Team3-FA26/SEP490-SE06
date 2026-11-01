# Bộ dữ liệu demo Review 2 trên abcpharmacy.store

Đã chuẩn bị trên website và đọc lại ngày 18/10/2026. Dùng bộ này để diễn tập; không phải dữ liệu lâm sàng hay giao dịch với nhà cung cấp thật. Không cần chạy lại script prepare để dùng các hồ sơ đã có.

## Mở nhanh

- Sơ đồ kho: https://abcpharmacy.store/warehouse/inventory/map
- Cửa hàng và chatbot: https://abcpharmacy.store/customer/shop
- POS: https://abcpharmacy.store/pharmacist/sales
- Trong trang quản lý RFQ tìm RFQ-20261017-0008, trong PO tìm PO-RFQ-20261017-0008.
- Trong chuyển kho tìm ST-20261017-0002; chi nhánh nhận là BR-001.

## Kệ dùng demo

Mở Khu Dự Trữ → sổ kệ → RES4 → Tầng 1. B8: khẩu trang 60 Hộp. B9: bông 8 Gói, có nhãn sắp hết. B10: Vitamin C 85 Hộp, có nhãn cận date. Mở “2 Lô” ở B10: NEAR 5 Hộp, HSD 06/01/2027; FAR 80 Hộp, HSD 17/10/2028.

Tồn Vitamin C ban đầu: kho tổng 85 + BR-001 20 + đang chuyển 5 = 110 đã nhập. Đã chuẩn hóa 1 Hộp = 1 đơn vị tồn cho riêng fixture, không minh họa đóng gói thuốc thật. Đây là số chụp tại thời điểm chuẩn bị, phải đọc lại nếu có người diễn tập.

## Hồ sơ liên kết

RFQ 6ad3e569b3263f345aea9ba5 → PO 6ad3e592b3263f345aea9bc3 → GRN gần 6ad3e593b3263f345aea9d1c và xa 6ad3e596b3263f345aea9d83 → medicine 6ad3e406b3263f345aea9a97 → lô DEMO-R2-VITC-NEAR/FAR.

ST-20261017-0001 đã DELIVERED 20 Hộp NEAR. ST-20261017-0002 còn SHIPPING 5 Hộp NEAR, ID 6ad3e5cbb3263f345aeaa0ac, PR-20261017-0004. Chỉ xác nhận nhận trong buổi demo/diễn tập một lần; sau nhận BR-001 dự kiến 25.

Bán 2 Hộp DEMO-R2-VITC ở BR-001, giá hàng trước thuế/giảm/phí 50.000đ. Nếu đã nhận phiếu 5 và không có thay đổi khác, tồn dự kiến 25 → 23. Hiện chưa tạo sale; chưa có evidence hóa đơn sau bán. Không đặt thật hoặc mở thanh toán PayOS.

## Chatbot đã kiểm tra

Câu hỏi rộng trong chatbot-prompts.txt trả được ba thẻ UPSA-C, Enervon và Ceelin. Enervon đã đối chiếu danh mục API: 2.290đ/Hộp, còn 152 khi chuẩn bị. Các số này là dữ liệu bản chạy, không phải giá thị trường hay tư vấn sử dụng.

Hai ca chưa đạt: tên SKU DEMO chính xác trả mặt hàng khác; câu tiếp nối hỏi giá tồn trả câu chung và hỏi điện thoại. Cả ba phản hồi trên UI đều dùng lời dẫn dự phòng, cần kiểm tra hợp đồng response giữa frontend và backend. Không kết luận nguyên nhân khi chưa kiểm tra response mạng. Không dùng các ca này để đánh dấu resolved.

## Đầu vào OCR

OCR_DEMO_R2.png là ảnh tổng hợp có watermark DEMO, không có thông tin cá nhân thật, không có liều điều trị. Chưa được gửi OCR live; có thể không khớp SKU mới. Phải chạy thử trước khi chọn làm ảnh demo. Nếu cần, dùng ảnh OCR nhóm đã kiểm tra trước và giới thiệu đó là tình huống riêng.

## Những điểm còn mở

Tìm kiếm toàn sơ đồ báo hết hàng khác với chi tiết kệ, nên dùng RES4 trực tiếp. SKU DEMO chưa có lịch sử để kiểm chứng forecast. Chi nhánh chỉ có lô NEAR, chưa đủ để chứng minh FEFO đa lô ở POS. Chưa diễn tập POS/OCR hoặc kiểm tra rollback trong phiên này. Không dùng fixture NCC làm bằng chứng đạt chuẩn GDP/GPP; thông tin chứng nhận được đánh dấu DEMO.

## Nội dung gói

CSV để tìm nhanh SKU; JSON manifest và verification để đối chiếu ID/lô/chứng từ; PNG 03 là ảnh kệ; PNG 05/06 ghi lỗi chatbot; PNG 07 ghi thẻ sản phẩm; TXT chứa câu hỏi và quan sát UI. Không chứa token/mật khẩu. Kịch bản 300 giây nằm trong DEMO_FULL_BUSINESS_FLOW_REVIEW2.md và bản Word chính của nhóm.
