import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime();
    const rawPath = (req.originalUrl || req.url || '').split('?')[0];

    // Bỏ qua các endpoint nội bộ không cần đo latency
    if (
      rawPath.startsWith('/metrics') ||
      rawPath.startsWith('/health') ||
      rawPath.startsWith('/public') ||
      rawPath === '/favicon.ico'
    ) {
      return next();
    }

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const durationInSeconds = diff[0] + diff[1] / 1e9;

      const normalizedRoute = this.resolveRouteLabel(req, res, rawPath);
      const method = req.method;
      const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';

      this.metricsService.httpRequestDuration.observe(
        { method, route: normalizedRoute, status_code: statusCode },
        durationInSeconds,
      );

      this.metricsService.httpRequestsTotal.inc({
        method,
        route: normalizedRoute,
        status_code: statusCode,
      });
    });

    next();
  }

  /**
   * Xác định nhãn route chuẩn hóa để chặn bùng nổ Cardinality trong Prometheus TSDB:
   * - Ưu tiên route template đã khớp của Express/NestJS (ví dụ: /api/medicines/:id)
   * - Gom các đường dẫn lạ / 404 không khớp route (bot quét) về '/unmatched'
   * - Chuẩn hóa fallback cho các request đi qua middleware trước khi khớp router
   */
  private resolveRouteLabel(req: Request, res: Response, rawPath: string): string {
    const matchedRoutePath = typeof req.route?.path === 'string' ? req.route.path : '';
    if (matchedRoutePath) {
      const baseUrl = req.baseUrl || '';
      return `${baseUrl}${matchedRoutePath}` || '/';
    }

    // Các request 404 hoặc ngoài /api không khớp router được gom về nhãn cố định tránh nổ TSDB
    if (res.statusCode === 404 || !rawPath.startsWith('/api')) {
      return '/unmatched';
    }

    return this.normalizeRoute(rawPath);
  }

  /**
   * Chuẩn hóa URL để gom nhóm các tham số động (tránh nổ Cardinality trong TSDB)
   * Ví dụ:
   * /api/medicines/65f2a1b3c4d5e6f7a8b9c0d1 -> /api/medicines/:id
   * /api/users/123 -> /api/users/:id
   * /api/orders/550e8400-e29b-41d4-a716-446655440000 -> /api/orders/:id
   */
  private normalizeRoute(path: string): string {
    if (!path) return '/';

    return path
      // MongoDB ObjectId (24 ký tự hex)
      .replace(/\/[0-9a-fA-F]{24}(\b|\/)/g, '/:id$1')
      // UUID v4 / chuẩn RFC
      .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\b|\/)/g, '/:id$1')
      // ID dạng số thuần túy
      .replace(/\/\d+(\b|\/)/g, '/:id$1');
  }
}
