import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class RfqItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  medicineName: string;

  @Prop({ type: String, default: '' })
  sku: string;

  @Prop({ type: String, default: 'Hộp' })
  unit: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantityRequested: number;

  @Prop({ type: Number, default: 0 })
  targetPrice?: number;

  @Prop({ type: String, default: '' })
  nationalDrugCode?: string; // Số đăng ký lưu hành / Mã Dược Quốc gia (VD: VN-22012-19)

  @Prop({ type: Number, default: 0 })
  declaredPrice?: number; // Giá kê khai trần Bộ Y tế theo QĐ 232 / NĐ 54

  @Prop({ type: Boolean, default: true })
  gppCompliant?: boolean; // Thuốc đạt chuẩn lưu hành và có mã định danh BYT

  @Prop({ type: String })
  notes?: string;
}
export const RfqItemSchema = SchemaFactory.createForClass(RfqItem);

@Schema({ _id: false })
export class RfqTargetSupplier {
  @Prop({ type: String, required: true })
  supplierId: string;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  salesRepName?: string;

  @Prop({ type: String })
  salesRepPhone?: string;

  @Prop({ type: String, index: true })
  token?: string; // Token định danh Magic Link gửi qua Zalo/Email cho Sales

  @Prop({ type: Date })
  linkExpiresAt?: Date;

  @Prop({ type: String, default: 'INVITED', enum: ['INVITED', 'SUBMITTED', 'DECLINED'] })
  status: string;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;
}
export const RfqTargetSupplierSchema = SchemaFactory.createForClass(RfqTargetSupplier);

@Schema({ _id: false })
export class QuotationPriceTier {
  @Prop({ type: Number, required: true, min: 1 })
  minQuantity: number; // Mốc số lượng đặt hàng tối thiểu để hưởng mức đơn giá này

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number; // Đơn giá áp dụng theo bậc số lượng (VNĐ)
}
export const QuotationPriceTierSchema = SchemaFactory.createForClass(QuotationPriceTier);

@Schema({ _id: false })
export class SupplierQuotationItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  medicineName: string;

  @Prop({ type: Number, required: true, min: 0 })
  quotedPrice: number; // Đơn giá chào cơ bản của NCC (VNĐ)

  @Prop({ type: Number, default: 1, min: 1 })
  moq?: number; // Số lượng đặt hàng tối thiểu (MOQ - Minimum Order Quantity)

  @Prop({ type: [QuotationPriceTierSchema], default: [] })
  priceTiers?: QuotationPriceTier[]; // Bảng đơn giá theo bậc số lượng (mua càng nhiều giá càng giảm)

  @Prop({ type: Number, default: 0, min: 0 })
  effectiveUnitPrice?: number; // Đơn giá thực tế áp dụng cho số lượng yêu cầu dựa trên bậc giá

  @Prop({ type: Number })
  appliedTierMinQuantity?: number; // Mốc số lượng của bậc giá đang được áp dụng

  @Prop({ type: Boolean, default: true })
  isMoqMet?: boolean; // Số lượng yêu cầu của nhà thuốc có đáp ứng MOQ của NCC hay không

  @Prop({ type: Number, default: 0 })
  declaredPrice?: number; // Giá trần kê khai BYT đối chiếu

  @Prop({ type: String, default: '' })
  nationalDrugCode?: string; // SĐK đối chiếu CSDL Dược

  @Prop({ type: Boolean, default: false })
  isExceedingDeclaredPrice?: boolean; // Cảnh báo vượt giá trần kê khai BYT

  @Prop({ type: Number, default: 0 })
  discountPercent: number; // % Chiết khấu

  @Prop({ type: Number, required: true, min: 1 })
  offeredShelfLifeMonths: number; // Hạn dùng còn lại của lô hàng (tháng)

  @Prop({ type: Boolean, default: true })
  isCompliantShelfLife: boolean; // Đạt chuẩn HSD tối thiểu (Chống bẫy hàng cận date)

  @Prop({ type: Number, required: true, min: 0 })
  availableQuantity: number; // Số lượng NCC cam kết có sẵn giao ngay

  @Prop({ type: String })
  batchNo?: string;

  @Prop({ type: String })
  notes?: string;
}
export const SupplierQuotationItemSchema = SchemaFactory.createForClass(SupplierQuotationItem);

@Schema({ _id: false })
export class SupplierQuotation {
  @Prop({ type: String, required: true })
  quotationId: string;

  @Prop({ type: String, required: true })
  supplierId: string;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Prop({ type: Number, default: 30 })
  paymentTermsDays: number; // Thời hạn công nợ (VD: 30 ngày)

  @Prop({ type: Number, default: 2 })
  deliveryDays: number; // Số ngày giao hàng cam kết

  @Prop({ type: [SupplierQuotationItemSchema], required: true })
  items: SupplierQuotationItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Boolean, default: false })
  isSelected?: boolean; // Báo giá trúng thầu

  @Prop({ type: String })
  selectedReason?: string;
}
export const SupplierQuotationSchema = SchemaFactory.createForClass(SupplierQuotation);

@Schema({ timestamps: true, collection: 'requestforquotations' })
export class RequestForQuotation extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  rfqCode: string; // VD: RFQ-202610-0001

  @Prop({ type: String, required: true })
  title: string;

  @Prop({
    type: String,
    default: 'DRAFT',
    enum: ['DRAFT', 'SENT', 'IN_REVIEW', 'AWARDED', 'CANCELLED'],
    index: true,
  })
  status: string;

  @Prop({ type: Date, required: true })
  deadline: Date; // Hạn chót nộp báo giá

  @Prop({ type: Number, default: 18 })
  minShelfLifeMonths: number; // Ràng buộc chống hàng cận date (Mặc định 18 tháng)

  @Prop({ type: Number, default: 30 })
  requiredPaymentTermDays: number; // Yêu cầu công nợ tối thiểu (30 ngày)

  @Prop({ type: [RfqItemSchema], required: true })
  items: RfqItem[];

  @Prop({ type: [RfqTargetSupplierSchema], default: [] })
  targetSuppliers: RfqTargetSupplier[];

  @Prop({ type: [SupplierQuotationSchema], default: [] })
  quotations: SupplierQuotation[];

  @Prop({ type: String })
  awardedSupplierId?: string;

  @Prop({ type: String })
  awardedPoId?: string;

  @Prop({ type: String, default: 'CENTRAL_WH' })
  branchId?: string;

  @Prop({ type: String })
  createdBy?: string;

  @Prop({ type: String })
  createdByName?: string;

  @Prop({ type: String })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const RequestForQuotationSchema = SchemaFactory.createForClass(RequestForQuotation);

RequestForQuotationSchema.index({ status: 1, deadline: 1 });
RequestForQuotationSchema.index({ rfqCode: 1 });
