---
name: abc-frontend-skill
description: >-
  Bộ kỹ năng toàn diện chuẩn hóa phát triển Frontend (Web React 19 & Mobile Expo) cho hệ thống WDP301:
  kết hợp 4 trụ cột chuyên sâu gồm UI Architecture Skill (3-tier, Kafka 202 async, Gateway API, RBAC, Socket.IO),
  UI Design Skill (Design tokens y tế/dược phẩm, Spacing 4px, Typography, Micro-interactions Motion),
  UI Component Skill (Atomic Design, Strict TypeScript, Reusable UI Patterns: POS, Barcode, Warehouse Grid),
  và UI QA Skill (Playwright E2E, a11y WCAG 2.1 AA, Responsive layout audit, Performance & Anti-defect checklist).
---

# Kỹ Năng Phát Triển Frontend Toàn Diện (`/abc-frontend-skill`)
### Bộ Tiêu Chuẩn 4 Trụ Cột: UI Architecture • UI Design • UI Component • UI QA
### Hệ Thống WDP301: React 19 Vite Web + Expo 57 React Native Mobile + NestJS Gateway

Tài liệu này là **Quy Chuẩn Tối Cao (Master Blueprint & Recipe Book)** định hình toàn bộ quy trình phát triển giao diện người dùng (Frontend Web & Mobile) cho dự án WDP301. Kỹ năng tích hợp chặt chẽ 4 trụ cột chuyên biệt, bảo đảm tính module hóa, hiệu năng cao, trải nghiệm trực quan và không có lỗi trước khi nghiệm thu.

> [!IMPORTANT]
> **Các Nguyên Tắc Bất Biến (Immutable Core Rules):**
> 1. **Kiến Trúc 3 Tầng Phân Lập (3-Tier Separation of Concerns):** `Service (API Gateway)` ➔ `Custom Hook (Business & Async State)` ➔ `Component / Page (Presentation Only)`. Tuyệt đối không gọi Axios hoặc fetch trực tiếp trong UI components.
> 2. **Xử Lý Sự Kiện Bất Đồng Bộ Kafka (HTTP 202 Accepted):** Mọi thao tác Ghi (Create, Update, Delete) qua Gateway trả về 202 Accepted. UI phải áp dụng **Optimistic UI** hoặc thông báo Toast tiếp nhận, kèm **Delayed Re-fetch (1000ms)** để chờ Consumer ghi DB và làm tươi Redis.
> 3. **Chỉ Gọi Qua API Gateway:** Mọi HTTP request bắt buộc dùng tiền tố `/api/...`. Tuyệt đối không trỏ trực tiếp đến cổng microservice nội bộ.
> 4. **English Code Comments Only:** Toàn bộ chú thích mã nguồn (`//`, `/* */`, JSDoc) bắt buộc viết bằng Tiếng Anh. Không dùng tiếng Việt trong code comments.
> 5. **Git Safety:** Không tự ý push code lên Git; dừng lại ở `git status` để lập trình viên tự push. Mọi thao tác Git quan trọng phải xin xác nhận.

---

## 1. Bản Đồ 4 Trụ Cột Frontend (The 4 Pillars Matrix)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ABC FRONTEND SKILL SUITE                               │
└─────────────────────────────────────────────────────────────────────────────────┘
         │                          │                          │                          │
         ▼                          ▼                          ▼                          ▼
 ┌───────────────┐          ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
 │   PILLAR 1    │          │   PILLAR 2    │          │   PILLAR 3    │          │   PILLAR 4    │
 │UI ARCHITECTURE│          │   UI DESIGN   │          │ UI COMPONENT  │          │     UI QA     │
 │   (FE-ARCH)   │          │  (FE-DESIGN)  │          │(FE-COMPONENT) │          │    (FE-QA)    │
 ├───────────────┤          ├───────────────┤          ├───────────────┤          ├───────────────┤
 │• 3-Tier Layer │          │• Med Tokens   │          │• Atomic Design│          │• Playwright   │
 │• Kafka 202 UI │          │• 4px Spacing  │          │• Strict Props │          │• a11y WCAG AA │
 │• Gateway Auth │          │• Tabular Nums │          │• Generic Types│          │• Viewport RWD │
 │• Socket Rooms │          │• Cold Chain UI│          │• Compound Ptrn│          │• Perf Audits  │
 │• Web + Mobile │          │• Micro-Motion │          │• POS & Grids  │          │• 15-Pt Checks │
 └───────────────┘          └───────────────┘          └───────────────┘          └───────────────┘
