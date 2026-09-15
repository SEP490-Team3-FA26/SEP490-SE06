# TÀI LIỆU KỸ THUẬT: ĐẶC TẢ TOÁN HỌC & BỘ SINH MÃ GS1 EAN-13

---

## 1. CẤU TRÚC ĐỊNH DANH GS1 EAN-13 (13 CHỮ SỐ)

Chuẩn **EAN-13 (International Article Number)** là tiêu chuẩn mã vạch thương mại toàn cầu quản lý bởi tổ chức **GS1 Quốc Tế**.

```
  ┌──────────┬──────────────────────┬──────────┐
  │ Tiền tố  │  Mã Thuốc & Doanh    │ Checksum │
  │ Quốc gia │  nghiệp (9 chữ số)   │  (1 số)  │
  ├──────────┼──────────────────────┼──────────┤
  │ 8  9  3  │ x  x  x  x  x  x  x  x  x │    C     │
  └──────────┴──────────────────────┴──────────┘
```

1. **3 chữ số đầu (893):** Mã quốc gia Việt Nam do GS1 phân bổ.
2. **9 chữ số tiếp theo ($d_4 \dots d_{12}$):** Mã số định danh nội bộ phân bổ cho từng loại dược phẩm.
3. **1 chữ số cuối ($d_{13}$):** Chữ số kiểm tra (Modulo 10 Check Digit) bảo đảm tính toàn vẹn khi quét quang học.

---

## 2. THUẬT TOÁN TÍNH CHỮ SỐ KIỂM TRA (MODULO 10 CHECKSUM)

Cho dãy 12 chữ số đầu tiên: $D = (d_1, d_2, d_3, \dots, d_{12})$.

### Bước 1: Tính tổng trọng số (Weighted Sum)
Các chữ số ở vị trí lẻ (tính từ trái sang phải, chỉ số 1, 3, 5, 7, 9, 11) nhân trọng số **1**.
Các chữ số ở vị trí chẵn (chỉ số 2, 4, 6, 8, 10, 12) nhân trọng số **3**.

$$S = \sum_{k=1}^{6} d_{2k-1} \times 1 + \sum_{k=1}^{6} d_{2k} \times 3$$

### Bước 2: Tìm phần dư Modulo 10
$$R = S \pmod{10}$$

### Bước 3: Xác định chữ số kiểm tra $d_{13}$
$$d_{13} = \begin{cases} 0 & \text{nếu } R = 0 \\ 10 - R & \text{nếu } R \neq 0 \end{cases}$$

### Ví dụ Thực Tế:
Giả sử 12 chữ số đầu là: `893000378532`
- $S_{\text{lẻ}} = 8 + 3 + 0 + 3 + 8 + 3 = 25$
- $S_{\text{chẵn}} = 9 + 0 + 0 + 7 + 5 + 2 = 23 \implies 23 \times 3 = 69$
- $S = 25 + 69 = 94$
- $R = 94 \pmod{10} = 4$
- $d_{13} = 10 - 4 = \mathbf{6}$
$\implies$ Mã EAN-13 hợp lệ hoàn chỉnh: **`8930003785326`**.

---

## 3. CẤU TRÚC NHỊ PHÂN & BẢNG MÃ HÓA PARITY (95 MODULES)

Mỗi mã vạch EAN-13 khi in ra gồm đúng **95 đơn vị vạch (Modules)**:
- Vạch bảo vệ đầu (Start Guard): `101` (3 modules)
- 6 chữ số bên trái: $6 \times 7 = 42$ modules (mã hóa theo chuỗi Parity L-code và G-code dựa trên chữ số đầu tiên $d_1$)
- Vạch bảo vệ giữa (Center Guard): `01010` (5 modules)
- 6 chữ số bên phải: $6 \times 7 = 42$ modules (mã hóa theo R-code)
- Vạch bảo vệ cuối (End Guard): `101` (3 modules)
$$\text{Tổng số modules} = 3 + 42 + 5 + 42 + 3 = \mathbf{95\text{ modules}}$$

### Bảng Quy Tắc Parity L/G/R:
```typescript
const L_CODE = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G_CODE = ['0100111', '0110011', '0011011', '010001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R_CODE = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
```

---

## 4. BỘ KẾT XUẤT VECTOR SVG THUẦN (ZERO-DEPENDENCY SVG ENGINE)

Bộ sinh mã tại [barcodeGenerator.ts](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/utils/barcodeGenerator.ts) kết xuất hình ảnh trực tiếp thành các thẻ `<rect>` trong SVG:
- Độ phóng to vô hạn, không bị vỡ hạt như ảnh Bitmap (PNG/JPG).
- Máy in nhiệt và máy in laser giải mã chuẩn xác 100% trong mọi độ phân giải (DPI).
