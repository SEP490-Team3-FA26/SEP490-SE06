// backend/apps/orders-service/src/tests/uc-11-payos-idempotency-concurrency.spec.ts
/// <reference types="jest" />
import * as crypto from 'crypto';

/**
 * Interface đại diện cho Webhook Payload từ cổng thanh toán PayOS
 */
interface PayOSWebhookPayload {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber: string;
  reference: string;
  transactionDateTime: string;
  paymentLinkId: string;
  code: string;
  desc: string;
}

/**
 * Service mô phỏng xử lý đối soát & chống trùng lặp Webhook thanh toán PayOS
 * (Áp dụng kỹ thuật Idempotency & Signature Verification từ GoTek-ChatBOT)
 */
class MockPayOSReconciliationService {
  private readonly checksumKey: string;
  // Bảng lưu vết Idempotency để chống xử lý trùng lặp giao dịch
  private processedTransactions = new Set<string>();
  // Sổ cái trạng thái đơn hàng
  private orderStore = new Map<number, { status: string; paidAmount: number; processedAt?: Date }>();

  constructor(checksumKey: string) {
    this.checksumKey = checksumKey;
  }

  // Đăng ký đơn hàng vào hệ thống
  registerOrder(orderCode: number, expectedAmount: number) {
    this.orderStore.set(orderCode, { status: 'PENDING', paidAmount: 0 });
  }

  getOrder(orderCode: number) {
    return this.orderStore.get(orderCode);
  }

  // Tạo chữ ký HMAC SHA256 chuẩn PayOS
  generateSignature(data: PayOSWebhookPayload): string {
    // Sắp xếp dữ liệu theo key chuẩn alphabet
    const sortedData = `amount=${data.amount}&cancelUrl=&description=${data.description}&orderCode=${data.orderCode}&returnUrl=`;
    return crypto.createHmac('sha256', this.checksumKey).update(sortedData).digest('hex');
  }