```

---

## 2. Trụ Cột 1: UI Architecture Skill (`FE-ARCH`)

Trụ cột Kiến trúc đảm bảo mã nguồn frontend có tổ chức logic, dễ mở rộng, xử lý mượt mà bản chất bất đồng bộ của hạ tầng Event-Driven Microservices (API Gateway + Kafka + Redis).

### 2.1. Cấu Trúc 3 Tầng Chuẩn Hóa (3-Tier Separation of Concerns)

```
frontend/src/
├── services/                 # TẦNG 1: HTTP Gateway API Layer (Pure functions, Typed)
│   ├── core/api.ts           # Centralized Axios with Bearer token & refresh interceptor
│   ├── inventory/            # Inventory & Pharmacy domain services
│   ├── purchase/             # Quotas, Suppliers, PR, PO, GRN services
│   └── sales/                # Orders, PayOS VietQR, Cart, Vouchers
├── hooks/                    # TẦNG 2: Custom Hook Layer (State, Optimistic, Kafka Timing)
│   ├── useProductManagement.ts
│   ├── usePurchaseOrder.ts
│   └── useGspWarehouseGrid.ts
└── components/ & pages/      # TẦNG 3: Presentation UI Layer (JSX, Tailwind v4, No direct API)
    ├── inventory/
    └── pages/branch/
```

### 2.2. Xử Lý Bất Đồng Bộ Kafka (HTTP 202 Accepted & Delayed Re-fetch)

Khi gọi API Gateway thực hiện các thao tác Ghi (`POST`, `PUT`, `DELETE`), Gateway đẩy message vào Kafka và trả về ngay lập tức:
```json
{
  "status": "Accepted",
  "message": "Sự kiện đã được gửi vào hàng đợi Kafka để xử lý!"
}
```

**Mẫu Custom Hook Chuẩn (`src/hooks/useMedicineManagement.ts`):**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { medicineService, MedicineItem } from '../services/inventory/medicine.service';

export function useMedicineManagement() {
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Read data from Gateway / Redis Cache
  const loadMedicines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await medicineService.getMedicines();
      setMedicines(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  // Create or update with delayed refetch to allow Kafka consumer execution
  const saveMedicine = async (payload: Partial<MedicineItem>, id?: string) => {
    try {
      setSubmitting(true);
      setError(null);

      if (id) {
        await medicineService.updateMedicine(id, payload);
      } else {
        await medicineService.createMedicine(payload as any);
      }

      // Allow 1000ms for Kafka consumer to update database and invalidate Redis
      setTimeout(() => {
        loadMedicines();
      }, 1000);

      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save medicine';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  // Optimistic UI delete with rollback support
  const deleteMedicine = async (id: string) => {
    const backup = [...medicines];
    setMedicines((prev) => prev.filter((m) => (m._id || m.id) !== id));

    try {
      await medicineService.deleteMedicine(id);
      setTimeout(() => loadMedicines(), 1000);
      return { success: true };
    } catch (err: any) {
      setMedicines(backup);
      const msg = err.response?.data?.message || err.message || 'Failed to delete medicine';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  return { medicines, loading, submitting, error, refresh: loadMedicines, saveMedicine, deleteMedicine };
}
```

### 2.3. Tích Hợp Realtime WebSockets (Socket.IO Rooms)

* Lắng nghe sự kiện đẩy từ server theo từng phòng:
  - `user-{userId}`: Thông báo riêng cá nhân.
  - `branch-{branchId}`: Biến động ca làm, doanh số chi nhánh, đơn hàng tại quầy.
  - `warehouse`: Cảnh báo nhiệt độ GSP, hoàn tất nhập kho GRN, biến động tồn kho an toàn.

