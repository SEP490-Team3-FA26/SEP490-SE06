import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface OrderItem {
  medicineId: string;
  name?: string;
  quantity: number;
  price?: number;
  unit?: string;
}

export interface OrderPayload {
  patientName?: string;
  patientPhone?: string;
  totalAmount?: number;
  items: OrderItem[];
  paymentMethod?: string;
  soldBy?: string;
  shippingAddress?: string;
  notes?: string;
  voucherCode?: string;
  userId?: string;
  // AI-beslissingsondersteuning en auditspoor
  isAiAssisted?: boolean;
  aiAuditCode?: string;
  consultationId?: string;
  pharmacistApprovedBy?: string;
  role?: string;
  customerRole?: string;
  isGuest?: boolean;
}

export interface SalePayload {
  type: 'RETAIL' | 'PRESCRIPTION' | 'WHOLESALE';
  prescriptionCode?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  hospitalName?: string;
  hospitalCode?: string;
  items: {
    medicineId: string;
    quantity: number;
  }[];
  paymentMethod: string;
  soldBy: string;
  remarks?: string;
  role?: string;
  customerRole?: string;
  patientRole?: string;
  isGuest?: boolean;
}

export interface PayOSLinkPayload {
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  totalAmount: number;
  paymentMethod?: 'QR_PAY';
  voucherCode?: string;
  redeemedPoints?: number;
  items: {
    medicineId: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
  }[];
  userId?: string;
  role?: string;
  customerRole?: string;
  patientRole?: string;
  isGuest?: boolean;
  // AI-beslissingsondersteuning en auditspoor
  isAiAssisted?: boolean;
  aiAuditCode?: string;
  consultationId?: string;
  pharmacistApprovedBy?: string;
}

export const orderService = {
  async createOrder(payload: OrderPayload) {
    const response = await api.post(API_ENDPOINTS.ORDERS.CREATE, payload);
    return response.data;
  },

  async checkOrderStatus(orderCode: number | string) {
    const response = await api.get(API_ENDPOINTS.ORDERS.CHECK(orderCode));
    return response.data;
  },

  async getMyOrders(phone?: string) {
    const response = await api.get(API_ENDPOINTS.ORDERS.MY_ORDERS, {
      params: phone ? { phone } : undefined,
    });
    return response.data;
  },

  async getOrders(params?: any) {
    const response = await api.get(API_ENDPOINTS.ORDERS.LIST, { params });
    return response.data;
  },

  async createPayOSLink(payload: PayOSLinkPayload) {
    const response = await api.post(API_ENDPOINTS.ORDERS.PAYOS_LINK, payload);
    return response.data;
  },

  async createSale(payload: SalePayload) {
    const response = await api.post(API_ENDPOINTS.SALES.POS_CHECKOUT, payload);
    return response.data;
  },

  async listSalesOrders(search?: string, type?: string) {
    const response = await api.get(API_ENDPOINTS.SALES.POS_CHECKOUT, { params: { search, type } });
    return response.data;
  },

  async getSaleById(id: string) {
    const response = await api.get(API_ENDPOINTS.SALES.DETAIL(id));
    return response.data;
  },

  async processReturn(payload: any) {
    const response = await api.post(API_ENDPOINTS.SALES.RETURN, payload);
    return response.data;
  },

  async processExchange(payload: any) {
    const response = await api.post(API_ENDPOINTS.SALES.EXCHANGE, payload);
    return response.data;
  }
};
