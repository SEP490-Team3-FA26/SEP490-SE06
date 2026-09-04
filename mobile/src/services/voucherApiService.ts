import AsyncStorage from '@react-native-async-storage/async-storage';

function getBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}
const API_BASE_URL = getBaseUrl();

export interface Voucher {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'expired';
  eventId?: string;
  organizerId: string;
}

export interface CreateVoucherInput {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  endDate?: string;
  eventId?: string;
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
  const json = await response.json();

  if (!response.ok) throw new Error(json.message || 'API Error');
  return json.data;
}

export const VoucherAPI = {
  async getOrganizerVouchers(): Promise<Voucher[]> {
    return apiRequest<Voucher[]>('/api/payments/organizer/vouchers');
  },

  async createVoucher(data: CreateVoucherInput): Promise<Voucher> {
    return apiRequest<Voucher>('/api/payments/organizer/vouchers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteVoucher(id: string): Promise<void> {
    return apiRequest<void>(`/api/payments/organizer/vouchers/${id}`, {
      method: 'DELETE',
    });
  },
};
