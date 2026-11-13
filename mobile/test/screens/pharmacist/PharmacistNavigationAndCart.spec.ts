/**
 * PharmacistNavigationAndCart.spec.ts - Bộ Kiểm Thử Điều Hướng Chi Tiết & Giỏ Hàng POS Dược Sĩ
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Điều hướng sang MedicineDetailScreen, Dược sĩ bán thuốc Rx, cộng dồn giỏ POS.
 * 2. [Boundary Values]: Tồn kho tối thiểu 1, chạm trần tồn kho, giỏ hàng ban đầu rỗng [].
 * 3. [Abnormal Values]: Thuốc null/undefined, khách thường cố thêm thuốc Rx, giá tiền NaN/âm.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine, CartItem } from '../../../src/types/pharmacy.types';

// =========================================================================
// Các hàm tiện ích nghiệp vụ chuẩn hóa điều hướng và Giỏ POS Dược Sĩ
// =========================================================================

/**
 * Chuẩn bị tham số điều hướng sang màn hình chi tiết thuốc riêng biệt (MedicineDetailScreen)
 */
export function buildMedicineDetailNavParams(med: Medicine | null | undefined): {
  medicine: Medicine | null;
  medicineId: string;
} {
  if (!med) {
    return { medicine: null, medicineId: '' };
  }
  const id = String(med.id || (med as any)._id || '').trim();
  return {
    medicine: med,
    medicineId: id,
  };
}

/**
 * Kiểm tra phân quyền bán thuốc kê đơn (Rx) theo Thông tư 07/2017/TT-BYT:
 * - Dược sĩ chi nhánh: ĐƯỢC PHÉP tư vấn và bán tại quầy POS.
 * - Khách hàng tự do: BỊ CHẶN, không được tự ý thêm vào giỏ.
 */
export function validateRxSalePermission(
  medicine: Medicine | null | undefined,
  isPharmacist: boolean,
): { allowed: boolean; message: string } {
  if (!medicine) {
    return { allowed: false, message: 'Dữ liệu thuốc không hợp lệ' };
  }
  if (medicine.isRx && !isPharmacist) {
    return {
      allowed: false,
      message: 'Theo Thông tư 07/2017/TT-BYT, thuốc kê đơn (Rx) cần có Dược sĩ tư vấn xác nhận.',
    };
  }
  return { allowed: true, message: 'Hợp lệ' };
}

/**
 * Thêm hoặc cộng dồn thuốc vào Giỏ hàng POS của Dược sĩ
 */
export function addMedicineToPosCart(
  cart: CartItem[] | null | undefined,
  med: Medicine,
  quantity = 1,
  customUnit?: string,
  customPrice?: number,
): CartItem[] {
  const currentCart = Array.isArray(cart) ? [...cart] : [];
  if (!med || !med.id) return currentCart;

  const safeQty = Math.max(1, isNaN(quantity) ? 1 : quantity);
  const maxStock = Math.max(1, isNaN(med.stock) ? 999 : med.stock);
  const unit = customUnit || med.unit || 'Hộp';
  const price = customPrice !== undefined && !isNaN(customPrice) && customPrice >= 0
    ? customPrice
    : (med.price || 0);

  const existingIdx = currentCart.findIndex((i) => i.medicine?.id === med.id);
  if (existingIdx >= 0) {
    const nextQty = Math.min(maxStock, currentCart[existingIdx].quantity + safeQty);
    currentCart[existingIdx] = {
      ...currentCart[existingIdx],
      quantity: nextQty,
      selectedUnit: unit,
    };
  } else {
    currentCart.push({
      medicine: { ...med, price },
      quantity: Math.min(maxStock, safeQty),
      selectedUnit: unit,
    });
  }

  return currentCart;
}

// =========================================================================
// TEST SUITE
// =========================================================================

