# Kịch bản thuyết trình Review 2 ABC Pharmacy

Nhóm SE_06 · Bám theo bản Canva 51 trang đã đọc ngày 18/10/2026 · 16 phút slide và 5 phút demo

Bản này viết lại theo thứ tự hiện tại trong Canva, gồm các trang Monitoring, chín business workflow và Test Flow mới bổ sung. Mỗi thành viên trình bày một lượt liên tục. Phúc nói từ AI đến hết demo và kết luận; các bạn còn lại chỉ hỗ trợ thao tác. Những đoạn trong ngoặc kép là lời nói để luyện; dòng “Thao tác” và phần cuối tài liệu dành cho nội bộ, không đọc trước hội đồng.

## 1 Phân công và thời lượng

| Người trình bày | Trang Canva | Nội dung | Mốc toàn bài |
|---|---|---|---|
| Nguyễn Văn Nam | 1–16 | Mở đầu, feedback, giới thiệu ngắn, project management | 00:00–05:00 |
| Trần Hồng Phước | 17–21 | Architecture, monitoring, integration và security | 05:00–08:10 |
| Nguyễn Tiến Đạt | 22–46 | ERD, cập nhật yêu cầu, business workflow, testing | 08:10–12:10 |
| Đinh Anh Phúc | 47–49 | AI processing, chatbot và forecast | 12:10–14:40 |
| Đinh Anh Phúc dẫn demo | 50, mở lại 39 và 38 khi giới thiệu workflow, rồi website | Mua, nhập, sơ đồ kho, nhận chi nhánh, chatbot, OCR, POS | 14:40–19:40 |
| Đinh Anh Phúc | 51 | Phase 2 Assessment và kế hoạch giai đoạn 3 | 19:40–21:00 |

Tổng lời nói trên slide: 16 phút. Demo: 5 phút. Toàn bài: 21 phút, chưa gồm hỏi đáp. Thời gian dưới đây là mốc để diễn tập, không phải kết quả đã đo khi nhóm trình bày thật.

Trong demo: Nam hỗ trợ forecast/RFQ/PO; Đạt hỗ trợ GRN, sơ đồ kho và nhận chi nhánh; Phước hỗ trợ OCR/POS; Phúc điều khiển chatbot và giữ lời dẫn. Người hỗ trợ không giới thiệu tên lại hoặc nhận một lượt thuyết trình mới.

## 2 Nam trình bày trang 1 đến 16

### Trang 1 Cover từ 00:00 đến 00:25

“Kính chào thầy cô trong hội đồng. Em tên là Nguyễn Văn Nam. Trong dự án, em tham gia phát triển chức năng mua hàng, yêu cầu báo giá và dự báo nhu cầu. Sau đây, em xin đại diện nhóm SE_06 trình bày báo cáo Review 2 của đề tài ABC Pharmacy — The AI-Integrated Pharmacy Chain Management System.

Ở lần review này, nhóm tập trung vào những cập nhật sau Review 1, kiến trúc, AI và kết quả thể hiện trên sản phẩm.”

### Trang 2 Our Team từ 00:25 đến 00:35

“Nhóm hiện có bốn thành viên như trên màn hình. Sau thay đổi nhân sự, nhóm đã chia lại trách nhiệm và giữ nguyên phạm vi dự án. Các thành viên sẽ lần lượt trình bày phần nội dung mình đại diện.”

Thao tác: lướt trang; không đọc lại đầy đủ tên và tất cả vai trò. Bảng phân công chi tiết nằm ở trang 11.

### Trang 3 Review 1 Feedback and Resolution từ 00:35 đến 01:35

“Trước tiên, nhóm xin báo cáo việc xử lý các góp ý của Review 1. Bảng này phân biệt phần đã triển khai và phần còn phải hoàn thiện.

Với kho, nhóm đã bổ sung thông tin lô, hạn dùng và lựa chọn lô theo thời điểm hết hạn. Phần còn mở là kiểm tra loại trừ lô đã hết hạn ở mọi luồng xuất và tính nhất quán của tồn kho.

Với nhà cung cấp và hóa đơn, nhóm đã bổ sung hồ sơ chứng nhận, cảnh báo hạn và thông tin phân bổ lô. Nhóm cần tiếp tục kiểm soát điều kiện nhà cung cấp trong quá trình duyệt mua, đồng thời bảo đảm dữ liệu lô trên hóa đơn lấy từ giao dịch thực tế.

Với AI và trải nghiệm khách hàng, nhóm đã có lịch sử tư vấn, nhắc nhở và giao diện theo dõi đơn. Những điểm còn cần kiểm tra là kết quả OCR, xác nhận của dược sĩ và dữ liệu theo dõi giao hàng.

Các hạng mục còn mở sẽ được nhóm tiếp tục xử lý trong giai đoạn 3.”

Thao tác: chỉ theo ba cụm trên bảng, không đọc từng ô. Không nói “đã fix toàn bộ comment”.

### Trang 4 Agenda từ 01:35 đến 01:50

“Buổi trình bày gồm tám phần như mục lục. Vì giới thiệu và yêu cầu đã được báo cáo ở Review 1, nhóm chỉ nhắc ngắn bối cảnh và các cập nhật; trọng tâm hôm nay là kiến trúc, kiểm thử, AI, demo và đánh giá giai đoạn 2.”

### Trang 5 đến 7 Giới thiệu ngắn từ 01:50 đến 02:20

Trang 5 — Why do we need our system:

