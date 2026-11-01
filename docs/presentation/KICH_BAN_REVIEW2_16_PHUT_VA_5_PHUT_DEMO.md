# Kịch bản thuyết trình Review 2 ABC Pharmacy

Nhóm SE_06 · Nam, Đạt, Phước, Phúc · 16 phút trình bày slide và 5 phút demo

Tài liệu dùng để luyện nói và phối hợp thao tác. Lời nói được viết bằng tiếng Việt; tên các phần trên slide giữ tiếng Anh. Tổng thời gian là 21 phút, chưa gồm hỏi đáp. Mạch trình bày đi từ cập nhật sau Review 1 đến thiết kế, kiểm thử, AI, demo và đánh giá giai đoạn 2.

## 1 Phân công và mốc thời gian

Mỗi người trình bày một lượt liên tục. Thứ tự: Nam → Phước → Đạt → Phúc. Không quay lại mời Nam nói forecast hoặc kết luận, không tách Đạt thành hai lượt.

| Thời gian toàn bài | Người nói | Nội dung trong một lượt | Thời lượng |
|---|---|---|---|
| 00:00–05:35 | Nguyễn Văn Nam | Cover, feedback, agenda, giới thiệu ngắn, PM và cập nhật yêu cầu | 5 phút 35 giây slide |
| 05:35–09:25 | Trần Hồng Phước | Architecture, ERD, integration và security | 3 phút 50 giây slide |
| 09:25–11:10 | Nguyễn Tiến Đạt | Testing and Quality, business workflow | 1 phút 45 giây slide |
| 11:10–21:00 | Đinh Anh Phúc | AI gồm OCR, voice, chatbot, forecast; dẫn demo; Phase 2 Assessment và Phase 3 Plan | 4 phút 50 giây slide + 5 phút demo |

Tổng thời gian slide là 16 phút, demo 5 phút, toàn bài 21 phút chưa gồm hỏi đáp. Trong lượt cuối của Phúc: AI 11:10–14:40; demo 14:40–19:40; assessment và kế hoạch 19:40–21:00.

Phân công này là người đại diện trình bày. Nam vẫn là người hỗ trợ nội dung/code forecast, Phước hỗ trợ POS, Đạt hỗ trợ kho. Khi demo, các bạn có thể thao tác hoặc chuẩn bị màn hình nhưng Phúc giữ lời dẫn xuyên suốt. Không diễn giải rằng người đứng nói đã tự làm toàn bộ các module trong lượt của mình.

## 2 Thứ tự mở slide

Mốc dưới đây đối chiếu với bản Canva 39 trang ngày 18/10/2026. Nếu nhóm thêm hoặc gộp trang, tìm theo tên slide thay vì chỉ nhớ số trang.

| Phần | Slide Canva hiện tại | Cách trình bày |
|---|---|---|
| Cover, feedback và agenda | 1, 2, 3 | Nam mở đúng thứ tự; không tuyên bố đã đóng toàn bộ comment |
| Introduction | 4–7 | Gộp lời nói trong 35 giây; trang 4 và 6 có thể chuyển appendix |
| Project Management | 8–16 | Trang 8 là trang chuyển; tập trung 9–13; ảnh backlog 14–15 và tài liệu 16 chỉ làm evidence |
| Requirement updates | 20, chọn 24/27/28/30 | Đưa phần này lên trước Architecture; không thuyết trình lại 11 use case |
| Business workflow | Cần bổ sung | Đạt giới thiệu sau Testing; Phúc mở lại khi bắt đầu demo xuyên suốt |
| Architecture | 17–19 | Trang 17 là trang chuyển; 18 là sơ đồ chính; 19 cần sửa tên và tuyến API |
| ERD | 21 | Đặt cạnh Architecture; chỉ ba cụm dữ liệu |
| Testing | 33–34 | Trang 33 là trang chuyển; trang 34 dùng hình Testing Summary mới |
| AI | 35–37 | Trang 35 là trang chuyển; dùng 37 để giải thích ba luồng; 36 là sơ đồ thành phần phụ trợ |
| Demo | 38 và Business Workflow | Bắt đầu bằng workflow rồi mới chuyển website |
| Assessment và kế hoạch | 39 và một trang Phase 3 Plan | Đổi Conclusion thành Phase 2 Assessment; tách kế hoạch nếu chữ quá dày |

Mục lục vẫn có tám mục: Introduction; Project Management; Requirement Updates; Architecture and Data Design; Testing and Quality; AI Integration; Live Demonstration; Phase 2 Assessment and Phase 3 Plan.