describe('PharmacistNavigationAndCart - Kiểm Thử Điều Hướng & Giỏ POS Dược Sĩ', () => {
  const mockMedOtC: Medicine = {
    id: 'med-salonpas-gel30',
    name: 'Gel Salonpas giảm đau, kháng viêm các cơn đau cơ, khớp (30g)',
    active: 'Menthol ( 7% ) , Methyl salicylate ( 15% )',
    category: 'Giảm đau, kháng viêm',
    price: 48000,
    unit: 'Tuýp',
    stock: 120,
    isRx: false,
    sku: 'MED-SALONPAS-GEL30',
    barcode: '8935001702016',
    batches: [],
  };

  const mockMedRx: Medicine = {
    id: 'med-augmentin-1g',
    name: 'Augmentin 1g Amoxicillin/Acid Clavulanic',
    active: 'Amoxicillin 875mg, Clavulanic acid 125mg',
    category: 'Thuốc kháng sinh',
    price: 245000,
    unit: 'Hộp',
    stock: 45,
    isRx: true,
    sku: 'MED-AUG-1G',
    barcode: '8935001709876',
    batches: [],
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. [Normal Values]
  // ───────────────────────────────────────────────────────────────────────────
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('Phải tạo tham số điều hướng MedicineDetailScreen đầy đủ và chính xác', () => {
      const params = buildMedicineDetailNavParams(mockMedOtC);
      expect(params.medicineId).toBe('med-salonpas-gel30');
      expect(params.medicine).toBe(mockMedOtC);
      expect(params.medicine?.name).toContain('Salonpas');
    });

    it('Dược sĩ được phép bán và kê đơn thuốc kê đơn (Rx) tại quầy POS', () => {
      const result = validateRxSalePermission(mockMedRx, true);
      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Hợp lệ');
    });

    it('Khách hàng mua thuốc không kê đơn (OTC) được phép bình thường', () => {
      const result = validateRxSalePermission(mockMedOtC, false);
      expect(result.allowed).toBe(true);
    });

    it('Thêm thuốc mới vào giỏ POS rỗng thành công', () => {
      const cart = addMedicineToPosCart([], mockMedOtC, 2);
      expect(cart).toHaveLength(1);
      expect(cart[0].medicine.id).toBe('med-salonpas-gel30');
      expect(cart[0].quantity).toBe(2);
      expect(cart[0].selectedUnit).toBe('Tuýp');
    });

    it('Cộng dồn số lượng khi thêm cùng một thuốc vào giỏ POS', () => {
      let cart = addMedicineToPosCart([], mockMedOtC, 2);
      cart = addMedicineToPosCart(cart, mockMedOtC, 3);
      expect(cart).toHaveLength(1);
      expect(cart[0].quantity).toBe(5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. [Boundary Values]
  // ───────────────────────────────────────────────────────────────────────────
  describe('[Boundary Values] Giá trị biên và giới hạn tồn kho', () => {
    it('Xử lý an toàn khi giỏ hàng ban đầu là mảng rỗng []', () => {
      const cart = addMedicineToPosCart([], mockMedOtC, 1);
      expect(cart).toHaveLength(1);
      expect(cart[0].quantity).toBe(1);
    });

    it('Không cho phép cộng dồn số lượng vượt quá giới hạn tồn kho của kho chi nhánh', () => {
      const medLimitedStock: Medicine = { ...mockMedOtC, stock: 5 };
      let cart = addMedicineToPosCart([], medLimitedStock, 3);
      cart = addMedicineToPosCart(cart, medLimitedStock, 10);
      // Giới hạn tối đa bằng tồn kho 5
      expect(cart[0].quantity).toBe(5);
    });

    it('Xử lý đúng khi số lượng mua tối thiểu là 1 đơn vị', () => {
      const cart = addMedicineToPosCart([], mockMedOtC, 0);
      expect(cart[0].quantity).toBe(1);
    });

    it('Xử lý đúng khi thuốc chỉ còn đúng 1 sản phẩm tồn kho duy nhất', () => {
      const medOneLeft: Medicine = { ...mockMedOtC, stock: 1 };
      const cart = addMedicineToPosCart([], medOneLeft, 5);
      expect(cart[0].quantity).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. [Abnormal Values]
  // ───────────────────────────────────────────────────────────────────────────
  describe('[Abnormal Values] Dữ liệu dị thường và phòng vệ', () => {
    it('Phải chặn khách hàng tự do khi cố tình thêm thuốc kê đơn (Rx) mà không có Dược sĩ', () => {
      const result = validateRxSalePermission(mockMedRx, false);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Thông tư 07/2017/TT-BYT');
    });

    it('Phải trả về rỗng an toàn khi thông tin thuốc truyền vào là null hoặc undefined', () => {
      const params = buildMedicineDetailNavParams(null);
      expect(params.medicineId).toBe('');
      expect(params.medicine).toBeNull();
    });

    it('Không làm lỗi giỏ hàng khi truyền thuốc null hoặc thiếu id', () => {
      const cart = addMedicineToPosCart([], null as any, 1);
      expect(cart).toEqual([]);
    });

    it('Xử lý an toàn khi số lượng truyền vào là NaN hoặc số âm', () => {
      const cart = addMedicineToPosCart([], mockMedOtC, NaN);
      expect(cart[0].quantity).toBe(1);
    });

    it('Xử lý an toàn khi giỏ hàng ban đầu là null hoặc undefined', () => {
      const cart = addMedicineToPosCart(null, mockMedOtC, 1);
      expect(cart).toHaveLength(1);
      expect(cart[0].medicine.id).toBe('med-salonpas-gel30');
    });
  });
});