“Bài toán nhóm tập trung là kết nối mua hàng, tồn theo lô và bán hàng giữa kho tổng với các chi nhánh, đồng thời hỗ trợ dược sĩ ở bước tiếp nhận thông tin.”

Trang 6 — Existing System:

“Nhóm tham khảo các giải pháp như MISA eShop, Sapo và KiotViet để đối chiếu chức năng bán hàng, tồn kho và vận hành chuỗi.”

Trang 7 — Our Solution:

“Với ABC Pharmacy, nhóm tích hợp các bước nghiệp vụ đó với OCR, hỗ trợ tra cứu tương tác và đề xuất bổ sung hàng. Phần tiếp theo sẽ làm rõ cách triển khai và những giới hạn hiện tại.”

Thao tác: mỗi trang khoảng 10 giây. Không tuyên bố các sản phẩm đối chiếu không có AI hoặc không có FEFO khi slide chưa cung cấp bằng chứng.

### Trang 8 và 9 Project Objectives từ 02:20 đến 02:45

“Tiếp theo là phần quản lý dự án. Trong giai đoạn 2, nhóm có bốn mục tiêu: triển khai các luồng mua, kho và bán; xử lý góp ý Review 1; đồng bộ công việc giữa Jira, mã nguồn và báo cáo; cuối cùng là kiểm tra các luồng quan trọng bằng kết quả cụ thể.

Nhóm theo dõi cả chức năng đã lập trình và trạng thái tích hợp, kiểm thử của chức năng đó.”

Thao tác: chuyển nhanh trang 8; dừng ở bốn ô mục tiêu trang 9.

### Trang 10 Project Timeline and Resources từ 02:45 đến 03:15

“Timeline được chia thành ba giai đoạn. Giai đoạn 1 xác định phạm vi và thiết kế ban đầu. Giai đoạn 2 tập trung xây dựng, tích hợp và kiểm tra các luồng chính. Giai đoạn 3 dành cho xử lý phần còn thiếu, kiểm thử hồi quy và chuẩn bị bàn giao.

Nguồn lực hiện tại là bốn thành viên, làm việc trên web, mobile và backend. Nhóm dùng Jira để theo dõi đầu việc, GitHub để quản lý mã nguồn, và website đã triển khai để kiểm tra tích hợp.”

Thao tác: chỉ Phase 2, rồi hàng Resources. Trang hiện còn “Dates: [from Jira]”; phải điền ngày thực tế trước buổi nói, không tự đọc ngày ước đoán.

### Trang 11 Roles and Responsibilities từ 03:15 đến 03:40

“Sau khi phân chia lại, Phước tập trung kiến trúc, hạ tầng và POS; Đạt tập trung kho, tồn và vị trí lưu trữ; em phụ trách nhóm mua hàng, RFQ và phân tích nhu cầu; Phúc tập trung chatbot, RAG và chất lượng AI.

Phần tích hợp, review code, kiểm thử và tài liệu được các thành viên phối hợp thực hiện. Đây cũng là cách nhóm giữ nguyên phạm vi khi chỉ còn bốn người.”

### Trang 12 Software Development Model Scrum từ 03:40 đến 04:25

“Nhóm tổ chức công việc theo Scrum. Product Backlog là danh sách công việc của sản phẩm được sắp xếp ưu tiên. Trong Sprint Planning, nhóm thống nhất mục tiêu sprint và chọn các đầu việc có thể hoàn thành; những đầu việc và kế hoạch thực hiện tạo thành Sprint Backlog.

Trong sprint, các thành viên cập nhật tiến độ, việc tiếp theo và vướng mắc ở Daily Stand-up, đồng thời thực hiện lập trình, tích hợp và kiểm thử.

Cuối sprint, Sprint Review dùng để xem kết quả sản phẩm và nhận phản hồi. Sprint Retrospective tập trung vào cách làm việc của nhóm, từ đó chọn thay đổi cho sprint tiếp theo. Phản hồi của các bước này được đưa lại vào kế hoạch.”

Thao tác: đi theo chiều mũi tên. Không dùng Review và Retrospective thay thế cho nhau; không tự khẳng định thời lượng sprint hay tần suất họp khi chưa chốt.

### Trang 13 Scrum Practices in Our Project từ 04:25 đến 04:45

“Khi áp dụng vào dự án, mỗi hoạt động cần gắn với một bản ghi cụ thể: backlog trên Jira, mục tiêu và phạm vi sprint, các vướng mắc cần xử lý, ghi chú demo và phản hồi.

Nhóm cần tiếp tục đồng bộ các bản ghi này để trạng thái trên công cụ phản ánh đúng phần đã hoàn thành và đã được kiểm tra.”

### Trang 14 đến 16 Evidence và bàn giao từ 04:45 đến 05:00

“Đây là các ảnh minh họa backlog, quản lý mã nguồn và tài liệu của nhóm. Em xin chuyển sang cách hệ thống được tổ chức để triển khai các nghiệp vụ đó.

Em xin kết thúc phần trình bày của mình, mời bạn Trần Hồng Phước tiếp tục.”

Thao tác: lướt ba trang, không đọc issue hoặc từng hàng trong bảng tính.

## 3 Phước trình bày trang 17 đến 21

### Trang 17 Mở phần Architecture từ 05:00 đến 05:15

“Em tên là Trần Hồng Phước. Trong dự án, em tham gia phụ trách kiến trúc, hạ tầng triển khai và chức năng bán hàng tại quầy. Sau đây, em xin đại diện nhóm trình bày kiến trúc hệ thống và cách theo dõi vận hành.”

### Trang 18 Architecture từ 05:15 đến 06:45

