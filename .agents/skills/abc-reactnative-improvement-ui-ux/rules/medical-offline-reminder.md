# medical-offline-reminder - Lịch Nhắc Uống Thuốc Offline & Không Phụ Thuộc Google / OS Push

## Tầm Quan Trọng (Impact: HIGH - Tuân thủ Rule 6 & Độ tin cậy y tế 100%)

Tuân thủ nghiêm ngặt **Quy định bất biến số 6** của dự án:
> Tuyệt đối **không** được sử dụng thông báo của Google (Google Notifications, FCM) hay thông báo của hệ điều hành / trình duyệt (`Notification.requestPermission()`, Web Notification API, native OS push). Mọi thông báo trong hệ thống **bắt buộc** phải sử dụng thông báo nội bộ trong ứng dụng (In-app Notifications qua Socket.IO, Toast, Dropdown thông báo).

Đối với tính năng nhắc uống thuốc:
- Lịch nhắc được tạo tự động 1-chạm từ đơn thuốc đã mua (`createRemindersFromOrder`).
- Áp dụng thuật toán **Cửa sổ trượt 7 ngày (Sliding Window)** lưu vào bộ nhớ cục bộ `AsyncStorage`.
- Khi đến giờ uống thuốc: phát chuông cảnh báo nội bộ (Notifee local notification / Audio in-app) kèm modal toàn màn hình yêu cầu xác nhận đã uống.

```tsx
// ✅ Mẫu tạo lịch nhắc tự động từ đơn hàng
const handleAutoSchedule = async (order: Order) => {
  const reminders = await createRemindersFromOrder(order);
  for (const rem of reminders) {
    await MedicineReminderService.scheduleReminderSlidingWindow(rem, 7);
  }
  showToast.success('Tạo lịch thành công', `Đã lập lịch nhắc uống cho ${reminders.length} loại thuốc.`);
};
```

