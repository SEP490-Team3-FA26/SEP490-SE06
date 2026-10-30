# 📋 Báo Cáo Đối Chiếu Business Workflow vs. Code & UI

> **Ngày kiểm tra:** 15/10/2026  
> **Phạm vi:** 2 workflow ảnh — (1) Procurement & GRN, (2) Inventory Stocktaking

---

## WORKFLOW 1: Quy Trình Mua Hàng & Nhập Kho Dược Phẩm (Procurement & GRN)

### Tóm Tắt: ✅ **KHỚP PHẦN LỚN** — Có 2 Điểm Lệch Đáng Chú Ý

---

### Đối Chiếu Từng Bước

| Bước Trong Diagram                                                          | Actor                     | Code Backend                                                                                               | UI Frontend                                                                                                                                                                                           | Kết Quả                          |
| --------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **1.** Branch Manager kiểm tra tồn kho, lập PR                              | Branch Manager            | `inventory.pr.create` → `createPurchaseRequisition()`                                                      | [`BranchRequisition.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/branch/BranchRequisition.tsx) → `CreatePRModal`                               | ✅ KHỚP                          |
| **2.** Thủ Kho Tổng rà soát PR, duyệt và gom hàng (Consolidate PRs)         | Warehouse Manager         | `createAutoRoutedPurchaseOrders()` cập nhật PR status → `CONSOLIDATED`                                     | [`PurchaseRequisition.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/warehouse/PurchaseRequisition.tsx) — chọn PR và bấm "Tạo Đơn Đặt Hàng (PO)" | ⚠️ LỆCH NHỎ (xem note 1)         |
| **3.** Hệ thống tự động tách PR thành PO theo từng NCC                      | Procurement System        | `createAutoRoutedPurchaseOrders()` — group by `supplierId`, tạo nhiều PO                                   | `CreatePOModal.tsx` gọi `inventory.po.auto_route`                                                                                                                                                     | ✅ KHỚP                          |
| **Gateway: Kho Tổng Còn Hàng / Hết Hàng**                                   | System                    | Chưa có gateway tự động check stock — thủ công trong UI                                                    | Thủ kho có thể click "Xác nhận chuyển kho" thay vì tạo PO                                                                                                                                             | ⚠️ LỆCH (xem note 2)             |
| **4.** NCC tiếp nhận PO, đóng gói GSP, vận chuyển                           | Supplier (ngoài hệ thống) | PO status chuyển `SHIPPING` trong `approveAndPayPurchaseOrder()`                                           | Hiển thị trong `InventoryHistory.tsx`                                                                                                                                                                 | ✅ KHỚP (ngoài hệ thống là đúng) |
| **5.** Tiếp nhận kiểm hàng, kiểm tra thực tế                                | Warehouse Manager         | `createGoodsReceiptNote()`, `createInspectionRecord()`, `verifyInspectionItem()`                           | `Inventory.tsx` — GRN workflow                                                                                                                                                                        | ✅ KHỚP                          |
| **Gateway: Đạt chuẩn / Hàng hỏng-trả hàng**                                 | System                    | `rejectGoodsReceiptNote()` xử lý trả hàng; `submitGoodsReceiptInspection()` chuyển trạng thái              | UI có luồng approve/reject GRN                                                                                                                                                                        | ✅ KHỚP                          |
| **6.** Quét mã batchNo, hạn dùng (expDate), tạo phiếu nhập kho (GRN)        | Warehouse Manager         | `GoodsReceiptNote.items` có `batchNo`, `expDate`; `approveGoodsReceiptNote()` validate bắt buộc            | UI yêu cầu nhập batchNo + expDate trước khi approve                                                                                                                                                   | ✅ KHỚP                          |
| **7.** Tự động tăng tồn kho theo lô (MedicineBatch) & phân bổ vị trí giá kê | System                    | `approveGoodsReceiptNote()` → create/update `MedicineBatch`, `relocateBatchesToReserve()`, shelvedLocation | Warehouse map page + 4-level location (zone/rack/shelf/bin)                                                                                                                                           | ✅ KHỚP — Rất chi tiết           |
| **8.** Thủ kho đóng gói lô thuốc và gửi về chi nhánh                        | Warehouse Manager         | `createStockTransfer()` → `StockTransfer` document                                                         | `PurchaseRequisition.tsx` — "Xác nhận chuyển kho" sau khi chọn kho xuất                                                                                                                               | ✅ KHỚP                          |
| **9.** Chi nhánh tiếp nhận kiện hàng                                        | Branch Manager            | `confirmStockTransferReceipt()` — cập nhật tồn kho chi nhánh                                               | [`BranchStockReceive.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/branch/BranchStockReceive.tsx)                                               | ✅ KHỚP                          |

---

### ⚠️ Điểm Lệch Workflow 1

#### Note 1 — Bước 2: Gom PR (Consolidation) Khác Sơ Đồ

**Diagram mô tả:** Thủ Kho "rà soát, duyệt và bấm gom hàng (Consolidate PRs)"  
**Code thực tế:**

- KHÔNG có action `APPROVE` riêng cho Warehouse Manager trước khi gom PR
- `PurchaseRequisition.tsx` cho phép thủ kho **trực tiếp chọn PR SUBMITTED** → tạo luôn PO (auto-route)
- Status PR nhảy từ `SUBMITTED` → `CONSOLIDATED` ngay khi tạo PO — **bỏ qua bước "duyệt" trung gian**

```
Diagram:    PR (SUBMITTED) → [Thủ Kho duyệt] → [Gom đơn] → PO
Code thực: PR (SUBMITTED) → [Thủ Kho tạo PO] → PR (CONSOLIDATED) + PO (PENDING_APPROVAL)
```

> [!WARNING]
> Sơ đồ ngụ ý có bước duyệt riêng của Thủ Kho trước khi gom đơn. Code thực tế merge 2 bước thành 1. **Cần quyết định business**: có cần thêm RBAC check hay approval riêng cho Thủ Kho không?

#### Note 2 — Gateway "Kho Tổng Còn Hàng / Hết Hàng"

**Diagram mô tả:** Exclusive Gateway kiểm tra "Kho tổng còn hàng" → chuyển kho nội bộ thay vì tạo PO  
**Code thực tế:**

- Không có auto-check stock trước khi quyết định flow
- Thủ Kho phải **tự phán đoán** rồi chọn: Tạo PO mua mới **hoặc** "Xác nhận chuyển kho" từ kho tổng
- `OUT_OF_STOCK` là status PR có trong schema nhưng không được set tự động

```typescript
// Schema có:
enum: ['DRAFT','SUBMITTED','WAREHOUSE_SUBMITTED','CONSOLIDATED',
       'URGENT_PENDING','APPROVED','SHIPPING','COMPLETED','OUT_OF_STOCK','REJECTED','CANCELLED']

// Nhưng trong service: chưa có logic auto-set OUT_OF_STOCK khi check tồn kho
```

> [!CAUTION]
> Gateway trong diagram chưa được implement tự động. Đây là **gap lớn nhất** của Workflow 1 so với code. Nếu đây là business-critical thì cần bổ sung logic check tồn kho trước khi route flow.

---

## WORKFLOW 2: Quy Trình Kiểm Kê Kho Dược Phẩm (Inventory Stocktaking)

### Tóm Tắt: ✅ **KHỚP TỐT** — Có 2 Điểm Thiếu Nhỏ

---

### Đối Chiếu Từng Bước

| Bước Trong Diagram                                                                                  | Actor                 | Code Backend                                                                                                                       | UI Frontend                                                                                                                                                                          | Kết Quả                                     |
| --------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **1.** Quản lý chi nhánh lập kế hoạch kiểm kê, chọn phạm vi, phân công nhân viên                    | Branch Manager        | Schema `InventoryCheck.performedBy` lưu người thực hiện                                                                            | [`InventoryCheck.tsx`](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/frontend/src/pages/warehouse/InventoryCheck.tsx) cho nhập `performedBy` và ghi chú | ⚠️ Thiếu phần "phân công" nhiều nhân viên   |
| **2.** Hệ thống chốt snapshot tồn số sách, sinh mã phiếu (IC-xxx), phân bổ danh sách kiểm           | Inventory System      | `createInventoryCheck()` sinh mã `IC-YYYYMMDD-XXXX`, đọc `batchModel.stock` làm `systemStock`                                      | UI hiển thị systemStock từ batch khi chọn lô                                                                                                                                         | ✅ KHỚP                                     |
| **3.** Nhân viên dùng máy quét Barcode/App quét mã SKU, số lô, hạn sử dụng thực tế                  | Inspector/Stock Staff | Schema `InventoryCheckItem` có `batchNo`, `actualStock`                                                                            | UI dùng dropdown chọn thuốc + lô (không phải barcode scan)                                                                                                                           | ⚠️ Thiếu barcode scan (xem note 3)          |
| **4.** Đếm số lượng thực tế, kiểm tra bao bì hỏng, nhập số liệu (actualStock)                       | Inspector/Stock Staff | `actualStock` field trong payload, `difference = actual - system` tính tự động                                                     | UI cho nhập `actualStockInput`, tự tính `difference`                                                                                                                                 | ✅ KHỚP                                     |
| **5.** Đối soát actual vs system, tự động tính chênh lệch                                           | Inventory System      | `createInventoryCheck()` enriches items: `difference = actualStock - systemStock`                                                  | Bảng hiển thị difference khi review check                                                                                                                                            | ✅ KHỚP                                     |
| **Gateway: Khớp số liệu / Có chênh lệch**                                                           | System                | Logic: nếu difference = 0 → không ghi txn; nếu ≠ 0 → ghi `ADJUSTMENT` transaction                                                  | UI chỉ cho hoàn tất khi có items, không gate trên difference                                                                                                                         | ⚠️ Gateway không được visualize rõ trong UI |
| **6.** Nhân viên rà soát lại lô thuốc, nhập lý do sai lệch (reason: vỡ hộng/lệch vị trí/thất thoát) | Inspector             | Schema `InventoryCheckItem.reason` (string)                                                                                        | UI có input `reasonInput` cho mỗi item                                                                                                                                               | ✅ KHỚP                                     |
| **7.** Branch Manager xem xét biên bản, đối chiếu, bấm phê duyệt (COMPLETED)                        | Branch Manager        | `completeInventoryCheck()` → update status `COMPLETED`, gọi `applyStockAdjustments()`                                              | `handleCompleteDraft()` → gọi `inventoryCheckService.completeCheck()`                                                                                                                | ✅ KHỚP                                     |
| **8.** Hệ thống tự động điều chỉnh tồn kho (applyStockAdjustments) & ghi Audit Log                  | Inventory System      | `applyStockAdjustments()`: cập nhật `batch.stock = actualStock`, ghi `InventoryTransaction (ADJUSTMENT)`, đồng bộ `medicine.stock` | — (backend tự động)                                                                                                                                                                  | ✅ KHỚP — Chi tiết, có audit log            |

---

### ⚠️ Điểm Lệch Workflow 2

#### Note 3 — Bước 3: Barcode/App Quét Mã — CHƯA CÓ

**Diagram mô tả:** "dùng máy quét Barcode / App quét mã SKU, số lô (batchNo) & hạn sử dụng thực tế"  
**Code thực tế:**

- `InventoryCheck.tsx` dùng **dropdown select** thay vì barcode scanning
- App mobile có `MobileAIInspection.tsx` nhưng đây là inspection GRN, không phải stocktaking
- Không có barcode input field trong luồng kiểm kê

> [!WARNING]
> Barcode scan trong workflow kiểm kê là **gap UI quan trọng**. Nếu inspector thực tế dùng máy scan, cần bổ sung input barcode thay/cạnh dropdown chọn thuốc.

#### Note 4 — Bước 1: Phân Công Nhân Viên Kiểm Kê

**Diagram mô tả:** "chọn phạm vi (kê/nhóm thuốc) & phân công nhân viên"  
**Code thực tế:**

- Schema chỉ có `performedBy: string` — **1 người** duy nhất
- Không có array assignee hay phân chia nhóm thuốc kiểm kê
- Không có role phân biệt "người phân công" vs "người thực hiện"

> [!NOTE]
> Đây là điểm simplified so với diagram. Nếu nhóm quy mô nhỏ, 1 người là hợp lý. Nhưng nếu kho lớn, cần multi-assignee.

#### Note 5 — Audit Log: Thiếu Liên Thông CSDL Dược Quốc Gia Visible ở UI

**Diagram không đề cập** nhưng code backend có:

```typescript
// Tự động liên thông CSDL Dược Quốc gia (BPMN 2 - Stock-Taking Hook theo QĐ 232)
const gppSync = await this.nationalPharmaService.syncStockTaking(
  check,
  check.branchId,
);
```

UI không hiển thị trạng thái `nationalSyncStatus` sau khi hoàn tất. Đây là feature **vượt trội hơn** diagram nhưng thiếu feedback tới user.

---

## Tổng Kết

| Tiêu Chí              | Workflow 1 (Procurement & GRN)                                    | Workflow 2 (Inventory Check)                                    |
| --------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| **Số bước khớp**      | 7/9 bước                                                          | 6/8 bước                                                        |
| **Lệch nghiêm trọng** | ⚠️ Gateway "Còn/Hết hàng" chưa tự động                            | ✅ Không có lệch nghiêm trọng                                   |
| **Lệch nhỏ**          | Bước 2 merge approve+consolidate thành 1                          | Barcode scan → dropdown; 1 assignee                             |
| **Code vượt diagram** | `relocateBatchesToReserve()`, GSP 4-level location, national sync | `nationalPharmaService.syncStockTaking()`, Audit log ADJUSTMENT |
| **Kết luận**          | Cần xem xét thêm auto-gateway logic                               | Có thể bổ sung barcode scan và multi-assignee                   |

### Khuyến Nghị Ưu Tiên

1. **[HIGH]** Workflow 1 — Thêm logic tự động check tồn Kho Tổng trước khi quyết định: Tạo PO hay Chuyển Kho nội bộ
2. **[MEDIUM]** Workflow 2 — Thêm barcode input field trong `InventoryCheck.tsx` để inspector có thể scan thay vì chọn dropdown
3. **[LOW]** Workflow 2 — Hiển thị `nationalSyncStatus` sau khi hoàn tất biên bản kiểm kê
4. **[LOW]** Workflow 2 — Xem xét mở rộng `performedBy` thành mảng nếu kho lớn cần nhiều kiểm kê viên
