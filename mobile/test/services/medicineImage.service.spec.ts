/**
 * medicineImage.service.spec.ts - Kiểm Thử Đơn Vị Tầng Dịch Vụ Ảnh Dược Phẩm (Service Layer)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Ảnh hợp lệ từ CDN Long Châu, phân loại đúng danh mục Kháng sinh, Miếng dán, Tiêu hóa.
 * 2. [Boundary Values]: Chuỗi rỗng, khoảng trắng, chữ hoa/thường lẫn lộn, null/undefined.
 * 3. [Abnormal Values]: URI giao thức lạ (ftp://, javascript:), kiểu dữ liệu sai (number, object).
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { MedicineImageService } from '../../src/services/medicineImage.service';

describe('MedicineImageService - Tầng Dịch Vụ Xử Lý Ảnh Thuốc Mobile', () => {
  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn & dữ liệu hợp lệ
  // =========================================================================
  describe('1. [Normal Values] - Xử lý ảnh và danh mục chuẩn y tế', () => {
    it('N-01: Lấy đúng ảnh fallback chuyên khoa cho Cao dán & Miếng dán', () => {
      const patchUrl = MedicineImageService.getFallbackByCategory('Cao dán thảo dược Ecosip');
      const wrapUrl = MedicineImageService.getFallbackByCategory('Miếng dán Tiger Balm');

      expect(patchUrl).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['cao dán']);
      expect(wrapUrl).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['miếng dán']);
    });

    it('N-02: Lấy đúng ảnh fallback chuyên khoa cho Kháng sinh, Tiêu hóa, Vitamin', () => {
      expect(MedicineImageService.getFallbackByCategory('Thuốc kháng sinh')).toBe(
        MedicineImageService.CATEGORY_FALLBACK_MAP['kháng sinh']
      );
      expect(MedicineImageService.getFallbackByCategory('Men vi sinh Tiêu hóa')).toBe(
        MedicineImageService.CATEGORY_FALLBACK_MAP['tiêu hóa']
      );
      expect(MedicineImageService.getFallbackByCategory('Viên sủi Vitamin C')).toBe(
        MedicineImageService.CATEGORY_FALLBACK_MAP['vitamin']
      );
    });

    it('N-03: Giữ nguyên URI gốc hợp lệ từ CDN nhà thuốc', () => {
      const validCdnUri = 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg';
      const resolved = MedicineImageService.resolveSafeUri(validCdnUri, 'Cao dán');

      expect(resolved).toBe(validCdnUri);
    });

    it('N-04: Cung cấp đầy đủ Headers HTTP chuẩn chống chặn Hotlink của Cloudflare', () => {
      const headers = MedicineImageService.getCdnHeaders();

      expect(headers).toHaveProperty('Referer', 'https://nhathuoclongchau.com.vn/');
      expect(headers).toHaveProperty('User-Agent');
      expect(headers['User-Agent']).toContain('Mozilla/5.0');
      expect(headers).toHaveProperty('Accept');
      expect(headers['Accept']).toContain('image/');
    });

    it('N-05: Tự động chuyển đổi ảnh từ CDN Long Châu qua Image Proxy Backend để nén WebP 20KB', () => {
      const cdnUrl = 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429_8cea307452.jpg';
      const proxyUrl = MedicineImageService.getOptimizedThumbnailUri(cdnUrl, 'Cao dán', 300, 'https://abcpharmacy.store');

      expect(proxyUrl).toContain('/api/images/thumbnail?url=');
      expect(proxyUrl).toContain('&w=300');
      expect(proxyUrl).toContain(encodeURIComponent(cdnUrl));
    });

    it('N-06: Tự động dùng fallback baseUrl hoặc setBaseUrl cấu hình môi trường', () => {
      const cdnUrl = 'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg';
      const proxyUrl = MedicineImageService.getOptimizedThumbnailUri(cdnUrl, 'Kháng sinh', 250);

      expect(proxyUrl).toContain('/api/images/thumbnail?url=');
      expect(proxyUrl).toContain('&w=250');

      MedicineImageService.setBaseUrl('http://192.168.1.50:4000');
      const customUrl = MedicineImageService.getOptimizedThumbnailUri(cdnUrl, 'Kháng sinh', 250);
      expect(customUrl).toContain('http://192.168.1.50:4000/api/images/thumbnail?url=');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, khoảng trắng, chữ hoa thường
  // =========================================================================
  describe('2. [Boundary Values] - Kiểm tra giá trị biên & định dạng ký tự', () => {
    it('B-01: Danh mục rỗng hoặc toàn khoảng trắng phải trả về ảnh mặc định y tế', () => {
      expect(MedicineImageService.getFallbackByCategory('')).toBe(
        MedicineImageService.CATEGORY_FALLBACK_MAP['default']
      );
      expect(MedicineImageService.getFallbackByCategory('   ')).toBe(
        MedicineImageService.CATEGORY_FALLBACK_MAP['default']
      );
    });

    it('B-02: Danh mục null hoặc undefined phải trả về ảnh mặc định', () => {
      expect(MedicineImageService.getFallbackByCategory(null)).toBe(
        MedicineImageService.CATEGORY_FALLBACK_MAP['default']
      );
      expect(MedicineImageService.getFallbackByCategory(undefined)).toBe(
        MedicineImageService.CATEGORY_FALLBACK_MAP['default']
      );
    });

    it('B-03: Nhận diện chính xác danh mục bất kể chữ hoa, chữ thường hoặc dấu cách thừa', () => {
      const res1 = MedicineImageService.getFallbackByCategory('   kHÁnG SiNh   ');
      const res2 = MedicineImageService.getFallbackByCategory('TIÊU HÓA');

      expect(res1).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['kháng sinh']);
      expect(res2).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['tiêu hóa']);
    });

    it('B-04: URI ảnh rỗng hoặc khoảng trắng phải tự động chuyển sang fallback theo danh mục', () => {
      const resEmpty = MedicineImageService.resolveSafeUri('', 'Kháng sinh');
      const resSpaces = MedicineImageService.resolveSafeUri('   ', 'Tiêu hóa');

      expect(resEmpty).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['kháng sinh']);
      expect(resSpaces).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['tiêu hóa']);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu bất thường, sai giao thức, kiểu dữ liệu lạ
  // =========================================================================
  describe('3. [Abnormal Values] - Xử lý dữ liệu dị thường & tấn công giả mạo', () => {
    it('A-01: URI có giao thức không an toàn (ftp://, javascript:) phải bị từ chối và fallback', () => {
      const ftpResult = MedicineImageService.resolveSafeUri('ftp://malicious.com/hack.jpg', 'Vitamin');
      const jsResult = MedicineImageService.resolveSafeUri('javascript:alert(1)', 'Vitamin');

      expect(ftpResult).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['vitamin']);
      expect(jsResult).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['vitamin']);
    });

    it('A-02: Kiểu dữ liệu không phải chuỗi (số, object) phải fallback an toàn', () => {
      const numResult = MedicineImageService.resolveSafeUri(99999 as any, 'Giảm đau');
      const objResult = MedicineImageService.resolveSafeUri({ path: '/image' } as any, 'Giảm đau');

      expect(numResult).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['giảm đau']);
      expect(objResult).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['giảm đau']);
    });

    it('A-03: Danh mục không xác định phải trả về ảnh mặc định y tế chuẩn', () => {
      const unknownResult = MedicineImageService.getFallbackByCategory('Thuốc lạ không rõ nguồn gốc 123');
      expect(unknownResult).toBe(MedicineImageService.CATEGORY_FALLBACK_MAP['default']);
    });
  });
});

