// backend/apps/orders-service/src/tests/wbs-11-hold-order-prescription.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * SCREEN / FUNCTION: [WBS #11] HOLD ORDER SCREEN (TẠM GIỮ ĐƠN THUỐC)
 * Tham chiếu: WBS #11 & Report 5 (Feature F03)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[WBS #11] Hold Order Screen (Tạm Giữ Đơn Chờ Dược Sĩ Duyệt)', () => {
  const evaluateHoldOrder = (order: {
    orderId: string;
    hasPrescriptionDrug: boolean;
    pharmacistApproved: boolean;
    pharmacistLicense?: string;
  }) => {
    // Nếu đơn hàng có thuốc kê đơn bắt buộc phải có duyệt của dược sĩ
    if (order.hasPrescriptionDrug) {
      if (!order.pharmacistApproved) {
        return {
          dispenseAllowed: false,
          status: 'ON_HOLD',
          message: 'Đơn hàng tạm giữ chờ dược sĩ thẩm định tương tác và liều dùng!',
        };
      }
      if (!order.pharmacistLicense) {
        throw new Error('Thiếu chứng chỉ hành nghề của dược sĩ phê duyệt!');
      }
    }

    return {
      dispenseAllowed: true,
      status: 'RELEASED_FOR_DISPENSING',
      message: 'Đã xuất bán thành công',
    };
  };

  describe('1. [Normal Values] Đơn thuốc kê đơn được dược sĩ thẩm định phê duyệt', () => {
    it('TC-WBS11-NORM-01: Cho phép xuất bán khi dược sĩ đã xác nhận và có chứng chỉ hành nghề hợp lệ', () => {
      const order = {
        orderId: 'ORD-HOLD-01',
        hasPrescriptionDrug: true,
        pharmacistApproved: true,
        pharmacistLicense: 'CCHN-098877',
      };

      const result = evaluateHoldOrder(order);

      expect(result.dispenseAllowed).toBe(true);
      expect(result.status).toBe('RELEASED_FOR_DISPENSING');
    });

    it('TC-WBS11-NORM-02: Tự động cho phép xuất bán ngay đối với đơn chỉ gồm thuốc OTC không kê đơn', () => {
      const otcOrder = {
        orderId: 'ORD-OTC-01',
        hasPrescriptionDrug: false,
        pharmacistApproved: false,
      };

      const result = evaluateHoldOrder(otcOrder);

      expect(result.dispenseAllowed).toBe(true);
      expect(result.status).toBe('RELEASED_FOR_DISPENSING');
    });
  });

  describe('2. [Boundary Values] Mốc trạng thái tạm giữ ON_HOLD', () => {
    it('TC-WBS11-BOUND-01: Giữ nguyên trạng thái ON_HOLD khi dược sĩ chưa ký duyệt đơn', () => {
      const pendingOrder = {
        orderId: 'ORD-HOLD-02',
        hasPrescriptionDrug: true,
        pharmacistApproved: false,
      };

      const result = evaluateHoldOrder(pendingOrder);

      expect(result.dispenseAllowed).toBe(false);
      expect(result.status).toBe('ON_HOLD');
    });
  });

  describe('3. [Abnormal Values] Dược sĩ duyệt nhưng thiếu chứng chỉ hành nghề', () => {
    it('TC-WBS11-ABNORM-01: Ném lỗi khi duyệt đơn thuốc kê đơn nhưng không có chứng chỉ hành nghề', () => {
      const invalidApproval = {
        orderId: 'ORD-HOLD-03',
        hasPrescriptionDrug: true,
        pharmacistApproved: true,
        pharmacistLicense: '', // Thiếu CCHN
      };

      expect(() => evaluateHoldOrder(invalidApproval)).toThrow(/Thiếu chứng chỉ hành nghề/);
    });
  });
});
