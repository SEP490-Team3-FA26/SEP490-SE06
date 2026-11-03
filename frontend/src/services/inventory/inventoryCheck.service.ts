import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface InventoryCheckItem {
  medicineId: string;
  medicineName?: string;
  batchNo: string;
  systemStock: number;
  actualStock: number;
  difference?: number;
  reason?: string;
}

export interface InventoryCheckPayload {
  status: 'DRAFT' | 'COMPLETED';
  items: {
    medicineId: string;
    batchNo: string;
    actualStock: number;
    reason?: string;
  }[];
  performedBy?: string;
  notes?: string;
}

export const inventoryCheckService = {
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
