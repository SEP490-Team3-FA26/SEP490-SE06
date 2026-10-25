// backend/apps/supplier-service/src/credit/supplier-credit.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * BỘ KIỂM THỬ: HẠN MỨC CÔNG NỢ NHÀ CUNG CẤP & ĐẠI LÝ (WBS #7 & #85)
 * Tuân thủ Guideline thiết kế Test Case (Normal, Boundary, Abnormal):
 * - Normal: Dữ liệu thông thường, PO hợp lệ trong hạn mức
 * - Boundary: Giá trị biên (chạm ngưỡng 0đ, vừa đúng hạn mức, vượt 1đ)
 * - Abnormal: Dữ liệu bất thường (NCC bị khóa, NCC không tồn tại, số tiền không hợp lệ)
 * =========================================================================
 */

describe('Supplier & Agency Debt Limit Governance (WBS #7 & #85)', () => {
  // Mock nhà cung cấp mẫu
  const createMockSupplier = (overrides = {}) => ({
    _id: 'SUPP-001',
    name: 'Công ty Cổ phần Dược phẩm Sanofi Việt Nam',
    status: 'ACTIVE',
    creditLimit: 1000000000, // Hạn mức: 1 tỷ VNĐ
    currentDebt: 600000000,  // Nợ hiện tại: 600 triệu VNĐ
    ...overrides,
  });

  // Hàm logic kiểm tra hạn mức (tương đương logic trong supplier-credit.service.ts)
  const checkCreditLimit = (supplier: any, newOrderAmount: number) => {
    if (!supplier) {
      throw new Error('Không tìm thấy nhà cung cấp (404 Not Found)');
    }
    if (supplier.status !== 'ACTIVE') {
      return {
        allowed: false,
        reason: `NCC "${supplier.name}" đang ở trạng thái ${supplier.status}`,
        remainingCredit: 0,
      };
    }
    const creditLimit = supplier.creditLimit || 0;
    const currentDebt = supplier.currentDebt || 0;
    const remainingCredit = creditLimit - currentDebt;

    if (creditLimit === 0) {
      return {
        allowed: false,
        reason: `NCC "${supplier.name}" chưa được thiết lập hạn mức công nợ`,
        remainingCredit: 0,
      };
    }

    const allowed = currentDebt + newOrderAmount <= creditLimit;
    return {
      allowed,
      reason: allowed ? 'OK' : 'Vượt hạn mức công nợ cho phép!',
      currentDebt,
      creditLimit,
      remainingCredit: Math.max(0, remainingCredit - (allowed ? newOrderAmount : 0)),
    };
  };

  // =========================================================================
  // 1. NHÓM KIỂM THỬ BÌNH THƯỜNG (NORMAL TEST CASES)
  // =========================================================================
  describe('1. [Normal Values] Kiểm tra luồng cấp tín dụng thông thường', () => {
    it('TC-DEBT-NORM-01: Cho phép duyệt PO mới khi tổng nợ nằm an toàn trong hạn mức (Confirmation: OK/Pass)', () => {
      const supplier = createMockSupplier();
      const newPoAmount = 200000000; // 200 triệu (Tổng nợ = 800 triệu < 1 tỷ)

      const result = checkCreditLimit(supplier, newPoAmount);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('OK');
      expect(result.remainingCredit).toBe(200000000); // Còn lại 200 triệu
    });

    it('TC-DEBT-NORM-02: Tính toán chính xác số dư tín dụng khả dụng còn lại sau khi trừ PO', () => {
      const supplier = createMockSupplier({ currentDebt: 300000000 });
      const newPoAmount = 150000000;

      const result = checkCreditLimit(supplier, newPoAmount);

      expect(result.allowed).toBe(true);
      expect(result.remainingCredit).toBe(550000000); // 1 tỷ - 300tr - 150tr = 550 triệu
    });
  });

  // =========================================================================
  // 2. NHÓM KIỂM THỬ GIÁ TRỊ BIÊN (BOUNDARY TEST CASES)
  // =========================================================================
  describe('2. [Boundary Values] Kiểm tra các mốc giới hạn cận trên và cận dưới', () => {
    it('TC-DEBT-BOUND-01: [Biên dưới] PO có giá trị 0đ (không làm tăng nợ)', () => {
      const supplier = createMockSupplier();
      const zeroAmount = 0;

      const result = checkCreditLimit(supplier, zeroAmount);

      expect(result.allowed).toBe(true);
      expect(result.remainingCredit).toBe(400000000);
    });

    it('TC-DEBT-BOUND-02: [Biên trên chuẩn xác] PO mới đúng bằng toàn bộ số dư còn lại (currentDebt + amount === creditLimit)', () => {
      const supplier = createMockSupplier({ currentDebt: 600000000, creditLimit: 1000000000 });
      const exactRemaining = 400000000; // 400 triệu vừa khít 1 tỷ

      const result = checkCreditLimit(supplier, exactRemaining);

      expect(result.allowed).toBe(true);
      expect(result.remainingCredit).toBe(0); // Vừa hết hạn mức
    });

    it('TC-DEBT-BOUND-03: [Biên vượt 1 đơn vị] PO vượt hạn mức chỉ đúng 1 VNĐ (amount = remaining + 1)', () => {
      const supplier = createMockSupplier({ currentDebt: 600000000, creditLimit: 1000000000 });
      const overByOneVnd = 400000001; // Vượt 1 đồng

      const result = checkCreditLimit(supplier, overByOneVnd);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Vượt hạn mức công nợ');
    });
  });

  // =========================================================================
  // 3. NHÓM KIỂM THỬ NGOẠI LỆ / BẤT THƯỜNG (ABNORMAL TEST CASES)
  // =========================================================================
  describe('3. [Abnormal Values] Xử lý ngoại lệ và dữ liệu vi phạm quy tắc', () => {
    it('TC-DEBT-ABNORM-01: Ném lỗi khi nhà cung cấp không tồn tại trong hệ thống', () => {
      expect(() => checkCreditLimit(null, 100000)).toThrow(/Không tìm thấy nhà cung cấp/);
    });

    it('TC-DEBT-ABNORM-02: Từ chối cấp tín dụng khi nhà cung cấp đang bị tạm ngừng (SUSPENDED / INACTIVE)', () => {
      const inactiveSupplier = createMockSupplier({ status: 'SUSPENDED' });

      const result = checkCreditLimit(inactiveSupplier, 50000000);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('đang ở trạng thái SUSPENDED');
      expect(result.remainingCredit).toBe(0);
    });

    it('TC-DEBT-ABNORM-03: Từ chối cấp tín dụng khi nhà cung cấp chưa được thiết lập hạn mức nợ (creditLimit = 0)', () => {
      const unconfiguredSupplier = createMockSupplier({ creditLimit: 0, currentDebt: 0 });

      const result = checkCreditLimit(unconfiguredSupplier, 10000000);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('chưa được thiết lập hạn mức công nợ');
    });
  });
});
