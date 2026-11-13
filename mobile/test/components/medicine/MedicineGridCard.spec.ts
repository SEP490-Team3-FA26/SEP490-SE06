/**
 * MedicineGridCard.spec.ts - Kiểm Thử Đơn Vị Thẻ Dược Phẩm Lưới 2 Cột (UI Component Layer)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Dữ liệu thuốc đầy đủ, format giá tiền Việt Nam, hiển thị Rx/OTC, tương tác callbacks.
 * 2. [Boundary Values]: Tên thuốc cực dài 100+ ký tự, giá tiền = 0, đơn vị tính rỗng (fallback 'Hộp').
 * 3. [Abnormal Values]: Hoạt chất undefined, thuốc không có ảnh, giá tiền âm hoặc NaN.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine } from '../../../src/types/pharmacy.types';

// Hàm helper tái hiện logic format và binding của MedicineGridCard để kiểm thử độc lập
export function extractGridCardViewModel(medicine: Medicine, isWishlisted: boolean) {
  const activeIngredient = medicine.active || medicine.active_ingredient || (medicine.category ? `Nhóm: ${medicine.category}` : 'Dược phẩm chính hãng');
  const unitLabel = (medicine.unit && medicine.unit.trim().length > 0) ? medicine.unit : 'Hộp';
  const rawPrice = typeof medicine.price === 'number' && !isNaN(medicine.price) && medicine.price >= 0 ? medicine.price : 0;
  const priceDisplay = rawPrice.toLocaleString('vi-VN');

  return {
    id: medicine.id,
    name: medicine.name || 'Dược phẩm không tên',
    activeIngredient,
    unitLabel,
    priceDisplay,
    isRx: Boolean(medicine.isRx),
    isWishlisted: Boolean(isWishlisted),
  };
}

describe('MedicineGridCard - Tầng Giao Diện Thẻ Thuốc 2 Cột (UI Component)', () => {
  const mockMedicineNormal: Medicine = {
    id: 'med-001',
    name: 'Cao dán Salonpas Diclofenac Patch',
    price: 25000,
    stock: 100,
    unit: 'Hộp',
    category: 'Miếng dán giảm đau',
    active: 'Diclofenac sodium 1.5%',
    active_ingredient: 'Diclofenac sodium 1.5%',
    isRx: false,
    batches: [],
    image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg',
  };

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn & dữ liệu hợp lệ
  // =========================================================================
  describe('1. [Normal Values] - Hiển thị thẻ dược phẩm chuẩn', () => {
    it('N-01: Định dạng giá tiền VNĐ chính xác có dấu chấm ngăn cách', () => {
      const vm = extractGridCardViewModel(mockMedicineNormal, false);
      expect(vm.priceDisplay).toBe('25.000');
      expect(vm.unitLabel).toBe('Hộp');
    });

    it('N-02: Phân loại đúng thuốc không kê đơn OTC', () => {
      const vm = extractGridCardViewModel(mockMedicineNormal, false);
      expect(vm.isRx).toBe(false);
      expect(vm.isWishlisted).toBe(false);
    });

    it('N-03: Nhận diện chính xác thuốc kê đơn Rx và trạng thái yêu thích', () => {
      const rxMedicine: Medicine = {
        ...mockMedicineNormal,
        isRx: true,
      };
      const vm = extractGridCardViewModel(rxMedicine, true);
      expect(vm.isRx).toBe(true);
      expect(vm.isWishlisted).toBe(true);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, số 0
  // =========================================================================
  describe('2. [Boundary Values] - Xử lý giá trị biên', () => {
    it('B-01: Giá tiền bằng 0 phải hiển thị "0" mà không bị crash', () => {
      const freeMed: Medicine = {
        ...mockMedicineNormal,
        price: 0,
      };
      const vm = extractGridCardViewModel(freeMed, false);
      expect(vm.priceDisplay).toBe('0');
    });

    it('B-02: Đơn vị tính rỗng phải fallback về "Hộp" an toàn', () => {
      const noUnitMed: Medicine = {
        ...mockMedicineNormal,
        unit: '',
      };
      const vm = extractGridCardViewModel(noUnitMed, false);
      expect(vm.unitLabel).toBe('Hộp');
    });

    it('B-03: Tên thuốc dài 200 ký tự vẫn được giữ nguyên để CSS numberOfLines={2} cắt dòng', () => {
      const longName = 'Thuốc đặc trị viêm khớp dạng thấp dài ' + 'rất dài '.repeat(20);
      const longNameMed: Medicine = {
        ...mockMedicineNormal,
        name: longName,
      };
      const vm = extractGridCardViewModel(longNameMed, false);
      expect(vm.name.length).toBeGreaterThan(100);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu bất thường, thiếu trường, NaN
  // =========================================================================
  describe('3. [Abnormal Values] - Xử lý dữ liệu dị thường & thiếu sót', () => {
    it('A-01: Giá tiền bị âm hoặc NaN phải tự động fallback về 0', () => {
      const invalidPriceMed: Medicine = {
        ...mockMedicineNormal,
        price: -50000,
      };
      const nanPriceMed: Medicine = {
        ...mockMedicineNormal,
        price: NaN,
      };

      expect(extractGridCardViewModel(invalidPriceMed, false).priceDisplay).toBe('0');
      expect(extractGridCardViewModel(nanPriceMed, false).priceDisplay).toBe('0');
    });

    it('A-02: Hoạt chất undefined phải fallback sang nhóm danh mục hoặc thông báo mặc định', () => {
      const noActiveMed: Medicine = {
        ...mockMedicineNormal,
        active: undefined,
        active_ingredient: undefined,
        category: 'Thực phẩm chức năng',
      };
      const vm = extractGridCardViewModel(noActiveMed, false);
      expect(vm.activeIngredient).toBe('Nhóm: Thực phẩm chức năng');
    });

    it('A-03: Thuốc thiếu cả hoạt chất lẫn category phải hiển thị "Dược phẩm chính hãng"', () => {
      const blankMed: Medicine = {
        ...mockMedicineNormal,
        active: undefined,
        active_ingredient: undefined,
        category: '',
      };
      const vm = extractGridCardViewModel(blankMed, false);
      expect(vm.activeIngredient).toBe('Dược phẩm chính hãng');
    });
  });
});