“Sơ đồ này thể hiện hệ thống từ phía người dùng đến các dịch vụ và nơi lưu dữ liệu. Người dùng truy cập qua web React, ứng dụng mobile Expo hoặc giao diện POS. Các yêu cầu từ client đi qua Cloudflare và Nginx trước khi đến API Gateway.

Gateway là điểm tiếp nhận và định tuyến API. Tại đây, hệ thống xử lý xác thực và kiểm tra quyền theo chức năng. Phía sau, các dịch vụ được tách theo nghiệp vụ như tài khoản, người dùng, tồn kho, mua hàng và đơn hàng.

Kafka hỗ trợ trao đổi thông điệp giữa các dịch vụ nội bộ. Redis hỗ trợ cache và một số cơ chế kiểm soát truy cập. MongoDB lưu dữ liệu nghiệp vụ; Qdrant phục vụ tìm kiếm vector cho RAG. AI service được tách riêng bằng Python FastAPI để xử lý các tác vụ AI.

Về triển khai, các thành phần nội bộ chạy trong môi trường Docker trên cloud VPS. Sơ đồ còn thể hiện các dịch vụ bên ngoài cho lưu trữ và phân phối, cùng GitHub Actions và kho container để hỗ trợ triển khai.

Điểm nhóm muốn làm rõ là việc tách nghiệp vụ và xử lý AI thành các thành phần riêng. Cách tổ chức này cũng đòi hỏi nhóm kiểm tra kỹ kết nối và dữ liệu khi một luồng đi qua nhiều dịch vụ.”

Thao tác: chỉ bốn cụm Client → Gateway → Services → Data, rồi hạ tầng. Không đọc hết tên cổng, dung lượng RAM hoặc tất cả logo. Không mô tả sơ đồ như bằng chứng đã đạt khả năng chịu tải hay độ sẵn sàng cụ thể.

### Trang 19 và 20 Monitoring từ 06:45 đến 07:30

“Để theo dõi hệ thống sau triển khai, nhóm sử dụng log container và dashboard giám sát như hai trang này.

Log giúp xác định dịch vụ phát sinh lỗi và kiểm tra diễn biến xử lý tại thời điểm xảy ra sự cố. Dashboard giúp quan sát lưu lượng, mã trạng thái HTTP và độ trễ theo khoảng thời gian được chọn.

Khi gặp một yêu cầu chậm hoặc lỗi, nhóm bắt đầu từ endpoint và thời điểm trên dashboard rồi đối chiếu log dịch vụ liên quan. Các con số trong ảnh là số liệu tại thời điểm chụp; nhóm không dùng chúng để kết luận hiệu năng chung hoặc khả năng chịu tải của toàn hệ thống.”

Thao tác: trang 19 chỉ log và dashboard; trang 20 chỉ nhóm HTTP status và latency. Ảnh có Average, p95, p99; không cần đọc cả ba số. Không gọi các chỉ số dashboard là kết quả kiểm thử tải hoặc SLA đã nghiệm thu.

### Trang 21 Pipeline và Security từ 07:30 đến 08:10

“Ở mức luồng xử lý, client gửi yêu cầu đến Gateway, yêu cầu được chuyển đến dịch vụ phù hợp, sau đó cập nhật dữ liệu và trả kết quả hoặc thông báo cho giao diện.

Với phần AI, Gateway gọi FastAPI qua HTTP; không phải mọi lời gọi AI đều đi qua Kafka. Các API đơn hàng hoặc kiểm kê thuộc nghiệp vụ tương ứng, không phải đều là endpoint của FastAPI.

Về bảo mật, nhóm tổ chức xác thực bằng JWT, phân quyền theo vai trò và phạm vi chi nhánh, đồng thời ghi log cho những thao tác cần truy vết. Mức độ bao phủ phải tiếp tục được đối chiếu bằng các ca kiểm thử quyền.

Em xin kết thúc phần trình bày của mình, mời bạn Nguyễn Tiến Đạt tiếp tục.”

Thao tác: đi theo hàng mũi tên rồi chỉ khung Security. Tiêu đề “API FastAPI” trên slide đang gom cả endpoint nghiệp vụ; xem các chỉnh sửa tối thiểu ở cuối tài liệu.

## 4 Đạt trình bày trang 22 đến 46

### Trang 22 và 23 Requirement và ERD từ 08:10 đến 08:50

“Em tên là Nguyễn Tiến Đạt. Trong dự án, em tham gia phát triển nghiệp vụ kho, vị trí lưu trữ và phối hợp kiểm thử. Sau đây, em xin đại diện nhóm trình bày phần dữ liệu, cập nhật yêu cầu và kết quả kiểm thử.

Trên ERD, nhóm xin tập trung ba cụm. Cụm người dùng và chi nhánh xác định người thao tác và phạm vi dữ liệu. Cụm mua và nhận hàng liên kết nhà cung cấp, đơn mua và phiếu nhập. Cụm bán hàng liên kết đơn bán, từng dòng hàng và lô được phân bổ.

Các liên kết này giúp theo dõi cùng mặt hàng từ lúc nhập đến lúc xuất bán, thay vì chỉ lưu một con số tồn tổng.”

Thao tác: chuyển nhanh trang 22. Ở trang 23, chỉ User/Branch → Purchase Order/Goods Receipt → Sales Order/Batch. Không đọc từng thực thể hoặc coi ERD là bằng chứng mọi ràng buộc đã được thực thi.

### Trang 24 đến 34 Cập nhật yêu cầu từ 08:50 đến 09:55

