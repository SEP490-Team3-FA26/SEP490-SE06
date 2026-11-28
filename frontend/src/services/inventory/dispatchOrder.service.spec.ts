import api from '../core/api';
import { dispatchOrderService } from './dispatchOrder.service';

jest.mock('../core/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('dispatchOrderService (Frontend Web Tier 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // [Normal Values] - Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('[Normal Values]', () => {
    it('lấy danh sách phiếu xuất và bóc tách payload data đúng định dạng', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [{ _id: 'd1', dispatchCode: 'DX-20261111-001' }] },
      });

      const list = await dispatchOrderService.listOrders({ status: 'PENDING_APPROVAL' });
      expect(api.get).toHaveBeenCalledWith('/api/dispatch-orders', {
        params: { status: 'PENDING_APPROVAL' },
      });
      expect(list).toHaveLength(1);
      expect(list[0].dispatchCode).toBe('DX-20261111-001');
    });

    it('gửi yêu cầu tạo phiếu xuất TRANSFER và phê duyệt chuẩn', async () => {
      (api.post as jest.Mock)
        .mockResolvedValueOnce({ data: { status: 'Accepted' } })
        .mockResolvedValueOnce({ data: { status: 'Accepted' } });

      const createRes = await dispatchOrderService.createOrder({
        type: 'TRANSFER',
        referenceId: 'pr-101',
      });
      const approveRes = await dispatchOrderService.approveOrder('d1', 'Đồng ý xuất');

      expect(api.post).toHaveBeenNthCalledWith(1, '/api/dispatch-orders', {
        type: 'TRANSFER',
        referenceId: 'pr-101',
      });
      expect(api.post).toHaveBeenNthCalledWith(2, '/api/dispatch-orders/d1/approve', {
        note: 'Đồng ý xuất',
      });
      expect(createRes.status).toBe('Accepted');
      expect(approveRes.status).toBe('Accepted');
    });

    it('gửi tạo phiếu xuất đồng bộ qua /api/dispatch-orders/sync và nhận ngay dữ liệu phiếu', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { _id: 'd-sync', dispatchCode: 'DO-20261112-0001' } },
      });

      const res = await dispatchOrderService.createOrderSync({
        type: 'TRANSFER',
        referenceId: 'pr-102',
      });

      expect(api.post).toHaveBeenCalledWith('/api/dispatch-orders/sync', {
        type: 'TRANSFER',
        referenceId: 'pr-102',
      });
      expect(res.data.dispatchCode).toBe('DO-20261112-0001');
    });

    it('gửi xác nhận xuất bến kèm header X-Idempotency-Key tự sinh', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: { status: 'Accepted' } });

      await dispatchOrderService.confirmDispatch('d1', {
        driverName: 'Nguyễn Văn Tài',
        vehiclePlate: '51D-678.90',
      });

      const [url, body, config] = (api.post as jest.Mock).mock.calls[0];
      expect(url).toBe('/api/dispatch-orders/d1/dispatch');
      expect(body.handoverRecipient.driverName).toBe('Nguyễn Văn Tài');
      expect(body.idempotencyKey).toMatch(/^web-disp-/);
      expect(config.headers['X-Idempotency-Key']).toBe(body.idempotencyKey);
    });
  });

  // =========================================================================
  // [Boundary Values] - Giá trị biên & cấu trúc dữ liệu rỗng
  // =========================================================================
  describe('[Boundary Values]', () => {
    it('trả về mảng rỗng khi API listOrders hoặc listTotes trả response null/không có data', async () => {
      (api.get as jest.Mock)
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: { data: [] } });

      const orders = await dispatchOrderService.listOrders();
      const totes = await dispatchOrderService.listTotes();

      expect(orders).toEqual([]);
      expect(totes).toEqual([]);
    });

    it('hỗ trợ danh sách trả trực tiếp dưới dạng Array ở root response.data', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: [{ _id: 't1', toteCode: 'TOTE-01', status: 'AVAILABLE' }],
      });

      const totes = await dispatchOrderService.listTotes();
      expect(totes).toHaveLength(1);
      expect(totes[0].toteCode).toBe('TOTE-01');
    });
  });

  // =========================================================================
  // [Abnormal Values] - Dữ liệu dị thường & lỗi API
  // =========================================================================
  describe('[Abnormal Values]', () => {
    it('lan truyền lỗi khi backend từ chối thao tác duyệt hoặc hủy phiếu', async () => {
      (api.post as jest.Mock)
        .mockRejectedValueOnce(new Error('403 Forbidden: Cần Dược sĩ PIC'))
        .mockRejectedValueOnce(new Error('400 Bad Request: Lý do từ chối trống'));

      await expect(dispatchOrderService.approveOrder('d1')).rejects.toThrow(
        '403 Forbidden'
      );
      await expect(dispatchOrderService.rejectOrder('d1', '')).rejects.toThrow(
        '400 Bad Request'
      );
    });
  });
});
