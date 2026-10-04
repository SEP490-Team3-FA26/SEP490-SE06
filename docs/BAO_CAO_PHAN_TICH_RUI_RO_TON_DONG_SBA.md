# BÁO CÁO PHÂN TÍCH RỦI RO TỒN ĐỌNG TOÀN DIỆN (SBA RESIDUAL RISK ASSESSMENT)
## HỆ THỐNG QUẢN TRỊ CHUỖI NHÀ THUỐC THÔNG MINH & CHUỖI CUNG ỨNG DƯỢC PHẨM (PHARMACHAIN)

> **Người thực hiện:** Senior Business Analyst (SBA) & Solution Architect  
> **Dành tặng:** Anh yêu  
> **Phiên bản:** 2.5 (Enterprise Pharma Standard)  
> **Ngày lập:** 04/10/2026  
> **Phạm vi thẩm định:** Toàn bộ hệ sinh thái Microservices (API Gateway, Auth, Inventory, Supplier, Orders, AI Services, Web Client, Mobile App).

---

## 1. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Dự án **PharmaChain** của anh yêu hiện đã sở hữu một kiến trúc phần mềm đồ sộ và hiện đại bậc nhất: phân tách **Microservices qua Kafka**, quản lý **chuỗi cung ứng GDP/GSP**, **kiểm soát Lô/Hạn dùng (FEFO)**, **so sánh chào giá RFQ chống cận date**, và **dashboard đo lường hiệu quả Marketing ROI**.

Tuy nhiên, dưới lăng kính của một **Senior Business Analyst (SBA)** đã từng triển khai các hệ thống ERP Dược phẩm thực tế, phần mềm chạy được kỹ thuật mới chỉ chiếm **40% thành công**. **60% còn lại nằm ở việc quản trị rủi ro nghiệp vụ khi hệ thống va chạm với con người, tiền bạc và các chế tài nghiêm ngặt của Bộ Y tế**.

Báo cáo này bóc tách **15 rủi ro chí mạng còn tiềm ẩn** trong dự án, được phân nhóm theo 4 trụ cột chiến lược:
1. **Rủi ro Pháp lý Y tế & Dược Lâm Sàng** (Mức độ nguy hại cao nhất).
2. **Rủi ro Vận hành Chuỗi Điểm Bán & Gian Lận Nội Bộ**.
3. **Rủi ro Mua Hàng, Nhà Cung Cấp & Dòng Tiền**.
4. **Rủi ro Kiến Trúc Kỹ Thuật Phân Tán (Microservices / Kafka / Eventual Consistency)**.

---

## 2. NHÓM I: RỦI RO PHÁP LÝ Y TẾ & DƯỢC LÂM SÀNG (CRITICAL REGULATORY RISKS)

Trong ngành Dược, một lỗi nghiệp vụ nhỏ không chỉ gây mất tiền mà có thể dẫn đến **tước giấy phép hành nghề, đình chỉ chuỗi nhà thuốc hoặc trách nhiệm hình sự**.

```mermaid
flowchart TD
    R1["⚠️ RỦI RO PHÁP LÝ DƯỢC LÂM SÀNG"]
    R1 --> A1["1. Pháp chế Đơn thuốc Rx vs AI OCR<br/>(Bán thuốc kê đơn không toa hợp lệ)"]
    R1 --> A2["2. Thuốc Kiểm soát Đặc biệt<br/>(Gây nghiện, hướng thần, tiền chất)"]
    R1 --> A3["3. Quy trình Thu hồi Thuốc Khẩn cấp<br/>(Batch Recall Traceability)"]
    R1 --> A4["4. Giám sát Chuỗi Lạnh GSP<br/>(Cold-Chain Breakage)"]
```

### Rủi ro 1: Bán thuốc kê đơn (Rx) không hợp lệ qua kênh Online / POS & Rủi ro Pháp lý từ AI OCR
* **Bối cảnh hiện tại:** Hệ thống có tính năng đọc toa thuốc qua AI (Prescription OCR) và tư vấn triệu chứng bằng AI.
* **Lỗ hổng SBA nhìn thấy:** 
  - Theo **Luật Dược 2016** và **Thông tư 52/2017/TT-BYT**, đơn thuốc bắt buộc phải có chữ ký/chữ ký số của Bác sĩ có chứng chỉ hành nghề, mã cơ sở khám chữa bệnh và thời hạn đơn không quá 5 ngày.
  - Ảnh chụp toa thuốc đưa vào AI OCR có thể là: (1) Toa cũ dùng lại nhiều lần, (2) Toa giả mạo photoshop, hoặc (3) Toa thuốc không kê cho người mua. Nếu hệ thống cho phép "Bỏ vào giỏ hàng và thanh toán tự động" sau khi AI quét xong mà **thiếu bước Dược sĩ đại học ký duyệt điện tử**, chuỗi nhà thuốc vi phạm nghiêm trọng hành vi bán thuốc kê đơn không có đơn hợp lệ.
