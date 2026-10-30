# TÀI LIỆU ĐẶC TẢ KỸ THUẬT & TRIỂN KHAI HỆ THỐNG
# UC-96: DANH SÁCH SẢN PHẨM YÊU THÍCH (WISHLIST)
**Mã công việc (Jira/Scrum):** SCRUM-107  
**Phân hệ (Module):** Cổng Mua Sắm Khách Hàng (Customer Portal) & User Service  
**Kiến trúc:** Microservices (API Gateway + Kafka RPC + MongoDB + React 19 Web + Expo Mobile)  
**Tác nhân chính (Actor):** Khách hàng cá nhân (`USER`), Khách vãng lai (`GUEST`)

---

## 1. MỤC TIÊU & TỔNG QUAN NGHIỆP VỤ

### 1.1. Mục tiêu chức năng
Chức năng **Danh sách sản phẩm yêu thích (Wishlist)** cho phép khách hàng lưu giữ các mặt hàng dược phẩm, thực phẩm chức năng, thiết bị y tế mà mình đang quan tâm hoặc có nhu cầu mua định kỳ trên cả nền tảng Web và ứng dụng Di động (Mobile App). Giúp khách hàng:
- Theo dõi biến động giá và tình trạng tồn kho của sản phẩm yêu thích.
- Chuyển nhanh thuốc vào Giỏ hàng để tiến hành thanh toán mà không cần tìm kiếm lại trong danh mục hàng ngàn SKU.
- Trải nghiệm mượt mà ngay cả khi chưa đăng nhập (lưu tạm `guest_wishlist` trong LocalStorage trên Web hoặc AsyncStorage trên Mobile và tự động đồng bộ lên tài khoản cá nhân khi đăng nhập).

### 1.2. Quy tắc nghiệp vụ y tế & hệ thống
1. **Tính bất biến và độc lập theo người dùng:** Mỗi tài khoản khách hàng chỉ có duy nhất một danh sách yêu thích gắn liền với `userId`.
2. **Tính lũy đẳng (Idempotency):** Người dùng bấm yêu thích nhiều lần một sản phẩm không tạo bản ghi trùng lặp trong cơ sở dữ liệu.
3. **Cơ chế tự phục hồi dữ liệu (Auto-Healing):** Nếu một loại thuốc trong danh sách yêu thích đã bị quản trị viên ngừng kinh doanh hoặc xóa khỏi cơ sở dữ liệu kho (`medicines`), hệ thống tự động loại bỏ thuốc đó khỏi danh sách yêu thích của người dùng khi truy vấn để tránh lỗi hiển thị và không làm gián đoạn trải nghiệm mua sắm.
4. **Phản hồi tức thì (Optimistic UI):** Thao tác thêm/xóa trái tim ❤️ được cập nhật ngay lập tức trên giao diện phía Client (độ trễ < 16ms), sau đó gửi request ngầm qua API Gateway và Kafka; nếu máy chủ báo lỗi sẽ tự động rollback trạng thái ban đầu.

---

## 2. KIẾN TRÚC HỆ THỐNG & LUỒNG GIAO TIẾP

### 2.1. Sơ đồ luồng giao tiếp (Data Flow Diagram)

```
[Khách Hàng: Web Browser (React 19)]    [Khách Hàng: Mobile App (Expo / React Native)]
               │                                            │
               │ HTTP REST API (JWT Bearer)                 │ HTTP REST API (JWT Bearer)
               └───────────────────────┬────────────────────┘
                                       ▼
                       [API Gateway (NestJS) : user.controller.ts]
                                       │
                                       │ Kafka RPC (sendKafkaMessage)
       ▼
[Kafka Broker: wdp301-cluster]
       │   Topics:
       │   - user.wishlist.get
       │   - user.wishlist.add
       │   - user.wishlist.remove
       │   - user.wishlist.clear
       ▼
[user-service (NestJS) : user-service.controller.ts]
       │
       ├──► Model Medicine (Truy vấn DB trực tiếp hoặc Kafka fallback inventory.medicine.get_by_ids)
       │
       └──► MongoDB Collection: `wishlists`
```

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (MONGODB SCHEMA)

Collection: `wishlists`

```typescript
// backend/apps/user-service/src/schemas/wishlist.schema.ts

@Schema({ _id: false })
export class WishlistItem {
  @Prop({ required: true })
  medicineId: string; // Mã định danh thuốc (ref: medicines._id)

  @Prop({ default: () => new Date() })
  addedAt: Date; // Thời điểm lưu vào danh sách
}

@Schema({ timestamps: true, collection: 'wishlists' })
export class Wishlist extends Document {
  @Prop({ required: true, unique: true, index: true })
  userId: string; // Mã ID người dùng sở hữu danh sách

  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[]; // Danh sách các thuốc đã thích
}
```

---

## 4. DANH SÁCH API GATEWAY REST ENDPOINTS

