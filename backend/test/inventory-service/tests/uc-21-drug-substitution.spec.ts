// backend/apps/inventory-service/src/tests/uc-21-drug-substitution.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-21] ACTIVE-INGREDIENT DRUG SUBSTITUTION (ĐỔI THUỐC TƯƠNG ĐƯƠNG)
 * Tham chiếu: Report 5 (Feature F03) & WBS #36 (Substitute Medicine Suggestion)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-21] Active-Ingredient Drug Substitution (Đổi thuốc cùng hoạt chất)', () => {
  const medicineCatalog = [
    { sku: 'MED-AUG-625', name: 'Augmentin 625mg', activeIngredient: 'Amoxicillin + Clavulanic Acid', strength: '500mg/125mg', stock: 0 },
    { sku: 'MED-KLA-625', name: 'Klamentin 625mg', activeIngredient: 'Amoxicillin + Clavulanic Acid', strength: '500mg/125mg', stock: 120 },
    { sku: 'MED-CUR-625', name: 'Curam 625mg', activeIngredient: 'Amoxicillin + Clavulanic Acid', strength: '500mg/125mg', stock: 45 },
    { sku: 'MED-AMO-500', name: 'Amoxicillin 500mg Đơn chất', activeIngredient: 'Amoxicillin', strength: '500mg', stock: 200 },
  ];

  const findSubstitutes = (outOfStockDrug: (typeof medicineCatalog)[0]) => {
    if (!outOfStockDrug) {
      throw new Error('Dữ liệu thuốc tra cứu không hợp lệ!');
    }
    return medicineCatalog.filter(
      med =>
        med.sku !== outOfStockDrug.sku &&
        med.activeIngredient === outOfStockDrug.activeIngredient &&
        med.strength === outOfStockDrug.strength &&
        med.stock > 0,
    );
  };

  describe('1. [Normal Values] Gợi ý thuốc thay thế có cùng hoạt chất và hàm lượng', () => {
    it('TC-UC21-NORM-01: Gợi ý Klamentin và Curam khi Augmentin 625mg hết hàng (stock = 0)', () => {
      const aug = medicineCatalog[0];
      const result = findSubstitutes(aug);

      expect(result).toHaveLength(2);
      expect(result.map(m => m.name)).toEqual(['Klamentin 625mg', 'Curam 625mg']);
    });
  });

  describe('2. [Boundary Values] Mốc tồn kho của thuốc thay thế', () => {
    it('TC-UC21-BOUND-01: [Biên tồn kho = 1] Thuốc thay thế chỉ còn đúng 1 hộp cũng được gợi ý', () => {
      const rareSubstitute = {
        sku: 'MED-TEST-625',
        name: 'Biệt dược mới 625mg',
        activeIngredient: 'Amoxicillin + Clavulanic Acid',
        strength: '500mg/125mg',
        stock: 1, // Đúng 1 hộp
      };
      medicineCatalog.push(rareSubstitute);

      const aug = medicineCatalog[0];
      const result = findSubstitutes(aug);

      expect(result.some(m => m.sku === 'MED-TEST-625')).toBe(true);
      medicineCatalog.pop(); // Dọn dẹp
    });
  });

  describe('3. [Abnormal Values] Không tìm thấy thuốc thay thế phù hợp hoặc dữ liệu null', () => {
    it('TC-UC21-ABNORM-01: Không gợi ý các thuốc khác hoạt chất hoặc khác hàm lượng', () => {
      const aug = medicineCatalog[0];
      const result = findSubstitutes(aug);

      // Amoxicillin 500mg đơn chất không được gợi ý vì thiếu Clavulanic Acid
      expect(result.some(m => m.sku === 'MED-AMO-500')).toBe(false);
    });

    it('TC-UC21-ABNORM-02: Ném lỗi khi truyền thuốc tra cứu null', () => {
      expect(() => findSubstitutes(null as any)).toThrow(/không hợp lệ/);
    });
  });
});
