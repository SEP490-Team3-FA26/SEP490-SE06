// create-order.dto.spec.ts - Kiểm thử DTO Đơn Hàng chuẩn 3 nhóm giá trị
// Tuân thủ 100% Test-Coupled Mandate (sep.md & trienkhaitaskmoi.md)
// Chú thích mã nguồn: Tiếng Việt 100%

import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto, OrderItemDto, CreatePayOSLinkDto } from './create-order.dto';

describe('CreateOrderDto & OrderItemDto Test Suite', () => {
  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, đầy đủ thông tin hợp lệ
  // =========================================================================
  describe('[Normal Values] Luồng dữ liệu chuẩn', () => {
    it('Nên validate thành công đơn hàng chuẩn có trường note và notes', async () => {
      const payload = {
        patientName: 'Trần Hồng Phước',
        patientPhone: '0903333444',
        shippingAddress: '123 Hai Bà Trưng, Quận 1, TP.HCM',
        paymentMethod: 'QR_PAY',
        type: 'ONLINE',
        totalAmount: 57400,
        note: 'Giao giờ hành chính, gọi trước khi đến',
        notes: 'Không có dị ứng paracetamol',
        items: [
          {
            medicineId: 'MED-001',
            name: 'Thuốc SaViMetoc giảm đau',
            price: 361000,
            quantity: 1,
            unit: 'Hộp',
            note: 'Dùng sau ăn sáng',
          },
        ],
      };

      const dto = plainToInstance(CreateOrderDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('Nên validate thành công CreatePayOSLinkDto với ghi chú cho dược sĩ', async () => {
      const payload = {
        patientName: 'Nguyễn Văn A',
        patientPhone: '0912345678',
        totalAmount: 120000,
        paymentMethod: 'QR_PAY',
        type: 'ONLINE',
        note: 'Khách hàng có bệnh nền dạ dày',
        items: [
          {
            medicineId: 'MED-002',
            name: 'Ecosip Tatra',
            price: 213000,
            quantity: 1,
          },
        ],
      };

      const dto = plainToInstance(CreatePayOSLinkDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, tối thiểu, rỗng, không có ghi chú
  // =========================================================================
  describe('[Boundary Values] Giá trị biên & Không bắt buộc', () => {
    it('Nên validate thành công khi trường note và notes để trống hoặc undefined', async () => {
      const payload = {
        totalAmount: 0,
        paymentMethod: 'CASH',
        items: [
          {
            medicineId: 'MED-FREE',
            name: 'Khẩu trang y tế 4 lớp',
            price: 0,
            quantity: 1,
          },
        ],
      };

      const dto = plainToInstance(CreateOrderDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('Nên chấp nhận chuỗi note cực ngắn (1 ký tự) hoặc cực dài (500 ký tự)', async () => {
      const longNote = 'A'.repeat(500);
      const payload = {
        totalAmount: 50000,
        paymentMethod: 'CARD',
        note: longNote,
        items: [
          {
            medicineId: 'MED-003',
            name: 'Vitamin C',
            price: 50000,
            quantity: 1,
            note: 'B',
          },
        ],
      };

      const dto = plainToInstance(CreateOrderDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, sai kiểu dữ liệu
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường', () => {
    it('Nên ném lỗi validation khi paymentMethod sai định dạng', async () => {
      const payload = {
        totalAmount: 100000,
        paymentMethod: 'BITCOIN_CRYPTO', // Không nằm trong ['QR_PAY', 'CASH', 'CARD']
        items: [
          {
            medicineId: 'MED-001',
            name: 'Thuốc mẫu',
            price: 100000,
            quantity: 1,
          },
        ],
      };

      const dto = plainToInstance(CreateOrderDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'paymentMethod')).toBe(true);
    });

    it('Nên ném lỗi validation khi note không phải là string', async () => {
      const payload = {
        totalAmount: 100000,
        paymentMethod: 'QR_PAY',
        note: 12345 as any, // Sai kiểu dữ liệu number thay vì string
        items: [
          {
            medicineId: 'MED-001',
            name: 'Thuốc mẫu',
            price: 100000,
            quantity: 1,
          },
        ],
      };

      const dto = plainToInstance(CreateOrderDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'note')).toBe(true);
    });
  });
});
