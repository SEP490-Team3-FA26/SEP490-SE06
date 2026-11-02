/**
 * MedicineDetailScreen.spec.ts - Bộ Kiểm Thử Nghiệp Vụ Màn Hình Chi Tiết Thuốc Riêng Biệt
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Tính toán giá gốc, cộng dồn giỏ hàng, lọc sản phẩm cùng chuyên khoa.
 * 2. [Boundary Values]: Tăng giảm số lượng tại biên (1, maxStock), giỏ hàng rỗng [].
 * 3. [Abnormal Values]: Dữ liệu thuốc rỗng, null, NaN, số âm, fallback an toàn.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine, CartItem } from '../../../src/types/pharmacy.types';

// =========================================================================
// Các hàm tiện ích nghiệp vụ cốt lõi của MedicineDetailScreen
// =========================================================================

/**
 * Tính toán giá gốc tham khảo dựa trên phần trăm chiết khấu
 */
export function calculateOriginalPrice(price: number, discountPercent = 25): number {
  if (price <= 0 || isNaN(price)) return 0;
  return Math.round(price * (1 + discountPercent / 100));
}

/**
 * Điều chỉnh số lượng mua đảm bảo luôn nằm trong khoảng [1, maxStock]
 */
export function adjustQuantity(currentQty: number, delta: number, maxStock = 999): number {
  if (isNaN(currentQty) || isNaN(delta)) return 1;
  const safeStock = Math.max(1, isNaN(maxStock) ? 999 : maxStock);
  const nextQty = currentQty + delta;
  if (nextQty < 1) return 1;
  if (nextQty > safeStock) return safeStock;
  return nextQty;
}

/**
 * Thêm hoặc cộng dồn sản phẩm thuốc vào danh sách giỏ hàng
 */
export function mergeItemIntoCart(
  cart: CartItem[] | null | undefined,
  medicine: Medicine,
  quantity: number,
  selectedUnit?: string,
): CartItem[] {
  const safeCart = Array.isArray(cart) ? [...cart] : [];
  if (!medicine || !medicine.id) return safeCart;
  const safeQty = Math.max(1, isNaN(quantity) ? 1 : quantity);

  const idx = safeCart.findIndex((i) => i.medicine?.id === medicine.id);
  if (idx >= 0) {
    safeCart[idx] = {
      ...safeCart[idx],
      quantity: safeCart[idx].quantity + safeQty,
      selectedUnit: selectedUnit || safeCart[idx].selectedUnit,
    };
  } else {
    safeCart.push({
      medicine,
      quantity: safeQty,
      selectedUnit: selectedUnit || medicine.unit || 'Hộp',
    });
  }

  return safeCart;
}

/**
 * Lọc danh sách thuốc gợi ý cùng chuyên khoa (loại trừ thuốc hiện tại)
 */
export function getRelatedMedicines(
  allMedicines: Medicine[] | null | undefined,
  currentMedId: string,
  category: string,
  limit = 6,
): Medicine[] {
  if (!allMedicines || !Array.isArray(allMedicines) || allMedicines.length === 0) {
    return [];
  }
  const filtered = allMedicines.filter(
    (m) => m && m.id !== currentMedId && m.category === category,
  );
  if (filtered.length > 0) {
    return filtered.slice(0, limit);
  }
  // Fallback các thuốc khác
  return allMedicines.filter((m) => m && m.id !== currentMedId).slice(0, limit);
}

// =========================================================================
// BỘ KIỂM THỬ ĐƠN VỊ TOÀN DIỆN (UNIT TESTS)
// =========================================================================

