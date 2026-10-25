import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShiftHandoverDocument = ShiftHandover & Document;

export enum ShiftHandoverStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true, collection: 'shift_handovers' })
export class ShiftHandover extends Document {
  @Prop({ required: true, index: true })
  branchId: string;

  @Prop({ required: true, index: true })
  shiftId: string;

  @Prop({ required: true })
  shiftName: string;

  @Prop({ required: true, index: true })
  handoverDate: string; // YYYY-MM-DD

  // 1. Dược sĩ giao ca & nhận ca
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  outgoingPharmacistId: Types.ObjectId;

  @Prop({ required: true })
  outgoingPharmacistName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  incomingPharmacistId?: Types.ObjectId;

  @Prop({ default: null })
  incomingPharmacistName?: string;

  @Prop({ type: Types.ObjectId, ref: 'Attendance', required: true, index: true })
  attendanceId: Types.ObjectId;

  // 2. Chốt két tiền mặt (Cash Drawer Reconciliation)
  @Prop({ required: true, default: 0 })
  openingFloat: number; // Tiền nhận đầu ca

  @Prop({ required: true, default: 0 })
  systemCashSales: number; // Tiền mặt hệ thống tính từ đơn CASH

  @Prop({ required: true, default: 0 })
  systemDigitalSales: number; // Doanh số PayOS/Thẻ/Chuyển khoản

  @Prop({ required: true, default: 0 })
  systemOrderCount: number; // Tổng số đơn hàng bán trong ca

  @Prop({ default: 0 })
  pettyExpenses: number; // Chi phí khẩn cấp tại quầy (nếu có)

  @Prop({ required: true })
  expectedCashAmount: number; // Tiền lý thuyết = openingFloat + systemCashSales - pettyExpenses

  @Prop({ required: true })
  actualCashAmount: number; // Tiền thực tế dược sĩ đếm được

  @Prop({ required: true, default: 0 })
  cashDiscrepancy: number; // Chênh lệch = actualCashAmount - expectedCashAmount

  @Prop({ default: '' })
  discrepancyReason?: string; // Bắt buộc khi cashDiscrepancy != 0

  // Bảng kê chi tiết mệnh giá tiền mặt VNĐ
  @Prop({
    type: {
      count500k: { type: Number, default: 0 },
      count200k: { type: Number, default: 0 },
      count100k: { type: Number, default: 0 },
      count50k: { type: Number, default: 0 },
      count20k: { type: Number, default: 0 },
      count10k: { type: Number, default: 0 },
      count5k: { type: Number, default: 0 },
      count2k: { type: Number, default: 0 },
      count1k: { type: Number, default: 0 },
    },
    default: {},
  })
  cashDenominations: Record<string, number>;

  // Phân bổ tiền cuối ca
  @Prop({ required: true, default: 0 })
  retainedFloatForNextShift: number; // Tiền lẻ giữ lại két cho ca tiếp theo

  @Prop({ required: true, default: 0 })
  safeDropAmount: number; // Tiền niêm phong nộp két an toàn chi nhánh

  // 3. Bàn giao danh mục thuốc GPP kiểm soát đặc biệt
  @Prop({
    type: [
      {
        medicineId: String,
        medicineName: String,
        unit: String,
        systemStock: Number,
        actualCount: Number,
        isMatched: Boolean,
        note: String,
      },
    ],
    default: [],
  })
  controlledDrugsHandover: Array<{
    medicineId: string;
    medicineName: string;
    unit: string;
    systemStock: number;
    actualCount: number;
    isMatched: boolean;
    note?: string;
  }>;

  // 4. Công việc tồn đọng & Lưu ý ca trực
  @Prop({ default: '' })
  pendingOrdersNote?: string;

  @Prop({ default: '' })
  generalShiftNotes?: string;

  // 5. Trạng thái biên bản
  @Prop({
    required: true,
    enum: ShiftHandoverStatus,
    default: ShiftHandoverStatus.SUBMITTED,
    index: true,
  })
  status: ShiftHandoverStatus;

  @Prop({ default: null })
  submittedAt?: Date;

  @Prop({ default: null })
  acceptedAt?: Date;

  @Prop({ default: '' })
  managerOrPeerNote?: string;
}

export const ShiftHandoverSchema = SchemaFactory.createForClass(ShiftHandover);
ShiftHandoverSchema.index({ branchId: 1, handoverDate: 1 });
ShiftHandoverSchema.index({ outgoingPharmacistId: 1, handoverDate: 1 });
