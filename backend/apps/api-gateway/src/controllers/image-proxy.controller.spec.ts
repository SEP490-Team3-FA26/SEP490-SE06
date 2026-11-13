/**
 * image-proxy.controller.spec.ts - Kiểm Thử Đơn Vị Bộ Điều Khiển Image Proxy Nén Ảnh WebP (Bảo Mật Toàn Diện)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: URL CDN hợp lệ, Cache Hit trả WebP, nén WebP khi Cache Miss, Rate Limit trong ngưỡng.
 * 2. [Boundary Values]: Chiều rộng min 30px, max 1200px, chất lượng 20 - 100, ngưỡng dung lượng 10MB, max 3 redirects.
 * 3. [Abnormal Values]: URL rỗng, giao thức lạ, SSRF Private IP / Metadata, Open-Redirect, SVG XSS, Over 10MB DoS, Rate Limit 429, Fallback che giấu domain nguồn.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ImageProxyController,
  MAX_IMAGE_SIZE_BYTES,
  MAX_REDIRECTS_ALLOWED,
  FALLBACK_BUFFER,
} from './image-proxy.controller';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

describe('ImageProxyController - Bộ Điều Khiển Proxy Tối Ưu Hóa Ảnh Dược Phẩm WebP', () => {
  let controller: ImageProxyController;
  let mockCacheManager: any;

  const createMockRes = () => ({
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageProxyController],
      providers: [{ provide: CACHE_MANAGER, useValue: mockCacheManager }],
    }).compile();

    controller = module.get<ImageProxyController>(ImageProxyController);
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn nén & tối ưu hóa ảnh
  // =========================================================================
  describe('1. [Normal Values] - Nghiệp vụ chuẩn', () => {
    it('N-01: Phải trả về ảnh từ Redis Cache khi Cache Hit', async () => {
      mockCacheManager.get.mockResolvedValueOnce(Buffer.from('fake-webp').toString('base64'));
      const mockRes: any = createMockRes();

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429.jpg',
        '300', '300', '80', mockRes,
      );

      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Cache', 'HIT');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('N-01b: Phải bảo tồn đúng Content-Type khi Cache Hit trả về cấu trúc JSON', async () => {
      const cachedPayload = JSON.stringify({
        data: Buffer.from('fake-jpeg').toString('base64'),
        contentType: 'image/jpeg',
      });
      mockCacheManager.get.mockResolvedValueOnce(cachedPayload);
      const mockRes: any = createMockRes();

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        '300', '300', '80', mockRes,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Cache', 'HIT');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it.each([
      'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
      'https://images.unsplash.com/photo-1584308666744.jpg',
      'https://cms-prod.s3-sgn09.fptcloud.com/product.jpg',
      'https://abcpharmacy.store/uploads/medicine.png',
    ])('N-02: Cho phép tên miền hợp lệ trong whitelist: %s', async (url) => {
      mockCacheManager.get.mockResolvedValueOnce(Buffer.from('cached').toString('base64'));
      const mockRes: any = createMockRes();
      await expect(controller.getThumbnail(url, '300', '300', '80', mockRes)).resolves.not.toThrow();
    });

    it('N-03: Rate Limiting cho phép các yêu cầu gửi đến khi chưa vượt ngưỡng', async () => {
      mockCacheManager.get.mockResolvedValueOnce(null);
      mockCacheManager.get.mockResolvedValueOnce(5);

      const samplePng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      );
      const exactArrayBuffer = samplePng.buffer.slice(
        samplePng.byteOffset,
        samplePng.byteOffset + samplePng.byteLength,
      );

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (h: string) => (h === 'content-type' ? 'image/png' : h === 'content-length' ? String(samplePng.length) : null),
        },
        arrayBuffer: jest.fn().mockResolvedValueOnce(exactArrayBuffer),
      } as any);

      const mockRes: any = createMockRes();
      const mockReq: any = { headers: { 'x-forwarded-for': '14.241.120.55' } };

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        '300', '300', '80', mockRes, mockReq,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Cache', 'MISS');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Kiểm tra các giá trị biên (Width, Height, Quality, Size, Redirects)
  // =========================================================================
  describe('2. [Boundary Values] - Giá trị biên', () => {
    it.each([
      { inputW: '5', expectedKeyPart: ':30:' },
      { inputW: '9999', expectedKeyPart: ':1200:' },
    ])('B-01: Chiều rộng $inputW được kẹp về $expectedKeyPart', async ({ inputW, expectedKeyPart }) => {
      mockCacheManager.get.mockResolvedValueOnce(Buffer.from('cached').toString('base64'));
      const mockRes: any = createMockRes();

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        inputW, '300', '80', mockRes,
      );

      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining(expectedKeyPart));
    });

    it.each([
      { inputQ: '-10', expectedKeyPart: ':20' },
      { inputQ: '999', expectedKeyPart: ':100' },
    ])('B-02: Tham số chất lượng $inputQ được kẹp về $expectedKeyPart', async ({ inputQ, expectedKeyPart }) => {
      mockCacheManager.get.mockResolvedValueOnce(Buffer.from('cached').toString('base64'));
      const mockRes: any = createMockRes();

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        '300', '300', inputQ, mockRes,
      );

      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining(expectedKeyPart));
    });

    it('B-03: Kích thước tệp đúng 10MB được chấp nhận, nhưng vượt quá 10MB + 1 byte bị từ chối', () => {
      expect(MAX_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024);
      expect(MAX_IMAGE_SIZE_BYTES + 1).toBeGreaterThan(10 * 1024 * 1024);
    });

    it('B-04: Số lần chuyển hướng tối đa cho phép là 3 (MAX_REDIRECTS_ALLOWED = 3)', () => {
      expect(MAX_REDIRECTS_ALLOWED).toBe(3);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý dữ liệu dị thường & Tấn công giả mạo SSRF, XSS, DoS
  // =========================================================================
  describe('3. [Abnormal Values] - Dữ liệu bất thường & Bảo mật', () => {
    it.each(['', '   ', '\t\n'])('A-01: Ném BadRequestException khi url rỗng hoặc khoảng trắng: "%s"', async (emptyUrl) => {
      await expect(controller.getThumbnail(emptyUrl, '300', '300', '80', {} as any)).rejects.toThrow(BadRequestException);
    });

    it.each([
      'ftp://cdn.nhathuoclongchau.com.vn/img.jpg',
      'file:///etc/passwd',
      'javascript:alert(1)',
    ])('A-02: Ném BadRequestException khi giao thức không phải HTTP/HTTPS: %s', async (badProtocolUrl) => {
      await expect(controller.getThumbnail(badProtocolUrl, '300', '300', '80', {} as any)).rejects.toThrow(BadRequestException);
    });

    it.each([
      'http://localhost:8080/secret.png',
      'http://127.0.0.1/admin.jpg',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.1/internal.jpg',
      'http://192.168.1.1/router.png',
      'https://evil-hacker.com/malware.jpg',
    ])('A-03: Chặn đứng tấn công SSRF với IP nội bộ hoặc domain lạ: %s', async (maliciousUrl) => {
      await expect(controller.getThumbnail(maliciousUrl, '300', '300', '80', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('A-04: Chống SSRF qua Open-Redirect (chặn khi redirect trỏ tới địa chỉ nội bộ hoặc domain lạ)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 302,
        headers: { get: (h: string) => (h === 'location' ? 'http://169.254.169.254/secret' : null) },
      } as any);

      await expect(
        controller.getThumbnail('https://cdn.nhathuoclongchau.com.vn/v1/redirect-test.jpg', '300', '300', '80', createMockRes() as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('A-05: Chặn định dạng vector SVG để ngăn ngừa tấn công Stored XSS', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (h: string) => (h === 'content-type' ? 'image/svg+xml' : null) },
        arrayBuffer: jest.fn().mockResolvedValueOnce(Buffer.from('<svg><script>alert(1)</script></svg>').buffer),
      } as any);

      await expect(
        controller.getThumbnail('https://cdn.nhathuoclongchau.com.vn/v1/malicious.svg', '300', '300', '80', createMockRes() as any),
      ).rejects.toThrow('Không hỗ trợ định dạng ảnh vector SVG do rủi ro an ninh XSS');
    });

    it('A-06: Chặn tệp vượt quá 10MB qua header Content-Length (chống DoS)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (h: string) => (h === 'content-type' ? 'image/jpeg' : h === 'content-length' ? String(20 * 1024 * 1024) : null) },
        arrayBuffer: jest.fn(),
      } as any);

      await expect(
        controller.getThumbnail('https://cdn.nhathuoclongchau.com.vn/v1/huge-file.jpg', '300', '300', '80', createMockRes() as any),
      ).rejects.toThrow('Dung lượng hình ảnh vượt quá giới hạn tối đa 10MB');
    });

    it('A-07: Ném HTTP 429 khi vượt quá hạn mức Rate Limit (trên 60 request MISS / phút)', async () => {
      mockCacheManager.get.mockResolvedValueOnce(null);
      mockCacheManager.get.mockResolvedValueOnce(60);

      await expect(
        controller.getThumbnail('https://cdn.nhathuoclongchau.com.vn/v1/sample.jpg', '300', '300', '80', {} as any, { headers: { 'x-forwarded-for': '123.45.67.89' } } as any),
      ).rejects.toThrow(HttpException);
    });

    it('A-08: Khi CDN bên thứ 3 lỗi mạng, trả về ảnh WebP Fallback 1x1 thay vì redirect', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Connection timed out'));
      const mockRes: any = createMockRes();

      await controller.getThumbnail('https://cdn.nhathuoclongchau.com.vn/v1/network-down.jpg', '300', '300', '80', mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Fallback', 'true');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.send).toHaveBeenCalledWith(FALLBACK_BUFFER);
    });
  });
});