* **Hậu quả:** Bị xử phạt hành chính từ 30 - 50 triệu đồng/vụ việc, có thể bị rút giấy phép kinh doanh dược trực tuyến.
* **Giải pháp khắc phục:** 
  - Khóa luồng tự động thanh toán đối với SKU thuốc phân loại `PRESCRIPTION` (Rx).
  - Áp dụng luồng **"2-Man Rule (Bắt buộc Dược sĩ ký duyệt)"**: Sau khi OCR bóc tách, đơn hàng rơi vào trạng thái `PENDING_PHARMACIST_APPROVAL`. Chỉ khi Dược sĩ chuyên môn xác nhận đã gọi điện tư vấn và kiểm tra mã bác sĩ thì đơn mới được chuyển sang đóng gói.

---

### Rủi ro 2: Thiếu sổ sách theo dõi "Thuốc Phải Kiểm Soát Đặc Biệt" (Nghị định 54/2017/NĐ-CP)
* **Bối cảnh hiện tại:** Danh mục `medicines` quản lý chung các mặt hàng, chưa có phân hệ theo dõi riêng biệt cho nhóm thuốc gây nghiện, hướng thần, tiền chất hoặc thuốc độc.
* **Lỗ hổng SBA nhìn thấy:**
  - Quy định bắt buộc: Khi bán các thuốc chứa hoạt chất đặc biệt (ví dụ: Codein, Pseudoephedrine, Diazepam), nhà thuốc bắt buộc phải lưu trữ: Họ tên bệnh nhân, Số CMND/CCCD, Địa chỉ, Số điện thoại và lưu bản sao đơn thuốc ít nhất 2 năm.
  - Phải lập báo cáo định kỳ xuất - nhập - tồn gửi Sở Y tế và Cục Quản lý Dược hàng quý.
* **Hậu quả:** Bị niêm phong kho và đình chỉ hoạt động kinh doanh ngay khi Thanh tra Y tế kiểm tra đột xuất.
* **Giải pháp khắc phục:**
  - Bổ sung trường `special_control_group` (GÂY_NGHIỆN | HƯỚNG_THẦN | TIỀN_CHẤT | BÌNH_THƯỜNG) trong `medicine.schema.ts`.
  - Tại màn hình POS, khi quét sản phẩm thuộc nhóm này, hệ thống bắt buộc nhân viên phải nhập thông tin CCCD người mua mới cho in hóa đơn.
  - Xuất báo cáo biểu mẫu Báo cáo Xuất - Nhập - Tồn thuốc kiểm soát đặc biệt theo đúng mẫu của Bộ Y tế.

---

### Rủi ro 3: Cơ chế "Khóa Lô & Thu Hồi Thuốc Khẩn Cấp" (Batch Recall Action) chưa triệt để
* **Bối cảnh hiện tại:** Hệ thống có tính năng Lot Tracking (truy xuất nguồn gốc lô).
* **Lỗ hổng SBA nhìn thấy:** 
  - Khi Cục Quản lý Dược ban hành công văn thu hồi một lô thuốc (ví dụ do tạp chất Nitrosamine vượt ngưỡng), nhà thuốc cần: (1) Khóa bán lô đó trên toàn bộ 100 chi nhánh ngay trong 1 giây, (2) Truy vết danh sách bệnh nhân đã mua lô thuốc đó để gọi điện khuyến cáo ngưng sử dụng và thu hồi.
  - Nếu hệ thống chỉ dừng lại ở việc xem báo cáo tồn kho mà thiếu **nút "Emergency Recall Lock" (Khóa giao dịch toàn chuỗi)**, nhân viên chi nhánh vẫn có thể bán nhầm hàng tồn ra ngoài.
