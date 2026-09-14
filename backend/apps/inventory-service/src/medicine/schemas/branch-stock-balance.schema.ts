import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'branch_stock_balances' })
export class BranchStockBalance extends Document {
  @Prop({ type: String, required: true, index: true })
  branchId: string; // BR-001, BR-002...

  @Prop({ type: String, required: true, index: true })
  medicineId: string;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalStock: number; // Tổng tồn thực tế sẵn sàng bán = sum(branch_inventories.stock)

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  reservedStock: number; // Số lượng đang giữ chỗ cho đơn online/chờ thanh toán

  @Prop({ type: Number, default: 20 })
  safetyStock: number; // Ngưỡng an toàn tối thiểu cảnh báo hết hàng

  @Prop({ type: String, default: 'IN_STOCK', enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'], index: true })
  status: string;

  @Prop({ type: Date, default: Date.now })
  lastSyncedAt: Date;
}

export const BranchStockBalanceSchema = SchemaFactory.createForClass(BranchStockBalance);

// Index đảm bảo mỗi cặp (branchId, medicineId) là duy nhất (Single Source of Truth)
BranchStockBalanceSchema.index({ branchId: 1, medicineId: 1 }, { unique: true });
BranchStockBalanceSchema.index({ branchId: 1, status: 1 });
