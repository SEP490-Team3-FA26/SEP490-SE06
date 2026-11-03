import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface StockTransferItem {
  medicineId: string;
  medicineName?: string;
  batchNo: string;
  quantity: number;
  receivedQuantity?: number;
  discrepancyQuantity?: number;
  unit: string;
}

export interface StockTransfer {
  _id: string;
  transferCode: string;
  prId: string;
  prCode: string;
  fromBranchId: string;
  toBranchId: string;
  toBranchName: string;
  items: StockTransferItem[];
  status: 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  shippedBy?: string;
  receivedBy?: string;
  shippedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const stockTransferService = {
  async getStockTransfers(status?: string, toBranchId?: string): Promise<StockTransfer[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (toBranchId) params.toBranchId = toBranchId;
    
    const response = await api.get(API_ENDPOINTS.STOCK_TRANSFERS.LIST, { params });
    return response.data;
  },

  async getStockTransferById(id: string): Promise<StockTransfer> {
    const response = await api.get(API_ENDPOINTS.STOCK_TRANSFERS.DETAIL(id));
    return response.data;
  },

  async createStockTransfer(prId: string, fromBranchId: string, shippedBy: string): Promise<any> {
    const response = await api.post(API_ENDPOINTS.STOCK_TRANSFERS.CREATE, { prId, fromBranchId, shippedBy });
    return response.data;
  },

  async directTransfer(payload: any): Promise<any> {
    const response = await api.post(API_ENDPOINTS.STOCK_TRANSFERS.DIRECT, payload);
    return response.data;
  },

  async getRecommendations(params?: any): Promise<any> {
    const response = await api.get(API_ENDPOINTS.STOCK_TRANSFERS.RECOMMEND, { params });
    return response.data;
  },

  async confirmStockTransferReceipt(
    id: string,
    receivedBy: string,
    inspectionItems: { medicineId: string; batchNo: string; actualQuantity: number }[],
    inspectionNote?: string
  ): Promise<any> {
    const response = await api.post(API_ENDPOINTS.STOCK_TRANSFERS.RECEIVE(id), { receivedBy, inspectionItems, inspectionNote });
    return response.data;
  }
};
