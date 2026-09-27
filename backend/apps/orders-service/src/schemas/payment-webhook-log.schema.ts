import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentWebhookLogDocument = PaymentWebhookLog & Document;

@Schema({ timestamps: true, collection: 'payment_webhook_logs' })
export class PaymentWebhookLog {
  @Prop({ type: String, required: true, default: 'PAYOS' })
  gatewayProvider: string; // PAYOS | VIETQR | MOMO | VNPAY

  @Prop({ type: String, required: true, index: true })
  transactionId: string; // Mã giao dịch ngân hàng / PayOS reference

  @Prop({ type: Number, required: true, index: true })
  orderCode: number; // Mã đơn hàng

  @Prop({ type: Number, required: true })
  amount: number; // Số tiền thực chuyển

  @Prop({ type: String, default: 'VND' })
  currency: string;

  @Prop({ type: String })
  accountNumber?: string;

  @Prop({ type: String })
  counterAccountBankId?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Date, default: Date.now })
  paymentTime: Date;

  @Prop({ type: Boolean, default: true })
  signatureVerified: boolean;

  @Prop({ type: Object })
  rawPayload: any;

  @Prop({
    type: String,
    enum: ['PROCESSED', 'DUPLICATE', 'INVALID_SIGNATURE', 'FAILED'],
    default: 'PROCESSED',
  })
  processingStatus: string;
}

export const PaymentWebhookLogSchema = SchemaFactory.createForClass(PaymentWebhookLog);
PaymentWebhookLogSchema.index({ gatewayProvider: 1, transactionId: 1 }, { unique: true });
