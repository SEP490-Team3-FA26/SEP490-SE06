import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Tọa độ khay 4 cấp gợi ý cho từng dòng nhặt hàng trên phiếu xuất kho
 */
@Schema({ _id: false })
export class DispatchBinLocation {
  @Prop({ type: String, required: true })
  zone: string;

  @Prop({ type: String, required: true })
  rack: string;

  @Prop({ type: Number, required: true })
  shelf: number;

  @Prop({ type: Number, required: true })
  bin: number;

  @Prop({ type: String, default: 'MAIN', enum: ['MAIN', 'RESERVE'] })
  slotType: string;

  /** Mã QR chuẩn định danh khay (VD: BIN-A-A1-S3-B2) */
  @Prop({ type: String, required: true })
  binCode: string;
}
export const DispatchBinLocationSchema = SchemaFactory.createForClass(DispatchBinLocation);

/**
 * Một dòng thuộc Danh sách nhặt hàng (Picking List) do hệ thống sinh theo nguyên tắc FEFO
 */
@Schema({ _id: false })
export class DispatchPickingListItem {
  /** Định danh duy nhất của dòng trong phiếu (hỗ trợ tách 1 thuốc thành nhiều dòng nếu nằm nhiều lô/khay) */
  @Prop({ type: String, required: true })
  lineId: string;

  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  medicineName: string;

  @Prop({ type: String, default: 'Hộp' })
  unit: string;

  /** Mã vạch EAN-13 / GTIN chuẩn của thuốc để đối chiếu nhanh khi quét */
  @Prop({ type: String, default: '' })
  medicineBarcode: string;

  /** Mức kiểm soát đặc biệt (0: thường, >0: gây nghiện / hướng thần / tiền chất / thuốc độc) */
  @Prop({ type: Number, default: 0 })
  specialControlType: number;

  /** ID của bản ghi MedicineBatch gợi ý xuất */
  @Prop({ type: String, required: true })
  batchId: string;

  /** Số lô gợi ý theo FEFO */
  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Date, required: true })
  expDate: Date;

  /** Vị trí khay gợi ý trên sơ đồ kho */
  @Prop({ type: DispatchBinLocationSchema, required: true })
  suggestedLocation: DispatchBinLocation;

  /** Số lượng cần nhặt cho dòng này */
  @Prop({ type: Number, required: true, min: 1 })
  requestedQty: number;

  /** Số lượng ròng đã nhặt hiện tại (sau khi đã trừ các lần trả hàng) */
  @Prop({ type: Number, default: 0, min: 0 })
  pickedQty: number;

  /** Trạng thái xử lý dòng hàng: PENDING | PICKED | SHORTAGE */
  @Prop({ type: String, default: 'PENDING', enum: ['PENDING', 'PICKED', 'SHORTAGE'] })
  itemStatus: string;

  /** Lý do báo thiếu (nếu itemStatus = SHORTAGE) */
  @Prop({ type: String })
  shortageReason?: string;
}
export const DispatchPickingListItemSchema = SchemaFactory.createForClass(DispatchPickingListItem);

/**
 * Nhật ký từng thao tác nhặt hàng bỏ vào giỏ gom (Tote) — bất biến để truy vết GSP
 */
@Schema({ _id: false })
export class DispatchPickRecord {
  @Prop({ type: String, required: true })
  pickId: string;

  @Prop({ type: String, required: true })
  lineId: string;

  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  batchId: string;

  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Date, required: true })
  expDate: Date;

  @Prop({ type: String, required: true })
  binCode: string;

  /** Số lượng đã nhặt ở thao tác này */
  @Prop({ type: Number, required: true, min: 1 })
  qty: number;

  /** Số lượng đã hoàn trả từ thao tác nhặt này (không xóa bản ghi gốc để giữ vết kiểm toán) */
  @Prop({ type: Number, default: 0, min: 0 })
  returnedQty: number;

  @Prop({ type: String, required: true })
  toteCode: string;

  /** Đánh dấu thủ kho có lấy lô khác với gợi ý FEFO ban đầu hay không */
  @Prop({ type: Boolean, default: false })
  isOverride: boolean;

  @Prop({ type: String })
  overrideReason?: string;

  /** true: quét GS1 DataMatrix / mã vạch trực tiếp; false: nhập tay khi tem mờ/rách */
  @Prop({ type: Boolean, default: true })
  gs1Scanned: boolean;

  @Prop({ type: String })
  manualReason?: string;

  @Prop({ type: String })
  rawBarcodeScanned?: string;

  @Prop({ type: String, required: true })
  pickedBy: string;

  @Prop({ type: String })
  pickedByName?: string;

  @Prop({ type: Date, default: Date.now })
  pickedAt: Date;
}
export const DispatchPickRecordSchema = SchemaFactory.createForClass(DispatchPickRecord);

