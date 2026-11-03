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

      const normalizedRoute = this.normalizeRoute(rawPath);
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
   * Chuẩn hóa URL để gom nhóm các tham số ID (tránh nổ Cardinality trong TSDB)
   * Ví dụ:
   * /api/medicines/65f2a1b3c4d5e6f7a8b9c0d1 -> /api/medicines/:id
   * /api/users/123 -> /api/users/:id
   * /api/orders/550e8400-e29b-41d4-a716-446655440000 -> /api/orders/:id
   */
  private normalizeRoute(path: string): string {
    return path
      // MongoDB ObjectId (24 hex characters)
      .replace(/\/[0-9a-fA-F]{24}(\b|\/)/g, '/:id$1')
      // UUID
      .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\b|\/)/g, '/:id$1')
      // Pure numbers (ID dạng số)
      .replace(/\/\d+(\b|\/)/g, '/:id$1');
  }
}
