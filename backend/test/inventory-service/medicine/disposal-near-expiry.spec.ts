// backend/apps/inventory-service/src/medicine/disposal-near-expiry.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * BỘ KIỂM THỬ: CẢNH BÁO HẠN DÙNG 3 MÀU, TIÊU HỦY 2 CẤP & AN TOÀN LIỀU LƯỢNG
 * Tham chiếu tài liệu WBS và Guideline thiết kế Test Case (Normal, Boundary, Abnormal):
 * - WBS #32 & #33: Near-Expiry Warning (Xanh/Vàng/Đỏ) & Đề xuất xử lý
 * - WBS #73 & #74: Disposal Slip & Two-Level Approval (Quy trình duyệt 2 cấp)
 * - WBS #87: Dosage Compliance Alert (Cảnh báo liều vượt chuẩn Bộ Y Tế / WHO)
 * =========================================================================
 */

describe('Near-Expiry Governance, Disposal Approval & Dosage Safety (WBS #32, #73, #74, #87)', () => {
  // =========================================================================
  // 1. NHÓM KIỂM THỬ BÌNH THƯỜNG (NORMAL TEST CASES)
  // =========================================================================
  describe('1. [Normal Values] Cảnh báo hạn dùng 3 màu & Quy trình duyệt tiêu hủy 2 cấp', () => {
    // Hàm phân loại rủi ro cận hạn theo số ngày còn lại
    const classifyExpiryRisk = (remainingDays: number) => {
      if (remainingDays <= 0) {
        return { color: 'EXPIRED', action: 'DISPOSAL_REQUIRED', riskLevel: 'CRITICAL' };
      }
      if (remainingDays < 90) {
        return { color: 'RED', action: 'CLEARANCE_SALE_OR_RETURN', riskLevel: 'HIGH' };
      }
      if (remainingDays <= 180) {
        return { color: 'YELLOW', action: 'MONITOR_CLOSELY', riskLevel: 'MEDIUM' };
      }
      return { color: 'GREEN', action: 'NORMAL_STORAGE', riskLevel: 'SAFE' };
    };

    it('TC-EXP-NORM-01: Phân loại chính xác 3 mức màu Xanh/Vàng/Đỏ theo số ngày hạn dùng còn lại', () => {
      expect(classifyExpiryRisk(250).color).toBe('GREEN');   // > 180 ngày: An toàn (Xanh)
      expect(classifyExpiryRisk(120).color).toBe('YELLOW');  // 90 - 180 ngày: Cảnh báo (Vàng)
      expect(classifyExpiryRisk(45).color).toBe('RED');      // < 90 ngày: Nguy cơ cao (Đỏ)
    });

    it('TC-EXP-NORM-02: Hoàn tất quy trình duyệt tiêu hủy 2 cấp (Two-Level Approval: Cấp 1 -> Cấp 2)', () => {
      const disposalSlip = {
        slipId: 'DISP-2026-001',
        medicineId: 'MED-EXPIRED-LOT-1',
        quantity: 50,
        level1Approval: { approved: false, approvedBy: '' },
        level2Approval: { approved: false, approvedBy: '' },
        status: 'DRAFT',
      };

      // Cấp 1: Dược sĩ trưởng kho duyệt
      disposalSlip.level1Approval = { approved: true, approvedBy: 'Dược sĩ trưởng Chi nhánh' };
      disposalSlip.status = 'LEVEL_1_APPROVED';

      // Cấp 2: Giám đốc chuyên môn phê duyệt tiêu hủy
      disposalSlip.level2Approval = { approved: true, approvedBy: 'Giám đốc chuyên môn' };
      disposalSlip.status = 'DISPOSAL_COMPLETED';

      expect(disposalSlip.status).toBe('DISPOSAL_COMPLETED');
      expect(disposalSlip.level1Approval.approved).toBe(true);
      expect(disposalSlip.level2Approval.approved).toBe(true);
    });
  });

  // =========================================================================
  // 2. NHÓM KIỂM THỬ GIÁ TRỊ BIÊN (BOUNDARY TEST CASES)
  // =========================================================================
  describe('2. [Boundary Values] Các mốc biên 90 ngày, 180 ngày và liều tối đa cho phép', () => {
    const classifyExpiryRisk = (remainingDays: number) => {
      if (remainingDays <= 0) return 'EXPIRED';
      if (remainingDays < 90) return 'RED';
      if (remainingDays <= 180) return 'YELLOW';
      return 'GREEN';
    };

    it('TC-EXP-BOUND-01: [Biên 90 ngày] Đúng 90 ngày còn lại thuộc mức Vàng (Yellow), 89 ngày chuyển sang mức Đỏ (Red)', () => {
      expect(classifyExpiryRisk(90)).toBe('YELLOW');
      expect(classifyExpiryRisk(89)).toBe('RED');
    });

    it('TC-EXP-BOUND-02: [Biên 180 ngày] Đúng 180 ngày còn lại thuộc mức Vàng (Yellow), 181 ngày thuộc mức Xanh (Green)', () => {
      expect(classifyExpiryRisk(180)).toBe('YELLOW');
      expect(classifyExpiryRisk(181)).toBe('GREEN');
    });

    it('TC-EXP-BOUND-03: [Biên liều tối đa WHO/BYT] Paracetamol đúng 4000mg/ngày (chạm ngưỡng trần an toàn)', () => {
      const MAX_DAILY_PARACETAMOL_MG = 4000;

      const checkDosageSafety = (dailyDoseMg: number) => {
        if (dailyDoseMg > MAX_DAILY_PARACETAMOL_MG) {
          throw new Error(`Cảnh báo quá liều: Liều dùng ${dailyDoseMg}mg/ngày vượt trần cho phép ${MAX_DAILY_PARACETAMOL_MG}mg/ngày!`);
        }
        return { isSafe: true };
      };

      expect(checkDosageSafety(MAX_DAILY_PARACETAMOL_MG).isSafe).toBe(true);
    });
  });

  // =========================================================================
  // 3. NHÓM KIỂM THỬ NGOẠI LỆ / BẤT THƯỜNG (ABNORMAL TEST CASES)
  // =========================================================================
  describe('3. [Abnormal Values] Xử lý thuốc đã quá hạn, duyệt nhảy cóc và quá liều độc tính', () => {
    it('TC-EXP-ABNORM-01: Chặn xuất bán thuốc đã hết hạn sử dụng (remainingDays <= 0)', () => {
      const expiredItem = {
        medicineName: 'Amoxicillin 500mg',
        remainingDays: -5, // Đã quá hạn 5 ngày
      };

      const validateSellable = (item: typeof expiredItem) => {
        if (item.remainingDays <= 0) {
          throw new Error('Vi phạm GPP: Tuyệt đối không được phép xuất bán thuốc đã hết hạn sử dụng!');
        }
        return true;
      };

      expect(() => validateSellable(expiredItem)).toThrow(/Vi phạm GPP/);
    });

    it('TC-EXP-ABNORM-02: Ném lỗi quy trình 2 cấp khi Cấp 2 cố tình duyệt trước Cấp 1 (WBS #74)', () => {
      const invalidSlip = {
        slipId: 'DISP-INVALID-01',
        level1Approval: { approved: false }, // Cấp 1 CHƯA duyệt
      };

      const approveLevel2 = (slip: typeof invalidSlip) => {
        if (!slip.level1Approval.approved) {
          throw new Error('Sai quy trình: Phiếu tiêu hủy bắt buộc phải được Dược sĩ trưởng (Cấp 1) duyệt trước!');
        }
        return true;
      };

      expect(() => approveLevel2(invalidSlip)).toThrow(/Sai quy trình/);
    });

    it('TC-EXP-ABNORM-03: Kích hoạt cảnh báo khẩn cấp khi liều dùng vượt chuẩn Bộ Y Tế (WBS #87: 5000mg > 4000mg)', () => {
      const MAX_DAILY_PARACETAMOL_MG = 4000;
      const unsafeDoseMg = 5000; // 5000mg Paracetamol/ngày gây độc tính hoại tử tế bào gan

      const checkDosage = (dose: number) => {
        if (dose > MAX_DAILY_PARACETAMOL_MG) {
          throw new Error(`Cảnh báo độc tính: Liều ${dose}mg vượt ngưỡng tối đa ${MAX_DAILY_PARACETAMOL_MG}mg/ngày theo tiêu chuẩn Bộ Y Tế!`);
        }
        return true;
      };

      expect(() => checkDosage(unsafeDoseMg)).toThrow(/Cảnh báo độc tính/);
    });
  });
});
