import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Phân loại quy tắc khuyến mãi (UC-75)
export type VoucherRuleType = 'STANDARD' | 'BUY_X_GET_Y' | 'COMBO';

// Điều kiện mua hàng cho Mua X tặng Y
@Schema({ _id: false })
export class BuyCondition {
  @Prop({ type: String, required: false })
  buyMedicineId?: string; // ID thuốc hoặc SKU cần mua

  @Prop({ type: String, required: false })
  buyMedicineName?: string; // Tên thuốc cần mua

  @Prop({ type: Number, default: 1, min: 1 })
  buyQuantity: number; // Số lượng tối thiểu (X) cần mua
}

// Quà tặng cho Mua X tặng Y
@Schema({ _id: false })
export class GiftReward {
  @Prop({ type: String, required: false })
  giftMedicineId?: string; // ID thuốc được tặng (Y)

  @Prop({ type: String, required: false })
  giftMedicineName?: string; // Tên thuốc được tặng

  @Prop({ type: Number, default: 1, min: 1 })
  giftQuantity: number; // Số lượng quà tặng (Y)

  @Prop({ type: Number, default: 100, min: 0, max: 100 })
  giftDiscountPercent: number; // Tỷ lệ giảm giá cho quà (100% = miễn phí)
}

// Chi tiết thuốc trong gói Combo
@Schema({ _id: false })
export class ComboItemCondition {
  @Prop({ type: String, required: true })
  medicineId: string; // ID thuốc trong Combo

  @Prop({ type: String, required: true })
  medicineName: string; // Tên thuốc trong Combo

  @Prop({ type: Number, default: 1, min: 1 })
  minQuantity: number; // Số lượng yêu cầu trong Combo
}

// Điều kiện gói Combo khuyến mãi
@Schema({ _id: false })
export class ComboCondition {
  @Prop({ type: [ComboItemCondition], default: [] })
  comboMedicines: ComboItemCondition[]; // Danh sách các thuốc bắt buộc có trong giỏ hàng

  @Prop({ type: String, enum: ['FIXED_AMOUNT', 'PERCENTAGE'], default: 'FIXED_AMOUNT' })
  comboDiscountType: 'FIXED_AMOUNT' | 'PERCENTAGE'; // Hình thức giảm giá khi mua đủ Combo

  @Prop({ type: Number, default: 0, min: 0 })
  comboDiscountValue: number; // Mức giảm giá khi thỏa mãn Combo
}

@Schema({ timestamps: true, collection: 'vouchers' })
export class Voucher extends Document {
  @Prop({ type: String, required: true, unique: true, uppercase: true, trim: true })
  code: string;

  // Loại quy tắc khuyến mãi: STANDARD (đơn hàng), BUY_X_GET_Y (Mua X tặng Y), COMBO (Combo trọn gói)
  @Prop({ type: String, enum: ['STANDARD', 'BUY_X_GET_Y', 'COMBO'], default: 'STANDARD' })
  ruleType: VoucherRuleType;

  @Prop({ type: String, required: false, enum: ['PERCENTAGE', 'FIXED_AMOUNT'], default: 'FIXED_AMOUNT' })
  discountType: string;

  @Prop({ type: Number, required: false, default: 0, min: 0 })
  discountValue: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  minOrderValue: number;

  @Prop({ type: Number, min: 0 })
  maxDiscountValue?: number;

  // Điều kiện Mua X tặng Y (UC-75)
  @Prop({ type: BuyCondition, required: false })
  buyCondition?: BuyCondition;

  // Quà tặng kèm cho Mua X tặng Y (UC-75)
  @Prop({ type: GiftReward, required: false })
  giftReward?: GiftReward;

  // Điều kiện mua theo Combo (UC-75)
  @Prop({ type: ComboCondition, required: false })
  comboCondition?: ComboCondition;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  expiryDate: Date;

  @Prop({ type: Number, default: null })
  usageLimit?: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  usedCount: number;

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

