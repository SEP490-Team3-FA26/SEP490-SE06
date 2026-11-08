/**
 * colors.spec.ts - Bộ Kiểm Thử Hệ Thống Màu Sắc Mobile (Design Tokens & Tailwind Colors)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Luồng chuẩn, bảng màu palette, roles, medical, semantic, gradients đầy đủ.
 * 2. [Boundary Values]: Giá trị biên thang độ (50 -> 900), độ dài mảng gradients, độ tương phản.
 * 3. [Abnormal Values]: Kiểm tra định dạng mã màu HEX hợp lệ, chống null, undefined, mã màu rác.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { colors, palette, roles, medical, semantic, gradients } from '../../../src/theme/colors/index';
const tailwindColors = require('../../../tailwind.colors.js');

// Regex kiểm tra mã màu Hex hợp lệ (#RGB, #RRGB, #RRGGBB, #RRGGBBAA)
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

describe('Hệ Thống Màu Sắc Mobile & Cấu Hình Tailwind (Color Theme System)', () => {

  // =========================================================================
  // 1. [Normal Values] Luồng chuẩn, đầy đủ phân hệ và khóa màu cốt lõi
  // =========================================================================
  describe('[Normal Values] - Kiểm tra tính toàn vẹn và ánh xạ màu sắc chuẩn', () => {
    it('Phân hệ Khách hàng (Customer) phải có màu chủ đạo là tone Xanh Nước Biển', () => {
      expect(roles.customer.primary).toBe('#0284C7'); // Sky-600
      expect(roles.customer.primaryDark).toBe('#0369A1'); // Sky-700
      expect(roles.customer.surface).toBe('#F0F9FF'); // Sky-50
      expect(colors.customer.primary).toBe(roles.customer.primary);
    });

    it('Phân hệ Dược Sĩ (Pharmacist) phải đồng bộ sang tone Xanh Y Tế Auth', () => {
      expect(roles.pharmacist.primary).toBe('#0284C7'); // Sky-600
      expect(roles.pharmacist.surface).toBe('#F0F9FF'); // Sky-50
    });

    it('Phân hệ Thủ Kho (Warehouse) phải đồng bộ sang tone Xanh GSP Auth', () => {
      expect(roles.warehouse.primary).toBe('#0369A1'); // Sky-700
      expect(roles.warehouse.surface).toBe('#F0F9FF'); // Sky-50
    });

    it('Ngữ nghĩa Y tế (Medical) phải hỗ trợ đủ phân loại Rx, OTC, Dị ứng, Chống chỉ định', () => {
      expect(medical.rx.main).toBe('#D97706'); // Kê đơn: Hổ phách
      expect(medical.otc.main).toBe('#0284C7'); // Không kê đơn: Xanh biển
      expect(medical.allergy.main).toBe('#DC2626'); // Dị ứng: Đỏ khẩn cấp
      expect(medical.contraindication.main).toBe('#9333EA'); // Chống chỉ định: Tím
      expect(medical.coldChain.main).toBe('#0891B2'); // Dây chuyền lạnh: Cyan
    });

    it('File cấu hình Tailwind (tailwind.colors.js) phải đồng bộ đầy đủ các role và semantic theo tone Xanh Auth', () => {
      expect(tailwindColors.customer.primary).toBe('#0284C7');
      expect(tailwindColors.pharmacist.primary).toBe('#0284C7');
      expect(tailwindColors.warehouse.primary).toBe('#0369A1');
      expect(tailwindColors.medical.allergy.DEFAULT).toBe('#DC2626');
      expect(tailwindColors.status.success.DEFAULT).toBe('#0284C7');
      expect(tailwindColors.status.danger.DEFAULT).toBe('#DC2626');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên thang độ (50 -> 900) & Kích thước gradients
  // =========================================================================
  describe('[Boundary Values] - Kiểm tra biên thang độ màu và cấu trúc dải chuyển màu', () => {
    it('Thang màu cơ sở (sky, emerald, indigo, slate) phải có đủ mức biên từ 50 đến 900', () => {
      const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
      const palettesToCheck = [palette.sky, palette.emerald, palette.indigo, palette.slate];

      palettesToCheck.forEach((p) => {
        shades.forEach((shade) => {
          expect(p[shade as keyof typeof p]).toBeDefined();
          expect(HEX_COLOR_REGEX.test(p[shade as keyof typeof p])).toBe(true);
        });
      });
    });

    it('Mọi gradient nhận diện thương hiệu phải có tối thiểu 2 điểm dừng màu (stops)', () => {
      expect(gradients.customerHeader.length).toBeGreaterThanOrEqual(2);
      expect(gradients.pharmacistHeader.length).toBeGreaterThanOrEqual(2);
      expect(gradients.warehouseHeader.length).toBeGreaterThanOrEqual(2);
      expect(gradients.aiAssistant.length).toBeGreaterThanOrEqual(2);
      expect(gradients.loyaltyBronze.length).toBeGreaterThanOrEqual(2);
    });

    it('Biên giới hạn độ dài mã màu HEX chuẩn (tối thiểu 4 ký tự, tối đa 9 ký tự)', () => {
      Object.values(roles.customer).forEach((colorVal) => {
        if (typeof colorVal === 'string' && colorVal.startsWith('#')) {
          expect(colorVal.length).toBeGreaterThanOrEqual(4);
          expect(colorVal.length).toBeLessThanOrEqual(9);
        }
      });
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Chống dữ liệu rỗng, mã màu sai định dạng hoặc undefined
  // =========================================================================
  describe('[Abnormal Values] - Kiểm tra chống lỗi định dạng và giá trị rỗng/bất thường', () => {
    it('Không được chứa bất kỳ mã màu rỗng, chuỗi trống hoặc khoảng trắng', () => {
      const validateObject = (obj: Record<string, any>, path = '') => {
        Object.entries(obj).forEach(([key, val]) => {
          const currentPath = `${path}.${key}`;
          if (typeof val === 'string') {
            expect(val.trim().length).toBeGreaterThan(0);
            if (val.startsWith('#')) {
              expect(HEX_COLOR_REGEX.test(val)).toBe(true);
            }
          } else if (typeof val === 'object' && val !== null) {
            validateObject(val, currentPath);
          }
        });
      };

      validateObject(palette, 'palette');
      validateObject(roles, 'roles');
      validateObject(medical, 'medical');
      validateObject(semantic, 'semantic');
    });

    it('Bảo đảm không có khóa màu nào bị undefined hoặc null trong toàn bộ hệ thống colors', () => {
      expect(colors.customer).toBeDefined();
      expect(colors.customer.primary).not.toBeNull();
      expect(colors.customer.surface).not.toBeNull();
      expect(colors.pharmacist).toBeDefined();
      expect(colors.warehouse).toBeDefined();
      expect(colors.admin).toBeDefined();
    });
  });
});

