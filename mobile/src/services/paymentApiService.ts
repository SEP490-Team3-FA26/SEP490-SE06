import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL must NOT include path - only protocol + host (prevents path duplication on Railway)
function getBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}
const API_BASE_URL = getBaseUrl();

export type PaymentCreateItem = {
  zoneName: string;
  seatId?: string;
  price: number;
  quantity: number;
};

export type CreatePaymentInput = {
  userId: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  items: PaymentCreateItem[];
  channel?: 'mobile' | 'jsp';
  organizerBank?: {
    bankAccountName: string;
    bankAccountNumber: string;
    bankName?: string;
    bankCode?: string;
  };
  voucherCode?: string;
};

export type CreatePaymentResult = {
  orderId: string;
  orderCode: number;
  totalAmount: number;
  commissionAmount: number;
  organizerAmount: number;
  checkoutUrl: string;
  qrCode?: string;
  paymentLinkId?: string;
};

export type VerifyPaymentResult = {
  status: string;
  payosStatus?: string;
  order?: any;
};

export type Order = any;

type ApiResponse<T> = { success: boolean; data: T; message?: string };

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[PaymentAPI] Request', { url, method: options.method || 'GET' });

  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const rawText = await response.text();
  let json: ApiResponse<T> | any;

  try {
    json = rawText ? (JSON.parse(rawText) as ApiResponse<T> | any) : {};
  } catch (err) {
    console.error('[PaymentAPI] JSON parse error', {
      url,
      status: response.status,
      rawText: rawText?.slice(0, 300),
      error: (err as Error).message,
    });
    throw new Error(`JSON Parse error: ${(err as Error).message}`);
  }

  console.log('[PaymentAPI] Response', {
    url,
    status: response.status,
    ok: response.ok,
    hasDataField: json && typeof json === 'object' && 'data' in json,
  });

  if (!response.ok) {
    throw new Error(json?.message || json?.error?.message || `API Error: ${response.status}`);
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

export const PaymentAPI = {
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return apiRequest<CreatePaymentResult>('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        channel: input.channel || 'mobile',
      }),
    });
  },

  async verifyPayment(orderCode: number): Promise<VerifyPaymentResult> {
    return apiRequest<VerifyPaymentResult>(`/api/payments/verify/${encodeURIComponent(String(orderCode))}`, {
      method: 'GET',
    });
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    return apiRequest<Order[]>(`/api/payments/user/${encodeURIComponent(userId)}`, { method: 'GET' });
  },

  async getOrder(orderCode: number): Promise<Order> {
    return apiRequest<Order>(`/api/payments/order/${encodeURIComponent(String(orderCode))}`, { method: 'GET' });
  },

  async cancelPayment(orderCode: number | string): Promise<any> {
    return apiRequest<any>(`/api/payments/cancel/${encodeURIComponent(String(orderCode))}`, { method: 'POST' });
  },
};

