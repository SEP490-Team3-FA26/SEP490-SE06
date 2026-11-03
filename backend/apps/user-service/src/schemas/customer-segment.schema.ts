import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerSegmentDocument = CustomerSegment & Document;

@Schema({ timestamps: true, collection: 'customer_segments' })
export class CustomerSegment {
  @Prop({ type: String, required: true, unique: true, index: true })
  phone: string; // Số điện thoại định danh

  @Prop({ type: String })
  fullName?: string;

  @Prop({ type: String, default: 'BR-001' })
  primaryBranchId: string;

  @Prop({
    type: String,
    enum: ['CHRONIC_PATIENT', 'GENERAL_RETAIL'],
    default: 'GENERAL_RETAIL',
    index: true,
  })
  customerType: string; // Phân loại bệnh nhân mãn tính vs khách tiêu dùng chung

  // Các chỉ số RFM thô
  @Prop({ type: Date })
  lastOrderDate: Date;

  @Prop({ type: Number, default: 0 })
  recencyDays: number; // Số ngày kể từ đơn cuối

  @Prop({ type: Number, default: 0 })
  totalOrders12M: number; // Tổng số đơn hàng trong 12 tháng

  @Prop({ type: Number, default: 0 })
  totalSpent12M: number; // Tổng chi tiêu trong 12 tháng (VNĐ)

  @Prop({ type: Number, default: 0 })
  avgOrderValue: number; // AOV = totalSpent / totalOrders

  // Điểm số phân vị chuẩn hóa (1 đến 5)
  @Prop({ type: Number, min: 1, max: 5, default: 3 })
  rScore: number;

  @Prop({ type: Number, min: 1, max: 5, default: 3 })
  fScore: number;

  @Prop({ type: Number, min: 1, max: 5, default: 3 })
  mScore: number;

  @Prop({ type: String, default: '333' })
  rfmScoreStr: string;

  // Phân khúc khách hàng mục tiêu
  @Prop({
    type: String,
    enum: [
      'CHAMPIONS',          // Khách hàng Kim Cương (R:4-5, F:4-5, M:4-5)
      'LOYAL_CHRONIC',      // Khách hàng Mãn Tính Trung Thành (chu kỳ 30 ngày)
      'POTENTIAL_LOYALIST', // Khách hàng Tiềm Năng (Mới mua 1-2 lần đơn to)
      'AT_RISK',            // Nguy cơ rời bỏ (quá chu kỳ chưa mua lại)
      'HIBERNATING',        // Khách hàng ngủ đông (>6 tháng)
    ],
    default: 'POTENTIAL_LOYALIST',
    index: true,
  })
  segment: string;

  // Dự báo tái mua & Hành động tiếp thị
  @Prop({ type: Date })
  predictedRefillDate?: Date; // Ngày dự kiến hết thuốc cần mua lại

  @Prop({ type: String })
  recommendedVoucher?: string; // Loại ưu đãi tốt nhất đề xuất

  @Prop({ type: Date, default: Date.now })
  lastEvaluatedAt: Date;
}

export const CustomerSegmentSchema = SchemaFactory.createForClass(CustomerSegment);
