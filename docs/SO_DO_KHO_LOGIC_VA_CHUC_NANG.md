# TÀI LIỆU THIẾT KẾ LOGIC & CHỨC NĂNG SƠ ĐỒ KHO DƯỢC PHẨM (GSP PHARMACY WAREHOUSE MAP)

> **Dự án:** Hệ thống Quản trị Chuỗi Nhà thuốc & Dược phẩm Toàn diện (Pharma ERP)  
> **Phân hệ:** Quản lý Kho Tổng & Kho Chi nhánh (`inventory-service` + `frontend/warehouse`)  
> **Tiêu chuẩn áp dụng:** GSP (Good Storage Practice - Thực hành tốt bảo quản thuốc), Nguyên tắc FEFO (First Expired, First Out)  
> **Phiên bản tài liệu:** v2.1 — Cập nhật chuẩn hóa Thùng hàng (Bins) & Khắc phục đồng bộ dữ liệu toàn diện  
> **Cập nhật lần cuối:** 28/09/2026  

---

## I. TỔNG QUAN HỆ THỐNG SƠ ĐỒ KHO (EXECUTIVE OVERVIEW)

Sơ đồ kho là công cụ trực quan hóa không gian lưu trữ vật lý của Kho Tổng Dược phẩm (Central Warehouse), giúp Thủ kho, Dược sĩ và Quản lý:
1. **Định vị chính xác:** Biết tức thì từng loại thuốc và từng lô thuốc cụ thể đang nằm ở Khu (Zone) nào, Kệ (Rack) nào, Tầng (Shelf) nào và **Ô Thùng (Bin)** nào.
2. **Tuân thủ chuẩn GSP:** Phân chia các nhóm thuốc theo đặc tính dược lý và điều kiện bảo quản riêng biệt, chống nhiễm chéo và nhầm lẫn thuốc.
3. **Thực thi nguyên tắc 1 Thùng = 1 Loại Thuốc:** Mỗi ô thùng chứa đúng một loại thuốc cố định với đầy đủ đơn vị tính chuẩn (Hộp, Chai, Lọ, Tuýp, Gói...).
4. **Thực thi nguyên tắc FEFO & Quản lý Dự Trữ (Reserve):** Tự động ưu tiên xuất các lô thuốc cận hạn trước. Khi nhập lô mới vào thùng chính (`MAIN`), các lô cũ sẽ được cảnh báo hoặc chuyển vào Khu Kệ Dự Trữ (`RESERVE`) để ưu tiên xuất trước.
5. **Cảnh báo sớm trực quan:** Phát hiện ngay các điểm nóng (ô thùng hoặc tầng kệ có thuốc hết hạn, cận hạn hoặc sắp hết hàng) thông qua hệ thống mã màu thời gian thực.

```mermaid
graph TD
    WH["Kho Tổng Trung Tâm (CENTRAL_WH)"]
    WH --> ZA["Khu A: Kháng sinh & Kháng virus"]
    WH --> ZB["Khu B: Hạ sốt, Giảm đau & Hô hấp"]
    WH --> ZC["Khu C: Tim mạch & Huyết áp"]
    WH --> ZD["Khu D: Tiêu hóa & Gan mật"]
    WH --> ZE["Khu E: TPCN, Da liễu & Nội tiết"]
    WH --> ZF["Khu F: Tiểu đường, Thần kinh & Thiết bị y tế"]
    WH --> ZR["Khu Kệ Dự Trữ FEFO (RESERVE: RES1, RES2, RES3, RES4 - 160 Bins)"]

    ZA --> R1["Kệ A1 (4 Tầng x 10 Thùng = 40 Bins)"]
    ZA --> R2["Kệ A2 (40 Bins)"]
    ZA --> R3["Kệ A3 (40 Bins)"]
    ZA --> R4["Kệ A4 (40 Bins)"]

    R1 --> S4["Tầng 4 (10 Thùng: B1 .. B10)"]
    S4 --> B1["Thùng B1: Salonsip Gel (Hộp)"]
    S4 --> B2["Thùng B2: Citropholi (Hộp)"]
    S4 --> B3["Thùng B3: Siro Prospan (Chai)"]
    S4 --> B4["Thùng B4: Refresh Tears (Chai/Lọ)"]
    S4 --> B10["Thùng B10: Glibenclamid (Hộp)"]
```

---

## II. CẤU TRÚC PHÂN CẤP KHÔNG GIAN LƯU TRỮ (5 CẤP ĐỘ GSP)

Không gian kho được chuẩn hóa thành **5 cấp độ quản lý** từ vĩ mô đến vị trí vi mô từng sản phẩm:

| Cấp độ | Tên gọi | Định danh | Ý nghĩa nghiệp vụ | Sức chứa chuẩn hóa |
| :--- | :--- | :--- | :--- | :--- |
| **Cấp 1** | **Khu vực (Zone)** | `zone: "A" .. "F"` | Phân khu cách ly theo nhóm tác dụng dược lý chuẩn GSP. | 6 Khu (mỗi khu 4 dãy kệ = 160 thùng) |
| **Cấp 2** | **Dãy Kệ (Rack)** | `rack: "A1" .. "F4"` | Dãy kệ chứa hàng vật lý trong từng khu (4 kệ/khu). | 24 Dãy kệ toàn kho (mỗi kệ 40 thùng) |
| **Cấp 3** | **Tầng Kệ (Shelf)** | `shelf: 1 .. 4` | Tầng chứa hàng của kệ (4 tầng: T1..T4). | 96 Tầng kệ toàn kho |
| **Cấp 4** | **Ô Thùng (Bin)** | `bin: 1 .. 10` | **Đơn vị ô thùng vật lý (10 thùng/tầng). Mỗi thùng quy hoạch duy nhất 1 loại thuốc.** | **960 Thùng hàng toàn kho** (Sức chứa: 200 đơn vị/thùng) |
| **Cấp 5** | **Lô Hàng (Batch)** | `batchId`, `batchNo` | Thực thể hàng hóa thực tế được xếp trong thùng, mang số lô, hạn dùng (`expDate`) và số lượng tồn kho. | Nhiều lô cùng 1 thuốc trong 1 thùng |

