/**
 * image-proxy.util.ts - Bộ Tiện Ích & Cấu Hình An Ninh Cho Image Proxy
 * Chịu trách nhiệm:
 * 1. Chống SSRF: Kiểm tra địa chỉ IP nội bộ, loopback và AWS/GCP/Azure link-local metadata.
 * 2. Xác thực URL hợp lệ với danh sách trắng (whitelist).
 * 3. Chống DoS / OOM: Giới hạn dung lượng tải về 10MB và tối đa 3 lần redirect an toàn.
 * 4. Chống XSS: Kiểm soát MIME types loại trừ SVG.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { BadRequestException } from '@nestjs/common';

// 1. Danh sách trắng tên miền ảnh y tế hợp lệ
export const DEFAULT_ALLOWED_DOMAINS = [
  'cdn.nhathuoclongchau.com.vn',
  'nhathuoclongchau.com.vn',
  'images.unsplash.com',
  'cms-prod.s3-sgn09.fptcloud.com',
  'pharmacity.vn',
  'prod-cdn.pharmacity.io',
  'abcpharmacy.store',
  'cdn.abcpharmacy.store',
  'api.abcpharmacy.store',
];

// 2. Giới hạn dung lượng tối đa cho 1 ảnh tải về (10MB) để chống cạn kiệt RAM (DoS / OOM)
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// 3. Giới hạn số lần chuyển hướng tối đa (chống redirect loop)
export const MAX_REDIRECTS_ALLOWED = 3;

// 4. Các định dạng MIME hợp lệ (chỉ chấp nhận ảnh raster, loại trừ SVG để chống XSS)
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];

// 5. Ảnh WebP 1x1 trong suốt dự phòng (Fallback an toàn khi CDN lỗi, không lộ domain nguồn)
export const FALLBACK_1X1_WEBP_BASE64 =
  'UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAEYCWUAAR4A/vAAAAAA';
export const FALLBACK_BUFFER = Buffer.from(FALLBACK_1X1_WEBP_BASE64, 'base64');

// 6. Cấu hình Rate Limiting (Mặc định 60 requests nén ảnh MISS / phút trên mỗi IP)
export const RATE_LIMIT_PER_MINUTE = 60;

/**
 * Kiểm tra xem địa chỉ IP / Hostname có thuộc dải mạng nội bộ hoặc Loopback hay không (SSRF Prevention)
 */
export function isPrivateOrReservedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // Kiểm tra hostname cục bộ
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]'
  ) {
    return true;
  }

  // Kiểm tra các định dạng IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Regex);
  if (match) {
    const octets = match.slice(1, 5).map(Number);
    if (octets.some((o) => o > 255)) return true; // Octet không hợp lệ

    // 10.0.0.0/8 (Mạng riêng lớp A)
    if (octets[0] === 10) return true;

    // 172.16.0.0 - 172.31.255.255 (Mạng riêng lớp B)
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;

    // 192.168.0.0/16 (Mạng riêng lớp C)
    if (octets[0] === 192 && octets[1] === 168) return true;

    // 127.0.0.0/8 (Loopback)
    if (octets[0] === 127) return true;

    // 169.254.0.0/16 (Link-Local, bao gồm Cloud Metadata 169.254.169.254)
    if (octets[0] === 169 && octets[1] === 254) return true;

    // 0.0.0.0/8 (Địa chỉ khởi tạo / Current network)
    if (octets[0] === 0) return true;

    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  }

  return false;
}

/**
 * Lấy danh sách tên miền hợp lệ bao gồm cấu hình mặc định và biến môi trường
 */
export function resolveAllowedDomains(): string[] {
  const envDomains = (process.env.ALLOWED_IMAGE_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
  return Array.from(new Set([...DEFAULT_ALLOWED_DOMAINS, ...envDomains]));
}

/**
 * Xác thực URL an toàn trước tấn công SSRF & Danh sách trắng
 */
export function validateImageUrl(rawUrl: string, allowedDomains: string[]): URL {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    throw new BadRequestException('Tham số url hình ảnh không được để trống');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new BadRequestException('Định dạng URL hình ảnh không hợp lệ');
  }

  // 1. Chỉ chấp nhận giao thức HTTP và HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Chỉ hỗ trợ giao thức HTTP và HTTPS');
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Chặn đứng địa chỉ IP nội bộ, loopback và metadata service
  if (isPrivateOrReservedHost(hostname)) {
    throw new BadRequestException('Từ chối truy cập địa chỉ IP nội bộ hoặc Loopback (SSRF Protection)');
  }

  // 3. Kiểm tra danh sách trắng
  const isDomainAllowed = allowedDomains.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`),
  );
  if (!isDomainAllowed) {
    throw new BadRequestException(`Tên miền "${hostname}" không nằm trong danh sách cho phép`);
  }

  return parsed;
}

/**
 * Tải ảnh an toàn với cơ chế chặn SSRF qua Open-Redirect và giới hạn dung lượng 10MB
 */
export async function fetchImageSafely(
  initialUrl: string,
  allowedDomains: string[],
): Promise<{ buffer: Buffer; contentType: string }> {
  let currentUrl = initialUrl;
  let redirectHops = 0;

  while (true) {
    // Xác thực an toàn trước mỗi chặng fetch
    validateImageUrl(currentUrl, allowedDomains);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    let originRes: globalThis.Response;
    try {
      originRes = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (ABCPharmacy Image Optimizer Proxy)',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Xử lý chuyển hướng thủ công (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(originRes.status)) {
      redirectHops++;
      if (redirectHops > MAX_REDIRECTS_ALLOWED) {
        throw new BadRequestException('Vượt quá số lần chuyển hướng cho phép (Redirect loop detected)');
      }

      const locationHeader = originRes.headers.get('location');
      if (!locationHeader) {
        throw new BadRequestException('Phản hồi chuyển hướng thiếu tiêu đề Location');
      }

      currentUrl = new URL(locationHeader, currentUrl).toString();
      continue;
    }

    if (!originRes.ok) {
      throw new BadRequestException(`Máy chủ CDN phản hồi trạng thái HTTP ${originRes.status}`);
    }

    // Kiểm tra MIME
    const rawContentType = originRes.headers.get('content-type') || '';
    const contentType = rawContentType.split(';')[0].trim().toLowerCase();

    if (contentType === 'image/svg+xml') {
      throw new BadRequestException('Không hỗ trợ định dạng ảnh vector SVG do rủi ro an ninh XSS');
    }

    const isValidContentType =
      ALLOWED_MIME_TYPES.includes(contentType) || contentType.startsWith('image/');
    if (!isValidContentType) {
      throw new BadRequestException(
        `Định dạng tệp "${contentType || 'unknown'}" không phải hình ảnh raster hợp lệ`,
      );
    }

    // Kiểm tra Content-Length
    const contentLengthHeader = originRes.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (contentLength > MAX_IMAGE_SIZE_BYTES) {
        throw new BadRequestException('Dung lượng hình ảnh vượt quá giới hạn tối đa 10MB');
      }
    }

    const arrayBuffer = await originRes.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Dung lượng hình ảnh vượt quá giới hạn tối đa 10MB');
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  }
}

