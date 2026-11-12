/**
 * medicineImageHelper.spec.ts - Bộ Kiểm Thử Đơn Vị Xử Lý Ảnh Thuốc Y Tế Mobile
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Ảnh hợp lệ, danh mục chuẩn (Miếng dán, Kháng sinh, Vitamin), Headers chuẩn CDN.
 * 2. [Boundary Values]: Chuỗi rỗng, khoảng trắng, chữ hoa/thường lộn xộn, null, undefined.
 * 3. [Abnormal Values]: Giao thức không hỗ trợ (ftp://), chuỗi rác, dữ liệu sai kiểu.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import {
  getCategoryFallbackImage,
  getSafeMedicineImageUri,
  getMedicineImageHeaders,
  MEDICINE_CATEGORY_FALLBACKS,
} from '../../src/utils/medicineImageHelper';

describe('medicineImageHelper - Bộ Tiện Ích Xử Lý Ảnh Thuốc Mobile', () => {
  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn & dữ liệu hợp lệ
  // =========================================================================
  describe('1. [Normal Values] - Xử lý ảnh và danh mục chuẩn y tế', () => {
    it('N-01: Phải lấy đúng ảnh fallback theo danh mục Miếng dán / Cao dán', () => {
      const url1 = getCategoryFallbackImage('Miếng dán giảm đau');
      const url2 = getCategoryFallbackImage('Cao dán Salonpas');

      expect(url1).toBe(MEDICINE_CATEGORY_FALLBACKS['miếng dán']);
      expect(url2).toBe(MEDICINE_CATEGORY_FALLBACKS['cao dán']);
    });

    it('N-02: Phải lấy đúng ảnh fallback theo danh mục Kháng sinh & Vitamin', () => {
      const urlAntibiotic = getCategoryFallbackImage('Thuốc kháng sinh đường uống');
      const urlVitamin = getCategoryFallbackImage('Vitamin & Khoáng chất');

      expect(urlAntibiotic).toBe(MEDICINE_CATEGORY_FALLBACKS['kháng sinh']);
      expect(urlVitamin).toBe(MEDICINE_CATEGORY_FALLBACKS['vitamin']);
    });

    it('N-03: Giữ nguyên URI gốc khi là đường dẫn HTTPS hợp lệ từ CDN', () => {
      const rawCdnUri = 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg';
      const result = getSafeMedicineImageUri(rawCdnUri, 'Miếng dán giảm đau');

      expect(result).toBe(rawCdnUri);
    });

    it('N-04: Cung cấp đầy đủ Headers chống chặn Hotlink của Cloudflare và CDN', () => {
      const headers = getMedicineImageHeaders();

      expect(headers).toHaveProperty('Referer', 'https://nhathuoclongchau.com.vn/');
      expect(headers).toHaveProperty('User-Agent');
      expect(headers['User-Agent']).toContain('Mozilla/5.0');
      expect(headers).toHaveProperty('Accept');
      expect(headers['Accept']).toContain('image/');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, khoảng trắng, chữ hoa thường
  // =========================================================================
  describe('2. [Boundary Values] - Kiểm tra giá trị biên & định dạng ký tự', () => {
    it('B-01: Danh mục rỗng hoặc toàn khoảng trắng phải trả về ảnh mặc định', () => {
      expect(getCategoryFallbackImage('')).toBe(MEDICINE_CATEGORY_FALLBACKS['default']);
      expect(getCategoryFallbackImage('   ')).toBe(MEDICINE_CATEGORY_FALLBACKS['default']);
    });

    it('B-02: Danh mục null hoặc undefined phải trả về ảnh mặc định an toàn', () => {
      expect(getCategoryFallbackImage(null)).toBe(MEDICINE_CATEGORY_FALLBACKS['default']);
      expect(getCategoryFallbackImage(undefined)).toBe(MEDICINE_CATEGORY_FALLBACKS['default']);
    });

    it('B-03: Nhận diện chính xác danh mục bất kể chữ HOA, chữ thường hoặc dấu cách thừa', () => {
      const urlUpper = getCategoryFallbackImage('  KHÁNG SINH  ');
      const urlMixed = getCategoryFallbackImage('TiÊu HóA');

      expect(urlUpper).toBe(MEDICINE_CATEGORY_FALLBACKS['kháng sinh']);
      expect(urlMixed).toBe(MEDICINE_CATEGORY_FALLBACKS['tiêu hóa']);
    });

    it('B-04: URI ảnh rỗng hoặc khoảng trắng phải tự động chuyển sang fallback theo danh mục', () => {
      const resultEmpty = getSafeMedicineImageUri('', 'Tiêu hóa');
      const resultSpaces = getSafeMedicineImageUri('   ', 'Vitamin');

      expect(resultEmpty).toBe(MEDICINE_CATEGORY_FALLBACKS['tiêu hóa']);
      expect(resultSpaces).toBe(MEDICINE_CATEGORY_FALLBACKS['vitamin']);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu bất thường, sai giao thức, kiểu dữ liệu lạ
  // =========================================================================
  describe('3. [Abnormal Values] - Xử lý dữ liệu dị thường & tấn công giả mạo', () => {
    it('A-01: URI có giao thức không an toàn hoặc lạ (ftp://, javascript:) phải bị từ chối', () => {
      const ftpUri = 'ftp://malicious-site.com/image.png';
      const jsUri = 'javascript:alert(1)';

      const resultFtp = getSafeMedicineImageUri(ftpUri, 'Giảm đau');
      const resultJs = getSafeMedicineImageUri(jsUri, 'Giảm đau');

      expect(resultFtp).toBe(MEDICINE_CATEGORY_FALLBACKS['giảm đau']);
      expect(resultJs).toBe(MEDICINE_CATEGORY_FALLBACKS['giảm đau']);
    });

    it('A-02: Kiểu dữ liệu không phải chuỗi (số, object, boolean) phải fallback an toàn', () => {
      const resultNumber = getSafeMedicineImageUri(12345 as any, 'Kháng sinh');
      const resultObj = getSafeMedicineImageUri({ url: 'test' } as any, 'Kháng sinh');

      expect(resultNumber).toBe(MEDICINE_CATEGORY_FALLBACKS['kháng sinh']);
      expect(resultObj).toBe(MEDICINE_CATEGORY_FALLBACKS['kháng sinh']);
    });

    it('A-03: Danh mục hoàn toàn không tồn tại trong từ điển phải dùng ảnh mặc định y tế', () => {
      const unknownCategory = 'Danh mục không xác định xyz123';
      const result = getCategoryFallbackImage(unknownCategory);

      expect(result).toBe(MEDICINE_CATEGORY_FALLBACKS['default']);
    });
  });
});
