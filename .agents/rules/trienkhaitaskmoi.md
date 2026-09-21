---
trigger: always_on
---

# Hướng Dẫn Phát Triển Toàn Diện (Fullstack Implementation Playbook) - v2.0

## Kiến Trúc Microservices: API Gateway + Kafka + Redis + MongoDB + React 19 Web + Expo Mobile

Tài liệu này là **"công thức nấu ăn" (Recipe Book)** tối cao và toàn diện dành cho toàn bộ đội ngũ phát triển (Backend, Frontend Web, Mobile) để triển khai đồng bộ tất cả các tác vụ từ tầng Client đến Database.

> [!CAUTION]
> **Quy định bất biến:**
> 1. Tuyệt đối **không** được gọi API HTTP trực tiếp giữa các microservice nội bộ, mọi giao tiếp liên dịch vụ **bắt buộc** phải đi qua **Kafka**.
> 2. Frontend Web và Mobile tuyệt đối **không** kết nối trực tiếp vào Database hoặc Microservice, mọi HTTP request **bắt buộc** phải đi qua **API Gateway** (`/api/...`).
> 3. Nắm vững bản chất **Event-Driven qua Kafka**: Các tác vụ Ghi (Create, Update, Delete) trả về **HTTP 202 ACCEPTED** - không được giả định là đã ghi xong vào DB ngay trong mili-giây đầu tiên.

---

## 1. Hệ Thống Quy Ước Đặt Tên & Phân Nhóm API (API Grouping & Naming Standards)

Hệ thống API được phân nhóm theo **Domain-Driven Bounded Context** để đảm bảo tính module hóa cao, bảo trì dễ dàng và không xung đột định tuyến.

### 1.1. Phân Nhóm Endpoint REST API (API Gateway)

Mọi API Endpoint đều có cấu trúc:
```
/api/<group>/[sub-resource]/[:id]/[action]
```

| Nhóm Domain (Group) | Tiền tố (Prefix) | Trách nhiệm nghiệp vụ | Danh sách Endpoints chính |
| :--- | :--- | :--- | :--- |
| **🔐 Auth & Identity** | `/api/auth` | Đăng nhập, đăng ký, refresh token, đổi mật khẩu, profile cá nhân | `POST /api/auth/login`<br>`POST /api/auth/register`<br>`GET /api/auth/profile`<br>`PUT /api/auth/profile`<br>`POST /api/auth/change-password` |
| **👥 User & HR** | `/api/users`<br>`/api/admin/employees` | Quản lý người dùng, nhân sự chi nhánh, phân quyền RBAC, nhật ký Audit | `GET /api/admin/employees`<br>`POST /api/admin/employees`<br>`PUT /api/admin/employees/:id/ban`<br>`PUT /api/admin/employees/:id/approve`<br>`GET /api/users/audit-logs` |
| **🏢 Branch & Facility** | `/api/branches` | Quản lý danh sách chi nhánh, cơ sở bán lẻ trong chuỗi nhà thuốc | `GET /api/branches`<br>`POST /api/branches`<br>`PUT /api/branches/:id`<br>`DELETE /api/branches/:id` |
| **💊 Inventory & Pharmacy** | `/api/medicines`<br>`/api/inventory-checks`<br>`/api/stock-transfers`<br>`/api/sensors` | Dược phẩm (SKU), tra cứu Barcode GS1, sơ đồ kho GSP, kiểm kê kho, chuyển kho liên chi nhánh, telemetry IoT | `GET /api/medicines`<br>`GET /api/medicines/barcode/:barcode`<br>`POST /api/medicines`<br>`PUT /api/medicines/:id`<br>`POST /api/inventory-checks`<br>`POST /api/inventory-checks/:id/complete`<br>`GET /api/stock-transfers`<br>`POST /api/stock-transfers/:id/receive`<br>`GET /api/sensors/telemetry` |
| **📦 Procurement (Mua hàng)** | `/api/quotas`<br>`/api/suppliers`<br>`/api/purchase-requisitions`<br>`/api/purchase-orders`<br>`/api/goods-receipts`<br>`/api/pricing` | Hạn mức ngân sách, nhà cung cấp GDP, đơn đề xuất (PR), đặt hàng NCC (PO), nghiệm thu nhập kho (GRN), bảng giá chi nhánh | `GET /api/quotas/summary`<br>`POST /api/quotas`<br>`GET /api/suppliers`<br>`POST /api/suppliers`<br>`POST /api/purchase-requisitions`<br>`POST /api/purchase-orders/auto-route`<br>`POST /api/goods-receipts/:id/approve`<br>`GET /api/pricing/:branchId` |
| **🛒 Sales & Customer** | `/api/orders`<br>`/api/sales`<br>`/api/vouchers`<br>`/api/users/cart`<br>`/api/prescriptions` | Đơn hàng bán lẻ/online, cổng PayOS VietQR, voucher khuyến mãi, giỏ hàng, tư vấn toa thuốc AI | `POST /api/orders`<br>`POST /api/orders/payos-link`<br>`GET /api/orders/check/:orderCode`<br>`GET /api/orders/my-orders`<br>`GET /api/vouchers`<br>`POST /api/vouchers/validate`<br>`POST /api/prescriptions/symptom-consult` |
| **📊 Reports & BI** | `/api/reports`<br>`/api/finance` | Thống kê doanh thu toàn chuỗi, dự báo nhu cầu (AI Forecast), tài chính, anomaly detection | `GET /api/reports/dashboard/summary`<br>`GET /api/reports/seasonal-analysis`<br>`GET /api/reports/ai-forecast`<br>`GET /api/finance/daily-summary` |
| **🔔 Notifications** | `/api/notifications` | Quản lý thông báo người dùng theo role và chi nhánh | `GET /api/notifications/me`<br>`PATCH /api/notifications/:id/read`<br>`PATCH /api/notifications/mark-all-read`<br>`GET /api/notifications/unread-count` |

