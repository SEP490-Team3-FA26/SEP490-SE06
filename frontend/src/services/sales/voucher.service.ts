import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface VoucherPayload {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountValue?: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  isActive?: boolean;
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
  async updateVoucher(id: string, payload: Partial<VoucherPayload>) {
    const res = await api.put(API_ENDPOINTS.VOUCHERS.UPDATE(id), payload);
    return res.data;
  },
  async deleteVoucher(id: string) {
    const res = await api.delete(API_ENDPOINTS.VOUCHERS.DELETE(id));
    return res.data;
  },
  async validateVoucher(code: string, subtotal: number) {
    const res = await api.post(API_ENDPOINTS.VOUCHERS.VALIDATE, { code, subtotal });
    return res.data;
  }
};
