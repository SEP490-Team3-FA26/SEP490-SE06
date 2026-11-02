import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Cấu trúc thông tin một sản phẩm nằm trong danh sách yêu thích
 */
@Schema({ _id: false })
export class WishlistItem {
  /** Mã định danh sản phẩm thuốc / dược phẩm (Medicine ID) */
  @Prop({ required: true })
  medicineId: string;

  /** Thời điểm người dùng nhấn yêu thích và lưu sản phẩm */
  @Prop({ default: () => new Date() })
  addedAt: Date;
}
export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

export type WishlistDocument = Wishlist & Document;

/**
 * Schema quản lý danh sách sản phẩm yêu thích (Wishlist) của người dùng
 * Tuân thủ chuẩn microservice và gắn liền với tài khoản khách hàng
 */
@Schema({ timestamps: true, collection: 'wishlists' })
export class Wishlist extends Document {
  /** ID tài khoản người dùng sở hữu danh sách (Duy nhất cho mỗi User) */
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  /** Danh sách các mục sản phẩm yêu thích được lưu */
  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[];
}
export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
