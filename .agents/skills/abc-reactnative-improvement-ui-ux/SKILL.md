---
name: abc-reactnative-improvement-ui-ux
description: Quy chuẩn tối ưu hóa toàn diện UI/UX và kiến trúc React Native & Expo cho dự án WDP301/SEP490: tích hợp 35+ quy tắc hiệu năng Vercel (FlashList, 60fps Reanimated, zero falsy-and crash, stable callbacks), các mẫu kiến trúc production (Expo Native Navigators, Offline-first Sync, Native Modals, Context Menus), và chuẩn thiết kế y tế Zero-Border (phong cách FPT Long Châu, font chữ to rõ cho người cao tuổi, Sổ sức khỏe số QR, lịch nhắc thuốc offline, kẹp bài test 3 nhóm giá trị chuẩn).
---

# Kỹ Năng Tối Ưu Hóa Toàn Diện UI/UX & Kiến Trúc React Native (`/abc-reactnative-improvement-ui-ux`)
### Hệ Thống ABC PHARMACY: Expo React Native Mobile • TypeScript • API Gateway • Kafka • Redis
### Tổng Hợp Tinh Hoa: Vercel React Native Skills + Production Architecture Patterns + Chuẩn Y Tế GPP Long Châu

Tài liệu này là **Cẩm Nang Quy Chuẩn Tối Cao (Master Blueprint & Actionable Recipe)** dành cho toàn bộ quá trình phát triển, tái cấu trúc (refactoring) và nâng cấp giao diện người dùng trên nền tảng ứng dụng di động React Native / Expo của hệ thống ABC PHARMACY (WDP301/SEP490).

---

## 1. Bản Đồ 4 Tầng Tối Ưu Hóa (The 4-Layer Improvement Matrix)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      ABC REACT NATIVE UI/UX IMPROVEMENT SUITE                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
           │                                │                                │                                │
           ▼                                ▼                                ▼                                ▼
   ┌───────────────┐                ┌───────────────┐                ┌───────────────┐                ┌───────────────┐
   │    TẦNG 1     │                │    TẦNG 2     │                │    TẦNG 3     │                │    TẦNG 4     │
   │CORE RENDERING │                │ ARCHITECTURE  │                │  MEDICAL UX   │                │ QA & TESTING  │
   │  & PERF RULES │                │  & NAVIGATION │                │ & ZERO-BORDER │                │   MANDATE     │
   ├───────────────┤                ├───────────────┤                ├───────────────┤                ├───────────────┤
   │• Zero Falsy-&&│                │• Native Stack │                │• Zero Border  │                │• Zero Untested│
   │• Text in Text │                │• Native Modal │                │• 16px Rounded │                │• Normal Tests │
   │• FlashList    │                │• Offline Sync │                │• Typography Lg│                │• Boundary Tsts│
   │• Stable Props │                │• SecureStore  │                │• Long Châu UI │                │• Abnormal Tsts│
   │• 60fps GPU Anim│               │• ErrorBoundary│                │• Health Passport│              │• VN Comments  │
   │• Scroll Shared│                │• Push & Notif │                │• CallStyle UI │                │• 0 Error TS   │
   └───────────────┘                └───────────────┘                └───────────────┘                └───────────────┘
```

---

## 2. Tầng 1: Quy Tắc Hiệu Năng & Chống Crash (Vercel Performance Rules)

### 2.1. Chống Crash Màn Hình Do Toán Tử `&&` (CRITICAL)

Tuyệt đối **KHÔNG** sử dụng `{value && <Component />}` khi `value` có thể là số `0` hoặc chuỗi rỗng `""`. Trong React Native, giá trị này sẽ bị render thành text nằm ngoài thẻ `<Text>`, gây crash ứng dụng lập tức trên bản Production.

```tsx
// ❌ SAI: Crash nếu count === 0 hoặc name === ""
{count && <Text>Số lượng: {count}</Text>}
{name && <Text>{name}</Text>}

// ✅ ĐÚNG: Dùng toán tử 3 ngôi (ternary) trả về null hoặc ép kiểu Boolean
{count > 0 ? <Text>Số lượng: {count}</Text> : null}
{Boolean(name) ? <Text>{name}</Text> : null}
```

### 2.2. Bọc Toàn Bộ Chuỗi Ký Tự Trong Thẻ `<Text>` (CRITICAL)

Mọi ký tự, khoảng trắng, biến số đều bắt buộc phải nằm bên trong `<Text>`. Tuyệt đối không để chuỗi rơi trực tiếp vào `<View>`.

```tsx
// ❌ SAI: Ký tự hoặc khoảng trắng nằm ngoài Text
<View>
  Giá: <Text>{price}</Text> ₫
