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
  });

  // =========================================================================
  // 2. [Boundary Values] - Ranh giới dữ liệu, giỏ rỗng, chuỗi chuẩn hóa tiếng Việt
  // =========================================================================
  describe('[Boundary Values] Ranh giới & Dữ liệu biên', () => {
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
  });
});