Trước buổi trình bày, bỏ nội dung mẫu “Borcelle” và “www.reallygreatsite.com” còn ở trang Our Team. Trang 19 nên đổi thành Integration and Security; đơn hàng và kiểm kê không phải endpoint FastAPI AI. Phần kết nối Gateway → FastAPI dùng HTTP, không diễn giải mọi lời gọi AI đều đi qua Kafka.

## 3 Nam trình bày mở đầu quản lý dự án và cập nhật yêu cầu

### 00:00–00:30 Cover

**Mở slide:** Trang 1 — ABC Pharmacy.

**Lời nói:**

“Em tên là Nguyễn Văn Nam. Trong dự án, em tham gia phát triển các chức năng mua hàng, yêu cầu báo giá và dự báo nhu cầu. Sau đây, em xin đại diện nhóm SE_06 trình bày báo cáo Review 2 của đề tài ABC Pharmacy — The AI-Integrated Pharmacy Chain Management System, hệ thống quản lý chuỗi nhà thuốc tích hợp AI.

Kính chào thầy cô trong hội đồng. Ở lần review này, nhóm chúng em tập trung vào những thay đổi sau Review 1, thiết kế hệ thống và kết quả tích hợp thể hiện trên sản phẩm.”

**Nhịp trình bày:** Nhìn hội đồng khi giới thiệu tên. Chỉ vào tên đề tài một lần, không đọc tên cả bốn người trên bìa.

### 00:30–01:45 Review 1 Feedback and Resolution

**Mở slide:** Trang 2. Chỉ lần lượt ba cột Feedback, Changes Implemented và Remaining Work.

**Lời nói:**

“Trước khi đi vào nội dung chính, nhóm xin báo cáo việc xử lý các góp ý của Review 1. Nhóm đã tổng hợp góp ý thành các hạng mục thay đổi và phần việc cần tiếp tục hoàn thiện, như bảng trên màn hình.

Với quản lý kho, nhóm đã bổ sung khả năng xem thông tin lô, hạn dùng và lựa chọn lô theo thời điểm hết hạn. Phần cần kiểm tra tiếp là loại trừ lô đã hết hạn ở mọi luồng xuất và bảo đảm số tồn nhất quán khi giao dịch gặp lỗi.

Với nhà cung cấp và hóa đơn, nhóm đã bổ sung thông tin chứng nhận, cảnh báo hạn và thông tin phân bổ lô. Phần còn lại là kiểm soát điều kiện nhà cung cấp xuyên suốt quy trình mua hàng, đồng thời thay các giá trị hóa đơn dự phòng bằng dữ liệu giao dịch thực tế.

Với AI và trải nghiệm khách hàng, nhóm đã có lịch sử tư vấn, các nhắc nhở theo hành vi mua và giao diện theo dõi đơn. Tuy nhiên, xác nhận của dược sĩ, ánh xạ người dùng và sự kiện giao hàng thực tế vẫn là những điểm cần hoàn thiện.

Vì vậy, nhóm xin phân biệt phần đã triển khai với phần đã kiểm thử đạt. Những nội dung còn mở sẽ được nêu ở phần đánh giá giai đoạn 2 và kế hoạch giai đoạn 3.”

**Điểm cần giữ:** Dùng trạng thái đang trên bảng. Chỉ chuyển một mục sang Resolved sau khi cập nhật code, kiểm thử và evidence tương ứng. Không đọc câu “nhóm đã fix toàn bộ comment” khi slide còn Remaining Work.

### 01:45–02:05 Agenda

**Mở slide:** Trang 3. Đứng ở agenda trong toàn bộ lời dẫn.

**Lời nói:**

“Buổi trình bày gồm tám phần như trên màn hình. Phần giới thiệu và yêu cầu đã được trình bày ở Review 1 nên hôm nay nhóm chỉ nhắc ngắn và nêu các cập nhật. Trọng tâm sẽ là kiến trúc, kiểm thử, ba luồng AI và demo sản phẩm theo business workflow. Cuối cùng, nhóm đánh giá giai đoạn 2 và trình bày kế hoạch tiếp theo.”

### 02:05–02:40 Introduction và Our Solution

**Mở slide:** Trang 5 rồi trang 7. Không dừng ở từng trang 4–7 để giới thiệu lại.

**Lời nói:**

“ABC Pharmacy hướng tới kết nối hoạt động bán hàng, kho và quản lý chi nhánh. Ba vấn đề nhóm tập trung là truy vết thuốc theo lô và hạn dùng, giảm thao tác nhập dữ liệu khi tiếp nhận đơn thuốc, và hỗ trợ quyết định bổ sung hàng.

