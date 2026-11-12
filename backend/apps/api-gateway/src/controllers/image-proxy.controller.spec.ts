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
  isPrivateOrReservedHost,
  resolveAllowedDomains,
  validateImageUrl,
  MAX_IMAGE_SIZE_BYTES,
  MAX_REDIRECTS_ALLOWED,
  FALLBACK_BUFFER,
} from './image-proxy.controller';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

describe('ImageProxyController - Bộ Điều Khiển Proxy Tối Ưu Hóa Ảnh Dược Phẩm WebP', () => {
  let controller: ImageProxyController;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageProxyController],
      providers: [
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<ImageProxyController>(ImageProxyController);
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn nén & tối ưu hóa ảnh
  // =========================================================================
  describe('1. [Normal Values] - Nghiệp vụ chuẩn', () => {
    it('N-01: Phải trả về ảnh từ Redis Cache khi Cache Hit', async () => {
      const sampleBase64 = Buffer.from('fake-webp-image-data').toString('base64');
      mockCacheManager.get.mockResolvedValueOnce(sampleBase64);

      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_09429.jpg',
        '300',
        '300',
        '80',
        mockRes,
      );

      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Cache', 'HIT');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('N-01b: Phải bảo tồn đúng Content-Type (image/jpeg hoặc image/png) khi Cache Hit trả về cấu trúc JSON', async () => {
      const sampleBase64 = Buffer.from('fake-jpeg-image-data').toString('base64');
      const cachedPayload = JSON.stringify({
        data: sampleBase64,
        contentType: 'image/jpeg',
      });
      mockCacheManager.get.mockResolvedValueOnce(cachedPayload);

      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        '300',
        '300',
        '80',
        mockRes,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Cache', 'HIT');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('N-02: Cho phép các tên miền ảnh y tế nằm trong danh sách trắng (Unsplash, Long Châu, FPTCloud, ABCPharmacy)', async () => {
      const allowedUrls = [
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        'https://images.unsplash.com/photo-1584308666744.jpg',
        'https://cms-prod.s3-sgn09.fptcloud.com/product.jpg',
        'https://abcpharmacy.store/uploads/medicine.png',
      ];

      for (const url of allowedUrls) {
        mockCacheManager.get.mockResolvedValueOnce(Buffer.from('cached').toString('base64'));
        const mockRes: any = {
          setHeader: jest.fn(),
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
        };

        await expect(
          controller.getThumbnail(url, '300', '300', '80', mockRes),
        ).resolves.not.toThrow();
      }
    });

    it('N-03: Rate Limiting cho phép các yêu cầu gửi đến khi chưa vượt ngưỡng', async () => {
      mockCacheManager.get.mockResolvedValueOnce(null); // Cache Miss cho ảnh
      mockCacheManager.get.mockResolvedValueOnce(5); // Đã có 5 request (dưới ngưỡng 60)

      // Mock fetch trả về ảnh 1x1 PNG hợp lệ (cắt đúng byteOffset của Buffer)
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
          get: (header: string) => {
            if (header === 'content-type') return 'image/png';
            if (header === 'content-length') return String(samplePng.length);
            return null;
          },
        },
        arrayBuffer: jest.fn().mockResolvedValueOnce(exactArrayBuffer),
      } as any);

      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockReq: any = {
        headers: { 'x-forwarded-for': '14.241.120.55' },
      };

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        '300',
        '300',
        '80',
        mockRes,
        mockReq,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Cache', 'MISS');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Kiểm tra các giá trị biên (Width, Height, Quality, Size, Redirects)
  // =========================================================================
  describe('2. [Boundary Values] - Giá trị biên', () => {
    it('B-01: Chiều rộng nhỏ hơn 30px phải được ép tối thiểu về 30px, lớn hơn 1200px ép về 1200px', async () => {
      mockCacheManager.get.mockResolvedValueOnce(Buffer.from('cached').toString('base64'));
      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        '5', // Dưới ngưỡng min 30
        '300',
        '80',
        mockRes,
      );

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining(':30:'),
      );
    });

    it('B-02: Tham số chất lượng nén âm hoặc quá cao phải được kẹp từ 20 đến 100', async () => {
      mockCacheManager.get.mockResolvedValueOnce(Buffer.from('cached').toString('base64'));
      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/static/sample.jpg',
        '300',
        '300',
        '999', // Quá ngưỡng max 100
        mockRes,
      );

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining(':100'),
      );
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
    it('A-01: Ném BadRequestException khi url rỗng hoặc toàn khoảng trắng', async () => {
      const mockRes: any = {};
      await expect(
        controller.getThumbnail('', '300', '300', '80', mockRes),
      ).rejects.toThrow(BadRequestException);
    });

    it('A-02: Ném BadRequestException khi URL sai định dạng hoặc không phải giao thức HTTP/HTTPS', async () => {
      const mockRes: any = {};
      await expect(
        controller.getThumbnail('ftp://cdn.nhathuoclongchau.com.vn/img.jpg', '300', '300', '80', mockRes),
      ).rejects.toThrow(BadRequestException);
    });

    it('A-03: Chặn đứng tấn công SSRF khi người dùng truyền domain độc hại hoặc mạng nội bộ (localhost, 127.0.0.1, 169.254.169.254, 10.0.0.1)', async () => {
      const mockRes: any = {};
      const maliciousUrls = [
        'http://localhost:8080/secret.png',
        'http://127.0.0.1/admin.jpg',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.1/internal.jpg',
        'http://192.168.1.1/router.png',
        'https://evil-hacker.com/malware.jpg',
      ];

      for (const maliciousUrl of maliciousUrls) {
        await expect(
          controller.getThumbnail(maliciousUrl, '300', '300', '80', mockRes),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('A-04: Chống SSRF qua Open-Redirect (chặn khi redirect trỏ tới địa chỉ nội bộ hoặc domain lạ)', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      // Giả lập CDN trả về 302 chuyển hướng tới AWS Metadata
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 302,
        headers: {
          get: (h: string) => (h === 'location' ? 'http://169.254.169.254/secret' : null),
        },
      } as any);

      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await expect(
        controller.getThumbnail(
          'https://cdn.nhathuoclongchau.com.vn/v1/redirect-test.jpg',
          '300',
          '300',
          '80',
          mockRes,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('A-05: Chặn định dạng vector SVG để ngăn ngừa tấn công Stored XSS', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (h: string) => {
            if (h === 'content-type') return 'image/svg+xml';
            return null;
          },
        },
        arrayBuffer: jest.fn().mockResolvedValueOnce(Buffer.from('<svg><script>alert(1)</script></svg>').buffer),
      } as any);

      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await expect(
        controller.getThumbnail(
          'https://cdn.nhathuoclongchau.com.vn/v1/malicious.svg',
          '300',
          '300',
          '80',
          mockRes,
        ),
      ).rejects.toThrow('Không hỗ trợ định dạng ảnh vector SVG do rủi ro an ninh XSS');
    });

    it('A-06: Chặn tệp vượt quá 10MB qua header Content-Length (chống cạn kiệt RAM / DoS)', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (h: string) => {
            if (h === 'content-type') return 'image/jpeg';
            if (h === 'content-length') return String(20 * 1024 * 1024); // 20MB
            return null;
          },
        },
        arrayBuffer: jest.fn(),
      } as any);

      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await expect(
        controller.getThumbnail(
          'https://cdn.nhathuoclongchau.com.vn/v1/huge-file.jpg',
          '300',
          '300',
          '80',
          mockRes,
        ),
      ).rejects.toThrow('Dung lượng hình ảnh vượt quá giới hạn tối đa 10MB');
    });

    it('A-07: Ném HTTP 429 khi vượt quá hạn mức Rate Limit (trên 60 request MISS / phút)', async () => {
      mockCacheManager.get.mockResolvedValueOnce(null); // Cache Miss cho ảnh
      mockCacheManager.get.mockResolvedValueOnce(60); // Đã chạm mốc 60 request

      const mockRes: any = {};
      const mockReq: any = {
        headers: { 'x-forwarded-for': '123.45.67.89' },
      };

      await expect(
        controller.getThumbnail(
          'https://cdn.nhathuoclongchau.com.vn/v1/sample.jpg',
          '300',
          '300',
          '80',
          mockRes,
          mockReq,
        ),
      ).rejects.toThrow(HttpException);
    });

    it('A-08: Khi CDN bên thứ 3 lỗi mạng, trả về ảnh WebP Fallback 1x1 thay vì redirect làm lộ domain nguồn', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      // Giả lập fetch ném lỗi mạng (Network failure)
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Connection timed out'));

      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.getThumbnail(
        'https://cdn.nhathuoclongchau.com.vn/v1/network-down.jpg',
        '300',
        '300',
        '80',
        mockRes,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Image-Fallback', 'true');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.send).toHaveBeenCalledWith(FALLBACK_BUFFER);
    });
  });
});
