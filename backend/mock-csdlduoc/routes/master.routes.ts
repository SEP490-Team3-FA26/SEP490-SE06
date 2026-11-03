const { Router } = require("express");
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { MOCK_DRUGS, DrugItem } from "../data/drugs.data";
import {
  MASTER_UNITS,
  MASTER_COUNTRIES,
  MASTER_DRUG_GROUPS,
  MASTER_ROUTES,
  MASTER_MANUFACTURERS,
  MASTER_PROVINCES,
  MASTER_COMMUNES,
} from "../data/catalogs.data";

export const masterRouter = Router();

// Helper kiểm tra định dạng YYYY-MM-DD
function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

// Helper phân trang danh sách
function paginate<T>(items: T[], page: number, pageSize: number): { page: number; total: number; data: T[] } {
  const total = items.length;
  const startIndex = (page - 1) * pageSize;
  const data = items.slice(startIndex, startIndex + pageSize);
  return { page, total, data };
}

/**
 * @route GET /v2/master/drugs
 * @desc Lấy danh sách thuốc (Bản đặc tả 1.1 - Quyết định 232/QĐ-TTYQG)
 * @query page (mặc định 1)
 * @query page_size (mặc định 20, tối đa 50)
 * @query last_update_from (YYYY-MM-DD)
 * @query last_update_to (YYYY-MM-DD)
 * @query search (Tùy chọn: tìm tên, hoạt chất, số đăng ký)
 */
masterRouter.get("/drugs", async (req: Request, res: Response): Promise<void> => {
  let page = parseInt(req.query.page as string, 10) || 1;
  let pageSize = parseInt(req.query.page_size as string, 10) || 20;

  if (page < 1) {
    res.status(400).json({
      error: "Bad Request",
      message: "Tham số 'page' phải là số nguyên dương lớn hơn hoặc bằng 1",
      code: 400,
    });
    return;
  }

  if (pageSize < 1 || pageSize > 50) {
    res.status(400).json({
      error: "Bad Request",
      message: "Tham số 'page_size' phải nằm trong khoảng từ 1 đến 50 (mặc định 20, tối đa 50)",
      code: 400,
    });
    return;
  }

  const lastUpdateFrom = req.query.last_update_from as string;
  const lastUpdateTo = req.query.last_update_to as string;
  const search = (req.query.search as string || "").trim().toLowerCase();

  if (lastUpdateFrom && !isValidDate(lastUpdateFrom)) {
    res.status(400).json({
      error: "Bad Request",
      message: "Tham số 'last_update_from' phải có định dạng YYYY-MM-DD",
      code: 400,
    });
    return;
  }

  if (lastUpdateTo && !isValidDate(lastUpdateTo)) {
    res.status(400).json({
      error: "Bad Request",
      message: "Tham số 'last_update_to' phải có định dạng YYYY-MM-DD",
      code: 400,
    });
    return;
  }

  // Kiểm tra kết nối MongoDB collection national_drugs
  const isMongoConnected = mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db;

  if (isMongoConnected) {
    try {
      const coll = mongoose.connection.db.collection("national_drugs");
      const query: any = {};

      if (lastUpdateFrom) {
        query.last_update_time = { ...query.last_update_time, $gte: lastUpdateFrom };
      }
      if (lastUpdateTo) {
        query.last_update_time = { ...query.last_update_time, $lte: lastUpdateTo };
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { active_pharmaceutical_ingredient: { $regex: search, $options: "i" } },
          { registration_number: { $regex: search, $options: "i" } },
          { id: { $regex: search, $options: "i" } },
        ];
      }

      const total = await coll.countDocuments(query);
      const skip = (page - 1) * pageSize;
      const data = await coll.find(query).skip(skip).limit(pageSize).toArray();

      res.status(200).json({ page, total, data });
      return;
    } catch (dbErr) {
      console.warn("Lỗi đọc national_drugs từ MongoDB, fallback sang in-memory:", dbErr);
    }
  }

  let filtered = [...MOCK_DRUGS];

  // Lọc theo khoảng ngày cập nhật
  if (lastUpdateFrom) {
    filtered = filtered.filter((d) => d.last_update_time >= lastUpdateFrom);
  }
  if (lastUpdateTo) {
    filtered = filtered.filter((d) => d.last_update_time <= lastUpdateTo);
  }

  // Lọc tìm kiếm theo tên, hoạt chất, số đăng ký, mã thuốc
  if (search) {
    filtered = filtered.filter((d) => {
      const matchName = d.name.toLowerCase().includes(search);
      const matchApi = d.active_pharmaceutical_ingredient.toLowerCase().includes(search);
      const matchReg = d.registration_number.toLowerCase().includes(search);
      const matchOldReg = (d.old_registration_number || "").toLowerCase().includes(search);
      const matchId = d.id.toLowerCase().includes(search);
      const matchGtin = d.packagings.some((p) => p.gtin.toLowerCase().includes(search));
      return matchName || matchApi || matchReg || matchOldReg || matchId || matchGtin;
    });
  }

  const result = paginate(filtered, page, pageSize);
  res.status(200).json(result);
});

