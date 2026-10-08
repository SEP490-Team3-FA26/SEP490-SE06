# Mock Sandbox Server: Cơ Sở Dữ Liệu Dược Quốc Gia Việt Nam (API v2)

Tài liệu kỹ thuật và mã nguồn mô phỏng Sandbox API Cổng Thông tin Dược Quốc gia – Trung tâm Thông tin Y tế Quốc gia (Bộ Y tế), xây dựng tuân thủ nghiêm ngặt theo **Quyết định số 232/QĐ-TTYQG** (ban hành ngày 17/07/2026, Bản đặc tả 1.1) thay thế cho Quyết định 522/QĐ-TTYQG.

---

## 1. Căn Cứ Pháp Lý & Đặc Tả Kỹ Thuật

* **Văn bản pháp lý:**
  * **Quyết định 232/QĐ-TTYQG** (17/07/2026): Ban hành tài liệu kỹ thuật API và hướng dẫn sử dụng Hệ thống Cơ sở dữ liệu Dược Quốc gia (Bản đặc tả v1.1).
  * **Thông tư 11/2025/TT-BYT** & **Thông tư 02/2018/TT-BYT**: Quy định thực hành tốt cơ sở bán lẻ thuốc (GPP) và liên thông dữ liệu dược quốc gia.
  * **Công văn 934/TTYQG-DA**: Hướng dẫn liên thông và thử nghiệm API sandbox.
* **Môi trường & Đầu mối liên hệ:**
  * **Sandbox Base URL:** `https://api-sandbox.csdlduoc.com.vn/v2` (Local Mock: `http://localhost:4005/v2`)
  * **Production Base URL:** `https://api.csdlduoc.com.vn/v2`
  * **Hỗ trợ cấp tài khoản sandbox:** Hotline `19008255` (nhánh 2) – Trung tâm Thông tin Y tế Quốc gia, Bộ Y tế.

### 📌 Điểm Khác Biệt Quan Trọng Của Bản 1.1 (QĐ 232) So Với Bản 1.0 (QĐ 522):
1. **Loại bỏ** trường `ingredients` trong response danh mục thuốc.
2. **Bổ sung** trường `old_registration_number` (Số đăng ký cũ nếu thuốc được gia hạn/cấp lại).
3. **Bổ sung** trường `manufacturer.address` (Địa chỉ chi tiết của nhà sản xuất).
4. **Bổ sung** trường `last_update_time` (Thời điểm cập nhật bản ghi dược phẩm YYYY-MM-DD).
5. **Bổ sung** bộ lọc tìm kiếm theo khoảng ngày cập nhật: `last_update_from` và `last_update_to`.

---

## 2. Danh Sách Endpoint Mô Phỏng

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/v2/health` | Không | Kiểm tra trạng thái máy chủ Sandbox & Thông tin phiên bản đặc tả |
| `POST` | `/v2/auth/login` | Không | Đăng nhập lấy access token OAuth2 (Bearer). Password mã hóa Base64 |
| `GET` | `/v2/master/drugs` | Bearer Token | Danh sách thuốc chuẩn QĐ 232 (hỗ trợ phân trang, lọc ngày, tìm kiếm) |
| `GET` | `/v2/master/drugs/:drug_id` | Bearer Token | Chi tiết một loại thuốc theo ID hoặc Số đăng ký lưu hành |
| `GET` | `/v2/master/units` | Bearer Token | Danh mục đơn vị tính (Hộp, Chai, Vỉ, Viên, Gói, Ống, Tuýp...) |
| `GET` | `/v2/master/countries` | Bearer Token | Danh mục quốc gia sản xuất (Việt Nam, Pháp, Đức, Anh, Mỹ, Nhật...) |
| `GET` | `/v2/master/drug-groups` | Bearer Token | Danh mục nhóm tác dụng dược lý (NSAID, Kháng sinh, Tim mạch...) |
| `GET` | `/v2/master/routes` | Bearer Token | Danh mục đường dùng (Đường uống, Tiêm bắp, Tiêm tĩnh mạch, Bôi ngoài...) |
| `GET` | `/v2/master/manufacturers` | Bearer Token | Danh mục các hãng sản xuất dược phẩm |
| `GET` | `/v2/master/provinces` | Bearer Token | Danh mục tỉnh / thành phố |
| `GET` | `/v2/master/communes` | Bearer Token | Danh mục phường / xã (lọc theo `province_id`) |

---

## 3. Quy Ước Mã Hóa Dữ Liệu

### 3.1. Phân loại đơn thuốc (`prescription_status`):
* `0`: Thuốc không kê đơn (**OTC**).
* `1`: Thuốc kê đơn (**ETC**).

### 3.2. Phân loại kiểm soát đặc biệt (`special_control_type`):
* `0`: Không kiểm soát đặc biệt.
* `1`: Thuốc gây nghiện.
* `2`: Thuốc hướng thần.
* `3`: Tiền chất dùng làm thuốc.
* `4`: Thuốc độc.
* `5`: Thuốc thuộc danh mục cấm dùng cho một số ngành, lĩnh vực.
* `6`: Thuốc phóng xạ.

---

## 4. Hướng Dẫn Chạy Mock Server & Kiểm Thử

### 4.1. Khởi động Mock Server:
Từ thư mục `backend/`:
```bash
# Cách 1: Chạy trực tiếp bằng ts-node
npx ts-node mock-csdlduoc/server.ts

# Hoặc qua script npm
npm run mock:csdlduoc
```

### 4.2. Chạy Script Kiểm thử Tự động:
```bash
npx ts-node mock-csdlduoc/test-sandbox.ts
```

---

## 5. Mẫu Lệnh cURL Chuẩn Thao Tác

### Bước 1: Lấy Access Token (OAuth2)
> [!NOTE]
> Mật khẩu bắt buộc mã hóa Base64 trước khi gửi:
> `echo -n 'MatKhauSandbox2026@' | base64`

```bash
curl -X POST "http://localhost:4005/v2/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=0312345678" \
  -d "password=$(echo -n 'MatKhauSandbox2026@' | base64)"
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "master.read",
  "facility_tax_code": "0312345678"
}
```

### Bước 2: Lấy Danh Sách Thuốc
```bash
curl -G "http://localhost:4005/v2/master/drugs" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  --data-urlencode "page=1" \
  --data-urlencode "page_size=20" \
  --data-urlencode "last_update_from=2026-07-01" \
  --data-urlencode "last_update_to=2026-10-04"
```

### Bước 3: Tra Cứu Chi Tiết Thuốc Theo ID hoặc Số Đăng Ký
```bash
# Tra cứu theo ID thuốc
curl -X GET "http://localhost:4005/v2/master/drugs/DRUG-0001" \
  -H "Authorization: Bearer <access_token>"

# Tra cứu theo Số Giấy Phép Lưu Hành (SĐK)
curl -X GET "http://localhost:4005/v2/master/drugs/VN-21980-19" \
  -H "Authorization: Bearer <access_token>"
```

### Bước 4: Lấy Danh Mục Master Catalogs
```bash
# Đơn vị tính
curl -X GET "http://localhost:4005/v2/master/units" -H "Authorization: Bearer <access_token>"

# Danh mục nhà sản xuất
curl -X GET "http://localhost:4005/v2/master/manufacturers" -H "Authorization: Bearer <access_token>"

# Danh mục nhóm thuốc
curl -X GET "http://localhost:4005/v2/master/drug-groups" -H "Authorization: Bearer <access_token>"
```
