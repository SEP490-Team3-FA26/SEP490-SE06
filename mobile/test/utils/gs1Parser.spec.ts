/**
 * gs1Parser.spec.ts - Bộ Kiểm Thử Đơn Vị cho Tiện Ích Bóc Tách GS1 DataMatrix & QR Khay/Tote
 * Tuân thủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
 */

import {
  normalizeGS1ExpiryYYMMDD,
  parseGS1DataMatrix,
  parseBinQRCode,
  parseToteQRCode,
} from '../../src/utils/gs1Parser';

describe('gs1Parser (Bóc tách GS1 DataMatrix, QR Khay Kệ & Giỏ Tote)', () => {
  const refDate = new Date('2026-11-11T10:00:00.000Z');

  // =========================================================================
  // 1. [Normal Values] Định dạng chuẩn quốc tế
  // =========================================================================
  describe('[Normal Values] - Giải mã GS1 có ngoặc, không ngoặc (FNC1) & QR Khay', () => {
    it('Bóc tách chuẩn chuỗi GS1 có dấu ngoặc (01)(17)(10) và khớp EAN-13', () => {
      const parsed = parseGS1DataMatrix('(01)08935001800118(17)271215(10)LOT-DEC-27', refDate);

      expect(parsed.valid).toBe(true);
      expect(parsed.format).toBe('GS1_DATAMATRIX');
      expect(parsed.gtin14).toBe('08935001800118');
      expect(parsed.gtin13).toBe('8935001800118');
      expect(parsed.batchNo).toBe('LOT-DEC-27');
      expect(parsed.expDateISO).toBe('2027-12-15');
      expect(parsed.isExpired).toBe(false);
    });

    it('Bóc tách chuỗi GS1 DataMatrix thô dùng ký tự FNC1 (\\u001D) từ camera', () => {
      const rawWithFnc1 = '010893500653001510LOT-FNC1-01\u001d17280520';
      const parsed = parseGS1DataMatrix(rawWithFnc1, refDate);

      expect(parsed.valid).toBe(true);
      expect(parsed.gtin13).toBe('8935006530015');
      expect(parsed.batchNo).toBe('LOT-FNC1-01');
      expect(parsed.expDateISO).toBe('2028-05-20');
      expect(parsed.isExpired).toBe(false);
    });

    it('Bóc tách chính xác QR Khay (BIN-A-A1-S3-B2) và QR Tote (TOTE-01)', () => {
      const binRes = parseBinQRCode('BIN-A-A1-S3-B2');
      expect(binRes.valid).toBe(true);
      expect(binRes).toMatchObject({ zone: 'A', rack: 'A1', shelf: 3, bin: 2, binCode: 'BIN-A-A1-S3-B2' });

      const toteRes = parseToteQRCode('tote-01');
      expect(toteRes.valid).toBe(true);
      expect(toteRes.toteCode).toBe('TOTE-01');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên: Ngày 00 cuối tháng, năm nhuận & fallback EAN-13
  // =========================================================================
  describe('[Boundary Values] - Ngày 00 cuối tháng, năm nhuận & mã 1D EAN-13', () => {
    it('Chuyển đổi ngày "00" trong GS1 sang đúng ngày cuối tháng (kể cả tháng 2 năm nhuận & thường)', () => {
      // Năm thường 2027 tháng 2 -> 28 ngày
      expect(normalizeGS1ExpiryYYMMDD('270200', refDate)?.iso).toBe('2027-02-28');
      // Năm nhuận 2028 tháng 2 -> 29 ngày
      expect(normalizeGS1ExpiryYYMMDD('280200', refDate)?.iso).toBe('2028-02-29');
      // Tháng 12 -> 31 ngày
      expect(normalizeGS1ExpiryYYMMDD('261200', refDate)?.iso).toBe('2026-12-31');
    });

    it('Đánh dấu isExpired = true khi ngày hết hạn trùng đúng ngày hiện tại hoặc trước đó', () => {
      const parsedToday = parseGS1DataMatrix('(01)08935001800118(17)261111(10)LOT-TODAY', refDate);
      expect(parsedToday.isExpired).toBe(true);
    });

    it('Hỗ trợ fallback khi hộp thuốc chỉ in mã 1D EAN-13 (13 chữ số)', () => {
      const parsed = parseGS1DataMatrix('8935001800118', refDate);
      expect(parsed.valid).toBe(true);
      expect(parsed.format).toBe('EAN13');
      expect(parsed.gtin13).toBe('8935001800118');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu rỗng, sai ngày tháng hoặc sai cấu trúc QR
  // =========================================================================
  describe('[Abnormal Values] - Chuỗi rỗng, ngày 30/02 vô lý & QR rác', () => {
    it('Từ chối an toàn khi truyền chuỗi rỗng, null hoặc undefined', () => {
      expect(parseGS1DataMatrix('').valid).toBe(false);
      expect(parseGS1DataMatrix(null as any).valid).toBe(false);
      expect(parseGS1DataMatrix(undefined as any).valid).toBe(false);
    });

    it('Báo lỗi khi hạn dùng GS1 sai lịch (tháng 13 hoặc 30 tháng 2)', () => {
      expect(normalizeGS1ExpiryYYMMDD('261301', refDate)).toBeNull();
      const badExp = parseGS1DataMatrix('(01)08935001800118(17)260230(10)LOT-ERR', refDate);
      expect(badExp.valid).toBe(false);
    });

    it('Từ chối mã QR Khay và mã Tote sai quy chuẩn đặt tên', () => {
      expect(parseBinQRCode('WRONG-QR-CODE').valid).toBe(false);
      expect(parseToteQRCode('BASKET-99').valid).toBe(false);
    });
  });
});