```typescript
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export function useRealtimeBranchAlerts(branchId: string, onAlert: (data: any) => void) {
  useEffect(() => {
    if (!branchId) return;

    // Connect to WebSocket gateway
    const socket: Socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });

    socket.emit('join_room', `branch-${branchId}`);

    socket.on('sensor:alert', (payload) => {
      onAlert(payload);
    });

    socket.on('pr_updated', (payload) => {
      onAlert(payload);
    });

    return () => {
      socket.emit('leave_room', `branch-${branchId}`);
      socket.disconnect();
    };
  }, [branchId, onAlert]);
}
```

---

## 3. Trụ Cột 2: UI Design Skill (`FE-DESIGN`)

Trụ cột Thiết kế mang lại tính nhất quán thẩm mỹ, đáp ứng chuẩn mực ngành Y tế - Dược phẩm hiện đại và công thái học (Ergonomics) cao.

### 3.1. Hệ Thống Design Tokens (Medical & Pharmacy ERP)

| Token Nhóm | Giá Trị / Lớp Tailwind | Mã Màu Hex | Ứng Dụng Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `bg-emerald-600`, `text-emerald-600` | `#059669` / `#10b981` | Thương hiệu nhà thuốc, nút chính, trạng thái Active |
| **Medical Teal** | `bg-teal-600`, `text-teal-600` | `#0d9488` | Biểu tượng dược khoa, thẻ hồ sơ sức khỏe, đơn thuốc |
| **Cold Chain (GSP)**| `bg-sky-500`, `text-sky-600` | `#0284c7` / `#38bdf8` | Thuốc bảo quản lạnh `2°C - 8°C`, cảm biến kho GSP |
| **Slate Neutrals** | `bg-slate-900`, `bg-slate-50`, `border-slate-200` | `#0f172a` ➔ `#f8fafc` | Khung nền, đường viền phân cách, tiêu đề bảng |
| **Status: Success** | `bg-emerald-100`, `text-emerald-800` | `#d1fae5` / `#065f46` | Đã duyệt (Approved), Đã nhận (Received), Hợp lệ |
| **Status: Warning** | `bg-amber-100`, `text-amber-800` | `#fef3c7` / `#92400e` | Chờ duyệt (Pending), Cận hạn dùng (Near Expiry) |
| **Status: Danger** | `bg-rose-100`, `text-rose-800` | `#ffe4e6` / `#9f1239` | Hết hàng (Out of stock), Lỗi hệ thống, Hủy bỏ (Rejected) |
| **Status: Cold Alert**| `bg-cyan-100`, `text-cyan-800` | `#cffafe` / `#155e75` | Lệch nhiệt độ kho lạnh GSP |

### 3.2. Quy Chuẩn Khoảng Cách (4px Spacing Rhythm) & Typography

* **Spacing:** Tuân thủ bội số 4px của Tailwind:
  - Padding ô bảng: `p-3` hoặc `p-4`.
  - Khoảng cách giữa các thẻ: `gap-4` (16px) hoặc `gap-6` (24px).
  - Bo góc (Border Radius): `rounded-xl` (12px) cho Cards/Modals; `rounded-lg` (8px) cho Inputs/Buttons; `rounded-full` cho Status Badges.
* **Typography & Tabular Numerals:**
  - Tiêu đề: `font-bold tracking-tight text-slate-900`.
  - Giá tiền & Barcode GS1: **Bắt buộc** dùng `font-mono tabular-nums font-semibold` để không bị nhảy giật layout khi số tiền thay đổi.
  ```tsx
  {/* Standard formatted price with tabular numerals */}
  <span className="font-mono tabular-nums font-semibold text-emerald-700">
    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}
  </span>
  ```

### 3.3. Micro-Interactions & Animation (Motion & Reanimated)

