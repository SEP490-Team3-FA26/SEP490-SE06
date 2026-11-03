import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface PurchaseOrderItem {
  medicineId: string;
  quantity: number;
  price: number;
}

export interface PurchaseOrderPayload {
  supplierId: string;
  items: PurchaseOrderItem[];
  deliveryDate?: string;
  remarks?: string;
  [key: string]: any;
}

export const purchaseOrderService = {
  async getPurchaseOrders(status?: string) {
    const response = await api.get(API_ENDPOINTS.PURCHASE_ORDERS.LIST, {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  async createPurchaseOrder(payload: PurchaseOrderPayload) {
    const response = await api.post(API_ENDPOINTS.PURCHASE_ORDERS.CREATE, payload);
    return response.data;
  },

  async autoRoute(payload: any) {
    const response = await api.post(API_ENDPOINTS.PURCHASE_ORDERS.AUTO_ROUTE, payload);
    return response.data;
  },

  async approveAndPay(payload: any) {
    const response = await api.post(API_ENDPOINTS.PURCHASE_ORDERS.APPROVE_PAY, payload);
    return response.data;
  },

  async rejectDelivery(payload: any) {
    const response = await api.post(API_ENDPOINTS.PURCHASE_ORDERS.REJECT_DELIVERY, payload);
    return response.data;
  }
};
