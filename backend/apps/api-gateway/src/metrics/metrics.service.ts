import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: client.Registry;

  public readonly httpRequestDuration: client.Histogram<string>;
  public readonly httpRequestsTotal: client.Counter<string>;

  constructor() {
    this.register = new client.Registry();

    // Default Node.js process metrics (RAM heap, event loop lag, CPU, GC)
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'nodejs_',
    });

    // Histogram to measure API Latency
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // 10ms up to 10s
      registers: [this.register],
    });

    // Counter to measure Total HTTP Requests
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests processed',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    // Registry initialized
  }

  public async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  public getContentType(): string {
    return this.register.contentType;
  }
}
