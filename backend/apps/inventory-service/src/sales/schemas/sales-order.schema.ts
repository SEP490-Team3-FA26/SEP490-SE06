import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class SalesOrderBatchItem {
  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true, default: 0 })
  importPrice: number;
}
export const SalesOrderBatchItemSchema = SchemaFactory.createForClass(SalesOrderBatchItem);

@Schema({ _id: false })
export class SalesOrderItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number; // Số lượng bán theo đơn vị đã chọn

  @Prop({ type: Number, required: true, min: 0 })
  price: number; // Đơn giá theo đơn vị đã chọn

  @Prop({ type: String, required: true, default: 'Hộp' })
  unit: string; // Đơn vị tính bán: Hộp, Vỉ, Viên, Gói...

  @Prop({ type: Number, default: 1 })
  exchangeValue: number; // Hệ số quy đổi ra đơn vị cơ sở nhỏ nhất

  @Prop({ type: Number, default: 1 })
  baseQuantity: number; // Số lượng quy đổi thực tế bị trừ trong kho

  // --- Nghiệp vụ Phác đồ & Liều dùng ---
  @Prop({ type: Number, default: 1 })
  dosePerTime?: number; // Liều mỗi lần (VD: 1 viên)

  @Prop({ type: Number, default: 2 })
  timesPerDay?: number; // Số lần dùng trong ngày (VD: 2 lần)

  @Prop({ type: Number, default: 2 })
  dailyDose?: number; // Tổng liều trong ngày (VD: 2 viên)

  @Prop({ type: Number, default: 1 })
  durationDays?: number; // Số ngày điều trị (VD: 7 ngày)

  @Prop({ type: String, default: '' })
  dosageInstructions?: string; // Hướng dẫn chi tiết: "Sáng 1 viên, Tối 1 viên sau ăn - Dùng trong 7 ngày"

  @Prop({ type: [SalesOrderBatchItemSchema], required: true })
  batches: SalesOrderBatchItem[];

  @Prop({ type: Number, default: 0 })
  returnedQuantity: number;
}
export const SalesOrderItemSchema = SchemaFactory.createForClass(SalesOrderItem);

@Schema({ timestamps: true, collection: 'salesorders' })
export class SalesOrder extends Document {
  @Prop({ type: String, index: true })
  prescriptionId: string;

  @Prop({ type: String, index: true })
  prescriptionCode: string;

  @Prop({ type: [SalesOrderItemSchema], required: true })
  items: SalesOrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, required: true, default: 'CASH', enum: ['CASH', 'CARD', 'QR_PAY'] })
  paymentMethod: string;

  @Prop({ type: String, required: true, default: 'RETAIL', enum: ['RETAIL', 'PRESCRIPTION', 'WHOLESALE'], index: true })
  type: string;

  @Prop({ type: String })
  patientName: string;

  @Prop({ type: String, index: true })
  patientPhone: string;

  @Prop({ type: String })
  soldBy: string;

  @Prop({ type: String, index: true })
  branchId?: string;

  @Prop({ type: Number, index: true })
  orderCode: number;

  @Prop({ type: Number, default: 0 })
  redeemedPoints?: number;

  @Prop({ type: Number, default: 0 })
  earnedPoints?: number;

  // --- Liên thông Cơ sở Dữ liệu Dược Quốc gia (GPP) ---
  @Prop({ type: String, default: '79-001234' })
  nationalFacilityCode?: string;

  @Prop({ type: String, default: 'SYNCED', enum: ['SYNCED', 'PENDING', 'FAILED', 'NOT_CONFIGURED'], index: true })
  nationalSyncStatus?: string;

  @Prop({ type: String, index: true })
  nationalSyncCode?: string; // VD: DQG-20260825-938210

  @Prop({ type: Date, default: Date.now })
  nationalSyncedAt?: Date;

  @Prop({ type: String, default: 'Đồng bộ thành công lên CSDL Dược Quốc gia (GPP)' })
  nationalSyncMessage?: string;

  // --- Chuẩn Lưu Trữ Dữ Liệu Y Tế 50 Năm & Truy Xuất Nguồn Gốc (Data Retention & Traceability) ---
  @Prop({ type: String, default: 'MEDICAL_50_YEARS_EMR' })
  retentionPolicy?: string;

  @Prop({ type: Number, default: 50 })
  retentionYears?: number;

  @Prop({ type: Date, default: () => new Date(Date.now() + 50 * 365.25 * 24 * 3600 * 1000) })
  retentionExpiresAt?: Date;

  @Prop({ type: String, default: 'HOT', enum: ['HOT', 'WARM', 'COLD_ARCHIVE'], index: true })
  storageTier?: string;

  @Prop({ type: String })
  immutableHash?: string; // SHA-256 Checksum bảo chứng tính toàn vẹn bất biến

  @Prop({ type: Boolean, default: false })
  legalHold?: boolean; // Khóa phong tỏa pháp lý

  @Prop({ type: String, index: true })
  traceabilityId?: string; // Mã định danh phả hệ truy xuất nguồn gốc thuốc

  @Prop({ type: [Object], default: [] })
  returns: any[];

  @Prop({ type: [Object], default: [] })
  exchanges: any[];
}

export const SalesOrderSchema = SchemaFactory.createForClass(SalesOrder);

// Tối ưu hóa Index MongoDB cho SalesOrder
SalesOrderSchema.index({ branchId: 1, createdAt: -1 });
SalesOrderSchema.index({ nationalSyncStatus: 1, createdAt: -1 });
SalesOrderSchema.index({ storageTier: 1, createdAt: -1 });
SalesOrderSchema.index({ retentionExpiresAt: 1 });