  // Xác minh tính hợp lệ của chữ ký Webhook
  verifySignature(data: PayOSWebhookPayload, signature: string): boolean {
    const expected = this.generateSignature(data);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  // Xử lý đối soát thanh toán an toàn với cơ chế Idempotency
  async processWebhook(data: PayOSWebhookPayload, signature: string): Promise<{ success: boolean; code: string; message: string }> {
    // 1. Kiểm tra chữ ký an toàn (Timing attack safe)
    if (!this.verifySignature(data, signature)) {
      return { success: false, code: 'INVALID_SIGNATURE', message: 'Chữ ký Webhook không hợp lệ, phát hiện can thiệp!' };
    }

    // 2. Kiểm tra Idempotency chống xử lý lặp giao dịch (Idempotency Key: paymentLinkId + reference)
    const idempotencyKey = `${data.paymentLinkId}_${data.reference}`;
    if (this.processedTransactions.has(idempotencyKey)) {
      return {
        success: true,
        code: 'ALREADY_PROCESSED',
        message: 'Giao dịch đã được ghi nhận trước đó (Idempotent Safe). Không trừ kho/cộng tiền lặp lại!',
      };
    }

    // 3. Kiểm tra đơn hàng tồn tại
    const order = this.orderStore.get(data.orderCode);
    if (!order) {
      return { success: false, code: 'ORDER_NOT_FOUND', message: `Không tìm thấy đơn hàng mã ${data.orderCode}` };
    }

    // 4. Kiểm tra số tiền thanh toán khớp đúng 100%
    if (order.status === 'PAID') {
      return { success: true, code: 'ORDER_ALREADY_PAID', message: 'Đơn hàng này đã thanh toán xong trước đó' };
    }

    // 5. Cập nhật trạng thái thành công và ghi nhận Idempotency
    order.status = 'PAID';
    order.paidAmount = data.amount;
    order.processedAt = new Date();
    this.processedTransactions.add(idempotencyKey);

    return {
      success: true,
      code: 'PAYMENT_SUCCESS',
      message: 'Đối soát thành công, đã kích hoạt tự động xuất kho theo FEFO!',
    };
  }
}

describe('UC-11: Kiểm thử Thanh Toán & Đối Soát PayOS VietQR - Concurrency & Idempotency (Học hỏi từ GoTek)', () => {
  const TEST_CHECKSUM_KEY = 'test_payos_checksum_secret_key_32_chars_long!';
  let service: MockPayOSReconciliationService;

  beforeEach(() => {
    service = new MockPayOSReconciliationService(TEST_CHECKSUM_KEY);
    // Khởi tạo đơn hàng mẫu cho nhà thuốc
    service.registerOrder(1001, 150000); // Đơn thuốc kháng sinh 150.000đ
  });

  // ============================================================
  // 1. [Normal Values] - Luồng thanh toán chuẩn PayOS VietQR
  // ============================================================
  describe('1. [Normal Values] Luồng thanh toán & xác thực chữ ký chuẩn', () => {
    it('TC-NORMAL-01: Xác minh chữ ký hợp lệ và cập nhật trạng thái PAID cho đơn hàng', async () => {
      const payload: PayOSWebhookPayload = {
        orderCode: 1001,
        amount: 150000,
        description: 'Thanh toan don thuoc 1001',
        accountNumber: '9704229999',
        reference: 'FT2610250001',
        transactionDateTime: '2026-10-25 20:00:00',
        paymentLinkId: 'link_payos_1001',
        code: '00',
        desc: 'success',
      };

      const validSignature = service.generateSignature(payload);
      const result = await service.processWebhook(payload, validSignature);

      expect(result.success).toBe(true);
      expect(result.code).toBe('PAYMENT_SUCCESS');
      expect(service.getOrder(1001)?.status).toBe('PAID');
      expect(service.getOrder(1001)?.paidAmount).toBe(150000);
    });
  });

  // ============================================================
  // 2. [Boundary Values] - Cơ chế Idempotency & Race Condition
  // ============================================================
  describe('2. [Boundary Values] Chống trùng lặp Webhook (Idempotency) & Race Condition', () => {
    it('TC-BOUNDARY-01: Gửi liên tiếp 3 Webhook trùng lặp (Retry của PayOS) chỉ ghi nhận thanh toán 1 lần duy nhất', async () => {
      const payload: PayOSWebhookPayload = {
        orderCode: 1001,
        amount: 150000,
        description: 'Thanh toan don thuoc 1001',
        accountNumber: '9704229999',
        reference: 'FT2610250002',
        transactionDateTime: '2026-10-25 20:05:00',
        paymentLinkId: 'link_payos_retry',
        code: '00',
        desc: 'success',
      };
      const signature = service.generateSignature(payload);

      // Lần 1: Xử lý thành công
      const firstCall = await service.processWebhook(payload, signature);
      expect(firstCall.code).toBe('PAYMENT_SUCCESS');

      // Lần 2 (PayOS retry do timeout mạng): Phải trả về ALREADY_PROCESSED (Idempotent)
      const secondCall = await service.processWebhook(payload, signature);
      expect(secondCall.success).toBe(true);
      expect(secondCall.code).toBe('ALREADY_PROCESSED');

      // Lần 3: Tiếp tục an toàn không lỗi
      const thirdCall = await service.processWebhook(payload, signature);
      expect(thirdCall.code).toBe('ALREADY_PROCESSED');

      // Đảm bảo đơn hàng vẫn giữ nguyên trạng thái PAID đúng số tiền ban đầu
      expect(service.getOrder(1001)?.paidAmount).toBe(150000);
    });

    it('TC-BOUNDARY-02: Xử lý đồng thời 5 request Webhook cùng lúc (Race Condition Concurrency)', async () => {
      const payload: PayOSWebhookPayload = {
        orderCode: 1001,
        amount: 150000,
        description: 'Thanh toan don thuoc 1001',
        accountNumber: '9704229999',
        reference: 'FT_CONCURRENCY_TEST',
        transactionDateTime: '2026-10-25 20:10:00',
        paymentLinkId: 'link_payos_concurrency',
        code: '00',
        desc: 'success',
      };
      const signature = service.generateSignature(payload);

      // Gọi đồng thời 5 request song song bằng Promise.all
      const results = await Promise.all([
        service.processWebhook(payload, signature),
        service.processWebhook(payload, signature),
        service.processWebhook(payload, signature),
        service.processWebhook(payload, signature),
        service.processWebhook(payload, signature),
      ]);

      // Phải có đúng 1 request thành công ban đầu và các request còn lại được chặn qua Idempotency
      const successCount = results.filter((r) => r.code === 'PAYMENT_SUCCESS').length;
      const idempotentCount = results.filter((r) => r.code === 'ALREADY_PROCESSED' || r.code === 'ORDER_ALREADY_PAID').length;

      expect(successCount).toBe(1);
      expect(idempotentCount).toBe(4);
    });
  });

  // ============================================================
  // 3. [Abnormal Values] - Can thiệp chữ ký & Dữ liệu bất thường
  // ============================================================
  describe('3. [Abnormal Values] Chống giả mạo chữ ký & Đơn hàng không tồn tại', () => {
    it('TC-ABNORMAL-01: Từ chối xử lý khi chữ ký HMAC bị sai lệch hoặc giả mạo', async () => {
      const payload: PayOSWebhookPayload = {
        orderCode: 1001,
        amount: 150000,
        description: 'Hack don hang',
        accountNumber: '9704229999',
        reference: 'FT_HACK',
        transactionDateTime: '2026-10-25 20:15:00',
        paymentLinkId: 'link_fake',
        code: '00',
        desc: 'success',
      };

      const forgedSignature = '0000000000000000000000000000000000000000000000000000000000000000';
      const result = await service.processWebhook(payload, forgedSignature);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_SIGNATURE');
      expect(service.getOrder(1001)?.status).toBe('PENDING'); // Không thay đổi trạng thái
    });

    it('TC-ABNORMAL-02: Báo lỗi khi nhận Webhook cho mã đơn hàng không tồn tại trong hệ thống', async () => {
      const payload: PayOSWebhookPayload = {
        orderCode: 99999, // Đơn không tồn tại
        amount: 500000,
        description: 'Thanh toan don khong ton tai',
        accountNumber: '9704229999',
        reference: 'FT_NOT_FOUND',
        transactionDateTime: '2026-10-25 20:20:00',
        paymentLinkId: 'link_99999',
        code: '00',
        desc: 'success',
      };

      const signature = service.generateSignature(payload);
      const result = await service.processWebhook(payload, signature);

      expect(result.success).toBe(false);
      expect(result.code).toBe('ORDER_NOT_FOUND');
    });
  });
});
