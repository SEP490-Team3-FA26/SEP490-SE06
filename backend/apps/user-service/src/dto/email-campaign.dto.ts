import { IsString, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, IsNumber, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { TargetAudience } from '../schemas/email-campaign.schema';

// ===================================================================
// DTO sản phẩm nổi bật đính kèm trong email
// ===================================================================
export class FeaturedProductDto {
  @IsOptional() @IsString()
  productId?: string;

  @IsString()
  name: string;

  @IsString()
  imageUrl: string;

  @IsNumber()
  originalPrice: number;

  @IsNumber()
  salePrice: number;

  @IsOptional() @IsString()
  productUrl?: string;
}

// ===================================================================
// DTO tạo chiến dịch email marketing mới
// ===================================================================
export class CreateEmailCampaignDto {
  /** Tên nội bộ chiến dịch */
  @IsString()
  title: string;

  /** Tiêu đề hiển thị trong hộp thư khách hàng */
  @IsString()
  subject: string;

  /** Dòng preheader ngắn cạnh tiêu đề */
  @IsOptional() @IsString()
  preheader?: string;

  /** URL banner đã upload Cloudinary */
  @IsString()
  bannerUrl: string;

  /** Lời chào/dẫn dắt */
  @IsOptional() @IsString()
  greetingText?: string;

  /** Nội dung HTML chính */
  @IsString()
  mainContentHtml: string;

  /** Điều kiện áp dụng ưu đãi */
  @IsOptional() @IsString()
  termsAndConditions?: string;

  /** ID chương trình khuyến mãi liên kết */
  @IsOptional() @IsString()
  promotionId?: string;

  /** Mã voucher */
  @IsOptional() @IsString()
  voucherCode?: string;

  /** Tóm tắt mức giảm giá */
  @IsOptional() @IsString()
  discountSummary?: string;

  /** Ngày bắt đầu khuyến mãi (ISO 8601) */
  @IsOptional() @IsDateString()
  promotionStartDate?: string;

  /** Ngày kết thúc khuyến mãi (ISO 8601) */
  @IsOptional() @IsDateString()
  promotionEndDate?: string;

  /** Danh sách sản phẩm nổi bật đính kèm */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FeaturedProductDto)
  featuredProducts?: FeaturedProductDto[];

  /** Văn bản nút CTA */
  @IsOptional() @IsString()
  ctaButtonText?: string;

  /** URL nút CTA */
  @IsString()
  ctaButtonUrl: string;

  /** Nhóm đối tượng nhận email */
  @IsOptional() @IsEnum(TargetAudience)
  targetAudience?: TargetAudience;

  /** Chế độ gửi: IMMEDIATE hoặc SCHEDULED */
  @IsOptional() @IsString()
  sendMode?: string;

  /** Trạng thái chiến dịch (DRAFT, SCHEDULED...) */
  @IsOptional() @IsString()
  status?: string;

  /** Thời điểm lên lịch phát tán (ISO 8601 — Frontend gửi UTC) */
  @IsDateString()
  scheduledAt: string;
}

// ===================================================================
// DTO gửi email thử nghiệm cho Admin kiểm tra giao diện
// ===================================================================
export class SendTestEmailDto {
  /** Địa chỉ email bất kỳ để nhận bản test */
  @IsString()
  testEmail: string;
}

// ===================================================================
// DTO kích hoạt gửi chiến dịch (Trigger / Retry)
// ===================================================================
export class TriggerCampaignDto {
  /** ID chiến dịch cần kích hoạt gửi hoặc retry */
  @IsString()
  campaignId: string;

  /** ID admin thực hiện kích hoạt (để ghi log) */
  @IsOptional() @IsString()
  triggeredBy?: string;
}