Tất cả các endpoint đều thuộc nhóm định tuyến `/api/users/wishlist` và yêu cầu xác thực JWT qua `JwtAuthGuard`:

| Method | Endpoint | Quyền hạn | Mô tả | Request Body | Phản hồi chuẩn (200 OK) |
|---|---|---|---|---|---|
| `GET` | `/api/users/wishlist` | Authenticated User | Lấy toàn bộ danh sách sản phẩm yêu thích kèm chi tiết thuốc | Không | `{ items: WishlistItem[], totalCount: number }` |
| `POST` | `/api/users/wishlist` | Authenticated User | Thêm sản phẩm vào danh sách yêu thích | `{ medicineId: string }` | `{ success: true, message: string, totalCount: number }` |
| `DELETE` | `/api/users/wishlist/:medicineId` | Authenticated User | Xóa một sản phẩm khỏi danh sách yêu thích | Không | `{ success: true, message: string, totalCount: number }` |
| `POST` | `/api/users/wishlist/clear` | Authenticated User | Dọn sạch toàn bộ danh sách yêu thích của người dùng | Không | `{ success: true, message: string, totalCount: 0 }` |

---

## 5. ĐẶC TẢ KAFKA TOPICS & MESSAGE PATTERNS

Giao tiếp nội bộ giữa `api-gateway` và `user-service` sử dụng cơ chế **Request-Response (Kafka RPC)** qua `sendKafkaMessage`:

| Kafka Topic | Payload gửi | Xử lý tại Microservice | Dữ liệu trả về |
|---|---|---|---|
| `user.wishlist.get` | `{ userId: string }` | `handleGetWishlist` -> `userService.getWishlist()` | `{ items: [...], totalCount: n }` |
| `user.wishlist.add` | `{ userId: string, medicineId: string }` | `handleAddToWishlist` -> `userService.addToWishlist()` | `{ success: true, message: string }` |
| `user.wishlist.remove` | `{ userId: string, medicineId: string }` | `handleRemoveFromWishlist` -> `userService.removeFromWishlist()` | `{ success: true, message: string }` |
| `user.wishlist.clear` | `{ userId: string }` | `handleClearWishlist` -> `userService.clearWishlist()` | `{ success: true, message: string }` |

---

## 6. DANH SÁCH FILE NGUỒN ĐÃ TẠO VÀ CHỈNH SỬA

### 6.1. Backend Microservices
1. **`backend/apps/user-service/src/schemas/wishlist.schema.ts` (Tạo mới):** Định nghĩa Mongoose schema cho collection `wishlists`.
2. **`backend/apps/user-service/src/user-service.module.ts` (Cập nhật):** Đăng ký model `Wishlist` vào `MongooseModule.forFeature`.
3. **`backend/apps/user-service/src/user-service.service.ts` (Cập nhật):** Triển khai 4 nghiệp vụ `getWishlist`, `addToWishlist`, `removeFromWishlist`, `clearWishlist` tích hợp Auto-healing và kiểm tra tính toàn vẹn thuốc.
4. **`backend/apps/user-service/src/user-service.controller.ts` (Cập nhật):** Lắng nghe 4 `@MessagePattern` từ Kafka.
5. **`backend/apps/api-gateway/src/controllers/user.controller.ts` (Cập nhật):** Đăng ký subscription Kafka topic trong `onModuleInit` và bổ sung 4 REST endpoints.

### 6.2. Frontend Web (React 19 + TypeScript)
6. **`frontend/src/constants/apiEndpoints.ts` (Cập nhật):** Bổ sung constants `USERS.WISHLIST`, `USERS.WISHLIST_ITEM`, `USERS.WISHLIST_CLEAR`.
7. **`frontend/src/services/sales/wishlist.service.ts` (Tạo mới):** Service layer kết nối API Gateway, tích hợp lưu trữ `guest_wishlist` và tự động đồng bộ khi đăng nhập.
8. **`frontend/src/services/index.ts` (Cập nhật):** Export `wishlistService` tại centralized barrel file.
9. **`frontend/src/hooks/useWishlist.ts` (Tạo mới):** Custom hook cung cấp `items`, `isInWishlist`, `toggleWishlist`, `removeFromWishlist`, `clearWishlist` với Optimistic UI và đồng bộ sự kiện `wishlistUpdated`.
10. **`frontend/src/pages/customer/CustomerWishlist.tsx` (Tạo mới):** Trang hiển thị giao diện danh sách yêu thích, hỗ trợ tìm kiếm, lọc danh mục, sắp xếp giá, thêm nhanh vào giỏ hàng và modal xác nhận dọn sạch.
11. **`frontend/src/components/MedicineCard.tsx` (Cập nhật):** Tích hợp nút trái tim ❤️ tương tác bật/tắt yêu thích trực tiếp trên từng thẻ sản phẩm.
12. **`frontend/src/pages/customer/CustomerShop.tsx` (Cập nhật):** Kết nối hook `useWishlist` vào toàn bộ danh sách sản phẩm cửa hàng thuốc.
13. **`frontend/src/components/common/CustomerHeader.tsx` (Cập nhật):** Hiển thị nút "Yêu thích" kèm badge số lượng sản phẩm thời gian thực trên cả Desktop Header và Mobile Drawer.
14. **`frontend/src/App.tsx` (Cập nhật):** Đăng ký route `/customer/wishlist`.

