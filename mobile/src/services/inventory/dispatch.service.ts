/**
 * dispatch.service.ts - Tầng Service (Tier 1) giao tiếp API Gateway cho luồng Xuất Kho Tổng Mobile.
 * Mọi thao tác Ghi (POST) tuân thủ HTTP 202 Accepted của Kafka Event-Driven và kèm X-Idempotency-Key.
 */

import { ApiService } from '../api.service';
import { DispatchOrder, ToteItem } from '../../types/pharmacy.types';

export interface AsyncAcceptedResult {
  status: string;
  message: string;
  accepted: boolean;
}

/**
 * Tạo khóa chống trùng lặp ngẫu nhiên kết hợp timestamp cho mỗi hành động quét kho
 */
export function generateIdempotencyKey(prefix = 'mob'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

async function requestJson<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = ApiService.baseUrl;
  const headers: Record<string, string> = {
    ...ApiService.getAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const errMsg = payload?.message || payload?.error || `Lỗi máy chủ (${res.status})`;
    throw new Error(errMsg);
  }
  return payload as T;
}

export const DispatchMobileService = {
  async getDispatchOrders(params?: {
    status?: string;
    type?: string;
    isStale?: boolean;
    hasControlledDrugs?: boolean;
    search?: string;
  }): Promise<DispatchOrder[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.isStale !== undefined) query.set('isStale', String(params.isStale));
    if (params?.hasControlledDrugs !== undefined) {
      query.set('hasControlledDrugs', String(params.hasControlledDrugs));
    }
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    const res: any = await requestJson(`/api/dispatch-orders${qs ? `?${qs}` : ''}`);
    const list = Array.isArray(res) ? res : res?.data || [];
    return Array.isArray(list) ? list : [];
  },

  async getDispatchOrderById(id: string): Promise<DispatchOrder> {
    if (!id) throw new Error('Thiếu mã phiếu xuất kho.');
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(id)}`);
    return (res?.data || res) as DispatchOrder;
  },

  async createDispatchOrder(dto: {
    type: 'TRANSFER' | 'DISPOSE';
    referenceId?: string;
    toBranchId?: string;
    toBranchName?: string;
    disposalReportCode?: string;
    items?: Array<{ medicineId: string; quantity: number; batchId?: string; batchNo?: string }>;
    notes?: string;
  }): Promise<AsyncAcceptedResult> {
    const res: any = await requestJson('/api/dispatch-orders', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return { ...res, accepted: true };
  },

  /**
   * Lập phiếu xuất kho đồng bộ kèm kiểm tra tồn khả dụng ngay lập tức tại Kho Tổng
   */
  async createDispatchOrderSync(dto: {
    type: 'TRANSFER' | 'DISPOSE';
    referenceId?: string;
    toBranchId?: string;
    toBranchName?: string;
    disposalReportCode?: string;
    items?: Array<{ medicineId: string; quantity: number; batchId?: string; batchNo?: string }>;
    notes?: string;
  }): Promise<{ success?: boolean; message?: string; data?: DispatchOrder }> {
    return requestJson('/api/dispatch-orders/sync', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async approveDispatchOrder(id: string, note?: string): Promise<AsyncAcceptedResult> {
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    });
    return { ...res, accepted: true };
  },

  async rejectDispatchOrder(id: string, reason: string): Promise<AsyncAcceptedResult> {
    if (!reason || !reason.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối phiếu.');
    }
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() }),
    });
    return { ...res, accepted: true };
  },

  async pickItem(
    orderId: string,
    body: {
      lineId: string;
      scannedBinCode: string;
      toteCode: string;
      quantity: number;
      actualBatchId?: string;
      overrideReason?: string;
      gs1Scanned?: boolean;
      manualReason?: string;
      rawBarcodeScanned?: string;
      expectedVersion?: number;
    },
    idempotencyKey: string = generateIdempotencyKey('pick'),
  ): Promise<AsyncAcceptedResult> {
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(orderId)}/pick-item`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ ...body, idempotencyKey }),
    });
    return { ...res, accepted: true };
  },

  async returnItem(
    orderId: string,
    body: {
      pickId: string;
      quantity: number;
      outcome: 'RESTOCK' | 'DAMAGED' | 'QUARANTINE';
      targetBinCode?: string;
      reason?: string;
    },
    idempotencyKey: string = generateIdempotencyKey('ret'),
  ): Promise<AsyncAcceptedResult> {
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(orderId)}/return-item`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ ...body, idempotencyKey }),
    });
    return { ...res, accepted: true };
  },

  async markShortage(
    orderId: string,
    body: { lineId: string; reason?: string },
  ): Promise<AsyncAcceptedResult> {
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(orderId)}/shortage`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { ...res, accepted: true };
  },

  async stageDispatchOrder(orderId: string, toteCode: string): Promise<AsyncAcceptedResult> {
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(orderId)}/stage`, {
      method: 'POST',
      body: JSON.stringify({ toteCode }),
    });
    return { ...res, accepted: true };
  },

  async confirmDispatch(
    orderId: string,
    handoverRecipient: { driverName: string; vehiclePlate?: string; carrierNote?: string },
    idempotencyKey: string = generateIdempotencyKey('disp'),
  ): Promise<AsyncAcceptedResult> {
    if (!handoverRecipient?.driverName?.trim()) {
      throw new Error('Bắt buộc nhập tên tài xế / người nhận bàn giao.');
    }
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(orderId)}/dispatch`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ handoverRecipient, idempotencyKey }),
    });
    return { ...res, accepted: true };
  },

  async cancelDispatchOrder(orderId: string, reason?: string): Promise<AsyncAcceptedResult> {
    const res: any = await requestJson(`/api/dispatch-orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || '' }),
    });
    return { ...res, accepted: true };
  },

  async getTotes(status?: 'AVAILABLE' | 'IN_USE'): Promise<ToteItem[]> {
    const qs = status ? `?status=${status}` : '';
    const res: any = await requestJson(`/api/totes${qs}`);
    const list = Array.isArray(res) ? res : res?.data || [];
    return Array.isArray(list) ? list : [];
  },
};
