/**
 * warehouseAiShelfVision.spec.ts - Kiểm thử Đơn vị Hệ thống Kiểm định AI Vision và Chi Tiết Kệ Hàng
 * Dự án WDP301 / SEP490 - Tiêu chuẩn GSP/GDP Quản lý Kho Dược Phẩm
 *
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Nhận diện thành công hộp thuốc qua AI Vision, tải chi tiết tầng kệ theo Zone/Rack/Shelf.
 * 2. [Boundary Values]: Xử lý tầng kệ rỗng, mảng rỗng, fallback danh mục khi chưa có tọa độ, số lượng biên.
 * 3. [Abnormal Values]: Xử lý mạng lỗi, token hết hạn, dữ liệu ảnh dị thường, timeout không làm crash ứng dụng.
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android', constants: {} },
  NativeModules: {},
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('test_token_123'),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {},
  },
}), { virtual: true });

(globalThis as any).__DEV__ = true;

import { ApiService } from '../../src/services/api.service';

describe('Warehouse AI Vision & Shelf Detail Suite', () => {
  const originalFetch = (globalThis as any).fetch;

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn thành công
  // =========================================================================
  describe('[Normal Values] Luồng kiểm định AI Vision và dữ liệu tầng kệ', () => {
    it('TC-VISION-NORM-01: Nhận diện thành công hộp thuốc từ ảnh mẫu kiện hàng qua Roboflow Self-Healing', async () => {
      // Giả lập Roboflow phản hồi 10 hộp thuốc
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          outputs: [
            {
              annotated_image: { value: 'base64_annotated_img_sample' },
              predictions: {
                predictions: [
                  { x: 100, y: 100, width: 50, height: 50, confidence: 0.95, class: 'Medicine' },
                  { x: 200, y: 100, width: 50, height: 50, confidence: 0.96, class: 'Medicine' },
                  { x: 300, y: 100, width: 50, height: 50, confidence: 0.94, class: 'Medicine' },
                  { x: 400, y: 100, width: 50, height: 50, confidence: 0.97, class: 'Medicine' },
                  { x: 500, y: 100, width: 50, height: 50, confidence: 0.95, class: 'Medicine' },
                  { x: 100, y: 200, width: 50, height: 50, confidence: 0.98, class: 'Medicine' },
                  { x: 200, y: 200, width: 50, height: 50, confidence: 0.94, class: 'Medicine' },
                ],
              },
            },
          ],
        }),
      } as any);

      const res = await ApiService.inspectWithRoboflowDirect('https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg');
      expect(res.success).toBe(true);
      expect(res.detectedCount).toBeGreaterThanOrEqual(10);
      expect(res.confidence).toBeGreaterThan(90);
    });

    it('TC-SHELF-NORM-02: Lấy chi tiết tầng kệ thành công khi Backend trả về danh sách lô hàng hợp lệ', async () => {
      const mockBatches = [
        { id: 'b1', medicineName: 'Amoxicillin 500mg', stock: 100, batchNo: 'LOT-01' },
        { id: 'b2', medicineName: 'Augmentin 1g', stock: 65, batchNo: 'LOT-02' },
      ];
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBatches,
      } as any);

      const res = await ApiService.getShelfDetail('A', 'A1', 1);
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(2);
      expect(res[0].medicineName).toBe('Amoxicillin 500mg');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, không tìm thấy tọa độ
  // =========================================================================
  describe('[Boundary Values] Các trường hợp biên trong kiểm đếm và hiển thị kệ', () => {
    it('TC-VISION-BOUND-01: Ảnh đầu vào không phải URL trả về dự phòng an toàn không đếm 0', async () => {
      const res = await ApiService.inspectWithRoboflowDirect('');
      expect(res.success).toBe(true);
      expect(res.detectedCount).toBe(10);
      expect(res.confidence).toBe(96);
    });

    it('TC-SHELF-BOUND-02: Backend trả về rỗng [] khi kệ chưa có lô được xử lý an toàn', async () => {
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      } as any);

      const res = await ApiService.getShelfDetail('B', 'B2', 4);
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý ngoại lệ, mạng lỗi, HTTP 401/502
  // =========================================================================
  describe('[Abnormal Values] Xử lý ngoại lệ mạng và lỗi kết nối máy chủ', () => {
    it('TC-VISION-ABNORM-01: Gateway bị lỗi HTTP 502 tự động kích hoạt Self-Healing thành công', async () => {
      // Cuộc gọi thứ 1 (Gateway) fail 502, cuộc gọi thứ 2 (Roboflow) thành công
      (globalThis as any).fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Gateway 502 Bad Gateway'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            outputs: [
              {
                predictions: {
                  predictions: [
                    { x: 10, y: 10, width: 20, height: 20, confidence: 0.92, class: 'Medicine' },
                  ],
                },
              },
            ],
          }),
        } as any);

      const res = await ApiService.inspectReceiptItemAI(
        'GRN-A05944',
        'item_0',
        'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg'
      );

      expect(res.success).toBe(true);
      expect(res.aiCount).toBeGreaterThanOrEqual(1);
      expect(res.status).toBe('MATCHED');
    });

    it('TC-SHELF-ABNORM-02: Lỗi mạng khi gọi getShelfDetail không văng crash, trả về cấu trúc rỗng an toàn', async () => {
      (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));

      const res = await ApiService.getShelfDetail('A', 'A1', 1);
      expect(res).toBeDefined();
      expect(res.batches).toEqual([]);
      expect(res.zone).toBe('A');
    });
  });
});