Thao tác: mở các trang theo thứ tự. Trang 24–25 khoảng 10 giây; trang 26–34 khoảng 55 giây. Chỉ nói câu tương ứng bên dưới, không đọc lại toàn bộ use case.

Trang 24–25 — Account và Catalog:

“Phần tài khoản và danh mục là dữ liệu nền đã được trình bày trước. Ở Review 2, nhóm tập trung các điểm giao giữa nghiệp vụ.”

Trang 26 — POS:

“Tại POS, điểm cần kiểm soát là kết quả OCR được dược sĩ xem lại trước khi dùng cho giao dịch.”

Trang 27 — Online Ordering:

“Kênh online tách bước khách đặt hàng với bước nhân viên xử lý và giao nhận.”

Trang 28 — AI Assistant:

“Với AI, yêu cầu bao gồm đầu vào, kết quả tư vấn và lịch sử để có thể kiểm tra lại.”

Trang 29 — Warehouse:

“Với kho, nhóm bổ sung quản lý vị trí, lô, hạn dùng và đối chiếu tồn.”

Trang 30 — Purchasing:

“Với mua hàng, nhóm liên kết RFQ, lựa chọn báo giá, PO và kiểm nhận.”

Trang 31 — Multi-branch:

“Khi cấp hàng, chi nhánh có bước xác nhận nhận hàng riêng.”

Trang 32 — Forecast:

“Forecast tạo đề xuất để quản lý xem xét; đầu vào cần đối chiếu là lịch sử bán hàng.”

Trang 33–34 — Marketing và Finance:

“Marketing và tài chính tiếp tục nằm trong phạm vi; nhóm lướt hai phần này để tập trung vào luồng tích hợp.”

### Trang 35 đến 37 Các workflow nền từ 09:55 đến 10:05

“Các sơ đồ tiếp theo làm rõ vai trò và điểm bàn giao. Phần thiết lập chi nhánh, tiếp nhận nhân sự và quản lý ca là bối cảnh vận hành; nhóm xin lướt nhanh.”

Thao tác: trang 35 là Branch Setup and Activation; 36 là Staff Recruitment; 37 là Shift Management and Handover. Không gọi các trang này là sequence diagram hoặc kết quả test.

### Trang 38 và 39 POS và Procurement từ 10:05 đến 10:35

Trang 38 — Bán thuốc tại quầy POS:

“Luồng bán tại quầy bắt đầu từ nhu cầu khách hàng, kiểm tra thông tin, chọn thuốc và lô, rồi thanh toán và ghi nhận giao dịch. Các điểm cần dừng là dược sĩ kiểm tra và dữ liệu được xuất khỏi kho.”

Trang 39 — Mua hàng và nhập kho:

“Ở chiều bổ sung hàng, quản lý xem yêu cầu, chọn nguồn cấp và thực hiện mua hoặc chuyển hàng phù hợp. Với hàng mua mới, phải qua kiểm nhận trước khi ghi nhận nhập. Hai sơ đồ này sẽ là cơ sở cho phần demo.”

Thao tác: chỉ một đường chính trong từng sơ đồ, không đọc mọi nhánh. Không nói mọi thiếu hàng đều bắt buộc mua ngoài hoặc hệ thống tự quyết định nguồn cấp.

### Trang 40 và 41 Khách hàng và IoT từ 10:35 đến 10:45

“Trang 40 mô tả đăng ký khách hàng tại POS; trang 41 mô tả cấu hình thiết bị cảm biến nhiệt độ. Đây là các nhánh hỗ trợ, nhóm giữ lại để đối chiếu khi cần.”

Thao tác: chỉ lướt hai trang. Không thực hiện đăng ký khách hoặc cấu hình Wi-Fi trong lượt trình bày.

### Trang 42 và 43 Kiểm kê và xử lý hạn dùng từ 10:45 đến 11:15

“Ở kiểm kê, nhóm phân biệt tồn hệ thống với số thực đếm, xác định chênh lệch và thực hiện bước xác nhận trước khi điều chỉnh.

Với hàng cận hạn hoặc hết hạn, luồng phải xác định đúng lô cần xử lý, bước phê duyệt và chứng từ liên quan. Đây là các điểm quan trọng từ góp ý Review 1. Việc có sơ đồ giúp làm rõ yêu cầu; kết quả triển khai vẫn phải được kiểm tra bằng dữ liệu và giao dịch thực tế.”

Thao tác: trang 42 Inventory Stocktaking; trang 43 Near-Expiry and Expired Drug Management. Chỉ actualStock/difference và bước xử lý lô. Không tuyên bố nghiệp vụ hủy đã đạt chỉ vì có bản vẽ.

### Trang 44 và 45 Test Flow từ 11:15 đến 11:40

“Tiếp theo là kiểm thử. Nhóm xác định test case và chạy theo điều kiện đầu vào. Nếu phát hiện lỗi, tester ghi nhận để developer xử lý. Khi sửa xong và chuyển sang Ready to Test, tester phải kiểm tra lại trước khi đóng lỗi.

Điểm nhóm cần bảo đảm là trạng thái Passed gắn với kết quả chạy thực tế; việc developer đã sửa code chưa đồng nghĩa test case đã đạt.”

Thao tác: lướt trang 44; ở trang 45 đi theo Tester → Log bug → Fix bug → Verify bug. Nếu kiểm tra lại chưa đạt, giữ/reopen lỗi thay vì đóng.

### Trang 46 Software Testing từ 11:40 đến 12:10