### 1. Chi tiết phân vùng theo Danh mục GSP (`categoryZoneMap`):

```typescript
const categoryZoneMap: Record<string, string> = {
  // Khu A: Kháng sinh, Kháng virus, Kháng nấm, Kháng viêm
  'Kháng sinh': 'A', 'Thuốc kháng sinh': 'A', 'Siro kháng sinh': 'A',
  'Thuốc kháng viêm': 'A', 'Thuốc kháng nấm': 'A', 'Thuốc kháng virus': 'A',
  
  // Khu B: Giảm đau, Hạ sốt, Hô hấp, Cảm cúm, Tai mũi họng
  'Giảm đau, hạ sốt': 'B', 'Thuốc giảm đau hạ sốt': 'B', 'Thuốc ho': 'B',
  'Siro trị ho cảm': 'B', 'Thuốc trị ho cảm': 'B', 'Thuốc tai mũi họng': 'B',
  
  // Khu C: Tim mạch, Huyết áp, Tuần hoàn máu, Chống đông
  'Thuốc tim mạch': 'C', 'Thuốc tim mạch, Huyết áp': 'C', 'Thuốc hạ áp': 'C',
  'Thuốc tăng cường tuần hoàn não': 'C', 'Thuốc chống đông máu': 'C',
  
  // Khu D: Tiêu hóa, Dạ dày, Gan mật, Men vi sinh
  'Thuốc tiêu hóa': 'D', 'Thuốc dạ dày': 'D', 'Thuốc dạ dày, tiêu hóa': 'D',
  'Thuốc gan mật': 'D', 'Probiotic': 'D', 'Thuốc trị tiêu chảy': 'D',
  
  // Khu E: TPCN, Da liễu, Dinh dưỡng, Vitamin, Nội tiết
  'Thực phẩm chức năng': 'E', 'Vitamin & Khoáng chất': 'E', 'Thuốc bôi ngoài da': 'E',
  'Thuốc dị ứng': 'E', 'Thuốc đặt âm đạo': 'E', 'Dung dịch vệ sinh phụ nữ': 'E',
  
  // Khu F: Tiểu đường, Thần kinh, Cơ xương khớp, Vật tư y tế
  'Thuốc tiểu đường': 'F', 'Thuốc trị tiểu đường': 'F', 'Thuốc thần kinh': 'F',
  'Vật tư y tế': 'F', 'Khẩu trang': 'F', 'Bơm kim tiêm': 'F'
};
```

### 2. Quy chuẩn đơn vị tính thuốc thực tế:
Hệ thống hiển thị chuẩn xác đơn vị tính đóng gói của từng loại thuốc, không dùng đơn vị giả định:
* **Hộp:** Áp dụng cho các loại thuốc viên vỉ, gói bột, cao dán đóng hộp (ví dụ: *Citropholi, Yumangel, Salonsip, Glibenclamid, Tenricy*).
* **Chai / Lọ:** Áp dụng cho siro thuốc, dung dịch uống, thuốc nhỏ mắt (ví dụ: *Siro ho Prospan, Thuốc nhỏ mắt Refresh Tears, Dầu nóng OPC*).
* **Tuýp:** Áp dụng cho gel bôi, kem bôi da liễu (ví dụ: *Betacylic Mekophar, Canesten Cream*).
* **Gói:** Áp dụng cho bột pha hỗn dịch, men tiêu hóa, oresol.

---

## III. LOGIC "1 THÙNG = 1 LOẠI THUỐC" & PHÂN LUỒNG FEFO DỰ TRỮ

### 1. Nguyên tắc Bất biến: 1 Thùng Vật Lý = 1 Loại Thuốc Duy Nhất
* Mỗi ô thùng `(zone, rack, shelf, bin)` chỉ được gán cho **duy nhất 1 mã thuốc (`medicineId`)**.
* Tuyệt đối không cho phép 2 loại thuốc khác nhau cùng chia sẻ một vị trí thùng chính (`slotType: 'MAIN'`), đảm bảo chống nhầm lẫn thuốc theo chuẩn GSP.
* Tổng số thùng picking chính của kho là **960 thùng** (6 Khu x 4 Kệ x 4 Tầng x 10 Thùng).

### 2. Xử lý khi một thuốc có nhiều lô hàng (Multi-Batch):
Một mặt hàng thuốc có thể có nhiều đợt nhập tạo thành các lô (`batchNo`) với hạn dùng (`expDate`) khác nhau:
* **Lô mới nhập:** Được xếp vào thùng chính của thuốc đó (`slotType: 'MAIN'`).
* **Lô cũ đang có sẵn (nguy cơ cận hạn hơn):** Hệ thống tự động kích hoạt cờ `hasReserveBatch` và điều hướng lô cũ vào **Khu Kệ Dự Trữ FEFO (`slotType: 'RESERVE'`)**.
* **Ưu tiên xuất kho:** Thủ kho khi tạo phiếu xuất hàng hoặc mở chi tiết thùng sẽ nhận được cảnh báo nổi bật:
  $$\text{Ưu tiên xuất lô tại Khu Dự Trữ trước} \longrightarrow \text{Sau đó mới xuất lô trong Thùng Chính}$$

