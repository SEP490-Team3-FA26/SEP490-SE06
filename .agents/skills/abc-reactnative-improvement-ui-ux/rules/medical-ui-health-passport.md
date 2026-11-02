# medical-ui-health-passport - Tích Hợp Sổ Sức Khỏe Số & Đối Soát Lâm Sàng

## Tầm Quan Trọng (Impact: CRITICAL - An toàn tính mạng bệnh nhân & Tiêu chuẩn GPP)

Trong hệ thống nhà thuốc ABC PHARMACY (WDP301/SEP490), mọi tương tác bán lẻ và đặt hàng đều phải bảo đảm an toàn dược lý:
1. Không bán thuốc chứa hoạt chất mà khách hàng bị dị ứng.
2. Cảnh báo tương tác thuốc nguy hiểm với bệnh nền mãn tính (viêm loét dạ dày, suy gan, suy thận, tim mạch).
3. Hỗ trợ hiển thị Mã QR Sổ Sức Khỏe Số (Digital Health Passport) để quét tại quầy offline.

## Luồng Tích Hợp Giao Diện

1. **Thẻ Sổ Sức Khỏe Trên Tab Tài Khoản:**
   - Đặt ngay sau khối Đơn của tôi.
   - Thẻ hiển thị tóm tắt: Nhóm máu, số lượng dị ứng, trạng thái bệnh nền.
   - Chạm vào mở `DigitalHealthPassportModal`.
2. **Cảnh Báo Lâm Sàng Trước Khi Mua Hàng:**
   - Tự động đối chiếu thành phần thuốc với danh sách `allergicIngredients` của bệnh nhân.
   - Nếu phát hiện dị ứng: chặn thanh toán hoặc hiển thị cảnh báo đỏ nổi bật, yêu cầu xác nhận chuyên môn của Dược sĩ.

```tsx
// ✅ Mẫu kiểm tra tương tác lâm sàng nhanh phía Client
export function checkPatientAllergyConflict(
  medicineIngredients: string[],
  patientAllergies: string[]
): { hasConflict: boolean; conflictingIngredient?: string } {
  if (!medicineIngredients?.length || !patientAllergies?.length) {
    return { hasConflict: false };
  }
  const cleanPatientAllergies = patientAllergies.map((a) => a.toLowerCase().trim());
  for (const ing of medicineIngredients) {
    if (cleanPatientAllergies.includes(ing.toLowerCase().trim())) {
      return { hasConflict: true, conflictingIngredient: ing };
    }
  }
  return { hasConflict: false };
}
```

