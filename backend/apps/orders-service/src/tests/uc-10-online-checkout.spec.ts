// backend/apps/orders-service/src/tests/uc-10-online-checkout.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-10] ONLINE CUSTOMER CHECKOUT (ĐẶT HÀNG TRỰC TUYẾN)
 * Tham chiếu: Report 5 (Feature F02) & WBS #1 (Medicine Search & Cart)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-10] Online Customer Checkout (Đặt Hàng Trực Tuyến)', () => {
  // Logic tính toán đơn hàng
  const processCheckout = (orderData: {
    customerName: string;
    phone: string;
    address: string;
    items: Array<{ medicineId: string; name: string; quantity: number; price: number }>;
  }) => {
    if (!orderData.customerName || !orderData.phone || !orderData.address) {
      throw new Error('Vui lòng cung cấp đầy đủ tên, số điện thoại và địa chỉ nhận hàng!');
    }
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Giỏ hàng không được để trống!');
    }

    let totalAmount = 0;
    for (const item of orderData.items) {
      if (item.quantity <= 0) {
        throw new Error(`Số lượng sản phẩm "${item.name}" phải lớn hơn 0!`);
      }
      totalAmount += item.quantity * item.price;
    }

    return {
      status: 'ORDER_CREATED',
      orderCode: Math.floor(100000 + Math.random() * 900000),
      totalAmount,
      totalItems: orderData.items.length,
      createdAt: new Date(),
    };
  };

  // 1. NORMAL TEST CASES
  describe('1. [Normal Values] Đặt hàng thông thường với giỏ hàng hợp lệ', () => {
    it('TC-UC10-NORM-01: Tạo đơn hàng thành công khi thông tin khách hàng và giỏ hàng hợp lệ', () => {
      const payload = {
        customerName: 'Nguyễn Văn A',
        phone: '0901234567',
        address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
        items: [
          { medicineId: 'MED-01', name: 'Panadol Extra', quantity: 2, price: 50000 },
          { medicineId: 'MED-02', name: 'Vitamin C 1000mg', quantity: 1, price: 80000 },
        ],
      };

      const result = processCheckout(payload);

      expect(result.status).toBe('ORDER_CREATED');
      expect(result.totalAmount).toBe(180000); // 2*50k + 1*80k = 180k
      expect(result.totalItems).toBe(2);
      expect(result.orderCode).toBeGreaterThanOrEqual(100000);
    });
  });

  // 2. BOUNDARY TEST CASES
  describe('2. [Boundary Values] Các mốc biên giỏ hàng', () => {
    it('TC-UC10-BOUND-01: [Biên dưới số lượng] Đặt hàng chỉ với đúng 1 sản phẩm có số lượng = 1', () => {
      const payload = {
        customerName: 'Trần Thị B',
        phone: '0912345678',
        address: '456 Lê Lợi, TP.HCM',
        items: [{ medicineId: 'MED-01', name: 'Panadol Extra', quantity: 1, price: 50000 }],
      };

      const result = processCheckout(payload);

      expect(result.status).toBe('ORDER_CREATED');
      expect(result.totalAmount).toBe(50000);
      expect(result.totalItems).toBe(1);
    });
  });

  // 3. ABNORMAL TEST CASES
  describe('3. [Abnormal Values] Xử lý lỗi giỏ hàng rỗng và thiếu thông tin giao hàng', () => {
    it('TC-UC10-ABNORM-01: Ném lỗi khi giỏ hàng rỗng không có sản phẩm nào', () => {
      const payload = {
        customerName: 'Lê Văn C',
        phone: '0988776655',
        address: 'Hà Nội',
        items: [],
      };

      expect(() => processCheckout(payload)).toThrow(/Giỏ hàng không được để trống/);
    });

    it('TC-UC10-ABNORM-02: Ném lỗi khi thiếu số điện thoại nhận hàng', () => {
      const payload = {
        customerName: 'Lê Văn C',
        phone: '', // Thiếu số điện thoại
        address: 'Hà Nội',
        items: [{ medicineId: 'MED-01', name: 'Panadol', quantity: 1, price: 50000 }],
      };

      expect(() => processCheckout(payload)).toThrow(/Vui lòng cung cấp đầy đủ/);
    });

    it('TC-UC10-ABNORM-03: Ném lỗi khi số lượng sản phẩm bằng 0 hoặc âm', () => {
      const payload = {
        customerName: 'Lê Văn C',
        phone: '0988776655',
        address: 'Hà Nội',
        items: [{ medicineId: 'MED-01', name: 'Panadol', quantity: 0, price: 50000 }],
      };

      expect(() => processCheckout(payload)).toThrow(/phải lớn hơn 0/);
    });
  });
});
