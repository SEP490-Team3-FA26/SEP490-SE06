import type { Request, Response, NextFunction } from "express";

// Danh sách các active tokens (trong môi trường mock sandbox)
export const ACTIVE_TOKENS = new Map<string, { username: string; expiresAt: number }>();

export function generateMockToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: username,
      iss: "csdlduoc.com.vn",
      aud: "national-pharmacy-sandbox",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 giờ
      taxCode: username,
    })
  ).toString("base64url");

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const signature = Buffer.from(`mock_sig_${username}_${Date.now()}`).toString("base64url");
  const token = `${header}.${payload}.${signature}`;

  ACTIVE_TOKENS.set(token, {
    username,
    expiresAt: Date.now() + 3600 * 1000,
  });

  return token;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Yêu cầu cung cấp Authorization Bearer Token trong header",
      code: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    res.status(401).json({
      error: "Unauthorized",
      message: "Định dạng Authorization header phải là: Bearer <access_token>",
      code: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = parts[1];
  const tokenData = ACTIVE_TOKENS.get(token);

  // Cho phép token mock tiền tố "mock_token_" hoặc token sinh từ login
  if (!tokenData && !token.startsWith("mock_token_") && !token.includes(".")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Access token không hợp lệ hoặc đã hết hạn",
      code: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (tokenData && tokenData.expiresAt < Date.now()) {
    ACTIVE_TOKENS.delete(token);
    res.status(401).json({
      error: "Unauthorized",
      message: "Access token đã hết hạn. Vui lòng gọi lại POST /v2/auth/login",
      code: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  (req as any).user = tokenData || { username: "CSDL_DUOC_SANDBOX_USER" };
  next();
}