So với nội dung đã giới thiệu ở Review 1, trọng tâm hiện tại là ghép các chức năng này thành quy trình có thể kiểm tra trên sản phẩm. Các phần mềm hiện có được dùng làm tham chiếu chức năng; nhóm không xem việc có POS hay theo dõi hạn dùng là khác biệt riêng của dự án.”

**Nếu mở Existing System:** Chỉ thêm một câu “Phần so sánh đã được điều chỉnh để dùng các sản phẩm phần mềm làm tham chiếu.” Không tuyên bố đối thủ không có AI hoặc FEFO khi chưa có nguồn.

### 02:40–04:40 Project Management

**Mở slide:** Trang 9 → 10 → 11 → 12–13; trang 14–16 dùng để chỉ evidence khi cần.

**Lời nói:**

“Về quản lý dự án, trước hết là mục tiêu của giai đoạn 2. Nhóm tập trung tích hợp các luồng nghiệp vụ chính, xử lý góp ý từ Review 1 và chuẩn bị sản phẩm cùng bằng chứng kiểm thử để có thể đánh giá trực tiếp.

Về timeline và nguồn lực, nhóm theo dõi công việc theo sprint trên Jira, gắn người phụ trách và tiêu chí hoàn thành cho từng đầu việc. Sau thay đổi nhân sự, nhóm còn bốn thành viên. Nhóm đã phân chia lại công việc và giữ nguyên phạm vi dự án. Khi theo dõi tiến độ, nhóm cần kiểm tra cả phần chức năng đã làm và phần còn phụ thuộc vào tích hợp, kiểm thử.

Về vai trò, Phước tập trung kiến trúc, triển khai và POS; Đạt tập trung kho và các luồng tồn; Phúc tập trung chatbot, RAG và các phần kiểm thử liên quan; em tập trung mua hàng, RFQ và forecast. Những phần dùng chung như tích hợp và tài liệu được phối hợp giữa các thành viên.

Sau mục tiêu, nguồn lực và phân công, nhóm mới trình bày cách áp dụng Scrum. Product Backlog là danh sách công việc của sản phẩm. Trong Sprint Planning, nhóm chọn các hạng mục theo ưu tiên, khả năng thực hiện và phụ thuộc giữa các module; kết quả là Sprint Backlog.

Daily Stand-up được dùng để cập nhật tiến độ và nêu vướng mắc. Cuối sprint, Sprint Review giúp đối chiếu phần đã làm với yêu cầu; Sprint Retrospective nhìn lại cách phối hợp và những điểm cần cải thiện. Ở Review 2, điều nhóm cần chứng minh là đầu việc, người phụ trách và kết quả thực tế khớp với báo cáo, thay vì chỉ mô tả các thuật ngữ Scrum.”

**Nhịp trình bày:** Mỗi slide nhấn một ý. Khi nói timeline, chỉ mốc đang có trên Jira hoặc bảng đã chốt; không đọc các ô “[from Jira]” trên hình mẫu. Nếu việc áp dụng một hoạt động Scrum chưa có evidence, diễn đạt đó là cách nhóm tổ chức hoặc đang hoàn thiện, không khẳng định mọi buổi đã diễn ra đầy đủ.

### 04:40–05:35 Requirement Updates

**Mở slide:** Requirement Updates; dùng một trang tổng hợp thay cho đọc lần lượt trang 22–32.

**Lời nói:**

“Tiếp theo, em xin trình bày ngắn các cập nhật yêu cầu. Phạm vi các phân hệ đã được giới thiệu ở Review 1. Ở giai đoạn này, nhóm làm rõ thêm các điểm kiểm soát xuyên module: thuốc được quản lý theo lô và hạn dùng; xuất kho cần ưu tiên lô còn hạn gần nhất; giao dịch cần giữ đủ dữ liệu để truy vết.

Đối với AI, đầu ra là dữ liệu trích xuất hoặc gợi ý để người có chuyên môn kiểm tra. Đối với dự báo, kết quả hỗ trợ đề xuất bổ sung hàng và vẫn cần người quản lý xem xét. Đây cũng là các điểm nhóm sẽ minh họa trong demo, thay vì trình bày lại toàn bộ sơ đồ use case.

Em xin kết thúc phần trình bày của mình, mời bạn Trần Hồng Phước tiếp tục.”

## 4 Phước trình bày kiến trúc và dữ liệu

### 05:35–07:35 System Architecture

**Mở slide:** Trang 18 — Architecture. Trang 17 chỉ làm chuyển cảnh.

**Lời nói:**

“Em tên là Trần Hồng Phước. Trong dự án, em phụ trách điều phối kỹ thuật, kiến trúc, triển khai và tham gia phát triển POS cùng OCR. Sau đây, em xin đại diện nhóm trình bày kiến trúc và thiết kế dữ liệu.