### 1.2. Quy Chuẩn HTTP Method & Mã Trạng Thái

| HTTP Method | Thao tác CRUD | Mã HTTP Gateway | Ý nghĩa & Cách Frontend xử lý |
| :--- | :--- | :--- | :--- |
| `GET` | **Read One / Read All** | `200 OK` | Nhận trực tiếp dữ liệu (từ Redis Cache hoặc Database). Hiển thị ngay lên giao diện. |
| `POST` | **Create (Đồng bộ)** | `201 Created` / `200 OK` | Nhận về thực thể vừa tạo (chỉ áp dụng cho API nghiệp vụ khép kín, tính tiền, xác thực). |
| `POST` | **Create (Bất đồng bộ)** | `202 Accepted` | Gateway đẩy sự kiện vào Kafka. Trả về `{ status: 'Accepted', message: '...' }`. Cập nhật Optimistic UI hoặc báo Toast tiếp nhận. |
| `PUT` | **Update (Bất đồng bộ)** | `202 Accepted` / `200 OK` | Gateway đẩy sự kiện cập nhật vào Kafka và xóa Redis Cache. Frontend thông báo thành công và re-fetch sau 500ms - 1s. |
| `PATCH` | **Update Trạng thái** | `200 OK` | Dùng khi cập nhật một phần hoặc chuyển đổi trạng thái (`/read`, `/approve`, `/status`). |
| `DELETE` | **Delete (Bất đồng bộ)** | `202 Accepted` / `200 OK` | Gateway đẩy sự kiện xóa vào Kafka và xóa Redis Cache. Xóa tạm trên UI và re-fetch. |

### 1.3. Quy Chuẩn Đặt Tên Topic Kafka (Message-Driven Standards)

Topic Kafka tuân thủ cấu trúc phân nhóm Domain-Driven:
* **Đối với sự kiện một chiều (Event-Driven - dùng `emit()`):**
  - Mẫu: `<entity>.event.<action>` hoặc `<domain>.<entity>.event.<action>`
  - Ví dụ: `product.event.create`, `quota.event.create`, `quota.event.update`, `quota.event.delete`, `auth.event.logout`, `sensor.telemetry.ingest`
