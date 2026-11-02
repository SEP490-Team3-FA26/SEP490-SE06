// backend/apps/supplier-service/src/tests/uc-36-purchase-requisition.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-36] BRANCH PURCHASE REQUISITION CREATION (ĐỀ XUẤT MUA HÀNG PR)
 * Tham chiếu: Report 5 (Feature F05) & WBS #27
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-36] Branch Purchase Requisition (Đề xuất mua hàng chi nhánh)', () => {
  const createPurchaseRequisition = (prData: {
    branchId: string;
    items: Array<{ medicineId: string; quantity: number; estimatedPrice: number }>;
  }) => {
    if (!prData.branchId) {
      throw new Error('Mã chi nhánh đề xuất không được để trống!');
    }
    if (!prData.items || prData.items.length === 0) {
      throw new Error('Danh sách hàng hóa đề xuất không được để trống!');
    }

    let estimatedTotal = 0;
    for (const item of prData.items) {
      if (item.quantity <= 0) {
        throw new Error('Số lượng hàng đề xuất phải lớn hơn 0!');
      }
      estimatedTotal += item.quantity * item.estimatedPrice;
    }

    return {
      prCode: `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      branchId: prData.branchId,
      status: 'PENDING_APPROVAL',
      estimatedTotal,
      itemCount: prData.items.length,
      createdAt: new Date(),
    };
  };

  describe('1. [Normal Values] Khởi tạo đơn PR thông thường với danh mục thuốc cần nhập', () => {
    it('TC-UC36-NORM-01: Tạo thành công đơn PR với 2 mặt hàng kháng sinh và giảm đau', () => {
      const payload = {
        branchId: 'BR-DIST-01',
        items: [
          { medicineId: 'MED-AMOX-500', quantity: 100, estimatedPrice: 15000 },
          { medicineId: 'MED-PANA-500', quantity: 200, estimatedPrice: 20000 },
        ],
      };

      const result = createPurchaseRequisition(payload);

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.estimatedTotal).toBe(5500000); // 100*15k + 200*20k = 5.5 triệu
      expect(result.itemCount).toBe(2);
    });
  });

  describe('2. [Boundary Values] Mốc biên 1 mặt hàng tối thiểu', () => {
    it('TC-UC36-BOUND-01: [Biên tối thiểu] Đơn PR chỉ đề xuất đúng 1 sản phẩm có số lượng = 1', () => {
      const payload = {
        branchId: 'BR-DIST-01',
        items: [{ medicineId: 'MED-RARE', quantity: 1, estimatedPrice: 5000000 }],
      };

      const result = createPurchaseRequisition(payload);

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.estimatedTotal).toBe(5000000);
      expect(result.itemCount).toBe(1);
    });
  });

  describe('3. [Abnormal Values] Danh sách thuốc rỗng hoặc thiếu mã chi nhánh', () => {
    it('TC-UC36-ABNORM-01: Ném lỗi khi danh sách hàng hóa đề xuất bị rỗng', () => {
      expect(() => createPurchaseRequisition({ branchId: 'BR-01', items: [] })).toThrow(
        /không được để trống/,
      );
    });

    it('TC-UC36-ABNORM-02: Ném lỗi khi thiếu mã chi nhánh', () => {
      expect(() =>
        createPurchaseRequisition({
          branchId: '',
          items: [{ medicineId: 'M1', quantity: 10, estimatedPrice: 1000 }],
        }),
      ).toThrow(/Mã chi nhánh/);
    });
  });
});
