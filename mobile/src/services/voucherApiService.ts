import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnvService } from './env.service';

function getBaseUrl(): string {
  return EnvService.getApiBaseUrl();
}
const API_BASE_URL = getBaseUrl();

export interface Voucher {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxUses?: number;
  usedCount?: number;
  minOrderValue?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface CreateVoucherInput {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxUses?: number;
  minOrderValue?: number;
  endDate?: string;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await AsyncStorage.getItem('auth_token');
  const userId = await AsyncStorage.getItem('user_data').then(d => d ? JSON.parse(d).id : null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (userId) headers['x-user-id'] = userId;

  const response = await fetch(url, { ...options, headers });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(json.message || `API Error: ${response.status}`);
  return (Array.isArray(json) ? json : (json.data ?? json)) as T;
}

export const VoucherAPI = {
  async getOrganizerVouchers(): Promise<Voucher[]> {
    return apiRequest<Voucher[]>('/api/vouchers');
  },

  async createVoucher(data: CreateVoucherInput): Promise<Voucher> {
    return apiRequest<Voucher>('/api/vouchers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteVoucher(id: string): Promise<void> {
    return apiRequest<void>(`/api/vouchers/${id}`, {
      method: 'DELETE',
    });
  },
};

