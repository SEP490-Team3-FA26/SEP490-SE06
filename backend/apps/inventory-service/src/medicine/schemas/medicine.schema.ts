import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class MedicinePackagingUnit {
  @Prop({ required: true })
  unitName: string; // 'Hộp', 'Vỉ', 'Viên', 'Gói', 'Chai', 'Ống'

  @Prop({ required: true, default: 1 })
  exchangeValue: number; // Tỷ lệ quy đổi so với đơn vị cơ sở nhỏ nhất (VD: Hộp 100 viên = 100, Vỉ 10 viên = 10, Viên = 1)

  @Prop({ required: true, default: 0 })
  price: number; // Giá bán tương ứng theo đơn vị đó

  @Prop({ default: false })
  isBaseUnit?: boolean;
}
export const MedicinePackagingUnitSchema = SchemaFactory.createForClass(MedicinePackagingUnit);

@Schema({ collection: 'medicines', timestamps: true })
export class Medicine extends Document {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ index: true })
  category: string;

  @Prop()
  image: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  cong_dung: string;

  @Prop()
  cach_dung: string;

  @Prop()
  tac_dung_phu: string;

  @Prop({ type: Object })
  thong_tin_chi_tiet: any;

  @Prop({ default: 0, index: true })
  price: number;

  @Prop({ default: 'COMMON_SUPPLEMENT', index: true })
  drug_classification: string;

  @Prop({ index: true })
  active_ingredient: string;

  @Prop({ index: true })
  registration_number: string;

  @Prop()
  manufacturer: string;

  @Prop()
  dosage_form: string;

  @Prop({ index: true })
  supplierId: string;

  @Prop({ default: 'ACTIVE', index: true })
  status: string;

  @Prop({ default: 0, min: 0, index: true })
  stock: number;

  @Prop({ default: 50 })
  safetyStock: number;

  @Prop({ default: 100 })
  reorderPoint: number;

  @Prop({ default: 'Hộp' })
  unit: string; // Đơn vị chính hiển thị

  @Prop({ type: [MedicinePackagingUnitSchema], default: [] })
  units: MedicinePackagingUnit[]; // Các đơn vị quy đổi (Hộp, Vỉ, Viên...)

  @Prop({ default: 0 })
  openedBoxUnits: number; // Số lượng lẻ còn trong hộp đang mở dở

  @Prop()
  expiry_date?: string;

  @Prop({ sparse: true, index: true })
  sku?: string;

  @Prop({ sparse: true, index: true })
  barcode?: string;

  @Prop({ type: [{ minQuantity: Number, price: Number }], default: [] })
  priceTiers?: { minQuantity: number; price: number }[];
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);

// MongoDB Index Optimization
MedicineSchema.index({ name: 'text', active_ingredient: 'text', sku: 'text' });
MedicineSchema.index({ category: 1, drug_classification: 1, status: 1 });
MedicineSchema.index({ stock: 1, safetyStock: 1 });
