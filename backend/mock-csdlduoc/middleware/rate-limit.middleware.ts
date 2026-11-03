import type { Request, Response, NextFunction } from "express";

interface RequestRecord {
  count: number;
  resetTime: number;
}

const requestTracker = new Map<string, RequestRecord>();
const WINDOW_MS = 60 * 1000; // 1 phút
const MAX_REQUESTS = 120; // 120 requests/phút

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();

  let record = requestTracker.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + WINDOW_MS };
    requestTracker.set(ip, record);
  } else {
    record.count++;
  }

  // Set HTTP Rate Limit Headers
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - record.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

  if (record.count > MAX_REQUESTS) {
    res.status(429).json({
      error: "Too Many Requests",
      message: `Vượt quá giới hạn request cho phép (${MAX_REQUESTS} requests/phút) trên môi trường Sandbox.`,
      code: 429,
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
