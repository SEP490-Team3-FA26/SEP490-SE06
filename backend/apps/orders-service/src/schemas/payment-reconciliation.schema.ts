import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentReconciliationDocument = PaymentReconciliation & Document;

@Schema({ timestamps: true, collection: 'payment_reconciliations' })
export class PaymentReconciliation {
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: Number, required: true, index: true })
  orderCode: number;

  @Prop({ type: String, default: 'BR-001', index: true })
  branchId: string;

  @Prop({ type: String })
  cashierId?: string;

  @Prop({ type: Number, required: true })
  expectedAmount: number; // Số tiền cần thu theo bill

  @Prop({ type: Number, required: true })
  actualAmount: number; // Số tiền thực nhận

  @Prop({ type: Number, required: true, default: 0 })
  differenceAmount: number; // expectedAmount - actualAmount

  @Prop({ type: Boolean, default: false })
  toleranceApplied: boolean; // Có áp dụng ngưỡng dung sai (<= 5k) để cho xuất thuốc ngay không

  @Prop({
    type: String,
    enum: [
      'MATCHED',               // Khớp 100%
      'UNDERPAID_TOLERANCE',   // Thiếu nhỏ trong ngưỡng dung sai (đã cho xuất thuốc)
      'UNDERPAID_BLOCKED',     // Thiếu lớn (>5k, chặn xuất thuốc)
      'OVERPAID_CREDITED',     // Thừa tiền (đã cộng điểm thưởng tích lũy cho khách)
      'MANUAL_OVERRIDE',       // Dược sĩ xác nhận khẩn cấp khi mất mạng
      'ORPHAN_PAYMENT',        // Tiền về nhưng không tìm thấy đơn
      'MANUALLY_RESOLVED',     // Kế toán đã xử lý xong
    ],
    default: 'MATCHED',
    index: true,
  })
  status: string;

  @Prop({ type: String })
  bankTransactionId?: string;

  @Prop({ type: String })
  bankCode?: string;

  @Prop({ type: Date, default: Date.now })
  reconciledAt: Date;

  @Prop({ type: String })
  settlementBatchId?: string; // Mã phiên chốt sổ cuối ngày

  @Prop({ type: String })
  resolvedBy?: string; // Kế toán xử lý

  @Prop({ type: String })
  resolutionNotes?: string; // Biên bản giải quyết

  @Prop({ type: Date })
  resolvedAt?: Date;
}

export const PaymentReconciliationSchema = SchemaFactory.createForClass(PaymentReconciliation);
