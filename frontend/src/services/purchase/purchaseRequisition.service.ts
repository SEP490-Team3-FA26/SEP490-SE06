import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface PurchaseRequisitionItem {
  medicineId: string;
  requestedQuantity: number;
  unit: string;
}

export interface PurchaseRequisitionPayload {
  reason: string;
  items: PurchaseRequisitionItem[];
  branchName: string;
  branchId?: string;
  isUrgent?: boolean;
  totalEstimatedCost?: number;
  isManagerResponsible?: boolean;
  isAiGenerated?: boolean;
  aiConfidence?: number;
  aiReason?: string;
  aiAnalysisVersion?: string;
}

export const purchaseRequisitionService = {
  async getPurchaseRequisitions(status?: string) {
    const response = await api.get(API_ENDPOINTS.PURCHASE_REQUISITIONS.LIST, {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  async createPurchaseRequisition(payload: PurchaseRequisitionPayload) {
    const response = await api.post(API_ENDPOINTS.PURCHASE_REQUISITIONS.CREATE, payload);
    return response.data;
  },

  async consolidatePurchaseRequisitions(prIds: string[]) {
    const response = await api.post(`${API_ENDPOINTS.PURCHASE_REQUISITIONS.LIST}/consolidate`, { prIds });
    return response.data;
  },

  async approvePurchaseRequisition(prIds: string[], action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const response = await api.post(API_ENDPOINTS.PURCHASE_REQUISITIONS.APPROVE(prIds[0] || ''), {
      prIds,
      action,
      rejectionReason,
    });
    return response.data;
  },

  async processUrgent(payload: { prId: string; action: 'APPROVE' | 'REJECT' | 'CREATE_EMERGENCY_TRANSFER' | 'CREATE_URGENT_PO' | string; rejectionReason?: string }) {
    const response = await api.post(API_ENDPOINTS.PURCHASE_REQUISITIONS.PROCESS_URGENT, payload);
    return response.data;
  },

  async updatePurchaseRequisitionStatus(id: string, status: string, extraData?: any) {
    const response = await api.patch(`${API_ENDPOINTS.PURCHASE_REQUISITIONS.DETAIL(id)}/status`, { status, ...extraData });
    return response.data;
  },

  async updatePurchaseRequisitionsStatus(prIds: string[], status: string, extraData?: any) {
    const response = await api.patch(`${API_ENDPOINTS.PURCHASE_REQUISITIONS.LIST}/status-bulk`, { prIds, status, ...extraData });
    return response.data;
  },

  async updatePurchaseRequisition(id: string, payload: any) {
    const response = await api.patch(API_ENDPOINTS.PURCHASE_REQUISITIONS.DETAIL(id), payload);
    return response.data;
  },

  async deletePurchaseRequisition(id: string) {
    const response = await api.delete(API_ENDPOINTS.PURCHASE_REQUISITIONS.DETAIL(id));
    return response.data;
  }
};