</View>

// ✅ ĐÚNG: Toàn bộ nằm trong Text
<Text style={styles.priceText}>
  Giá: {price.toLocaleString('vi-VN')} ₫
</Text>
```

### 2.3. Tối Ưu Hiệu Năng Danh Sách & Cuộn (List Virtualization - CRITICAL)

1. **Sử dụng `FlashList` hoặc tối ưu `FlatList` với các chỉ số chuẩn:**
   - `initialNumToRender={6}`
   - `maxToRenderPerBatch={8}`
   - `windowSize={5}`
   - `removeClippedSubviews={true}`
2. **Memo hóa từng Item component (`React.memo`):** Tránh re-render toàn bộ danh sách khi 1 phần tử thay đổi.
3. **Tuyệt đối không định nghĩa inline object / inline callback trong `renderItem`:**
   - Hoist các hàm xử lý (`onPress`, `onAddToCart`) ra ngoài danh sách, truyền vào Item dưới dạng callback ổn định.
4. **Truyền giá trị nguyên thủy (Primitives) vào Item Props:**
   - Thay vì truyền cả object thuốc cồng kềnh `medicine`, chỉ truyền `id`, `name`, `price`, `thumbnailUrl` để `React.memo` so sánh nông hiệu quả.
5. **Dùng `expo-image` cho toàn bộ ảnh thuốc:**
   - Bật cache policy `memory-disk`, hiển thị thumbnail mờ (blurhash) khi đang tải ảnh.

### 2.4. Đồ Họa & Chuyển Động 60 FPS (Reanimated & Gestures - HIGH)

1. **Chỉ Animate `transform` và `opacity` trên GPU:**
   - Tuyệt đối không animate `width`, `height`, `top`, `left`, `margin`, `padding` vì sẽ gây layout thrashing trên JS thread làm tụt khung hình (drop frames).
2. **Sử dụng `useDerivedValue`:**
   - Ưu tiên `useDerivedValue` thay vì `useAnimatedReaction` khi tính toán animation phái sinh.
3. **Thay thế `TouchableOpacity` bằng `Pressable` hoặc `GestureDetector`:**
   - `Pressable` với `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` giúp vùng bấm tối thiểu đạt chuẩn Accessibility 44x44px.
   - Dùng `AnimatedTouchable` với scale micro-interaction (0.97 khi nhấn) để tạo phản hồi xúc giác tự nhiên.
4. **Không lưu tọa độ Scroll vào `useState`:**
   - Lưu vị trí cuộn bằng `useSharedValue` của Reanimated. Không kích hoạt re-render React khi người dùng đang vuốt màn hình.

---

## 3. Tầng 2: Kiến Trúc Ứng Dụng Chuẩn Production (Architecture & Navigation)

### 3.1. Phân Tầng Mã Nguồn (Separation of Concerns)

```
mobile/src/
├── components/
│   ├── ui/                   # Reusable atomic UI (HeaderBar, CustomToast, GradientButton)
│   ├── flat/                 # Flat zero-border modals & badges (FlatModal, FlatBadge)
│   ├── clinical/             # Y tế chuyên sâu (DigitalHealthPassportModal, ClinicalButton)
│   └── barcode/              # Quét mã vạch thuốc GS1 (BarcodeScannerModal)
├── screens/                  # Màn hình theo Persona (Customer, Pharmacist, Warehouse, Admin)
│   ├── customer/             # CustomerScreen, CustomerCheckoutScreen, MedicineDetailScreen
│   └── auth/                 # LoginScreen, RegisterScreen, ProfileScreen
├── services/                 # Business services & API Client
│   ├── api.service.ts        # HTTP Gateway REST API client
│   ├── customerAccount.service.ts # Thống kê đơn hàng & Hồ sơ Long Châu
│   ├── healthBlog.service.ts # Blog y khoa theo mùa
│   └── reminderStorage.service.ts # Lịch nhắc uống thuốc sliding-window 7 ngày
├── context/                  # AuthContext, NotificationContext
└── theme/                    # Design tokens (tokens.ts, colors)
```

### 3.2. Điều Hướng & Modal Chuẩn Native (Navigation)

- **Native Stack Navigator:** Dùng `createNativeStackNavigator` để đảm bảo chuyển cảnh vuốt mượt mà từ cạnh màn hình chuẩn iOS / Android.
- **Tách Màn Hình Chi Tiết:**
  - Các màn hình có nội dung phong phú (ví dụ: Xem chi tiết thuốc `MedicineDetailScreen`) **phải được tách thành màn hình riêng biệt trong Stack**, không dùng modal popup chồng chéo gây nghẽn RAM.
- **Native Modals:** Sử dụng `FlatModal` hoặc `ClinicalModalSheet` có animation mượt mà (`fade` hoặc `slide`), hỗ trợ đóng khi chạm nền (`onClose`) và an toàn SafeArea.

### 3.3. Cơ Chế Lưu Trữ Offline & Bảo Mật (Offline-First)

- **Auth Token:** Lưu trữ an toàn trong SecureStore (Keychain / Keystore).
- **Offline Storage:** Dùng `AsyncStorage` lưu trữ giỏ hàng tạm, danh sách thuốc yêu thích và lịch nhắc thuốc 7 ngày.
- **Tự động đồng bộ:** Khi có kết nối mạng trở lại, ứng dụng tự động kiểm tra và đồng bộ trạng thái đơn hàng và hồ sơ sức khỏe.

---

## 4. Tầng 3: Chuẩn Mực Y Tế Dược Phẩm & Giao Diện Long Châu (Medical UX)

### 4.1. Quy Chuẩn Zero-Border (Tuyệt Đối Không Dùng Viền Cứng)

1. **Nền Màn Hình:** Màu xám dịu nhạt sạch sẽ `#F8FAFC` hoặc `#F1F5F9`.
2. **Thẻ Card:** Nền trắng tinh `#FFFFFF`, bo cong lớn `borderRadius: 16` đến `20px`.
3. **Độ Sâu (Elevation):** Sử dụng shadow tự nhiên nhẹ nhàng:
   ```ts
   shadowColor: '#0F172A',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.04,
   shadowRadius: 10,
   elevation: 2,
   ```
