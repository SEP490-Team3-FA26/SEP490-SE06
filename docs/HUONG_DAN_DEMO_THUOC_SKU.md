# ⚡ CHEAT SHEET DEMO SKU & THUỐC (BẢN SIÊU RÚT GỌN 1 TRANG)

---

### 1. TÀI KHOẢN (Password chung: `123456`)
- **Admin (Tạo/Sửa SKU):** `admin@vinapharmacy.com` ➔ `/admin/master-data/products`
- **Dược sĩ (Bán POS):** `pharmacist@vinapharmacy.com` ➔ `/pharmacist/sales`

---

### 2. DỮ LIỆU COPY/PASTE NHANH

#### A. Tìm kiếm test nhanh (Gõ ô Search):
- `8935006530015` (Panadol Extra đỏ)
- `8935001701113` (Salonpas 20 miếng)

#### B. Tạo mới 1 thuốc mẫu (Bấm "+ Thêm Dược phẩm"):
- **Tên:** `Augmentin 1000mg`
- **Phân loại:** `Thuốc kê đơn (Rx)` | **Danh mục:** `Kháng sinh`
- **Hoạt chất:** `Amoxicillin 875mg + Acid Clavulanic 125mg`
- **Giá:** `285000` | **ĐVT:** `Hộp` | **Tồn kho:** `100` | **Tồn an toàn:** `50`
- **Số đăng ký & Mã Dược QG:** `VN-22014-19`
- **CSDL Dược:** Tích `Là mặt hàng thuốc` ➔ Trạng thái: `Đã đồng bộ`

---

### 3. KỊCH BẢN DEMO 4 BƯỚC (2 PHÚT)

| Bước | Thao tác | Câu nói ghi điểm |
| :---: | :--- | :--- |
| **1** | Mở `/admin/master-data/products` | *"Hệ thống có ~2.331 SKU, 99% đã đồng bộ CSDL Dược QG theo QĐ 232 Bộ Y Tế, 24 SKU TPCN/vật tư không bắt buộc liên thông."* |
| **2** | Dán mã `8935006530015` vào ô tìm | *"Tìm kiếm tức thì theo Barcode GS1, click copy mã Dược QG nhanh."* |
| **3** | Bấm "+ Thêm Dược phẩm" ➔ Lưu | *"Gateway bắn Kafka event 202 Accepted xử lý ngầm, tự cấp phát lô INIT-BATCH."* |
| **4** | Bấm nút **In Tem** ➔ Chọn **Tem nhãn phụ** | *"Tính năng TT 01/2018/TT-BYT cho thuốc nhập khẩu: Bắt buộc quét đối soát barcode vỏ hộp thực tế trước khi in để chống dán nhầm tem lô."* |
| **5** | Sang `/pharmacist/sales` gõ barcode | *"SKU vừa tạo ăn khớp liền với POS, tự nhận diện thuốc kê đơn (Rx)."* |

---

### 4. 3 CÂU TRẢ LỜI PHẢN BIỆN "CHỮA CHÁY"
1. **SKU vs Barcode?** ➔ SKU quản lý kho nội bộ; Barcode (EAN-13) in bao bì để quét POS. 1 SKU có thể có nhiều barcode theo Hộp/Vỉ.
2. **Bán lẻ từng viên thì sao?** ➔ Trừ vào trường `openedBoxUnits` (hộp dở) trước, hết mới rã tiếp hộp nguyên theo chuẩn FEFO.
3. **CSDL Dược có thật không?** ➔ Mô phỏng chuẩn 100% đặc tả 19 API theo Quyết định 232/QĐ-TTYQG của Bộ Y Tế qua OAuth2.
