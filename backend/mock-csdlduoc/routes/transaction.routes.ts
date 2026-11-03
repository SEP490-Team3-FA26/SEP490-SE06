const { Router } = require("express");
import type { Request, Response } from "express";
import mongoose from "mongoose";

export const transactionRouter = Router();

// Lấy collection từ kết nối hiện tại của Mongoose (nếu kết nối), hoặc fallback in-memory
function getTransactionsCollection() {
  if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db.collection("national_transactions");
  }
  return null;
}

function getFacilitiesCollection() {
  if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db.collection("national_facilities");
  }
  return null;
}

// In-memory fallback nếu chạy offline không kết nối MongoDB
const MEMORY_TRANSACTIONS = new Map<string, any>();

// =========================================================================
// 1. NHẬP HÀNG (STOCK-IN) - MỤC 5.4.1, 5.4.2, 5.4.3
// =========================================================================

/**
 * @route POST /v2/transactions/stock-in
 * @desc Tạo phiếu nhập hàng (Nhập NCC, Nhập điều chuyển từ Kho Tổng, Nhập trả lại...)
 */
transactionRouter.post("/stock-in", async (req: Request, res: Response) => {
  try {
    const {
      transaction_date,
      reason,
      supplier_id,
      source_store_id,
      source_warehouse_id,
      target_store_id,
      target_warehouse_id,
      reference_number,
      practice_license_code,
      note,
      items,
    } = req.body;

    // Validate bắt buộc theo QĐ 232 Mục 5.4.1
    if (!transaction_date || !reason || !reference_number || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: "INVALID_FORMAT",
        error_description: "Dữ liệu thiếu các trường bắt buộc: transaction_date, reason, reference_number, items",
        code: 400,
      });
      return;
    }

    // Validate reason chuẩn Mục 6.4.1
    const validReasons = ["supplier", "return", "opening-balance", "transfer-in", "manufactured", "imported", "other"];
    if (!validReasons.includes(reason)) {
      res.status(400).json({
        error: "INVALID_REASON",
        error_description: `Lý do nhập hàng '${reason}' không hợp lệ theo Từ điển dữ liệu Mục 6.4.1`,
        code: 400,
      });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const transactionId = `TXN-IN-${todayStr}-${randomSuffix}`;

    // Lưu giao dịch
    const txnRecord = {
      transaction_id: transactionId,
      transaction_type: "STOCK_IN",
      transaction_date: transaction_date || new Date().toISOString(),
      reason,
      supplier_id: supplier_id || null,
      source_store_id: source_store_id || null,
      source_warehouse_id: source_warehouse_id || null,
      target_store_id: target_store_id || null,
      target_warehouse_id: target_warehouse_id || null,
      reference_number,
      practice_license_code: practice_license_code || "79-001234",
      facility_code: practice_license_code || "79-001234",
      note: note || "",
      items: items.map((it: any) => ({
        drug_id: it.drug_id,
        unit_id: it.unit_id || "U-01",
        quantity: Number(it.quantity) || 1,
        batch_no: it.batch_no || "LOT-DEFAULT",
        packaging_specifications: it.packaging_specifications || "Hộp",
        expiry_date: it.expiry_date || "2028-12-31",
        manufacturer: it.manufacturer || null,
        gtin: it.gtin || null,
        price: Number(it.price) || 0,
      })),
      status: "accepted", // Mục 6.2: Tiếp nhận ban đầu
      processing_status: "completed", // Xử lý xong
      created_at: new Date(),
    };

    const coll = getTransactionsCollection();
    if (coll) {
      await coll.insertOne(txnRecord);
    } else {
      MEMORY_TRANSACTIONS.set(transactionId, txnRecord);
    }

    res.status(200).json({
      transaction_id: transactionId,
      status: "accepted",
      message: "Phiếu nhập hàng đã được CSDL Dược Quốc gia tiếp nhận vào hàng đợi xử lý",
    });
  } catch (err: any) {
    res.status(500).json({ error: "INTERNAL_ERROR", error_description: err.message });
  }
});

/**
 * @route GET /v2/transaction/stock-in/:transaction_id
 * @desc Xem thông tin chi tiết Phiếu nhập hàng (Mục 5.4.2)
 */
transactionRouter.get("/stock-in/:transaction_id", async (req: Request, res: Response) => {
  const transactionId = req.params.transaction_id;
  const coll = getTransactionsCollection();
  let txn = coll ? await coll.findOne({ transaction_id: transactionId, transaction_type: "STOCK_IN" }) : MEMORY_TRANSACTIONS.get(transactionId);

  if (!txn) {
    res.status(404).json({
      error: "TRANSACTION_NOT_FOUND",
      error_description: `Không tìm thấy phiếu nhập hàng với mã '${transactionId}'`,
    });
    return;
  }

  res.status(200).json(txn);
});