“Theo bảng tổng hợp đang trình bày, phạm vi có 360 test case: 295 passed, 2 failed và 63 pending. Như vậy, đã thực thi 297 trên 360 ca, tương ứng 82,50%; số ca passed trên toàn bộ kế hoạch là 81,94%.

Hai ca lỗi và các ca còn chờ là phần nhóm cần xử lý tiếp. Các tỷ lệ này phản ánh tiến độ và kết quả test case trong báo cáo, không phải code coverage.

Em xin kết thúc phần trình bày của mình, mời bạn Đinh Anh Phúc tiếp tục.”

Ghi chú nội bộ: 295/297 = 99,33% là pass rate trong số ca đã thực thi. Không cần đọc thêm tỷ lệ này trong 30 giây nếu dễ gây nhầm. Trước buổi nói, Đạt phải xác nhận bảng còn đúng với test round/build được chọn; đây là số trên slide đã đọc, không phải số vừa chạy lại.

## 5 Phúc trình bày trang 47 đến 49

### Trang 47 Mở phần AI từ 12:10 đến 12:25

“Em tên là Đinh Anh Phúc. Trong dự án, em tham gia phát triển chatbot, RAG và phối hợp kiểm tra các chức năng AI. Sau đây, em xin đại diện nhóm trình bày cách tích hợp AI, tiếp tục dẫn demo và đánh giá giai đoạn 2.”

### Trang 48 AI Service Package từ 12:25 đến 12:50

“Ở mức thành phần, AI service gồm các phần nhận dạng giọng nói, truy xuất kiến thức, tạo phản hồi, OCR và forecast.

FastAPI tiếp nhận yêu cầu và gọi phần xử lý phù hợp. Các thành phần đó kết nối mô hình bên ngoài, Qdrant hoặc dữ liệu nghiệp vụ tùy tác vụ. Sơ đồ này thể hiện cách tổ chức; trang tiếp theo sẽ làm rõ đầu vào và bước kiểm tra của từng luồng.”

Thao tác: chỉ ba vùng Router, Processing Core và Models/Data. Không đọc hết phiên bản model hoặc diễn giải tất cả luồng đều dùng cùng một chuỗi mô hình.

### Trang 49 Prescription OCR từ 12:50 đến 13:20

“Với OCR, đầu vào là ảnh đơn thuốc bản in. Hệ thống trích xuất các trường, chuẩn hóa và đối chiếu tên thuốc với danh mục. Bước đối chiếu cần thiết vì văn bản đọc ra có thể chưa trùng tên mặt hàng trong kho.

Kết quả được đưa cho dược sĩ kiểm tra và điều chỉnh trước khi sử dụng. Mục tiêu là giảm nhập liệu; phần quyết định chuyên môn vẫn thuộc người có trách nhiệm kiểm tra.”

### Trang 49 Voice Chatbot và RAG từ 13:20 đến 13:55

“Với voice, âm thanh được chuyển thành văn bản rồi dùng để truy xuất thông tin liên quan. Cohere hỗ trợ tạo embedding, Qdrant hỗ trợ tìm nội dung theo ngữ nghĩa, sau đó mô hình tạo gợi ý với ngữ cảnh đã lấy được.

Chatbot là một giao diện ở kênh khách hàng, nhận câu hỏi bằng chữ cùng lịch sử gần đây. Trong phần demo, nhóm sẽ minh họa tìm sản phẩm và xem các thẻ kết quả.

RAG hỗ trợ phản hồi có thêm ngữ cảnh; nhóm vẫn cần kiểm tra tính đúng đắn và cách ghi nhận xác nhận của người dùng.”

Thao tác: hàng thứ hai của hình là Voice Consultation; nói chatbot là giao diện liên quan, không chỉ vào hình rồi nói hình đã vẽ đầy đủ nhánh chatbot.

### Trang 49 Demand Forecasting từ 13:55 đến 14:40

“Luồng forecast dùng lịch sử bán hàng theo tháng của từng thuốc. Dữ liệu được tổng hợp thành chuỗi; sơ đồ thiết kế thể hiện dự báo ba tháng tiếp theo bằng LSTM và có nhánh fallback.

Kết quả dự báo được kết hợp với tồn hiện tại, hàng đang về và các ngưỡng tồn để đề xuất lượng cần bổ sung. Vì vậy, nhu cầu dự báo và lượng cần đặt không phải cùng một con số. Người quản lý xem xét trước khi chuyển sang mua hàng.

Nhóm chưa công bố tỷ lệ chính xác forecast khi chưa có đánh giá phù hợp. Phần ánh xạ đầu vào và xác nhận các luồng AI vẫn cần tiếp tục kiểm tra.

Sau đây, em xin dẫn phần demo theo business workflow; các bạn hỗ trợ thao tác theo module phụ trách.”

## 6 Phúc dẫn demo trong 5 phút

### Trang 50 và workflow từ 14:40 đến 15:00

“Nhóm xin đi theo luồng từ bổ sung hàng, mua và kiểm nhận, lưu kho theo lô, cấp chi nhánh, đến bán tại quầy và đối chiếu. Chatbot minh họa nhánh khách hàng song song. Các bước nền đã trình bày trước nhóm sẽ lướt nhanh; chứng từ dùng demo đã được chuẩn bị và giữ nguyên mã để theo dõi.”

Thao tác: trang 50 → mở lại trang 39 Procurement và trang 38 POS để chỉ đường đi → chuyển website. Không demo ngay từ dashboard khi chưa giới thiệu workflow.

### Forecast RFQ và PO từ 15:00 đến 15:40

