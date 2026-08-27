import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;

    this.client = new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis client error: ${err.message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
      return;
    }
    await this.client.set(key, payload);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async rpush(key: string, value: unknown): Promise<number> {
    return this.client.rpush(key, JSON.stringify(value));
  }

  async lpop<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.lpop(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async lindex<T = unknown>(key: string, index: number): Promise<T | null> {
    const value = await this.client.lindex(key, index);
    return value ? (JSON.parse(value) as T) : null;
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