/**
 * @route GET /v2/transaction/stock-in/:transaction_id/status
 * @desc Xem trạng thái xử lý Phiếu nhập hàng (Mục 5.4.3 - Polling status)
 */
transactionRouter.get("/stock-in/:transaction_id/status", async (req: Request, res: Response) => {
  const transactionId = req.params.transaction_id;
  const coll = getTransactionsCollection();
  let txn = coll ? await coll.findOne({ transaction_id: transactionId, transaction_type: "STOCK_IN" }) : MEMORY_TRANSACTIONS.get(transactionId);

  if (!txn) {
    res.status(404).json({
      error: "TRANSACTION_NOT_FOUND",
      error_description: `Không tìm thấy giao dịch với mã '${transactionId}'`,
    });
    return;
  }

  res.status(200).json({
    transaction_id: txn.transaction_id,
    status: txn.processing_status || "completed", // accepted, processing, completed, rejected
    updated_at: new Date().toISOString(),
  });
});

// =========================================================================
// 2. XUẤT HÀNG (STOCK-OUT) - MỤC 5.4.4, 5.4.5, 5.4.6
// =========================================================================

/**
 * @route POST /v2/transactions/stock-out
 * @desc Tạo phiếu xuất hàng (Bán lẻ tại POS, Xuất điều chuyển, Xuất trả NCC, Xuất hủy)
 */
transactionRouter.post("/stock-out", async (req: Request, res: Response) => {
  try {
    const {
      transaction_date,
      reason,
      source_store_id,
      source_warehouse_id,
      target_store_id,
      target_warehouse_id,
      supplier_id,
      reference_number,
      practice_license_code,
      note,
      items,
    } = req.body;

    if (!transaction_date || !reason || !reference_number || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: "INVALID_FORMAT",
        error_description: "Dữ liệu thiếu các trường bắt buộc: transaction_date, reason, reference_number, items",
        code: 400,
      });
      return;
    }

    const validReasons = ["sale-retail", "sale-wholesale", "transfer-out", "return", "recall", "destroy", "other"];
    if (!validReasons.includes(reason)) {
      res.status(400).json({
        error: "INVALID_REASON",
        error_description: `Lý do xuất hàng '${reason}' không hợp lệ theo Từ điển dữ liệu Mục 6.4.2`,
        code: 400,
      });
      return;
    }

    // KIỂM TRA QUY CHUẨN Y TẾ & VI PHẠM (Medical Validation Rule Engine)
    let isViolated = false;
    let violationMessage = "";
    const today = new Date().toISOString().slice(0, 10);

    for (const it of items) {
      // Kiểm tra bán lẻ thuốc hết hạn
      if (reason === "sale-retail" && it.expiry_date && it.expiry_date < today) {
        isViolated = true;
        violationMessage = `Vi phạm pháp luật Dược: Thuốc mã '${it.drug_id}' (Lô: ${it.batch_no}) đã hết hạn sử dụng (${it.expiry_date}) nhưng vẫn xuất bán lẻ!`;
        break;
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const transactionId = `TXN-OUT-${todayStr}-${randomSuffix}`;

    const txnRecord = {
      transaction_id: transactionId,
      transaction_type: "STOCK_OUT",
      transaction_date: transaction_date || new Date().toISOString(),
      reason,
      source_store_id: source_store_id || null,
      source_warehouse_id: source_warehouse_id || null,
      target_store_id: target_store_id || null,
      target_warehouse_id: target_warehouse_id || null,
      supplier_id: supplier_id || null,
      reference_number,
      practice_license_code: practice_license_code || "79-001234",
      facility_code: practice_license_code || "79-001234",
      note: note || "",
      items: items.map((it: any) => ({
        drug_id: it.drug_id,
        unit_id: it.unit_id || "U-01",
        quantity: Number(it.quantity) || 1,
        batch_no: it.batch_no || "LOT-DEFAULT",
        packaging_specifications: it.packaging_specifications || "Hộp",
        expiry_date: it.expiry_date || "2028-12-31",
        manufacturer: it.manufacturer || null,
        gtin: it.gtin || null,
        price: Number(it.price) || 0,
      })),
      status: isViolated ? "rejected" : "accepted",
      processing_status: isViolated ? "rejected" : "completed",
      is_violation: isViolated,
      violation_reason: violationMessage || null,
      created_at: new Date(),
    };

    const coll = getTransactionsCollection();
    if (coll) {
      await coll.insertOne(txnRecord);
    } else {
      MEMORY_TRANSACTIONS.set(transactionId, txnRecord);
    }

    if (isViolated) {
      res.status(200).json({
        transaction_id: transactionId,
        status: "rejected",
        error: "MEDICAL_COMPLIANCE_VIOLATION",
        error_description: violationMessage,
      });
      return;
    }

    res.status(200).json({
      transaction_id: transactionId,
      status: "accepted",
      message: "Phiếu xuất hàng đã được CSDL Dược Quốc gia tiếp nhận vào hàng đợi xử lý",
    });
  } catch (err: any) {
    res.status(500).json({ error: "INTERNAL_ERROR", error_description: err.message });
  }
});

