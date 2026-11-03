import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentVoucherDocument = PaymentVoucher & Document;

@Schema({ collection: 'payment_vouchers', timestamps: true })
export class PaymentVoucher {
  @Prop({ required: true, unique: true })
  voucherCode: string;

  @Prop({ required: true })
  branchId: string;

  @Prop()
  branchName: string;

  @Prop({ required: true, enum: ['SUPPLIER', 'PARTNER', 'OPERATIONAL', 'SALARY', 'OTHER'], default: 'SUPPLIER' })
  recipientType: string;

  @Prop()
  supplierId?: string;

  @Prop()
  supplierName?: string;

  @Prop()
  purchaseOrderId?: string;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true, enum: ['CASH', 'BANK_TRANSFER'], default: 'BANK_TRANSFER' })
  paymentMethod: string;

  @Prop({ enum: ['COMPLETED', 'PENDING', 'CANCELLED'], default: 'COMPLETED' })
  status: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  notes?: string;

  @Prop()
  createdBy?: string;

  @Prop()
  createdByName?: string;

  @Prop({ default: Date.now })
  transactionDate: Date;
}

export const PaymentVoucherSchema = SchemaFactory.createForClass(PaymentVoucher);
