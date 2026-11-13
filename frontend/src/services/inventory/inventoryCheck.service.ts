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
  async getBatches() {
    const response = await api.get<InventoryCheckMedicine[]>(API_ENDPOINTS.INVENTORY_CHECKS.BATCHES);
    return response.data;
  },
  async getChecks() {
    const response = await api.get(API_ENDPOINTS.INVENTORY_CHECKS.LIST);
    return response.data;
  },

  async getCheckById(id: string) {
    const response = await api.get(API_ENDPOINTS.INVENTORY_CHECKS.DETAIL(id));
    return response.data;
  },

  async createCheck(payload: InventoryCheckPayload) {
    const response = await api.post(API_ENDPOINTS.INVENTORY_CHECKS.CREATE, payload);
    return response.data;
  },

  async completeCheck(id: string) {
    const response = await api.post(API_ENDPOINTS.INVENTORY_CHECKS.COMPLETE(id));
    return response.data;
  }
};
