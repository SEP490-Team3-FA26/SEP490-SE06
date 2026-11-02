// product-review.dto.ts - DTO xác thực dữ liệu gửi đánh giá sản phẩm (UC-77)
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductReviewDto {
  @ApiProperty({ description: 'Mã sản phẩm thuốc' })
  @IsString()
  @IsNotEmpty()
  medicineId: string;

  @ApiProperty({ description: 'Tên sản phẩm thuốc' })
  @IsString()
  @IsNotEmpty()
  medicineName: string;

  @ApiProperty({ description: 'ID đơn hàng liên kết đã mua' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Mã code hiển thị của đơn hàng' })
  @IsString()
  @IsNotEmpty()
  orderCode: string;

  @ApiPropertyOptional({ description: 'ID người dùng (nếu có tài khoản)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Họ tên người đánh giá' })
  @IsString()
  @IsNotEmpty()
  reviewerName: string;

  @ApiProperty({ description: 'Số điện thoại người đánh giá' })
  @IsString()
  @IsNotEmpty()
  reviewerPhone: string;

  @ApiProperty({ description: 'Điểm đánh giá từ 1 đến 5 sao', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({ description: 'Nội dung nhận xét chi tiết (tối đa 1000 ký tự)' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ description: 'Danh sách URL hình ảnh đánh giá thực tế', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Các nhãn nhận xét nhanh', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Đã xác nhận mua hàng thực tế', default: true })
  @IsBoolean()
  @IsOptional()
  isVerifiedPurchase?: boolean;
}

export class ProductReviewQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo số sao (1-5 sao)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái kiểm duyệt' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi trên trang', default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

