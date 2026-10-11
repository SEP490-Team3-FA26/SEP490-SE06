import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface MedicineQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  category?: string;
  classification?: string;
  target?: string;
  targetGroup?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  flavour?: string;
  country?: string;
  brand?: string;
  indication?: string;
  branchOrigin?: string;
  branchStockOnly?: boolean;
  _t?: number;
  [key: string]: unknown;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total?: number;
  totalPages?: number;
  pagination?: PaginationInfo;
}

export interface Medicine {
  id: string;
  _id?: string;
  name: string;
  price?: number;
  sku?: string;
  image?: string;
  images?: string[];
  active_ingredient?: string;
  drug_classification?: string;
  type?: string;
  unit?: string;
  supplierId?: string;
  status?: string;
  // --- Chuẩn đồng bộ CSDL Dược Quốc Gia ---
  is_medicine?: boolean;
  national_drug_code?: string;
  national_drug_id?: string;
  national_sync_status?: 'SYNCED' | 'UNSYNCED' | 'NOT_REQUIRED';
  national_synced_at?: string;
  registration_number?: string;
}

export const medicineService = {
  async getMedicines(params: MedicineQueryParams = {}) {
    const response = await api.get<PaginatedResult<Medicine>>(API_ENDPOINTS.MEDICINES.LIST, { params });
    return response.data as PaginatedResult<Medicine>;
  },

  async getBranchMedicines(branchId?: string, params: MedicineQueryParams = {}) {
    if (!branchId || branchId.trim() === '') {
      return this.getMedicines(params);
    }
    try {
      const response = await api.get<PaginatedResult<Medicine>>(API_ENDPOINTS.MEDICINES.BRANCH_MEDICINES(branchId), { params });
      return response.data as PaginatedResult<Medicine>;
    } catch (err) {
      console.warn(`Lỗi lấy kho chi nhánh (${branchId}), chuyển sang danh mục tổng:`, err);
      return this.getMedicines(params);
    }
  },

  async getMedicineById(id: string) {
    const response = await api.get<Medicine>(API_ENDPOINTS.MEDICINES.DETAIL(id));
    return response.data as Medicine;
  },

  async getAlternatives(id: string, branchId: string) {
    const response = await api.get(API_ENDPOINTS.MEDICINES.ALTERNATIVES(id), { params: { branchId } });
    return response.data;
  },

  async updateMedicineStatus(id: string, status: string) {
    const response = await api.patch(`${API_ENDPOINTS.MEDICINES.DETAIL(id)}/status`, { status });
    return response.data;
  },

  async getMedicineStats(branchId?: string) {
    const response = await api.get(API_ENDPOINTS.MEDICINES.STATS, { params: { branchId } });
    return response.data;
  },

  async getExpirationReport(branchId?: string) {
    const response = await api.get(API_ENDPOINTS.MEDICINES.EXPIRATION_ALERTS, { params: { branchId } });
    return response.data;
  },

  async getFilters() {
    try {
      const response = await api.get(API_ENDPOINTS.MEDICINES.FILTERS);
      if (response?.data?.categories) {
        return response.data;
      }
      return {
        categories: ['Kháng sinh', 'Hạ sốt & Giảm đau', 'Tim mạch', 'Tiêu hóa', 'Thực phẩm chức năng', 'Vật tư y tế'],
        classifications: ['PRESCRIPTION', 'NON_PRESCRIPTION', 'SUPPLEMENT']
      };
    } catch {
      return {
        categories: ['Kháng sinh', 'Hạ sốt & Giảm đau', 'Tim mạch', 'Tiêu hóa', 'Thực phẩm chức năng', 'Vật tư y tế'],
        classifications: ['PRESCRIPTION', 'NON_PRESCRIPTION', 'SUPPLEMENT']
      };
    }
  },

  async updatePriceTiers(id: string, priceTiers: { minQuantity: number; price: number }[]) {
    const response = await api.patch(`${API_ENDPOINTS.MEDICINES.DETAIL(id)}/price-tiers`, { priceTiers });
    return response.data;
  },

  async updatePrice(id: string, price: number) {
    const response = await api.patch<{ success?: boolean; message?: string; price?: number }>(`${API_ENDPOINTS.MEDICINES.DETAIL(id)}/price`, { price });
    return response.data;
  },

  async getImportExportReport(startDate?: string, endDate?: string) {
    const response = await api.get(`${API_ENDPOINTS.INVENTORY_TRANSACTIONS.LIST}/report`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  async getLowStockReport(branchId?: string) {
    const response = await api.get(API_ENDPOINTS.MEDICINES.LOW_STOCK_REPORT, { params: { branchId } });
    return response.data;
  },

  async getMedicinesDropdown(branchId?: string) {
    const response = await api.get(API_ENDPOINTS.MEDICINES.DROPDOWN, { params: { branchId } });
    return response.data;
  },

  async handleExpirationAction(payload: {
    batchId: string;
    action: 'DISPOSE' | 'RETURN_SUPPLIER' | 'DISCOUNT';
    quantity: number;
    notes?: string;
    discountPrice?: number;
    performedBy?: string;
  }) {
    const response = await api.post(API_ENDPOINTS.MEDICINES.EXPIRATION_ACTION, payload);
    return response.data;
  },

  async createMedicine(payload: Partial<Medicine> & Record<string, any>) {
    const response = await api.post(API_ENDPOINTS.MEDICINES.CREATE, payload);
    return response.data;
  },

  async updateMedicine(id: string, payload: Partial<Medicine> & Record<string, any>) {
    const response = await api.put(API_ENDPOINTS.MEDICINES.UPDATE(id), payload);
    return response.data;
  },

  async getByBarcode(barcode: string, branchId?: string) {
    const response = await api.get(API_ENDPOINTS.MEDICINES.BARCODE(barcode), {
      params: { branchId }
    });
    return response.data;
  },

  async generateBarcode(id: string) {
    const response = await api.post(API_ENDPOINTS.MEDICINES.GENERATE_BARCODE(id));
    return response.data;
  },

  async getTransactions(params?: { type?: string; limit?: number; page?: number; [key: string]: any }) {
    const response = await api.get(API_ENDPOINTS.INVENTORY_TRANSACTIONS.LIST, { params });
    return response.data;
  },

  async traceBatch(batchNo: string) {
    const response = await api.get(API_ENDPOINTS.INVENTORY_TRANSACTIONS.TRACE_BATCH(batchNo));
    return response.data;
  }
};

