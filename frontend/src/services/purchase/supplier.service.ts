import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface SupplierData {
  name: string;
  contact_info?: string;
  business_registration_number?: string;
  gdp_certificate_number: string;
  gdp_expiry_date: string;
  status?: string;
}

export interface Supplier extends Partial<SupplierData> {
  _id?: string;
  id?: string;
  code?: string;
  name: string;
}

export const supplierService = {
  async getSuppliers() {
    const response = await api.get(API_ENDPOINTS.SUPPLIERS.LIST);
    return response.data;
  },

  async createSupplier(data: SupplierData) {
    const response = await api.post(API_ENDPOINTS.SUPPLIERS.CREATE, data);
    return response.data;
  },

  async updateSupplier(id: string, data: Partial<SupplierData>) {
    const response = await api.put(API_ENDPOINTS.SUPPLIERS.UPDATE(id), data);
    return response.data;
  },

  async deleteSupplier(id: string) {
    const response = await api.delete(API_ENDPOINTS.SUPPLIERS.DELETE(id));
    return response.data;
  },

  async getCreditSummary() {
    const response = await api.get(API_ENDPOINTS.SUPPLIER_CREDIT.SUMMARY);
    return response.data;
  },

  async getOverdueCredits() {
    const response = await api.get(API_ENDPOINTS.SUPPLIER_CREDIT.OVERDUE);
    return response.data;
  },

  async getSupplierCredit(id: string) {
    const response = await api.get(API_ENDPOINTS.SUPPLIERS.CREDIT(id));
    return response.data;
  },

  async getSupplierAging(id: string) {
    const response = await api.get(API_ENDPOINTS.SUPPLIERS.AGING(id));
    return response.data;
  },

  async updateCreditLimit(id: string, data: { creditLimit: number; paymentTermsDays: number }) {
    const response = await api.put(API_ENDPOINTS.SUPPLIERS.CREDIT_LIMIT(id), data);
    return response.data;
  },

  async recordPayment(id: string, data: { amount: number; paymentMethod: string; notes?: string }) {
    const response = await api.post(API_ENDPOINTS.SUPPLIERS.PAYMENT(id), data);
    return response.data;
  },
};