4. **Không dùng `borderWidth: 1` bao bọc các thẻ lớn.** Phân chia nội dung bằng khoảng cách thoáng đãng (`SpacingTokens`: 12px, 16px, 20px) hoặc vách ngăn mờ `#F1F5F9`.

### 4.2. Cỡ Chữ Lớn & Thân Thiện Người Dùng Lớn Tuổi (Senior-Friendly Typography)

- **Tên thuốc chính:** `16px - 17.5px`, `fontWeight: '700'`, màu đen xám `#0F172A`.
- **Giá bán thuốc:** `18px - 22px`, `fontWeight: '800'`, màu đỏ `#DC2626` hoặc xanh `#0284C7`.
- **Loại bỏ chữ phụ rối mắt:** Lược bớt các dòng text phụ dài dòng gây phân tâm người bệnh.
- **Nhãn liều dùng:** Đặt trong pill nổi bật màu xanh ngọc `#E0F2FE` với text `#0369A1` đậm rõ.

### 4.3. Bố Cục Trang Tài Khoản Chuẩn FPT Long Châu

- **Header Xanh Gradient:** Avatar tròn lớn, Tên người dùng to đậm, Số điện thoại chuẩn định dạng (`0936 929 381`), Huy hiệu Xu Vàng `🪙 {points}` góc phải.
- **Khối "Đơn của tôi":** Tiêu đề xám + link `Xem tất cả ›` + Thẻ trắng 4 nút:
  - 📦 *Đang xử lý* (có Badge đỏ đếm số đơn thực tế)
  - 🚚 *Đang giao*
  - ☑️ *Đã giao*
  - 🔄 *Đổi/Trả*
- **Khối "Hồ sơ y tế & Sức khỏe":** Thẻ Sổ Sức Khỏe Số nổi bật, huy hiệu `Chuẩn GPP / BYT`, hiển thị Nhóm máu, Số lượng dị ứng, Trạng thái bệnh nền. Chạm vào mở trực tiếp `DigitalHealthPassportModal`.
- **Khối "Tài khoản":** Danh sách mục phẳng nền trắng có chevron `›` (*Mã QR của tôi*, *Thông tin cá nhân*, *Quản lý sổ địa chỉ*, *Quản lý phương thức thanh toán*, *Lịch sử tư vấn*, *Tủ thuốc*, *Yêu thích*).
- **Khối "Về Nhà thuốc ABC PHARMACY":** Giới thiệu nhà thuốc, Giấy phép kinh doanh GPP, Quy chế hoạt động, Đăng xuất tài khoản.

### 4.4. Quy Định Về Thông Báo & Cảnh Báo Khẩn Cấp