* **Đối với yêu cầu trả về dữ liệu (Request-Response - dùng `send()`):**
  - Mẫu: `<domain>.<entity>.<action>`
  - Ví dụ: `product.get.by.id`, `product.get.all`, `inventory.medicine.list`, `supplier.get_all`, `supplier.get_by_id`, `orders.create`, `user.branch.list`
* **Phân nhóm tiền tố theo Microservices (Bounded Context):**
  - `inventory.*` : `inventory-service` lắng nghe và xử lý.
  - `user.*` : `user-service` lắng nghe và xử lý.
  - `supplier.*` : `supplier-service` lắng nghe và xử lý.
  - `orders.*` : `orders-service` lắng nghe và xử lý.
  - `auth.*` : `auth-service` lắng nghe và xử lý.
  - `ai.*` : `ai-service` lắng nghe và xử lý.
  - `quota.*` : Service Hạn mức ngân sách xử lý.

### 1.4. Quy Chuẩn Phân Nhóm Thư Mục Services Phía Frontend & Mobile

Cấu trúc thư mục Services trên cả Web (`frontend/src/services/`) và Mobile (`mobile/src/services/`) ánh xạ 1-1 với Bounded Context:
```
src/services/
├── core/                  # HTTP Client, Axios instance, Interceptors, Base config
│   └── api.ts
├── auth/                  # Authentication, Profile, Session
│   └── auth.service.ts
├── admin/                 # Quản trị nhân viên, phân quyền, chi nhánh
│   ├── branch.service.ts
│   └── employee.service.ts
├── inventory/             # Dược phẩm, Sơ đồ kho, Kiểm kê, Chuyển kho, IoT
│   ├── medicine.service.ts
│   ├── inventoryCheck.service.ts
│   ├── stockTransfer.service.ts
│   ├── pricing.service.ts
│   └── sensorTelemetry.service.ts
├── purchase/              # Hạn mức ngân sách, Nhà cung cấp, PR, PO, GRN
│   ├── quota.service.ts
│   ├── supplier.service.ts
│   ├── purchaseRequisition.service.ts
│   ├── purchaseOrder.service.ts
│   └── goodsReceipt.service.ts
├── sales/                 # Đơn hàng, Giỏ hàng, Voucher, Đơn thuốc AI
│   ├── order.service.ts
│   ├── cart.service.ts
│   ├── voucher.service.ts
│   └── prescription.service.ts
├── report/                # Báo cáo doanh thu, Tồn kho an toàn, Dự báo
│   └── report.service.ts
└── notification/          # Thông báo in-app, Socket.IO listeners
    └── notification.service.ts
```

### 1.5. Quy Chuẩn Socket.IO Realtime Events

* **Phân nhóm phòng (Rooms):** `user-{userId}`, `branch-{branchId}`, `admin`, `warehouse`.
* **Sự kiện nghiệp vụ chuẩn:**
  - `pr_updated`, `new_pr_notification`, `pr_approved_notification`, `pr_rejected_notification`
  - `new_po_notification`
  - `grn_completed_notification`
  - `sensor:telemetry`, `sensor:alert`

---

## 2. Luồng Giao Tiếp Chuẩn Cho Các Tác Vụ (CRUD Protocols)

| Tác vụ (Operation) | Giao thức truyền thông | Cơ chế Cache (Redis) |
| :--- | :--- | :--- |
| **Create (Tạo mới)** | Event-Driven (Gateway `emit` -> Kafka -> Microservice) | Chủ động cập nhật cache hoặc đợi đọc lần đầu. |
| **Read One (Đọc chi tiết)** | Request-Response (Gateway `send` -> Kafka -> Microservice) | **Cache-Aside:** Kiểm tra Redis trước. Nếu Miss, gọi DB rồi lưu Redis. |
| **Read All (Đọc danh sách)** | Request-Response (Gateway `send` -> Kafka -> Microservice) | Query DB trực tiếp qua Kafka hoặc Cache ngắn hạn (TTL ngắn). |
| **Update (Cập nhật)** | Event-Driven (Gateway `emit` -> Kafka -> Microservice) | **Cache Eviction:** Xóa hoặc ghi đè cache cũ trên Redis ngay lập tức. |
| **Delete (Xóa)** | Event-Driven (Gateway `emit` -> Kafka -> Microservice) | **Cache Eviction:** Xóa hẳn key cache tương ứng khỏi Redis. |

