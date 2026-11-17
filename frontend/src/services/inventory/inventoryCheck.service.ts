import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface InventoryCheckItem {
  batchId: string;
  medicineId: string;
  medicineName?: string;
  batchNo: string;
  systemStock: number;
  actualStock: number;
  difference?: number;
  reason?: string;
}

export interface InventoryCheckPayload {
  items: {
    batchId: string;
    medicineId: string;
    batchNo: string;
    actualStock: number;
    reason?: string;
  }[];
  notes?: string;
}

export interface InventoryCheckMedicine {
  id: string;
  name: string;
  unit: string;
  image?: string;
  category?: string;
  price?: number;
  registrationNumber?: string;
  barcode?: string;
  batches: { id: string; batchNo: string; stock: number; expDate: string; status: string }[];
}

export const inventoryCheckService = {
  async getBatches(branchId?: string) {
    const params = branchId ? { branchId } : {};
    const response = await api.get<InventoryCheckMedicine[]>(API_ENDPOINTS.INVENTORY_CHECKS.BATCHES, { params });
    return response.data;
  },
  async getChecks(branchId?: string) {
    const params = branchId ? { branchId } : {};
    const response = await api.get(API_ENDPOINTS.INVENTORY_CHECKS.LIST, { params });
    return response.data;
  },

  async getCheckById(id: string, branchId?: string) {
    const params = branchId ? { branchId } : {};
    const response = await api.get(API_ENDPOINTS.INVENTORY_CHECKS.DETAIL(id), { params });
    return response.data;
  },

  async createCheck(payload: InventoryCheckPayload, branchId?: string) {
    const params = branchId ? { branchId } : {};
    const response = await api.post(API_ENDPOINTS.INVENTORY_CHECKS.CREATE, payload, { params });
    return response.data;
  },

  async completeCheck(id: string, branchId?: string) {
    const params = branchId ? { branchId } : {};
    const response = await api.post(API_ENDPOINTS.INVENTORY_CHECKS.COMPLETE(id), {}, { params });
    return response.data;
  }
};
