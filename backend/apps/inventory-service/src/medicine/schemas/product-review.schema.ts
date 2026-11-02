// product-review.schema.ts - Schema lưu trữ thông tin đánh giá sản phẩm (UC-77)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductReviewDocument = ProductReview & Document;

@Schema({ timestamps: true, collection: 'product_reviews' })
export class ProductReview {
  // Mã định danh sản phẩm được đánh giá
  @Prop({ required: true, index: true })
  medicineId: string;

  // Tên thuốc tại thời điểm đánh giá
  @Prop({ required: true })
  medicineName: string;

  // Mã đơn hàng liên kết (chứng minh đã mua hàng)
  @Prop({ required: true, index: true })
  orderId: string;

  // Mã code đơn hàng hiển thị
  @Prop({ required: true, index: true })
  orderCode: string;

  // ID người dùng (nếu đã đăng nhập)
  @Prop({ index: true })
  userId?: string;

  // Tên hiển thị người đánh giá
  @Prop({ required: true })
  reviewerName: string;

  // Số điện thoại người đánh giá
  @Prop({ required: true, index: true })
  reviewerPhone: string;

  // Số sao đánh giá từ 1 đến 5 sao
  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  // Nội dung nhận xét chi tiết (tối đa 1000 ký tự)
  @Prop({ maxlength: 1000 })
  comment?: string;

  // Danh sách URL hình ảnh thực tế đính kèm (tối đa 3 ảnh)
  @Prop({ type: [String], default: [] })
  images: string[];

  // Tags gắn nhãn nhanh (ví dụ: 'Hiệu quả tốt', 'Đóng gói cẩn thận'...)
  @Prop({ type: [String], default: [] })
  tags: string[];

  // Trạng thái kiểm duyệt: APPROVED, PENDING, REJECTED, HIDDEN
  @Prop({
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'],
    default: 'APPROVED',
    index: true,
  })
  status: string;

  // Đánh dấu đã xác thực mua hàng thành công
  @Prop({ default: true })
  isVerifiedPurchase: boolean;

  // Số lượt người dùng khác bình chọn hữu ích
  @Prop({ default: 0, min: 0 })
  helpfulCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductReviewSchema = SchemaFactory.createForClass(ProductReview);

// Đảm bảo chống trùng lặp: mỗi đơn hàng chỉ được review 1 sản phẩm 1 lần duy nhất
ProductReviewSchema.index({ orderId: 1, medicineId: 1 }, { unique: true });
ProductReviewSchema.index({ medicineId: 1, status: 1, createdAt: -1 });
ProductReviewSchema.index({ reviewerPhone: 1, createdAt: -1 });