### 3. Thuật toán sắp xếp hiển thị FEFO:
Tất cả các danh sách lô hàng trong một thùng hoặc một tầng kệ đều được sắp xếp tự động theo thứ tự hạn sử dụng tăng dần:

$$\text{Sort Order} = \text{Date}(\text{expDate}_A) - \text{Date}(\text{expDate}_B)$$

Lô có hạn sử dụng gần nhất luôn hiển thị trên cùng để thủ kho thao tác xuất kho nhanh chóng.

---

## IV. QUY TẮC MÃ MÀU & TRẠNG THÁI CẢNH BÁO (COLOR CODING)

### 1. Phân định trạng thái từng Lô (`Batch Status`)
| Trạng thái | Ngưỡng điều kiện | Mã màu UI | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **`EXPIRED`** | $\text{expDate} < \text{Hôm nay}$ | 🔴 Đỏ | Lô thuốc đã hết hạn, lập tức khóa xuất để chờ hủy. |
| **`NEAR_EXPIRY`** | $\text{Hôm nay} \le \text{expDate} \le \text{Hôm nay} + 90\text{ ngày}$ | 🟠 Cam | Thuốc cận date (dưới 3 tháng), ưu tiên xuất trước (FEFO). |
| **`LOW_STOCK`** | $\text{Stock} < 20\text{ đơn vị}$ hoặc $\text{Tồn} / \text{Sức chứa} < 20\%$ | 🟡 Vàng | Cảnh báo sắp hết hàng, cần tạo đề xuất mua hàng. |
| **`NORMAL / ACTIVE`** | Còn hạn $> 90\text{ ngày}$ & $\text{Stock} \ge 20$ | 🟢 Xanh lá | Tồn kho an toàn, chất lượng đảm bảo. |
| **`EMPTY`** | $\text{Stock} = 0$ hoặc ô thùng chưa gán thuốc | ⚪ Xám | Ô thùng đang trống, sẵn sàng tiếp nhận hàng mới. |

### 2. Trạng thái Thùng Hàng (`Bin Status`) trên Sơ đồ 10 Thùng:
Trạng thái của ô thùng B1..B10 phản ánh tình trạng của các lô hàng thực tế đang nằm trong thùng đó:
* Nếu thùng có bất kỳ lô nào bị **`EXPIRED`** $\rightarrow$ Thùng viền đỏ, cảnh báo nguy cơ thuốc hết hạn.
* Nếu thùng có lô **`NEAR_EXPIRY`** $\rightarrow$ Thùng viền cam, biểu tượng đồng hồ cảnh báo.
* Nếu thùng có thuốc nhưng tồn kho thấp $\rightarrow$ Thùng viền vàng `LOW_STOCK`.
* Nếu thùng hoạt động bình thường $\rightarrow$ Thùng viền xanh lá, hiển thị tên thuốc (rút gọn 3 từ đầu) và số lượng tồn.
* Nếu thùng chưa có hàng $\rightarrow$ Thùng viền nét đứt xám, biểu tượng dấu cộng `+ Trống`.

---

## V. CÁC TÍNH NĂNG CHÍNH TRÊN GIAO DIỆN (FRONTEND FEATURES)

### 1. Bản đồ tổng quan 2D & Lưới 10 Thùng Kệ (RackBinGrid & BinCell)
* **Chế độ thu gọn (Collapsed):** Hiển thị tổng quan các Kệ với 4 nút Tầng (T1..T4), thể hiện tổng tồn kho gộp và số lượng lô hàng.
* **Chế độ mở rộng (Expanded):** Khi nhấp vào thanh tiêu đề của Kệ, giao diện mở bung lưới **4 Tầng x 10 Thùng = 40 Ô Thùng Bins** trực quan.
* Mỗi ô `BinCell` thể hiện:
  * Số thứ tự thùng: `B1` đến `B10`.
  * Tên thuốc chính xác (kèm tooltip tên đầy đủ).
  * Số lượng tồn kho và đơn vị tính (`Hộp`, `Chai`, `Tuýp`...).
  * Biểu tượng hòm lưu trữ 📦 màu cam nếu thuốc có lô cũ tại Khu Kệ Dự Trữ.

### 2. Hộp thoại Đa chế độ (ShelfDetailModal: Shelf Mode & Bin Mode)
* **Chế độ Xem Cả Tầng (Shelf Mode - khi click nút Tầng T1..T4):**
  * Hiển thị danh sách tất cả các lô thuốc đang có trên tầng kệ.
  * **Cột huy hiệu Thùng:** Mỗi dòng thuốc có huy hiệu vị trí cụ thể (`B1`, `B2`... `B10`) giúp đối chiếu 1-1 ngay lập tức với sơ đồ 10 thùng.
  * Nút **"Khóa Lô"** cho phép thủ kho cô lập nhanh chóng lô thuốc hỏng hoặc hết hạn.
* **Chế độ Xem Từng Thùng (Bin Mode - khi click trực tiếp vào ô Thùng B1..B10):**
  * Thanh tiến trình trực quan hóa sức chứa (ví dụ: `174 / 200 Hộp (87%)`).
  * Bảng cảnh báo FEFO danh sách các lô cũ tại **Khu Dự Trữ** cần ưu tiên xuất trước.
  * Bảng danh sách các lô hàng đang bán tại **Thùng Chính (MAIN)**.

