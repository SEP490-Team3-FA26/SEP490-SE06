import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * MedicineLocation — Anh xa co dinh giua 1 loai thuoc va 1 vi tri thung trong kho.
 *
 * Y nghia: Thuoc Paracetamol 500mg duoc xep vao Khu A, Ke A1, Tang 3, Thung 2.
 * Khi nhap hang (GRN), he thong tu tra cuu bang nay de goi y dung vi tri thung.
 *
 * Constraint (unique index):
 *   - 1 thuoc chi co 1 vi tri co dinh duy nhat.
 *   - 1 vi tri (zone+rack+shelf+bin) chi duoc gan cho 1 thuoc duy nhat.
 */
@Schema({ timestamps: true, collection: 'medicinelocations' })
export class MedicineLocation extends Document {
  @Prop({ type: String, required: true, index: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  medicineName: string;

  @Prop({ type: String })
  unit: string;  // 'Hop' | 'Chai' | 'Lo' | 'Tuyp' | 'Goi'

  @Prop({ type: String, required: true, index: true })
  zone: string;   // Khu: 'A', 'B', 'C', 'D', 'E', 'F'

  @Prop({ type: String, required: true, index: true })
  rack: string;   // Ke: 'A1', 'A2', 'A3'...

  @Prop({ type: Number, required: true, min: 1, max: 4 })
  shelf: number;  // Tang: 1..4

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  bin: number;    // Thung so may tren tang do: 1..10

  @Prop({ type: Number, default: 200, min: 1 })
  maxCapacity: number;  // Suc chua toi da thung nay (don vi medicine.unit)
}

export const MedicineLocationSchema = SchemaFactory.createForClass(MedicineLocation);

// 1 thuoc chi co dung 1 vi tri thung
MedicineLocationSchema.index({ medicineId: 1 }, { unique: true });
// 1 vi tri thung chi chua dung 1 loai thuoc
MedicineLocationSchema.index({ zone: 1, rack: 1, shelf: 1, bin: 1 }, { unique: true });
// Index de build layout nhanh theo Ke
MedicineLocationSchema.index({ zone: 1, rack: 1 });