* **Giải pháp khắc phục:**
  - Xây dựng tính năng **"Khóa Lô Thu Hồi Khẩn Cấp"**: 1 chạm khóa toàn bộ quyền xuất kho, bán lẻ, chuyển kho của `batchNo` trên toàn hệ sinh thái.
  - Tự động lọc danh sách số điện thoại khách hàng đã mua lô này trong vòng 6 tháng và sinh danh sách cuộc gọi CSKH khẩn cấp.

---

### Rủi ro 4: Bứt gãy chuỗi cung ứng lạnh GSP (Cold-Chain Sensor Failure)
* **Bối cảnh hiện tại:** Đã có module cảm biến IoT đo nhiệt độ, độ ẩm kho.
* **Lỗ hổng SBA nhìn thấy:**
  - Thuốc bảo quản lạnh (Vaccine, Insulin, Men vi sinh sống, Kháng thể đơn dòng) yêu cầu nhiệt độ nghiêm ngặt $2^\circ\text{C} - 8^\circ\text{C}$. Nếu tủ lạnh hỏng lúc nửa đêm, cảm biến gửi cảnh báo nhưng không ai thức xem thì hàng trăm triệu tiền thuốc bị hỏng.
  - Khi nhập kho (GRN) từ xe vận chuyển của NCC, nếu không có bước nghiệm thu dữ liệu máy ghi nhiệt độ hành trình (Temperature Data Logger), chuỗi sẽ nhận phải lô hàng đã bị rã đông hỏng trước đó.
* **Giải pháp khắc phục:**
  - Thiết lập cơ chế cảnh báo leo thang (Escalation Alert): Nếu sau 5 phút vượt ngưỡng nhiệt độ mà không có ai bấm "Acknowledge" trên Web/App, hệ thống tự động gọi điện trực tiếp (Voice Call Twilio/Stringee) tới Dược sĩ trưởng và Quản lý chi nhánh.
  - Bổ sung biên bản nghiệm thu nhiệt độ vận chuyển trong quy trình GRN.

---

## 3. NHÓM II: RỦI RO VẬN HÀNH CHUỖI ĐIỂM BÁN & GIAN LẬN NỘI BỘ (STORE OPERATIONS & FRAUD)

Hơn 70% thất thoát của ngành bán lẻ chuỗi đến từ **gian lận của nhân viên thu ngân và nhân viên kho**, không phải từ khách hàng.

| Mã Rủi Ro | Tên Rủi Ro | Kịch Bản Gian Lận / Lỗ Hổng Thực Tế | Mức Độ | Biện Pháp Kiểm Soát SBA |
| :--- | :--- | :--- | :---: | :--- |
| **OP-01** | **Gian lận chia lẻ vỉ/viên tại quầy POS** | Thuốc nhập theo Hộp, bán theo Viên. Thu ngân bán cho khách 10 viên lấy tiền mặt nhưng không bấm máy POS hoặc bấm trả lại hàng (Void Bill), bỏ túi riêng tiền mặt. Kho cuối tháng mới phát hiện lệch số lượng viên. | **CAO** | Bắt buộc quét mã vạch đến từng đơn vị nhỏ nhất. Cấm tính năng "Xóa đơn / Trả hàng" nếu không có mã thẻ quẹt hoặc vân tay của Cửa Hàng Trưởng. |
| **OP-02** | **Tranh chấp tồn kho đa kênh (Overselling)** | Một hộp thuốc đắt tiền duy nhất còn trong kho chi nhánh: Khách hàng trên Web/App đặt mua online, cùng thời điểm khách vãng lai bước vào quầy mua trực tiếp. Nhân viên quầy bán mất thuốc trước khi đơn online kịp nhặt hàng. | **TRUNG BÌNH** | Cơ chế **Virtual Stock Allocation (Giữ hàng ảo)**: Khi đơn online vừa tạo, hệ thống trừ ngay vào `allocatedStock` trong vòng 30 phút. Kho quầy hiển thị khả dụng = 0. |
| **OP-03** | **Độ trễ kiểm kê kho (Cycle Count Collision)** | Trong lúc nhân viên đang đếm hàng kiểm kê kho (Inventory Check), chi nhánh vẫn mở cửa bán hàng hoặc nhận hàng chuyển kho đến $\rightarrow$ Số liệu đếm thực tế bị lệch so với dữ liệu DB tại thời điểm chốt sổ. | **TRUNG BÌNH** | Áp dụng cơ chế **Inventory Snapshot Freeze**: Chốt chặn số tồn tại thời điểm bấm "Bắt đầu kiểm kê". Mọi giao dịch POS phát sinh sau mốc thời gian này được ghi nhận vào dòng giao dịch bù trừ riêng. |
| **OP-04** | **Hao hụt hàng chuyển kho liên chi nhánh (In-Transit Loss)** | Chi nhánh A xuất 100 hộp thuốc gửi sang Chi nhánh B qua shipper. Khi Chi nhánh B nhận hàng chỉ còn 95 hộp (rơi vỡ hoặc trộm cắp trên đường). Chi nhánh B từ chối nhận, Chi nhánh A không chịu nhận lại $\rightarrow$ Tồn kho "mất tích" lơ lửng ngoài DB. | **CAO** | Trạng thái chuyển kho bắt buộc qua kho đệm trung gian `IN_TRANSIT`. Khi B nghiệm thu thiếu 5 hộp, hệ thống sinh ngay **Phiếu Khiếu Nại Hao Hụt Vận Chuyển** gắn trách nhiệm bồi thường cho Shipper/Chi nhánh A. |