/**
 * @route GET /v2/transactions/stock-out/:transaction_id
 * @desc Xem chi tiết Phiếu xuất hàng (Mục 5.4.5)
 */
transactionRouter.get("/stock-out/:transaction_id", async (req: Request, res: Response) => {
  const transactionId = req.params.transaction_id;
  const coll = getTransactionsCollection();
  let txn = coll ? await coll.findOne({ transaction_id: transactionId, transaction_type: "STOCK_OUT" }) : MEMORY_TRANSACTIONS.get(transactionId);

  if (!txn) {
    res.status(404).json({
      error: "TRANSACTION_NOT_FOUND",
      error_description: `Không tìm thấy phiếu xuất hàng với mã '${transactionId}'`,
    });
    return;
  }

  res.status(200).json(txn);
});

/**
 * @route GET /v2/transactions/stock-out/:transaction_id/status
 * @desc Xem trạng thái xử lý Phiếu xuất hàng (Mục 5.4.6)
 */
transactionRouter.get("/stock-out/:transaction_id/status", async (req: Request, res: Response) => {
  const transactionId = req.params.transaction_id;
  const coll = getTransactionsCollection();
  let txn = coll ? await coll.findOne({ transaction_id: transactionId, transaction_type: "STOCK_OUT" }) : MEMORY_TRANSACTIONS.get(transactionId);

  if (!txn) {
    res.status(404).json({
      error: "TRANSACTION_NOT_FOUND",
      error_description: `Không tìm thấy giao dịch với mã '${transactionId}'`,
    });
    return;
  }

  res.status(200).json({
    transaction_id: txn.transaction_id,
    status: txn.processing_status || (txn.is_violation ? "rejected" : "completed"),
    violation_reason: txn.violation_reason || null,
    updated_at: new Date().toISOString(),
  });
});

// =========================================================================
// 3. KIỂM KHO (STOCK-TAKING) - MỤC 5.4.7, 5.4.8, 5.4.9
// =========================================================================

/**
 * @route POST /v2/transactions/stock-taking
 * @desc Tạo phiếu kiểm kho (Mục 5.4.7)
 */
transactionRouter.post("/stock-taking", async (req: Request, res: Response) => {
  try {
    const {
      transaction_date,
      store_id,
      warehouse_id,
      reference_number,
      practice_license_code,
      note,
      items,
    } = req.body;

    if (!transaction_date || !reference_number || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: "INVALID_FORMAT",
        error_description: "Dữ liệu thiếu các trường bắt buộc: transaction_date, reference_number, items",
        code: 400,
      });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const transactionId = `TXN-ST-${todayStr}-${randomSuffix}`;

    const txnRecord = {
      transaction_id: transactionId,
      transaction_type: "STOCK_TAKING",
      transaction_date: transaction_date || new Date().toISOString(),
      store_id: store_id || null,
      warehouse_id: warehouse_id || null,
      reference_number,
      practice_license_code: practice_license_code || "79-001234",
      facility_code: practice_license_code || "79-001234",
      note: note || "",
      items: items.map((it: any) => ({
        drug_id: it.drug_id,
        unit_id: it.unit_id || "U-01",
        quantity: Number(it.quantity) || Number(it.actual_quantity) || 0,
        batch_no: it.batch_no || "LOT-DEFAULT",
        packaging_specifications: it.packaging_specifications || "Hộp",
        expiry_date: it.expiry_date || "2028-12-31",
        system_quantity: Number(it.system_quantity) || 0,
        actual_quantity: Number(it.actual_quantity) || 0,
        discrepancy: (Number(it.actual_quantity) || 0) - (Number(it.system_quantity) || 0),
        gtin: it.gtin || null,
        price: Number(it.price) || 0,
      })),
      status: "accepted",
      processing_status: "completed",
      created_at: new Date(),
    };

    const coll = getTransactionsCollection();
    if (coll) {
      await coll.insertOne(txnRecord);
    } else {
      MEMORY_TRANSACTIONS.set(transactionId, txnRecord);
    }

    res.status(200).json({
      transaction_id: transactionId,
      status: "accepted",
      message: "Phiếu kiểm kho đã được CSDL Dược Quốc gia tiếp nhận vào hàng đợi xử lý",
    });
  } catch (err: any) {
    res.status(500).json({ error: "INTERNAL_ERROR", error_description: err.message });
  }
});