* **Web (React 19 with Motion):**
  - Chuyển động xuất hiện Modal: `initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}`.
  - Hiệu ứng tải dữ liệu: Skeleton Shimmer (`animate-pulse bg-slate-200`).
* **Mobile (React Native Reanimated 4):**
  - Kéo mở Bottom Sheet với `withSpring()` vật lý tự nhiên.
  - Rung phản hồi haptic khi quét thành công Barcode GS1 bằng camera.

---

## 4. Trụ Cột 3: UI Component Skill (`FE-COMPONENT`)

Trụ cột Linh kiện áp dụng mô hình **Atomic Design**, TypeScript khắt khe (Zero `any`), và giải quyết các bài toán giao diện đặc thù ERP nhà thuốc.

### 4.1. Hệ Phân Cấp Atomic Components

1. **Atoms (Nguyên tử):**
   - `Button`: Hỗ trợ variants (`primary`, `secondary`, `danger`, `outline`), states (`loading`, `disabled`).
   - `StatusBadge`: Hiển thị trạng thái với màu ngữ nghĩa y tế.
   - `CurrencyText`: Định dạng tiền tệ VND đồng nhất.
2. **Molecules (Phân tử):**
   - `SearchBar`: Tích hợp debounce 300ms, clear icon, phím tắt Focus `/`.
   - `BarcodeScannerInput`: Ô nhập kèm icon máy quét cầm tay, bắt sự kiện `Enter` từ đầu đọc mã vạch.
   - `StatMiniCard`: Thẻ chỉ số kèm icon, tỷ lệ tăng trưởng so với kỳ trước.
3. **Organisms (Sinh vật):**
   - `DataTable`: Hỗ trợ multi-column sort, phân trang server-side, selection checkbox, empty state, skeleton loading.
   - `WarehouseRackGrid`: Sơ đồ trực quan 2D giá kệ GSP (Khu vực - Dãy - Kệ - Tầng - Ô).
   - `PosOrderCart`: Giỏ hàng bán lẻ chia cột, tính thuế VAT, chiết khấu voucher, và kích hoạt PayOS VietQR popup.
4. **Templates & Layouts:**
   - `DashboardLayout`: Khung điều hành chuẩn gồm Sidebar phân quyền, Topbar, Chuông thông báo realtime, Avatar.

### 4.2. Mẫu Linh Kiện Chuẩn: ERP DataTable Có Phân Trang & Sorting

```tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id?: string; _id?: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="p-3.5" style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-10 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <span>Loading data...</span>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-10 text-center text-slate-500 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, idx) => {
                const key = item._id || item.id || `row-${idx}`;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition hover:bg-slate-50/70 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="p-3.5 text-slate-700">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 5. Trụ Cột 4: UI QA Skill (`FE-QA`)

Trụ cột Kiểm định chất lượng bảo đảm giao diện không bị vỡ trên mọi kích thước màn hình, tuân thủ khả năng tiếp cận (Accessibility), và có kịch bản E2E kiểm chứng tự động.

### 5.1. Ma Trận Kích Thước Viewport (Responsive Layout Matrix)

Mọi màn hình Web và Mobile phải được kiểm tra qua 4 mốc chuẩn:
1. **Mobile XS (375px - iPhone SE / 390px - iPhone 14):**
   - Đảm bảo thanh điều hướng dưới đáy (Bottom Tab Navigation).
   - Nút bấm tối thiểu đạt chuẩn ngón tay: `min-h-[44px]` và `min-w-[44px]`.
   - Bảng dài chuyển thành dạng Thẻ (Card View).
2. **Tablet (768px - iPad Vertical):**
   - Sidebar thu gọn thành dạng mini-icon.
   - Bố cục 2 cột cho biểu mẫu.
3. **Desktop Standard (1280px / 1440px):**
   - Hiển thị đầy đủ bảng dữ liệu 8-10 cột với bộ lọc cố định bên trên.
4. **Desktop Ultrawide / 2K ERP (1920px+):**
   - Đóng khung `max-w-7xl mx-auto` tránh dãn dòng quá dài gây mỏi mắt cho Dược sĩ.

### 5.2. Tiêu Chuẩn Khả Năng Tiếp Cận (Accessibility - WCAG 2.1 AA)

- **Color Contrast:** Tỷ lệ tương phản chữ/nền tối thiểu `4.5:1` cho chữ thường và `3:1` cho chữ to/in đậm.
- **ARIA & Keyboard Navigation:**
  - Mọi nút bấm chỉ có Icon (như Lucide Icon) **bắt buộc** phải có thuộc tính `aria-label`:
    ```tsx
    <button aria-label="Delete medicine" onClick={handleDelete}>
      <Trash2 className="w-4 h-4" />
    </button>
    ```
  - Mọi ô `<input>` phải có `id` gắn liền với `<label htmlFor="...">`.
  - Hộp thoại (Modal) phải bẫy tiêu điểm (Focus Trap) và đóng được khi nhấn phím `Escape`.

### 5.3. Kịch Bản Playwright E2E Tự Động (Testing Recipe)

Kiểm thử toàn bộ chu trình từ đăng nhập đến tạo mới dữ liệu và đón nhận phản hồi bất đồng bộ Kafka:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Procurement Module E2E Flow', () => {
  test('should create purchase requisition and receive accepted toast', async ({ page }) => {
    // 1. Authenticate as branch manager
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'manager@vinapharmacy.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/branch/);

    // 2. Navigate to PR Creation Page
    await page.goto('/branch/purchase-requisitions/new');
    await expect(page.locator('h1')).toContainText('Tạo Đơn Đề Xuất Mua Hàng');

    // 3. Fill form details
    await page.fill('#pr-title', 'Đề xuất nhập kháng sinh tháng 10');
    await page.click('button:has-text("Thêm thuốc")');
    await page.selectOption('select[name="medicineId"]', { index: 1 });
    await page.fill('input[name="quantity"]', '100');

    // 4. Submit form (Event sent to Kafka via API Gateway)
    await page.click('button[type="submit"]');

    // 5. Assert Kafka HTTP 202 Accepted feedback notification
    await expect(page.locator('text=tiếp nhận')).toBeVisible({ timeout: 5000 });
  });
});
```

### 5.4. Bảng Kiểm Tra Chống Lỗi Trước Khi Giao Việc (15-Point Anti-Defect Checklist)

Trước khi xác nhận hoàn thành bất kỳ task Frontend nào, duyệt qua 15 điểm sau:
- [ ] 1. Không có direct Axios/fetch trong components (đã tách vào Service và Custom Hook).
- [ ] 2. Mọi API call đều bắt đầu bằng `/api/...` (đi qua API Gateway).
- [ ] 3. Có cơ chế xử lý độ trễ Kafka 1000ms hoặc Optimistic UI cho tác vụ Ghi.
- [ ] 4. Không có chú thích code bằng Tiếng Việt (100% English code comments).
- [ ] 5. Mọi nút Icon đều có `aria-label` cho Screen Reader.
- [ ] 6. Mọi ô nhập form đều có `id` khớp với `htmlFor` của thẻ `<label>`.
- [ ] 7. Mọi số tiền hoặc mã SKU barcode đều dùng `font-mono tabular-nums`.
- [ ] 8. Đã kiểm tra không bị tràn màn hình ở chiều ngang `375px`.
- [ ] 9. Bảng dữ liệu có trạng thái Loading (Spinner/Skeleton) và trạng thái Empty rõ ràng.
- [ ] 10. Mọi danh sách render qua `.map()` đều có `key` duy nhất (không dùng index đơn thuần nếu danh sách có thêm/xóa).
- [ ] 11. Các giá trị mảng hoặc object từ API được bảo vệ bằng optional chaining (`?.`) hoặc default fallback (`|| []`).
- [ ] 12. Không còn cảnh báo TypeScript (`tsc --noEmit` đạt 0 lỗi).
- [ ] 13. Nút bấm submit có trạng thái disabled và spinner khi `submitting === true` để chống double-click.
- [ ] 14. Dialog xác nhận (Confirm modal) được kích hoạt trước các thao tác Xóa (Delete) hoặc Hủy bỏ.
- [ ] 15. Dừng lại ở `git status`, không tự tiện commit hoặc push lên repository.

