import AsyncStorage from '@react-native-async-storage/async-storage';

export type SeatStatus = 'available' | 'reserved' | 'sold' | 'blocked' | 'occupied';

export type SeatData = {
  _id: string;
  eventId: string;
  layoutId: string;
  zoneId: string;
  row: number;
  seatNumber: number;
  seatLabel: string;
  status: SeatStatus;
  price: number;
  discount?: number;
  isAccessible?: boolean;
  notes?: string;
  bookingId?: string;
  reservedBy?: string;
  reservedAt?: string;
  reservationExpiry?: string;
  soldBy?: string;
  soldAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SeatsResponse = {
  seats: SeatData[];
  total: number;
  page: number;
  limit: number;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

// Base URL must NOT include path - only protocol + host (prevents path duplication on Railway)
function getBaseUrl(): string {
  const raw =
    process.env.EXPO_PUBLIC_LAYOUT_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:4002';
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}
const BASE_URL = getBaseUrl();

async function requestSeats<T>(path: string, params?: Record<string, any>, options?: RequestInit): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  console.log('[SeatAPI] Request', {
    url: url.toString(),
  });

  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method: options?.method || 'GET',
    headers,
    body: options?.body,
  });

  const rawText = await response.text();
  let json: ApiResponse<T> | any;

  try {
    json = rawText ? (JSON.parse(rawText) as ApiResponse<T> | any) : {};
  } catch (err) {
    console.error('[SeatAPI] JSON parse error', {
      url: url.toString(),
      status: response.status,
      rawText: rawText.slice(0, 300),
      error: (err as Error).message,
    });
    throw new Error(`JSON Parse error: ${(err as Error).message}`);
  }

  console.log('[SeatAPI] Response', {
    url: url.toString(),
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const msg = json?.error?.message || json?.message || `Seat API error: ${response.status}`;
    throw new Error(msg);
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

export const SeatAPI = {
  async getSeatsByZone(
    eventId: string,
    zoneId: string,
    options?: {
      status?: SeatStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<SeatsResponse> {
    return requestSeats<SeatsResponse>(`/api/v1/events/${encodeURIComponent(eventId)}/seats`, {
      zoneId,
      ...(options || {}),
    });
  },

  async reserveSeat(eventId: string, zoneId: string, row?: number, seatNumber?: number): Promise<SeatData> {
    return requestSeats<SeatData>(`/api/v1/events/${encodeURIComponent(eventId)}/seats/reserve`, undefined, {
      method: 'POST',
      body: JSON.stringify({ zoneId, row, seatNumber }),
    });
  },

  async releaseReservation(eventId: string, seatId: string): Promise<SeatData> {
    return requestSeats<SeatData>(`/api/v1/events/${encodeURIComponent(eventId)}/seats/${seatId}/reservation`, undefined, {
      method: 'PATCH',
    });
  },

  async getAllSeatsForEvent(eventId: string, zoneIds: string[]): Promise<SeatData[]> {
    try {
      const promises = zoneIds.map((zoneId) =>
        this.getSeatsByZone(eventId, zoneId, { limit: 1000 })
      );
      const results = await Promise.all(promises);
      return results.flatMap((result) => result.seats);
    } catch (error) {
      console.error('Error fetching all seats for event:', error);
      return [];
    }
  },
};

