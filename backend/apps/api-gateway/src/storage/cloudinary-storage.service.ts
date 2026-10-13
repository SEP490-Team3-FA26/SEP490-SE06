import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  fileName: string;
  publicId?: string;
  isCloudinary: boolean;
}

@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  private get cloudName(): string | undefined {
    return process.env.CLOUDINARY_CLOUD_NAME;
  }

  private get apiKey(): string | undefined {
    return process.env.CLOUDINARY_API_KEY;
  }

  private get apiSecret(): string | undefined {
    return process.env.CLOUDINARY_API_SECRET;
  }

  /**
   * Tải ảnh văn bằng / chứng chỉ lên Cloudinary theo cấu trúc thư mục riêng cho từng nhân viên:
   * wdp301/certificates/{branchId}/{userId}/
   * Tự động fallback về lưu ổ đĩa local nếu mất mạng hoặc lỗi Cloudinary.
   */
  async uploadCertificateImage(params: {
    buffer?: Buffer;
    base64?: string;
    filename?: string;
    mimeType?: string;
    userId?: string;
    branchId?: string;
    side?: 'front' | 'back';
  }): Promise<UploadResult> {
    const cloudName = this.cloudName;
    const apiKey = this.apiKey;
    const apiSecret = this.apiSecret;

    // Kiểm tra cấu hình Cloudinary
    if (cloudName && apiKey && apiSecret) {
      try {
        const branchFolder = params.branchId ? params.branchId.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'general';
        const userFolder = params.userId ? params.userId.trim() : 'unknown';
        const targetFolder = `wdp301/certificates/${branchFolder}/${userFolder}`;

        const timestamp = Math.floor(Date.now() / 1000);
        const sidePrefix = params.side || 'cert';
        const customPublicId = `${sidePrefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;

        // Chuẩn bị payload ảnh dưới dạng Data URI
        let dataUri = '';
        if (params.base64) {
          dataUri = params.base64.startsWith('data:')
            ? params.base64
            : `data:${params.mimeType || 'image/jpeg'};base64,${params.base64}`;
        } else if (params.buffer) {
          const mime = params.mimeType || 'image/jpeg';
          dataUri = `data:${mime};base64,${params.buffer.toString('base64')}`;
        }

        if (dataUri) {
          // Ký signature theo chuẩn Cloudinary API: các tham số sắp xếp theo thứ tự bảng chữ cái alphabet
          const paramsToSign: Record<string, string | number> = {
            folder: targetFolder,
            public_id: customPublicId,
            timestamp: timestamp,
          };

          const sortedKeys = Object.keys(paramsToSign).sort();
          const stringToSign = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&') + apiSecret;
          const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

          const formData = new URLSearchParams();
          formData.append('file', dataUri);
          formData.append('api_key', apiKey);
          formData.append('timestamp', timestamp.toString());
          formData.append('folder', targetFolder);
          formData.append('public_id', customPublicId);
          formData.append('signature', signature);

          const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data: any = await response.json();
            this.logger.log(`Tải ảnh lên Cloudinary thành công: ${data.secure_url} (Folder: ${targetFolder})`);
            return {
              url: data.secure_url,
              fileName: `${customPublicId}.${data.format || 'jpg'}`,
              publicId: data.public_id,
              isCloudinary: true,
            };
          } else {
            const errData = await response.text();
            this.logger.warn(`Cloudinary upload HTTP ${response.status} thất bại: ${errData}. Chuyển sang fallback local.`);
          }
        }
      } catch (err: any) {
        this.logger.error(`Lỗi khi gọi Cloudinary API: ${err.message}. Đang kích hoạt fallback lưu local.`);
      }
    }

    // ── FALLBACK AN TOÀN: Lưu vào thư mục ổ cứng local / VPS ──
    return this.fallbackSaveLocal(params);
  }

  /**
   * Lưu ảnh vào ổ đĩa vật lý local
   */
  private fallbackSaveLocal(params: {
    buffer?: Buffer;
    base64?: string;
    filename?: string;
    side?: 'front' | 'back';
  }): UploadResult {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'certificates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = (params.filename?.split('.').pop() || 'jpg').toLowerCase();
    const sidePrefix = params.side || 'cert';
    const fileName = `${sidePrefix}_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    if (params.buffer) {
      fs.writeFileSync(filePath, params.buffer);
    } else if (params.base64) {
      const matches = params.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(params.base64, 'base64');
      }
      fs.writeFileSync(filePath, buffer);
    }

    this.logger.log(`Đã lưu ảnh cục bộ (Local fallback): /public/uploads/certificates/${fileName}`);
    return {
      url: `/public/uploads/certificates/${fileName}`,
      fileName,
      isCloudinary: false,
    };
  }
}