### 3. Bảng điều khiển Khu Kệ Dự Trữ FEFO (ReserveBatchesPanel)
* Drawer trượt từ dưới lên, hỗ trợ **2 chế độ xem linh hoạt**:
  * **Chế độ Bảng Danh Sách (Table View):** Liệt kê chi tiết các lô thuốc với đầy đủ thông tin thuốc, số lô, hạn dùng, số lượng tồn và **cột Vị trí Ô Thùng chuẩn hóa** (`Kệ RES1/RES2/RES3/RES4 · Tầng 1..4 · Thùng B1..B10`).
  * **Chế độ Sơ Đồ Phân Kệ & Ô Thùng (Rack & Bin Grid):** Cho phép chọn từng Kệ Dự Trữ (`RES1`, `RES2`, `RES3`, `RES4`), xem trực quan 4 Tầng và 10 Ô Thùng (B1..B10) của từng tầng với tên thuốc, số lượng tồn và trạng thái FEFO.
* Khi click vào một lô dự trữ hoặc ô thùng dự trữ, hệ thống mở ngay `ShelfDetailModal` hoặc cuộn đến vị trí để kiểm tra và dời ô.

### 4. Quy Chuẩn Phân Kệ & Ô Thùng Khu Dự Trữ (Reserve Zone Architecture)
* **Xóa bỏ tình trạng để lộn xộn:** Khu Dự Trữ được quy hoạch chuẩn hóa thành **4 Dãy Kệ (`RES1`, `RES2`, `RES3`, `RES4`)**, mỗi kệ có **4 Tầng (T1..T4)**, mỗi tầng có **10 Ô Thùng (B1..B10)**, tạo ra tổng cộng **160 ô thùng vật lý**.
* **Đặc quyền Lưu trữ Đệm:** Không bị giới hạn bởi quy tắc cứng 1 thùng 1 loại thuốc của các kệ chính A-F. Cho phép lưu trữ hỗn hợp nhiều loại thuốc hoặc nhiều lô hàng khác nhau phục vụ đệm tồn kho và điều chuyển.
* **Cơ chế Nút Bấm Sổ Kệ Dự Trữ:** Trên bản đồ tổng quan 2D, các kệ dự trữ mặc định được thu gọn để tránh lộn xộn. Chỉ khi người dùng bấm nút **"📂 Bấm để sổ ra các kệ của Khu Dự Trữ (RES1, RES2, RES3, RES4)"** thì hệ thống mới bung danh sách các kệ và lưới 10 ô thùng.
* **Hỗ trợ Dời Ô Toàn Diện (RelocateBinModal):** Khi dời ô sang Khu Dự Trữ, giao diện cho phép chọn chính xác Kệ Dự Trữ (`RES1`, `RES2`, `RES3`, `RES4`), Tầng (1..4) và Ô Thùng (B1..B10) đích, xóa bỏ hoàn toàn lỗi giao diện và tình trạng dồn cục vô định hình.

---

## VI. KIẾN TRÚC MICROSERVICES & KAFKA PROTOCOLS

```
[ Client: React 19 Web / Expo Mobile ]
               │
               ▼ (HTTP REST)
      [ API Gateway :3000 ]  <───> [ Redis Cache ]
               │
               ▼ (Kafka Event-Driven)
     [ inventory-service ]
               │
               ▼
       [ MongoDB Atlas ]
```

### Danh mục Kafka Topics phục vụ Sơ Đồ Kho:

| Tác vụ | Kafka Topic | Payload đầu vào | Kết quả trả về |
| :--- | :--- | :--- | :--- |
| **Lấy Sơ đồ tổng thể** | `inventory.medicine.warehouse_map` | `{}` | Cây phân cấp Zone -> Rack -> Shelves kèm trạng thái gộp |
| **Lấy Layout 10 Thùng của Kệ** | `inventory.medicine.shelf.layout` | `{ zone, rack }` | Mảng 4 tầng, mỗi tầng 10 thùng B1..B10 chi tiết |
| **Lấy Chi tiết tầng kệ** | `inventory.medicine.shelf_detail` | `{ zone, rack, shelf }` | Danh sách các lô hàng đã sắp xếp theo Bin và FEFO |
| **Lấy Chi tiết 1 thùng** | `inventory.medicine.bin.detail` | `{ zone, rack, shelf, bin }` | Thông tin sức chứa, lô thùng chính và lô dự trữ |
| **Lấy Danh mục Lô Dự Trữ** | `inventory.medicine.reserve.list` | `{ branchId?: string }` | Toàn bộ các lô cũ đang nằm tại Khu Dự Trữ |
| **Khóa Lô (Cách ly)** | `inventory.medicine.batch.quarantine` | `{ batchId, reason }` | Cập nhật trạng thái lô thành `QUARANTINED` |
| **Tìm kiếm vị trí thuốc** | `inventory.medicine.warehouse_search` | `{ q: string }` | Tọa độ `targetId` để kích hoạt hiệu ứng phát sáng |

---

## VII. NHẬT KÝ SỰ CỐ & GIẢI PHÁP ĐỒNG BỘ TOÀN DIỆN (POST-MORTEM & RESOLUTIONS)

Phần này ghi lại chi tiết các vấn đề nghiêm trọng phát sinh trong quá trình vận hành thực tế sơ đồ kho, nguyên nhân gốc rễ và giải pháp kỹ thuật đã áp dụng để đưa hệ thống về trạng thái **chuẩn xác 100%**.

### 1. Sự Cố Lệch Dữ Liệu: Modal Chi Tiết Kệ (Hình 1) vs Sơ Đồ 10 Thùng (Hình 2)