---

## 3. Mã Nguồn Mẫu Chuẩn Hóa Phía Backend (Entity: `Product`)

Dưới đây là mã nguồn quy chuẩn cho một Entity tên là `Product`. Dev Team có thể thay thế cụm từ `Product` bằng bất kỳ Entity nào khác (`Order`, `User`, `Voucher`, `Quota`...).

### 3.1. Controller API Gateway (`apps/api-gateway/src/controllers/product.controller.ts`)

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Inject, OnModuleInit, HttpStatus, HttpCode } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('📦 Products')
@Controller('api/products')
export class ProductController implements OnModuleInit {
  private readonly CACHE_TTL = 3600000; // 1 giờ (mili-giây)

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'product.get.by.id',
      'product.get.all',
    ]);
  }

  // ==========================================
  // CREATE - Bất đồng bộ (Event-Driven)
  // ==========================================
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Async Kafka Event)' })
  async createProduct(@Body() dto: { name: string; price: number; stock: number }) {
    this.kafkaClient.emit('product.event.create', JSON.stringify(dto));
    return {
      status: 'Accepted',
      message: 'Sự kiện tạo sản phẩm đã được gửi vào hàng đợi Kafka để xử lý!',
    };
  }

  // ==========================================
  // READ ONE - Đồng bộ + Cache Layer
  // ==========================================
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm (Cache-Aside)' })
  async getProductById(@Param('id') id: string) {
    const cacheKey = `product:${id}`;

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ [Cache Hit] Lấy sản phẩm ${id} từ Redis`);
      return cachedData;
    }

    console.log(`❌ [Cache Miss] Lấy sản phẩm ${id} qua Kafka -> Database`);
    const product = await sendKafkaMessage(this.kafkaClient, 'product.get.by.id', id);

    if (product) {
      await this.cacheManager.set(cacheKey, product, this.CACHE_TTL);
    }
    return product;
  }

  // ==========================================
  // READ ALL - Đồng bộ
  // ==========================================
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm' })
  async getAllProducts() {
    return await sendKafkaMessage(this.kafkaClient, 'product.get.all', {});
  }

  // ==========================================
  // UPDATE - Bất đồng bộ (Event-Driven)
  // ==========================================
  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật sản phẩm (Async Kafka Event + Evict Cache)' })
  async updateProduct(@Param('id') id: string, @Body() dto: any) {
    const payload = { id, data: dto };
    this.kafkaClient.emit('product.event.update', JSON.stringify(payload));
    await this.cacheManager.del(`product:${id}`);

    return {
      status: 'Accepted',
      message: 'Yêu cầu cập nhật sản phẩm đang được xử lý ngầm!',
    };
  }

  // ==========================================
  // DELETE - Bất đồng bộ (Event-Driven)
  // ==========================================
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa sản phẩm (Async Kafka Event + Evict Cache)' })
  async deleteProduct(@Param('id') id: string) {
    this.kafkaClient.emit('product.event.delete', id);
    await this.cacheManager.del(`product:${id}`);

    return {
      status: 'Accepted',
      message: 'Yêu cầu xóa sản phẩm đã được tiếp nhận!',
    };
  }
}
```

---

### 3.2. Controller Microservice (`apps/products-service/src/product-ms.controller.ts`)

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { ProductMsService } from './product-ms.service';

@Controller()
export class ProductMsController {
  constructor(private readonly productService: ProductMsService) {}

  // =========================================================================
  // CONSUME EVENTS (Các tác vụ Ghi - Dùng EventPattern của cơ chế emit())
  // =========================================================================
  @EventPattern('product.event.create')
  async handleProductCreate(@Payload() data: string) {
    const dto = JSON.parse(data);
    await this.productService.create(dto);
    console.log('✅ [Microservice] Đã tạo thành công sản phẩm mới trong Database!');
  }

  @EventPattern('product.event.update')
  async handleProductUpdate(@Payload() payload: string) {
    const { id, data } = JSON.parse(payload);
    await this.productService.update(id, data);
    console.log(`✅ [Microservice] Đã cập nhật thành công sản phẩm ${id} trong Database!`);
  }

  @EventPattern('product.event.delete')
  async handleProductDelete(@Payload() id: string) {
    await this.productService.delete(id);
    console.log(`✅ [Microservice] Đã xóa thành công sản phẩm ${id} khỏi Database!`);
  }

  // =========================================================================
  // CONSUME MESSAGES (Các tác vụ Đọc - Dùng MessagePattern của cơ chế send())
  // =========================================================================
  @MessagePattern('product.get.by.id')
  async getProductById(@Payload() id: string) {
    return this.productService.findById(id);
  }

  @MessagePattern('product.get.all')
  async getAllProducts() {
    return this.productService.findAll();
  }
}
```

---

### 3.3. Service Microservice (`apps/products-service/src/product-ms.service.ts`)

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';

@Injectable()
export class ProductMsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(data: any): Promise<Product> {
    const newProduct = new this.productModel(data);
    return newProduct.save();
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product với ID ${id} không tồn tại!`);
    }
    return product;
  }

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async update(id: string, data: any): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!updatedProduct) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id} để cập nhật!`);
    }
    return updatedProduct;
  }

  async delete(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id} để xóa!`);
    }
  }
}
```

---

## 4. Mã Nguồn Mẫu Chuẩn Hóa Phía Frontend & Mobile

Dưới đây là cấu trúc mẫu 3 tầng hoàn chỉnh cho Frontend: **Service -> Custom Hook -> Component UI**.

### 4.1. Tầng 1: Service Layer (`src/services/inventory/product.service.ts`)

```typescript
import api from '../core/api';