Để thực hiện các yêu cầu vừa trình bày, hệ thống được chia thành lớp giao diện, lớp tiếp nhận yêu cầu và các dịch vụ nghiệp vụ. Em sẽ giải thích theo đường đi của một yêu cầu, từ trái sang phải trên sơ đồ.

Ở phía người dùng là web React và mobile Expo. Yêu cầu từ giao diện được đưa qua lớp truy cập và API Gateway. Gateway tiếp nhận API, xác thực yêu cầu và chuyển đến nhóm xử lý nghiệp vụ phù hợp. Các dịch vụ được tổ chức theo phạm vi như tài khoản, người dùng, tồn kho, đơn hàng và nhà cung cấp.

Kafka hỗ trợ giao tiếp giữa các dịch vụ theo các tuyến xử lý đã triển khai. MongoDB lưu dữ liệu nghiệp vụ; Redis hỗ trợ lưu đệm cho các truy vấn phù hợp; Qdrant phục vụ tìm kiếm ngữ nghĩa cho AI. AI Service dùng Python FastAPI để xử lý những tác vụ chuyên biệt.

Một ví dụ là khi người dùng cần xem dữ liệu kho: yêu cầu đi từ giao diện qua Gateway đến xử lý tồn kho, rồi dữ liệu được trả về để hiển thị. Với một thao tác thay đổi dữ liệu, nhóm còn phải xem xét ảnh hưởng đến các danh sách đang cache và các màn hình liên quan, để người dùng không nhìn thấy trạng thái cũ sau giao dịch.

Điểm cần phân biệt là các kết nối không dùng chung một cơ chế. Luồng nội bộ nghiệp vụ có sử dụng Kafka, trong khi Gateway gọi các API OCR và voice của FastAPI qua HTTP. Vì vậy, nhóm tách sơ đồ kiến trúc tổng thể với sơ đồ AI để thể hiện đúng đường đi của từng loại tác vụ.

Cách chia này giúp mỗi phần có trách nhiệm rõ hơn, nhưng đồng thời tạo thêm yêu cầu kiểm tra lỗi và dữ liệu giữa các dịch vụ. Vì vậy, phần testing tiếp theo sẽ tập trung vào kết quả xuyên toàn luồng, không chỉ từng màn hình riêng lẻ.”

**Chỉ trên hình:** Client → Gateway → Inventory/Orders → MongoDB; sau đó chỉ FastAPI và Qdrant. Cloudflare, Nginx và các dịch vụ triển khai chỉ nêu ở mức sơ đồ thể hiện; không đọc hết tên dịch vụ và số cổng, không coi sơ đồ là bằng chứng mọi cấu hình bảo mật đang có hiệu lực.

### 07:35–08:40 ERD and Data Design

**Mở slide:** Trang 21 — ERD, đưa vào ngay sau Architecture.

**Lời nói:**

“Về dữ liệu, nhóm xin tập trung vào ba cụm liên quan trực tiếp đến workflow, thay vì đọc từng bảng trong ERD.

Cụm thứ nhất là thuốc, lô và tồn kho. Thuốc mô tả mặt hàng; lô chứa thông tin sản xuất và hạn dùng; tồn kho thể hiện số lượng tại phạm vi quản lý. Đây là nền để kiểm tra lô nào có thể xuất và theo dõi thuốc đang ở đâu.

Cụm thứ hai là đơn hàng, giao dịch bán và phân bổ lô. Khi hoàn tất giao dịch, cần biết thuốc đã được lấy từ lô nào, với số lượng và mức giá nào. Đây là cơ sở để đối chiếu số tồn và truy vết hóa đơn.

Cụm thứ ba là bản ghi xử lý AI và lịch sử điều chỉnh. Nhóm cần phân biệt dữ liệu AI gợi ý với dữ liệu được dược sĩ xem lại. Những thông tin đó phải gắn với người thao tác và thời điểm để có thể kiểm tra về sau.

Hiện nhóm vẫn cần hoàn thiện việc dùng dữ liệu lô và hạn dùng thực tế trên hóa đơn, cũng như tính đầy đủ của bước xác nhận AI. Vì vậy, thiết kế dữ liệu và kết quả nghiệm thu được báo cáo riêng.”

### 08:40–09:25 Integration and Security

**Mở slide:** Trang 19 sau khi sửa nhãn; hoặc giữ ở Architecture và chỉ các điểm kiểm soát.

**Lời nói:**