/**
 * Nhật ký hoàn trả hàng về kệ hoặc xử lý hàng hỏng/cách ly khi nhặt hoặc tại cửa bàn giao
 */
@Schema({ _id: false })
export class DispatchReturnLog {
  @Prop({ type: String, required: true })
  returnId: string;

  @Prop({ type: String, required: true })
  pickId: string;

  @Prop({ type: String, required: true })
  lineId: string;

  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  batchId: string;

  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Number, required: true, min: 1 })
  qty: number;

  /** Kết cục xử lý: RESTOCK (hàng tốt trả lại kệ), DAMAGED (rách hỏng chờ hủy), QUARANTINE (cách ly) */
  @Prop({ type: String, required: true, enum: ['RESTOCK', 'DAMAGED', 'QUARANTINE'] })
  outcome: string;

  @Prop({ type: String })
  originalBinCode?: string;

  /** Khay đích được quét lại khi trả hàng RESTOCK */
  @Prop({ type: String })
  targetBinCode?: string;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: String, required: true })
  returnedBy: string;

  @Prop({ type: String })
  returnedByName?: string;

  @Prop({ type: Date, default: Date.now })
  returnedAt: Date;
}
export const DispatchReturnLogSchema = SchemaFactory.createForClass(DispatchReturnLog);

/**
 * Phiếu Xuất Kho Tổng (DispatchOrder) — trung tâm quản lý luồng xuất kho hai giai đoạn
 * Mọi phiếu bắt buộc đi qua PENDING_APPROVAL trước khi thủ kho được vào kệ nhặt hàng.
 */
@Schema({ timestamps: true, collection: 'dispatchorders' })
export class DispatchOrder extends Document {
  /** Mã phiếu chuẩn DO-YYYYMMDD-XXXX */
  @Prop({ type: String, required: true, unique: true, index: true })
  dispatchCode: string;

  /** TRANSFER: Chuyển kho chi nhánh | DISPOSE: Xuất tiêu hủy */
  @Prop({ type: String, required: true, enum: ['TRANSFER', 'DISPOSE'], index: true })
  type: string;

  /** Vòng đời trạng thái chuẩn của Phiếu Xuất Kho */
  @Prop({
    type: String,
    required: true,
    default: 'PENDING_APPROVAL',
    enum: [
      'PENDING_APPROVAL',
      'APPROVED',
      'PICKING',
      'STAGED',
      'DISPATCHED',
      'PARTIALLY_DISPATCHED',
      'CANCELLED',
    ],
    index: true,
  })
  status: string;

  /** Kho nguồn xuất (mặc định Kho Tổng CENTRAL_WH) */
  @Prop({ type: String, default: 'CENTRAL_WH', index: true })
  fromBranchId: string;

  /** ID của PurchaseRequisition gốc (nếu là phiếu TRANSFER) */
  @Prop({ type: String, index: true })
  referenceId?: string;

  /** Mã PR gốc để hiển thị nhanh */
  @Prop({ type: String })
  referenceCode?: string;

  /** Thông tin chi nhánh nhận hàng (nếu TRANSFER) */
  @Prop({ type: String, index: true })
  toBranchId?: string;

  @Prop({ type: String })
  toBranchName?: string;

  /** Mã biên bản hội đồng tiêu hủy (bắt buộc khi type === 'DISPOSE') */
  @Prop({ type: String })
  disposalReportCode?: string;