“Đầu tiên, quản lý xem đề xuất cùng tồn và hàng đang về để cân nhắc bổ sung. Với SKU DEMO mới, nhóm chưa có lịch sử bán để đánh giá forecast, nên phần này chỉ giới thiệu cách xem đề xuất.

Sau đó, nhóm mở RFQ đã chuẩn bị. Có hai báo giá thử nghiệm; báo giá rẻ hơn có hạn dùng còn lại ngắn hơn ngưỡng yêu cầu. Nhóm đã chọn nhà cung cấp A và PO liên kết được sinh từ lựa chọn đó.”

Thao tác của Nam: mở forecast sẵn có, rồi RFQ-20261017-0008 và PO-RFQ-20261017-0008. Không nói RFQ này vừa được tạo từ forecast. PO đã COMPLETED, không nói đang chờ duyệt.

### GRN từ 15:40 đến 16:10

“Tiếp theo là kiểm nhận. Hai phiếu này thuộc cùng PO, đã hoàn tất trước buổi demo. Vitamin C được nhập 30 hộp ở lô gần hạn và 80 hộp ở lô xa hạn. Nhóm đối chiếu số thực nhận, lô và hạn dùng trước khi ghi nhận nhập kho.”

Thao tác của Đạt: mở hai GRN đã chuẩn bị, chỉ actualQty, VERIFIED và COMPLETED. Không duyệt lại phiếu đã hoàn tất hoặc gọi số kiểm đếm thủ công là kết quả AI.

### Sơ đồ kho từ 16:10 đến 16:40

“Sau nhập, hàng được theo dõi theo khu, kệ, tầng và ô. Tại RES4, tầng 1, ô 10, Vitamin C DEMO còn 85 hộp ở kho tổng: 5 hộp gần hạn và 80 hộp xa hạn. Hai ô bên cạnh có bông sắp hết và khẩu trang còn đủ tồn, giúp nhân viên nhận biết vị trí và tình trạng hàng.”

Thao tác của Đạt: /warehouse/inventory/map → Khu Dự Trữ → sổ kệ → RES4 → Tầng 1 → ô B10 → 2 Lô. B8: khẩu trang 60; B9: bông 8. Đọc lại số trên màn hình nếu đã có diễn tập trước đó.

### Nhận chi nhánh từ 16:40 đến 17:05

“Chi nhánh BR-001 đã có 20 hộp từ phiếu trước. Phiếu này đang chuyển thêm 5 hộp; nhóm xác nhận số thực nhận rồi kiểm tra trạng thái và tồn chi nhánh.”

Sau khi thấy kết quả đạt mới nói:

“Phiếu đã chuyển sang trạng thái nhận hoàn tất; tồn chi nhánh tăng từ 20 lên 25 hộp.”

Thao tác của Đạt: ST-20261017-0002, thực nhận 5. Nếu phiếu đã DELIVERED từ lần diễn tập, chỉ mở kết quả và dùng số hiện tại, không thực hiện lại. Không đọc câu kết quả nếu giao dịch chưa thành công.

### Chatbot từ 17:05 đến 17:45

“Ở kênh khách hàng, em nhập nhu cầu tìm sản phẩm bổ sung vitamin C. Chatbot trả các thẻ sản phẩm để xem tên, giá và tình trạng còn hàng. Đây là nhánh tìm hiểu sản phẩm; giỏ chatbot và giỏ bán tại quầy là hai ngữ cảnh riêng.”

Khi có phản hồi, đọc một thẻ đang hiển thị:

“Em đối chiếu một sản phẩm trong kết quả với danh mục để kiểm tra giá và tình trạng hàng.”

Thao tác của Phúc: /customer/shop → Bồ Câu → phiên DEMO riêng → câu hỏi trong chatbot-prompts.txt. Đã thử trước có UPSA-C, Enervon và Ceelin; không bảo đảm mỗi lần trả đúng ba sản phẩm này. Không thêm sản phẩm thật vào giỏ hoặc mở thanh toán.

### OCR từ 17:45 đến 18:20

“Tại quầy, OCR hỗ trợ trích xuất từ ảnh đầu vào. Dược sĩ cần kiểm tra tên, số lượng và kết quả khớp danh mục trước khi áp dụng. Em xin chỉ một trường trích xuất và một kết quả đối chiếu.”

Thao tác của Phước: dùng ảnh OCR nhóm đã diễn tập, chỉ kết quả thực tế. Nếu ảnh không khớp SKU DEMO, giới thiệu đây là ví dụ nhận dạng riêng rồi chuyển sang bán lẻ DEMO, không áp dụng thuốc khớp sai. Ảnh OCR_DEMO_R2.png trong gói chuẩn bị chưa được xác nhận chạy OCR live.

### POS từ 18:20 đến 19:20

“Với giao dịch bán thử, nhóm chọn đúng sản phẩm DEMO, đơn vị Hộp và số lượng 2. Giá hàng trước giảm giá, thuế hoặc phí là 50.000 đồng; tổng cuối cùng cần đối chiếu với kết quả hệ thống.

Sau khi ghi nhận thành công, nhóm mở chi tiết giao dịch để kiểm tra mã bán, lô xuất và tồn sau bán.”

Chỉ khi kết quả thực tế đúng mới nói:

“Với tồn trước bán là 25 hộp, sau khi bán 2 hộp, tồn còn 23 hộp. Nhóm đối chiếu số lượng xuất với chính giao dịch vừa ghi nhận.”

