import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface PricingQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
}

export interface SavePricingData {
  isActive?: boolean;
  retailPrice?: number;
  wholesalePrice?: number;
  wholesaleTiers?: { minQuantity: number; price: number }[];
}

export const pricingService = {
  async getBranchPrices(branchId: string, params: PricingQueryParams = {}) {
    const response = await api.get(API_ENDPOINTS.PRICING.BY_BRANCH(branchId), { params });
    return response.data;
  },

  async saveBranchPrice(branchId: string, medicineId: string, data: SavePricingData) {
    const response = await api.put(API_ENDPOINTS.PRICING.UPDATE_PRICE(branchId, medicineId), data);
    return response.data;
  },

  async deleteBranchPrice(branchId: string, medicineId: string) {
    const response = await api.delete(API_ENDPOINTS.PRICING.UPDATE_PRICE(branchId, medicineId));
    return response.data;
  },

  async copyPrices(fromBranchId: string, toBranchId: string) {
    const response = await api.post(API_ENDPOINTS.PRICING.COPY, { fromBranchId, toBranchId });
    return response.data;
  },

  async syncAllPrices(fromBranchId: string) {
    const response = await api.post(API_ENDPOINTS.PRICING.SYNC_ALL, { fromBranchId });
    return response.data;
  },
};