### 6.3. Mobile Application (React Native / Expo)
15. **`mobile/src/services/wishlistApiService.ts` (Tạo mới):** Dịch vụ gọi API Gateway `/api/users/wishlist`, kết hợp lưu trữ ngoại tuyến `@guest_wishlist` qua `AsyncStorage` cho khách vãng lai và đồng bộ tự động `syncGuestWishlist`.
16. **`mobile/src/services/api.service.ts` (Cập nhật):** Tích hợp các static methods `getWishlist`, `addToWishlist`, `removeFromWishlist`, `clearWishlist` vào lớp trung tâm `ApiService`.
17. **`mobile/src/screens/customer/CustomerWishlistScreen.tsx` (Tạo mới):** Màn hình danh sách yêu thích độc lập trên Mobile, hỗ trợ tìm kiếm theo tên/hoạt chất thuốc, thẻ thuốc y tế trực quan, chuyển thuốc vào giỏ hàng (`addToCart`), xóa từng món và modal dọn sạch.
18. **`mobile/src/navigation/AppNavigator.tsx` (Cập nhật):** Đăng ký màn hình `CustomerWishlist` vào cả Guest Flow và Authenticated Customer Stack.
19. **`mobile/src/screens/customer/CustomerScreen.tsx` (Cập nhật):** Tích hợp nút Trái tim kèm Badge đếm số lượng thời gian thực trên Header Bar, nút tim bật/tắt yêu thích trên thẻ Flash Sale, danh sách sản phẩm Grid và Modal chi tiết thuốc.

---

## 7. KẾT QUẢ KIỂM THỬ & ĐÁNH GIÁ CHẤT LƯỢNG

| Hạng mục kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Đánh giá |
|---|---|---|---|
| **Thêm yêu thích (Web & Mobile)** | Bấm ❤️ trên thẻ thuốc tại trang Cửa hàng / Store Screen | Trái tim chuyển màu hồng/đỏ ngay lập tức, badge trên Header tăng +1, lưu vào DB | **ĐẠT (PASS)** |
| **Bỏ yêu thích (Web & Mobile)** | Bấm ❤️ lần thứ 2 trên thẻ thuốc đã thích | Trái tim chuyển về màu xám, badge trên Header giảm -1, xóa khỏi DB | **ĐẠT (PASS)** |
| **Trải nghiệm khách vãng lai** | Khách chưa đăng nhập bấm ❤️ lưu thuốc | Lưu thành công vào LocalStorage / AsyncStorage `guest_wishlist`, không bị chặn bởi modal đăng nhập | **ĐẠT (PASS)** |
| **Đồng bộ khi đăng nhập** | Khách đã chọn các món ở khách vãng lai rồi tiến hành đăng nhập | Tự động đồng bộ các món từ bộ nhớ tạm lên tài khoản MongoDB và dọn sạch cache tạm | **ĐẠT (PASS)** |
| **Thêm vào giỏ hàng từ Wishlist** | Bấm "Thêm giỏ" trên trang/màn hình Wishlist | Thuốc được chuyển vào Cart, giỏ hàng tăng số lượng, hiển thị toast thông báo | **ĐẠT (PASS)** |
| **Tự phục hồi dữ liệu** | Thuốc trong Wishlist bị quản trị viên xóa khỏi kho thuốc | Truy vấn wishlist tự động lọc bỏ và dọn sạch DB, không crash UI | **ĐẠT (PASS)** |
| **Lọc & Tìm kiếm** | Nhập tên thuốc hoặc chọn danh mục con | Danh sách sản phẩm cập nhật tức thì theo đúng tiêu chí lọc | **ĐẠT (PASS)** |
| **Xác nhận dọn sạch** | Bấm "Dọn sạch" -> Hiển thị Modal -> Xác nhận | Xóa toàn bộ sản phẩm khỏi wishlist, đưa giao diện về Empty state | **ĐẠT (PASS)** |
| **Điều hướng & UI Mobile** | Nhấn icon tim trên Header hoặc Drawer Mobile | Chuyển mượt mà sang `CustomerWishlistScreen`, hiển thị đúng số lượng và chi tiết thuốc | **ĐẠT (PASS)** |
| **Biên dịch mã nguồn** | `nest build api-gateway`, `nest build user-service`, `vite build`, `tsc mobile` | 100% build thành công, 0 lỗi cú pháp hoặc Type check | **ĐẠT (PASS)** |

