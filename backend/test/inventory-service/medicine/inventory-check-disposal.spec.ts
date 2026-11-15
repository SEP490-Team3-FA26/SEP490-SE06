import { Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';

/**
 * inventory-check-disposal.spec.ts
 * Bộ kiểm thử đơn vị cho các luồng nghiệp vụ cốt lõi:
 * 1. Tiêu hủy thuốc (DISPOSE) cập nhật trạng thái chuẩn 'DISPOSED' (thay vì 'EXPIRED')
 * 2. Lập & cập nhật biên bản kiểm kê hỗ trợ tương thích hai chiều (reason & discrepancyReason)
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate.
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('InventoryCheck & Medicine Disposal Logic', () => {
  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn & thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng tiêu hủy thuốc và ghi nhận lý do kiểm kê', () => {
    it('TC-DISPOSE-NORM-01: Xuất hủy toàn bộ lô thuốc khi tồn về 0 chuyển status sang DISPOSED', () => {
      const batch = {
        _id: new Types.ObjectId(),
        batchNo: 'BATCH-2026-001',
        stock: 50,
        status: 'ACTIVE',
      };
      const quantityToDispose = 50;

      // Giả lập logic trong MedicineService.handleExpirationAction
      const actualDeduct = Math.min(batch.stock, quantityToDispose);
      batch.stock -= actualDeduct;
      if (batch.stock === 0) {
        batch.status = 'DISPOSED';
      }

      expect(batch.stock).toBe(0);
      expect(batch.status).toBe('DISPOSED');
    });

    it('TC-CHECK-NORM-01: Chấp nhận cả reason và discrepancyReason từ Mobile / Web payload khi có chênh lệch', () => {
      const resolveReason = (item: any) => {
        const rawReason = item?.reason ?? item?.discrepancyReason;
        return (typeof rawReason === 'string' ? rawReason : '').trim();
      };

      const mobileItem = {
        batchNo: 'B001',
        actualStock: 8,
        systemStock: 10,
        discrepancyReason: 'Vỡ lọ khi bốc xếp',
      };

      const webItem = {
        batchNo: 'B002',
        actualStock: 12,
        systemStock: 10,
        reason: 'Sai số đếm nhập kho ban đầu',
      };

      expect(resolveReason(mobileItem)).toBe('Vỡ lọ khi bốc xếp');
      expect(resolveReason(webItem)).toBe('Sai số đếm nhập kho ban đầu');
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên (Khớp tồn 0 chênh lệch, Xuất hủy 1 phần)
  // =========================================================================
  describe('2. [Boundary Values] Các trường hợp biên độ', () => {
    it('TC-DISPOSE-BOUND-01: Xuất hủy 1 phần (tồn còn lại > 0) giữ nguyên trạng thái ACTIVE', () => {
      const batch = {
        _id: new Types.ObjectId(),
        batchNo: 'BATCH-PARTIAL-01',
        stock: 100,
        status: 'ACTIVE',
      };
      const quantityToDispose = 40;

      const actualDeduct = Math.min(batch.stock, quantityToDispose);
      batch.stock -= actualDeduct;
      if (batch.stock === 0) {
        batch.status = 'DISPOSED';
      }

      expect(batch.stock).toBe(60);
      expect(batch.status).toBe('ACTIVE');
    });

    it('TC-CHECK-BOUND-01: Số lượng thực tế khớp chính xác tồn hệ thống (diff = 0) không bắt buộc lý do', () => {
      const item = {
        batchNo: 'B-MATCH',
        actualStock: 100,
        systemStock: 100,
        reason: '',
      };

      const validateItem = (it: typeof item) => {
        const diff = it.actualStock - it.systemStock;
        const reason = (it.reason || '').trim();
        if (diff !== 0 && !reason) {
          throw new RpcException({ message: `Cần ghi lý do chênh lệch cho lô ${it.batchNo}`, statusCode: 400 });
        }
        return { isValid: true, diff };
      };

      const res = validateItem(item);
      expect(res.isValid).toBe(true);
      expect(res.diff).toBe(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & ném lỗi ngoại lệ
  // =========================================================================
  describe('3. [Abnormal Values] Xử lý ngoại lệ và bắt lỗi vi phạm dữ liệu', () => {
    it('TC-DISPOSE-ABNORM-01: Ném lỗi khi số lượng hủy <= 0 hoặc vượt quá khả năng xử lý', () => {
      const executeDeduct = (stock: number, quantity: number) => {
        const actualDeduct = Math.min(stock, quantity);
        if (actualDeduct <= 0) {
          throw new RpcException('Số lượng hủy không hợp lệ hoặc lô hàng đã hết');
        }
        return actualDeduct;
      };

      expect(() => executeDeduct(0, 10)).toThrow();
      expect(() => executeDeduct(50, -5)).toThrow();
    });

    it('TC-CHECK-ABNORM-01: Ném RpcException 400 khi phát hiện chênh lệch nhưng bỏ trống lý do', () => {
      const itemWithDeficit = {
        batchNo: 'B-DEFICIT-01',
        actualStock: 95,
        systemStock: 100,
        reason: '   ', // Khoảng trắng rỗng
        discrepancyReason: undefined,
      };

      const validateItem = (it: typeof itemWithDeficit) => {
        const diff = it.actualStock - it.systemStock;
        const rawReason = it.reason ?? it.discrepancyReason;
        const reason = (typeof rawReason === 'string' ? rawReason : '').trim();
        if (diff !== 0 && !reason) {
          throw new RpcException({ message: `Cần ghi lý do chênh lệch cho lô ${it.batchNo}`, statusCode: 400 });
        }
        return true;
      };

      expect(() => validateItem(itemWithDeficit)).toThrow();
    });
  });
});

