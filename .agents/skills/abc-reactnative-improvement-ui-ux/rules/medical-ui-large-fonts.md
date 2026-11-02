# medical-ui-large-fonts - Quy Chuẩn Chữ To & Thân Thiện Người Dùng Y Tế

## Tầm Quan Trọng (Impact: HIGH - Thân thiện người dùng lớn tuổi & Accessibility)

Người dùng mua thuốc, xem đơn thuốc và tra cứu sức khỏe trên thiết bị di động thường bao gồm đối tượng người trung niên, cao tuổi hoặc người đang trong trạng thái mệt mỏi, mắt kém.
Cỡ chữ quá nhỏ (<12px) hoặc quá nhiều dòng chữ phụ rối mắt làm giảm khả năng đọc hiểu đơn thuốc, gây nhầm lẫn liều dùng nguy hiểm.

## Quy Chuẩn Kích Thước Chữ (Typography Hierarchy)

| Thành phần UI | Kích thước chuẩn | Độ đậm (Font Weight) | Màu sắc khuyến nghị |
| :--- | :--- | :--- | :--- |
| **Giá tiền sản phẩm** | `18px - 22px` | `800` (Bold) | Đỏ `#DC2626` / Xanh `#0284C7` |
| **Tên thuốc chính** | `16px - 17.5px` | `700` (Bold) | Đen xám `#0F172A` |
| **Tiêu đề phân mục** | `15px - 16px` | `700` (Bold) | Xám đậm `#334155` |
| **Liều dùng / Hướng dẫn** | `13px - 14px` | `600` (Medium) | Xanh ngọc `#0E7490` |
| **Nút bấm hành động** | `14.5px - 16px` | `700` (Bold) | Trắng `#FFFFFF` |
| **Kích thước bấm chạm tối thiểu** | `44 x 44px` | - | `hitSlop` mở rộng tối thiểu 6-8px |

## Triển Khai Không Chuẩn (Incorrect: Chữ li ti, nhiều dòng phụ rườm rà)

```tsx
// ❌ SAI: Chữ 10-11px, nhồi nhét subtitle dài dòng
<View>
  <Text style={{ fontSize: 13, fontWeight: '400' }}>Paracetamol 500mg Hộp 100 viên nén</Text>
  <Text style={{ fontSize: 10, color: '#94A3B8' }}>Dược phẩm kê đơn theo tiêu chuẩn bộ y tế thông tư 02</Text>
  <Text style={{ fontSize: 12, fontWeight: '700' }}>15.000 đ</Text>
</View>
```

## Triển Khai Chuẩn (Correct: Rõ ràng, giá to đậm, lược bỏ chữ thừa)

```tsx
// ✅ ĐÚNG: Tên thuốc to rõ, giá bán nổi bật, không chữ phụ rối mắt
<View>
  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }} numberOfLines={2}>
    Paracetamol 500mg
  </Text>
  <Text style={{ fontSize: 19, fontWeight: '800', color: '#DC2626', marginTop: 4 }}>
    15.000 ₫
  </Text>
</View>
```

