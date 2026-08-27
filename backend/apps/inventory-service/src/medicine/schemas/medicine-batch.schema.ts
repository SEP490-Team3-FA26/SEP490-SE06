import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'medicinebatches' })
export class MedicineBatch extends Document {
  @Prop({ type: String, required: true, index: true })
  medicineId: string;

  @Prop({ type: String, default: 'CENTRAL_WH', index: true })
  branchId: string;

  @Prop({ type: String, required: true, index: true })
  batchNo: string;

  @Prop({ type: Date, required: true, index: true })
  expDate: Date;

  @Prop({ type: Number, required: true, default: 0, min: 0, index: true })
  stock: number; // Tổng tồn kho quy đổi theo đơn vị nhỏ nhất

  @Prop({ type: Number, default: 0, min: 0 })
  openedStock: number; // Số lượng lẻ trong hộp đang mở dở của lô này

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  importPrice: number;

  @Prop({ type: String, default: 'ACTIVE', enum: ['ACTIVE', 'EXPIRED'], index: true })
  status: string;
}

export const MedicineBatchSchema = SchemaFactory.createForClass(MedicineBatch);

// Tối ưu hóa Index MongoDB cho truy vấn FIFO và kiểm kê lô hàng nhanh
MedicineBatchSchema.index({ branchId: 1, medicineId: 1, status: 1, expDate: 1 });
MedicineBatchSchema.index({ expDate: 1, status: 1 });