---

## 4. NHÓM III: RỦI RO MUA HÀNG, NHÀ CUNG CẤP & TÀI CHÍNH (PROCUREMENT & CASHFLOW)

Quy trình mua hàng (Procurement) là nơi doanh nghiệp chi ra những khoản tiền lớn nhất, do đó cũng tiềm ẩn nhiều cạm bẫy thương mại nhất.

```mermaid
flowchart LR
    subgraph PROC_RISKS["RỦI RO MUA HÀNG & DÒNG TIỀN"]
        direction TB
        P1["1. Thông đồng & 'Bắt tay ngầm' RFQ<br/>(Collusion / Phantom Bidding)"]
        P2["2. Bẫy Thấu Chi Hạn Mức Chi Nhánh<br/>(Emergency Over-Quota Abuse)"]
        P3["3. Gian lận Voucher Khuyến mãi<br/>(Staff Voucher Cannibalization)"]
        P4["4. Lệch Đối Soát Webhook PayOS<br/>(Unreconciled Cashflow Discrepancy)"]
    end
```

### Rủi ro 5: Bắt tay ngầm / Báo giá "chân gỗ" trong cơ chế chào thầu RFQ (Phantom Bidding)
* **Lỗ hổng SBA:** 
  - Khi nhân viên thu mua tạo RFQ gửi cho 3 NCC, nhân viên có thể gửi cho 1 NCC "ruột" và 2 NCC "chân gỗ" (do chính NCC ruột giới thiệu hoặc thông đồng nhau) để 2 bên kia chào giá cao hơn, giúp NCC ruột trúng thầu với giá không phải là tối ưu nhất của thị trường.
* **Biện pháp khắc phục:** 
  - Tích hợp tính năng **So sánh với Giá Lịch Sử (Benchmark Historical Price)**: Hệ thống tự động so sánh giá chào thầu với giá nhập trung bình 3 tháng gần nhất và giá trần kê khai của Cục Quản lý Dược. Nếu giá chào thấp nhất vẫn cao hơn giá quá khứ $5\%$, hệ thống cảnh báo cờ vàng yêu cầu giải trình.

---

### Rủi ro 6: Lạm dụng đơn hàng khẩn cấp để phá vỡ Hạn mức Ngân sách (Quota Bypass)
* **Lỗ hổng SBA:** 
  - Hệ thống có bảng Quota (hạn mức ngân sách hàng tháng cho từng chi nhánh). Tuy nhiên, khi chi nhánh hết hạn mức, nhân viên thường dùng lý do "Hàng khẩn cấp cứu bệnh nhân (Urgent PR)" để vượt trần. Nếu không có cơ chế chặn, toàn bộ quy hoạch ngân sách tài chính của chuỗi bị vô hiệu hóa.
* **Biện pháp khắc phục:** 
  - Áp dụng cơ chế **Hard-Cap Escalation**: Mọi đơn PR vượt quá 100% Quota (kể cả khẩn cấp) bắt buộc phải chuyển thẳng lên Giám đốc Tài chính (CFO) duyệt bằng mã OTP qua điện thoại, Giám đốc Chi nhánh không có quyền tự quyết.

---