/**
 * @route GET /v2/master/drugs/:drug_id
 * @desc Lấy chi tiết một loại thuốc theo mã định danh hoặc số đăng ký lưu hành
 * @param drug_id (Tối đa 20 ký tự)
 */
masterRouter.get("/drugs/:drug_id", async (req: Request, res: Response): Promise<void> => {
  const drugId = req.params.drug_id;

  if (!drugId || drugId.length > 20) {
    res.status(400).json({
      error: "Bad Request",
      message: "Tham số 'drug_id' không được để trống và tối đa 20 ký tự",
      code: 400,
    });
    return;
  }

  const normalizedKey = drugId.trim().toUpperCase();

  const isMongoConnected = mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db;
  if (isMongoConnected) {
    try {
      const coll = mongoose.connection.db.collection("national_drugs");
      const drug = await coll.findOne({
        $or: [
          { id: { $regex: `^${normalizedKey}$`, $options: "i" } },
          { registration_number: { $regex: `^${normalizedKey}$`, $options: "i" } },
          { old_registration_number: { $regex: `^${normalizedKey}$`, $options: "i" } },
        ],
      });

      if (drug) {
        res.status(200).json(drug);
        return;
      }
    } catch (dbErr) {
      console.warn("Lỗi đọc national_drugs từ MongoDB, fallback in-memory:", dbErr);
    }
  }

  // Fallback in-memory
  const drug = MOCK_DRUGS.find(
    (d) =>
      d.id.toUpperCase() === normalizedKey ||
      d.registration_number.toUpperCase() === normalizedKey ||
      (d.old_registration_number && d.old_registration_number.toUpperCase() === normalizedKey)
  );

  if (!drug) {
    res.status(404).json({
      error: "Not Found",
      message: `Thuốc với mã định danh hoặc số giấy phép lưu hành '${drugId}' không tồn tại trên hệ thống`,
      code: 404,
    });
    return;
  }

  res.status(200).json(drug);
});

/**
 * @route GET /v2/master/units
 * @desc Danh mục đơn vị tính (Hộp, Chai, Vỉ, Viên...)
 */
masterRouter.get("/units", (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.page_size as string, 10) || 20;
  res.status(200).json(paginate(MASTER_UNITS, page, pageSize));
});

/**
 * @route GET /v2/master/countries
 * @desc Danh mục quốc gia
 */
masterRouter.get("/countries", (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.page_size as string, 10) || 20;
  res.status(200).json(paginate(MASTER_COUNTRIES, page, pageSize));
});

/**
 * @route GET /v2/master/drug-groups
 * @desc Danh mục nhóm thuốc
 */
masterRouter.get("/drug-groups", (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.page_size as string, 10) || 20;
  res.status(200).json(paginate(MASTER_DRUG_GROUPS, page, pageSize));
});

/**
 * @route GET /v2/master/routes
 * @desc Danh mục đường dùng
 */
masterRouter.get("/routes", (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.page_size as string, 10) || 20;
  res.status(200).json(paginate(MASTER_ROUTES, page, pageSize));
});

/**
 * @route GET /v2/master/manufacturers
 * @desc Danh mục nhà sản xuất
 */
masterRouter.get("/manufacturers", (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.page_size as string, 10) || 20;
  res.status(200).json(paginate(MASTER_MANUFACTURERS, page, pageSize));
});

/**
 * @route GET /v2/master/provinces
 * @desc Danh mục tỉnh / thành phố
 */
masterRouter.get("/provinces", (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.page_size as string, 10) || 20;
  res.status(200).json(paginate(MASTER_PROVINCES, page, pageSize));
});

/**
 * @route GET /v2/master/communes
 * @desc Danh mục xã / phường (lọc theo province_id)
 * @query province_id
 */
masterRouter.get("/communes", (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.page_size as string, 10) || 20;
  const provinceId = req.query.province_id as string;

  let items = [...MASTER_COMMUNES];
  if (provinceId) {
    items = items.filter((c) => c.province_id === provinceId);
  }

  res.status(200).json(paginate(items, page, pageSize));
});
