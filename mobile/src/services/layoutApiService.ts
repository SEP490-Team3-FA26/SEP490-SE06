export type LayoutZoneType = 'seats' | 'standing' | 'stage' | 'exit' | 'barrier' | string;

export type LayoutZone = {
  id: string;
  name: string;
  type: LayoutZoneType;
  price?: number;
  capacity?: number; // Tối đa cho standing
  rows?: number;
  seatsPerRow?: number;
  seatMetadata?: {
    totalSeats?: number;
    availableSeats?: number;
    reservedSeats?: number;
    soldSeats?: number;
    blockedSeats?: number;
    lastUpdated?: string;
  };
};

export type EventLayout = {
  _id?: string;
  eventId: string;
  eventName?: string;
  eventDate?: string;
  eventImage?: string;
  eventLocation?: string;
  eventDescription?: string;
  minPrice?: number;
  zones: LayoutZone[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiOk<T> = { success: true; data: T } | { success?: boolean; data?: T };
type ApiErr = { success: false; error?: { code?: string; message?: string }; message?: string };
type ApiResponse<T> = ApiOk<T> & Partial<ApiErr>;

// Ưu tiên gọi thẳng layout-service (cách 1), fallback về API gateway nếu cần
// IMPORTANT: Base URL must NOT include path (e.g. /api/v1/layouts) - only protocol + host
// Wrong: https://ticket-platform.up.railway.app/api/v1/layouts (causes path duplication)
// Right: https://ticket-platform.up.railway.app
function getBaseUrl(): string {
  const raw =
    process.env.EXPO_PUBLIC_LAYOUT_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:4002';
  // Strip any path to prevent duplication (e.g. /api/v1/layouts -> base only)
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return raw;
  }
}
const API_BASE_URL = getBaseUrl();

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('[LayoutAPI] Request', {
    url,
    method: options.method || 'GET',
  });

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const rawText = await response.text();
  let json: ApiResponse<T> | any;

  try {
    json = rawText ? (JSON.parse(rawText) as ApiResponse<T> | any) : {};
  } catch (err) {
    console.error('[LayoutAPI] JSON parse error', {
      url,
      status: response.status,
      rawText: rawText?.slice(0, 300),
      error: (err as Error).message,
    });
    throw new Error(`JSON Parse error: ${(err as Error).message}`);
  }

  console.log('[LayoutAPI] Response', {
    url,
    status: response.status,
    ok: response.ok,
    hasDataField: json && typeof json === 'object' && 'data' in json,
  });

  if (!response.ok) {
    const msg = json?.error?.message || json?.message || `API Error: ${response.status}`;
    throw new Error(msg);
  }

  // Layout-service thường bọc data trong { success, data }
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

export const LayoutAPI = {
  async listLayouts(): Promise<EventLayout[]> {
    return apiRequest<EventLayout[]>('/api/v1/layouts', { method: 'GET' });
  },

  async getLayoutByEvent(eventId: string): Promise<EventLayout> {
    return apiRequest<EventLayout>(`/api/v1/layouts/event/${encodeURIComponent(eventId)}`, { method: 'GET' });
  },
};

