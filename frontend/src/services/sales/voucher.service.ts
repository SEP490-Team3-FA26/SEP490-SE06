import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

// Phân loại quy tắc khuyến mãi (UC-75)
export type VoucherRuleType = 'STANDARD' | 'BUY_X_GET_Y' | 'COMBO';

// Điều kiện mua hàng cho Mua X tặng Y
export interface BuyCondition {
  buyMedicineId?: string; // ID thuốc cần mua
  buyMedicineName?: string; // Tên thuốc cần mua
  buyQuantity: number; // Số lượng tối thiểu (X)
}

// Quà tặng kèm cho Mua X tặng Y
export interface GiftReward {
  giftMedicineId?: string; // ID thuốc được tặng (Y)
  giftMedicineName?: string; // Tên thuốc được tặng
  giftQuantity: number; // Số lượng quà tặng (Y)
  giftDiscountPercent?: number; // Tỷ lệ giảm giá cho quà (100% = miễn phí)
}

// Chi tiết thuốc trong gói Combo
export interface ComboItemCondition {
  medicineId: string; // ID thuốc trong Combo
  medicineName: string; // Tên thuốc trong Combo
  minQuantity: number; // Số lượng yêu cầu trong Combo
}

// Điều kiện gói Combo khuyến mãi
export interface ComboCondition {
  comboMedicines: ComboItemCondition[]; // Danh sách các thuốc bắt buộc trong Combo
  comboDiscountType: 'FIXED_AMOUNT' | 'PERCENTAGE'; // Loại giảm giá
  comboDiscountValue: number; // Giá trị giảm
}

export interface VoucherPayload {
  _id?: string;
  code: string;
  ruleType?: VoucherRuleType;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  minOrderValue?: number;
  maxDiscountValue?: number;
  buyCondition?: BuyCondition;
  giftReward?: GiftReward;
  comboCondition?: ComboCondition;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  usedCount?: number;
  isActive?: boolean;
}

export interface VoucherValidationItem {
  medicineId: string;
  medicineName?: string;
  quantity: number;
  price: number;
}

export const voucherService = {
  async getVouchers() {
    const res = await api.get(API_ENDPOINTS.VOUCHERS.LIST);
    return res.data;
  },
  async createVoucher(payload: VoucherPayload) {
    const res = await api.post(API_ENDPOINTS.VOUCHERS.CREATE, payload);
    return res.data;
  },
  // UC-75: Tạo mã giảm giá theo quy tắc nâng cao (Mua X tặng Y, Combo)
  async createAdvancedRule(payload: VoucherPayload) {
    const res = await api.post(API_ENDPOINTS.VOUCHERS.ADVANCED_RULES, payload);
    return res.data;
  },
  async updateVoucher(id: string, payload: Partial<VoucherPayload>) {
    const res = await api.put(API_ENDPOINTS.VOUCHERS.UPDATE(id), payload);
    return res.data;
  },
  async deleteVoucher(id: string) {
    const res = await api.delete(API_ENDPOINTS.VOUCHERS.DELETE(id));
    return res.data;
  },
  async validateVoucher(code: string, subtotal: number, items: VoucherValidationItem[] = [], branchId?: string) {
    const res = await api.post(API_ENDPOINTS.VOUCHERS.VALIDATE, { code, subtotal, items, branchId });
    return res.data;
  },
  // 🛡️ Rủi ro 7 SBA: Lấy danh sách kiểm toán nghi vấn trục lợi voucher
  async getVoucherAuditFlags() {
    const res = await api.get(API_ENDPOINTS.VOUCHERS.AUDIT_FLAGS);
    return res.data;
  }
};