  /** Liên kết tới StockTransfer tạo ra sau khi xác nhận xuất kho thành công */
  @Prop({ type: String })
  stockTransferId?: string;

  @Prop({ type: String })
  stockTransferCode?: string;

  /** Cờ tự động bật khi phiếu có thuốc kiểm soát đặc biệt (special_control_type > 0) */
  @Prop({ type: Boolean, default: false, index: true })
  hasControlledDrugs: boolean;

  /** User ID và tên người lập phiếu (dùng đối chiếu nguyên tắc 2 người: không tự duyệt) */
  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: String })
  createdByName?: string;

  /** Thông tin phê duyệt hai người */
  @Prop({ type: String })
  approvedBy?: string;

  @Prop({ type: String })
  approvedByName?: string;

  @Prop({ type: String })
  approvedByRole?: string;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: String })
  approvalNote?: string;

  @Prop({ type: String })
  rejectedBy?: string;

  @Prop({ type: String })
  rejectedByName?: string;

  @Prop({ type: Date })
  rejectedAt?: Date;

  @Prop({ type: String })
  rejectedReason?: string;

  /** Danh sách dòng gợi ý nhặt hàng theo FEFO */
  @Prop({ type: [DispatchPickingListItemSchema], default: [] })
  pickingList: DispatchPickingListItem[];

  /** Chi tiết từng lần thủ kho quét mã bỏ vào giỏ */
  @Prop({ type: [DispatchPickRecordSchema], default: [] })
  picks: DispatchPickRecord[];

  /** Lịch sử trả hàng về kệ / hỏng / cách ly */
  @Prop({ type: [DispatchReturnLogSchema], default: [] })
  returnLogs: DispatchReturnLog[];

  /** Mã giỏ gom hàng (Tote) đang gắn chính với phiếu */
  @Prop({ type: String, index: true })
  toteId?: string;

  @Prop({ type: String, index: true })
  toteCode?: string;

  /** Danh sách mã Tote đã dùng cho phiếu (hỗ trợ khi 1 đơn lớn cần nhiều giỏ) */
  @Prop({ type: [String], default: [] })
  toteCodes: string[];

  /** Tổng số lượng ròng đang nằm trong giỏ của phiếu (chỉ hủy phiếu được khi = 0) */
  @Prop({ type: Number, default: 0, min: 0 })
  totalPicked: number;

  /** Cờ đánh dấu phiếu PICKING treo quá 4 giờ không có thao tác mới */
  @Prop({ type: Boolean, default: false, index: true })
  isStale: boolean;

  /** Thời điểm có tương tác PICKING gần nhất (tính mốc 4 giờ cho cronjob isStale) */
  @Prop({ type: Date })
  lastActivityAt?: Date;

  /** Thời điểm tập kết tại khu bàn giao (DISPATCH-AREA-01) */
  @Prop({ type: Date })
  stagedAt?: Date;

  @Prop({ type: String })
  stagedBy?: string;

  /** Thông tin người nhận bàn giao tại cửa xuất (tài xế / biển số xe / đơn vị vận chuyển) */
  @Prop({
    type: {
      driverName: { type: String },
      vehiclePlate: { type: String },
      carrierNote: { type: String },
    },
  })
  handoverRecipient?: {
    driverName: string;
    vehiclePlate?: string;
    carrierNote?: string;
  };

  @Prop({ type: String })
  dispatchedBy?: string;

  @Prop({ type: String })
  dispatchedByName?: string;

  @Prop({ type: Date })
  dispatchedAt?: Date;

  @Prop({ type: String })
  notes?: string;

  /** Trường khóa lạc quan (Optimistic Concurrency Control) chống ghi đè khi cập nhật picks */
  @Prop({ type: Number, default: 0 })
  version: number;
}

export const DispatchOrderSchema = SchemaFactory.createForClass(DispatchOrder);

// Index phục vụ lọc danh sách phiếu theo trạng thái, cờ treo và thời gian tạo
DispatchOrderSchema.index({ status: 1, isStale: 1, lastActivityAt: 1 });
DispatchOrderSchema.index({ referenceId: 1, status: 1 });
DispatchOrderSchema.index({ createdAt: -1 });