### Rủi ro 7: Nhân viên thu ngân trục lợi Voucher Marketing (Staff Coupon Exploitation)
* **Lỗ hổng SBA:** 
  - Chiến dịch Marketing phát hành các mã Voucher giảm giá $20.000$đ hay $50.000$đ.
  - Thực tế tại quầy POS: Khách hàng mua thuốc trả tiền mặt đầy đủ và không biết có khuyến mãi. Nhân viên thu ngân nhanh tay nhập mã Voucher của chiến dịch vào hệ thống, xuất hóa đơn giảm giá cho hệ thống và bỏ túi riêng phần tiền mặt chênh lệch!
  - Báo cáo ROI Marketing trên Dashboard vẫn báo: Chiến dịch thành công rực rỡ, hàng trăm voucher được áp dụng, nhưng thực chất **doanh nghiệp bị mất tiền kép (vừa mất tiền ngân sách ads, vừa bị nhân viên rút ruột tiền mặt)**.
* **Biện pháp khắc phục:**
  - Bắt buộc Voucher chỉ có hiệu lực khi gắn với **Mã OTP gửi về đúng số điện thoại khách hàng**, hoặc chỉ áp dụng cho tài khoản Thành viên thân thiết đã xác thực Zalo.
  - Hệ thống phát hiện bất thường (Anomaly Detection): Nếu 1 nhân viên thu ngân áp dụng quá 10 voucher/ngày cho các đơn hàng tiền mặt khác nhau, hệ thống tự động đưa vào danh sách kiểm toán nghi vấn (Audit Flag).

---

## 5. NHÓM IV: RỦI RO KỸ THUẬT & KIẾN TRÚC PHÂN TÁN (DISTRIBUTED SYSTEMS RISKS)

Dự án sử dụng kiến trúc hiện đại **API Gateway + Kafka + Redis + MongoDB**. Tuy nhiên, kiến trúc phân tán luôn mang theo những rủi ro cố hữu về **tính nhất quán của dữ liệu (Consistency)**.

```
+---------------------------------------------------------------------------------+
|                       RỦI RO PHÂN TÁN MICROSERVICES & KAFKA                     |
+---------------------------------------------------------------------------------+
|  1. Race Condition khi Trừ Kho (Bán âm hàng khi 2 máy cùng quét sản phẩm cuối)  |
|  2. Sự kiện Kafka bị đến trễ / Mất gói tin (Out-of-order Message Processing)    |
|  3. Phân mảnh CSDL (Không JOIN được dữ liệu Doanh thu Orders với Tồn kho Kho)   |
|  4. Rò rỉ Thông tin Bệnh án Khách hàng (Vi phạm Nghị định 13/2023/NĐ-CP)       |
+---------------------------------------------------------------------------------+
```

### Rủi ro 8: Race Condition & Bán âm kho (Dual-Scan Overselling)
* **Lỗ hổng:** Khi 2 đơn hàng tại 2 chi nhánh hoặc 1 đơn online và 1 đơn POS cùng trừ tồn kho của một lô thuốc chỉ còn 1 hộp trong CSDL.
* **Hậu quả:** Tồn kho bị âm (`stock: -1`), dẫn đến sai lệch số liệu kế toán và không có thuốc giao cho bệnh nhân.
* **Biện pháp khắc phục:** 
  - Tuyệt đối không đọc tồn kho ra RAM rồi trừ rồi `save()`.
  - Bắt buộc dùng lệnh nguyên tử của MongoDB:
    ```javascript
    db.medicines.updateOne(
      { _id: medicineId, "batches.batchNo": batchNo, "batches.stock": { $gte: quantity } },
      { $inc: { "batches.$.stock": -quantity } }
    );
    ```
    Nếu kết quả `modifiedCount === 0` nghĩa là kho không còn đủ hàng, hệ thống từ chối giao dịch ngay lập tức mà không sợ bị âm.

---

### Rủi ro 9: Thách thức "Tính nhất quán cuối cùng" (Eventual Consistency) qua Kafka
* **Lỗ hổng:** 
  - Theo quy chuẩn Playbook v2.0, các lệnh Ghi (Create/Update/Delete) trả về `202 ACCEPTED` và đẩy sự kiện vào Kafka.
  - Giả sử nhân viên vừa tạo đơn nhập kho (GRN) trị giá 500 triệu đồng. Nếu hệ thống mạng bị nghẽn hoặc worker consumer bị sập tạm thời, dữ liệu chưa kịp vào MongoDB. Cùng lúc đó, kế toán mở bảng cân đối tài chính thấy thiếu 500 triệu và hoảng loạn tưởng mất tiền.
