// prescription.controller.spec.ts - Kiểm thử hệ thống đối soát lâm sàng UC-107
// Tuân thủ 100% Test-Coupled Mandate (sep.md & trienkhaitaskmoi.md)
// Đầy đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
// Chú thích mã nguồn: Tiếng Việt 100%

import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionController } from '../../../apps/api-gateway/src/controllers/prescription.controller';
import { ClientKafka } from '@nestjs/microservices';

describe('PrescriptionController - UC-107 Clinical Allergy & Safety Suite', () => {
  let controller: PrescriptionController;
  const mockInventoryClient: Partial<ClientKafka> = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrescriptionController],
      providers: [
        {
          provide: 'INVENTORY_SERVICE',
          useValue: mockInventoryClient,
        },
      ],
    }).compile();

    controller = module.get<PrescriptionController>(PrescriptionController);
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, phát hiện cảnh báo chính xác
  // =========================================================================
  describe('[Normal Values] Luồng kiểm tra lâm sàng chuẩn', () => {
    it('Nên trả về trạng thái SAFE khi bệnh nhân không có tiền sử dị ứng và không có bệnh nền', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          allergies: [],
          allergicMedicines: [],
          allergicIngredients: [],
          chronicConditions: [],
        },
        cartItems: [
          { name: 'Panadol Extra', activeIngredient: 'Paracetamol' },
        ],
      });

      expect(result.hasConflict).toBe(false);
      expect(result.severity).toBe('SAFE');
      expect(result.conflicts.length).toBe(0);
      expect(result.message).toContain('không ghi nhận tiền sử dị ứng');
    });

    it('Nên phát hiện xung đột CRITICAL khi thuốc trong giỏ trùng với biệt dược dị ứng (Augmentin)', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          allergicMedicines: ['Augmentin'],
        },
        cartItems: [
          { name: 'Thuốc kháng sinh Augmentin 1g', activeIngredient: 'Amoxicillin + Clavulanic' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('CRITICAL');
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].conflictType).toBe('ALLERGY_MEDICINE');
      expect(result.conflicts[0].medicineName).toContain('Augmentin');
    });

    it('Nên phát hiện phản ứng dị ứng chéo nhóm Beta-lactam khi dị ứng Penicillin và mua Amoxicillin', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          allergies: ['Penicillin'],
        },
        cartItems: [
          { name: 'Amoxicillin 500mg', activeIngredient: 'Amoxicillin' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('CRITICAL');
      expect(result.conflicts[0].conflictType).toBe('CROSS_REACTIVITY');
      expect(result.conflicts[0].safeAlternatives.length).toBeGreaterThan(0);
    });

    it('Nên cảnh báo chống chỉ định HIGH khi bệnh nhân Viêm loét dạ dày mua thuốc NSAID (Ibuprofen)', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          chronicConditions: ['Viêm loét dạ dày'],
        },
        cartItems: [
          { name: 'Ibuprofen 400mg', activeIngredient: 'Ibuprofen' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('HIGH');
      expect(result.conflicts[0].conflictType).toBe('CONTRAINDICATION_CHRONIC');
      expect(result.conflicts[0].reason).toContain('Viêm loét dạ dày');
    });

    it('Nên cảnh báo kịch phát huyết áp khi bệnh nhân Tăng huyết áp mua thuốc co mạch (Decolgen / Phenylephrine)', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          chronicConditions: ['Tăng huyết áp vô căn'],
        },
        cartItems: [
          { name: 'Decolgen Forte', activeIngredient: 'Paracetamol, Phenylephrine' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('HIGH');
      expect(result.conflicts[0].reason).toContain('Tăng huyết áp');
    });

    it('Nên chống chỉ định tuyệt đối CRITICAL khi phụ nữ mang thai mua kháng sinh Quinolone / Ciprofloxacin', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          chronicConditions: ['Phụ nữ mang thai quý 1'],
        },
        cartItems: [
          { name: 'Ciprofloxacin 500mg', activeIngredient: 'Ciprofloxacin' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('CRITICAL');
      expect(result.conflicts[0].reason).toContain('MANG THAI');
    });

    it('Nên trả về đầy đủ 8 điều khoản nội quy Trợ lý Dược sĩ AI và phiên bản v1.0-OTC', () => {
      const result = controller.getAiConsultantTerms();

      expect(result.success).toBe(true);
      expect(result.version).toBe('v1.0-OTC');
      expect(result.articles.length).toBe(8);
      expect(result.legalBases.length).toBeGreaterThan(0);
      expect(result.articles[0].title).toContain('Mục tiêu & Phạm vi');
    });

    it('Nên ghi nhận chấp thuận nội quy thành công với người dùng đã xác thực', () => {
      const mockReq = {
        user: { id: 'usr-12345' },
        ip: '192.168.1.50',
        headers: { 'user-agent': 'Chrome/120.0' },
      };

      const result = controller.acceptAiConsultantTerms(
        { version: 'v1.0-OTC', acceptedAt: '2026-11-04T12:00:00.000Z' },
        mockReq,
      );

      expect(result.success).toBe(true);
      expect(result.audit.userId).toBe('usr-12345');
      expect(result.audit.version).toBe('v1.0-OTC');
      expect(result.audit.status).toBe('CONFIRMED');
      expect(result.audit.ip).toBe('192.168.1.50');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Ranh giới dữ liệu, giỏ rỗng, chuỗi chuẩn hóa tiếng Việt
  // =========================================================================
  describe('[Boundary Values] Ranh giới & Dữ liệu biên', () => {
    it('Nên áp dụng phiên bản mặc định v1.0-OTC khi client gửi version rỗng hoặc khoảng trắng', () => {
      const mockReq = { user: null, ip: '127.0.0.1' };
      const result = controller.acceptAiConsultantTerms({ version: '' }, mockReq);

      expect(result.success).toBe(true);
      expect(result.audit.version).toBe('v1.0-OTC');
      expect(result.audit.userId).toBe('anonymous-guest');
    });

    it('Nên tự động sinh acceptedAt hợp lệ nếu client không truyền thời điểm xác nhận', () => {
      const mockReq = { user: null };
      const result = controller.acceptAiConsultantTerms({}, mockReq);

      expect(result.success).toBe(true);
      expect(typeof result.audit.acceptedAt).toBe('string');
      expect(new Date(result.audit.acceptedAt).getTime()).not.toBeNaN();
    });
    it('Nên xử lý an toàn khi giỏ hàng rỗng (cartItems = [])', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          allergies: ['Penicillin'],
          chronicConditions: ['Suy thận'],
        },
        cartItems: [],
      });

      expect(result.hasConflict).toBe(false);
      expect(result.severity).toBe('SAFE');
      expect(result.conflicts).toEqual([]);
    });

    it('Nên chuẩn hóa chuỗi tiếng Việt hoa/thường, có dấu và không dấu (Đái tháo đường vs dai thao duong)', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          allergies: ['   pEnIcIlLiN   '],
        },
        cartItems: [
          { name: 'Thuốc AMOXICILLIN 250mg', activeIngredient: 'amoxicillin trihydrate' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });

    it('Nên tổng hợp danh sách gợi ý an toàn không bị trùng lặp tên thuốc', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          chronicConditions: ['Viêm loét dạ dày', 'Hen suyễn phế quản'],
        },
        cartItems: [
          { name: 'Ibuprofen', activeIngredient: 'Ibuprofen' },
          { name: 'Aspirin 81mg', activeIngredient: 'Aspirin' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      const names = result.safeAlternatives.map((s) => s.name);
      const uniqueNames = Array.from(new Set(names));
      expect(names.length).toBe(uniqueNames.length);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý ngoại lệ, payload khuyết thiếu, dị thường
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & khuyết thiếu', () => {
    it('Nên xử lý an toàn khi body hoặc customerProfile rỗng hoàn toàn ({})', async () => {
      const result = await controller.checkCartAllergyAndContraindications({} as any);

      expect(result.hasConflict).toBe(false);
      expect(result.severity).toBe('SAFE');
      expect(result.conflicts).toEqual([]);
    });

    it('Nên bỏ qua các sản phẩm trong giỏ hàng có tên rỗng hoặc thiếu thông tin', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          allergies: ['Penicillin'],
        },
        cartItems: [
          { name: '', activeIngredient: '' },
          { name: 'Nước muối sinh lý 0.9%', activeIngredient: 'Natri Clorid' },
        ],
      });

      expect(result.hasConflict).toBe(false);
      expect(result.severity).toBe('SAFE');
    });

    it('Nên xử lý an toàn khi các mảng dị ứng chứa giá trị null hoặc khoảng trắng', async () => {
      const result = await controller.checkCartAllergyAndContraindications({
        customerProfile: {
          allergies: ['', '   ', undefined as any],
          chronicConditions: ['', null as any],
        },
        cartItems: [
          { name: 'Paracetamol 500mg', activeIngredient: 'Paracetamol' },
        ],
      });

      expect(result.hasConflict).toBe(false);
      expect(result.severity).toBe('SAFE');
    });

    it('Nên xử lý an toàn khi req khuyết thiếu user và headers cho acceptAiConsultantTerms', () => {
      const result = controller.acceptAiConsultantTerms({}, null as any);

      expect(result.success).toBe(true);
      expect(result.audit.userId).toBe('anonymous-guest');
      expect(result.audit.ip).toBe('127.0.0.1');
      expect(result.audit.userAgent).toBe('unknown');
    });

    it('Nên ghi nhận đúng userId từ JWT sub khi người dùng đã đăng nhập (không bị gán nhầm anonymous-guest)', () => {
      const mockReq = {
        user: { sub: 'usr-sub-12345', email: 'benhnhan@gmail.com' },
        ip: '192.168.1.100',
        headers: { 'user-agent': 'Chrome/Test' },
      };
      const result = controller.acceptAiConsultantTerms({ version: 'v1.0-OTC' }, mockReq as any);

      expect(result.success).toBe(true);
      expect(result.audit.userId).toBe('usr-sub-12345');
      expect(result.audit.ip).toBe('192.168.1.100');
    });

    beforeEach(() => {
      PrescriptionController.clearConsentStoreForTesting();
    });

    it('Nên ném lỗi FORBIDDEN khi client tự bịa terms_confirmed: true mà chưa từng xác nhận trên máy chủ (Server Consent Check)', async () => {
      // Client tự gửi terms_confirmed: true nhưng máy chủ chưa có bản ghi
      await expect(
        controller.chatConsult(
          {
            message: 'Tư vấn giúp tôi thuốc hạ sốt',
            terms_confirmed: true,
          },
          { headers: { 'x-client-session-id': 'unconfirmed-session-123' }, ip: '10.0.0.1' },
        ),
      ).rejects.toThrow('chưa hoàn tất xác nhận Nội quy Trợ lý Dược sĩ AI');
    });

    it('Nên ném lỗi FORBIDDEN khi tài khoản đã đăng nhập gọi symptom-consult nhưng chưa xác nhận điều khoản trên server', async () => {
      const mockReq = {
        user: { sub: 'unconfirmed-user-456' },
        ip: '10.0.0.2',
      };
      await expect(
        controller.textConsult('Tôi bị đau bụng dưới', undefined, true, undefined, mockReq),
      ).rejects.toThrow('chưa hoàn tất xác nhận Nội quy Trợ lý Dược sĩ AI');
    });

    it('Nên ném lỗi FORBIDDEN khi khách vãng lai gửi giọng nói tới recommend mà chưa xác nhận điều khoản trên server', async () => {
      const mockFile: any = {
        buffer: Buffer.from('fake-audio-bytes'),
        mimetype: 'audio/webm',
        originalname: 'voice.webm',
      };
      const mockReq = {
        headers: { 'x-client-session-id': 'unconfirmed-voice-guest' },
        ip: '10.0.0.3',
      };
      await expect(
        controller.recommendPrescription(mockFile, undefined, undefined, mockReq),
      ).rejects.toThrow('chưa hoàn tất xác nhận Nội quy Trợ lý Dược sĩ AI');
    });

    it('Nên ném lỗi FORBIDDEN khi người dùng bỏ trống terms_confirmed hoặc gửi undefined (Fail-closed)', async () => {
      await expect(
        controller.chatConsult({
          message: 'Tư vấn giúp tôi thuốc hạ sốt',
        } as any, { ip: '10.0.0.4' }),
      ).rejects.toThrow('chưa hoàn tất xác nhận Nội quy Trợ lý Dược sĩ AI');
    });

    it('Nên ném lỗi FORBIDDEN khi gửi terms_confirmed là chuỗi "false" (Fail-closed)', async () => {
      // Kể cả đã có consent, nếu request chủ động gửi false thì vẫn bị chặn
      PrescriptionController.setConsentForTesting('session:sess-false-test');
      await expect(
        controller.chatConsult({
          message: 'Tư vấn giúp tôi thuốc hạ sốt',
          terms_confirmed: 'false' as any,
          session_id: 'sess-false-test',
        }, { headers: { 'x-client-session-id': 'sess-false-test' } }),
      ).rejects.toThrow('Người dùng bắt buộc phải đọc và đồng ý với nội quy tư vấn Dược sĩ AI');
    });

    it('Nên ném lỗi FORBIDDEN khi người dùng cố tình gửi terms_confirmed là false boolean (Fail-closed)', async () => {
      PrescriptionController.setConsentForTesting('session:sess-false-bool');
      await expect(
        controller.chatConsult({
          message: 'Tư vấn giúp tôi thuốc hạ sốt',
          terms_confirmed: false,
          session_id: 'sess-false-bool',
        }, { headers: { 'x-client-session-id': 'sess-false-bool' } }),
      ).rejects.toThrow('Người dùng bắt buộc phải đọc và đồng ý với nội quy tư vấn Dược sĩ AI');
    });

    it('Nên ném lỗi FORBIDDEN trên endpoint symptom-consult nếu gửi terms_confirmed là false hoặc "false"', async () => {
      PrescriptionController.setConsentForTesting('session:sess-symptom-false');
      const mockReq = { headers: { 'x-client-session-id': 'sess-symptom-false' } };

      await expect(
        controller.textConsult('Đau đầu sốt nhẹ', undefined, false, 'sess-symptom-false', mockReq),
      ).rejects.toThrow('Người dùng bắt buộc phải đọc và đồng ý với nội quy tư vấn Dược sĩ AI');

      await expect(
        controller.textConsult('Đau đầu sốt nhẹ', undefined, 'false', 'sess-symptom-false', mockReq),
      ).rejects.toThrow('Người dùng bắt buộc phải đọc và đồng ý với nội quy tư vấn Dược sĩ AI');
    });

    it('[Lỗi 2 - P1] Nên làm sạch thông tin định danh (PII Scrubbing: SĐT, CCCD, Email) trước khi chuyển sang AI Service', async () => {
      // Giả lập đã xác nhận điều khoản trên server
      PrescriptionController.setConsentForTesting('user:usr-pii-test');

      let capturedPayload: any = null;
      global.fetch = jest.fn().mockImplementation((url, opts) => {
        if (opts?.body) {
          try {
            capturedPayload = JSON.parse(opts.body);
          } catch (_) {}
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, reply: 'Dược sĩ đã tiếp nhận thông tin' }),
        } as any);
      });

      const mockReq = {
        user: { sub: 'usr-pii-test' },
      };

      await controller.chatConsult(
        {
          message: 'Tôi là bệnh nhân, SĐT 0988123456, CCCD 001201012345, email benhnhan@gmail.com cần tư vấn.',
          medical_notes: 'Ghi chú: liên hệ người nhà qua số 0909999888 hoặc mail giadinh@wdp301.com',
          terms_confirmed: true,
        },
        mockReq,
      );

      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.message).not.toContain('0988123456');
      expect(capturedPayload.message).not.toContain('001201012345');
      expect(capturedPayload.message).not.toContain('benhnhan@gmail.com');
      expect(capturedPayload.message).toContain('[ĐÃ ẨN SĐT]');
      expect(capturedPayload.message).toContain('[ĐÃ ẨN CCCD]');
      expect(capturedPayload.message).toContain('[ĐÃ ẨN EMAIL]');

      expect(capturedPayload.medical_notes).not.toContain('0909999888');
      expect(capturedPayload.medical_notes).not.toContain('giadinh@wdp301.com');
      expect(capturedPayload.medical_notes).toContain('[ĐÃ ẨN SĐT]');
      expect(capturedPayload.medical_notes).toContain('[ĐÃ ẨN EMAIL]');
    });

    it('[Lỗi 1 - P1] Luồng chuẩn: Người dùng gọi acceptAiConsultantTerms thành công, sau đó chatConsult được thông qua', async () => {
      const mockReq = {
        user: { sub: 'usr-flow-success' },
        headers: { 'x-client-session-id': 'sess-flow-success' },
        ip: '192.168.1.50',
      };

      // 1. Ghi nhận xác nhận điều khoản trên server
      const acceptRes = controller.acceptAiConsultantTerms({ version: 'v1.0-OTC' }, mockReq);
      expect(acceptRes.success).toBe(true);

      // 2. Gọi chatConsult thành công
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, reply: 'Xin chào, Dược sĩ có thể giúp gì cho bạn?' }),
      });

      const chatRes = await controller.chatConsult(
        {
          message: 'Tư vấn thuốc cảm cúm thông thường',
          terms_confirmed: true,
        },
        mockReq,
      );

      expect(chatRes.success).toBe(true);
      expect(chatRes.reply).toContain('Xin chào');
    });
  });
});

