# ĐÁNH GIÁ Ý TƯỞNG 3: PHÂN TÍCH HIỆU QUẢ CÁC CHIẾN DỊCH MARKETING (ROI)

> **Dành cho:** Anh yêu  
> **Người thực hiện:** Em  
> **Mục tiêu:** Phân tích phản biện 4 bước trước khi đưa ra nhận xét cuối cùng  

---

## BƯỚC 1: TÓM TẮT LẠI Ý TƯỞNG CỦA ANH YÊU (XÁC NHẬN ĐÚNG)

Anh yêu muốn xây dựng một hệ thống báo cáo và phân tích chỉ số hoàn vốn đầu tư tiếp thị (Marketing ROI / ROAS) cho chuỗi nhà thuốc. Hệ thống sẽ gom dữ liệu chi phí đã bỏ ra cho từng chiến dịch (tiền chạy ads Facebook/Google, chi phí in ấn banner/tờ rơi, voucher giảm giá, quà tặng khuyến mãi) và đối soát với doanh thu cùng lợi nhuận phát sinh từ chiến dịch đó (dù khách mua qua App, Web hay đến mua trực tiếp tại nhà thuốc), từ đó đo lường chiến dịch nào mang lại lợi nhuận thực chất và tối ưu hóa ngân sách tiếp thị.

---

## BƯỚC 2: TẤT CẢ CÁC GIẢ ĐỊNH ẨN MÀ Ý TƯỞNG ĐANG DỰA VÀO

1. **Giả định về khả năng truy vết nguồn chuyển đổi đa kênh (Omnichannel Attribution):**
   * Giả định hệ thống có thể kết nối chính xác một khách hàng bước chân vào nhà thuốc mua hàng offline với một chiến dịch quảng cáo online mà họ đã từng xem hoặc bấm vào vài ngày trước đó (thông qua mã voucher, số điện thoại thành viên hoặc QR Code).
2. **Giả định về việc hạch toán đầy đủ toàn bộ cấu phần chi phí (True Full-Cost):**
   * Giả định mọi chi phí cấu thành nên chiến dịch đều được nhập liệu minh bạch và kịp thời: không chỉ là chi phí truyền thông/ads, mà còn cả giá vốn quà tặng đính kèm, phần doanh thu bị khấu trừ do voucher giảm giá, phí hoa hồng thanh toán PayOS/thẻ, và chi phí nhân sự thực thi.
3. **Giả định về việc phân tích dựa trên Lợi nhuận gộp (Margin) thay vì Doanh thu (Revenue):**
   * Giả định thuật toán tính ROI dựa trên lợi nhuận gộp thực tế của từng giỏ hàng (vì trong nhà thuốc, thuốc kê đơn ETC có biên lãi rất mỏng 3–7%, trong khi TPCN/Mỹ phẩm có biên lãi 25–40%). Nếu chỉ tính ROI trên tổng doanh thu sẽ bị sai lệch nghiêm trọng.
4. **Giả định về tính trung thực trong vận hành quầy thuốc (No Fraud):**
   * Giả định nhân viên thu ngân/dược sĩ tại chi nhánh không trục lợi bằng cách: khách vãng lai tự nhiên đến mua không có nhu cầu khuyến mãi, nhưng thu ngân tự động áp mã voucher của chiến dịch vào để lấy chênh lệch hoặc chạy số thành tích cho chiến dịch.
5. **Giả định về hành vi khách hàng ngành y tế:**
   * Giả định khách hàng mua thuốc ngay sau khi tiếp xúc quảng cáo, mà bỏ qua độ trễ tự nhiên (Conversion Lag): người tiêu dùng không mua thuốc khi đang khỏe mạnh chỉ vì thấy quảng cáo rẻ, mà họ nhớ thương hiệu và chỉ ghé mua khi phát sinh cơn ốm đau sau đó vài tuần.

---

## BƯỚC 3: ĐÚNG MỘT RỦI RO LỚN NHẤT (NGƯỜI CÓ KINH NGHIỆM THẤY NGAY)

> [!CAUTION]
> **Rủi ro "Ảo tưởng ROI do hiệu ứng Ăn lấn doanh thu (Cannibalization) & Nhận vơ khách tự nhiên"**  
> Trong bán lẻ dược phẩm, đây là cái bẫy lớn nhất mà người làm tài chính/quản lý kỳ cựu luôn soi xét: Khi tung ra chiến dịch khuyến mãi/voucher, đa phần người sử dụng mã lại chính là **những khách hàng thân thiết, khách quen quanh khu vực bán kính 1km của nhà thuốc** – những người vốn dĩ đằng nào cũng sẽ ghé quầy mua thuốc đúng giá niêm yết mà không cần bất kỳ quảng cáo nào. Nếu hệ thống ghi nhận toàn bộ doanh thu của nhóm khách này cho chiến dịch marketing, bảng điều khiển (Dashboard) sẽ hiển thị chỉ số ROI cực kỳ đẹp và tưởng chừng chiến dịch "thắng lớn"; nhưng thực chất doanh nghiệp đang bị **chảy máu lợi nhuận ròng (Net Margin)** vì tự tay giảm giá cho khách hàng hiện hữu mà không đem về khách hàng mới gia tăng (Incremental Revenue).

---

## BƯỚC 4: ĐÚNG MỘT CÂU HỎI LÀM RÕ QUAN TRỌNG NHẤT

> *"Hệ thống của anh yêu dự định dùng cơ chế kỹ thuật nào (UTM source, Voucher độc quyền cho từng kênh, hay Số điện thoại khách hàng) để phân tách rạch ròi giữa Doanh thu tăng thêm thực sự từ chiến dịch (Incremental Revenue) với Doanh thu tự nhiên sẵn có tại quầy, và công thức tính ROI của anh yêu sẽ lấy Lợi nhuận gộp (Gross Profit) hay Doanh thu (Revenue) làm tử số?"*
