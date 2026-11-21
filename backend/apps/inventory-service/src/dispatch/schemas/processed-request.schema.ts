import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Bảng lưu khóa chống xử lý trùng lặp (Idempotency) cho Kafka retry hoặc Mobile bấm đúp.
 * Mọi thao tác quan trọng (pick-item, return-item, confirm-dispatch) ghi nhận idempotencyKey duy nhất.
 */
@Schema({ timestamps: true, collection: 'processedrequests' })
export class ProcessedRequest extends Document {
  /** Khóa duy nhất kết hợp hành động + X-Idempotency-Key từ client */
  @Prop({ type: String, required: true, unique: true, index: true })
  idempotencyKey: string;

  /** Tên hành động nghiệp vụ: PICK_ITEM | RETURN_ITEM | DISPATCH */
  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String, index: true })
  dispatchOrderId?: string;

  /** Kết quả snapshot trả về nếu nhận lại đúng khóa cũ */
  @Prop({ type: Object })
  responseSnapshot?: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  processedAt: Date;
}

export const ProcessedRequestSchema = SchemaFactory.createForClass(ProcessedRequest);

// Tự động dọn dẹp bản ghi idempotency sau 7 ngày để giữ collection gọn nhẹ
ProcessedRequestSchema.index({ processedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