#### 🛑 Hiện tượng lỗi:
Khi người dùng kiểm tra **Kệ A1 — Tầng 4**:
* **Hình 1 (Modal Chi Tiết):** Hiển thị 7 loại thuốc với tổng số lượng tồn là **673 đơn vị** (bao gồm *Citropholi 174, Prospan 145, Yumangel 121, Canesten 95, Tenricy 68, Glibenclamid 65...*).
* **Hình 2 (Sơ Đồ Kệ):** 10 ô thùng B1..B10 lại hiển thị tên các loại thuốc hoàn toàn khác (*Dầu nóng Mặt Trời, Duchat, Gyfor, Entecavir, Betacylic...*), tổng số lượng tồn là **784 đơn vị** (chênh lệch **111 đơn vị**).
* Một số ô thùng có thuốc thực tế nhưng trên sơ đồ lại hiển thị là ô trống (`EMPTY`).

---

#### 🔍 Điều tra Nguyên nhân Gốc rễ (Root Cause Analysis):

Sau khi chạy các bộ script audit cấp thấp (`audit-shelf-mismatch.js`, `deep-audit-shelf.js`), đội ngũ phát triển phát hiện **3 nguyên nhân kỹ thuật mang tính hệ thống**:

1. **Bộ lọc trạng thái API bất đối xứng (`status: 'ACTIVE'` vs `stock: { $gt: 0 }`):**
   * Hàm `getShelfDetail` (phục vụ Hình 1) truy vấn MongoDB với bộ lọc cứng:
     ```typescript
     // medicine.service.ts cũ:
     this.batchModel.find({ zone, rack, shelf, status: 'ACTIVE' })
     ```
   * Trên Kệ A1 Tầng 4 thực tế có 2 lô thuốc bị hết hạn (`status: 'EXPIRED'`):
     * *Thuốc nhỏ mắt Refresh Tears:* **92 lọ**
     * *Thuốc Henex 500mg:* **10 hộp**
     * *Lô lẻ Salonpas:* **9 đơn vị**
     * Tổng cộng: $92 + 10 + 9 = \mathbf{111\text{ đơn vị}}$.
   * Do `status = 'EXPIRED'`, hàm `getShelfDetail` đã loại bỏ hoàn toàn các lô này ra khỏi danh sách hiển thị của Modal Hình 1!
   * Trong khi đó, hàm `getShelfLayout` (phục vụ Hình 2) lại truy vấn theo điều kiện `stock: { $gt: 0 }` nên tính cả 111 đơn vị này $\rightarrow$ **Dẫn đến chênh lệch đúng 111 đơn vị giữa 2 màn hình**.

2. **Vi phạm nguyên tắc "1 Thùng = 1 Loại Thuốc" do lỗi Seeding & Gán Vị Trí:**
   * Trong cơ sở dữ liệu ban đầu, có các lô test nhỏ (số lượng chỉ 1 - 2 đơn vị như *Dầu nóng Mặt Trời stock 1, Domperidon stock 1, Duchat stock 2, Entecavir stock 2...*) bị nhét trùng vào các ô thùng B1..B10 của A1 Tầng 4.
   * Khi script gán vị trí cũ (`distribute-warehouse-bins.js`) chạy, nó ghi đè collection `medicinelocations` bằng tên của các thuốc test này thay vì thuốc chính.
   * Khi hàm `getShelfLayout` đọc dữ liệu, nó ưu tiên lấy tên thuốc từ `medicinelocations` $\rightarrow$ Khiến sơ đồ 10 thùng hiển thị tên thuốc test thay vì tên thuốc có khối lượng lớn mà người dùng thấy ở Modal Hình 1.

3. **Ô Thùng Ma & Lô Mồ Côi Toàn Kho:**
   * Audit toàn bộ 96 tầng kệ phát hiện:
     * **293 bản ghi** trong `medicinelocations` có vị trí thùng nhưng tồn kho thực tế bằng 0 (Ô thùng ma).
     * **60 lô hàng** có tồn kho thực tế trên kệ nhưng không có bản ghi tương ứng trong `medicinelocations` (Lô mồ côi $\rightarrow$ hiển thị thành ô trống `EMPTY` sai).
     * **84 lô hàng** của các chi nhánh bán lẻ (`BR-001`, `BR-002`...) bị gán nhầm vị trí vào kho tổng `CENTRAL_WH`.

---

#### 🛠️ Các Bước Giải Quyết Triệt Để Đã Thực Hiện:

##### Bước 1: Chuẩn hóa & Tái phân bổ dữ liệu sạch (`sync-warehouse-clean.js`)
* Sử dụng cơ chế `bulkWrite` siêu tốc cập nhật trực tiếp cơ sở dữ liệu MongoDB:
  * Gỡ bỏ toàn bộ vị trí kho tổng khỏi các lô thuộc chi nhánh bán lẻ (`BR-001` đến `BR-004`).
  * Khóa cố định **10 loại thuốc thực tế chuẩn GSP** cho **Kệ A1 — Tầng 4** từ Thùng B1 đến Thùng B10:
    * Thùng B1: *Cao dán Salonsip Gel* (333 Hộp)
    * Thùng B2: *Thuốc Citropholi Mộc Hoa Tràm* (174 Hộp)
    * Thùng B3: *Siro ho Prospan Engelhard* (145 Chai)
    * Thùng B4: *Thuốc nhỏ mắt Refresh Tears* (92 Chai/Lọ)
    * Thùng B5: *Miếng dán Tiger Balm Plaster* (32 Hộp)
    * Thùng B6: *Hỗn dịch uống Yumangel Yuhan* (121 Hộp)
    * Thùng B7: *Thuốc Henex 500mg Abbott* (10 Hộp)
    * Thùng B8: *Viên đặt âm đạo Canesten 1 Day* (95 Hộp)
    * Thùng B9: *Thuốc Tenricy 0.5mg Phil* (68 Hộp)
    * Thùng B10: *Thuốc Glibenclamid Domesco* (65 Hộp)
  * Rải đều tất cả các loại thuốc còn lại toàn kho vào 950 ô thùng khả dụng (1 thùng = 1 loại thuốc duy nhất). Các lô vượt dung tích hoặc lô cũ được dời vào Khu Dự Trữ (`slotType: 'RESERVE'`).
  * Xóa sạch và tái lập toàn bộ **960 bản ghi `medicinelocations` mới**, đảm bảo phản chiếu chính xác 1-1 với từng lô hàng thực tế.

