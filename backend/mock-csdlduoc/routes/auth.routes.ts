const { Router } = require("express");
import type { Request, Response } from "express";
import { generateMockToken } from "../middleware/auth.middleware";

export const authRouter = Router();

/**
 * @route POST /v2/auth/login
 * @desc Lấy access token bằng Mã số thuế và Mật khẩu (Base64 encoded)
 * @header Content-Type: application/x-www-form-urlencoded
 * @body username=<MÃ_SỐ_THUẾ>
 * @body password=<MẬT_KHẨU_BASE64>
 */
authRouter.post("/login", (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({
      error: "Bad Request",
      message: "Thiếu tham số bắt buộc: username (Mã số thuế) hoặc password (mã hóa Base64)",
      code: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Giải mã mật khẩu Base64 theo quy định đặc tả CSDL Dược Quốc gia
  let decodedPassword = "";
  try {
    decodedPassword = Buffer.from(password, "base64").toString("utf-8");
  } catch (err) {
    res.status(400).json({
      error: "Bad Request",
      message: "Tham số password không đúng định dạng Base64 hợp lệ",
      code: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Trong sandbox chấp nhận đăng nhập với MST hợp lệ (6-14 ký tự số hoặc chuỗi)
  // và password giải mã không được rỗng
  if (decodedPassword.trim().length === 0) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Mật khẩu sau khi giải mã Base64 không hợp lệ",
      code: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Cấp JWT Token
  const accessToken = generateMockToken(username);

  res.status(200).json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600, // 3600 giây (1 giờ)
    scope: "master.read",
    facility_tax_code: username,
    issued_at: new Date().toISOString(),
  });
});