- **Cảnh báo khẩn cấp (Hỏa hoạn / IoT GSP):** Sử dụng Google FCM Data-Only kết hợp Notifee `CallStyle.forIncomingCall` và `FullScreenIntent` để đổ chuông và bung toàn màn hình ngay cả khi khóa máy hoặc tắt app.
- **Thông báo nghiệp vụ & Lịch nhắc thuốc:**
  - `CustomToast`: Kích thước lớn 92% chiều rộng màn hình, icon tròn 28px, chữ to rõ ràng.
  - `FlatModal`: Cảnh báo xác nhận tương tác in-app.
  - `Socket.IO`: Lắng nghe realtime các phòng (`user-{userId}`, `branch-{branchId}`).
  - Lịch nhắc thuốc: Tạo tự động từ đơn thuốc, lưu `AsyncStorage`, báo chuông nội bộ sliding window 7 ngày.

### 4.5. Chính Sách Tuyệt Đối Không Dùng Màu Xanh Lá Cây (Zero Green Color Policy - CRITICAL)

- **CẤM TIỆT MÀU XANH LÁ CÂY TRÊN TOÀN BỘ DỰ ÁN:**
  Tuyệt đối không sử dụng các mã màu xanh lá cây / ngọc bích / emerald / green (`#059669`, `#10B981`, `#16A34A`, `#22C55E`, `#047857`, `#ECFDF5`, `#D1FAE5`, `#A7F3D0`, `bg-emerald-*`, `text-emerald-*`, `border-emerald-*`).
- **CHUẨN MÀU SẮC ĐỒNG BỘ: AUTH BLUE (XANH NƯỚC BIỂN):**
  - **Màu thương hiệu / Thao tác chính (Primary Action):** Auth Blue `#0284C7` (Sky 600) / `#0369A1` (Sky 700) / `#0047BA` (Royal Blue).
  - **Màu nền thẻ / Khối active (Surface Tint):** `#F0F9FF` (Sky 50) / `#E0F2FE` (Sky 100).
  - **Màu viền nhẹ (Border Subtle):** `#BAE6FD` (Sky 200).
  - **Trạng thái Thành Công / Đạt Chuẩn GPP BYT:** Sử dụng huy hiệu hoặc nút Auth Blue `#0284C7` trên nền `#F0F9FF`, kèm icon `shield-checkmark` hoặc `checkmark-circle`.
- **QUY CHUẨN MÀN HÌNH THEO VAI TRÒ (ROLE-BASED PROFILE ARCHITECTURE):**
  1. **Khách hàng (`customer`):** Hiển thị Sổ Sức Khỏe Số QR bệnh nhân, Đơn của tôi (4 trạng thái), Tủ thuốc nhắc uống thuốc, Đổi quà Xu FPT Long Châu. Ở Giỏ Hàng (`activeTab === 'CART'`), tuyệt đối không hiển thị thanh tìm kiếm thuốc.
  2. **Nhân sự chi nhánh (`pharmacist`, `warehouse`, `cashier`):** Chuyển modal hiển thị thành **Thẻ Định Danh Nhân Sự GPP** (`#EMP-...`, chứng chỉ hành nghề CCHN, chi nhánh công tác, ca trực GPS) để Quản lý cơ sở và Ban Giám Đốc quét đối soát.
  3. **Ban Giám Đốc (`role === 'director'`):** Tab Tài khoản và Profile chuyển sang **Trung Tâm Điều Hành Ban Giám Đốc (Executive Director Operations Hub)**: Hiển thị KPI toàn chuỗi `2.845.620.000 ₫`, nút lớn vào Bảng điều hành chuỗi, phím tắt Quét Thẻ Nhân Sự GPP, Duyệt PO, Dự báo AI, loại bỏ hoàn toàn giao diện giỏ hàng / đơn mua của khách hàng.
  4. **Quản Lý Chi Nhánh (`role === 'branch'`):** Tích hợp tính năng Quét & Tra Cứu Thẻ Định Danh Nhân Sự GPP trực tiếp trên thanh tác vụ nhân sự ca trực.

---

## 5. Tầng 4: Quy Tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate)

Mọi code nghiệp vụ mới (Service, Helper, Formatter, Validator) **BẮT BUỘC** phải có file test `*.spec.ts` đi kèm và được chia thành đủ **3 nhóm giá trị chuẩn**:

1. **`[Normal Values]` - Luồng Nghiệp Vụ Chuẩn:**
   - Dữ liệu chuẩn, thành công, đúng định dạng.
   - Kết quả đầu ra khớp với kỳ vọng nghiệp vụ.
2. **`[Boundary Values]` - Giá Trị Biên & Cực Trị:**
   - Mảng rỗng `[]`, danh sách chỉ đúng 1 phần tử.
   - Số nguyên 0, số âm, số lượng tối đa.
   - Khoảng trắng thừa, chữ hoa/thường.
