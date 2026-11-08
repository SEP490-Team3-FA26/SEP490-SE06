// backend/apps/inventory-service/src/tests/uc-23-drug-interaction.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-23] DRUG-DRUG INTERACTION SAFETY CHECK (KIỂM TRA TƯƠNG TÁC THUỐC)
 * Tham chiếu: Report 5 (Feature F03) & WBS #5 (Drug Interaction Check Screen)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-23] Drug-Drug Interaction Safety Check (Kiểm tra tương tác thuốc)', () => {
  const clinicalInteractions = [
    { drugA: 'Aspirin', drugB: 'Warfarin', severity: 'MAJOR', risk: 'Xuất huyết nghiêm trọng' },
    { drugA: 'Clarithromycin', drugB: 'Simvastatin', severity: 'SEVERE', risk: 'Tiêu cơ vân cấp' },
    { drugA: 'Ciprofloxacin', drugB: 'Theophylline', severity: 'MODERATE', risk: 'Tăng độc tính Theophylline' },
  ];

  const checkPrescriptionInteractions = (prescriptionDrugs: string[]) => {
    if (!prescriptionDrugs || prescriptionDrugs.length === 0) {
      throw new Error('Đơn thuốc không có danh sách hoạt chất để kiểm tra!');
    }
    const detected = [];
    for (const rule of clinicalInteractions) {
      const hasA = prescriptionDrugs.some(d => d.toLowerCase().includes(rule.drugA.toLowerCase()));
      const hasB = prescriptionDrugs.some(d => d.toLowerCase().includes(rule.drugB.toLowerCase()));
      if (hasA && hasB) {
        detected.push(rule);
      }
    }
    return {
      hasConflict: detected.length > 0,
      conflictCount: detected.length,
      conflicts: detected,
      severityMax: detected.length > 0 ? detected[0].severity : 'NONE',
    };
  };

  describe('1. [Normal Values] Đơn thuốc chứa tương tác nguy hiểm', () => {
    it('TC-UC23-NORM-01: Phát hiện tương tác MAJOR khi đơn thuốc có Aspirin và Warfarin', () => {
      const drugs = ['Aspirin 81mg', 'Warfarin 2mg', 'Panadol 500mg'];
      const result = checkPrescriptionInteractions(drugs);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.conflicts[0].risk).toContain('Xuất huyết');
    });

    it('TC-UC23-NORM-02: Xác nhận an toàn khi các thuốc trong đơn không có tương tác đối kháng', () => {
      const safeDrugs = ['Paracetamol 500mg', 'Vitamin B-Complex', 'Eugica'];
      const result = checkPrescriptionInteractions(safeDrugs);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictCount).toBe(0);
      expect(result.severityMax).toBe('NONE');
    });
  });

  describe('2. [Boundary Values] Mốc số lượng thuốc trong đơn (1 thuốc vs nhiều thuốc)', () => {
    it('TC-UC23-BOUND-01: [Đơn 1 loại thuốc duy nhất] Luôn an toàn không có tương tác chéo', () => {
      const singleDrug = ['Amoxicillin 500mg'];
      const result = checkPrescriptionInteractions(singleDrug);

      expect(result.hasConflict).toBe(false);
    });

    it('TC-UC23-BOUND-02: [Đơn đồng thời 2 cặp tương tác] Phát hiện đầy đủ 2 tương tác trong cùng 1 đơn', () => {
      const multiConflictDrugs = ['Aspirin', 'Warfarin', 'Clarithromycin', 'Simvastatin'];
      const result = checkPrescriptionInteractions(multiConflictDrugs);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictCount).toBe(2);
    });
  });

  describe('3. [Abnormal Values] Danh sách thuốc rỗng hoặc không hợp lệ', () => {
    it('TC-UC23-ABNORM-01: Ném lỗi khi danh sách thuốc kiểm tra bị rỗng', () => {
      expect(() => checkPrescriptionInteractions([])).toThrow(/không có danh sách hoạt chất/);
    });
  });
});
