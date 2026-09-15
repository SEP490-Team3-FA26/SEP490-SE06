# TÀI LIỆU KỸ THUẬT: HỆ THỐNG IN TEM NHÃN MÃ VẠCH NHIỆT (50x30mm)

---

## 1. TỔNG QUAN HỆ THỐNG IN TEM NHÃN DƯỢC PHẨM
Hệ thống in tem nhãn ([BarcodeLabelModal.tsx](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/components/BarcodeLabelModal.tsx)) giải quyết bài toán dán tem phụ và tem mã vạch định danh cho:
1. Thuốc nhập khẩu chưa có mã EAN chuẩn Việt Nam.
2. Thuốc bán lẻ tách vỉ / chia liều (mỗi vỉ lẻ hoặc lọ chiết được cấp 1 tem nhãn riêng).
3. Hàng hóa lưu kho định vị theo kệ trong kho chuẩn GSP.

---

## 2. QUY CÁCH KHỔ GIẤY & THIẾT KẾ TEM NHÃN

### 2.1. Khổ Tem Nhiệt Chuẩn Nhà Thuốc (50mm x 30mm)
Khổ giấy in tem nhiệt decal cuộn 1 hàng hoặc 2 hàng chuẩn:
- **Chiều rộng (Width):** $50\text{mm}$ (vùng in thực tế $48\text{mm}$).
- **Chiều cao (Height):** $30\text{mm}$ (vùng in thực tế $28\text{mm}$).
- **Margin:** $1.5\text{mm} - 2\text{mm}$.

```
┌──────────────────────────────────────────────┐
│ PHARMACHAIN GSP                   [  HỘP  ]  │ <- Header & Quy cách
├──────────────────────────────────────────────┤
│ Paracetamol 500mg Dược Hậu Giang             │ <- Tên thuốc (2 dòng)
│ SKU: MED-A12093           Giá: 45.000 đ      │ <- SKU & Giá niêm yết
├──────────────────────────────────────────────┤
│  || | |||| || ||||| |||| || ||| |||| |||||  │ <- Barcode SVG Vector
│               8930003785326                  │
├──────────────────────────────────────────────┤
│ HSD: 2027-12-31         ✓ Đạt chuẩn GSP      │ <- Hạn dùng & Chứng nhận
└──────────────────────────────────────────────┘
```

---

## 3. CƠ CHẾ IN TRỰC TIẾP QUA TRÌNH DUYỆT (DIRECT PRINT CSS)

Hệ thống sử dụng kỹ thuật mở cửa sổ in ngầm với CSS `@page` chuyên dụng cho máy in nhiệt (Xprinter, HPRT, Bixolon, Zebra):

```html
<style>
  @page {
    size: 50mm 30mm;
    margin: 1.5mm;
  }
  body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
  }
  .label-item {
    width: 47mm;
    height: 27mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-inside: avoid;
  }
</style>
```

---

## 4. TÍNH NĂNG NỔI BẬT CỦA GIAO DIỆN
1. **Xem trước thời gian thực (Live Visual Preview):** Dược sĩ có thể nhìn thấy tem nhãn hiển thị trực quan trước khi bấm in.
2. **Chọn quy cách đóng gói (Multi-unit Selection):** Dễ dàng chuyển đổi in tem cho Hộp, Vỉ hoặc Viên lẻ với giá bán tương ứng được tự động tính toán.
3. **Sinh lại mã EAN-13 tức thì (One-Click Regenerate):** Cho phép làm mới mã vạch EAN-13 khi cần cấp lại mã định danh mới.
4. **Tùy chọn số lượng in linh hoạt:** Nhập số lượng tem từ 1 đến 100 tem trên một lệnh in.