describe('MedicineDetailScreen - Kiểm Thử Màn Hình Chi Tiết Thuốc', () => {
  const mockCurrentMedicine: Medicine = {
    id: 'med-detail-01',
    name: 'Panadol Extra Đỏ Giảm Đau Cấp Tốc',
    price: 45000,
    unit: 'Hộp',
    active: 'Paracetamol 500mg, Caffeine 65mg',
    category: 'Hạ sốt & Cảm cúm',
    stock: 50,
    isRx: false,
    batches: [],
  };

  const mockMedicineList: Medicine[] = [
    mockCurrentMedicine,
    {
      id: 'med-detail-02',
      name: 'Hapacol 650mg Hạ Sốt Nhanh',
      price: 35000,
      unit: 'Hộp',
      active: 'Paracetamol 650mg',
      category: 'Hạ sốt & Cảm cúm',
      stock: 20,
      isRx: false,
      batches: [],
    },
    {
      id: 'med-detail-03',
      name: 'Viên Ngậm Ho Eugica Xanh',
      price: 25000,
      unit: 'Hộp',
      active: 'Tinh dầu tràm',
      category: 'Hô hấp & Ho',
      stock: 100,
      isRx: false,
      batches: [],
    },
    {
      id: 'med-detail-04',
      name: 'Efferalgan 500mg Viên Sủi',
      price: 55000,
      unit: 'Tuýp',
      active: 'Paracetamol 500mg',
      category: 'Hạ sốt & Cảm cúm',
      stock: 30,
      isRx: false,
      batches: [],
    },
  ];

  // =========================================================================
  // 1. NHÓM GIÁ TRỊ CHUẨN [Normal Values]
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Phải tính chính xác giá gốc originalPrice khi có chiết khấu 25%', () => {
      const original = calculateOriginalPrice(45000, 25);
      // 45000 * 1.25 = 56250
      expect(original).toBe(56250);
    });

    it('Phải tăng số lượng mua bình thường khi chưa chạm trần tồn kho', () => {
      const nextQty = adjustQuantity(1, 1, 50);
      expect(nextQty).toBe(2);
    });

    it('Phải thêm mới thuốc vào giỏ hàng rỗng chuẩn xác', () => {
      const cart = mergeItemIntoCart([], mockCurrentMedicine, 2, 'Hộp');
      expect(cart).toHaveLength(1);
      expect(cart[0].medicine.id).toBe('med-detail-01');
      expect(cart[0].quantity).toBe(2);
      expect(cart[0].selectedUnit).toBe('Hộp');
    });

    it('Phải cộng dồn số lượng khi thuốc đã tồn tại sẵn trong giỏ hàng', () => {
      const initialCart: CartItem[] = [
        { medicine: mockCurrentMedicine, quantity: 1, selectedUnit: 'Hộp' },
      ];
      const updatedCart = mergeItemIntoCart(initialCart, mockCurrentMedicine, 3, 'Hộp');
      expect(updatedCart).toHaveLength(1);
      expect(updatedCart[0].quantity).toBe(4); // 1 + 3 = 4
    });

    it('Phải lọc chính xác các thuốc gợi ý cùng chuyên khoa (Hạ sốt & Cảm cúm)', () => {
      const related = getRelatedMedicines(
        mockMedicineList,
        'med-detail-01',
        'Hạ sốt & Cảm cúm',
        6,
      );
      expect(related.length).toBeGreaterThan(0);
      // Không được chứa chính thuốc đang xem
      expect(related.some((m) => m.id === 'med-detail-01')).toBe(false);
      // Phải chứa thuốc cùng nhóm như Hapacol hoặc Efferalgan
      const relatedIds = related.map((m) => m.id);
      expect(relatedIds).toContain('med-detail-02');
      expect(relatedIds).toContain('med-detail-04');
    });
  });

  // =========================================================================
  // 2. NHÓM GIÁ TRỊ BIÊN [Boundary Values]
  // =========================================================================
  describe('[Boundary Values] Giá trị biên và giới hạn', () => {
    it('Không được giảm số lượng mua xuống dưới 1 (giữ tối thiểu 1)', () => {
      const result = adjustQuantity(1, -1, 50);
      expect(result).toBe(1);
    });

    it('Không được tăng số lượng vượt quá giới hạn tồn kho maxStock', () => {
      const maxStock = 10;
      const result = adjustQuantity(10, 1, maxStock);
      expect(result).toBe(10);
    });

    it('Phải xử lý đúng khi tồn kho maxStock chỉ còn đúng 1 sản phẩm', () => {
      const result = adjustQuantity(1, 5, 1);
      expect(result).toBe(1);
    });

    it('Phải fallback danh sách thuốc khác khi KHÔNG có thuốc nào cùng chuyên khoa', () => {
      const related = getRelatedMedicines(
        mockMedicineList,
        'med-detail-01',
        'CHUYEN_KHOA_KHONG_TON_TAI',
        2,
      );
      expect(related).toHaveLength(2);
      expect(related.some((m) => m.id === 'med-detail-01')).toBe(false);
    });

    it('Phải xử lý an toàn khi giỏ hàng ban đầu là mảng rỗng []', () => {
      const cart = mergeItemIntoCart([], mockCurrentMedicine, 1);
      expect(cart).toHaveLength(1);
    });
  });

  // =========================================================================
  // 3. NHÓM GIÁ TRỊ DỊ THƯỜNG [Abnormal Values]
  // =========================================================================
  describe('[Abnormal Values] Giá trị dị thường, sai định dạng và ngoại lệ', () => {
    it('Phải trả về 0 khi giá bán là số âm, 0 hoặc NaN', () => {
      expect(calculateOriginalPrice(-10000)).toBe(0);
      expect(calculateOriginalPrice(0)).toBe(0);
      expect(calculateOriginalPrice(NaN)).toBe(0);
    });

    it('Phải trả về số lượng an toàn là 1 khi số lượng hiện tại hoặc delta là NaN', () => {
      expect(adjustQuantity(NaN, 1, 50)).toBe(1);
      expect(adjustQuantity(5, NaN, 50)).toBe(1);
    });

    it('Phải xử lý an toàn khi giỏ hàng truyền vào là null hoặc undefined', () => {
      const cartNull = mergeItemIntoCart(null, mockCurrentMedicine, 1);
      expect(cartNull).toHaveLength(1);

      const cartUndef = mergeItemIntoCart(undefined, mockCurrentMedicine, 2);
      expect(cartUndef).toHaveLength(1);
    });

    it('Không ném lỗi khi thuốc truyền vào là null hoặc thiếu id', () => {
      const cart = mergeItemIntoCart([], null as any, 1);
      expect(cart).toEqual([]);

      const cartNoId = mergeItemIntoCart([], { name: 'Thuốc thiếu ID' } as any, 1);
      expect(cartNoId).toEqual([]);
    });

    it('Phải xử lý an toàn khi danh sách thuốc gợi ý là null hoặc rỗng', () => {
      expect(getRelatedMedicines(null, 'med-01', 'Cảm cúm')).toEqual([]);
      expect(getRelatedMedicines([], 'med-01', 'Cảm cúm')).toEqual([]);
    });
  });
});