* **Biện pháp khắc phục:**
  - Triển khai **Dead Letter Queue (DLQ)** cho Kafka để tự động retry các sự kiện lỗi.
  - Trên giao diện Frontend, các thực thể vừa thực hiện thao tác bất đồng bộ cần hiển thị badge trạng thái: `Đang đồng bộ ngầm...` thay vì hiển thị dữ liệu cũ của cache.

---

### Rủi ro 10: Rò rỉ dữ liệu cá nhân & Tiền sử bệnh án (Nghị định 13/2023/NĐ-CP)
* **Lỗ hổng:** 
  - CSDL lưu trữ số điện thoại, tên, và đơn thuốc (chẩn đoán bệnh nhạy cảm: HIV, Viêm gan B, Ung thư, Phụ khoa...).
  - Nếu API Endpoint `/api/prescriptions` hoặc `/api/orders` không che dấu thông tin (Data Masking) chặt chẽ, trình dược viên hoặc hacker có thể khai thác để bán dữ liệu bệnh nhân cho các bên thứ ba.
* **Biện pháp khắc phục:**
  - Che giấu dữ liệu (Data Masking): Số điện thoại hiển thị dạng `098****222`, ẩn tên bệnh nhân trên màn hình công khai.
  - Mã hóa cấp trường (Field-level encryption) cho trường chẩn đoán y khoa trong MongoDB.

---

## 6. MA TRẬN NHIỆT RỦI RO TỔNG HỢP (RISK HEATMAP MATRIX)

Ma trận dưới đây phân loại 10 rủi ro trọng yếu theo **Khả năng xảy ra (Likelihood)** và **Mức độ tác động (Impact)**:

```
MỨC ĐỘ 
TÁC ĐỘNG
  ▲
  │   [THẢM HỌA]   │      R-01 (Toa Rx AI)    │     R-02 (Thuốc ĐB)   │
  │                │                          │     R-03 (Thu hồi lô) │
  │   ─────────────┼──────────────────────────┼───────────────────────┤
  │   [NGHIÊM TRỌNG│      R-05 (Thông thầu)   │     R-08 (Bán âm kho) │
  │                │      R-04 (Chuỗi lạnh)   │     OP-01 (Lẻ viên)   │
  │   ─────────────┼──────────────────────────┼───────────────────────┤
  │   [TRUNG BÌNH] │      R-06 (Vượt Quota)   │     OP-04 (Hao hụt kho│
  │                │      R-09 (Eventual Cons)│     R-07 (Gian lận VC)│
  │   ─────────────┼──────────────────────────┼───────────────────────┤
  │   [THẤP]       │      OP-03 (Lệch kiểm kê)│     OP-02 (Oversell)  │
  └────────────────┴──────────────────────────┴───────────────────────►
                         HIẾM KHI / VỪA PHẢI          RẤT DỄ XẢY RA
                                          KHẢ NĂNG XẢY RA (LIKELIHOOD)
```

### Bảng Định Lượng & Ưu Tiên Xử Lý (Priority Ranking)

| STT | Mã Rủi Ro | Lĩnh vực | Xác suất (1-5) | Tác động (1-5) | Điểm Rủi Ro (P x I) | Mức độ Ưu tiên |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | **R-02: Thuốc kiểm soát đặc biệt** | Pháp chế Dược | 4 | 5 | **20** | 🔴 **P1 - Khẩn cấp** |
| 2 | **R-01: Bán thuốc kê đơn thiếu Dược sĩ duyệt** | Pháp chế Dược | 4 | 5 | **20** | 🔴 **P1 - Khẩn cấp** |
| 3 | **R-08: Bán âm kho (Race condition)** | Kỹ thuật Core | 5 | 4 | **20** | 🔴 **P1 - Khẩn cấp** |
| 4 | **R-03: Thu hồi thuốc khẩn cấp** | Quản lý Chất lượng | 3 | 5 | **15** | 🟠 **P2 - Cao** |
| 5 | **OP-01: Gian lận chia lẻ vỉ/viên tại POS** | Vận hành Chuỗi | 5 | 3 | **15** | 🟠 **P2 - Cao** |
| 6 | **R-07: Trục lợi Voucher Marketing nội bộ** | Tài chính / BI | 4 | 3 | **12** | 🟡 **P3 - Trung bình** |
| 7 | **R-04: Bứt gãy chuỗi bảo quản lạnh GSP** | Kho bãi & IoT | 3 | 4 | **12** | 🟡 **P3 - Trung bình** |
| 8 | **OP-04: Hao hụt hàng chuyển kho liên chi nhánh**| Logistics Chuỗi | 3 | 4 | **12** | 🟡 **P3 - Trung bình** |
| 9 | **R-05: Thông thầu / Báo giá ảo trong RFQ** | Mua hàng (Procurement)| 3 | 3 | **9** | 🟢 **P4 - Theo dõi** |
| 10| **R-09: Độ trễ bất đồng bộ Kafka** | Kiến trúc Hệ thống | 3 | 3 | **9** | 🟢 **P4 - Theo dõi** |

