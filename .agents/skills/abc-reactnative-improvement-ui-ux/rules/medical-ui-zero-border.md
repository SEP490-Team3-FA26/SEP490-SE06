# medical-ui-zero-border - Quy Chuẩn Thiết Kế Zero-Border (Chuẩn FPT Long Châu & Hiện Đại)

## Tầm Quan Trọng (Impact: HIGH - Cải thiện tính thẩm mỹ & thị giác y tế)

Việc bọc các khối giao diện trong các đường viền cứng nhắc (`borderWidth: 1`, `borderColor: '#E2E8F0'`) khiến màn hình ứng dụng di động bị chia cắt vụn vặt, nặng nề và tạo cảm giác ngột ngạt khi hiển thị nhiều nhóm dược phẩm.
Thiết kế **Zero-Border** sử dụng nền tổng thể màu xám dịu nhạt (`#F8FAFC` hoặc `#F1F5F9`), các thẻ nội dung màu trắng (`#FFFFFF`) bo góc lớn mềm mại (`borderRadius: 16` - `20px`), kết hợp đổ bóng tự nhiên nhẹ (`shadowOpacity: 0.04 - 0.06`, `elevation: 2 - 3`) giúp mắt người dùng dễ dàng lướt qua thông tin mà không bị xao nhãng.

## Triển Khai Không Chuẩn (Incorrect: Dùng border dày đặc bọc mọi thẻ)

```tsx
// ❌ SAI: Bọc viền border cứng nhắc quanh mọi component, tạo cảm giác chật chội
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1', // Viền cứng gây nặng mắt
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#94A3B8',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
```

## Triển Khai Chuẩn (Correct: Zero-Border với Shadow mềm mại và khoảng cách thoáng)

```tsx
// ✅ ĐÚNG: Nền thẻ trắng tinh, bo tròn 16px, không border, đổ bóng tự nhiên
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // Bo góc lớn mềm mại
    padding: 16,
    // Không dùng borderWidth hay borderColor
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#F0F9FF', // Phân biệt bằng nền màu pastel thay vì border
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
```