“Bên cạnh kết nối các dịch vụ, nhóm xác định các điểm kiểm soát chính là xác thực người dùng, quyền theo vai trò và chi nhánh, bảo vệ file đơn thuốc và ghi nhận thao tác cần truy vết.

Đây là các yêu cầu phải được kiểm tra tại backend, không chỉ bằng việc ẩn nút trên giao diện. Ví dụ, người thuộc chi nhánh A không được đổi tham số để đọc bản ghi của chi nhánh B. Tương tự, lịch sử tư vấn phải phản ánh người thực sự xác nhận.

Nhóm đã có các thành phần kiểm soát và audit trong hệ thống, nhưng các trường hợp vượt quyền hoặc dữ liệu riêng tư vẫn cần được kiểm thử theo từng luồng trước khi tuyên bố hoàn tất.

Em xin kết thúc phần trình bày của mình, mời bạn Nguyễn Tiến Đạt tiếp tục.”

## 5 Đạt trình bày kiểm thử và business workflow

### 09:25–10:35 Testing and Quality

**Mở slide:** Trang 34, dùng ảnh Testing Summary mới. Trang 33 không cần lời nói riêng.

**Lời nói:**

“Em tên là Nguyễn Tiến Đạt. Trong dự án, em tham gia phát triển các luồng kho, tồn kho và những màn hình nghiệp vụ liên quan. Sau đây, em xin đại diện nhóm trình bày kiểm thử và business workflow.

Tiếp nối phần kiến trúc, em xin trình bày cách nhóm đánh giá kết quả kiểm thử.

Kế hoạch trên slide hiện có 360 ca kiểm thử thuộc tám module. Bảng đang báo cáo 297 ca đã chạy, gồm 295 ca đạt và hai ca chưa đạt; 63 ca còn chờ thực hiện.

Từ đó, tỷ lệ đã chạy là 82,50 phần trăm. Tỷ lệ đạt trong số ca đã chạy là 99,33 phần trăm; còn số ca đạt trên tổng kế hoạch là 81,94 phần trăm. Các tỷ lệ này phản ánh trạng thái test case, không phải code coverage hay độ chính xác AI.

Nhóm còn cần đồng bộ phiên bản báo cáo, round kiểm thử và bằng chứng cho từng trạng thái. Trọng tâm kiểm thử tiếp theo là FEFO và số tồn sau giao dịch, tính nhất quán giữa thanh toán với hóa đơn, phân quyền theo chi nhánh, và bước người dùng kiểm tra đầu ra AI.

Mục tiêu là chứng minh một luồng nghiệp vụ cho kết quả đúng từ đầu đến cuối, thay vì chỉ chứng minh các màn hình đã xuất hiện.”

**Chốt trước buổi nói:** Các số trên là snapshot Canva ngày 18/10, chưa được chạy lại trong lần chuẩn bị kịch bản này. Sau khi nhóm chốt round/build và evidence, thay câu “bảng đang báo cáo” bằng “trong round…, trên build…”. Nếu chưa đồng bộ, giữ nguyên lời nói minh bạch này; không dùng số 284/280 hay 86,4% từ tài liệu cũ lẫn vào cùng slide.

### 10:35–11:10 Business Workflow

**Mở slide:** Business Workflow. Các bước trên hình phải khớp luồng demo xuyên suốt bên dưới.

**Lời nói:**

“Luồng nghiệp vụ chính bắt đầu từ xác định nhu cầu, lập yêu cầu mua hoặc lấy báo giá, kiểm nhận hàng theo lô và hạn dùng, sau đó đưa hàng vào tồn kho để phục vụ bán hàng. Ở quầy, dược sĩ tiếp nhận đơn hoặc nhu cầu của khách, kiểm tra thuốc và tồn, rồi xử lý giao dịch.

AI tham gia ở hai điểm: hỗ trợ đọc hoặc ghi nhận thông tin tư vấn tại quầy, và hỗ trợ ước lượng nhu cầu trước khi bổ sung hàng. Khi demo, nhóm sẽ đi theo các bước trên sơ đồ và đối chiếu đầu vào, kết quả xử lý và dữ liệu lưu lại.

Em xin kết thúc phần trình bày của mình, mời bạn Đinh Anh Phúc tiếp tục.”

**Chỉ trên hình:** Chạy tay theo mũi tên trái sang phải; dừng ở lô/HSD, dược sĩ xác nhận và quản lý duyệt. Đưa các bước ngoài demo thành ngữ cảnh, không hứa demo cả quy trình mua–nhập–bán trong hai phút.

## 6 Phúc trình bày AI và tiếp tục dẫn đến hết bài

### 11:10–11:35 AI Overview

