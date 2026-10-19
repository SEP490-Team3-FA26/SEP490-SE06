import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ===================================================================
// Schema sản phẩm nổi bật đính kèm trong chiến dịch email
// ===================================================================
@Schema({ _id: false })
export class FeaturedProduct {
  /** ID thuốc trong hệ thống kho */
  @Prop({ type: Types.ObjectId, ref: 'Medicine' })
  productId?: Types.ObjectId;

  /** Tên thuốc / sản phẩm */
  @Prop() name: string;

  /** URL ảnh sản phẩm (tuyệt đối, từ Cloudinary) */
  @Prop() imageUrl: string;

  /** Giá gốc trước khuyến mãi (VNĐ) */
  @Prop() originalPrice: number;

  /** Giá sau khuyến mãi (VNĐ) */
  @Prop() salePrice: number;

  /** Đường dẫn trang sản phẩm trên website */
  @Prop() productUrl: string;
}

export const FeaturedProductSchema = SchemaFactory.createForClass(FeaturedProduct);

// ===================================================================
// Schema thống kê kết quả gửi email của chiến dịch
// ===================================================================
@Schema({ _id: false })
export class CampaignStats {
  /** Tổng số người nhận dự kiến */
  @Prop({ default: 0 }) totalRecipients: number;

  /** Số email đã gửi thành công */
  @Prop({ default: 0 }) sentCount: number;

  /** Số email gửi thất bại */
  @Prop({ default: 0 }) failedCount: number;
}

export const CampaignStatsSchema = SchemaFactory.createForClass(CampaignStats);

// ===================================================================
// Enum trạng thái chiến dịch email
// ===================================================================
export enum EmailCampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIAL_FAILED = 'PARTIAL_FAILED',
  CANCELLED = 'CANCELLED',
}

// Enum phân nhóm đối tượng nhận email (Chuẩn hóa: Toàn bộ khách hàng & Khách hàng VIP)
export enum TargetAudience {
  ALL = 'ALL', // Tất cả khách hàng nhận tin
  VIP = 'VIP', // Khách hàng thân thiết / VIP (Gold, Platinum, Điểm cao)
}

export type EmailCampaignDocument = EmailCampaign & Document;

// ===================================================================
// Schema chính: Quản lý chiến dịch Email Marketing
// ===================================================================
@Schema({ timestamps: true })
export class EmailCampaign {
  /** Tên nội bộ chiến dịch (hiển thị trong Admin) — VD: "Sale Vitamin 20/10" */
  @Prop({ required: true, trim: true })
  title: string;

  /** Tiêu đề email hiển thị trong hộp thư khách hàng */
  @Prop({ required: true, trim: true })
  subject: string;

  /** Dòng mô tả ngắn hiển thị cạnh tiêu đề trên Gmail (Preheader text) */
  @Prop({ trim: true })
  preheader?: string;

  // --- Nội dung & Hình ảnh ---

  /** URL ảnh banner đã upload lên Cloudinary (bắt buộc dùng HTTPS) */
  @Prop({ required: true })
  bannerUrl: string;

  /** Lời chào/dẫn dắt gửi đến khách hàng */
  @Prop({ default: 'Cảm ơn quý khách đã luôn đồng hành cùng ABC Pharmacy.' })
  greetingText: string;

  /** Nội dung HTML chính của chương trình khuyến mãi */
  @Prop({ required: true })
  mainContentHtml: string;

  /** Điều kiện áp dụng ưu đãi (hiển thị dưới dạng danh sách gạch đầu dòng) */
  @Prop({ default: '• Áp dụng cho sản phẩm không kê đơn tại toàn bộ chi nhánh.\n• Mỗi khách dùng 1 lần, không cộng gộp với ưu đãi khác.' })
  termsAndConditions?: string;

  // --- Liên kết Khuyến mãi ---

  /** ID chương trình khuyến mãi liên kết */
  @Prop({ type: Types.ObjectId, ref: 'Promotion' })
  promotionId?: Types.ObjectId;

  /** Mã voucher dành riêng cho chiến dịch — VD: "ABCVITAMIN20" */
  @Prop({ uppercase: true, trim: true })
  voucherCode?: string;

  /** Tóm tắt mức giảm — VD: "Giảm 20% tối đa 50.000đ" */
  @Prop()
  discountSummary?: string;

  /** Ngày bắt đầu chương trình khuyến mãi */
  @Prop()
  promotionStartDate?: Date;

  /** Ngày kết thúc chương trình khuyến mãi */
  @Prop()
  promotionEndDate?: Date;

  /** Danh sách 2-4 sản phẩm nổi bật đính kèm trong email */
  @Prop({ type: [FeaturedProductSchema], default: [] })
  featuredProducts: FeaturedProduct[];

  /** Văn bản nút Call-To-Action */
  @Prop({ default: 'MUA NGAY TẠI ABC PHARMACY' })
  ctaButtonText: string;

  /** Đường dẫn nút Call-To-Action (URL website bán hàng) */
  @Prop({ required: true })
  ctaButtonUrl: string;

  // --- Phân nhóm đối tượng & Lập lịch ---

  /** Nhóm khách hàng mục tiêu nhận email */
  @Prop({
    type: String,
    enum: TargetAudience,
    default: TargetAudience.ALL,
  })
  targetAudience: TargetAudience;

  /** Chế độ gửi: ngay lập tức hoặc lên lịch */
  @Prop({ type: String, enum: ['IMMEDIATE', 'SCHEDULED'], default: 'SCHEDULED' })
  sendMode: string;

  /** Thời điểm phát tán email (lưu chuẩn UTC, hiển thị theo UTC+7) */
  @Prop({ required: true, index: true })
  scheduledAt: Date;

  /** Thời điểm bắt đầu thực thi gửi */
  @Prop()
  startedAt?: Date;

  /** Thời điểm hoàn tất chiến dịch */
  @Prop()
  completedAt?: Date;

  /** Trạng thái hiện tại của chiến dịch */
  @Prop({
    type: String,
    enum: EmailCampaignStatus,
    default: EmailCampaignStatus.DRAFT,
    index: true,
  })
  status: EmailCampaignStatus;

  // --- Thống kê kết quả ---

  /** Số liệu thống kê gửi email */
  @Prop({ type: CampaignStatsSchema, default: () => ({}) })
  stats: CampaignStats;

  /** ID người Admin tạo chiến dịch */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const EmailCampaignSchema = SchemaFactory.createForClass(EmailCampaign);