##### Bước 2: Đồng bộ Backend Service (`medicine.service.ts`)
* **Sửa hàm `getShelfDetail`:** Bỏ lọc cứng `status: 'ACTIVE'`, mở rộng để nhận tất cả các lô còn tồn kho vật lý (`stock > 0`, `status: { $nin: ['REMOVED', 'DELETED'] }`). Nhờ đó, các lô cận hạn hoặc hết hạn đều xuất hiện trên Modal với nhãn trạng thái trực quan để thủ kho thực hiện thao tác cách ly/khóa lô.
* Bổ sung trường `bin` và thuật toán sắp xếp kép: Ưu tiên sắp xếp theo số thứ tự thùng `bin` tăng dần, sau đó theo hạn dùng `expDate`.
* **Sửa hàm `getShelfLayout`:** Đồng bộ điều kiện query, ưu tiên đọc thông tin thuốc trực tiếp từ lô hàng thực tế (`Single Source of Truth`).

##### Bước 3: Nâng cấp Giao diện Frontend (`ShelfDetailModal.tsx` & `WarehouseMap2D.tsx`)
* Bổ sung huy hiệu vị trí thùng `B1` .. `B10` ngay cạnh tên thuốc trong bảng Modal Chi tiết tầng kệ, giúp đối chiếu trực quan tức thì với sơ đồ 10 thùng.
* Sửa liên kết định danh `_id` để kích hoạt tính năng **Khóa Lô (Quarantine)** cách ly thuốc hết hạn trực tiếp từ giao diện.
* Khắc phục lỗi khai báo kiểu TypeScript JSX `BinCellProps` trong React 19.

---

### 2. Bảng Kết Quả Đối Soát Thực Tế Kệ A1 — Tầng 4 (Sau Khi Fix)

Kết quả chạy script kiểm chứng tự động [`verify-shelf-consistency.js`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/backend/scripts/verify-shelf-consistency.js):

| Vị trí | Tên Thuốc | Hình 1 (Modal Chi Tiết) | Hình 2 (Sơ Đồ Kệ) | Đơn vị tính | Trạng thái đối soát |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **Thùng B1** | Cao dán Salonsip Gel - Patch Hisamitsu | **333** | **333** | Hộp | ✅ **Khớp 100%** |
| **Thùng B2** | Thuốc Citropholi Mộc Hoa Tràm | **174** | **174** | Hộp | ✅ **Khớp 100%** |
| **Thùng B3** | Siro ho Prospan Engelhard | **145** | **145** | Chai | ✅ **Khớp 100%** |
| **Thùng B4** | Thuốc nhỏ mắt Refresh Tears Abbvie | **92** | **92** | Chai | ✅ **Khớp 100%** |
| **Thùng B5** | Miếng dán Tiger Balm Plaster - RD | **32** | **32** | Hộp | ✅ **Khớp 100%** |
| **Thùng B6** | Hỗn dịch uống Yumangel Yuhan | **121** | **121** | Hộp | ✅ **Khớp 100%** |
| **Thùng B7** | Thuốc Henex 500mg Abbott | **10** | **10** | Hộp | ✅ **Khớp 100%** |
| **Thùng B8** | Viên đặt âm đạo Canesten 1 Day 500mg | **95** | **95** | Hộp | ✅ **Khớp 100%** |
| **Thùng B9** | Thuốc Tenricy 0.5mg Phil | **68** | **68** | Hộp | ✅ **Khớp 100%** |
| **Thùng B10** | Thuốc Glibenclamid Domesco | **65** | **65** | Hộp | ✅ **Khớp 100%** |

---

### 3. Kết Quả Audit Toàn Bộ Kho Hàng (`full-warehouse-audit.js`)

```
======================================================================
TÓM TẮT AUDIT TOÀN BỘ KHO HÀNG GSP (96 TẦNG KỆ)
======================================================================
  Tổng số tầng kệ kiểm tra:        96 (6 Khu x 4 Kệ x 4 Tầng)
  Tổng số ô thùng quy hoạch:        960 Thùng B1..B10
  Vị trí ô thùng ma (không có tồn): 0
  Lô hàng mồ côi (không có vị trí): 0
  Trạng thái toàn hệ thống:         ✅ DỮ LIỆU ĐỒNG BỘ & NHẤT QUÁN 100%
======================================================================
```

* **Backend Compilation:** Lệnh `npm run build` của NestJS hoàn thành xuất sắc (Webpack compiled successfully).
* **Frontend Compilation:** Lệnh `npm run build` của Vite hoàn thành xuất sắc trong 37.23s, 0 lỗi cú pháp.

---

## VIII. TỔNG KẾT & QUY TRÌNH BẢO TRÌ BẢO DƯỠNG

