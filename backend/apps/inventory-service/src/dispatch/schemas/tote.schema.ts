import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Thùng nhựa gom hàng trung chuyển (Tote) tại Kho Tổng.
 * Mỗi lần thủ kho bắt đầu nhặt hàng, Tote được khóa cho 1 phiếu xuất duy nhất
 * và chỉ giải phóng về AVAILABLE khi xuất kho xong hoặc toàn bộ hàng trong giỏ được trả lại kệ.
 */
@Schema({ timestamps: true, collection: 'totes' })
export class Tote extends Document {
  /** Mã định danh giỏ (VD: TOTE-01, TOTE-02...) */
  @Prop({ type: String, required: true, unique: true, index: true })
  toteCode: string;

  /** Tên hiển thị mô tả giỏ */
  @Prop({ type: String, default: '' })
  label?: string;

  /** AVAILABLE: đang rảnh | IN_USE: đang bị khóa bởi 1 phiếu xuất */
  @Prop({ type: String, default: 'AVAILABLE', enum: ['AVAILABLE', 'IN_USE'], index: true })
  status: string;

  /** ID & Mã phiếu xuất đang chiếm dụng giỏ này */
  @Prop({ type: String, default: null, index: true })
  currentDispatchOrderId?: string | null;

  @Prop({ type: String, default: null })
  currentDispatchCode?: string | null;

  /** Nhân sự đang giữ giỏ */
  @Prop({ type: String, default: null })
  lockedBy?: string | null;

  @Prop({ type: Date, default: null })
  lockedAt?: Date | null;
}

export const ToteSchema = SchemaFactory.createForClass(Tote);