**Mở slide:** Trang 37 — hình AI Processing Pipeline ba luồng.

**Lời nói:**

“Em tên là Đinh Anh Phúc. Trong dự án, em tham gia phát triển chatbot, RAG và các chức năng tư vấn AI liên quan. Sau đây, em xin đại diện nhóm trình bày cách xử lý AI.

Nhóm trình bày ba nhánh xử lý chính: OCR đơn thuốc, tư vấn bằng văn bản hoặc giọng nói với RAG, và dự báo nhu cầu. Chatbot là giao diện tư vấn ở kênh khách hàng; voice là một cách tiếp nhận đầu vào. Forecast hỗ trợ quản lý lập kế hoạch bổ sung hàng.”

### 11:35–12:35 Prescription OCR

**Thao tác:** Chỉ hàng thứ nhất trên hình, lần lượt từng khối.

**Lời nói:**

“Với OCR, đầu vào là ảnh đơn thuốc bản in. Hệ thống chuyển ảnh đến xử lý nhận dạng, trích xuất các thông tin thành dữ liệu có cấu trúc, rồi chuẩn hóa và kiểm tra các trường nhận được.

Sau nhận dạng, nhóm còn đối chiếu tên thuốc với danh mục trong hệ thống. Bước này cần thiết vì văn bản được đọc ra chưa chắc đã trùng với tên mặt hàng hoặc dạng đóng gói trong kho. Các thông tin thiếu hoặc chưa khớp phải được đưa ra để người dùng kiểm tra.

Kết quả được hiển thị để dược sĩ xem lại và điều chỉnh trước khi sử dụng cho giao dịch. Điểm nhóm muốn giảm là thời gian nhập liệu; phần đánh giá chuyên môn vẫn thuộc về dược sĩ.

Trong phạm vi trình bày hôm nay, nhóm dùng đơn thuốc bản in. Nhóm chưa công bố tỷ lệ chính xác OCR khi chưa có bộ mẫu và phép đo phù hợp; confidence hiển thị cũng không được dùng thay cho kết quả đánh giá.”

### 12:35–13:40 Voice Chatbot and RAG

**Thao tác:** Chỉ hàng thứ hai. Mở package diagram ở trang 36 chỉ khi cần giải thích thành phần.

**Lời nói:**

“Với voice, speech-to-text chuyển âm thanh thành văn bản để xử lý tiếp. Với chatbot, khách nhập câu hỏi bằng chữ; hệ thống gửi câu hỏi và lịch sử gần đây làm ngữ cảnh. Khi trình bày, nhóm phân biệt hai giao diện này, không gọi chatbot là một bước bắt buộc sau ghi âm.

Ở bước RAG, văn bản được dùng để truy xuất thông tin liên quan từ nguồn kiến thức. Cohere hỗ trợ tạo embedding, còn Qdrant hỗ trợ tìm các nội dung gần với câu hỏi về mặt ngữ nghĩa. Những nội dung tìm được được bổ sung vào ngữ cảnh cho mô hình ngôn ngữ khi tạo gợi ý.

Sau đó, hệ thống đối chiếu thông tin thuốc và khả năng cung ứng theo luồng đã triển khai, rồi trả kết quả để dược sĩ xem xét. Lịch sử giúp tra lại nội dung đã ghi nhận và những thay đổi sau xử lý.

RAG giúp phản hồi có thêm ngữ cảnh, nhưng không tự bảo đảm mọi câu trả lời đều đúng. Trong lần thử trên website, chatbot đã trả thẻ sản phẩm theo nhu cầu, nhưng tìm chính xác SKU mới và trả lời tiếp nối giá tồn chưa đạt. Nhóm còn cần sửa các điểm đó và hoàn thiện việc ghi nhận xác nhận của dược sĩ.”

### 13:40–14:40 Forecast and Replenishment

**Mở slide:** Giữ trang 37, chuyển điểm chỉ sang hàng thứ ba.

**Lời nói:**

“Tiếp theo, em xin trình bày luồng dự báo nhu cầu và đề xuất bổ sung hàng.

Đầu vào chính là lịch sử bán hàng theo tháng của từng thuốc. Dữ liệu được tổng hợp thành chuỗi để mô hình LSTM dự báo nhu cầu cho ba tháng tiếp theo. Trong những trường hợp mô hình hoặc dữ liệu không đáp ứng điều kiện xử lý, hệ thống có nhánh fallback.

Dự báo sau đó được kết hợp với tồn hiện tại, hàng đang về và các ngưỡng tồn để tính lượng cần bổ sung. Như vậy, nhu cầu dự báo và số lượng đề xuất đặt hàng là hai kết quả khác nhau.