export interface ProductData {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sku?: string;
}

export interface AsyncAcceptedResponse {
  status: string;
  message: string;
}

export const productService = {
  async getProducts(params?: { search?: string; category?: string; page?: number; limit?: number }) {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  async getProductById(id: string): Promise<ProductData> {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  async createProduct(data: Omit<ProductData, '_id' | 'id'>): Promise<AsyncAcceptedResponse> {
    const response = await api.post('/api/products', data);
    return response.data;
  },

  async updateProduct(id: string, data: Partial<ProductData>): Promise<AsyncAcceptedResponse> {
    const response = await api.put(`/api/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id: string): Promise<AsyncAcceptedResponse> {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },
};
```

---

### 4.2. Tầng 2: Custom Hook (`src/hooks/useProductManagement.ts`)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { productService, ProductData } from '../services/inventory/product.service';

export function useProductManagement() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getProducts();
      setProducts(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi tải danh mục sản phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Xử lý Lưu (Tạo mới hoặc Cập nhật) với Delayed Re-fetch an toàn
  const saveProduct = async (payload: Partial<ProductData>, id?: string) => {
    try {
      setSubmitting(true);
      if (id) {
        await productService.updateProduct(id, payload);
      } else {
        await productService.createProduct(payload as any);
      }
      // Đợi Kafka Consumer ghi DB và làm tươi Redis (1 giây) trước khi re-fetch
      setTimeout(() => {
        loadProducts();
      }, 1000);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu sản phẩm';
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý Xóa với Optimistic UI (Ẩn ngay trên giao diện)
  const deleteProduct = async (id: string) => {
    const previousProducts = [...products];
    setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));

    try {
      await productService.deleteProduct(id);
      setTimeout(() => loadProducts(), 1000);
      return { success: true };
    } catch (err: any) {
      setProducts(previousProducts); // Rollback nếu lỗi
      const msg = err.response?.data?.message || err.message || 'Lỗi khi xóa sản phẩm';
      return { success: false, error: msg };
    }
  };

  return {
    products,
    loading,
    submitting,
    error,
    refresh: loadProducts,
    saveProduct,
    deleteProduct,
  };
}
```

---

### 4.3. Tầng 3: UI Component Mẫu (`src/components/inventory/ProductList.tsx`)

```tsx
import React, { useState } from 'react';
import { useProductManagement } from '../../hooks/useProductManagement';

export const ProductList: React.FC = () => {
  const { products, loading, submitting, saveProduct, deleteProduct } = useProductManagement();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);

  const handleCreate = async () => {
    if (!name.trim()) return alert('Vui lòng nhập tên sản phẩm');
    const res = await saveProduct({ name, price, stock: 100, category: 'Kháng sinh' });
    if (res.success) {
      setName('');
      setPrice(0);
      alert('Sự kiện tạo sản phẩm đã được gửi vào hàng đợi Kafka để xử lý!');
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;
    const res = await deleteProduct(id);
    if (!res.success) alert(res.error);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Quản Lý Dược Phẩm (Playbook v2.0)</h1>

      {/* Form Tạo Mới */}
      <div className="flex gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <input
          type="text"
          placeholder="Tên dược phẩm..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="Giá..."
          value={price || ''}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
        >
          {submitting ? 'Đang gửi...' : 'Thêm Dược Phẩm'}
        </button>
      </div>

      {/* Danh sách sản phẩm */}
      {loading ? (
        <div className="text-center py-10 text-slate-500">Đang tải dữ liệu từ Redis Cache / Kafka...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {products.map((p) => {
            const pid = p._id || p.id || '';
            return (
              <div key={pid} className="flex justify-between items-center p-4 hover:bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  <div className="text-sm text-slate-500">{p.price.toLocaleString('vi-VN')} ₫ | Kho: {p.stock}</div>
                </div>
                <button
                  onClick={() => handleDelete(pid)}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium"
                >
                  Xóa
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

---

## 5. Các Quy Tắc An Toàn Dành Cho Dev Team (Fullstack Safety Rules)

### 5.1. Quy Tắc Phía Backend
> [!WARNING]
> **1. Quy tắc nhất quán Cache (Cache Consistency):**
> Luôn luôn thực hiện xóa Cache (`cacheManager.del`) ngay tại API Gateway khi phát ra sự kiện `Update` hoặc `Delete`. Việc giữ lại cache cũ sẽ khiến Client đọc phải thông tin sai lệch (Stale Data).

> [!IMPORTANT]
> **2. Ép kiểu dữ liệu qua Kafka:**
> Kafka chỉ truyền dữ liệu ở dạng chuỗi (String/Buffer). Khi phát ra sự kiện (`emit` / `send`), hãy luôn sử dụng `JSON.stringify(payload)`. Phía Microservice nhận vào cần parse ngược lại `JSON.parse(data)` để sử dụng.

### 5.2. Quy Tắc Phía Frontend & Mobile
> [!WARNING]
> **1. Chuẩn hóa Định dạng Khóa ID (`_id` vs `id`):**
> Database MongoDB sử dụng trường `_id`, tuy nhiên một số endpoint có thể alias thành `id`. Trong code TypeScript, luôn truy xuất theo chuẩn an toàn:
> `const entityId = item._id || item.id;`

> [!IMPORTANT]
> **2. Chống Double-Click (Debounce & Submit Guard):**
> Vì các tác vụ Ghi bắn event vào Kafka (`emit`), nếu người dùng click liên tiếp nhiều lần sẽ tạo ra nhiều sự kiện nhân bản trong hàng đợi Kafka.
> **Bắt buộc:** Luôn khóa nút bấm (`disabled={submitting}`) ngay khi request được kích hoạt.

> [!TIP]
> **3. Không ép buộc UI đợi ID từ HTTP 202:**
> Khi gọi `POST /api/...` trả về `202 Accepted`, response **không chứa** `_id` của bản ghi mới. Không được viết code logic phụ thuộc vào `res.data._id` ngay lập tức. Hãy thông báo Toast thành công và re-fetch danh sách sau 1s hoặc lắng nghe qua WebSocket.