3. **`[Abnormal Values]` - Dữ Liệu Dị Thường & Ngoại Lệ:**
   - Giá trị `null`, `undefined`, chuỗi sai định dạng.
   - Mảng chứa phần tử rác hoặc đối tượng hỏng cấu trúc.
   - Bảo đảm hệ thống không bị crash mà xử lý fallback an toàn.

> **Quy định ngôn ngữ:** Toàn bộ code comments (`//`, `/* */`, JSDoc) và mô tả bài test `describe()`, `it()` **viết bằng Tiếng Việt 100%**.

---

## 6. Danh Mục Tham Khảo Chi Tiết (Rule Directory)

Toàn bộ 42 quy chuẩn kỹ thuật chuyên sâu được gộp tối giản trong 2 tài liệu chính để cây thư mục luôn gọn gàng:

- **[rules.md](file:///Users/tranhongphuoc/WDP301/.agents/skills/abc-reactnative-improvement-ui-ux/rules.md)** - Cẩm nang chi tiết 42 quy chuẩn kỹ thuật (Core Rendering, List Virtualization, Reanimated 60fps, Zero-Border, Safe State, Typography Lg...).
- **[architecture-details.md](file:///Users/tranhongphuoc/WDP301/.agents/skills/abc-reactnative-improvement-ui-ux/references/architecture-details.md)** - Chi tiết kiến trúc phân tầng, Expo Router, offline sync, bảo mật SecureStore.

---

## 7. Bảng Kiểm Tra Thẩm Định 15 Điểm Trước Khi Nghiệm Thu (15-Point QA Checklist)

Trước khi hoàn tất bất kỳ tính năng mobile nào, kiểm tra qua 15 điểm sau:

- [ ] **1.** Không có bất kỳ biểu thức `{falsy && <Component />}` nào có nguy cơ gây crash production.
- [ ] **2.** Toàn bộ chuỗi văn bản và số tiền đều được bọc trong thẻ `<Text>`.
- [ ] **3.** Các thẻ nội dung tuân thủ phong cách Zero-Border (nền trắng, bo tròn 16px, không viền cứng).
- [ ] **4.** Cỡ chữ tên thuốc tối thiểu 16px, giá tiền từ 18px đậm màu nổi bật.
- [ ] **5.** Nút bấm có diện tích tối thiểu 44x44px (`hitSlop` đủ rộng).
- [ ] **6.** Tab Tài Khoản có bố cục chuẩn Long Châu (Header đại dương, Đơn của tôi 4 trạng thái có badge đỏ, Sổ sức khỏe số, Menu tiện ích).
- [ ] **7.** Chạm vào Sổ sức khỏe số mở trực tiếp `DigitalHealthPassportModal`.
- [ ] **8.** Không sử dụng thông báo push của Google/OS; toàn bộ thông báo dùng `CustomToast` / `FlatModal`.
- [ ] **9.** Lịch nhắc thuốc hoạt động offline trên `AsyncStorage`.
- [ ] **10.** Danh sách sản phẩm được memo hóa, không truyền inline object/callback trong `renderItem`.
- [ ] **11.** Toàn bộ animation dùng Reanimated chỉ can thiệp vào `transform` và `opacity`.
- [ ] **12.** Mọi Service mới viết đều có file test `*.spec.ts` đi kèm đầy đủ 3 nhóm giá trị.
- [ ] **13.** Chạy `cd mobile && npm test` đạt 100% PASS tất cả các test suites.
- [ ] **14.** Chạy `cd mobile && npx tsc --noEmit` đạt 0 lỗi biên dịch.
- [ ] **15.** Chú thích mã nguồn viết bằng Tiếng Việt 100%.
- [ ] **16.** **Chính sách Zero Green:** Tuyệt đối không còn bất kỳ mã màu xanh lá cây nào (`#059669`, `#10B981`, `#16A34A`), toàn bộ nút submit, badge, toggle active đều dùng Auth Blue (`#0284C7`, `#0369A1`, `#F0F9FF`, `#BAE6FD`).
- [ ] **17.** **Phân quyền Ban Giám Đốc chuẩn xác:** Kiểm tra cả `fullName` và `name` (chống lệch schema Backend/Mobile), điều hướng vào thẳng `DirectorScreen` và Executive Hub, tuyệt đối không render giao diện giỏ hàng/đơn khách.
- [ ] **18.** **Tìm kiếm & Lọc Đồng Nghiệp Đổi Ca:** Đảm bảo `ShiftSwapModal` tìm kiếm tiếng Việt không dấu, lọc theo vai trò (Dược sĩ, Kho, Quản lý) và tự động fallback danh sách nhân viên liên chi nhánh khi cơ sở chỉ có 1 nhân sự.

