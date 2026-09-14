import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'branch_inventories' })
export class BranchInventory extends Document {
  @Prop({ type: String, required: true, index: true })
  branchId: string; // ID chi nhánh: BR-001, BR-002... (Không bao giờ là CENTRAL_WH)

  @Prop({ type: String, required: true, index: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Date, required: true, index: true })
  expDate: Date;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  stock: number; // Tổng tồn kho lô tại chi nhánh (quy đổi theo đơn vị nhỏ nhất)

  @Prop({ type: Number, default: 0, min: 0 })
  openedStock: number; // Số lượng lẻ trong hộp đang mở dở tại quầy

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  importPrice: number;

  @Prop({ type: String, default: 'ACTIVE', enum: ['ACTIVE', 'EXPIRED', 'DISPOSED'], index: true })
  status: string;

  @Prop({
    type: {
      cabinet: { type: String, default: 'Tủ 1' },
      shelf: { type: String, default: 'Ngăn A' },
      bin: { type: String, default: 'Khay 1' },
    },
    default: () => ({ cabinet: 'Tủ 1', shelf: 'Ngăn A', bin: 'Khay 1' }),
  })
  cabinetLocation: { cabinet: string; shelf: string; bin: string };
}

export const BranchInventorySchema = SchemaFactory.createForClass(BranchInventory);

// Tối ưu hóa Compound Index cho thuật toán FEFO (First Expired First Out) tại quầy chi nhánh
BranchInventorySchema.index({ branchId: 1, medicineId: 1, status: 1, expDate: 1 });
BranchInventorySchema.index({ branchId: 1, batchNo: 1, medicineId: 1 });
BranchInventorySchema.index({ branchId: 1, stock: 1 });
