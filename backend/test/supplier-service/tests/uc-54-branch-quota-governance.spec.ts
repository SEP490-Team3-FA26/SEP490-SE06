// backend/apps/supplier-service/src/tests/uc-54-branch-quota-governance.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-54] BRANCH PURCHASE QUOTA GOVERNANCE (HẠN MỨC NGÂN SÁCH CHI NHÁNH)
 * Tham chiếu: Report 5 (Feature F07) & WBS #27 (Branch Import Quota Screen)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-54] Branch Purchase Quota Governance (Hạn mức ngân sách chi nhánh)', () => {
  const branchBudget = {
    branchId: 'BR-DIST-01',
    monthlyQuota: 500000000, // 500 triệu VNĐ
    spentAmount: 350000000,  // Đã chi 350 triệu VNĐ
    get remainingQuota() {
      return this.monthlyQuota - this.spentAmount; // Còn lại 150 triệu
    },
  };

  const approveBranchRequisition = (budget: typeof branchBudget, requisitionTotal: number) => {
    if (requisitionTotal <= 0) {
      throw new Error('Giá trị đơn đề xuất mua hàng phải lớn hơn 0!');
    }
    if (requisitionTotal > budget.remainingQuota) {
      return {
        approved: false,
        reason: `Vượt hạn mức ngân sách chi nhánh! Còn lại: ${budget.remainingQuota.toLocaleString()}đ, Đề xuất: ${requisitionTotal.toLocaleString()}đ`,
        overBudgetBy: requisitionTotal - budget.remainingQuota,
      };
    }

    return {
      approved: true,
      reason: 'Phê duyệt đề xuất mua hàng thành công',
      newSpentAmount: budget.spentAmount + requisitionTotal,
      newRemainingQuota: budget.remainingQuota - requisitionTotal,
    };
  };

  describe('1. [Normal Values] Duyệt đề xuất mua hàng trong hạn mức ngân sách', () => {
    it('TC-UC54-NORM-01: Cho phép phê duyệt đơn đề xuất 100 triệu khi ngân sách còn lại là 150 triệu', () => {
      const result = approveBranchRequisition(branchBudget, 100000000);

      expect(result.approved).toBe(true);
      expect(result.newRemainingQuota).toBe(50000000); // 150tr - 100tr = 50 triệu
    });
  });

  describe('2. [Boundary Values] Mốc biên đúng bằng ngân sách còn lại', () => {
    it('TC-UC54-BOUND-01: [Khớp chính xác ngân sách còn lại] Đơn PR đúng 150 triệu làm cạn ngân sách về 0đ', () => {
      const result = approveBranchRequisition(branchBudget, 150000000);

      expect(result.approved).toBe(true);
      expect(result.newRemainingQuota).toBe(0);
    });

    it('TC-UC54-BOUND-02: [Vượt biên đúng 1 VNĐ] Đơn PR 150.000.001đ bị từ chối phê duyệt', () => {
      const result = approveBranchRequisition(branchBudget, 150000001);

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('Vượt hạn mức ngân sách chi nhánh');
      expect(result.overBudgetBy).toBe(1);
    });
  });

  describe('3. [Abnormal Values] Đơn đề xuất có giá trị bằng 0 hoặc số âm', () => {
    it('TC-UC54-ABNORM-01: Ném lỗi khi giá trị đơn đề xuất bằng 0 hoặc âm', () => {
      expect(() => approveBranchRequisition(branchBudget, 0)).toThrow(/phải lớn hơn 0/);
    });
  });
});