1. **Chuẩn hóa GSP triệt để:** Việc phân định rõ ràng 5 cấp bậc lưu trữ (Zone -> Rack -> Shelf -> Bin -> Batch) cùng quy tắc "1 Thùng = 1 Loại Thuốc" giúp hệ thống vận hành chuyên nghiệp, loại bỏ hoàn toàn nguy cơ nhầm lẫn thuốc.
2. **Nguyên tắc Single Source of Truth:** Bất kỳ thao tác xem sơ đồ kho hay mở modal chi tiết đều truy xuất từ các lô hàng thực tế còn tồn kho, đảm bảo số liệu hiển thị luôn đồng nhất tuyệt đối giữa mọi góc nhìn của người dùng.
3. **Quy trình giám sát định kỳ:** Khi có đợt nhập kho lớn làm phát sinh số lượng thuốc vượt quá 960 thùng chính, hệ thống tự động đưa vào Khu Dự Trữ và cảnh báo thủ kho trên giao diện để có kế hoạch mở rộng dãy kệ hoặc điều chuyển hàng sang các chi nhánh bán lẻ.

---

## IX. CẬP NHẬT LUỒNG NGHIỆM THU NHẬP KHO (GRN) & ĐỒNG BỘ VỊ TRÍ SƠ ĐỒ KHO (15/10/2026)

### 1. Cơ Chế Auto-Fill Vị Trí Thông Minh Khi Nhập Hàng
* **Nghiệp vụ:** Khi một loại thuốc đã được quy hoạch vị trí trên kệ chính (`MAIN`), việc nhập thêm lô mới cho thuốc đó sẽ ưu tiên xếp vào đúng ô Thùng (Bin) hiện hữu.
* **Triển khai:** 
  * Ngay khi mở Modal Kiểm Đếm Tiếp Nhận (`IncomingOrdersTab.tsx`), hệ thống tự động gọi `inventoryMapService.warehouseSearch(medicineName)` cho từng sản phẩm.
  * Nếu thuốc đã có vị trí kệ chính, các dropdown `Khu (Zone) → Kệ (Rack) → Tầng (Shelf) → Thùng (Bin)` sẽ được tự động điền sẵn.
  * UI hiển thị hiệu ứng thông báo trạng thái: `Đang tự động tra cứu vị trí kho cho các thuốc...` kèm spinner.

### 2. Chuẩn Hóa Ánh Xạ Vị Trí (GRN → Sơ Đồ Kho)
* Khắc phục triệt để lỗi mất dữ liệu vị trí do lệch trường schema:
  * Trong Schema `GoodsReceiptNoteItem`, trường chuẩn là `shelvedLocation`.
  * Đã sửa `createGoodsReceiptNote()` và `verifyInspectionItem()` để đồng bộ lưu cả `shelvedLocation` và `location`.
  * Khi hàm `approveGoodsReceiptNote()` chạy, hệ thống đọc `locSource = item.shelvedLocation || item.location` và gán chính xác 100% vào `MedicineBatch.location`.
  * Sơ đồ kho 2D/3D lập tức hiển thị lô hàng mới đúng vào ô thùng đã chọn mà không bị rơi về mặc định `A1/1/1`.

### 3. Xử Lý Phê Duyệt Idempotent Chống Lỗi Xung Đột Kafka (HTTP 409)
* Khi gọi Kafka `inventory.grn.approve`, nếu gặp trễ mạng hoặc cơ chế retry của RxJS, backend xử lý theo hướng Idempotent:
  * Nếu `grn.status === "COMPLETED"`, backend trả về thành công an toàn (`success: true`) thay vì ném lỗi `RpcException 409`.
  * Frontend nhận phản hồi thành công, đóng modal kiểm đếm và hiển thị Toast màu xanh hoàn tất.

### 4. Khắc Phục Lỗi Tra Cứu Vị Trí Tự Động & Tối Ưu UX BinLocationPicker (15/10/2026)
* **Nguyên nhân cốt lõi gây lỗi:**
  * Trong `warehouseSearch()`, hàm kiểm tra ObjectId dùng cú pháp `mongoose.Types.ObjectId.isValid()`, nhưng file `medicine.service.ts` chỉ import `{ Model }` mà thiếu `Types`. Điều này dẫn đến ngoại lệ Runtime `ReferenceError: mongoose is not defined` (HTTP 500) mỗi khi API tra cứu vị trí được gọi.
  * Do backend ném lỗi 500, khối `catch(() => [])` ở Frontend rơi vào mảng rỗng, khiến form kiểm đếm luôn fallback về vị trí mặc định ban đầu là `Khu A → Kệ A1 → Tầng 1 → Thùng B1`.
  * Tại `A1-T1-B1`, hệ thống trong cơ sở dữ liệu thực tế đang chứa 306 hộp thuộc 3 lô thuốc khác (`Dung dịch Ringer Lactate...`), do đó component `BinLocationPicker` phát hiện ô này có 306 hộp cũ và hiển thị cảnh báo.
* **Biện pháp xử lý toàn diện:**
  1. **Backend:** Bổ sung `import { Model, Types } from 'mongoose'`, chuẩn hóa `Types.ObjectId` và mở rộng truy vấn `allMedIds` (kết hợp cả dạng string và ObjectId) trong `warehouseSearch()`. Đảm bảo API trả về HTTP 200 tức thì với vị trí chính xác của thuốc (Ví dụ: Siro Bisolvon Kids trả về đúng `Khu B → Kệ B1 → Tầng 1 → Thùng B9`).
  2. **Frontend `BinLocationPicker`:**
     - Phân định rõ ràng 2 trường hợp:
       * **Cùng loại thuốc:** Hiển thị Badge màu xanh xác nhận `📦 Ô thùng chuẩn của thuốc: Hiện có X đơn vị (Y lô cũ, cận date nhất: ...)`, thông báo lô mới sẽ được lưu cùng ô theo chuẩn FEFO.
       * **Khác loại thuốc:** Hiển thị Cảnh báo màu vàng `⚠️ Chú ý: Thùng ... đang chứa thuốc khác: ...! Chuẩn GSP yêu cầu mỗi ô chỉ chứa 1 loại thuốc`.
     - Tích hợp trạng thái `isLoading={isFillLocLoading}` để hiển thị skeleton spinner mượt mà trong khi tra cứu, không gây chớp nháy cảnh báo sai.

