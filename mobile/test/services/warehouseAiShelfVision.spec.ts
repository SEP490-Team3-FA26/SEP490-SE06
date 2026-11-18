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
      // 7 khung tách biệt -> đếm chính xác đúng 7 hộp (tuyệt đối không ép thành 10)
      expect(res.detectedCount).toBe(7);
      expect(res.confidence).toBeGreaterThan(90);
    });

    it('TC-VISION-NORM-02: Khử trùng khung chồng lấn (NMS) — 6 hộp bị 30 khung đè nhau trả về chính xác 6 hộp', async () => {
      const centers = [
        { x: 200, y: 200 },
        { x: 600, y: 200 },
        { x: 200, y: 400 },
        { x: 600, y: 400 },
        { x: 200, y: 600 },
        { x: 600, y: 600 },
      ];
      const dupPredictions = centers.flatMap((c) => [
        { x: c.x, y: c.y, width: 250, height: 120, confidence: 0.94, class: 'Medicine' },
        { x: c.x + 3, y: c.y - 2, width: 248, height: 118, confidence: 0.89, class: 'medicine box' },
        { x: c.x - 2, y: c.y + 3, width: 252, height: 122, confidence: 0.85, class: 'box' },
        { x: c.x + 1, y: c.y + 1, width: 246, height: 119, confidence: 0.82, class: 'package' },
        { x: c.x - 1, y: c.y - 1, width: 249, height: 121, confidence: 0.79, class: 'carton' },
      ]);

      let capturedBody: any = null;
      (globalThis as any).fetch = jest.fn().mockImplementation((_url: string, opts: any) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            outputs: [{ predictions: { predictions: dupPredictions } }],
          }),
        });
      });

      const res = await ApiService.inspectWithRoboflowDirect('data:image/jpeg;base64,sample_6_boxes_photo');
      expect(res.success).toBe(true);
      expect(capturedBody.inputs.classes).toEqual(['Medicine']);
      expect(res.detectedCount).toBe(6);
    });

    it('TC-VISION-NORM-03: Nhận diện thành công ảnh chụp kiện hàng dạng Base64 qua Roboflow Direct', async () => {
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          outputs: [
            {
              predictions: {
                predictions: [
                  { x: 10, y: 10, width: 20, height: 20, confidence: 0.96, class: 'Medicine' },
                ],
              },
            },
          ],
        }),
      } as any);

      const res = await ApiService.inspectWithRoboflowDirect('data:image/jpeg;base64,sample_base64_photo_bytes');
      expect(res.success).toBe(true);
      expect(res.detectedCount).toBeGreaterThanOrEqual(1);
      expect(res.confidence).toBeGreaterThanOrEqual(95);
    });

    it('TC-VISION-NORM-04: inspectReceiptItemAI gửi JSON Content-Type khi có ảnh Base64 thay vì FormData', async () => {
      let capturedHeaders: any = null;
      let capturedBody: any = null;
      (globalThis as any).fetch = jest.fn().mockImplementation((url: string, opts: any) => {
        capturedHeaders = opts?.headers;
        capturedBody = opts?.body;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, aiCount: 10, status: 'MATCHED' }),
        });
      });

      const res = await ApiService.inspectReceiptItemAI(
        'GRN-101',
        'item_0',
        'data:image/jpeg;base64,dGVzdF9pbWFnZQ=='
      );

      expect(res.success).toBe(true);
      expect(capturedHeaders['Content-Type']).toBe('application/json');
      expect(JSON.parse(capturedBody).imageBase64).toBe('data:image/jpeg;base64,dGVzdF9pbWFnZQ==');
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

    it('TC-PO-NORM-01: getPurchaseOrderById tự động lấy chi tiết PO thành công khi có mã hợp lệ', async () => {
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          _id: '6af6f744caefa79c40a05944',
          poCode: 'PO-A05944',
          status: 'RECEIVING',
          items: [{ medicineId: 'm1', medicineName: 'Homtamin Ginseng', quantity: 274 }],
        }),
      } as any);

      const po = await ApiService.getPurchaseOrderById('6af6f744caefa79c40a05944');
      expect(po).toBeDefined();
      expect(po._id).toBe('6af6f744caefa79c40a05944');
      expect(po.items.length).toBe(1);
    });

    it('TC-PO-NORM-02: getPurchaseOrders tự động truyền tham số lọc trạng thái chờ nhập và trần limit 100', async () => {
      let queryUrl = '';
      (globalThis as any).fetch = jest.fn().mockImplementation((url: string) => {
        queryUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { _id: '6af6f744caefa79c40a05944', poCode: 'PO-A05944', status: 'RECEIVING' },
          ],
        });
      });

      const pos = await ApiService.getPurchaseOrders();
      expect(Array.isArray(pos)).toBe(true);
      expect(pos.length).toBe(1);
      expect(queryUrl).toContain('status=');
      expect(queryUrl).toContain('limit=100');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, không tìm thấy tọa độ
  // =========================================================================
  describe('[Boundary Values] Các trường hợp biên trong kiểm đếm và hiển thị kệ', () => {
    it('TC-VISION-BOUND-01: Ảnh đầu vào rỗng không bịa số lượng giả (Zero Fake Data), trả về success = false & detectedCount = 0', async () => {
      const res = await ApiService.inspectWithRoboflowDirect('');
      expect(res.success).toBe(false);
      expect(res.detectedCount).toBe(0);
      expect(res.confidence).toBe(0);
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

    it('TC-PO-BOUND-02: getPurchaseOrderById bóc tách chính xác query param ?poId= khi quét QR URL', async () => {
      let requestedUrl = '';
      (globalThis as any).fetch = jest.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ _id: '6af6f744caefa79c40a05944', poCode: 'PO-A05944' }),
        });
      });

      const po = await ApiService.getPurchaseOrderById('https://abcpharmacy.store/warehouse?poId=6af6f744caefa79c40a05944');
      expect(po).toBeDefined();
      expect(requestedUrl).toContain('6af6f744caefa79c40a05944');
    });

    it('TC-VISION-BOUND-03: inspectReceiptItemAI với receiptId hoặc itemId rỗng vẫn gửi request an toàn', async () => {
      let callUrl = '';
      (globalThis as any).fetch = jest.fn().mockImplementation((url: string) => {
        callUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, aiCount: 10, confidence: 96 }),
        });
      });

      const res = await ApiService.inspectReceiptItemAI('', '', 'https://example.com/test.jpg');
      expect(res.success).toBe(true);
      expect(callUrl).toContain('/api/goods-receipts/default/items/item_0/inspection');
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
      expect(res.aiCount).toBe(1);
      expect(res.batchNo).toBeNull();
      expect(res.expDate).toBeNull();
      expect(res.status).toBe('ROBOFLOW_FALLBACK');
    });

    it('TC-VISION-ABNORM-05: Gateway ném Unsupported FormDataPart implementation tự động kích hoạt Self-Healing an toàn', async () => {
      (globalThis as any).fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Unsupported FormDataPart implementation'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            outputs: [
              {
                predictions: {
                  predictions: [
                    { x: 10, y: 10, width: 20, height: 20, confidence: 0.96, class: 'Medicine' },
                  ],
                },
              },
            ],
          }),
        } as any);

      const res = await ApiService.inspectReceiptItemAI(
        'GRN-A05944',
        'item_0',
        'data:image/jpeg;base64,sample_photo'
      );

      expect(res.success).toBe(true);
      expect(res.aiCount).toBe(1);
      expect(res.confidence).toBeGreaterThanOrEqual(95);
    });

    it('TC-VISION-ABNORM-06: Ngăn chặn truyền object event/GestureResponderEvent và trả về success = false (không bịa dữ liệu)', async () => {
      const mockEvent = { nativeEvent: { pageX: 100, pageY: 200 } };
      const res = await ApiService.inspectReceiptItemAI(
        'GRN-A05944',
        'item_0',
        mockEvent as any
      );

      // Khi dữ liệu đầu vào là object event rác, từ chối an toàn không crash và không bịa ra số đếm 10
      expect(res.success).toBe(false);
      expect(res.message).toBeTruthy();
    });

    it('TC-SHELF-ABNORM-02: Lỗi mạng khi gọi getShelfDetail không văng crash, trả về cấu trúc rỗng an toàn', async () => {
      (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));

      const res = await ApiService.getShelfDetail('A', 'A1', 1);
      expect(res).toBeDefined();
      expect(res.batches).toEqual([]);
      expect(res.zone).toBe('A');
    });

    it('TC-PO-ABNORM-03: Tự động cấp lại token kho và retry khi nhận HTTP 401 Unauthorized', async () => {
      let callCount = 0;
      (globalThis as any).fetch = jest.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.includes('/api/auth/login')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'fresh_auto_warehouse_token' }),
          });
        }
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Unauthorized' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{ _id: 'po1', poCode: 'PO-001' }],
        });
      });

      const pos = await ApiService.getPurchaseOrders();
      expect(Array.isArray(pos)).toBe(true);
      expect(pos.length).toBe(1);
      expect(pos[0]._id).toBe('po1');
    });

    it('TC-PO-ABNORM-04: getPurchaseOrderById tự động fallback sang Cloud khi mạng LAN bị ngắt kết nối', async () => {
      let requestedUrls: string[] = [];
      (globalThis as any).fetch = jest.fn().mockImplementation((url: string) => {
        requestedUrls.push(url);
        // LAN thất bại do ngắt mạng
        if (!url.includes('abcpharmacy.store')) {
          return Promise.reject(new Error('Network request failed'));
        }
        // Cloud Server trực tuyến phản hồi đơn PO
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            _id: '6af6f744caefa79c40a05944',
            poCode: 'PO-A05944',
            status: 'RECEIVING',
          }),
        });
      });

      const po = await ApiService.getPurchaseOrderById('6af6f744caefa79c40a05944');
      expect(po).toBeDefined();
      expect(po._id).toBe('6af6f744caefa79c40a05944');
      expect(requestedUrls.some((u) => u.includes('abcpharmacy.store'))).toBe(true);
    });
  });
});
