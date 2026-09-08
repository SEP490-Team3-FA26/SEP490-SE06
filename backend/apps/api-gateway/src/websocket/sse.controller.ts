import { Controller, Sse, Query, Req, Logger, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { SseService } from './sse.service';

@Controller('api/events')
export class SseController {
  private readonly logger = new Logger(SseController.name);

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
}
