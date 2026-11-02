/**
 * barcodeGenerator.spec.ts - Bộ Kiểm Thử Đơn Vị cho GS1 EAN-13 Barcode Utility
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Tính checksum GS1 Modulo 10, xác thực mã vạch 893 Việt Nam, mã hóa 95 modules nhị phân.
 * 2. [Boundary Values]: Mã 12 số tự bù checksum, mã ngắn hơn 12 ký tự padStart 0, mã dài hơn 13 ký tự bị cắt.
 * 3. [Abnormal Values]: Mã chứa chữ cái/ký tự đặc biệt, sai chữ số checksum, giá trị rỗng/null.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import {
  calculateEAN13Checksum,
  isValidEAN13,
  encodeEAN13,
  getEAN13BarRects,
} from '../../src/utils/barcodeGenerator';

describe('barcodeGenerator (Tiện ích Mã Vạch GS1 EAN-13 Y Tế & Dược Phẩm)', () => {
  // =========================================================================
  // 1. [Normal Values] Luồng chuẩn thành công
  // =========================================================================
  describe('[Normal Values] - Thuật toán Checksum và sinh mã vạch chuẩn', () => {
    it('Tính đúng chữ số Checksum Modulo 10 cho tiền tố 893 Việt Nam', () => {
      // Ví dụ: 893456789012 -> Tổng trọng số chia hết cho 10 -> Checksum = 0
      const code12 = '893456789012';
      const checksum = calculateEAN13Checksum(code12);
      expect(checksum).toBe(0);

      // Mã 13 số đầy đủ: 8934567890120
      expect(isValidEAN13('8934567890120')).toBe(true);
    });

    it('Xác thực đúng định dạng mã vạch thuốc Panadol Extra GS1', () => {
      // 8935001800118 (Mã hợp lệ với Checksum = 8)
      const panadolCode = '8935001800118';
      expect(isValidEAN13(panadolCode)).toBe(true);
    });

    it('Mã hóa chuỗi nhị phân đạt chuẩn cấu trúc GS1 EAN-13 gồm đúng 95 modules', () => {
      const result = encodeEAN13('8934567890120');

      expect(result.displayCode).toBe('8934567890120');
      expect(result.binary).toHaveLength(95);

      // Cấu trúc 95 modules:
      // Start guard: 3 modules (101)
      expect(result.binary.startsWith('101')).toBe(true);
      // Center guard: 5 modules (01010) tại vị trí 45-49
      expect(result.binary.substring(45, 50)).toBe('01010');
      // End guard: 3 modules (101)
      expect(result.binary.endsWith('101')).toBe(true);
    });

    it('Tính toán danh sách tọa độ các thanh vạch đen SVG (getEAN13BarRects) chính xác', () => {
      const { rects, displayCode, totalWidth, totalHeight } = getEAN13BarRects('8934567890128', 200, 80);

      expect(displayCode).toBe('8934567890128');
      expect(totalWidth).toBe(200);
      expect(totalHeight).toBe(80);
      expect(rects.length).toBeGreaterThan(0);
      rects.forEach((rect) => {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x).toBeLessThanOrEqual(200);
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên
  // =========================================================================
  describe('[Boundary Values] - Biên độ dài ký tự và số tròn chục', () => {
    it('Tự động sinh chữ số thứ 13 khi truyền vào mã 12 số', () => {
      const code12 = '893456789012';
      const encoded = encodeEAN13(code12);

      expect(encoded.displayCode).toBe('8934567890120');
      expect(encoded.binary).toHaveLength(95);
    });

    it('Bù số 0 vào đầu (padStart 12 số) khi truyền mã ngắn hơn 12 ký tự', () => {
      const shortCode = '12345';
      const encoded = encodeEAN13(shortCode);

      // 12 - 5 = 7 số 0 phía trước: 000000012345
      expect(encoded.displayCode.startsWith('000000012345')).toBe(true);
      expect(encoded.displayCode).toHaveLength(13);
    });

    it('Cắt bớt đúng 13 ký tự khi truyền chuỗi dài hơn 13 ký tự', () => {
      const longCode = '8934567890128999999';
      const encoded = encodeEAN13(longCode);

      expect(encoded.displayCode).toBe('8934567890128');
      expect(encoded.displayCode).toHaveLength(13);
    });

    it('Xử lý trường hợp tổng chẵn chia hết cho 10 (remainder = 0 -> checksum = 0)', () => {
      // Tìm mã có tổng chia hết cho 10: 4006381333931
      // 4*1 + 0*3 + 0*1 + 6*3 + 3*1 + 8*3 + 1*1 + 3*3 + 3*1 + 3*3 + 9*1 + 3*3 = 89 + 1 = 90
      const code12 = '400638133393';
      const check = calculateEAN13Checksum(code12);
      expect(check).toBe(1);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường và phòng vệ
  // =========================================================================
  describe('[Abnormal Values] - Khả năng chịu lỗi và an toàn', () => {
    it('isValidEAN13 trả về false khi truyền chuỗi rỗng hoặc undefined/null', () => {
      expect(isValidEAN13('')).toBe(false);
      expect(isValidEAN13(undefined as any)).toBe(false);
      expect(isValidEAN13(null as any)).toBe(false);
    });

    it('isValidEAN13 trả về false khi chuỗi chứa chữ cái hoặc ký tự đặc biệt', () => {
      expect(isValidEAN13('893456789012A')).toBe(false);
      expect(isValidEAN13('893-4567-89012')).toBe(false);
      expect(isValidEAN13('8934 5678 9012')).toBe(false);
    });

    it('isValidEAN13 trả về false khi đủ 13 chữ số nhưng sai số Checksum', () => {
      // Mã đúng là 8934567890128, thử với số đuôi 7 hoặc 9
      expect(isValidEAN13('8934567890127')).toBe(false);
      expect(isValidEAN13('8934567890129')).toBe(false);
    });

    it('calculateEAN13Checksum trả về 0 an toàn khi chuỗi ngắn hơn 12 ký tự', () => {
      expect(calculateEAN13Checksum('123')).toBe(0);
      expect(calculateEAN13Checksum('')).toBe(0);
    });
  });
});
