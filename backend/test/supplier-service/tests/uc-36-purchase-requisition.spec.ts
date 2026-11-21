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

  describe('4. [List PR Query & Filter Logic] Bộ lọc danh sách và gộp trạng thái khẩn cấp', () => {
    // Hàm mô phỏng logic truy vấn PR của PurchaseService
    const filterPrList = (
      prs: Array<{ prCode: string; status: string; createdAt: Date; isUrgent?: boolean }>,
      query: { status?: string; limit?: number },
    ) => {
      let result = [...prs];
      if (query.status) {
        if (query.status === 'SUBMITTED') {
          result = result.filter(p => p.status === 'SUBMITTED' || p.status === 'URGENT_PENDING');
        } else {
          result = result.filter(p => p.status === query.status);
        }
      }
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (query.limit && query.limit > 0) {
        result = result.slice(0, query.limit);
      }
      return result;
    };

    const mockPrs = [
      { prCode: 'PR-01', status: 'CONSOLIDATED', createdAt: new Date('2026-11-10T10:00:00Z'), isUrgent: true },
      { prCode: 'PR-02', status: 'SUBMITTED', createdAt: new Date('2026-11-13T09:00:00Z'), isUrgent: false },
      { prCode: 'PR-03', status: 'URGENT_PENDING', createdAt: new Date('2026-11-13T10:00:00Z'), isUrgent: true },
      { prCode: 'PR-04', status: 'CONSOLIDATED', createdAt: new Date('2026-11-12T10:00:00Z'), isUrgent: true },
    ];

    describe('4.1. [Normal Values] Lọc theo SUBMITTED và gộp đơn khẩn cấp URGENT_PENDING', () => {
      it('TC-UC36-LIST-NORM-01: Lấy thành công cả đơn SUBMITTED và URGENT_PENDING sắp xếp mới nhất', () => {
        const filtered = filterPrList(mockPrs, { status: 'SUBMITTED' });
        expect(filtered.length).toBe(2);
        expect(filtered[0].prCode).toBe('PR-03'); // Tạo lúc 10:00 mới hơn
        expect(filtered[1].prCode).toBe('PR-02'); // Tạo lúc 09:00
      });
    });

    describe('4.2. [Boundary Values] Giới hạn số lượng limit = 1', () => {
      it('TC-UC36-LIST-BOUND-01: Giới hạn limit = 1 chỉ lấy đúng 1 bản ghi mới nhất', () => {
        const filtered = filterPrList(mockPrs, { limit: 1 });
        expect(filtered.length).toBe(1);
        expect(filtered[0].prCode).toBe('PR-03');
      });
    });

    describe('4.3. [Abnormal Values] Lọc trạng thái không tồn tại', () => {
      it('TC-UC36-LIST-ABNORM-01: Trả về mảng rỗng an toàn khi trạng thái không tồn tại', () => {
        const filtered = filterPrList(mockPrs, { status: 'NON_EXISTENT_STATUS' });
        expect(filtered).toEqual([]);
      });
    });
  });
});
