import {
  Controller,
  Sse,
  Query,
  Req,
  Logger,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { SseService } from './sse.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/**
 * Controller Quản Lý Server-Sent Events (SSE) & Cầu Nối Súng Quét Barcode Wi-Fi (Mobile Scanner Bridge)
 * Cho phép camera điện thoại hoặc app Barcode to PC truyền mã vạch thời gian thực tới màn hình POS.
 */
@ApiTags('📡 Realtime Events & SSE Bridge')
@Controller('api/events')
export class SseController {
  private readonly logger = new Logger(SseController.name);
  // Bộ nhớ đệm kiểm soát tần suất quét (Rate Limiting) chống tấn công Brute-force & DoS
  private readonly scanRateLimits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly sseService: SseService,
    private readonly jwtService: JwtService,
  ) {}

  @Sse('sse')
  streamEvents(
    @Query('token') queryToken: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    const authHeader = req.headers.authorization;
    const token = queryToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    let user = {
      userId: 'anonymous',
      email: 'anonymous@system',
      role: 'guest',
      branchId: undefined,
    };

    if (token) {
      try {
        const decoded = this.jwtService.verify(token);
        user = {
          userId: decoded.sub || decoded._id || decoded.userId,
          email: decoded.email || 'user',
          role: decoded.role || 'guest',
          branchId: decoded.branchId,
        };
      } catch (err) {
        this.logger.warn(`⚠️ [SSE] Invalid token: ${err.message}`);
      }
    }

    const clientStream = this.sseService.registerClient(user);

    // Dọn dẹp khi client ngắt kết nối (đóng tab/trình duyệt)
    req.on('close', () => {
      this.sseService.clientDisconnected(user.email);
    });

    // Heartbeat ping mỗi 25s để giữ kết nối qua Reverse Proxy/Nginx/Cloudflare
    const pingStream = interval(25000).pipe(
      map(() => ({
        type: 'ping',
        data: { timestamp: new Date().toISOString() },
      } as unknown as MessageEvent)),
    );

    return merge(clientStream, pingStream);
  }

  /**
   * Cầu nối nhận mã vạch từ điện thoại di động (Mobile Camera / Barcode to PC Wi-Fi)
   * và phát ngay lập tức tới máy tính Web POS đang mở phiên tương ứng.
   */
  @Post('pos-scanner-bridge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chuyển tiếp mã vạch từ điện thoại di động tới màn hình Web POS' })
  bridgePosScanner(
    @Body() body: { sessionId: string; barcode: string; deviceName?: string; branchId?: string }
  ) {
    if (!body?.barcode || typeof body.barcode !== 'string' || !body.barcode.trim()) {
      throw new BadRequestException('Mã vạch (barcode) không được để trống');
    }
    if (!body?.sessionId || typeof body.sessionId !== 'string' || !body.sessionId.trim()) {
      throw new BadRequestException('Mã phiên làm việc (sessionId) không được để trống');
    }

    const cleanBarcode = body.barcode.trim();
    const cleanSessionId = body.sessionId.trim();
    const deviceName = body.deviceName?.trim() || 'Súng Quét Wi-Fi (Điện Thoại)';

    // 1. Kiểm tra độ dài và định dạng sessionId (tối thiểu 8 ký tự alphanumeric, chống scan ngẫu nhiên)
    if (cleanSessionId.length < 8 || !/^[A-Za-z0-9_-]{8,64}$/.test(cleanSessionId)) {
      throw new BadRequestException('Mã phiên làm việc (sessionId) không đúng định dạng an toàn (tối thiểu 8 ký tự alphanumeric)');
    }

    // 2. Kiểm tra định dạng mã vạch hợp lệ (từ 3 đến 52 ký tự chuẩn EAN/Code-128)
    if (cleanBarcode.length < 3 || cleanBarcode.length > 52 || !/^[A-Za-z0-9_-]+$/.test(cleanBarcode)) {
      throw new BadRequestException('Mã vạch (barcode) không hợp lệ (độ dài 3-52 ký tự chữ, số hoặc gạch nối)');
    }

    // 3. Rate Limiting: Tối đa 50 lượt quét/phút trên mỗi phiên để ngăn chặn flood/DDoS
    const now = Date.now();
    const rateLimit = this.scanRateLimits.get(cleanSessionId);
    if (rateLimit && now < rateLimit.resetAt) {
      if (rateLimit.count >= 50) {
        throw new HttpException('Quá nhiều yêu cầu quét mã vạch liên tục (Rate limit exceeded). Vui lòng thử lại sau giây lát.', HttpStatus.TOO_MANY_REQUESTS);
      }
      rateLimit.count += 1;
    } else {
      this.scanRateLimits.set(cleanSessionId, { count: 1, resetAt: now + 60000 });
    }

    this.logger.log(`📱 [POS Bridge] Đã nhận mã ${cleanBarcode} từ [${deviceName}] cho phiên [${cleanSessionId}]`);

    // Phát sự kiện pos.barcode_received qua SSE toàn hệ thống
    this.sseService.emit('pos.barcode_received', {
      sessionId: cleanSessionId,
      barcode: cleanBarcode,
      deviceName,
      branchId: body.branchId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Đã truyền mã vạch tới màn hình POS thành công',
      barcode: cleanBarcode,
      sessionId: cleanSessionId,
      timestamp: new Date().toISOString(),
    };
  }
}
