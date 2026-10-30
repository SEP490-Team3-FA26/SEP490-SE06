import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Enum trạng thái gửi email tới từng người nhận
export enum DeliveryStatus {
  PENDING = 'PENDING',       // Chờ gửi
  PROCESSING = 'PROCESSING', // Đang xử lý trong lô
  SENT = 'SENT',             // Đã gửi thành công qua Resend
  FAILED = 'FAILED',         // Gửi thất bại (mạng, rate limit...)
  SKIPPED = 'SKIPPED',       // Bỏ qua (email không hợp lệ, đã unsubscribe)
}

export type EmailDeliveryLogDocument = EmailDeliveryLog & Document;

// ===================================================================
// Schema theo dõi trạng thái gửi email từng người nhận
// Cơ chế chống gửi trùng: unique index { campaignId + email }
// ===================================================================
@Schema({ timestamps: true })
export class EmailDeliveryLog {
  /** ID chiến dịch email liên kết */
  @Prop({ type: Types.ObjectId, ref: 'EmailCampaign', required: true, index: true })
  campaignId: Types.ObjectId;

  /** ID người dùng trong hệ thống */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** Địa chỉ email người nhận (lưu lowercase) */
  @Prop({ required: true, lowercase: true })
  email: string;

  /** Tên khách hàng để cá nhân hóa lời chào trong email */
  @Prop({ default: 'Quý khách' })
  customerName: string;

  /** Token bảo mật dành riêng cho link hủy đăng ký 1-click */
  @Prop()
  unsubscribeToken?: string;

  /** Trạng thái gửi email hiện tại */
  @Prop({
    type: String,
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
    index: true,
  })
  status: DeliveryStatus;

  /** ID message từ Resend API (dùng để tra cứu trạng thái opened/bounced) */
  @Prop()
  resendMessageId?: string;

  /** Số lần đã thử gửi (giới hạn tối đa 3 lần) */
  @Prop({ default: 0 })
  attempts: number;

  /** Thông báo lỗi cuối cùng nếu gửi thất bại */
  @Prop()
  lastError?: string;

  /** Thời điểm gửi email thành công */
  @Prop()
  sentAt?: Date;
}

export const EmailDeliveryLogSchema = SchemaFactory.createForClass(EmailDeliveryLog);

// ===================================================================
// RÀNG BUỘC QUAN TRỌNG — Chống gửi trùng tuyệt đối:
// 1 email chỉ được nhận TỐI ĐA 1 lần trong cùng 1 chiến dịch
// ===================================================================
EmailDeliveryLogSchema.index({ campaignId: 1, email: 1 }, { unique: true });