Người quản lý xem xét và điều chỉnh đề xuất trước khi chuyển sang bước mua hàng phù hợp. Nhóm chưa công bố accuracy cho forecast; phần ánh xạ dữ liệu và đánh giá mô hình trên dữ liệu kiểm thử vẫn cần hoàn thiện.

Sau đây, em xin tiếp tục dẫn phần demo xuyên suốt business workflow. Các bạn trong nhóm hỗ trợ thao tác theo mảng phụ trách; em sẽ giữ lời dẫn để hội đồng theo dõi liền mạch.”

**Không nói:** “AI dự đoán chính xác dịch bệnh”, “AI tự mua hàng” hoặc “mô hình đã đạt X%” khi chưa có dữ liệu đánh giá. Lịch sử bán theo tháng không tự chứng minh mô hình đang nhận dữ liệu dịch tễ bên ngoài.

## 7 Demo sản phẩm xuyên suốt business workflow trong 5 phút

Bản này đã bổ sung sơ đồ kho và chatbot; Phúc dẫn, các bạn hỗ trợ thao tác. Bộ dữ liệu thật trên website được mô tả ở DEMO_FULL_BUSINESS_FLOW_REVIEW2.md và demo-data/README_DEMO_R2.md.

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

## 8 Phúc đánh giá giai đoạn 2 và kết thúc

### 19:40–20:20 Phase 2 Assessment

**Mở slide:** Trang 39 sau khi đổi thành Phase 2 Assessment.

**Lời nói:**

“Về giai đoạn 2, nhóm đã xây dựng và tích hợp các phần chính phục vụ bán hàng, quản lý kho, chi nhánh và các luồng AI vừa trình bày. Phần còn cần hoàn thiện tập trung vào tính nhất quán dữ liệu, truy vết giao dịch, quyền truy cập và bằng chứng kiểm thử.

Trong giai đoạn này, nhóm có thay đổi nhân sự và còn bốn thành viên. Nhóm đã phân chia lại trách nhiệm, giữ nguyên phạm vi và ưu tiên xử lý các phụ thuộc giữa những module chính. Khó khăn đó cũng cho thấy nhóm cần theo dõi sát phần tích hợp và nghiệm thu, thay vì chỉ theo dõi số đầu việc đã lập trình xong.”

**Nếu đã chốt số nghiệm thu:** Thay câu đầu bằng “Đến ngày [ngày chốt], nhóm đã nghiệm thu [X] trên [Y] tính năng trong phạm vi đã thống nhất.” Dùng số từ danh sách nghiệm thu; không lấy 360 test case, 120 use case hoặc tỷ lệ pass để thay cho số tính năng hoàn thành. Nếu chưa có số, dùng nguyên lời nói không nêu tỷ lệ phía trên.

### 20:20–21:00 Phase 3 Plan và lời kết

**Mở slide:** Phase 3 Plan. Có owner và mốc sau khi cả nhóm thống nhất.

**Lời nói:**

“Ở giai đoạn 3, nhóm ưu tiên ba nhóm việc. Thứ nhất, hoàn thiện các điểm kiểm soát của những luồng chính, đặc biệt là lô và hạn dùng, hóa đơn, phân quyền và xác nhận AI. Thứ hai, đồng bộ báo cáo, chạy lại các ca còn lỗi và hoàn thành các ca còn chờ. Thứ ba, đánh giá forecast trên dữ liệu kiểm thử và ổn định các luồng demo trước nghiệm thu.

Mục tiêu tiếp theo của nhóm là các phần đã triển khai có thể được đối chiếu bằng kết quả kiểm thử và bằng chứng cụ thể.

Em xin kết thúc phần trình bày của mình và cũng là phần trình bày của nhóm SE_06. Nhóm chúng em cảm ơn thầy cô đã lắng nghe và xin tiếp nhận câu hỏi của hội đồng.”

## 9 Phiếu chốt trước buổi diễn tập

