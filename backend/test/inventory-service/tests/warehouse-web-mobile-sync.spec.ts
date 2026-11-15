/// <reference types="jest" />

/**
 * warehouse-web-mobile-sync.spec.ts
 * Bộ kiểm thử toàn diện cho Luồng Đồng Bộ Nghiệp Vụ Xuất Nhập Kho Giữa Web và Mobile
 * 
 * Kiến trúc tuân thủ Fullstack Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code):
 * 1. Nhập kho PO (Goods Receipt): Web PC mở phiên -> Mobile quét QR/Barcode kiểm đếm -> Đồng bộ Cache/WebSocket -> Web hoàn tất GRN.
 * 2. Xuất/Nhập chuyển kho (Stock Transfer): Web xuất hàng (IN_TRANSIT) -> Mobile chi nhánh nhận quét mã -> Hoàn tất chuyển kho (COMPLETED) & đối soát tồn.
 * 
 * Phân chia đầy đủ 3 nhóm giá trị kiểm thử:
 * - [Normal Values]: Luồng nghiệp vụ chuẩn, thành công.
 * - [Boundary Values]: Giá trị biên (khớp 100%, lệch +/-1 đơn vị, chuyển sạch kho, idempotency chống trùng).
 * - [Abnormal Values]: Dữ liệu dị thường (số lượng âm/NaN, thuốc hết hạn, nhầm chi nhánh nhận, đơn PO đã chốt).
 */

