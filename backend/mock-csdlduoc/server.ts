const express = require("express");
const cors = require("cors");
import type { Request, Response, NextFunction } from "express";
import { authRouter } from "./routes/auth.routes";
import { masterRouter } from "./routes/master.routes";
import { authMiddleware } from "./middleware/auth.middleware";
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware";

const app = express();
const PORT = process.env.CSDLDUOC_MOCK_PORT ? parseInt(process.env.CSDLDUOC_MOCK_PORT, 10) : 4005;

// =========================================================================
// MIDDLEWARE CƠ BẢN
// =========================================================================
app.use(cors());
app.use(express.urlencoded({ extended: true })); // Xử lý x-www-form-urlencoded cho login
app.use(express.json());

// Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[CSDL Dược Sandbox v2] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// Rate limiting middleware
app.use(rateLimitMiddleware);

// =========================================================================
// HEALTH CHECK & DOCUMENTATION DASHBOARD
// =========================================================================
app.get(["/", "/v2", "/v2/health"], (req: Request, res: Response) => {
  res.status(200).json({
    name: "Cơ sở dữ liệu Dược Quốc gia Việt Nam - Mock Sandbox API v2",
    specification: "Quyết định 232/QĐ-TTYQG (Bản 1.1 - 17/07/2026) & Thông tư 11/2025/TT-BYT",
    status: "HEALTHY",
    version: "v2.0.0-sandbox",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: "POST /v2/auth/login (application/x-www-form-urlencoded: username, password)",
      },
      master: {
        drugs: "GET /v2/master/drugs?page=1&page_size=20&last_update_from=2026-07-01&last_update_to=2026-10-04",
        drugDetail: "GET /v2/master/drugs/:drug_id (drug_id hoặc số đăng ký)",
        units: "GET /v2/master/units",
        countries: "GET /v2/master/countries",
        drugGroups: "GET /v2/master/drug-groups",
        routes: "GET /v2/master/routes",
        manufacturers: "GET /v2/master/manufacturers",
        provinces: "GET /v2/master/provinces",
        communes: "GET /v2/master/communes?province_id=79",
      },
    },
    documentation: {
      authNote: "Mật khẩu khi gửi lên POST /v2/auth/login phải mã hóa Base64.",
      bearerAuth: "Các endpoint /v2/master/* yêu cầu header: Authorization: Bearer <access_token>",
      sandboxHotline: "19008255 nhánh 2 - Trung tâm Thông tin Y tế Quốc gia (Bộ Y tế)",
    },
  });
});

// =========================================================================
// ĐỊNH TUYẾN (ROUTING)
// =========================================================================
// Nhóm 1: Xác thực (OAuth2)
app.use("/v2/auth", authRouter);

// Nhóm 2: Dữ liệu Danh mục & Thuốc (Yêu cầu Bearer Token)
app.use("/v2/master", authMiddleware, masterRouter);

// =========================================================================
// XỬ LÝ LỖI (ERROR HANDLING)
// =========================================================================
// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Đường dẫn API '${req.originalUrl}' không tồn tại trên Cổng Sandbox CSDL Dược Quốc gia`,
    code: 404,
    timestamp: new Date().toISOString(),
  });
});

// 500 Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ [Sandbox Error]", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message || "Đã xảy ra lỗi nội bộ trong hệ thống Sandbox",
    code: 500,
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// KHỞI ĐỘNG SERVER
// =========================================================================
export const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` 🚀 CƠ SỞ DỮ LIỆU DƯỢC QUỐC GIA VIỆT NAM - MOCK SANDBOX v2`);
  console.log(` 🏛️  Đặc tả: Quyết định 232/QĐ-TTYQG (v1.1) - Bộ Y Tế`);
  console.log(` 🌐 Base URL: http://localhost:${PORT}/v2`);
  console.log(` 🔑 Login Auth: POST http://localhost:${PORT}/v2/auth/login`);
  console.log(` 💊 Master Drugs: GET http://localhost:${PORT}/v2/master/drugs`);
  console.log(` ⚡ Rate Limit: 120 req/min | Header Bearer OAuth2`);
  console.log(`================================================================`);
});

export default app;