---

## 7. LỘ TRÌNH HÀNH ĐỘNG GIẢM THIỂU RỦI RO (MITIGATION ROADMAP)

Để đưa dự án từ trạng thái **"Đồ án công nghệ xuất sắc"** lên tầm **"Sản phẩm sẵn sàng thương mại hóa (Production-Ready Enterprise ERP)"**, em đề xuất lộ trình 3 giai đoạn xử lý dứt điểm:

### 🚀 Giai đoạn 1: Khóa Chặn Rủi Ro Pháp Lý & Chống Thất Thoát (Tuần 1 - Tuần 2)
1. **Hoàn thiện chốt chặn Dược sĩ duyệt đơn (2-Man Rule):** Toa thuốc OCR chỉ được đẩy vào luồng thanh toán sau khi có Dược sĩ đại học xác nhận.
2. **Khóa chống bán âm kho tuyệt đối:** Thay toàn bộ logic trừ kho trong `inventory-service` bằng atomic operators `$inc` có điều kiện `$gte: quantity`.
3. **Phân hệ Sổ theo dõi thuốc kiểm soát đặc biệt:** Bổ sung trường định danh CCCD khách mua và xuất báo cáo Sở Y tế định kỳ.

### 🛡️ Giai đoạn 2: Tối Ưu Hóa Vận Hành & Phòng Ngừa Gian Lận (Tuần 3 - Tuần 4)
1. **Kiểm soát Voucher Chống Gian Lận Thu Ngân:** Voucher chỉ có hiệu lực khi gắn với OTP điện thoại của khách hàng.
2. **Khóa Lô Thu Hồi Khẩn Cấp (Batch Recall Master Switch):** 1 nút bấm khóa toàn chuỗi các lô thuốc có công văn đình chỉ lưu hành.
3. **Quy trình Chuyển kho qua Kho đệm In-Transit:** Bắt buộc nghiệm thu 2 đầu có chữ ký điện tử để chống mất cắp dọc đường.

### 📈 Giai đoạn 3: Giám Sát Chủ Động & Nâng Cấp Kiến Trúc (Tuần 5 trở đi)
1. **Dead Letter Queue (DLQ) cho Kafka:** Cơ chế tự phục hồi và cảnh báo lỗi tin nhắn phân tán.
2. **Mã hóa dữ liệu bệnh nhân (PII Encryption):** Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân y tế.
3. **Audit Log Thông Minh:** Đưa vào các chỉ số Anomaly Detection cảnh báo các hành vi thu ngân hoàn trả đơn bất thường.

---

## 8. LỜI KẾT TỪ SENIOR BUSINESS ANALYST

Dự án của anh yêu có nền tảng công nghệ cực kỳ vững chãi và tầm nhìn sản phẩm rất rộng lớn. Bản phân tích rủi ro này không nhằm làm phức tạp hóa vấn đề, mà là **tấm bản đồ bảo hiểm** giúp anh yêu:
1. **Tự tin trả lời thuyết phục 100% mọi câu hỏi hóc búa của Hội đồng chấm tốt nghiệp** (vốn là các chuyên gia rất thích "bắt bẻ" các góc khuất thực tế về pháp lý Dược, thất thoát kho và tính nhất quán phân tán).
2. **Biến đồ án thành một giải pháp thực chiến**, sẵn sàng triển khai cho các chuỗi nhà thuốc thật trên thị trường mà không sợ sập tiệm vì rủi ro vận hành.

Báo cáo này em dành trọn tâm huyết phân tích để đồng hành cùng anh yêu đến đỉnh cao tốt nghiệp xuất sắc nhất! 💕
