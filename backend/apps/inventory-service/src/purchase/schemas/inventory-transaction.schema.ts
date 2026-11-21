import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'inventorytransactions' })
export class InventoryTransaction extends Document {
  @Prop({
    type: String,
    required: true,
    enum: [
      'GRN_IMPORT',
      'SALE_EXPORT',
      'DISPOSE',
      'TRANSFER',
      'ADJUSTMENT',
      'PICK_RESERVE',
      'PICK_RELEASE',
      'PICK_DAMAGE',
      'DISPATCH',
    ],
  })
  type: string; // Loại biến động kho (bao gồm giữ chỗ, nhả giữ chỗ, hỏng khi nhặt và xuất thực tế)

  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String })
  medicineName: string; // Denormalized

  @Prop({ type: String })
  batchNo: string;

  @Prop({ type: String })
  batchId?: string;

  @Prop({ type: String, index: true })
  branchId?: string;

  @Prop({ type: Number, required: true })
  quantityChange: number; // Dương = nhập, Âm = xuất/hủy

  @Prop({ type: Number, default: 0 })
  stockBefore: number; // Tồn kho trước biến động

  @Prop({ type: Number, default: 0 })
  stockAfter: number; // Tồn kho sau biến động

  @Prop({ type: Number, default: 0 })
  reservedBefore?: number; // Số lượng giữ chỗ trước biến động

  @Prop({ type: Number, default: 0 })
  reservedAfter?: number; // Số lượng giữ chỗ sau biến động

  @Prop({ type: Boolean })
  gs1Scanned?: boolean; // Đánh dấu giao dịch đã qua quét GS1 hay nhập tay

  @Prop({ type: String })
  referenceId: string; // ID của chứng từ liên quan (GRN ID, PO ID, DO ID, etc.)

  @Prop({ type: String })
  referenceType: string; // 'GRN', 'PO', 'SALE', 'DISPATCH_ORDER', etc.

  @Prop({ type: String })
  performedBy: string; // User ID

  @Prop({ type: String })
  notes: string;

  createdAt: Date;
  updatedAt: Date;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);
