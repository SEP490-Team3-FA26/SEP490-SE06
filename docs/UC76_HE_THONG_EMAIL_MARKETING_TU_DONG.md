# 📑 TÀI LIỆU ĐẶC TẢ & HƯỚNG DẪN KỸ THUẬT TOÀN DIỆN (FULL SYSTEM SPECIFICATION)

## CHỨC NĂNG: HỆ THỐNG TẠO VÀ GỬI EMAIL MARKETING TỰ ĐỘNG (NEWSLETTER & PROMOTION)
- **Mã Use Case:** `UC-76` (MKT-EML-01)
- **Phân hệ:** Quản trị Tiếp thị Dược phẩm & Chăm sóc Khách hàng (CRM & Marketing)
- **Dự án:** Hệ thống Quản trị Chuỗi Nhà thuốc & Kho Dược phẩm Chuẩn GPP/GSP (ABC Pharmacy)
- **Kiến trúc áp dụng:** Microservices Event-Driven (Apache Kafka + Redis + NestJS API Gateway + user-service + React 19 Frontend) tuân thủ **Playbook v2.0**.
- **Tác giả:** Đội ngũ Kỹ thuật WDP301 / SEP490

---

## MỤC LỤC
1. [Tổng Quan Nghiệp Vụ & Bài Toán Cốt Lõi](#1-tổng-quan-nghiệp-vụ--bài-toán-cốt-lõi)
2. [Tuân Thủ Chuẩn Mực Y Tế & Pháp Lý](#2-tuân-thủ-chuẩn-mực-y-tế--pháp-lý)
3. [Kiến Trúc Kỹ Thuật & Luồng Xử Lý (Playbook v2.0)](#3-kiến-trúc-kỹ-thuật--luồng-xử-lý-playbook-v20)
4. [Thiết Kế Cơ Sở Dữ Liệu (MongoDB Schemas)](#4-thiết-kế-cơ-sở-dữ-liệu-mongodb-schemas)
5. [Chuẩn Hóa Tệp Khách Hàng Mục Tiêu (Target Audience)](#5-chuẩn-hóa-tệp-khách-hàng-mục-tiêu-target-audience)
6. [Hệ Thống API Gateway & Kafka Topic Specs](#6-hệ-thống-api-gateway--kafka-topic-specs)
7. [Cấu Trúc Tầng Frontend Web (3-Tier Architecture)](#7-cấu-trúc-tầng-frontend-web-3-tier-architecture)
8. [Vòng Đời Trạng Thái Chiến Dịch (Campaign Lifecycle)](#8-vòng-đời-trạng-thái-chiến-dịch-campaign-lifecycle)
9. [Cơ Chế Phát Tán Email Lô & Khả Năng Chịu Lỗi (Resend Batching Engine)](#9-cơ-chế-phát-tán-email-lô--khả-năng-chịu-lỗi-resend-batching-engine)
10. [Hướng Dẫn Thao Tác & Kịch Bản Kiểm Thử (QA & Testing Guide)](#10-hướng-dẫn-thao-tác--kịch-bản-kiểm-thử-qa--testing-guide)

---

## 1. TỔNG QUAN NGHIỆP VỤ & BÀI TOÁN CỐT LÕI

Khi chuỗi nhà thuốc ABC Pharmacy triển khai các chương trình khuyến mãi (ví dụ: *Đại tiệc Tri ân Giảm 20% Thực phẩm chức năng & Vitamin, Ra mắt Dòng Dược mỹ phẩm mới, Tặng Voucher độc quyền Hội viên VIP*), phòng Marketing cần một hệ thống quản trị chuyên nghiệp cho phép:
1. **Soạn thảo trực quan (WYSIWYG Email Builder):** Tải banner, điền tiêu đề/preheader, cá nhân hóa nội dung, nhúng trực tiếp danh mục thuốc/sản phẩm nổi bật và mã voucher giảm giá.
2. **Gửi thử nghiệm (Send Test):** Gửi 1 bản email mẫu hoàn chỉnh đến hòm thư cá nhân của Quản trị viên/Dược sĩ trưởng để nghiệm thu giao diện hiển thị trên cả điện thoại (Mobile) và máy tính (Desktop) trước khi gửi hàng loạt.
3. **Lập lịch tự động (Scheduled Delivery):** Thiết lập ngày và giờ phát tán chính xác theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh` - `UTC+7`). Hệ thống ngầm tự động quét và kích hoạt phát tán không cần con người can thiệp thủ công.
4. **Bảo mật & Cá nhân hóa 100%:** Tuyệt đối không gửi chung danh sách người nhận (`CC/BCC`). Mỗi khách hàng nhận một bức thư riêng mang tên chính họ (*"Kính gửi Quý khách Nguyễn Văn A"*).
5. **Chống nghẽn & Non-blocking:** Tiếp nhận lệnh lập tức bằng phản hồi HTTP 202 Accepted. Toàn bộ quá trình chuẩn bị tệp và gửi hàng ngàn email chạy độc lập ngầm (Background Worker) qua Kafka Queue.

---

## 2. TUÂN THỦ CHUẨN MỰC Y TẾ & PHÁP LÝ

Hệ thống được thiết kế đáp ứng chặt chẽ các quy chuẩn:
* **GPP (Good Pharmacy Practice - Thực hành tốt nhà thuốc):** Nội dung thông tin thuốc tuân thủ quy chế thông tin quảng cáo thuốc, khuyến cáo rõ ràng *"Đọc kỹ hướng dẫn sử dụng trước khi dùng"*, không quảng cáo thuốc kê đơn bừa bãi.
* **Nghị định 91/2020/NĐ-CP (Chống tin nhắn rác, thư rác):** Mỗi email bắt buộc phải có cơ chế **Hủy đăng ký nhận thư 1-click (1-Click Unsubscribe)** kèm token mã hóa an toàn ở chân trang (Footer) và tiêu đề `List-Unsubscribe` theo chuẩn RFC 2369 / RFC 8058.
* **Bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP):** Không công khai danh sách khách hàng, mã hóa token hủy đăng ký, chỉ gửi cho khách hàng đã đồng ý nhận tin (`newsletter.isSubscribed === true`).

---

## 3. KIẾN TRÚC KỸ THUẬT & LUỒNG XỬ LÝ (PLAYBOOK v2.0)

Hệ thống tuân thủ mô hình **Microservices Event-Driven**:

```
[ Frontend Web (React 19) ]
        │
        ▼ (HTTP REST)
[ API Gateway (Port 4000) ]
        │
        ├─► [ Kafka Broker (Port 9092) ]
        │         │
        │         ├─► [ user-service (Consumer) ]
        │         │         │
        │         │         ├─► [ MongoDB (Port 27017) ]
        │         │         │     ├─ users
        │         │         │     ├─ emailcampaigns
        │         │         │     └─ emaildeliverylogs
        │         │         │
        │         │         └─► [ Resend API Service (Batching / Single) ]
        │         │
        │         └─► [ Cron Worker (ScheduleModule) ] (Mỗi phút 1 lần)
        │
        └─► [ Redis Cache (Port 6379/6380) ] (Cache-Aside + Eviction)
```

### Các thành phần chính:
1. **API Gateway (`apps/api-gateway`):**
   * Controller: `MarketingCampaignController` (`/api/marketing/campaigns/email`)
   * Đóng vai trò Reverse Proxy, chứng thực người dùng (Auth Guard), điều hướng yêu cầu qua Kafka RPC (`sendKafkaMessage`) và Kafka Event (`emit`).
2. **Microservice Người dùng & Tiếp thị (`apps/user-service`):**
   * Controller: `UserServiceController` (lắng nghe các Kafka Patterns)
   * Service: `EmailMarketingService` (xử lý toàn bộ logic nghiệp vụ, MongoDB queries, HTML template compilation, Resend API caller, Cron worker).
3. **Cơ chế Hàng đợi Kafka:**
   * Tác vụ Đọc / Lấy số liệu / Gửi test: Request-Response Pattern (`send`).
   * Tác vụ Kích hoạt phát tán chiến dịch: Event-Driven Pattern (`emit` -> Topic `email.campaign.trigger` -> HTTP 202 Accepted).
4. **Email Gateway Provider:**
   * **Resend API** (SDK chính thức của Resend) tích hợp tên miền gửi tin `no-reply@abcpharmacy.store` và API Key bảo mật.

---

## 4. THIẾT KẾ CƠ SỞ DỮ LIỆU (MONGODB SCHEMAS)

### 4.1. Bổ sung trường nhận tin trong Collection `users`
File: `backend/apps/user-service/src/schemas/user.schema.ts`
```typescript
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: 'user', enum: ['user', 'admin', 'pharmacist', 'warehouse'] })
  role: string;

  // Hạng hội viên & Điểm tích lũy (dùng để lọc tệp VIP)
  @Prop({ enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'], default: 'BRONZE' })
  tier?: string;

  @Prop({ default: 0 })
  accumulatedPoints?: number;

  @Prop({ default: 0 })
  loyaltyPoints?: number;

  // Cấu hình nhận bản tin Email Marketing
  @Prop({
    type: {
      isSubscribed: { type: Boolean, default: true },
      unsubscribeToken: { type: String, index: true },
      isEmailValid: { type: Boolean, default: true },
      unsubscribedAt: { type: Date },
    },
    default: () => ({ isSubscribed: true, isEmailValid: true }),
  })
  newsletter: {
    isSubscribed: boolean;
    unsubscribeToken?: string;
    isEmailValid: boolean;
    unsubscribedAt?: Date;
  };
}
```

### 4.2. Collection `emailcampaigns` (Chiến dịch Email)
File: `backend/apps/user-service/src/schemas/email-campaign.schema.ts`
```typescript
export enum CampaignStatus {
  DRAFT = 'DRAFT',             // Bản nháp đang soạn
  SCHEDULED = 'SCHEDULED',     // Đã lên lịch, chờ Cron Job kích hoạt
  PROCESSING = 'PROCESSING',   // Đang phân tách lô và gửi qua Resend
  COMPLETED = 'COMPLETED',     // Hoàn tất 100%
  PARTIAL_FAILED = 'PARTIAL_FAILED', // Hoàn tất nhưng có email lỗi
  FAILED = 'FAILED',           // Thất bại toàn bộ
  CANCELLED = 'CANCELLED',     // Quản trị viên chủ động hủy lịch
}

export enum TargetAudience {
  ALL = 'ALL',                 // Tất cả khách hàng hợp lệ
  VIP = 'VIP',                 // Khách hàng thân thiết (Gold, Platinum, Điểm cao)
}

@Schema({ timestamps: true })
export class EmailCampaign {
  @Prop({ required: true, trim: true })
  title: string; // Tên chiến dịch nội bộ (VD: "Tri ân Khách hàng VIP Tháng 10")

  @Prop({ required: true, trim: true })
  subject: string; // Tiêu đề thư hiển thị ở Inbox khách

  @Prop({ trim: true })
  preheader: string; // Mô tả ngắn cạnh tiêu đề thư

  @Prop({ default: 'ALL', enum: TargetAudience })
  targetAudience: TargetAudience; // Tệp khách hàng mục tiêu

  @Prop({ required: true })
  bannerUrl: string; // Link ảnh banner chương trình (HTTPS)

  @Prop({ default: 'Cảm ơn quý khách đã luôn đồng hành và tin tưởng ABC Pharmacy.' })
  greetingText: string;

  @Prop({ required: true })
  mainContentHtml: string; // Nội dung bài viết định dạng HTML

  @Prop({ trim: true })
  voucherCode?: string; // Mã giảm giá đi kèm (VD: "VIPOCTOBER")

  @Prop()
  discountSummary?: string; // Tóm tắt ưu đãi (VD: "Giảm ngay 15% tối đa 100.000đ")

  @Prop({ type: [Object], default: [] })
  featuredProducts?: Array<{
    productId: string;
    productName: string;
    originalPrice: number;
    discountPrice?: number;
    imageUrl?: string;
  }>;

  @Prop({ default: 'DRAFT', enum: CampaignStatus })
  status: CampaignStatus;

  @Prop()
  scheduledAt?: Date; // Thời gian lên lịch phát tán (UTC+7)

  @Prop()
  sentAt?: Date;

  @Prop({ type: Object, default: () => ({ totalRecipients: 0, sentCount: 0, failedCount: 0, bounceCount: 0 }) })
  metrics: {
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    bounceCount: number;
  };

  @Prop({ type: MTypes.ObjectId, ref: 'User' })
  createdBy: MTypes.ObjectId;
}
```

### 4.3. Collection `emaildeliverylogs` (Nhật ký Phát tán Từng Người nhận)
File: `backend/apps/user-service/src/schemas/email-delivery-log.schema.ts`
```typescript
@Schema({ timestamps: true })
export class EmailDeliveryLog {
  @Prop({ type: MTypes.ObjectId, ref: 'EmailCampaign', required: true, index: true })
  campaignId: MTypes.ObjectId;

  @Prop({ type: MTypes.ObjectId, ref: 'User', required: true })
  userId: MTypes.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ default: 'PENDING', enum: ['PENDING', 'SENT', 'FAILED', 'BOUNCED'] })
  status: string;

  @Prop()
  resendEmailId?: string; // ID mã vận đơn do Resend API trả về

  @Prop()
  sentAt?: Date;

  @Prop()
  errorMessage?: string;
}
```

---

## 5. CHUẨN HÓA TỆP KHÁCH HÀNG MỤC TIÊU (TARGET AUDIENCE)

Dựa trên thực tế vận hành chuỗi nhà thuốc và hành vi người dùng, hệ thống đã loại bỏ triệt để các phân khúc độ tuổi không khả thi (*Trẻ em/Nhi khoa không có email, Người cao tuổi phụ thuộc con cái*) và chuẩn hóa thành 2 phân khúc chính xác:

| Mã tệp | Nhãn hiển thị | Tiêu chí sàng lọc (Filter Criteria) | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **`ALL`** | **Tất cả khách hàng** | 1. Có tài khoản khách hàng (`role: 'user'`).<br>2. Định dạng email hợp lệ theo chuẩn RFC 5322 (`^[^\s@]+@[^\s@]+\.[^\s@]+$`).<br>3. Khách hàng bật nhận tin (`newsletter.isSubscribed !== false`).<br>4. Email không bị chặn/hỏng (`newsletter.isEmailValid !== false`). | Các chương trình khuyến mãi đại trà, thông báo nghỉ lễ, ngày hội sức khỏe cộng đồng toàn chuỗi. |
| **`VIP`** | **Khách hàng VIP** | Thỏa mãn đầy đủ 4 điều kiện của `ALL`, **kèm theo ít nhất một trong các tiêu chí sau:**<br>1. Hạng hội viên: `tier` là `'GOLD'` hoặc `'PLATINUM'`.<br>2. Điểm tích lũy trọn đời: `accumulatedPoints >= 1000`.<br>3. Điểm khả dụng hiện tại: `loyaltyPoints >= 500`. | Tri ân khách hàng thân thiết, tặng mã giảm giá độc quyền giá trị cao, thông báo quà tặng sinh nhật VIP. |

---

## 6. HỆ THỐNG API GATEWAY & KAFKA TOPIC SPECS

Tất cả các lệnh tương tác từ Web Client đều đi qua **API Gateway Bounded Context**: `/api/marketing/campaigns/email`.

| HTTP Method | API Gateway Endpoint | Kafka Message / Event Pattern | Thao tác | Mã HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/marketing/campaigns/email` | `email.campaign.create` | Tạo mới chiến dịch (Lưu nháp / Lên lịch) | `201 Created` |
| `PUT` | `/api/marketing/campaigns/email/:id` | `email.campaign.update` | Cập nhật thông tin chiến dịch đã lưu | `200 OK` |
| `GET` | `/api/marketing/campaigns/email` | `email.campaign.get.all` | Lấy danh sách toàn bộ chiến dịch | `200 OK` |
| `GET` | `/api/marketing/campaigns/email/:id` | `email.campaign.get.by.id` | Lấy chi tiết chiến dịch theo ID | `200 OK` |
| `POST` | `/api/marketing/campaigns/email/:id/send-test` | `email.campaign.send_test` | Gửi email thử nghiệm đến địa chỉ test | `200 OK` |
| `POST` | `/api/marketing/campaigns/email/:id/cancel` | `email.campaign.cancel` | Hủy lịch phát tán của chiến dịch | `200 OK` |
| `POST` | `/api/marketing/campaigns/email/:id/trigger` | `email.campaign.trigger` *(Event)* | Kích hoạt phát tán chiến dịch ngay lập tức | `202 Accepted` |
| `DELETE`| `/api/marketing/campaigns/email/:id` | `email.campaign.delete` | Xóa vĩnh viễn chiến dịch và nhật ký gửi | `200 OK` |
| `GET` | `/api/marketing/campaigns/email/:id/stats` | `email.campaign.stats` | Xem báo cáo đo lường, tỷ lệ thành công | `200 OK` |
| `GET` | `/api/marketing/campaigns/email/unsubscribe`| `email.newsletter.unsubscribe` | Khách hàng bấm hủy nhận thư 1-click | `200 OK` |

---

## 7. CẤU TRÚC TẦNG FRONTEND WEB (3-TIER ARCHITECTURE)

Theo đúng quy chuẩn **Playbook v2.0**, Frontend chia tách thành 3 tầng rõ ràng:

```
frontend/src/
├── services/sales/emailCampaign.service.ts   # [Tầng 1: Data Access Service] Gọi Axios qua Gateway
├── hooks/useEmailCampaignManagement.ts        # [Tầng 2: Business Logic Hook] Quản lý State & Optimistic UI
└── pages/admin/
    ├── EmailCampaignListPage.tsx             # [Tầng 3: UI Dashboard] Danh sách & Modal xác nhận
    └── EmailCampaignPage.tsx                 # [Tầng 3: UI Form] Soạn thảo chiến dịch, preview & send-test
```

### Điểm nổi bật trong mã nguồn Frontend:
1. **Quản lý Chế độ Chỉnh sửa (`isEditMode`):** Khi người dùng ấn nút "Sửa", trang [EmailCampaignPage.tsx](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/admin/EmailCampaignPage.tsx) tự động nạp dữ liệu cũ theo `:id`, nút "Lưu nháp" và "Lên lịch" gọi hàm `updateCampaign` thay vì tạo mới, ngăn ngừa tạo bản ghi trùng lặp.
2. **Gửi Thử An Toàn (Safe Send-Test):** Tự động phát hiện nếu bản thảo chưa lưu hoặc vừa sửa đổi, tự động gọi `createCampaign` hoặc `updateCampaign` trước khi thực hiện gửi test.
3. **Optimistic UI khi Xóa:** Trong [useEmailCampaignManagement.ts](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/hooks/useEmailCampaignManagement.ts), khi người dùng xóa chiến dịch, item lập tức biến mất khỏi giao diện, sau đó gửi lệnh qua Gateway. Nếu có lỗi từ server, hệ thống tự động hoàn tác (rollback) trạng thái cũ.
4. **Modal Cảnh Báo Chuyên Nghiệp:** Không dùng `window.confirm` đơn sơ. Có riêng Modal Hủy Lịch màu vàng cam (cảnh báo cron dừng) và Modal Xóa Vĩnh Viễn màu đỏ (cảnh báo mất sạch dữ liệu nhật ký gửi) với nút bấm trực quan.

---

## 8. VÒNG ĐỜI TRẠNG THÁI CHIẾN DỊCH (CAMPAIGN LIFECYCLE)

```
        ┌────────────────────────────────────────────────────────┐
        │                                                        ▼
   [ DRAFT ] ──(Lên lịch)──► [ SCHEDULED ] ──(Hủy lịch)──► [ CANCELLED ]
        │                           │                            │
        │                           ▼ (Đến giờ hẹn / Gửi ngay)   │
        └───────────────────► [ PROCESSING ] ◄───────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       (100% người nhận thành công)      (Có ít nhất 1 email lỗi/bounce)
              [ COMPLETED ]                     [ PARTIAL_FAILED ]
```

---

## 9. CƠ CHẾ PHÁT TÁN EMAIL LÔ & KHẢ NĂNG CHỊU LỖI (RESEND BATCHING ENGINE)

1. **Thuật toán Chia Lô (Batching - 100 emails/request):**
   * Sử dụng `resend.batch.send()` gửi tối đa 100 email cá nhân hóa trong 1 request duy nhất.
   * Nghỉ `1000ms` giữa các đợt phát tán lô để đảm bảo không vi phạm giới hạn Rate Limit của nhà cung cấp SMTP/API.
2. **Cơ chế Chống gửi trùng lặp (Idempotency):**
   * Trước khi gửi, hệ thống nạp sẵn danh sách `EmailDeliveryLog` với trạng thái `PENDING`.
   * Nếu có sự cố khởi động lại server hoặc ngắt kết nối mạng giữa chừng, tiến trình khôi phục chỉ quét các bản ghi `PENDING`, tuyệt đối không gửi lại cho những người đã có trạng thái `SENT`.
3. **Template Email Tiêu Chuẩn Chuỗi Nhà Thuốc ABC Pharmacy (Bố cục Mới 2026):**
   * **Header Logo góc trái:** Khối vuông xanh bo góc với dấu thập trắng `+` kết hợp chữ **ABC Pharmacy** in đậm sang trọng, loại bỏ dải banner xanh đặc cũ.
   * **Lời chào cá nhân hóa:** `Xin chào [TÊN KHÁCH HÀNG],`
   * **Tiêu đề lớn (Headline):** Nổi bật màu xanh thương hiệu (`#0070ba`), ví dụ: **Giảm 20% toàn chuỗi**.
   * **Lời cảm ơn / Dẫn dắt:** Thông điệp ngắn gọn, ấm áp gửi đến khách hàng.
   * **Khung Voucher nét đứt (Dashed Box):** Hiển thị mã ưu đãi nổi bật cỡ chữ lớn (`HEALTH20`), mô tả mức giảm và dòng chữ màu đỏ cảnh báo hạn dùng `Dùng đến [dd/mm/yyyy]`.
   * **Nút Kêu gọi Hành động (CTA Button):** Nút bo góc màu xanh đặt trang trọng ngay dưới khung voucher: `MUA NGAY TẠI ABC PHARMACY`.
   * **Banner 1200×400 (Tỉ lệ 3:1):** Đặt ngay sau nút CTA để tăng tính nhận diện và thẩm mỹ (ưu tiên ảnh lối sống, không dùng ảnh vỉ thuốc).
   * **Khối Điều kiện áp dụng:** Liệt kê các gạch đầu dòng rõ ràng, minh bạch theo chuẩn thực hành tốt bán lẻ thuốc (GPP).
   * **Chân trang (Footer):** Địa chỉ chuỗi nhà thuốc, hotline dược sĩ tư vấn và liên kết Hủy đăng ký nhận tin (1-Click Unsubscribe) theo chuẩn RFC 2369.

---

## 10. HƯỚNG DẪN THAO TÁC & KỊCH BẢN KIỂM THỬ (QA & TESTING GUIDE)

### Bước 1: Mở giao diện Quản trị Chiến dịch Email
* Mở trình duyệt truy cập: `http://localhost:3001/admin/marketing/email-campaigns`.
* Quan sát 4 thẻ KPI thống kê trên cùng và bảng danh sách các chiến dịch đã có.

### Bước 2: Tạo chiến dịch & Gửi Thử (Send Test)
1. Bấm nút **"+ Tạo chiến dịch mới"** góc trên bên phải.
2. Nhập tiêu đề nội bộ, tiêu đề gửi khách, đường link banner ảnh (`https://...`), nội dung HTML.
3. Chọn tệp khách hàng: **"🌐 Tất cả khách hàng"** hoặc **"⭐ Khách hàng VIP"**.
4. Nhập mã voucher và chọn thử 1 sản phẩm nổi bật.
5. Tại mục **"Kiểm tra giao diện (Send Test)"**:
   * Nhập email cá nhân của bạn (ví dụ: `ntd11102004@gmail.com`).
   * Bấm nút **"Gửi test"**.
   * Hệ thống sẽ tự động lưu nháp chiến dịch (nếu chưa lưu) và gửi email thật qua Resend API.
   * Kiểm tra hòm thư cá nhân để xem email hiển thị thực tế!

### Bước 3: Kiểm tra chức năng Chỉnh sửa (Edit)
1. Quay lại danh sách chiến dịch, tìm chiến dịch vừa tạo.
2. Bấm icon chiếc bút chì (**Sửa**) ở cột Thao tác.
3. Thay đổi tiêu đề thư hoặc nội dung, sau đó bấm **"Lưu bản nháp"** hoặc **"Lên lịch gửi"**.
4. Kiểm tra danh sách: Dữ liệu được cập nhật chính xác trên chính dòng đó, không sinh ra dòng trùng lặp.

### Bước 4: Kiểm tra chức năng Hủy Lịch (Cancel)
1. Đối với một chiến dịch đang ở trạng thái **Đã lên lịch (`SCHEDULED`)**, bấm nút hình tròn gạch chéo (**Hủy lịch**).
2. Modal xác nhận hiển thị: Chọn **"Xác nhận hủy lịch"**.
3. Trạng thái chiến dịch chuyển sang màu xám: **Đã hủy (`CANCELLED`)**; tiến trình Cron Job ngầm sẽ bỏ qua không phát tán.

### Bước 5: Kiểm tra chức năng Xóa (Delete)
1. Bấm nút thùng rác đỏ (**Xóa**) trên bất kỳ chiến dịch nào không còn sử dụng.
2. Modal cảnh báo xóa vĩnh viễn hiển thị -> Bấm **"Xóa vĩnh viễn"**.
3. Chiến dịch lập tức biến mất khỏi bảng (Optimistic UI) và cơ sở dữ liệu được dọn sạch hoàn toàn.

---
> 💡 **Ghi chú vận hành:** Toàn bộ mã nguồn đã được compile sạch sẽ, hệ thống Microservices backend (Port 4000) và frontend (Port 3001) đang hoạt động ổn định và sẵn sàng phục vụ anh yêu nghiệm thu thực tế!
