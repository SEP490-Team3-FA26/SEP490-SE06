import { EventEmitter } from 'events';
import { MetricsMiddleware } from '../../../apps/api-gateway/src/metrics/metrics.middleware';
import { MetricsService } from '../../../apps/api-gateway/src/metrics/metrics.service';

// Lớp giả lập Response hỗ trợ sự kiện finish của Express
class MockResponse extends EventEmitter {
  statusCode = 200;
}

describe('MetricsMiddleware - Chống bùng nổ Cardinality Prometheus [Test-Coupled Mandate]', () => {
  let middleware: MetricsMiddleware;
  let mockMetricsService: {
    httpRequestDuration: { observe: jest.Mock };
    httpRequestsTotal: { inc: jest.Mock };
  };
  let nextFn: jest.Mock;

  beforeEach(() => {
    // Khởi tạo mock MetricsService cho mỗi test case
    mockMetricsService = {
      httpRequestDuration: { observe: jest.fn() },
      httpRequestsTotal: { inc: jest.fn() },
    };
    middleware = new MetricsMiddleware(mockMetricsService as unknown as MetricsService);
    nextFn = jest.fn();
  });

  describe('[Normal Values] - Ghi nhận đúng route template và tham số chuẩn', () => {
    it('phải ưu tiên sử dụng route template của Express/NestJS khi đã khớp router', () => {
      const req: any = {
        method: 'GET',
        originalUrl: '/api/medicines/65f2a1b3c4d5e6f7a8b9c0d1?branch=hn',
        baseUrl: '/api/medicines',
        route: { path: '/:id' },
      };
      const res = new MockResponse();
      res.statusCode = 200;

      middleware.use(req, res as any, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);

      res.emit('finish');

      expect(mockMetricsService.httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api/medicines/:id',
        status_code: '200',
      });
      expect(mockMetricsService.httpRequestDuration.observe).toHaveBeenCalledWith(
        {
          method: 'GET',
          route: '/api/medicines/:id',
          status_code: '200',
        },
        expect.any(Number),
      );
    });

    it('phải chuẩn hóa ObjectId, UUID và số thuần trong fallback khi route chưa gắn vào req.route', () => {
      const req: any = {
        method: 'PUT',
        originalUrl: '/api/orders/550e8400-e29b-41d4-a716-446655440000/items/42',
      };
      const res = new MockResponse();
      res.statusCode = 202;

      middleware.use(req, res as any, nextFn);
      res.emit('finish');

      expect(mockMetricsService.httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'PUT',
        route: '/api/orders/:id/items/:id',
        status_code: '202',
      });
    });
  });

  describe('[Boundary Values] - Giá trị biên & Endpoint nội bộ được miễn đo', () => {
    it('phải bỏ qua không ghi metric cho các endpoint /metrics, /health, /public và /favicon.ico', () => {
      const bypassedPaths = ['/metrics', '/health', '/public/logo.png', '/favicon.ico'];

      for (const path of bypassedPaths) {
        const req: any = { method: 'GET', originalUrl: path };
        const res = new MockResponse();

        middleware.use(req, res as any, nextFn);
        res.emit('finish');
      }

      expect(nextFn).toHaveBeenCalledTimes(bypassedPaths.length);
      expect(mockMetricsService.httpRequestsTotal.inc).not.toHaveBeenCalled();
      expect(mockMetricsService.httpRequestDuration.observe).not.toHaveBeenCalled();
    });

    it('phải xử lý an toàn khi req.route.path là chuỗi rỗng nhưng rawPath là /api', () => {
      const req: any = {
        method: 'GET',
        originalUrl: '/api',
        route: { path: '' },
      };
      const res = new MockResponse();
      res.statusCode = 200;

      middleware.use(req, res as any, nextFn);
      res.emit('finish');

      expect(mockMetricsService.httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api',
        status_code: '200',
      });
    });
  });

  describe('[Abnormal Values] - Chặn bùng nổ Cardinality từ bot quét & đường dẫn 404', () => {
    it('phải gom toàn bộ đường dẫn 404 không khớp router về nhãn cố định /unmatched', () => {
      const scannerPaths = ['/api/wp-login.php', '/api/.env', '/api/unknown-slug-12345'];

      for (const path of scannerPaths) {
        const req: any = { method: 'GET', originalUrl: path };
        const res = new MockResponse();
        res.statusCode = 404;

        middleware.use(req, res as any, nextFn);
        res.emit('finish');
      }

      expect(mockMetricsService.httpRequestsTotal.inc).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        route: '/unmatched',
        status_code: '404',
      });
      expect(mockMetricsService.httpRequestsTotal.inc).toHaveBeenNthCalledWith(3, {
        method: 'GET',
        route: '/unmatched',
        status_code: '404',
      });
    });

    it('phải gom đường dẫn ngoài /api và xử lý an toàn khi originalUrl/url rỗng', () => {
      const req: any = { method: 'POST', url: '' };
      const res = new MockResponse();
      res.statusCode = 0;

      middleware.use(req, res as any, nextFn);
      res.emit('finish');

      expect(mockMetricsService.httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'POST',
        route: '/unmatched',
        status_code: 'unknown',
      });
    });
  });
});
