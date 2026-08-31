import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL giống AuthAPI
function getBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

const API_BASE_URL = getBaseUrl();

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.warn(`[API FAILED PARSE] Endpoint: ${endpoint}, Status: ${response.status}, Output:`, text.substring(0, 300));
    throw new Error(`Server trả về response không phải JSON (code ${response.status}) - ${text.substring(0, 50)}`);
  }

  if (!response.ok) {
    throw new Error(data?.message || `API Error: ${response.status}`);
  }

  return data as T;
}

async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Bạn chưa đăng nhập');
  }

  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export interface ScanTicketResponse {
  success: boolean;
  message: string;
  data?: {
    ticketCode: string;
    status: string;
    checkedInAt?: string;
    event?: {
      id: string;
      name: string;
      zoneName?: string;
      seatLabel?: string;
    };
    owner?: {
      id: string;
    };
  };
}

export interface EventSummaryResponse {
  success: boolean;
  data: {
    total: number;
    checkedIn: number;
    remaining: number;
  };
}

export interface RecentScanLog {
  ticketCode: string;
  eventId?: string;
  staffId: string;
  result: string;
  reason?: string;
  createdAt: string;
}

export interface RecentScansResponse {
  success: boolean;
  data: RecentScanLog[];
}

export const CheckinAPI = {
  async scanTicket(ticketCode: string): Promise<ScanTicketResponse> {
    return authenticatedRequest<ScanTicketResponse>('/api/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ ticketCode }),
    });
  },

  async getEventSummary(eventId: string): Promise<EventSummaryResponse> {
    return authenticatedRequest<EventSummaryResponse>(`/api/checkin/event/${eventId}/summary`, {
      method: 'GET',
    });
  },

  async getRecentScans(eventId: string, limit: number = 10): Promise<RecentScansResponse> {
    const query = `?limit=${limit}`;
    return authenticatedRequest<RecentScansResponse>(`/api/checkin/event/${eventId}/recent${query}`, {
      method: 'GET',
    });
  },

  async requestAssignment(eventId: string): Promise<{ success: boolean; message: string }> {
    return authenticatedRequest<{ success: boolean; message: string }>('/api/checkin/staff/request-assignment', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  },

  async getStaffRequestStatus(eventId: string): Promise<any> {
    return authenticatedRequest<any>(`/api/checkin/staff/request-status/${eventId}`, {
      method: 'GET',
    });
  },

  async getPendingRequests(): Promise<any> {
    return authenticatedRequest<any>('/api/checkin/organizer/pending-requests', {
      method: 'GET',
    });
  },

  async approveRequest(requestId: string): Promise<any> {
    return authenticatedRequest<any>(`/api/checkin/organizer/approve-request/${requestId}`, {
      method: 'POST',
    });
  },

  async rejectRequest(requestId: string): Promise<any> {
    return authenticatedRequest<any>(`/api/checkin/organizer/reject-request/${requestId}`, {
      method: 'POST',
    });
  },

  async getEventStaffs(eventId: string): Promise<any> {
    return authenticatedRequest<any>(`/api/checkin/organizer/event/${eventId}/staff`, {
      method: 'GET',
    });
  },
};