/**
 * @route GET /v2/transactions/stock-taking/:transaction_id
 * @desc Xem chi tiết Phiếu kiểm kho (Mục 5.4.8)
 */
transactionRouter.get("/stock-taking/:transaction_id", async (req: Request, res: Response) => {
  const transactionId = req.params.transaction_id;
  const coll = getTransactionsCollection();
  let txn = coll ? await coll.findOne({ transaction_id: transactionId, transaction_type: "STOCK_TAKING" }) : MEMORY_TRANSACTIONS.get(transactionId);

  if (!txn) {
    res.status(404).json({
      error: "TRANSACTION_NOT_FOUND",
      error_description: `Không tìm thấy phiếu kiểm kho với mã '${transactionId}'`,
    });
    return;
  }

  res.status(200).json(txn);
});

/**
 * @route GET /v2/transactions/stock-taking/:transaction_id/status
 * @desc Xem trạng thái xử lý Phiếu kiểm kho (Mục 5.4.9)
 */
transactionRouter.get("/stock-taking/:transaction_id/status", async (req: Request, res: Response) => {
  const transactionId = req.params.transaction_id;
  const coll = getTransactionsCollection();
  let txn = coll ? await coll.findOne({ transaction_id: transactionId, transaction_type: "STOCK_TAKING" }) : MEMORY_TRANSACTIONS.get(transactionId);

  if (!txn) {
    res.status(404).json({
      error: "TRANSACTION_NOT_FOUND",
      error_description: `Không tìm thấy giao dịch với mã '${transactionId}'`,
    });
    return;
  }

  res.status(200).json({
    transaction_id: txn.transaction_id,
    status: txn.processing_status || "completed",
    updated_at: new Date().toISOString(),
  });
});

// =========================================================================
// 4. API DÀNH RIÊNG CHO THANH TRA BỘ Y TẾ (MOH_INSPECTOR)
// =========================================================================

/**
 * @route GET /v2/transactions/inspector/dashboard
 * @desc Thống kê sổ cái giám sát toàn quốc (Kho Tổng + Kho Nhánh)
 */
transactionRouter.get("/inspector/dashboard", async (req: Request, res: Response) => {
  try {
    const coll = getTransactionsCollection();
    const facColl = getFacilitiesCollection();

    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalStockTaking = 0;
    let totalViolations = 0;
    let facilities: any[] = [];

    if (coll) {
      totalStockIn = await coll.countDocuments({ transaction_type: "STOCK_IN" });
      totalStockOut = await coll.countDocuments({ transaction_type: "STOCK_OUT" });
      totalStockTaking = await coll.countDocuments({ transaction_type: "STOCK_TAKING" });
      totalViolations = await coll.countDocuments({ is_violation: true });
    }
    if (facColl) {
      facilities = await facColl.find({}).toArray();
    }

    res.status(200).json({
      system: "Hệ thống Giám Sát CSDL Dược Quốc Gia - Bộ Y Tế",
      specification: "Quyết định 232/QĐ-TTYQG (Bản 1.1)",
      timestamp: new Date().toISOString(),
      summary: {
        total_facilities: facilities.length || 5,
        central_warehouses: facilities.filter((f) => f.facility_type === "CENTRAL_WAREHOUSE").length || 1,
        retail_branches: facilities.filter((f) => f.facility_type === "RETAIL_BRANCH").length || 4,
        total_stock_in: totalStockIn,
        total_stock_out: totalStockOut,
        total_stock_taking: totalStockTaking,
        total_violations: totalViolations,
      },
      facilities,
    });
  } catch (err: any) {
    res.status(500).json({ error: "INTERNAL_ERROR", error_description: err.message });
  }
});

/**
 * @route GET /v2/transactions/inspector/transactions
 * @desc Xem toàn bộ sổ cái giao dịch toàn quốc có lọc theo Kho Tổng / Kho Nhánh
 */
transactionRouter.get("/inspector/transactions", async (req: Request, res: Response) => {
  try {
    const { facility_code, type, reason, limit } = req.query;
    const coll = getTransactionsCollection();

    if (!coll) {
      const list = Array.from(MEMORY_TRANSACTIONS.values());
      res.status(200).json({ total: list.length, data: list });
      return;
    }

    const filter: any = {};
    if (facility_code) filter.facility_code = facility_code;
    if (type) filter.transaction_type = type;
    if (reason) filter.reason = reason;

    const maxLimit = Math.min(100, parseInt(limit as string, 10) || 50);
    const txns = await coll.find(filter).sort({ created_at: -1 }).limit(maxLimit).toArray();
    const total = await coll.countDocuments(filter);

    res.status(200).json({ total, data: txns });
  } catch (err: any) {
    res.status(500).json({ error: "INTERNAL_ERROR", error_description: err.message });
  }
});
