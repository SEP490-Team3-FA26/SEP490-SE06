import api from '../core/api';

export interface PosBarcodePayload {
  sessionId: string;
  barcode: string;
  deviceName?: string;
  branchId?: string;
}

export interface PosBarcodeResponse {
  success: boolean;
  message: string;
  barcode?: string;
  sessionId?: string;
  timestamp?: string;
}

/**
 * Service Quản Lý Cầu Nối Súng Quét Barcode POS (3-Tier Architecture)
 * Phục vụ việc truyền mã vạch thời gian thực từ thiết bị di động / súng quét Wi-Fi tới quầy POS.
 */
export const posScannerService = {
  // Gửi mã vạch tới màn hình POS qua SSE Bridge
  async transmitBarcode(payload: PosBarcodePayload): Promise<PosBarcodeResponse> {
    const response = await api.post('/api/events/pos-scanner-bridge', payload);
    return response.data;
  },
};