### 5. Cải Tiến Nghiệp Vụ FEFO: Chỉ Dời Sang Khu Dự Trữ Khi Thùng Bị Quá Tải (maxCapacity)
* **Thực trạng trước đây:** Hệ thống áp dụng quy tắc đơn nhất (Single Batch per Bin) khắt khe: cứ mỗi khi có 1 lô mới nhập về (dù chỉ 3 chai), toàn bộ các lô cũ trong thùng đó đều bị tự động chuyển sang `slotType = RESERVE` (Khu Dự Trữ). Điều này gây quá tải Khu Dự Trữ một cách không cần thiết và đi ngược lại thực tế vận hành khi ô thùng trên kệ vẫn còn trống đến hơn 90% sức chứa (`18/200 chai`).
* **Logic cải tiến thông minh:**
  * Hàm `relocateBatchesToReserve()` trong `purchase.service.ts` được nâng cấp:
    1. Kiểm tra tổng số lượng tồn dự kiến trong ô thùng: `projectedTotal = currentStock + incomingQty`.
    2. So sánh với sức chứa tối đa của ô thùng: `maxCapacity = locInfo.maxCapacity || 200`.
    3. **Nếu `projectedTotal <= maxCapacity`:** Giữ nguyên toàn bộ các lô cũ và lô mới cùng nằm trên Kệ Chính (`MAIN`), sắp xếp xuất kho tự nhiên theo thứ tự FEFO (lô cận date xuất trước).
    4. **Nếu `projectedTotal > maxCapacity`:** Chỉ tự động dời phần dôi dư (`overflow = projectedTotal - maxCapacity`) sang Khu Dự Trữ để đảm bảo an toàn tải trọng kệ.
* **Khôi phục dữ liệu:** Đã khôi phục toàn bộ các lô cũ của Siro Bisolvon Kids (`INIT-BATCH`, `TESTT10`, `TEST1510`) cùng với lô mới `LOT-15102026` về lại Kệ Chính ô Thùng `B1-T1-B9` (Tổng tồn 18 chai / sức chứa 200 chai).

### 6. Nâng Cấp Giao Diện Dropdown Mã Lô, Chọn Lô Dời Ô & Chức Năng Chuyển Khu Dự Trữ (15/10/2026)
* **1. Dropdown Mã Lô Từng Thùng Chuẩn UX:**
  * **Trước đây:** Cột "MÃ LÔ" tại Modal chi tiết tầng kệ chỉ hiển thị chuỗi text tĩnh như `TEST1-2106 (+5 lo)`.
  * **Nâng cấp:** Thay thế bằng nút Badge trực quan dạng `X Lô ▼` (`2 Lô ▼`, `6 Lô ▼`).
  * **Popover Hạn Sử Dụng Chi Tiết:** Khi bấm nút, hiển thị thẻ Popover card gồm:
    * Tiêu đề: *Hạn sử dụng chi tiết:*
    * Danh sách từng lô thuốc: `Lô: <Mã Lô>`, Hạn dùng `d/M/yyyy`, Số lượng tồn theo đơn vị (`137 Hộp`), và nhãn trạng thái (`Hoạt động`, `Cận date`, `Hết hạn`, `Cách ly`).
    * Tích hợp nút tác vụ nhanh "Dời ô" ngay cạnh từng lô trong popup để chuyển nhanh từng lô.
* **2. Chọn Lô Cụ Thể Khi Dời Ô (Relocate Bin):**
  * **Trước đây:** Chức năng chuyển vị trí / dồn kho chỉ cho phép dời nguyên cả thùng, không cho phép tách lô.
  * **Nâng cấp:** Modal `RelocateBinModal` bổ sung bộ chọn lô thông minh:
    * Cho phép chọn: *Chuyển toàn bộ các lô trong thùng* HOẶC *Chọn riêng một lô cụ thể*.
    * Hiển thị số lượng chuyển chính xác tương ứng với lô được chọn.
    * Backend `relocateBin` tiếp nhận `batchId` và chỉ cập nhật tọa độ cho lô được chỉ định.
* **3. Phân Định Rõ Ràng: Khu F Là Kệ Thông Thường, Khu Dự Trữ Là RESERVE (Reserve Zone):**
  * **Khu F (Kệ Chính):** Là khu vực chứa thiết bị & vật tư y tế/dược phẩm thông thường (A, B, C, D, E, F). Toàn bộ các kệ F1..F4 và thùng B1..B10 tuân thủ nguyên tắc 1 thùng 1 loại thuốc chuẩn GSP.
  * **Khu Dự Trữ (`RESERVE`):** Đây mới chính là Khu Dự Trữ thực sự của nhà kho.
    * Trong `RelocateBinModal`, tùy chọn **"📦 Khu Dự Trữ (Lưu Trữ Đệm Dự Phòng)"** cho phép thủ kho dời bất kỳ loại thuốc nào vào đây để đệm kho.
    * **Backend:** Khi đích đến là `RESERVE` (`isTargetReserve`), hệ thống miễn trừ kiểm tra xung đột 1 thùng 1 thuốc, gán `slotType = 'RESERVE'` và giữ nguyên vị trí bán chính tại quầy kệ của thuốc.
    * **Frontend:** Khi chọn Khu Dự Trữ, hệ thống tự động thiết lập tọa độ đệm, hiển thị hướng dẫn chi tiết và cho phép xác nhận chuyển tức thì mà không cần chọn tầng/thùng phức tạp.




