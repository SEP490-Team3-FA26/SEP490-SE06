import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface MedicineLocation {
  zone: string;
  rack: string;
  shelf: number;
}

export interface GoodsReceiptItem {
  medicineId: string;
  batchNo: string;
  expDate: string;
  quantity: number;
  unitPrice: number;
  actualQty?: number;
  location?: MedicineLocation;
}

export interface GoodsReceiptPayload {
  poId: string;
  receivedBy: string;
  items: GoodsReceiptItem[];
}

export const goodsReceiptService = {
  async getGoodsReceipts() {
    const response = await api.get(API_ENDPOINTS.GOODS_RECEIPTS.LIST);
    return response.data;
  },

  async createGoodsReceipt(payload: GoodsReceiptPayload) {
    const response = await api.post(API_ENDPOINTS.GOODS_RECEIPTS.CREATE, payload);
    return response.data;
  },

  async updateGoodsReceipt(id: string, payload: any) {
    const response = await api.patch(API_ENDPOINTS.GOODS_RECEIPTS.DETAIL(id), payload);
    return response.data;
  },

  async submitInspection(id: string) {
    const response = await api.post(`${API_ENDPOINTS.GOODS_RECEIPTS.DETAIL(id)}/submit-inspection`);
    return response.data;
  },

  async approveGoodsReceipt(id: string, discrepancyReason?: string) {
    const response = await api.post(API_ENDPOINTS.GOODS_RECEIPTS.APPROVE(id), { discrepancyReason });
    return response.data;
  },

  async rejectGoodsReceipt(id: string, action: "reinspect" | "cancel", reason: string) {
    const response = await api.post(`${API_ENDPOINTS.GOODS_RECEIPTS.DETAIL(id)}/reject`, { action, reason });
    return response.data;
  },

  async createInspectionRecord(grnId: string, inspectedBy: string) {
    const response = await api.post(`${API_ENDPOINTS.GOODS_RECEIPTS.LIST}/inspections`, { grnId, inspectedBy });
    return response.data;
  },

  async verifyInspectionItem(recordId: string, itemId: string, actualQty: number, batchNo?: string, expDate?: string, location?: { zone: string; rack: string; shelf: number }) {
    const response = await api.post(`${API_ENDPOINTS.GOODS_RECEIPTS.LIST}/inspections/verify`, { recordId, itemId, actualQty, batchNo, expDate, location });
    return response.data;
  },

  async submitInspectionReport(recordId: string, notes: string) {
    const response = await api.post(`${API_ENDPOINTS.GOODS_RECEIPTS.LIST}/inspections/submit`, { recordId, notes });
    return response.data;
  },

  async getItemInspection(grnId: string, itemId: string) {
    const response = await api.get(API_ENDPOINTS.GOODS_RECEIPTS.INSPECTION(grnId, itemId));
    return response.data;
  }
};