| Nội dung | Cần chốt | Người phối hợp |
|---|---|---|
| Tên đề tài | Dùng đúng tên đã đăng ký; cover hiện ghi The AI-Integrated Pharmacy Chain Management System | Nam và cả nhóm |
| Tiến độ tính năng | X đã nghiệm thu / Y trong scope; có ngày chốt và danh sách đối chiếu, hoặc dùng lời kết không nêu tỷ lệ | Cả nhóm |
| Testing | Một round, build, môi trường, ngày chạy, 295/2/63 có còn đúng không | Đạt và người thực hiện test |
| Feedback | Mỗi mục có trạng thái và evidence; không đồng nhất “đã code” với “đã đóng comment” | Owner từng hạng mục |
| Timeline | Bỏ placeholder trên hình PM; Jira và Report 2 dùng cùng mốc | Nam và Phước |
| Demo kho/POS | Lô thật, hạn dùng, tồn trước/sau; có ca bán; không dùng invoice fallback làm bằng chứng | Đạt và Phước |
| Demo voice/OCR | Quyền truy cập, provider, dữ liệu thử nghiệm và bản ghi dự phòng | Phúc và Phước |
| Demo forecast | Mapping dữ liệu đã kiểm tra, đúng lịch sử bán, phân biệt forecast và gợi ý bổ sung | Nam |
| Phase 3 | Owner, đầu việc và ngày hoàn thành; không ghi OT hoặc giảm scope khi nhóm đã xác nhận giữ scope | Cả nhóm |

Phân công Phase 3 để nhóm chốt: Phước điều phối sửa POS/hóa đơn và hạ tầng; Đạt phối hợp kho/FEFO và kiểm thử xuyên luồng; Phúc phối hợp xác nhận/audit AI và đánh giá OCR/voice; Nam phối hợp RFQ/forecast và đồng bộ tiến độ. Đây là đề xuất phối hợp tiếp theo, cần gắn issue và ngày thực tế trước khi đưa lên slide.

## 10 Cách luyện để lời nói liền mạch

Mỗi người giới thiệu họ tên và phần đã làm ở đầu lượt của mình, nói hết khối nội dung rồi bàn giao đúng một lần. Ba lần chuyển người là Nam → Phước, Phước → Đạt và Đạt → Phúc. Phúc tiếp tục từ AI qua demo đến assessment và lời kết; không mời Nam quay lại. Trong demo, người hỗ trợ thao tác không cần giới thiệu hoặc đọc lời chuyển phần.

Tập một lượt có đồng hồ và có thao tác thật. Các mốc là thời gian mục tiêu, đã dành chỗ cho việc đổi slide, chỉ hình và chờ kết quả. Nếu vượt giờ, cắt phần đọc evidence backlog, tên hạ tầng và diễn giải use case; giữ phần feedback, ba luồng AI, demo và assessment.

Trong demo, ưu tiên câu “Bước này cần chứng minh điều gì?” trước câu “Em bấm nút gì?”. Sau khi thao tác, nói một câu đối chiếu kết quả đang nhìn thấy, rồi mới chuyển bước. Không đọc lỗi kỹ thuật dài trên màn hình; ghi nhận ngắn và đi theo nhánh dự phòng.

### Khi hội đồng hỏi các điểm nhạy cảm

**Đã sửa hết comment Review 1 chưa?** “Nhóm đã triển khai các thay đổi và báo cáo rõ trạng thái từng mục. Những mục còn Remaining Work chưa được nhóm tuyên bố đóng; nhóm đang hoàn thiện và kiểm thử theo kế hoạch giai đoạn 3.”

**Vì sao pass rate cao nhưng vẫn còn nhiều ca pending?** “Pass rate dùng số ca đã chạy làm mẫu số; execution rate dùng tổng kế hoạch. Hai chỉ số trả lời hai câu hỏi khác nhau. Nhóm vẫn cần thực hiện các ca pending và kiểm tra tính nhất quán của báo cáo.”

**AI có tự quyết định bán thuốc hay mua hàng không?** “Đầu ra AI được thiết kế để hỗ trợ người dùng xem xét. Nhóm còn cần hoàn thiện enforcement của xác nhận dược sĩ và kiểm tra luồng phê duyệt theo từng tác vụ; không xem việc màn hình có nút xác nhận là đủ để chứng minh backend đã kiểm soát đúng.”

**FEFO đã áp dụng ở tất cả luồng chưa?** “Nhóm đã có logic chọn lô theo hạn ở các luồng đã trình bày. Để kết luận toàn bộ, nhóm còn phải kiểm tra riêng việc chặn lô hết hạn, rollback và số tồn sau giao dịch ở từng luồng.”

**Forecast chính xác bao nhiêu?** “Nhóm chưa công bố tỷ lệ khi chưa có đánh giá phù hợp trên dữ liệu kiểm thử độc lập. Nhóm cần chốt dữ liệu, phép đo và so sánh với baseline trước khi báo cáo kết quả.”

**Thay đổi nhân sự xử lý thế nào?** “Nhóm hiện còn bốn thành viên, đã phân chia lại trách nhiệm và giữ nguyên phạm vi. Nhóm ưu tiên các phụ thuộc quan trọng để tích hợp và nghiệm thu; phần tiến độ được theo dõi theo đầu việc và kết quả thực tế.”
