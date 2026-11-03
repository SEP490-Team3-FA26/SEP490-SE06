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
  stock: number; // Tổng tồn kho theo đơn vị chuẩn của thuốc (Hộp / Chai / Lọ / Tuýp / Gói)

  @Prop({ type: Number, default: 0, min: 0 })
  openedStock: number; // Số lượng lẻ trong hộp đang mở dở của lô này (chỉ dùng ở chi nhánh bán lẻ)

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  importPrice: number;

  @Prop({ type: String, default: 'ACTIVE', enum: ['ACTIVE', 'EXPIRED', 'QUARANTINED'], index: true })
  status: string;

  /**
   * Vị trí vật lý 4 cấp trong kho: Khu (Zone) → Kệ (Rack) → Tầng (Shelf) → Thùng (Bin)
   *
   * - zone:     'A', 'B', 'C'... (khu theo nhóm dược lý chuẩn GSP) hoặc 'RESERVE' (Khu Dự Trữ)
   * - rack:     'A1', 'A2'... (dãy kệ trong khu) hoặc 'RESERVE'
   * - shelf:    1..4 (tầng trên kệ — tầng 1 dưới cùng, tầng 4 trên cùng)
   * - bin:      1..10 (thùng số mấy trên tầng đó — mỗi tầng chứa tối đa 10 thùng)
   * - slotType: 'MAIN' = lô đang bán tại kệ chính | 'RESERVE' = lô cũ đã dời sang Khu Dự Trữ
   *
   * Ví dụ: { zone: 'A', rack: 'A1', shelf: 3, bin: 2, slotType: 'MAIN' }
   *   → Khu A, Kệ A1, Tầng 3, Thùng số 2 (thuốc Paracetamol 500mg)
   */
  @Prop({
    type: {
      zone:     { type: String, default: 'A' },
      rack:     { type: String, default: 'A1' },
      shelf:    { type: Number, default: 1 },
      bin:      { type: Number, default: 1 },       // Thùng số mấy (1..10) trên tầng đó
      slotType: { type: String, default: 'MAIN', enum: ['MAIN', 'RESERVE'] }, // Kệ chính hay Khu Dự Trữ
    },
    default: () => ({ zone: 'A', rack: 'A1', shelf: 1, bin: 1, slotType: 'MAIN' }),
  })
  location: {
    zone: string;
    rack: string;
    shelf: number;
    bin: number;
    slotType: 'MAIN' | 'RESERVE';
  };
}
export const MedicineBatchSchema = SchemaFactory.createForClass(MedicineBatch);

// Index tối ưu cho truy vấn FIFO / FEFO và kiểm kê lô hàng nhanh
MedicineBatchSchema.index({ branchId: 1, medicineId: 1, status: 1, expDate: 1 });
MedicineBatchSchema.index({ medicineId: 1, status: 1, expDate: 1, stock: 1 });
MedicineBatchSchema.index({ expDate: 1, status: 1 });
// Index vị trí kho 3 cấp cũ (backward compatible)
MedicineBatchSchema.index({ 'location.zone': 1, 'location.rack': 1, 'location.shelf': 1 });
// Index vị trí kho 4 cấp mới (bổ sung bin)
MedicineBatchSchema.index({ 'location.zone': 1, 'location.rack': 1, 'location.shelf': 1, 'location.bin': 1 });
// Index phân loại Khu Chính / Khu Dự Trữ
MedicineBatchSchema.index({ 'location.slotType': 1, branchId: 1, medicineId: 1 });