Thao tác của Phước: BR-001, ca bán hợp lệ, DEMO-R2-VITC, 2 Hộp, exchangeValue 1. Nếu chưa nhận thêm 5 thì đối chiếu 20 → 18. Hoàn tất bằng cơ chế giao dịch thử nhóm đã xác nhận; không chuyển tiền thật. Nếu chưa thể hoàn tất trong lượt diễn tập, chỉ trình bày đến bước kiểm tra đơn và không gọi đó là giao dịch đã bán.

### Đối chiếu từ 19:20 đến 19:40

“Cuối cùng, nhóm đối chiếu mã giao dịch, lô và tồn trước sau. Như vậy, demo đã đi qua mua, kiểm nhận, vị trí kho, nhận chi nhánh và bán tại quầy; chatbot minh họa nhánh khách hàng. Em xin tiếp tục với phần đánh giá giai đoạn 2.”

Thao tác: mở giao dịch thật hoặc hồ sơ chuẩn bị có nhãn rõ, rồi chuyển về Canva trang 51. Không đổi người nói.

## 7 Phúc trình bày trang 51 và kết thúc

### Phase 2 Assessment từ 19:40 đến 20:20

“Qua giai đoạn 2, nhóm đã tích hợp các phần chính của POS, kho, mua hàng và chi nhánh, cùng các chức năng AI vừa trình bày. Những nội dung còn mở tập trung vào tính nhất quán dữ liệu, truy vết, kiểm soát quyền và xác nhận kết quả AI.

Trong giai đoạn này, nhóm có thay đổi nhân sự và còn bốn thành viên. Nhóm đã chia lại việc, giữ nguyên phạm vi và ưu tiên các phụ thuộc giữa những module chính. Nhóm cần tiếp tục theo dõi cả trạng thái tích hợp và nghiệm thu, không chỉ số đầu việc đã lập trình.”

Nếu có số nghiệm thu đã chốt, thay câu đầu bằng: “Đến ngày [ngày chốt], nhóm đã nghiệm thu [X] trên [Y] tính năng trong phạm vi đã thống nhất.” Không tự điền X/Y hoặc dùng số test case thay số tính năng.

### Phase 3 Plan và kết thúc từ 20:20 đến 21:00

“Trong giai đoạn 3, nhóm ưu tiên hoàn thiện các luồng chính và kiểm thử hồi quy: kiểm soát lô, hạn dùng và hóa đơn; các ca phân quyền; xác nhận kết quả AI; và đánh giá forecast bằng dữ liệu phù hợp. Nhóm cũng tiếp tục hoàn thiện mobile theo phạm vi đã thống nhất.

Các hướng như kết nối API nhà cung cấp, mở rộng thanh toán hoặc cơ sở dữ liệu dược quốc gia được nhóm xem là hướng phát triển; cần chốt phụ thuộc và phạm vi trước khi cam kết thời điểm hoàn thành.

Em xin kết thúc phần trình bày của mình và cũng là phần trình bày của nhóm SE_06. Nhóm chúng em cảm ơn thầy cô đã lắng nghe và xin tiếp nhận câu hỏi của hội đồng.”

## 8 Những chỗ cần sửa tối thiểu trên Canva trước khi nói

Các mục này là ghi chú biên tập sau khi đọc slide; chưa chỉnh trực tiếp Canva.

| Trang | Nội dung đang thấy | Hướng sửa |
|---|---|---|
| 2 | Còn chữ Borcelle, www.reallygreatsite.com; Nguyễn tiến Đạt viết chưa thống nhất | Xóa chữ mẫu; thay website dự án; viết Nguyễn Tiến Đạt |
| 4 | Agenda liệt kê Requirement trước Architecture nhưng nội dung hiện 17–21 Architecture, 22–43 Requirement | Đổi thứ tự hai mục trên agenda theo bản hiện tại nếu giữ kịch bản này; nếu chuyển trang trong deck thì cập nhật lại số trang kịch bản |
| 10 | Dates: [from Jira] ở ba phase | Điền ngày từ timeline đã chốt, đồng bộ Jira và Report 2 |
| 11 | Proposed ownership for the current four-member team | Sau khi nhóm xác nhận, bỏ Proposed để phản ánh phân công chính thức |
| 13 | Evidence to attach là bảng gợi ý minh chứng | Thay bằng minh chứng/tên bản ghi thực tế hoặc ghi rõ đây là quy ước nhóm áp dụng; không nói bảng này tự chứng minh các cuộc họp đã diễn ra |
| 16 | Chủ yếu biểu tượng và hình minh họa, chưa nêu rõ quy tắc quản lý tài liệu | Thêm vị trí tài liệu, người cập nhật và cách kiểm soát phiên bản; phần nói hiện lướt trang này |
| 21 | API FastAPI đang gom đơn hàng, kiểm kê, forecast cùng endpoint AI; còn dòng tiếng Việt và câu Gateway khó hiểu | Đổi thành API Integration; phân biệt Gateway business APIs với FastAPI AI endpoints; sửa câu thành Client HTTP traffic enters through the API Gateway. Business services communicate through Kafka; AI calls use HTTP where implemented. |
| 23 | ERD đang ở phần Requirement | Kịch bản giữ nguyên vị trí để không nhảy trang; có thể chuyển sát Architecture nếu nhóm muốn chỉnh cấu trúc rồi cập nhật lại phân công |
| 24–34 | 11 trang use case rất dễ kéo dài Review 1 | Chỉ dùng lời cập nhật ngắn như kịch bản, giữ phần chi tiết cho hỏi đáp |
| 32 | Forecast based on seasonality and disease trends | Chỉ giữ những đầu vào có dữ liệu và code chứng minh; nếu đang dùng lịch sử bán thì sửa thành Forecast demand using monthly sales history |
| 35–43 | Trang chỉ có số 1–9 và sơ đồ tiếng Việt | Thay số lớn bằng tên quy trình tiếng Anh; ưu tiên 38, 39, 42, 43 trong lời nói; các trang nền chỉ lướt |
| 46 | Test coverage 82,50%; Test successful coverage 81,94% | Đổi thành Test execution rate và Passed / planned test cases; thêm test round, build, môi trường và ngày chốt. Bảng hiện có 295 passed, 2 failed, 63 pending / 360 |
| 47 | AI pipepline | Sửa thành AI Pipeline |
| 49 | Hình có OCR, Voice, Forecast nhưng chưa vẽ nhánh chat chữ | Có thể thêm Text question + recent history vào trước nhánh xử lý RAG; không trình bày chatbot như bước bắt buộc sau voice |
| 51 | Conclusion, Achievements và Future Development | Đổi thành Phase 2 Assessment; chia Achievements, Remaining Work, Phase 3 Plan. Tách cam kết giai đoạn 3 khỏi hướng phát triển chưa chốt |

