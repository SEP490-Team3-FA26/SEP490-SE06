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

  @Prop({ sparse: true })
  barcode?: string; // Mã vạch riêng cho từng quy cách (Hộp/Vỉ/Viên) nếu có

  @Prop({ sparse: true })
  unit_id?: string; // Mã đơn vị chuẩn BYT (U-01, U-02...)

  @Prop({ sparse: true })
  gtin?: string; // Mã toàn cầu GS1 phân định bao gói
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

  // --- Quy chuẩn Quyết định 232/QĐ-TTYQG & CSDL Dược Quốc Gia ---
  @Prop({ default: 0, index: true })
  prescription_status: number; // 0: OTC (Thuốc không kê đơn), 1: ETC (Thuốc kê đơn bắt buộc)

  @Prop({ default: 0, index: true })
  special_control_type: number; // 0: Bình thường, 1: Gây nghiện, 2: Hướng thần, 3: Tiền chất, 4: Thuốc độc...

  @Prop({ type: Boolean, default: true, index: true })
  is_medicine: boolean; // Là mặt hàng thuốc (True: bắt buộc liên thông CSDL Dược Quốc gia, False: TPCN / vật tư)

  @Prop({ sparse: true, index: true })
  national_drug_code?: string; // Mã Dược Quốc Gia (Số đăng ký / Mã định danh BYT, VD: VN-16755-13, VD-17429-12...)

  @Prop({ type: String, default: 'SYNCED', enum: ['SYNCED', 'UNSYNCED', 'NOT_REQUIRED'], index: true })
  national_sync_status: string; // 'SYNCED' (Đã đồng bộ), 'UNSYNCED' (Chưa đồng bộ), 'NOT_REQUIRED' (Không đồng bộ)

  @Prop({ type: Date, default: Date.now })
  national_synced_at?: Date; // Thời điểm đồng bộ lên CSDL Dược Quốc Gia

  @Prop({ sparse: true, index: true })
  national_drug_id?: string; // Mã định danh CSDL Dược Quốc gia (VD: DRUG-0001)

  @Prop()
  old_registration_number?: string; // Số đăng ký lưu hành cũ

  @Prop()
  strength?: string; // Hàm lượng hoạt chất (VD: 500mg/65mg)

  @Prop({ type: [Object], default: [] })
  routes?: { id: string; name: string }[]; // Đường dùng thuốc (VD: Đường uống, tiêm bắp...)

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

  @Prop()
  importer_name?: string; // Tên doanh nghiệp nhập khẩu (cho tem nhãn phụ)

  @Prop()
  country_of_origin?: string; // Nước xuất xứ

  @Prop({ default: 'Bảo quản nơi khô ráo, tránh ánh sáng, nhiệt độ dưới 30°C' })
  storage_condition?: string; // Điều kiện bảo quản GSP
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);

// MongoDB Index Optimization
MedicineSchema.index({ name: 'text', active_ingredient: 'text', sku: 'text' });
MedicineSchema.index({ category: 1, drug_classification: 1, status: 1 });
MedicineSchema.index({ category: 1, status: 1, price: 1 });
MedicineSchema.index({ category: 1, _id: 1 });
MedicineSchema.index({ drug_classification: 1, status: 1, price: 1 });
MedicineSchema.index({ status: 1, createdAt: -1 });
MedicineSchema.index({ stock: 1, safetyStock: 1 });
