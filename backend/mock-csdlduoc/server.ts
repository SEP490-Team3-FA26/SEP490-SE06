const express = require("express");
const cors = require("cors");
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";
import { authRouter } from "./routes/auth.routes";
import { masterRouter } from "./routes/master.routes";
import { transactionRouter } from "./routes/transaction.routes";
import { authMiddleware } from "./middleware/auth.middleware";
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware";
import { getPortalHtml } from "./portal";

// Load .env
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const app = express();
const PORT = process.env.CSDLDUOC_MOCK_PORT ? parseInt(process.env.CSDLDUOC_MOCK_PORT, 10) : 4005;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_ATLAS_URI ||
  "mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0";

// Kết nối MongoDB Atlas cho CSDL Dược Quốc Gia
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ [CSDL Dược Sandbox v2] Đã kết nối thành công MongoDB Atlas (national_drugs, national_transactions, national_facilities)!");
  })
  .catch((err) => {
    console.warn("⚠️ [CSDL Dược Sandbox v2] Không thể kết nối MongoDB, hoạt động ở chế độ in-memory:", err.message);
  });

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
// CỔNG THÔNG TIN WEB (WEB PORTAL HTML - CHUẨN BỘ Y TẾ)
// =========================================================================
app.get("/portal", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(getPortalHtml());
});

// =========================================================================
// HEALTH CHECK & DOCUMENTATION DASHBOARD (19 API THEO QĐ 232/QĐ-TTYQG)
// =========================================================================
app.get(["/", "/v2", "/v2/health"], (req: Request, res: Response) => {
  if (req.path === "/" && req.accepts("html")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(getPortalHtml());
  }

  res.status(200).json({
    name: "Cơ sở dữ liệu Dược Quốc gia Việt Nam - Mock Sandbox API v2",
    specification: "Quyết định 232/QĐ-TTYQG (Bản 1.1 - 17/07/2026) & Thông tư 11/2025/TT-BYT",
    status: "HEALTHY",
    version: "v2.0.0-sandbox",
    total_apis: 19,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: "POST /v2/auth/login (application/x-www-form-urlencoded: username, password)",
      },
      master_catalogs: {
        units: "GET /v2/master/units",
        countries: "GET /v2/master/countries",
        drugGroups: "GET /v2/master/drug-groups",
        routes: "GET /v2/master/routes",
        manufacturers: "GET /v2/master/manufacturers",
        provinces: "GET /v2/master/provinces",
        communes: "GET /v2/master/communes?province_id=79",
      },
      master_drugs: {
        drugsList: "GET /v2/master/drugs?page=1&page_size=20&last_update_from=2026-07-01&last_update_to=2026-10-07",
        drugDetail: "GET /v2/master/drugs/:drug_id (drug_id hoặc số đăng ký lưu hành)",
      },
      transactions: {
        stockInCreate: "POST /v2/transactions/stock-in (reason: supplier, transfer-in, return...)",
        stockInDetail: "GET /v2/transaction/stock-in/:transaction_id",
        stockInStatus: "GET /v2/transaction/stock-in/:transaction_id/status",
        stockOutCreate: "POST /v2/transactions/stock-out (reason: sale-retail, transfer-out, return, destroy...)",
        stockOutDetail: "GET /v2/transactions/stock-out/:transaction_id",
        stockOutStatus: "GET /v2/transactions/stock-out/:transaction_id/status",
        stockTakingCreate: "POST /v2/transactions/stock-taking (system_quantity vs actual_quantity)",
        stockTakingDetail: "GET /v2/transactions/stock-taking/:transaction_id",
        stockTakingStatus: "GET /v2/transactions/stock-taking/:transaction_id/status",
      },
      inspector: {
        dashboard: "GET /v2/transactions/inspector/dashboard (Sổ cái giám sát toàn quốc)",
        transactions: "GET /v2/transactions/inspector/transactions (Tra cứu giao dịch)",
      },
    },
    documentation: {
      authNote: "Mật khẩu khi gửi lên POST /v2/auth/login phải mã hóa Base64.",
      bearerAuth: "Các endpoint /v2/master/* và /v2/transactions/* yêu cầu header: Authorization: Bearer <access_token>",
      sandboxHotline: "19008255 nhánh 2 - Trung tâm Thông tin Y tế Quốc gia (Bộ Y tế)",
    },
  });
});

// =========================================================================
// ĐỊNH TUYẾN (ROUTING) - 19 API CHUẨN QĐ 232
// =========================================================================
// Nhóm 1: Xác thực (OAuth2)
app.use("/v2/auth", authRouter);

// Nhóm 2 & 3: Dữ liệu Danh mục & Thuốc (Yêu cầu Bearer Token)
app.use("/v2/master", authMiddleware, masterRouter);

// Nhóm 4: Giao Dịch Nhập - Xuất - Kiểm kho & Giám Sát Thanh Tra
app.use("/v2/transactions", authMiddleware, transactionRouter);
// Endpoint tương thích cho Mục 5.4.2 và 5.4.3 (đường dẫn số ít /transaction/stock-in)
app.use("/v2/transaction", authMiddleware, transactionRouter);

// =========================================================================
// XỬ LÝ LỖI (ERROR HANDLING)
// =========================================================================
// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "NOT_FOUND",
    error_description: `Đường dẫn API '${req.originalUrl}' không tồn tại trên Cổng Sandbox CSDL Dược Quốc gia`,
    code: 404,
    timestamp: new Date().toISOString(),
  });
});

// 500 Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ [Sandbox Error]", err);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    error_description: err.message || "Đã xảy ra lỗi nội bộ trong hệ thống Sandbox CSDL Dược Quốc gia",
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
  console.log(` 🏛️  Đặc tả: Quyết định 232/QĐ-TTYQG (Bản 1.1) - Bộ Y Tế`);
  console.log(` 🌐 Base URL: http://localhost:${PORT}/v2`);
  console.log(` 🔑 Login Auth: POST http://localhost:${PORT}/v2/auth/login`);
  console.log(` 💊 Master Drugs: GET http://localhost:${PORT}/v2/master/drugs (2.331 thuốc)`);
  console.log(` 📦 Transactions: POST http://localhost:${PORT}/v2/transactions/stock-in | stock-out | stock-taking`);
  console.log(` 🛡️  Inspector: GET http://localhost:${PORT}/v2/transactions/inspector/dashboard`);
  console.log(` ⚡ Rate Limit: 120 req/min | Header Bearer OAuth2`);
  console.log(`================================================================`);
});

export default app;