---

## 6. Bộ Công Cụ Tự Động Hóa Kèm Theo (Automated CLI Tooling)

Kỹ năng này trang bị 3 công cụ Python mạnh mẽ nằm trong thư mục `.agents/skills/abc-frontend-skill/scripts/`:

### 6.1. Trình Kiểm Tra Chuẩn Mã Nguồn (`fe_validator.py`)
Tự động quét toàn bộ mã nguồn Frontend để phát hiện vi phạm kiến trúc 3-tier, gọi sai cổng microservice, chú thích tiếng Việt, hoặc thẻ ảnh thiếu `alt`:
```bash
python3 .agents/skills/abc-frontend-skill/scripts/fe_validator.py frontend/src
```
Tùy chọn lọc:
- `--category RULE`: Kiểm tra quy tắc chú thích tiếng Việt.
- `--category ARCH`: Kiểm tra kiến trúc 3 tầng và định tuyến Gateway.
- `--category QA`: Kiểm tra cơ bản về a11y và layout.

### 6.2. Trình Sinh Mã Nhanh 3 Tầng Chuẩn Hóa (`scaffold_fe.py`)
Tạo ngay lập tức bộ 4 file hoàn chỉnh gồm **Service + Custom Hook + UI Component + Playwright E2E Test** cho một chức năng mới:
```bash
python3 .agents/skills/abc-frontend-skill/scripts/scaffold_fe.py voucher --domain sales --endpoint vouchers
```

### 6.3. Trình Kiểm Định QA & Độ Phủ E2E (`qa_auditor.py`)
Kiểm tra độ phủ kiểm thử E2E giữa các trang và các file spec, phát hiện chiều rộng cố định làm hỏng giao diện di động:
```bash
python3 .agents/skills/abc-frontend-skill/scripts/qa_auditor.py frontend/src
```

---

## 7. Quy Trình Vận Hành Khi Kích Hoạt Lệnh (`/abc-frontend-skill`)

Khi người dùng gõ `/abc-frontend-skill` kèm yêu cầu, Agent sẽ thực thi theo 5 bước:

1. **Bước 1: Phân Tích & Xác Định Ngữ Cảnh:**
   - Xác định rõ tác vụ thuộc phân hệ nào: Web (`frontend/`) hay Mobile (`mobile/`).
   - Xác định mục tiêu: Tạo mới chức năng (Scaffold), Tối ưu linh kiện (Component Refactor), Thiết kế giao diện (Design System), hay Kiểm định chất lượng (QA Audit).
2. **Bước 2: Thiết Kế & Xác Lập Design Tokens:**
   - Lựa chọn bảng màu y tế chuẩn (Emerald, Teal, Cold Chain Sky, Slate).
   - Định hình bố cục Responsive và phân cấp typographic tabular numerals.
3. **Bước 3: Lập Trình Tuân Thủ 3 Tầng & Kafka Async:**
   - Xây dựng Service với kiểu dữ liệu TypeScript nghiêm ngặt.
   - Xây dựng Custom Hook quản lý trạng thái, bẫy lỗi và độ trễ Kafka 1000ms.
   - Xây dựng Component UI chỉ làm nhiệm vụ hiển thị, có loading & empty states.
   - Bảo đảm 100% code comments bằng Tiếng Anh.
4. **Bước 4: Chạy Công Cụ Kiểm Định Chất Lượng:**
   - Chạy `fe_validator.py` và `qa_auditor.py` để bảo đảm 0 lỗi quy chuẩn.
   - Chạy `npm run lint` hoặc `tsc --noEmit` để xác nhận TypeScript trong sạch.
5. **Bước 5: Báo Cáo & Dừng Tại Git Status:**
   - Tóm tắt kết quả theo 4 trụ cột.
   - Chạy `git status` để hiển thị các file đã thay đổi cho người dùng tự kiểm tra và tự quyết định push.