Giữ số slide hiện tại để luyện nói. Nếu cần rút số trang, có thể đưa use case ít thay đổi và workflow nền vào appendix; việc đó chưa thực hiện trong Canva.

## 9 Phiếu thao tác và phương án dự phòng

Đây là phần nội bộ, không đọc trong lời thuyết trình.

| Mục | Dữ liệu hoặc điều kiện |
|---|---|
| SKU chính | DEMO-R2-VITC, medicineId 6ad3e406b3263f345aea9a97, 25.000đ/Hộp, exchangeValue 1 |
| RFQ và PO | RFQ-20261017-0008 → PO-RFQ-20261017-0008; RFQ AWARDED, PO COMPLETED |
| GRN | 6ad3e593b3263f345aea9d1c và 6ad3e596b3263f345aea9d83, cùng PO, đã COMPLETED |
| Kho tổng | RESERVE/RES4/T1/B10, NEAR 5 + FAR 80 = 85; HSD 06/01/2027 và 17/10/2028 |
| Chi nhánh | BR-001 có 20 Hộp NEAR khi chuẩn bị; ST-20261017-0002 đang SHIPPING 5 Hộp |
| Đối chiếu trước demo | 85 kho tổng + 20 chi nhánh + 5 đang chuyển = 110 đã nhập; đọc lại nếu đã diễn tập |
| Hai SKU phụ | B8 khẩu trang 60 Hộp, B9 bông 8 Gói |
| Đăng nhập và quyền | Mở sẵn phiên đúng vai trò; kiểm tra ca bán và chi nhánh. Không đăng nhập/đăng xuất luân phiên trước hội đồng |
| Câu chatbot | Tôi muốn tìm sản phẩm bổ sung vitamin C đang có trong danh mục. Hiển thị tên sản phẩm, giá và tình trạng còn hàng; không cần hướng dẫn liều dùng. |
| Kết quả chatbot đã thử | Có thẻ UPSA-C, Enervon, Ceelin; riêng Enervon đã đối chiếu danh mục 2.290đ/Hộp, tồn 152 tại thời điểm chuẩn bị. Không phải giá thị trường hay kết quả bảo đảm ở lần chạy sau |
| OCR | Chọn ảnh nhóm đã diễn tập; ảnh tổng hợp mới trong gói chưa được xác nhận OCR live. Không áp dụng kết quả sai mặt hàng vào POS |
| POS | Nhận phiếu và giao dịch bán được để dành cho buổi demo; chưa có sale mới trong bộ fixture lúc chuẩn bị. Ghi lại tồn trước/sau thực tế |

Nếu AI chờ quá khoảng 8 giây, chuyển sang kết quả đã chuẩn bị và nói: “Để giữ thời gian, nhóm mở kết quả đã chạy thử trước buổi demo để giải thích đầu ra.” Không trình bày ảnh cũ như phản hồi vừa nhận.

Nếu nhận kho hoặc POS báo lỗi, nói: “Thao tác này chưa hoàn tất trên bản chạy, nhóm ghi nhận để kiểm tra. Em xin mở hồ sơ đã chuẩn bị để tiếp tục giải thích luồng.” Không khẳng định tồn đã thay đổi khi chưa thấy kết quả.

Những giới hạn đã quan sát cần trả lời đúng khi được hỏi: tìm chính xác SKU DEMO trên chatbot và câu tiếp nối giá/tồn chưa đạt; lời dẫn phản hồi đang rơi về câu dự phòng; tìm kiếm toàn sơ đồ từng báo hết hàng trong khi chi tiết RES4 có tồn đúng; SKU mới chưa có lịch sử để đánh giá forecast. Chi nhánh chỉ có lô NEAR nên chưa chứng minh FEFO đa lô ở POS; hai lô đang minh họa nằm ở kho tổng.

Đã có code, có giao diện, có sơ đồ và kiểm thử đạt là các trạng thái khác nhau. Không tự đổi Remaining Work thành Resolved trong lời nói. Với câu hỏi về tiến độ, nhóm đã xác nhận chia lại việc và giữ scope; không tự nói giảm scope hoặc làm thêm giờ.

Tệp chi tiết cho người thao tác: DEMO_FULL_BUSINESS_FLOW_REVIEW2.md và demo-data/README_DEMO_R2.md. Dữ liệu chuẩn bị không phải bằng chứng accuracy AI, tuân thủ chứng nhận nhà cung cấp hay kiểm thử giao dịch tài chính thật.