describe('Warehouse Web <-> Mobile Sync Engine (Đồng Bộ Nghiệp Vụ Xuất Nhập Kho Web & Mobile)', () => {
  // =========================================================================
  // Mô phỏng hệ thống bộ nhớ đệm Redis & WebSocket Event Bus
  // =========================================================================
  let redisCache: Map<string, any>;
  let socketEventsEmitted: Array<{ event: string; payload: any }>;
  let branchStocks: Record<string, Record<string, number>>; // [branchId][medicineId] => stock

  // Interface định nghĩa gói dữ liệu kiểm đếm Mobile
  interface MobileInspectionPayload {
    poId: string;
    inspectorId: string;
    inspectorName: string;
    items: Array<{
      medicineId: string;
      medicineName: string;
      expectedQty: number;
      actualQty: number;
      batchNo: string;
      expDate: string;
      discrepancyReason?: string;
    }>;
    status: 'INSPECTING' | 'COMPLETED';
    idempotencyKey?: string;
    updatedAt?: Date;
  }

  // Interface định nghĩa đơn PO
  interface PurchaseOrderRecord {
    _id: string;
    poCode: string;
    branchId: string;
    status: 'ORDERED' | 'RECEIVING' | 'COMPLETED' | 'CANCELLED';
    items: Array<{
      medicineId: string;
      medicineName: string;
      quantity: number;
      unitPrice: number;
    }>;
  }

  // Interface phiếu chuyển kho
  interface StockTransferRecord {
    _id: string;
    transferCode: string;
    fromBranchId: string;
    toBranchId: string;
    status: 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
    items: Array<{
      medicineId: string;
      medicineName: string;
      quantity: number;
      batchNo: string;
    }>;
  }

  // Bộ điều phối nghiệp vụ đồng bộ Web <-> Mobile
  class WarehouseSyncCoordinator {
    // 1. Mobile gửi kết quả kiểm đếm PO lên Gateway -> Lưu Cache và phát WebSocket cho Web PC
    async submitMobilePoInspection(
      po: PurchaseOrderRecord,
      payload: MobileInspectionPayload
    ) {
      if (!po || po.status === 'COMPLETED' || po.status === 'CANCELLED') {
        throw new Error(`Đơn hàng ${po?._id || 'N/A'} đã kết thúc hoặc bị hủy, không thể cập nhật kiểm đếm!`);
      }

      // Kiểm tra tính hợp lệ dữ liệu từng dòng
      const todayStr = new Date().toISOString().split('T')[0];
      for (const it of payload.items) {
        if (typeof it.actualQty !== 'number' || Number.isNaN(it.actualQty) || it.actualQty < 0) {
          throw new Error(`Số lượng thực tế của thuốc ${it.medicineName} không hợp lệ (không được âm hoặc rỗng)!`);
        }
        if (it.actualQty > it.expectedQty * 10) {
          throw new Error(`Số lượng kiểm đếm vượt ngưỡng bất thường (>1000% so với đơn PO)!`);
        }
        if (it.expDate && it.expDate < todayStr) {
          throw new Error(`Dược phẩm ${it.medicineName} lô ${it.batchNo} đã hết hạn sử dụng (${it.expDate}), vi phạm chuẩn GSP!`);
        }
      }

      // Xử lý Idempotency: nếu đã nhận cùng idempotencyKey trong cache thì bỏ qua xử lý lặp
      const cacheKey = `po_inspection:${payload.poId}`;
      const existing = redisCache.get(cacheKey);
      if (existing && payload.idempotencyKey && existing.idempotencyKey === payload.idempotencyKey) {
        return {
          success: true,
          isDuplicate: true,
          message: 'Dữ liệu kiểm đếm đã được xử lý trước đó (Idempotency Hit)',
          data: existing,
        };
      }

      // Lưu vào Redis Cache (TTL 24 giờ)
      const inspectionRecord = {
        ...payload,
        updatedAt: new Date(),
      };
      redisCache.set(cacheKey, inspectionRecord);

      // Bắn sự kiện realtime WebSocket để Web PC của thủ kho cập nhật bảng kiểm đếm tức thì
      const wsEvent = `po_inspection_updated:${payload.poId}`;
      socketEventsEmitted.push({ event: wsEvent, payload: inspectionRecord });

      return {
        success: true,
        isDuplicate: false,
        message: 'Đồng bộ kiểm đếm Mobile thành công lên hệ thống',
        data: inspectionRecord,
      };
    }

    // 2. Web PC đối soát dữ liệu từ Cache Mobile và chốt phiếu nhập kho GRN
    async finalizeGoodsReceiptFromMobileInspection(
      po: PurchaseOrderRecord,
      grnCode: string,
      approverId: string
    ) {
      const cacheKey = `po_inspection:${po._id}`;
      const inspection = redisCache.get(cacheKey);

      if (!inspection) {
        throw new Error('Chưa có dữ liệu kiểm đếm từ thiết bị Mobile!');
      }

      // Kiểm tra xem có sai lệch số lượng không
      let hasDiscrepancy = false;
      const grnItems: any[] = [];

      for (const item of inspection.items) {
        const diff = item.actualQty - item.expectedQty;
        if (diff !== 0) {
          hasDiscrepancy = true;
          if (!item.discrepancyReason || !item.discrepancyReason.trim()) {
            throw new Error(`Vui lòng nhập lý do giải trình sai lệch cho sản phẩm ${item.medicineName}!`);
          }
        }
        grnItems.push({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          receivedQty: item.actualQty,
          batchNo: item.batchNo,
          expDate: item.expDate,
          discrepancy: diff,
        });

        // Tăng tồn kho thực tế cho chi nhánh nhận hàng
        if (!branchStocks[po.branchId]) branchStocks[po.branchId] = {};
        branchStocks[po.branchId][item.medicineId] =
          (branchStocks[po.branchId][item.medicineId] || 0) + item.actualQty;
      }

      // Cập nhật trạng thái đơn PO sang COMPLETED
      po.status = 'COMPLETED';

      // Xóa cache kiểm đếm sau khi đã lập phiếu GRN thành công
      redisCache.delete(cacheKey);

      return {
        success: true,
        grnCode,
        approverId,
        poId: po._id,
        items: grnItems,
        hasDiscrepancy,
        status: 'GRN_COMPLETED',
      };
    }

    // 3. Web xuất chuyển kho liên chi nhánh -> Trạng thái IN_TRANSIT
    async dispatchStockTransfer(
      transfer: StockTransferRecord
    ) {
      if (transfer.fromBranchId === transfer.toBranchId) {
        throw new Error('Chi nhánh nguồn và chi nhánh đích không được trùng nhau!');
      }

      for (const item of transfer.items) {
        const currentStock = branchStocks[transfer.fromBranchId]?.[item.medicineId] || 0;
        if (currentStock < item.quantity) {
          throw new Error(`Tồn kho chi nhánh nguồn (${currentStock}) không đủ để xuất chuyển (${item.quantity})!`);
        }
        // Giảm tồn kho chi nhánh nguồn
        branchStocks[transfer.fromBranchId][item.medicineId] -= item.quantity;
      }

      transfer.status = 'IN_TRANSIT';

      // Phát thông báo chuyển kho tới chi nhánh đích
      socketEventsEmitted.push({
        event: `stock_transfer:dispatched:${transfer.toBranchId}`,
        payload: transfer,
      });

      return {
        success: true,
        status: 'IN_TRANSIT',
        transferCode: transfer.transferCode,
      };
    }

    // 4. Mobile tại chi nhánh đích quét mã phiếu xác nhận nhận hàng
    async receiveStockTransferViaMobile(
      transfer: StockTransferRecord,
      scannedBranchId: string,
      receivedItems: Array<{ medicineId: string; scannedQty: number }>
    ) {
      if (transfer.status !== 'IN_TRANSIT') {
        throw new Error(`Phiếu chuyển kho ${transfer.transferCode} không ở trạng thái vận chuyển (IN_TRANSIT)!`);
      }

      if (scannedBranchId !== transfer.toBranchId) {
        throw new Error(
          `Chi nhánh quét mã (${scannedBranchId}) không khớp với chi nhánh nhận được chỉ định (${transfer.toBranchId})!`
        );
      }

      // Đối soát số lượng quét
      for (const expItem of transfer.items) {
        const recItem = receivedItems.find((r) => r.medicineId === expItem.medicineId);
        if (!recItem) {
          throw new Error(`Thiếu dữ liệu quét của sản phẩm ${expItem.medicineName}!`);
        }
        if (recItem.scannedQty < 0) {
          throw new Error('Số lượng nhận không được là số âm!');
        }

        // Tăng tồn kho chi nhánh nhận
        if (!branchStocks[transfer.toBranchId]) branchStocks[transfer.toBranchId] = {};
        branchStocks[transfer.toBranchId][expItem.medicineId] =
          (branchStocks[transfer.toBranchId][expItem.medicineId] || 0) + recItem.scannedQty;
      }

      transfer.status = 'COMPLETED';

      // Phát sự kiện Web cập nhật trạng thái phiếu chuyển kho
      socketEventsEmitted.push({
        event: `stock_transfer:received:${transfer._id}`,
        payload: {
          transferCode: transfer.transferCode,
          status: 'COMPLETED',
          receivedAt: new Date(),
        },
      });

      return {
        success: true,
        status: 'COMPLETED',
        transferCode: transfer.transferCode,
      };
    }
  }

  let coordinator: WarehouseSyncCoordinator;

  beforeEach(() => {
    redisCache = new Map<string, any>();
    socketEventsEmitted = [];
    branchStocks = {
      'CENTRAL_WH': {
        'MED-PARA-500': 1000,
        'MED-AMOX-500': 500,
      },
      'BR-001': {
        'MED-PARA-500': 50,
        'MED-AMOX-500': 10,
      },
      'BR-002': {
        'MED-PARA-500': 0,
        'MED-AMOX-500': 0,
      },
    };
    coordinator = new WarehouseSyncCoordinator();
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng đồng bộ xuất nhập kho chuẩn giữa Web và Mobile', () => {
    it('TC-SYNC-NORM-01: Mobile quét mã kiểm đếm đơn PO -> Web PC cập nhật thời gian thực và lập GRN thành công', async () => {
      const mockPo: PurchaseOrderRecord = {
        _id: 'PO-2026-001',
        poCode: 'PO-2026-001',
        branchId: 'BR-001',
        status: 'RECEIVING',
        items: [
          { medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 200, unitPrice: 1500 },
        ],
      };

      const mobilePayload: MobileInspectionPayload = {
        poId: 'PO-2026-001',
        inspectorId: 'MOB-USER-01',
        inspectorName: 'Thủ kho Nam (Mobile)',
        status: 'COMPLETED',
        items: [
          {
            medicineId: 'MED-PARA-500',
            medicineName: 'Paracetamol 500mg',
            expectedQty: 200,
            actualQty: 200,
            batchNo: 'LOT-2026-P01',
            expDate: '2027-12-31',
          },
        ],
      };

      // 1. Mobile đẩy kết quả kiểm đếm
      const syncResult = await coordinator.submitMobilePoInspection(mockPo, mobilePayload);
      expect(syncResult.success).toBe(true);
      expect(syncResult.isDuplicate).toBe(false);

      // Kiểm tra dữ liệu được lưu vào Redis cache
      expect(redisCache.has('po_inspection:PO-2026-001')).toBe(true);

      // Kiểm tra sự kiện WebSocket được phát để Web PC cập nhật
      expect(socketEventsEmitted).toContainEqual(
        expect.objectContaining({
          event: 'po_inspection_updated:PO-2026-001',
        })
      );

      // 2. Web PC lấy dữ liệu từ Mobile và chốt phiếu nhập kho GRN
      const grnResult = await coordinator.finalizeGoodsReceiptFromMobileInspection(
        mockPo,
        'GRN-2026-001',
        'PC-MANAGER-01'
      );

      expect(grnResult.success).toBe(true);
      expect(grnResult.status).toBe('GRN_COMPLETED');
      expect(grnResult.hasDiscrepancy).toBe(false);
      expect(mockPo.status).toBe('COMPLETED');

      // Kiểm tra tồn kho tại BR-001 tăng chính xác (+200 hộp từ 50 lên 250)
      expect(branchStocks['BR-001']['MED-PARA-500']).toBe(250);

      // Kiểm tra Cache đã được dọn sạch sau khi chốt phiếu
      expect(redisCache.has('po_inspection:PO-2026-001')).toBe(false);
    });

    it('TC-SYNC-NORM-02: Web PC xuất chuyển kho -> Mobile chi nhánh nhận quét mã xác nhận nhập kho thành công', async () => {
      const transferRecord: StockTransferRecord = {
        _id: 'ST-2026-001',
        transferCode: 'ST-20261113-0001',
        fromBranchId: 'CENTRAL_WH',
        toBranchId: 'BR-002',
        status: 'DRAFT',
        items: [
          { medicineId: 'MED-AMOX-500', medicineName: 'Amoxicillin 500mg', quantity: 100, batchNo: 'LOT-AMOX-01' },
        ],
      };

      // 1. Web PC Kho tổng xuất hàng
      const dispatchRes = await coordinator.dispatchStockTransfer(transferRecord);
      expect(dispatchRes.success).toBe(true);
      expect(transferRecord.status).toBe('IN_TRANSIT');
      expect(branchStocks['CENTRAL_WH']['MED-AMOX-500']).toBe(400); // 500 - 100 = 400

      // Kiểm tra có thông báo điều chuyển gửi đến BR-002
      expect(socketEventsEmitted).toContainEqual(
        expect.objectContaining({
          event: 'stock_transfer:dispatched:BR-002',
        })
      );

      // 2. Mobile tại BR-002 quét mã nhận hàng
      const receiveRes = await coordinator.receiveStockTransferViaMobile(
        transferRecord,
        'BR-002',
        [{ medicineId: 'MED-AMOX-500', scannedQty: 100 }]
      );

      expect(receiveRes.success).toBe(true);
      expect(transferRecord.status).toBe('COMPLETED');
      expect(branchStocks['BR-002']['MED-AMOX-500']).toBe(100); // 0 + 100 = 100

      // Kiểm tra WebSocket thông báo hoàn tất chuyển kho cho cả 2 bên Web PC
      expect(socketEventsEmitted).toContainEqual(
        expect.objectContaining({
          event: 'stock_transfer:received:ST-2026-001',
        })
      );
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên, tối thiểu, tối đa, sai lệch +/-1, Idempotency
  // =========================================================================
  describe('2. [Boundary Values] Mốc biên sai lệch, chuyển sạch kho & Idempotency', () => {
    it('TC-SYNC-BOUND-01: [Biên sai lệch 1 đơn vị] Phát hiện thiếu 1 hộp -> Bắt buộc nhập lý do giải trình', async () => {
      const mockPo: PurchaseOrderRecord = {
        _id: 'PO-2026-002',
        poCode: 'PO-2026-002',
        branchId: 'BR-001',
        status: 'RECEIVING',
        items: [
          { medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 50, unitPrice: 1500 },
        ],
      };

      // Mobile đếm thiếu 1 hộp (49 thay vì 50) nhưng chưa nhập lý do
      const mobilePayloadNoReason: MobileInspectionPayload = {
        poId: 'PO-2026-002',
        inspectorId: 'MOB-USER-01',
        inspectorName: 'Thủ kho Nam',
        status: 'COMPLETED',
        items: [
          {
            medicineId: 'MED-PARA-500',
            medicineName: 'Paracetamol 500mg',
            expectedQty: 50,
            actualQty: 49,
            batchNo: 'LOT-2026-P02',
            expDate: '2028-01-01',
            discrepancyReason: '', // Rỗng
          },
        ],
      };

      await coordinator.submitMobilePoInspection(mockPo, mobilePayloadNoReason);

      // Web PC cố gắng chốt GRN khi chưa có lý do giải trình -> Bị chặn
      await expect(
        coordinator.finalizeGoodsReceiptFromMobileInspection(mockPo, 'GRN-2026-002', 'PC-MANAGER-01')
      ).rejects.toThrow(/Vui lòng nhập lý do giải trình sai lệch/);

      // Cập nhật lại có lý do giải trình "Hư hỏng 1 hộp do vận chuyển"
      const mobilePayloadWithReason: MobileInspectionPayload = {
        ...mobilePayloadNoReason,
        items: [
          {
            ...mobilePayloadNoReason.items[0],
            discrepancyReason: 'Hư hỏng 1 hộp móp méo do vận chuyển đường bộ',
          },
        ],
      };
      await coordinator.submitMobilePoInspection(mockPo, mobilePayloadWithReason);

      const grnSuccess = await coordinator.finalizeGoodsReceiptFromMobileInspection(
        mockPo,
        'GRN-2026-002',
        'PC-MANAGER-01'
      );
      expect(grnSuccess.success).toBe(true);
      expect(grnSuccess.hasDiscrepancy).toBe(true);
      expect(branchStocks['BR-001']['MED-PARA-500']).toBe(99); // 50 ban đầu + 49 thực nhận = 99
    });

    it('TC-SYNC-BOUND-02: [Biên chuyển sạch tồn kho] Chuyển toàn bộ 1000/1000 viên từ kho tổng', async () => {
      const transferRecord: StockTransferRecord = {
        _id: 'ST-2026-002',
        transferCode: 'ST-20261113-0002',
        fromBranchId: 'CENTRAL_WH',
        toBranchId: 'BR-001',
        status: 'DRAFT',
        items: [
          { medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 1000, batchNo: 'LOT-P-ALL' },
        ],
      };

      await coordinator.dispatchStockTransfer(transferRecord);
      expect(branchStocks['CENTRAL_WH']['MED-PARA-500']).toBe(0); // Về đúng 0 tròn trĩnh

      await coordinator.receiveStockTransferViaMobile(transferRecord, 'BR-001', [
        { medicineId: 'MED-PARA-500', scannedQty: 1000 },
      ]);
      expect(branchStocks['BR-001']['MED-PARA-500']).toBe(1050); // 50 + 1000 = 1050
    });

    it('TC-SYNC-BOUND-03: [Idempotency] Gửi trùng lặp cùng IdempotencyKey từ Mobile khi mạng chập chờn', async () => {
      const mockPo: PurchaseOrderRecord = {
        _id: 'PO-2026-003',
        poCode: 'PO-2026-003',
        branchId: 'BR-001',
        status: 'RECEIVING',
        items: [{ medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 10, unitPrice: 1500 }],
      };

      const payload: MobileInspectionPayload = {
        poId: 'PO-2026-003',
        inspectorId: 'MOB-USER-01',
        inspectorName: 'Thủ kho Nam',
        status: 'COMPLETED',
        idempotencyKey: 'IDEMP-PO-003-RETRY-01',
        items: [
          {
            medicineId: 'MED-PARA-500',
            medicineName: 'Paracetamol 500mg',
            expectedQty: 10,
            actualQty: 10,
            batchNo: 'LOT-IDEMP',
            expDate: '2028-12-31',
          },
        ],
      };

      const res1 = await coordinator.submitMobilePoInspection(mockPo, payload);
      expect(res1.isDuplicate).toBe(false);

      // Gửi lại lần 2 do retry mạng
      const res2 = await coordinator.submitMobilePoInspection(mockPo, payload);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.message).toContain('Idempotency Hit');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, thuốc hết hạn, nhầm chi nhánh, đơn đã chốt
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường, thuốc hết hạn, nhầm chi nhánh', () => {
    it('TC-SYNC-ABNORM-01: Chặn nhập kho khi Mobile phát hiện thuốc quét bị hết hạn sử dụng', async () => {
      const mockPo: PurchaseOrderRecord = {
        _id: 'PO-2026-004',
        poCode: 'PO-2026-004',
        branchId: 'BR-001',
        status: 'RECEIVING',
        items: [{ medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 20, unitPrice: 1500 }],
      };

      const expiredPayload: MobileInspectionPayload = {
        poId: 'PO-2026-004',
        inspectorId: 'MOB-USER-01',
        inspectorName: 'Thủ kho Nam',
        status: 'COMPLETED',
        items: [
          {
            medicineId: 'MED-PARA-500',
            medicineName: 'Paracetamol 500mg',
            expectedQty: 20,
            actualQty: 20,
            batchNo: 'LOT-EXPIRED-2025',
            expDate: '2025-01-01', // Đã hết hạn
          },
        ],
      };

      await expect(coordinator.submitMobilePoInspection(mockPo, expiredPayload)).rejects.toThrow(
        /đã hết hạn sử dụng/
      );
    });

    it('TC-SYNC-ABNORM-02: Chặn nhận hàng khi Mobile quét nhầm chi nhánh đích được chỉ định', async () => {
      const transferRecord: StockTransferRecord = {
        _id: 'ST-2026-003',
        transferCode: 'ST-20261113-0003',
        fromBranchId: 'CENTRAL_WH',
        toBranchId: 'BR-001', // Đích đến là BR-001
        status: 'IN_TRANSIT',
        items: [
          { medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 30, batchNo: 'LOT-30' },
        ],
      };

      // Chi nhánh BR-002 quét nhầm
      await expect(
        coordinator.receiveStockTransferViaMobile(transferRecord, 'BR-002', [
          { medicineId: 'MED-PARA-500', scannedQty: 30 },
        ])
      ).rejects.toThrow(/không khớp với chi nhánh nhận được chỉ định/);
    });

    it('TC-SYNC-ABNORM-03: Chặn cập nhật kiểm đếm khi đơn PO đã hoàn thành (COMPLETED)', async () => {
      const completedPo: PurchaseOrderRecord = {
        _id: 'PO-2026-005',
        poCode: 'PO-2026-005',
        branchId: 'BR-001',
        status: 'COMPLETED', // Đã chốt
        items: [{ medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 10, unitPrice: 1500 }],
      };

      const payload: MobileInspectionPayload = {
        poId: 'PO-2026-005',
        inspectorId: 'MOB-USER-01',
        inspectorName: 'Thủ kho Nam',
        status: 'COMPLETED',
        items: [
          {
            medicineId: 'MED-PARA-500',
            medicineName: 'Paracetamol 500mg',
            expectedQty: 10,
            actualQty: 10,
            batchNo: 'LOT-10',
            expDate: '2028-01-01',
          },
        ],
      };

      await expect(coordinator.submitMobilePoInspection(completedPo, payload)).rejects.toThrow(
        /đã kết thúc hoặc bị hủy/
      );
    });

    it('TC-SYNC-ABNORM-04: Ném lỗi khi số lượng quét là số âm hoặc vượt quá 1000% số lượng PO', async () => {
      const mockPo: PurchaseOrderRecord = {
        _id: 'PO-2026-006',
        poCode: 'PO-2026-006',
        branchId: 'BR-001',
        status: 'RECEIVING',
        items: [{ medicineId: 'MED-PARA-500', medicineName: 'Paracetamol 500mg', quantity: 10, unitPrice: 1500 }],
      };

      // Số âm
      const negativePayload: MobileInspectionPayload = {
        poId: 'PO-2026-006',
        inspectorId: 'MOB-USER-01',
        inspectorName: 'Thủ kho Nam',
        status: 'COMPLETED',
        items: [
          {
            medicineId: 'MED-PARA-500',
            medicineName: 'Paracetamol 500mg',
            expectedQty: 10,
            actualQty: -5,
            batchNo: 'LOT-NEG',
            expDate: '2028-01-01',
          },
        ],
      };

      await expect(coordinator.submitMobilePoInspection(mockPo, negativePayload)).rejects.toThrow(
        /không hợp lệ/
      );

      // Vượt quá 1000% (10 đặt mà kiểm đếm 150)
      const overflowPayload: MobileInspectionPayload = {
        ...negativePayload,
        items: [
          {
            ...negativePayload.items[0],
            actualQty: 150,
          },
        ],
      };

      await expect(coordinator.submitMobilePoInspection(mockPo, overflowPayload)).rejects.toThrow(
        /vượt ngưỡng bất thường/
      );
    });
  });
});

